// Конфігурація Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD7ngDtXgAsoG4RTnlQ7DGEO2FNksyOHlo",
  authDomain: "fashionstore-ua.firebaseapp.com",
  projectId: "fashionstore-ua",
  storageBucket: "fashionstore-ua.firebasestorage.app",
  messagingSenderId: "881726294822",
  appId: "1:881726294822:web:a53e991c258662a118cfe7"
};

// Константи для EmailJS
const EMAILJS_SERVICE_ID = "boltmaster-2025";
const EMAILJS_TEMPLATE_ID = "template_2csi2fp";
const EMAILJS_USER_ID = "hYmYimcQ5x5Mu_skB";

// Массив файлов с товарами для FashionStore
const PRODUCT_FILES = [
    'women.json',
    'men.json', 
    'kids.json',
    'shoes.json',
    'accessories.json',
    'sale.json'
];

// Ініціалізація Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Константи додатка
const ADMIN_PASSWORD = "FashionStore2024!";
const CART_STORAGE_KEY = "fashionstore_cart";
const FAVORITES_STORAGE_KEY = "fashionstore_favorites";
const FEED_URL_KEY = "fashionstore_feed_url";
const FEED_UPDATE_TIME_KEY = "fashionstore_feed_update";
const VIEW_MODE_KEY = "fashionstore_view_mode";
const ADMINS_STORAGE_KEY = "fashionstore_admins";

// ===== СЛОВНИК ПЕРЕКЛАДУ КАТЕГОРІЙ ДЛЯ FASHION STORE =====
const categoryTranslations = {
    "Женская одежда": "Жіночий одяг",
    "Мужская одежда": "Чоловічий одяг",
    "Детская одежда": "Дитячий одяг",
    "Обувь": "Взуття",
    "Аксессуары": "Аксесуари",
    "Новинки": "Новинки",
    "Акции": "Акції",
    "Сумки": "Сумки",
    "Рюкзаки": "Рюкзаки",
    "Ремни": "Ремені",
    "Бижутерия": "Біжутерія",
    "Головные уборы": "Головні убори",
    "Шарфы": "Шарфи",
    "Перчатки": "Рукавички",
    "Спортивная одежда": "Спортивний одяг",
    "Верхняя одежда": "Верхній одяг",
    "Джинсы": "Джинси",
    "Платья": "Сукні",
    "Блузки": "Блузки",
    "Футболки": "Футболки",
    "Рубашки": "Сорочки",
    "Свитеры": "Светри",
    "Юбки": "Спідниці",
    "Шорты": "Шорти",
    "Брюки": "Штани",
    "Костюмы": "Костюми",
    "Пиджаки": "Піджаки",
    "Куртки": "Куртки",
    "Пальто": "Пальто",
    "Кроссовки": "Кросівки",
    "Туфли": "Туфлі",
    "Сапоги": "Чоботи",
    "Босоножки": "Босоніжки",
    "Ботильоны": "Ботільйони",
    "Тапочки": "Капці",
    "Без категории": "Без категорії"
};

// Функция для перевода категорий
function translateCategory(category) {
    if (!category) return '';
    return categoryTranslations[category] || category;
}

// Глобальные переменные
let products = [];
let cart = {};
let favorites = {};
let adminMode = false;
let showingFavorites = false;
let currentUser = null;
let currentPage = 1;
const productsPerPage = 36;
let isProductsLoading = false;
let currentFilters = {
  category: '',
  brand: '',
  minPrice: null,
  maxPrice: null,
  sort: 'default',
  search: '',
  availability: '',
  source: 'all'
};

// ===== УЛУЧШЕННАЯ СИСТЕМА ГОЛОСОВОГО ПОИСКА =====

// Глобальная переменная для управления голосовым поиском
let voiceSearch = {
    recognition: null,
    isListening: false,
    isSupported: false
};

// Инициализация голосового поиска
function initVoiceSearch() {
    // Проверяем поддержку в разных браузерах
    const SpeechRecognition = window.SpeechRecognition || 
                            window.webkitSpeechRecognition ||
                            window.mozSpeechRecognition || 
                            window.msSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn('Голосовой поиск не поддерживается в этом браузере');
        voiceSearch.isSupported = false;
        return;
    }

    try {
        voiceSearch.recognition = new SpeechRecognition();
        voiceSearch.isSupported = true;
        
        // Настройки распознавания
        voiceSearch.recognition.continuous = false;
        voiceSearch.recognition.interimResults = false;
        voiceSearch.recognition.lang = 'uk-UA'; // Украинский язык
        
        // Обработчики событий
        voiceSearch.recognition.onstart = function() {
            voiceSearch.isListening = true;
            updateVoiceSearchUI(true);
            showNotification('Слухаю... Говоріть зараз', 'info');
        };
        
        voiceSearch.recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            handleVoiceSearchResult(transcript);
        };
        
        voiceSearch.recognition.onerror = function(event) {
            console.error('Ошибка распознавания голоса:', event.error);
            handleVoiceSearchError(event.error);
        };
        
        voiceSearch.recognition.onend = function() {
            voiceSearch.isListening = false;
            updateVoiceSearchUI(false);
        };
        
        console.log('🎤 Голосовой поиск инициализирован');
        
    } catch (error) {
        console.error('Ошибка инициализации голосового поиска:', error);
        voiceSearch.isSupported = false;
    }
}

// Обработка результатов голосового поиска
function handleVoiceSearchResult(transcript) {
    if (!transcript || transcript.trim() === '') {
        showNotification('Не розпізнано мовлення', 'warning');
        return;
    }
    
    const cleanTranscript = transcript.trim();
    
    // Определяем, какое поле поиска активно
    const searchInput = document.getElementById('search');
    const searchMobileInput = document.getElementById('search-mobile');
    let activeInput = null;
    
    if (document.activeElement === searchMobileInput) {
        activeInput = searchMobileInput;
    } else if (document.activeElement === searchInput) {
        activeInput = searchInput;
    } else {
        // Если ни одно поле не активно, используем основное
        activeInput = searchInput || searchMobileInput;
    }
    
    if (activeInput) {
        activeInput.value = cleanTranscript;
        currentFilters.search = cleanTranscript;
        applyFilters();
        
        showNotification(`Пошук за запитом: "${cleanTranscript}"`);
        
        // Сохраняем в историю поиска
        if (typeof saveToSearchHistory === 'function') {
            saveToSearchHistory(cleanTranscript);
        }
    }
}

// Обработка ошибок голосового поиска
function handleVoiceSearchError(error) {
    let errorMessage = 'Помилка розпізнавання голосу';
    
    switch (error) {
        case 'no-speech':
            errorMessage = 'Мовлення не розпізнано. Спробуйте ще раз.';
            break;
        case 'audio-capture':
            errorMessage = 'Мікрофон не знайдено або заблоковано.';
            break;
        case 'not-allowed':
            errorMessage = 'Доступ до мікрофона заблоковано. Дозвольте доступ у налаштуваннях браузера.';
            break;
        case 'network':
            errorMessage = 'Помилка мережі. Перевірте підключення до інтернету.';
            break;
        case 'language-not-supported':
            errorMessage = 'Українська мова не підтримується для розпізнавання.';
            break;
        default:
            errorMessage = `Помилка: ${error}`;
            break;
    }
    
    showNotification(errorMessage, 'error');
    updateVoiceSearchUI(false);
}

// Запуск голосового поиска
function startVoiceSearch(isMobile = false) {
    if (!voiceSearch.isSupported) {
        showNotification('Голосовий пошук не підтримується вашим браузером', 'warning');
        return;
    }
    
    if (voiceSearch.isListening) {
        stopVoiceSearch();
        return;
    }
    
    try {
        voiceSearch.recognition.start();
        
        // Показываем индикатор на соответствующей кнопке
        const voiceBtn = isMobile ? 
            document.querySelector('.search-container-mobile .voice-search-btn') :
            document.querySelector('.search-container .voice-search-btn');
            
        if (voiceBtn) {
            voiceBtn.classList.add('listening');
        }
        
    } catch (error) {
        console.error('Ошибка запуска голосового поиска:', error);
        showNotification('Помилка запуску голосового пошуку', 'error');
    }
}

// Остановка голосового поиска
function stopVoiceSearch() {
    if (voiceSearch.recognition && voiceSearch.isListening) {
        voiceSearch.recognition.stop();
        voiceSearch.isListening = false;
        updateVoiceSearchUI(false);
    }
}

// Обновление UI голосового поиска
function updateVoiceSearchUI(listening) {
    const voiceButtons = document.querySelectorAll('.voice-search-btn');
    
    voiceButtons.forEach(btn => {
        if (listening) {
            btn.classList.add('listening');
            btn.innerHTML = '⏹️';
            btn.title = 'Зупинити запис';
        } else {
            btn.classList.remove('listening');
            btn.innerHTML = '🎤';
            btn.title = 'Голосовий пошук';
        }
    });
}

// Добавление кнопок голосового поиска в UI
function addVoiceSearchButtons() {
    const searchInput = document.getElementById('search');
    const searchMobileInput = document.getElementById('search-mobile');
    
    // Создаем стили для кнопок голосового поиска
    const style = document.createElement('style');
    style.textContent = `
        .voice-search-btn {
            position: absolute;
            right: 45px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: all 0.3s ease;
            z-index: 10;
            font-size: 16px;
        }
        
        .voice-search-btn:hover {
            background: #f0f0f0;
            color: #007bff;
        }
        
        .voice-search-btn.listening {
            color: #e74c3c;
            background: #ffeaea;
            animation: pulse 1.5s infinite;
        }
        
        .search-container {
            position: relative;
        }
        
        .search-container-mobile {
            position: relative;
        }
        
        @keyframes pulse {
            0% { 
                transform: translateY(-50%) scale(1);
                box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7);
            }
            50% { 
                transform: translateY(-50%) scale(1.05);
            }
            100% { 
                transform: translateY(-50%) scale(1);
                box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
            }
        }
        
        /* Адаптация для мобильных устройств */
        @media (max-width: 768px) {
            .voice-search-btn {
                right: 40px;
                padding: 10px;
                font-size: 18px;
            }
        }
        
        /* Состояние, когда голосовой поиск не поддерживается */
        .voice-search-btn.not-supported {
            display: none;
        }
    `;
    document.head.appendChild(style);
    
    // Добавляем кнопки к полям поиска
    [searchInput, searchMobileInput].forEach((input, index) => {
        if (!input) return;
        
        const isMobile = index === 1;
        const container = input.parentElement;
        
        // Создаем кнопку голосового поиска
        const voiceBtn = document.createElement('button');
        voiceBtn.type = 'button';
        voiceBtn.className = 'voice-search-btn';
        voiceBtn.innerHTML = '🎤';
        voiceBtn.title = 'Голосовий пошук';
        voiceBtn.setAttribute('aria-label', 'Голосовий пошук');
        
        // Добавляем обработчик клика
        voiceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startVoiceSearch(isMobile);
        });
        
        // Добавляем кнопку в контейнер
        container.style.position = 'relative';
        container.appendChild(voiceBtn);
        
        // Если голосовой поиск не поддерживается, скрываем кнопку
        if (!voiceSearch.isSupported) {
            voiceBtn.classList.add('not-supported');
        }
    });
}

// ===== УЛУЧШЕННАЯ СИСТЕМА ПОИСКА В СТИЛЕ МАРКЕТПЛЕЙСОВ =====

// Константы для оптимизации поиска
const SEARCH_CONFIG = {
  MAX_RESULTS: 1000,
  DEBOUNCE_DELAY: 150,
  MAX_HISTORY: 10,
  MAX_CACHE_SIZE: 200,
  MIN_QUERY_LENGTH: 2
};

// Расширенный интеллектуальный словарь для модной индустрии
const FASHION_SEARCH_KNOWLEDGE = {
  // Категории и подкатегории
  categories: {
    'платье': ['вечернее', 'коктейльное', 'повседневное', 'офисное', 'свадебное', 'летнее', 'на выпускной'],
    'джинсы': ['скинни', 'стрейч', 'бойфренды', 'мамашки', 'флоппи', 'рваные', 'зауженные'],
    'футболка': ['базовая', 'оверсайз', 'поло', 'лонгслив', 'с принтом', 'классическая'],
    'куртка': ['косуха', 'бомбер', 'анорак', 'ветровка', 'джинсовая', 'кожаная'],
    'обувь': ['повседневная', 'спортивная', 'вечерняя', 'офисная', 'пляжная'],
    'сумка': ['повседневная', 'вечерняя', 'пляжная', 'деловая', ' кросс-боди']
  },
  
  // Сезонность
  seasons: {
    'лето': ['летний', 'летняя', 'летнее', 'пляжный', 'пляжная'],
    'зима': ['зимний', 'зимняя', 'зимнее', 'утепленный', 'теплый'],
    'весна': ['весенний', 'весенняя', 'весеннее', 'демисезонный'],
    'осень': ['осенний', 'осенняя', 'осеннее', 'дождевик']
  },
  
  // Стили
  styles: {
    'повседневный': ['кэжуал', 'ежедневный', 'расслабленный'],
    'офисный': ['деловой', 'бизнес', 'формальный', 'строгий'],
    'вечерний': ['нарядный', 'гламурный', 'торжественный'],
    'спортивный': ['спорт-шик', 'активный', 'тренировочный']
  }
};

// Умный поисковый индекс
class SmartSearchIndex {
  constructor() {
    this.products = [];
    this.index = new Map();
    this.suggestionsCache = new Map();
  }

  // Индексирование товаров с учетом multiple fields
  indexProducts(products) {
    this.products = products;
    this.index.clear();
    
    products.forEach((product, idx) => {
      const searchableText = this.getSearchableText(product);
      const words = this.tokenizeText(searchableText);
      
      words.forEach(word => {
        if (!this.index.has(word)) {
          this.index.set(word, new Set());
        }
        this.index.get(word).add(idx);
      });
    });
    
    console.log(`🔍 Проиндексировано ${products.length} товаров, ${this.index.size} уникальных слов`);
  }

  // Получение поискового текста из всех полей товара
  getSearchableText(product) {
    const fields = [
      product.title,
      product.brand,
      product.category,
      product.description,
      product.color,
      product.size,
      product.material,
      product.style,
      product.season,
      product.sku,
      product.article
    ];
    
    return fields
      .filter(Boolean)
      .map(field => field.toLowerCase())
      .join(' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Нормализация Unicode
  }

  // Токенизация текста с извлечением ключевых слов
  tokenizeText(text) {
    return text
      .toLowerCase()
      .split(/[^\wа-яёїієґ]+/gi)
      .filter(word => word.length > 2)
      .flatMap(word => this.expandWordVariants(word))
      .filter(Boolean);
  }

  // Расширение вариантов слова (синонимы, транслитерация)
  expandWordVariants(word) {
    const variants = new Set([word]);
    
    // Транслитерация
    const translit = this.transliterate(word);
    if (translit !== word) variants.add(translit);
    
    // Синонимы из расширенного словаря
    if (searchSynonyms[word]) {
      searchSynonyms[word].forEach(synonym => variants.add(synonym));
    }
    
    // Обратный поиск синонимов
    Object.entries(searchSynonyms).forEach(([key, synonyms]) => {
      if (synonyms.includes(word)) variants.add(key);
    });
    
    return Array.from(variants);
  }

  // Транслитерация кириллицы
  transliterate(text) {
    const cyrillic = 'абвгґдеёжзийклмнопрстуфхцчшщъыьэюя';
    const latin = 'abvhgdeejziyklmnoprstufkchtschtsyyeyuya';
    
    return text.split('').map(char => {
      const index = cyrillic.indexOf(char);
      return index >= 0 ? latin[index] : char;
    }).join('');
  }

  // Основной поиск с ранжированием
  search(query, options = {}) {
    if (!query || query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      return this.products;
    }

    const tokens = this.tokenizeText(query);
    const results = this.findProducts(tokens);
    const rankedResults = this.rankResults(results, tokens, query);
    
    return rankedResults.slice(0, options.limit || SEARCH_CONFIG.MAX_RESULTS);
  }

  // Поиск товаров по токенам
  findProducts(tokens) {
    const productScores = new Map();
    
    tokens.forEach(token => {
      if (this.index.has(token)) {
        this.index.get(token).forEach(productIdx => {
          const currentScore = productScores.get(productIdx) || 0;
          productScores.set(productIdx, currentScore + 1);
        });
      }
    });
    
    return Array.from(productScores.entries())
      .filter(([_, score]) => score > 0)
      .map(([idx, score]) => ({
        product: this.products[idx],
        score,
        index: idx
      }));
  }

  // Ранжирование результатов
  rankResults(results, tokens, originalQuery) {
    return results
      .map(result => {
        const relevance = this.calculateRelevance(result.product, tokens, originalQuery);
        return {
          ...result,
          relevance: result.score + relevance
        };
      })
      .sort((a, b) => b.relevance - a.relevance)
      .map(item => item.product);
  }

  // Расчет релевантности с учетом различных факторов
  calculateRelevance(product, tokens, originalQuery) {
    let score = 0;
    const searchText = this.getSearchableText(product);
    const originalQueryLower = originalQuery.toLowerCase();

    // Приоритеты полей
    if (product.title?.toLowerCase().includes(originalQueryLower)) score += 100;
    if (product.brand?.toLowerCase().includes(originalQueryLower)) score += 80;
    if (product.category?.toLowerCase().includes(originalQueryLower)) score += 60;
    if (product.sku?.toLowerCase().includes(originalQueryLower)) score += 90;

    // Точное совпадение в начале названия
    if (product.title?.toLowerCase().startsWith(originalQueryLower)) score += 50;

    // Популярность и актуальность
    if (product.isPopular) score += 30;
    if (product.isNew) score += 25;
    if (product.inStock) score += 20;
    if (product.discount) score += 15;

    // Дополнительные бонусы
    if (product.rating > 4) score += 10;
    if (product.reviewCount > 10) score += 5;

    return score;
  }

  // Получение умных подсказок
  getSmartSuggestions(query, limit = 8) {
    if (!query) return this.getPopularSearches(limit);
    
    const cacheKey = query.toLowerCase();
    if (this.suggestionsCache.has(cacheKey)) {
      return this.suggestionsCache.get(cacheKey);
    }

    const suggestions = new Set();
    const tokens = this.tokenizeText(query);

    // Поиск по брендам
    this.products.forEach(product => {
      if (product.brand?.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add({ type: 'brand', value: product.brand, count: 1 });
      }
    });

    // Поиск по категориям
    this.products.forEach(product => {
      if (product.category?.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add({ type: 'category', value: product.category, count: 1 });
      }
    });

    // Поиск по популярным запросам
    tokens.forEach(token => {
      if (this.index.has(token)) {
        this.index.get(token).forEach(idx => {
          const product = this.products[idx];
          if (product.title?.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add({ 
              type: 'product', 
              value: product.title, 
              productId: product.id,
              count: 1 
            });
          }
        });
      }
    });

    const result = Array.from(suggestions)
      .slice(0, limit)
      .map(suggestion => ({
        ...suggestion,
        icon: this.getSuggestionIcon(suggestion.type)
      }));

    this.suggestionsCache.set(cacheKey, result);
    return result;
  }

  getSuggestionIcon(type) {
    const icons = {
      brand: '🏷️',
      category: '📁',
      product: '👕',
      history: '🕒',
      popular: '🔥'
    };
    return icons[type] || '🔍';
  }

  getPopularSearches(limit = 5) {
    // Здесь можно добавить логику получения популярных запросов
    // Пока возвращаем заглушку
    return [
      { type: 'popular', value: 'джинсы', icon: '🔥' },
      { type: 'popular', value: 'платья', icon: '🔥' },
      { type: 'popular', value: 'куртки', icon: '🔥' },
      { type: 'popular', value: 'обувь', icon: '🔥' },
      { type: 'popular', value: 'сумки', icon: '🔥' }
    ].slice(0, limit);
  }
}

// Менеджер поиска с улучшенным UX
class SearchManager {
  constructor() {
    this.searchIndex = new SmartSearchIndex();
    this.isInitialized = false;
    this.searchHistory = this.loadSearchHistory();
  }

  init(products) {
    this.searchIndex.indexProducts(products);
    this.isInitialized = true;
    console.log('🎯 Поисковый менеджер инициализирован');
  }

  // Основной поиск
  search(query, options = {}) {
    if (!this.isInitialized) {
      console.warn('Поисковый индекс не инициализирован');
      return [];
    }

    this.saveToHistory(query);
    return this.searchIndex.search(query, options);
  }

  // Получение подсказок
  getSuggestions(query, limit = 8) {
    if (!this.isInitialized) return [];
    return this.searchIndex.getSmartSuggestions(query, limit);
  }

  // Работа с историей поиска
  loadSearchHistory() {
    try {
      return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  saveSearchHistory() {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('Ошибка сохранения истории поиска:', error);
    }
  }

  saveToHistory(query) {
    if (!query || query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) return;
    
    const cleanQuery = query.trim();
    this.searchHistory = [
      cleanQuery,
      ...this.searchHistory.filter(item => item !== cleanQuery)
    ].slice(0, SEARCH_CONFIG.MAX_HISTORY);
    
    this.saveSearchHistory();
  }

  clearHistory() {
    this.searchHistory = [];
    this.saveSearchHistory();
  }

  removeFromHistory(query) {
    this.searchHistory = this.searchHistory.filter(item => item !== query);
    this.saveSearchHistory();
  }

  getHistory() {
    return this.searchHistory.slice(0, 5);
  }
}

// Аналитика поиска для улучшения качества
class SearchAnalytics {
  constructor() {
    this.searches = [];
    this.clicks = [];
  }

  trackSearch(query, resultsCount) {
    this.searches.push({
      query,
      resultsCount,
      timestamp: Date.now(),
      hasResults: resultsCount > 0
    });
    
    // Сохраняем аналитику в localStorage
    this.saveAnalytics();
  }

  trackClick(query, productId, position) {
    this.clicks.push({
      query,
      productId,
      position,
      timestamp: Date.now()
    });
    
    this.saveAnalytics();
  }

  saveAnalytics() {
    try {
      const analytics = {
        searches: this.searches.slice(-100), // Последние 100 записей
        clicks: this.clicks.slice(-100),
        updatedAt: Date.now()
      };
      
      localStorage.setItem('search_analytics', JSON.stringify(analytics));
    } catch (error) {
      console.error('Ошибка сохранения аналитики:', error);
    }
  }

  getPopularQueries(limit = 10) {
    const queryCounts = {};
    
    this.searches.forEach(search => {
      queryCounts[search.query] = (queryCounts[search.query] || 0) + 1;
    });
    
    return Object.entries(queryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([query]) => query);
  }
}

// Глобальные экземпляры менеджера поиска и аналитики
const searchManager = new SearchManager();
const searchAnalytics = new SearchAnalytics();

// Расширенный словарь опечаток и транслитерации
const searchTypos = {
  // Русские опечатки
  'платье': ['плятье', 'платьё', 'платей', 'плятье', 'плать'],
  'джинсы': ['джинси', 'джинсови', 'джинс', 'джинса', 'джинсов'],
  'футболка': ['фудболка', 'футболк', 'футболки', 'футболака'],
  'блузка': ['блуска', 'блузк', 'блузки', 'блуска'],
  'рубашка': ['рубаска', 'рубашки', 'рубашк'],
  'куртка': ['курка', 'куртки', 'куртк'],
  'обувь': ['обув', 'обуф', 'обуви'],
  'сумка': ['сумк', 'сумки', 'сумку'],
  'аксессуар': ['аксесуар', 'аксессуары', 'аксесуары'],
  'свитер': ['свитер', 'свитера', 'свитеров'],
  'юбка': ['юбк', 'юбки', 'юбку'],
  'брюки': ['брюк', 'брюки', 'брюков'],
  'шорты': ['шорт', 'шортов', 'шорты'],
  'пальто': ['пальт', 'пальта', 'пальто'],
  'кроссовки': ['кросовки', ' кроссовк', 'кроссовки'],
  'туфли': ['туфл', 'туфлей', 'туфель'],
  'сапоги': ['сапог', 'сапогов', 'сапоги'],
  'украшения': ['украшение', 'украшений', 'украшения'],

  // Украинские опечатки
  'сукня': ['сукна', 'сукни', 'сукню'],
  'джинси': ['джинсі', 'джинс', 'джинсов'],
  'футболка': ['футболк', 'футболки', 'футболака'],
  'блузка': ['блузк', 'блузки', 'блуска'],
  'сорочка': ['сорочк', 'сорочки', 'сорочку'],
  'куртка': ['куртк', 'куртки', 'куртку'],
  'взуття': ['взутт', 'взуттия', 'взутть'],
  'сумка': ['сумк', 'сумки', 'сумку'],
  'аксесуар': ['аксесуары', 'аксесуари', 'аксесуар'],
  'светр': ['светр', 'светра', 'светри'],
  'спідниця': ['спідниці', 'спідниць', 'спідницю'],
  'штани': ['штан', 'штанів', 'штани'],
  'шорти': ['шорт', 'шортів', 'шорти'],
  'пальто': ['пальт', 'пальта', 'пальто'],
  'кросівки': ['кросівк', 'кросівок', 'кросівки'],
  'туфлі': ['туфл', 'туфель', 'туфлі'],
  'чоботи': ['чобот', 'чобіт', 'чоботи'],
  'прикраси': ['прикрас', 'прикраси', 'прикрас'],

  // Транслитерация
  'sumka': ['сумка', 'сумку'],
  'kurtka': ['куртка', 'куртки'],
  'platye': ['платье', 'платья'],
  'jeans': ['джинсы', 'джинси'],
  'dress': ['платье', 'платья'],
  'shirt': ['рубашка', 'рубашки'],
  'shoes': ['обувь', 'взуття']
};

// Словарь синонимов для модной одежды
const searchSynonyms = {
  // Русские синонимы
  'платье': ['платья', 'платьев', 'наряд'],
  'джинсы': ['джинс', 'джинсов', 'деним'],
  'футболка': ['футболки', 'футболок', 'майка', 'майки', 'топ'],
  'блузка': ['блузки', 'блузок', 'блуза'],
  'рубашка': ['рубашки', 'рубашек', 'сорочка', 'сорочки'],
  'куртка': ['куртки', 'курток', 'пиджак', 'пиджаки', 'жакет'],
  'обувь': ['туфли', 'ботинки', 'кроссовки', 'сапоги', 'босоножки'],
  'сумка': ['сумки', 'рюкзак', 'рюкзаки', 'клатч', 'портфель'],
  'аксессуар': ['аксессуары', 'украшение', 'украшения', 'бижутерия'],
  'свитер': ['свитера', 'свитеров', ' кофта', 'кофты', 'джемпер'],
  'юбка': ['юбки', 'юбок'],
  'брюки': ['брюки', 'штаны', 'штанов'],
  'шорты': ['шорты', 'шорт'],
  'пальто': ['пальто', 'плащ'],
  'кроссовки': ['кеды', 'сникерсы'],
  'туфли': ['туфель', 'босоножки'],
  'сапоги': ['сапог', 'ботфорты'],
  'украшения': ['бижутерия', 'украшение', 'браслет', 'кольцо', 'серьги'],
  
  // Украинские синонимы
  'сукня': ['плаття', 'сукні', 'наряд'],
  'джинси': ['джинс', 'джинсів'],
  'футболка': ['футболки', 'футболок', 'майка', 'майки', 'топ'],
  'блузка': ['блузки', 'блузок'],
  'сорочка': ['сорочки', 'сорочок'],
  'куртка': ['куртки', 'курток', 'піджак', 'піджаки', 'жакет'],
  'взуття': ['туфлі', 'чоботи', 'кросівки', 'ботильйони', 'босоніжки'],
  'сумка': ['сумки', 'рюкзак', 'рюкзаки', 'клатч'],
  'аксесуар': ['аксесуари', 'прикраса', 'прикраси', 'біжутерія'],
  'светр': ['светри', 'кофта', 'кофти', 'демпер'],
  'спідниця': ['спідниці', 'спідниць'],
  'штани': ['брюки', 'штанів'],
  'шорти': ['шортів'],
  'пальто': ['плащ'],
  'кросівки': ['кеди', 'снікери'],
  'туфлі': ['туфель', 'босоніжки'],
  'чоботи': ['чобіт', 'ботфорти'],
  'прикраси': ['біжутерія', 'прикраса', 'браслет', 'кільце', 'сережки']
};

// Функция исправления опечаток
function fixCommonTypos(query) {
    if (!query || query.length < 2) return query;
    
    let fixedQuery = query.toLowerCase();
    
    // Исправляем опечатки
    Object.entries(searchTypos).forEach(([correct, mistakes]) => {
        mistakes.forEach(mistake => {
            if (fixedQuery.includes(mistake)) {
                fixedQuery = fixedQuery.replace(mistake, correct);
            }
        });
    });
    
    return fixedQuery;
}

// Улучшенная нормализация текста
function normalizeSearchTerm(term) {
    if (!term) return '';
    
    let normalized = term.toLowerCase()
      .replace(/[єё]/g, 'е')
      .replace(/[ї]/g, 'и') 
      .replace(/[і]/g, 'и')
      .replace(/[ґ]/g, 'г')
      .replace(/[ы]/g, 'и')
      .replace(/[э]/g, 'е')
      .replace(/[ъь]/g, '')
      .replace(/[^а-яa-z0-9\-\s']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Исправляем опечатки
    normalized = fixCommonTypos(normalized);
    
    return normalized;
}

// Расширение поискового запроса синонимами
function expandSearchQuery(query) {
    const words = query.split(' ');
    const expanded = [...words];
    
    words.forEach(word => {
        const normalizedWord = normalizeSearchTerm(word);
        
        if (searchSynonyms[normalizedWord]) {
            expanded.push(...searchSynonyms[normalizedWord]);
        }
    });
    
    return [...new Set(expanded)].join(' ');
}

// Функция расчета релевантности
function calculateRelevance(product, searchTerms) {
    if (!product || !searchTerms) return 0;
    
    let score = 0;
    const searchText = searchTerms.toLowerCase();
    
    // Приоритеты совпадений
    if (product.title && product.title.toLowerCase().includes(searchText)) {
        score += 100;
        // Бонус за точное совпадение в начале названия
        if (product.title.toLowerCase().startsWith(searchText)) score += 50;
    }
    
    if (product.brand && product.brand.toLowerCase().includes(searchText)) score += 50;
    if (product.category && product.category.toLowerCase().includes(searchText)) score += 30;
    if (product.description && product.description.toLowerCase().includes(searchText)) score += 10;
    
    // Поиск по артикулам и кодам
    if (product.sku && product.sku.toLowerCase().includes(searchText)) score += 80;
    if (product.article && product.article.toLowerCase().includes(searchText)) score += 80;
    if (product.vendorCode && product.vendorCode.toLowerCase().includes(searchText)) score += 80;
    
    // Поиск по размеру и цвету
    if (product.size && product.size.toLowerCase().includes(searchText)) score += 40;
    if (product.color && product.color.toLowerCase().includes(searchText)) score += 40;
    
    // Бонусы за дополнительные параметры
    if (product.isPopular) score += 20;
    if (product.isNew) score += 15;
    if (product.inStock) score += 10;
    if (product.discount) score += 5;
    
    return score;
}

// Улучшенная предобработка товаров
function preprocessProducts(productsArray) {
    console.log("🔧 Предобработка товаров для умного поиска...");
    
    const processedProducts = productsArray.map((product, index) => {
        if (!product || typeof product !== 'object') return product;
        
        // Создаем уникальный ID если его нет
        if (!product.id) {
            product.id = `product_${Date.now()}_${index}`;
        }
        
        const searchFields = [
            product.title || '',
            product.brand || '',
            product.category || '',
            product.description || '',
            product.specifications || '',
            product.model || '',
            product.sku || '',
            product.article || '',
            product.vendorCode || '',
            product.size ? `размер:${product.size} size:${product.size} розмір:${product.size}` : '',
            product.color ? `цвет:${product.color} color:${product.color} колір:${product.color}` : ''
        ];
        
        const normalizedFields = searchFields.map(field => 
            normalizeSearchTerm(String(field || ''))
        );
        
        const searchIndex = normalizedFields.join(' ').toLowerCase();
        
        return {
            ...product,
            searchIndex,
            title: product.title || 'Без назви',
            brand: product.brand || '',
            category: product.category || '',
            description: product.description || '',
            price: Number(product.price) || 0,
            image: product.image || '',
            inStock: product.inStock !== undefined ? product.inStock : true,
            specifications: product.specifications || '',
            model: product.model || '',
            sku: product.sku || '',
            article: product.article || '',
            vendorCode: product.vendorCode || '',
            size: product.size || '',
            color: product.color || '',
            // Добавляем новые поля для улучшенного поиска
            material: product.material || '',
            style: product.style || '',
            season: product.season || '',
            rating: product.rating || 0,
            reviewCount: product.reviewCount || 0
        };
    });
    
    console.log(`✅ Обработано ${processedProducts.length} товаров`);
    return processedProducts;
}

// Управление историей поиска
function saveToSearchHistory(query) {
    if (!query || query.trim().length < 2) return;
    
    const cleanQuery = query.trim();
    const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    const newHistory = [cleanQuery, ...history.filter(item => item !== cleanQuery)].slice(0, MAX_SEARCH_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
}

function getSearchHistory() {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
}

function clearSearchHistory() {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
}

function removeFromSearchHistory(term) {
    const history = getSearchHistory();
    const newHistory = history.filter(item => item !== term);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    
    // Обновляем отображение
    const searchInput = document.getElementById('search');
    if (searchInput && searchInput.value === '') {
        showSearchHistorySuggestions(false);
    }
    
    const searchMobileInput = document.getElementById('search-mobile');
    if (searchMobileInput && searchMobileInput.value === '') {
        showSearchHistorySuggestions(true);
    }
}

// Индикатор загрузки поиска
function showSearchLoading(isMobile = false) {
    const suggestionsId = isMobile ? 'search-suggestions-mobile' : 'search-suggestions';
    const suggestionsContainer = document.getElementById(suggestionsId);
    
    if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '<div class="search-loading">🔍 Поиск...</div>';
        suggestionsContainer.style.display = 'block';
    }
    
    searchLoading = true;
}

function hideSearchLoading(isMobile = false) {
    searchLoading = false;
}

// Аналитика поиска
function trackSearchMetrics(query, resultsCount, selectedSuggestion = null) {
    searchAnalytics.trackSearch(query, resultsCount);
}

// Безопасный поиск с обработкой ошибок
function safeSearch(query) {
    try {
        if (!query || typeof query !== 'string') {
            return [];
        }
        
        // Сохраняем в историю
        saveToSearchHistory(query);
        
        // Трекинг метрик
        const results = searchProductsEnhanced(query);
        trackSearchMetrics(query, results.length);
        
        return results;
    } catch (error) {
        console.error('Search error:', error);
        
        // Fallback: простой поиск по заголовку
        return products.filter(p => 
            p.title?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 50);
    }
}

// Улучшенные подсказки с историей и действиями
function getEnhancedSearchSuggestions(query) {
    try {
        if (!query || query.length < 1) {
            // Показываем историю поиска когда поле пустое
            return getSearchHistorySuggestions();
        }
        
        const normalizedQuery = normalizeSearchTerm(query);
        
        if (searchCache.has(normalizedQuery)) {
            return searchCache.get(normalizedQuery);
        }
        
        const suggestions = [];
        const seen = new Set();
        
        const maxProductsToCheck = Math.min(products.length, 200);
        
        for (let i = 0; i < maxProductsToCheck; i++) {
            const product = products[i];
            if (!product || typeof product !== 'object') continue;
            
            const fieldsToCheck = [
                { field: 'title', type: 'Назва', icon: '👕', relevance: 10 },
                { field: 'brand', type: 'Бренд', icon: '🏷️', relevance: 8 },
                { field: 'category', type: 'Категорія', icon: '📂', relevance: 6 },
                { field: 'sku', type: 'Артикул', icon: '#️⃣', relevance: 9 },
                { field: 'size', type: 'Розмір', icon: '📏', relevance: 5 },
                { field: 'color', type: 'Колір', icon: '🎨', relevance: 5 }
            ];
            
            for (const { field, type, icon, relevance } of fieldsToCheck) {
                if (product[field] && !seen.has(product[field])) {
                    const fieldValue = String(product[field]);
                    const normalizedField = normalizeSearchTerm(fieldValue);
                    
                    if (normalizedField.includes(normalizedQuery)) {
                        seen.add(product[field]);
                        suggestions.push({ 
                            value: product[field], 
                            type: type, 
                            icon: icon,
                            productId: product.id,
                            relevance: relevance + (field === 'title' ? 5 : 0)
                        });
                    }
                }
            }
            
            if (suggestions.length >= 8) break;
        }
        
        // Добавляем быстрые действия если мало результатов
        if (suggestions.length < 3) {
            suggestions.push({
                type: 'action',
                icon: '🔍',
                value: `Знайти "${query}"`,
                action: 'search',
                relevance: 100
            });
        }
        
        suggestions.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
        
        // Очистка кэша
        cleanupSearchCache();
        
        const finalSuggestions = suggestions.slice(0, 6);
        searchCache.set(normalizedQuery, finalSuggestions);
        return finalSuggestions;
    } catch (error) {
        console.error("Ошибка в поиске подсказок:", error);
        return getFallbackSuggestions(query);
    }
}

// Подсказки из истории поиска
function getSearchHistorySuggestions() {
    const history = getSearchHistory();
    return history.slice(0, 5).map(term => ({
        type: 'history',
        icon: '🕒',
        value: term,
        action: 'search',
        relevance: 100
    }));
}

// Резервные подсказки при ошибке
function getFallbackSuggestions(query) {
    return [
        {
            type: 'action',
            icon: '🔍',
            value: `Знайти "${query}"`,
            action: 'search',
            relevance: 100
        }
    ];
}

// Очистка кэша поиска
function cleanupSearchCache() {
    if (searchCache.size > MAX_CACHE_SIZE) {
        const keys = Array.from(searchCache.keys()).slice(0, 20);
        keys.forEach(key => searchCache.delete(key));
    }
}

// Удаление дубликатов в результатах
function removeDuplicateResults(results) {
    const seen = new Set();
    const uniqueResults = [];
    
    for (const product of results) {
        const key = `${product.title}_${product.brand}_${product.price}_${product.sku || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueResults.push(product);
        }
    }
    
    return uniqueResults;
}

// Приоритет по наличию и локации
function enhanceWithLocation(results) {
    return results.sort((a, b) => {
        // Приоритет товаров в наличии
        if (a.inStock && !b.inStock) return -1;
        if (!a.inStock && b.inStock) return 1;
        
        return 0;
    });
}

// Улучшенная функция поиска с ранжированием
function searchProductsEnhanced(searchTerm) {
    if (!searchTerm || searchTerm.trim().length < 1) {
        return products;
    }
    
    const normalizedSearch = normalizeSearchTerm(searchTerm);
    const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length >= 1);
    
    if (searchWords.length === 0) {
        return products;
    }
    
    const expandedQuery = expandSearchQuery(normalizedSearch);
    const expandedWords = expandedQuery.split(/\s+/).filter(word => word.length >= 1);
    
    let results = products.filter(product => {
        if (!product.searchIndex) return false;
        
        // Ищем товары, которые содержат ВСЕ слова из запроса
        const allWordsMatch = searchWords.every(word => 
            product.searchIndex.includes(word)
        );
        
        // Если не нашли по всем словам, ищем по расширенному запросу
        if (!allWordsMatch && expandedWords.length > searchWords.length) {
            return expandedWords.some(word => 
                product.searchIndex.includes(word)
            );
        }
        
        return allWordsMatch;
    });
    
    // Ограничение количества результатов
    if (results.length > MAX_SEARCH_RESULTS) {
        results = results.slice(0, MAX_SEARCH_RESULTS);
    }
    
    // Ранжирование по релевантности
    results.forEach(product => {
        product.relevanceScore = calculateRelevance(product, searchTerm);
    });
    
    // Сортировка по релевантности
    results.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
        }
        
        // Вторичная сортировка
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        
        return 0;
    });
    
    // Удаление дубликатов
    results = removeDuplicateResults(results);
    
    return results;
}

// Основная функция поиска
function searchProducts(searchTerm) {
    return safeSearch(searchTerm);
}

// Функция для экранирования HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Показать историю поиска
function showSearchHistorySuggestions(isMobile = false) {
    const history = getSearchHistory();
    if (history.length === 0) return;
    
    const searchContainer = isMobile 
        ? document.querySelector('.search-container-mobile') 
        : document.querySelector('.search-container');
    
    if (!searchContainer) return;
    
    const suggestionsId = isMobile ? 'search-suggestions-mobile' : 'search-suggestions';
    let suggestionsContainer = document.getElementById(suggestionsId);
    
    if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = suggestionsId;
        suggestionsContainer.className = 'search-suggestions' + (isMobile ? ' mobile-suggestions' : '');
        searchContainer.appendChild(suggestionsContainer);
    }
    
    suggestionsContainer.innerHTML = '';
    
    history.slice(0, 5).forEach((term, index) => {
        const div = document.createElement('div');
        div.className = `search-suggestion ${index === 0 ? 'active' : ''}`;
        div.innerHTML = `
            <i class="fas fa-history"></i>
            <span class="suggestion-text">${escapeHtml(term)}</span>
            <span class="suggestion-type">Історія</span>
            <button class="clear-history-btn" onclick="event.stopPropagation(); removeFromSearchHistory('${term}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        div.addEventListener('click', () => {
            if (isMobile) {
                document.getElementById('search-mobile').value = term;
            } else {
                document.getElementById('search').value = term;
            }
            currentFilters.search = term;
            applyFilters();
            hideSearchSuggestions(isMobile);
        });
        
        suggestionsContainer.appendChild(div);
    });
    
    // Кнопка очистки истории
    const clearHistoryDiv = document.createElement('div');
    clearHistoryDiv.className = 'search-suggestion suggestion-clear-history';
    clearHistoryDiv.innerHTML = `
        <i class="fas fa-trash"></i>
        <span class="suggestion-text">Очистити історію пошуку</span>
    `;
    clearHistoryDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSearchHistory();
        hideSearchSuggestions(isMobile);
        showNotification('Історію пошуку очищено');
    });
    suggestionsContainer.appendChild(clearHistoryDiv);
    
    suggestionsContainer.style.display = 'block';
}

// Функция показа подсказок
function showSearchSuggestions(query, isMobile = false) {
    if (!query || query.length < 1) {
        showSearchHistorySuggestions(isMobile);
        return;
    }
    
    const suggestions = getEnhancedSearchSuggestions(query);
    const searchContainer = isMobile 
        ? document.querySelector('.search-container-mobile') 
        : document.querySelector('.search-container');
    
    if (!searchContainer) return;
    
    const suggestionsId = isMobile ? 'search-suggestions-mobile' : 'search-suggestions';
    let suggestionsContainer = document.getElementById(suggestionsId);
    
    if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = suggestionsId;
        suggestionsContainer.className = 'search-suggestions' + (isMobile ? ' mobile-suggestions' : '');
        searchContainer.appendChild(suggestionsContainer);
    }
    
    if (suggestions.length > 0) {
        suggestionsContainer.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const div = document.createElement('div');
            div.className = `search-suggestion ${suggestion.type === 'action' ? 'suggestion-action' : ''} ${index === 0 ? 'active' : ''}`;
            
            if (suggestion.type === 'action') {
                div.innerHTML = `
                    ${suggestion.icon} 
                    <span class="suggestion-text">${escapeHtml(suggestion.value)}</span>
                `;
                
                div.addEventListener('click', () => {
                    if (suggestion.action === 'search') {
                        const searchValue = suggestion.value.replace(/^Знайти "/, '').replace(/"$/, '');
                        if (isMobile) {
                            document.getElementById('search-mobile').value = searchValue;
                        } else {
                            document.getElementById('search').value = searchValue;
                        }
                        currentFilters.search = searchValue;
                        applyFilters();
                    }
                    hideSearchSuggestions(isMobile);
                });
            } else if (suggestion.type === 'history') {
                div.innerHTML = `
                    ${suggestion.icon} 
                    <span class="suggestion-text">${escapeHtml(suggestion.value)}</span>
                    <span class="suggestion-type">Історія</span>
                    <button class="clear-history-btn" onclick="event.stopPropagation(); removeFromSearchHistory('${suggestion.value}')">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                div.addEventListener('click', () => {
                    if (isMobile) {
                        document.getElementById('search-mobile').value = suggestion.value;
                    } else {
                        document.getElementById('search').value = suggestion.value;
                    }
                    currentFilters.search = suggestion.value;
                    applyFilters();
                    hideSearchSuggestions(isMobile);
                });
            } else {
                div.innerHTML = `
                    ${suggestion.icon} 
                    <span class="suggestion-text">${escapeHtml(suggestion.value)}</span>
                    <span class="suggestion-type">${suggestion.type}</span>
                `;
                
                div.addEventListener('click', () => {
                    if (isMobile) {
                        document.getElementById('search-mobile').value = suggestion.value;
                    } else {
                        document.getElementById('search').value = suggestion.value;
                    }
                    currentFilters.search = suggestion.value;
                    applyFilters();
                    hideSearchSuggestions(isMobile);
                    
                    if (suggestion.productId) {
                        showProductDetail(suggestion.productId);
                    }
                });
            }
            
            suggestionsContainer.appendChild(div);
        });
        
        suggestionsContainer.style.display = 'block';
    } else {
        suggestionsContainer.style.display = 'none';
    }
}

// Функция для скрытия подсказок
function hideSearchSuggestions(isMobile = false) {
    const suggestionsId = isMobile ? 'search-suggestions-mobile' : 'search-suggestions';
    const suggestionsContainer = document.getElementById(suggestionsId);
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

// Настройка обработчиков поиска
function setupSearchHandler() {
    const searchInput = document.getElementById('search');
    const searchMobileInput = document.getElementById('search-mobile');
    let lastSearchValue = '';
    
    // Добавляем кнопки голосового поиска
    addVoiceSearchButtons();
    
    function handleSearch(value, isMobile = false) {
        if (value === lastSearchValue) return;
        
        clearTimeout(searchTimeout);
        
        // Показываем индикатор загрузки
        if (value.length >= 1) {
            showSearchLoading(isMobile);
        }
        
        searchTimeout = setTimeout(() => {
            lastSearchValue = value;
            currentFilters.search = value;
            
            if (value.length >= 1) {
                showSearchSuggestions(value, isMobile);
            } else {
                showSearchHistorySuggestions(isMobile);
            }
            
            applyFilters();
            hideSearchLoading(isMobile);
        }, ENHANCED_DEBOUNCE_DELAY);
    }
    
    // Обработчик для десктопного поиска
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const currentValue = this.value.trim();
            handleSearch(currentValue, false);
            if (searchMobileInput) {
                searchMobileInput.value = currentValue;
            }
        });
        
        // Обработчик фокуса - показываем историю
        searchInput.addEventListener('focus', function() {
            if (this.value === '') {
                showSearchHistorySuggestions(false);
            }
        });
    }
    
    // Обработчик для мобильного поиска
    if (searchMobileInput) {
        searchMobileInput.addEventListener('input', function() {
            const currentValue = this.value.trim();
            handleSearch(currentValue, true);
            if (searchInput) {
                searchInput.value = currentValue;
            }
        });
        
        searchMobileInput.addEventListener('focus', function() {
            if (this.value === '') {
                showSearchHistorySuggestions(true);
            }
        });
    }
    
    // Закрытие подсказок при клике вне области поиска
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container') && 
            !e.target.closest('.search-container-mobile') &&
            !e.target.closest('.voice-search-btn')) {
            hideSearchSuggestions(false);
            hideSearchSuggestions(true);
        }
    });
    
    // Остановка голосового поиска при клике вне области
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.voice-search-btn') && voiceSearch.isListening) {
            stopVoiceSearch();
        }
    });
}

// Добавление CSS для поиска
function addSearchStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .search-container {
            position: relative;
            width: 100%;
        }
        
        .search-container-mobile {
            position: relative;
            width: 100%;
            margin: 10px 0;
        }
        
        .search-suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-height: 300px;
            overflow-y: auto;
            display: none;
        }
        
        .mobile-suggestions {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 10px;
            right: 10px;
            max-height: 50vh;
            border-radius: 8px 8px 0 0;
        }
        
        .search-suggestion {
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #f0f0f0;
            transition: background-color 0.2s;
        }
        
        .search-suggestion:hover {
            background-color: #f8f9fa;
        }
        
        .suggestion-text {
            flex: 1;
            font-weight: 500;
            font-size: 14px;
        }
        
        .suggestion-type {
            font-size: 0.75em;
            color: #6c757d;
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 4px;
        }
        
        .voice-search-btn {
            position: absolute;
            right: 45px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: all 0.3s ease;
            z-index: 10;
            font-size: 16px;
        }
        
        .voice-search-btn:hover {
            background: #f0f0f0;
            color: #007bff;
        }
        
        .voice-search-btn.listening {
            color: #e74c3c;
            background: #ffeaea;
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% { 
                transform: translateY(-50%) scale(1);
                box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7);
            }
            50% { 
                transform: translateY(-50%) scale(1.05);
            }
            100% { 
                transform: translateY(-50%) scale(1);
                box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
            }
        }
        
        .search-loading {
            padding: 10px;
            text-align: center;
            color: #666;
            font-style: italic;
        }
        
        .suggestion-action {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        .suggestion-clear-history {
            border-top: 1px solid #eee;
            color: #666;
            font-size: 0.9em;
        }
        
        .clear-history-btn {
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            padding: 2px 5px;
            border-radius: 3px;
            margin-left: auto;
        }
        
        .clear-history-btn:hover {
            background: #f0f0f0;
            color: #e74c3c;
        }
        
        @media (max-width: 768px) {
            .search-container {
                display: none;
            }
            
            .voice-search-btn {
                right: 40px;
                padding: 10px;
                font-size: 18px;
            }
        }
        
        @media (min-width: 769px) {
            .search-container-mobile {
                display: none;
            }
        }
        
        .voice-search-btn.not-supported {
            display: none;
        }
    `;
    document.head.appendChild(style);
}

// Инициализация улучшенного поиска при загрузке приложения
function initEnhancedSearch() {
    addSearchStyles();
    setupSearchHandler();
    
    // Гарантируем предобработку товаров
    if (products.length > 0 && !searchIndexReady) {
        products = preprocessProducts(products);
    }
}

// Интеграция с существующей системой
function initEnhancedSearchSystem() {
    // Заменяем старые функции поиска на новые
    window.searchProductsEnhanced = function(searchTerm) {
        return searchManager.search(searchTerm);
    };

    window.getEnhancedSearchSuggestions = function(query) {
        return searchManager.getSuggestions(query);
    };

    window.saveToSearchHistory = function(query) {
        searchManager.saveToHistory(query);
    };

    window.getSearchHistory = function() {
        return searchManager.getHistory();
    };

    window.clearSearchHistory = function() {
        searchManager.clearHistory();
    };

    window.removeFromSearchHistory = function(query) {
        searchManager.removeFromHistory(query);
    };

    console.log('🔍 Улучшенная поисковая система активирована');
}

// ===== ФУНКЦИЯ СЧЕТЧИКА ПРОСМОТРОВ =====

function setupPageCounter() {
    const params = new URLSearchParams({
        style: 'flat-square',
        label: 'Views',
        color: 'blue',
        logo: 'firebase'
    });

    // Используем текущий домен сайта
    const currentHost = window.location.hostname;
    const currentPath = window.location.pathname;

    // Создаем URL для счетчика просмотров
    const counterURL = `https://hits.sh/${currentHost}${currentPath}.svg?${params.toString()}`;
    
    const pageViewsElement = document.getElementById('page-views');
    const pageViewsContainer = document.getElementById('page-views-container');
    
    if (pageViewsElement && pageViewsContainer) {
        pageViewsElement.src = counterURL;
        // Показываем контейнер (убираем display: none)
        pageViewsContainer.style.display = 'block';
    }
}

// ===== ОСНОВНЫЕ ФУНКЦИИ FASHION STORE =====

// Инициализация приложения
function initApp() {
    emailjs.init(EMAILJS_USER_ID);
    
    // Инициализация голосового поиска ДО добавления кнопок
    initVoiceSearch();
    
    // Предобработка товаров после загрузки
    if (products.length > 0) {
        products = preprocessProducts(products);
    }
    
    // Инициализируем улучшенный поиск
    initEnhancedSearch();
    
    // Инициализируем поисковый менеджер
    if (products.length > 0) {
        searchManager.init(products);
    }

    showEnhancedLoadingSkeleton();
    
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            document.getElementById('login-btn').style.display = 'none';
            document.getElementById('user-menu').style.display = 'inline-block';
            document.getElementById('admin-access-btn').style.display = 'inline-block';
            document.getElementById('user-name').textContent = user.displayName || user.email;
            
            checkAdminStatus(user.uid);
        } else {
            currentUser = null;
            document.getElementById('login-btn').style.display = 'inline-block';
            document.getElementById('user-menu').style.display = 'none';
            document.getElementById('admin-access-btn').style.display = 'none';
            document.getElementById("admin-panel").style.display = "none";
            adminMode = false;
            
            // Скрываем счетчик просмотров при выходе
            const pageViewsContainer = document.getElementById('page-views-container');
            if (pageViewsContainer) {
                pageViewsContainer.style.display = 'none';
            }
        }
    });
    
    // Инициализация выпадающего меню пользователя
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
        const userBtn = userMenu.querySelector('.user-btn');
        const userDropdown = userMenu.querySelector('.user-dropdown');

        userBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        // Закрытие выпадающего меню при клике вне его
        document.addEventListener('click', function() {
            userDropdown.classList.remove('show');
        });
    }
    
    // Загрузка товаров
    loadProducts().catch(error => {
        console.error("Помилка завантаження з Firestore, пробуємо завантажити з JSON:", error);
        
        loadProductsFromJson()
            .then(jsonProducts => {
                products = preprocessProducts(jsonProducts);
                window.currentProducts = products;
                updateCartCount();
                renderProducts();
                renderFeaturedProducts();
                renderCategories();
                renderBrands();
                showNotification(`Товари завантажено з ${PRODUCT_FILES.length} файлів`);
                
                localStorage.setItem('products_backup', JSON.stringify(products));
                
                // Инициализируем поисковый менеджер после загрузки товаров
                searchManager.init(products);
            })
            .catch(jsonError => {
                console.error("Помилка завантаження з JSON:", jsonError);
                showNotification("Не вдалося завантажити товари", "error");
                isProductsLoading = false;
                renderProducts();
            });
    });
    
    const cartData = localStorage.getItem(CART_STORAGE_KEY);
    if(cartData) cart = JSON.parse(cartData);
    
    const favoritesData = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if(favoritesData) favorites = JSON.parse(favoritesData);
    
    const viewMode = localStorage.getItem(VIEW_MODE_KEY) || 'grid';
    setViewMode(viewMode);
    
    updateCartCount();
    
    const feedUrl = localStorage.getItem(FEED_URL_KEY);
    if (feedUrl) {
        document.getElementById("feed-url").value = feedUrl;
    }
    
    document.getElementById("year").innerText = new Date().getFullYear();
    
    // Настройка обработчиков фильтров
    document.getElementById('category').addEventListener('change', function() {
        currentFilters.category = this.value;
        applyFilters();
    });
    
    document.getElementById('brand').addEventListener('change', function() {
        currentFilters.brand = this.value;
        applyFilters();
    });
    
    document.getElementById('sort').addEventListener('change', function() {
        currentFilters.sort = this.value;
        applyFilters();
    });
    
    document.getElementById('availability').addEventListener('change', function() {
        currentFilters.availability = this.value;
        applyFilters();
    });
    
    document.getElementById('price-min').addEventListener('change', function() {
        currentFilters.minPrice = this.value ? parseInt(this.value) : null;
        applyFilters();
    });
    
    document.getElementById('price-max').addEventListener('change', function() {
        currentFilters.maxPrice = this.value ? parseInt(this.value) : null;
        applyFilters();
    });

    // Инициализируем менеджер заказов
    orderManager.init();
    
    // Добавляем стили для заказов
    addOrdersStyles();
    
    // Инициализация счетчика просмотров
    setupPageCounter();
}

// Функція відкриття профілю користувача
function openProfile() {
    if (!currentUser) {
        showNotification("Спочатку увійдіть в систему", "warning");
        openAuthModal();
        return;
    }
    
    const modalContent = document.getElementById("modal-content");
    modalContent.innerHTML = `
        <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
        <h3>Профіль користувача</h3>
        <div class="profile-info">
            <div class="form-group">
                <label>Ім'я</label>
                <input type="text" id="profile-name" value="${currentUser.displayName || ''}">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="profile-email" value="${currentUser.email || ''}" disabled>
            </div>
            <div class="form-group">
                <label>Новий пароль</label>
                <input type="password" id="profile-password" placeholder="Залиште порожнім, якщо не хочете змінювати">
            </div>
            <button class="btn btn-detail" onclick="updateProfile()">Зберегти зміни</button>
        </div>
    `;
    
    openModal();
}

// Функція оновлення профілю користувача
function updateProfile() {
    const name = document.getElementById('profile-name').value;
    const password = document.getElementById('profile-password').value;
    
    const updates = {};
    if (name !== currentUser.displayName) {
        updates.displayName = name;
    }
    
    const promises = [];
    
    // Оновлюємо профіль
    if (Object.keys(updates).length > 0) {
        promises.push(currentUser.updateProfile(updates));
    }
    
    // Якщо вказано новий пароль, оновлюємо його
    if (password) {
        promises.push(currentUser.updatePassword(password));
    }
    
    if (promises.length === 0) {
        showNotification("Немає змін для оновлення", "info");
        return;
    }
    
    Promise.all(promises)
        .then(() => {
            showNotification("Профіль успішно оновлено");
            closeModal();
            // Оновлюємо ім'я користувача в інтерфейсі
            document.getElementById('user-name').textContent = name || currentUser.email;
        })
        .catch((error) => {
            console.error("Помилка оновлення профілю: ", error);
            let errorMessage = "Помилка оновлення профілю";
            
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = "Для зміни пароля необхідно повторно увійти в систему";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Пароль занадто слабкий. Використовуйте мінімум 6 символів";
            }
            
            showNotification(errorMessage, "error");
        });
}

// Функции для мобильных фильтров
function toggleMobileFilters() {
    const mobileFilters = document.getElementById('mobile-filters');
    mobileFilters.classList.toggle('active');
    
    if (mobileFilters.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function closeMobileFilters() {
    const mobileFilters = document.getElementById('mobile-filters');
    mobileFilters.classList.remove('active');
    document.body.style.overflow = '';
}

function applyMobileFilters() {
    document.getElementById('price-min').value = document.getElementById('mobile-price-min').value;
    document.getElementById('price-max').value = document.getElementById('mobile-price-max').value;
    document.getElementById('brand').value = document.getElementById('mobile-brand').value;
    document.getElementById('availability').value = document.getElementById('mobile-availability').value;
    document.getElementById('sort').value = document.getElementById('mobile-sort').value;
    
    applyFilters();
    closeMobileFilters();
}

function resetMobileFilters() {
    document.getElementById('mobile-price-min').value = '';
    document.getElementById('mobile-price-max').value = '';
    document.getElementById('mobile-brand').value = '';
    document.getElementById('mobile-availability').value = '';
    document.getElementById('mobile-sort').value = 'default';
    
    resetFilters();
    closeMobileFilters();
}

// Загрузка товаров
function loadProducts() {
    isProductsLoading = true;
    renderProducts();
    
    const cachedProducts = localStorage.getItem('products_cache');
    const cacheTime = localStorage.getItem('products_cache_time');
    
    if (cachedProducts && cacheTime && Date.now() - cacheTime < 300000) {
        products = preprocessProducts(JSON.parse(cachedProducts));
        products = shuffleArray(products);
        window.currentProducts = products;
        isProductsLoading = false;
        updateCartCount();
        renderProducts();
        renderFeaturedProducts();
        renderCategories();
        renderBrands();
        
        // Инициализируем поисковый менеджер
        searchManager.init(products);
        
        return Promise.resolve();
    }
    
    return db.collection("products")
            .get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
            const data = localStorage.getItem('products_backup');
            if (data) {
                products = preprocessProducts(JSON.parse(data));
                products = shuffleArray(products);
                window.currentProducts = products;
                isProductsLoading = false;
                updateCartCount();
                renderProducts();
                renderFeaturedProducts();
                renderCategories();
                renderBrands();
                
                // Инициализируем поисковый менеджер
                searchManager.init(products);
                
                return Promise.resolve();
            } else {
                return loadProductsFromJson()
                    .then(jsonProducts => {
                        products = preprocessProducts(jsonProducts);
                        products = shuffleArray(products);
                        window.currentProducts = products;
                        isProductsLoading = false;
                        updateCartCount();
                        renderProducts();
                        renderFeaturedProducts();
                        renderCategories();
                        renderBrands();
                        showNotification("Товари завантажено з локального файлу");
                        
                        localStorage.setItem('products_backup', JSON.stringify(products));
                        
                        // Инициализируем поисковый менеджер
                        searchManager.init(products);
                    });
            }
            } else {
                        products = [];
                        querySnapshot.forEach((doc) => {
                            products.push({ id: doc.id, ...doc.data() });
                        });
                        
                        products = preprocessProducts(products);
                        products = shuffleArray(products);
                        window.currentProducts = products;
            
            localStorage.setItem('products_cache', JSON.stringify(products));
            localStorage.setItem('products_cache_time', Date.now());
            
            isProductsLoading = false;
            updateCartCount();
            renderProducts();
            renderFeaturedProducts();
            renderCategories();
            renderBrands();
            
            // Инициализируем поисковый менеджер
            searchManager.init(products);
            
            return Promise.resolve();
            }
        })
        .catch((error) => {
            console.error("", error);
            showNotification("");
            isProductsLoading = false;
            
            const data = localStorage.getItem('products_backup');
            if (data) {
                products = preprocessProducts(JSON.parse(data));
                products = shuffleArray(products);
                window.currentProducts = products;
                updateCartCount();
                renderProducts();
                renderFeaturedProducts();
                renderCategories();
                renderBrands();
                
                // Инициализируем поисковый менеджер
                searchManager.init(products);
                
                return Promise.resolve();
            } else {
                return Promise.reject(error);
            }
        });
}

// Загрузка товаров из JSON
function loadProductsFromJson() {
    isProductsLoading = true;
    renderProducts();
    
    const promises = PRODUCT_FILES.map(file => 
        fetch(file)
            .then(response => {
                if (!response.ok) {
                    console.warn(`Файл ${file} не знайдений, пропускаємо`);
                    return [];
                }
                return response.json();
            })
            .then(productsArray => {
                return productsArray.map(product => ({
                    ...product,
                    source: file,
                    isPopular: product.isPopular || false
                }));
            })
            .catch(error => {
                console.warn(`Помилка завантаження файлу ${file}:`, error);
                return [];
            })
    );

    return Promise.all(promises)
        .then(results => {
            let allProducts = [];
            results.forEach(productsArray => {
                if (Array.isArray(productsArray)) {
                    allProducts = allProducts.concat(productsArray);
                }
            });
            
            if (allProducts.length === 0) {
                const backup = localStorage.getItem('products_backup');
                if (backup) {
                    const backupProducts = JSON.parse(backup);
                    isProductsLoading = false;
                    return backupProducts;
                }
                throw new Error('Не вдалося завантажити товари з жодного файлу');
            }
            
            isProductsLoading = false;
            return shuffleArray(allProducts);
        })
        .catch(error => {
            isProductsLoading = false;
            throw error;
        });
}

// Показать скелетоны загрузки
function showEnhancedLoadingSkeleton() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const skeletonCount = window.innerWidth <= 768 ? 4 : 8;
    
    for (let i = 0; i < skeletonCount; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "card skeleton-item";
        skeleton.innerHTML = `
            <div class="skeleton-img"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text" style="width: 80%;"></div>
            <div class="skeleton-price"></div>
            <div class="skeleton-text" style="height: 36px; margin-top: 15px;"></div>
        `;
        grid.appendChild(skeleton);
    }
    
    document.getElementById('products-count').textContent = 'Завантаження товарів...';
}

// Рендеринг товаров
function renderProducts() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (isProductsLoading) {
        showEnhancedLoadingSkeleton();
        document.getElementById('products-count').textContent = 'Завантаження товарів...';
        return;
    }
    
    let filteredProducts = getFilteredProducts();
    
    document.getElementById('products-title').textContent = showingFavorites ? 'Обрані товари' : 'Модний одяг, взуття та аксесуари';
    document.getElementById('products-count').textContent = `Знайдено: ${filteredProducts.length}`;
    
    const startIndex = (currentPage - 1) * productsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);
    
    if (paginatedProducts.length === 0) {
        grid.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-search"></i>
                <h3>Товари не знайдено</h3>
                <p>Спробуйте змінити параметри фільтрации</p>
            </div>
        `;
        updatePagination();
        return;
    }
    
    const viewMode = localStorage.getItem(VIEW_MODE_KEY) || 'grid';
    const isListView = viewMode === 'list';
    
    if (isListView) {
        grid.classList.add('list-view');
    } else {
        grid.classList.remove('list-view');
    }
    
    paginatedProducts.forEach(product => {
        const card = document.createElement("div");
        card.className = "card";
        
        const isFavorite = favorites[product.id];
        
        card.innerHTML = `
            ${product.discount ? `<div class="card-discount">-${product.discount}%</div>` : ''}
            ${product.isNew ? '<div class="card-badge">Новинка</div>' : ''}
            <img src="${product.image || 'https://via.placeholder.com/300x300?text=Fashion+Store'}" alt="${product.title}" loading="lazy">
            <h3>${product.title}</h3>
            <div class="price-container">
                <span class="price">${formatPrice(product.price)} ₴</span>
                ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)} ₴</span>` : ''}
            </div>
            
            <div class="card-actions">
                <button class="btn btn-buy" onclick="addToCart('${product.id}')">
                    <i class="fas fa-shopping-cart"></i> Купити
                </button>
                <button class="btn btn-detail" onclick="showProductDetail('${product.id}')">
                    <i class="fas fa-info"></i> Детальніше
                </button>
                <button class="btn-favorite ${isFavorite ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
                    <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    updatePagination();
}

// Пагинация
function changePage(page) {
    currentPage = page;
    showEnhancedLoadingSkeleton();
    
    setTimeout(() => {
        renderProducts();
        updatePagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
}

function updatePagination() {
    const paginationContainer = document.getElementById("pagination");
    if (!paginationContainer) return;
    
    let filteredProducts = getFilteredProducts();
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = '';
    
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo;';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => changePage(currentPage - 1);
    paginationContainer.appendChild(prevButton);
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.toggle('active', i === currentPage);
        button.onclick = () => changePage(i);
        paginationContainer.appendChild(button);
    }
    
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&raquo;';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => changePage(currentPage + 1);
    paginationContainer.appendChild(nextButton);
}

// Фильтрация товаров
function getFilteredProducts() {
    let filteredProducts = [...products];
    
    if (showingFavorites) {
        filteredProducts = filteredProducts.filter(product => favorites[product.id]);
    }
    
    if (currentFilters.search) {
        filteredProducts = searchProducts(currentFilters.search);
    }
    
    if (currentFilters.category) {
        filteredProducts = filteredProducts.filter(product => 
            product.category === currentFilters.category
        );
    }
    
    if (currentFilters.brand) {
        filteredProducts = filteredProducts.filter(product => 
            product.brand === currentFilters.brand
        );
    }
    
    if (currentFilters.minPrice) {
        filteredProducts = filteredProducts.filter(product => 
            product.price >= currentFilters.minPrice
        );
    }
    
    if (currentFilters.maxPrice) {
        filteredProducts = filteredProducts.filter(product => 
            product.price <= currentFilters.maxPrice
        );
    }
    
    if (currentFilters.availability) {
        filteredProducts = filteredProducts.filter(product => 
            currentFilters.availability === 'in-stock' ? product.inStock : !product.inStock
        );
    }
    
    if (currentFilters.source && currentFilters.source !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
            product.source === currentFilters.source
        );
    }
    
    switch (currentFilters.sort) {
        case 'price-asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name-asc':
            filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'name-desc':
            filteredProducts.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'relevance':
            // Уже отсортировано в searchProductsEnhanced
            break;
        default:
            filteredProducts.sort((a, b) => {
                if (a.isPopular && !b.isPopular) return -1;
                if (!a.isPopular && b.isPopular) return 1;
                return 0;
            });
            break;
    }
    
    return filteredProducts;
}

// Рендеринг популярных товаров
function renderFeaturedProducts() {
    const featuredContainer = document.getElementById("featured-products");
    if (!featuredContainer) return;
    
    featuredContainer.innerHTML = '';
    
    let featuredProducts = [];
    
    const popularProducts = products.filter(product => product.isPopular);
    
    if (popularProducts.length >= 3) {
        featuredProducts = shuffleArray(popularProducts).slice(0, 5);
    } else {
        featuredProducts = shuffleArray([...products]).slice(0, 5);
    }
    
    featuredProducts.forEach(product => {
        const item = document.createElement("div");
        item.className = "featured-item";
        item.innerHTML = `
            <img src="${product.image || 'https://via.placeholder.com/60x60?text=Fashion'}" alt="${product.title}">
            <div class="featured-item-info">
                <h4 class="featured-item-title">${product.title}</h4>
                <div class="featured-item-price">${formatPrice(product.price)} ₴</div>
            </div>
        `;
        
        item.addEventListener('click', () => showProductDetail(product.id));
        featuredContainer.appendChild(item);
    });
}

// Рендеринг категорий
function renderCategories() {
    const categorySelect = document.getElementById("category");
    
    while (categorySelect.options.length > 1) {
        categorySelect.remove(1);
    }
    
    const categories = [...new Set(products.map(product => product.category))].filter(Boolean);
    
    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = translateCategory(category);
        categorySelect.appendChild(option);
    });
    
    renderCategoriesList();
}

function renderCategoriesList() {
    const categoriesList = document.getElementById('categories-list');
    const mobileCategoriesList = document.getElementById('mobile-categories-list');
    
    if (!categoriesList || !mobileCategoriesList) return;

    const categoryCounts = {};
    products.forEach(product => {
        if (product.category) {
            categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
        }
    });

    const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

    let categoriesHTML = '';
    let mobileCategoriesHTML = '';

    categoriesHTML += `
        <div class="category-item active" onclick="selectCategory('')">
            Всі категорії
            <span class="category-count">${products.length}</span>
        </div>
    `;

    mobileCategoriesHTML += `
        <div class="category-item active" onclick="selectMobileCategory('')">
            Всі категорії
            <span class="category-count">${products.length}</span>
        </div>
    `;

    sortedCategories.forEach(category => {
        categoriesHTML += `
            <div class="category-item" onclick="selectCategory('${category}')">
                ${translateCategory(category)}
                <span class="category-count">${categoryCounts[category]}</span>
            </div>
        `;
        
        mobileCategoriesHTML += `
            <div class="category-item" onclick="selectMobileCategory('${category}')">
                ${translateCategory(category)}
                <span class="category-count">${categoryCounts[category]}</span>
            </div>
        `;
    });

    categoriesList.innerHTML = categoriesHTML;
    mobileCategoriesList.innerHTML = mobileCategoriesHTML;
}

function selectCategory(category) {
    document.getElementById('category').value = category;
    
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (category === '') {
        document.querySelectorAll('.category-item')[0].classList.add('active');
    } else {
        const categoryItems = document.querySelectorAll('.category-item');
        for (let item of categoryItems) {
            if (item.textContent.includes(translateCategory(category))) {
                item.classList.add('active');
                break;
            }
        }
    }
    
    currentFilters.category = category;
    applyFilters();
}

function selectMobileCategory(category) {
    document.getElementById('category').value = category;
    
    document.querySelectorAll('#mobile-categories-list .category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (category === '') {
        document.querySelectorAll('#mobile-categories-list .category-item')[0].classList.add('active');
    } else {
        const categoryItems = document.querySelectorAll('#mobile-categories-list .category-item');
        for (let item of categoryItems) {
            if (item.textContent.includes(translateCategory(category))) {
                item.classList.add('active');
                break;
            }
        }
    }
    
    currentFilters.category = category;
}

// Рендеринг брендов
function renderBrands() {
    const brandSelect = document.getElementById("brand");
    
    while (brandSelect.options.length > 1) {
        brandSelect.remove(1);
    }
    
    const brands = [...new Set(products.map(product => product.brand))].filter(Boolean);
    
    brands.forEach(brand => {
        const option = document.createElement("option");
        option.value = brand;
        option.textContent = brand;
        brandSelect.appendChild(option);
    });
}

// Форматирование цены
function formatPrice(price) {
    return new Intl.NumberFormat('uk-UA').format(price);
}

// Показать уведомление
function showNotification(message, type = "success") {
    const notification = document.getElementById("notification");
    const text = document.getElementById("notification-text");
    text.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add("show");
    
    setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

// Корзина и избранное
function addToCart(productId) {
    if (!cart[productId]) {
        cart[productId] = 0;
    }
    cart[productId]++;
    
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    
    updateCartCount();
    showNotification("Товар додано до кошика");
}

function updateCartCount() {
    const count = Object.values(cart).reduce((total, qty) => total + qty, 0);
    document.getElementById("cart-count").textContent = count;
}

function toggleFavorite(productId) {
    if (favorites[productId]) {
        delete favorites[productId];
    } else {
        favorites[productId] = true;
    }
    
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    
    if (showingFavorites) {
        renderProducts();
    } else {
        const heartIcon = document.querySelector(`button[onclick="toggleFavorite('${productId}')"] i`);
        if (heartIcon) {
            heartIcon.className = favorites[productId] ? 'fas fa-heart' : 'far fa-heart';
            heartIcon.parentElement.className = `btn-favorite ${favorites[productId] ? 'active' : ''}`;
        }
    }
    
    showNotification(favorites[productId] ? "Додано в обране" : "Видалено з обраного");
}

function toggleFavorites() {
    showingFavorites = !showingFavorites;
    
    const favButton = document.getElementById("favorites-btn");
    if (showingFavorites) {
        favButton.innerHTML = '<i class="fas fa-heart"></i>';
        favButton.style.color = '#e74c3c';
    } else {
        favButton.innerHTML = '<i class="far fa-heart"></i>';
        favButton.style.color = '';
    }
    
    applyFilters();
}

// Применение фильтров
function applyFilters() {
    const minPrice = document.getElementById("price-min")?.value ? parseInt(document.getElementById("price-min").value) : null;
    const maxPrice = document.getElementById("price-max")?.value ? parseInt(document.getElementById("price-max").value) : null;
    
    currentFilters.minPrice = minPrice;
    currentFilters.maxPrice = maxPrice;
    currentFilters.category = document.getElementById("category")?.value || '';
    currentFilters.brand = document.getElementById("brand")?.value || '';
    currentFilters.availability = document.getElementById("availability")?.value || '';
    currentFilters.sort = document.getElementById("sort")?.value || 'default';
    currentFilters.search = document.getElementById("search")?.value || '';
    
    currentPage = 1;
    
    if (isProductsLoading) {
        showEnhancedLoadingSkeleton();
    } else {
        renderProducts();
    }
    
    const filteredProducts = getFilteredProducts();
    if (!isProductsLoading) {
        document.getElementById('products-count').textContent = `Знайдено: ${filteredProducts.length}`;
    }
    
    closeMobileFilters();
}

// Сброс фильтров
function resetFilters() {
    document.getElementById("price-min").value = '';
    document.getElementById("price-max").value = '';
    document.getElementById("category").value = '';
    document.getElementById("brand").value = '';
    document.getElementById("availability").value = '';
    document.getElementById("sort").value = 'default';
    document.getElementById("search").value = '';
    
    selectCategory('');
    
    currentFilters = {
        category: '',
        brand: '',
        minPrice: null,
        maxPrice: null,
        sort: 'default',
        search: '',
        availability: '',
        source: 'all'
    };
    
    applyFilters();
}

// Установка режима просмотра
function setViewMode(mode) {
    localStorage.setItem(VIEW_MODE_KEY, mode);
    
    const gridBtn = document.getElementById("grid-view");
    const listBtn = document.getElementById("list-view");
    
    if (mode === 'grid') {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    } else {
        gridBtn.classList.remove('active');
        listBtn.classList.add('active');
    }
    
    renderProducts();
}

// ===== ДЕТАЛИ ТОВАРА И ОТЗЫВЫ =====

let currentRating = 0;

function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const modalContent = document.getElementById("modal-content");
    modalContent.innerHTML = `
        <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
        <h3>${product.title}</h3>
        <div class="product-detail">
            <div class="product-image">
                <img src="${product.image || 'https://via.placeholder.com/400x400?text=Fashion+Product'}" alt="${product.title}">
            </div>
            <div class="product-info">
                <div class="price-container">
                    <span class="detail-price">${formatPrice(product.price)} ₴</span>
                    ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)} ₴</span>` : ''}
                </div>
                <div class="product-description">
                    <h4>Опис</h4>
                    <p>${product.description || 'Опис відсутній'}</p>
                </div>
                <div class="product-specs">
                    <p><strong>Бренд:</strong> ${product.brand || 'Не вказано'}</p>
                    <p><strong>Категорія:</strong> ${translateCategory(product.category)}</p>
                    ${product.size ? `<p><strong>Розмір:</strong> ${product.size}</p>` : ''}
                    ${product.color ? `<p><strong>Колір:</strong> ${product.color}</p>` : ''}
                    <p><strong>Наявність:</strong> ${product.inStock ? 'В наявності' : 'Немає в наявності'}</p>
                </div>
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="changeQuantity(-1)">-</button>
                    <input type="number" class="quantity-input" id="product-quantity" value="1" min="1">
                    <button class="quantity-btn" onclick="changeQuantity(1)">+</button>
                </div>
                <div class="detail-actions">
                    <button class="btn btn-buy" onclick="addToCartWithQuantity('${product.id}')">
                        <i class="fas fa-shopping-cart"></i> Додати до кошика
                    </button>
                    <button class="btn-favorite ${favorites[product.id] ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
                        <i class="${favorites[product.id] ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="product-reviews">
            <h4>Відгуки про товар</h4>
            <div id="reviews-container-${product.id}"></div>
            
            ${currentUser ? `
                <div class="add-review-section">
                    <h4>Залишити відгук</h4>
                    <form onsubmit="addReview(event, '${product.id}')">
                        <div class="form-group">
                            <label>Ваша оцінка</label>
                            <div class="rating-stars">
                                <span onclick="setRating(1)">★</span>
                                <span onclick="setRating(2)">★</span>
                                <span onclick="setRating(3)">★</span>
                                <span onclick="setRating(4)">★</span>
                                <span onclick="setRating(5)">★</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Ваш відгук</label>
                            <textarea id="review-text" required></textarea>
                        </div>
                        <button type="submit" class="btn">Залишити відгук</button>
                    </form>
                </div>
            ` : `
                <p>Увійдіть, щоб залишити відгук</p>
            `}
        </div>
    `;
    
    loadReviews(product.id);
    currentRating = 0;
    updateRatingStars();
    openModal();
}

function setRating(rating) {
    currentRating = rating;
    updateRatingStars();
}

function updateRatingStars() {
    const stars = document.querySelectorAll('.rating-stars span');
    stars.forEach((star, index) => {
        if (index < currentRating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function loadReviews(productId) {
    const reviewsContainer = document.getElementById(`reviews-container-${productId}`);
    if (!reviewsContainer) return;
    
    reviewsContainer.innerHTML = '<p>Завантаження відгуків...</p>';
    
    db.collection("reviews")
        .where("productId", "==", productId)
        .where("approved", "==", true)
        .orderBy("createdAt", "desc")
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                reviewsContainer.innerHTML = "<p>Ще немає відгуків про цей товар</p>";
                return;
            }
            
            let reviewsHTML = "";
            querySnapshot.forEach((doc) => {
                const review = doc.data();
                const reviewDate = review.createdAt ? review.createdAt.toDate().toLocaleDateString('uk-UA') : '';
                
                reviewsHTML += `
                    <div class="review-item">
                        <div class="review-header">
                            <strong>${review.userName}</strong>
                            <div class="review-rating">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</div>
                            <span class="review-date">${reviewDate}</span>
                        </div>
                        <p>${review.text}</p>
                    </div>
                `;
            });
            
            reviewsContainer.innerHTML = reviewsHTML;
        })
        .catch((error) => {
            console.error("Помилка завантаження відгуків: ", error);
            reviewsContainer.innerHTML = "<p>Помилка завантаження відгуків</p>";
        });
}

function addReview(event, productId) {
    event.preventDefault();
    
    if (!currentUser) {
        showNotification("Увійдіть, щоб залишити відгук", "warning");
        return;
    }
    
    if (currentRating === 0) {
        showNotification("Будь ласка, оберіть рейтинг", "warning");
        return;
    }
    
    const text = document.getElementById('review-text').value;
    
    const newReview = {
        productId,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        rating: currentRating,
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        approved: false
    };
    
    db.collection("reviews").add(newReview)
        .then(() => {
            showNotification("Відгук додано і відправиться на модерацію");
            document.getElementById('review-text').value = "";
            currentRating = 0;
            updateRatingStars();
            loadReviews(productId);
        })
        .catch((error) => {
            console.error("Помилка додавання відгуку: ", error);
            showNotification("Помилка додавання відгуку", "error");
        });
}

function addToCartWithQuantity(productId) {
    const quantity = parseInt(document.getElementById("product-quantity").value) || 1;
    
    if (!cart[productId]) {
        cart[productId] = 0;
    }
    cart[productId] += quantity;
    
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    
    updateCartCount();
    showNotification("Товар додано до кошика");
    closeModal();
}

function changeQuantity(delta) {
    const input = document.getElementById("product-quantity");
    let value = parseInt(input.value) || 1;
    value += delta;
    
    if (value < 1) value = 1;
    
    input.value = value;
}

// ===== КОРЗИНА И ОФОРМЛЕНИЕ ЗАКАЗА =====

function openCart() {
    const modalContent = document.getElementById("modal-content");
    
    if (Object.keys(cart).length === 0) {
        modalContent.innerHTML = `
            <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
            <h3>Кошик</h3>
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Кошик порожній</h3>
                <p>Додайте товари з каталогу</p>
            </div>
        `;
    } else {
        let total = 0;
        let cartItemsHTML = '';
        
        for (const [productId, quantity] of Object.entries(cart)) {
            const product = products.find(p => p.id === productId);
            if (product) {
                const itemTotal = product.price * quantity;
                total += itemTotal;
                
                cartItemsHTML += `
                    <div class="cart-item">
                        <img src="${product.image || 'https://via.placeholder.com/80x80?text=Fashion'}" alt="${product.title}" class="cart-item-image">
                        <div class="cart-item-details">
                            <h4 class="cart-item-title">${product.title}</h4>
                            <div class="cart-item-price">${formatPrice(product.price)} ₴ x ${quantity} = ${formatPrice(itemTotal)} ₴</div>
                            <div class="cart-item-actions">
                                <button class="btn" onclick="changeCartQuantity('${productId}', -1)">-</button>
                                <span>${quantity}</span>
                                <button class="btn" onclick="changeCartQuantity('${productId}', 1)">+</button>
                                <button class="btn" onclick="removeFromCart('${productId}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        modalContent.innerHTML = `
            <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
            <h3>Кошик</h3>
            <div class="cart-items">
                ${cartItemsHTML}
            </div>
            <div class="cart-footer">
                <div class="cart-total">Разом: ${formatPrice(total)} ₴</div>
                <button class="btn btn-buy" onclick="checkout()">Оформити замовлення</button>
            </div>
        `;
    }
    
    openModal();
}

function changeCartQuantity(productId, delta) {
    if (!cart[productId] && delta < 1) return;
    
    cart[productId] += delta;
    
    if (cart[productId] < 1) {
        delete cart[productId];
    }
    
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    
    updateCartCount();
    openCart();
}

function removeFromCart(productId) {
    delete cart[productId];
    
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    
    updateCartCount();
    openCart();
}

function checkout() {
    if (!currentUser) {
        closeModal();
        openAuthModal();
        showNotification("Для оформлення замовлення необхідно авторизуватися", "warning");
        return;
    }

    // Проверка, что корзина не пуста
    if (Object.keys(cart).length === 0) {
        showNotification("Кошик порожній", "error");
        return;
    }

    const modalContent = document.getElementById("modal-content");
    modalContent.innerHTML = `
        <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
        <h3>Оформлення замовлення</h3>
        <form class="checkout-form" onsubmit="placeOrder(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Ім'я та прізвище*</label>
                    <input type="text" id="order-name" required value="${currentUser.displayName || ''}">
                </div>
                <div class="form-group">
                    <label>Телефон*</label>
                    <input type="tel" id="order-phone" required placeholder="+380XXXXXXXXX">
                </div>
            </div>
            <div class="form-group">
                <label>Email*</label>
                <input type="email" id="order-email" required value="${currentUser.email || ''}">
            </div>
            
            <!-- ДОБАВЛЕНО: ПОЛЕ КОММЕНТАРИЯ -->
            <div class="form-group">
                <label>Коментар до замовлення (необов'язково)</label>
                <textarea 
                    id="order-comment" 
                    placeholder="Ваші побажання щодо замовлення, коментарі або особливі умови доставки..."
                    rows="3"
                    maxlength="500"
                ></textarea>
                <div class="char-counter" style="text-align: right; font-size: 0.8em; color: #666;">
                    <span id="comment-chars">0</span>/500 символів
                </div>
            </div>
            
            <div class="delivery-section">
                <h4>Спосіб доставки</h4>
                <div class="delivery-options">
                    <label class="delivery-option">
                        <input type="radio" name="delivery" value="nova-poshta" checked onchange="toggleDeliveryFields()">
                        <span>Нова Пошта</span>
                    </label>
                    <label class="delivery-option">
                        <input type="radio" name="delivery" value="ukr-poshta" onchange="toggleDeliveryFields()">
                        <span>Укрпошта</span>
                    </label>
                </div>
                
                <div id="nova-poshta-fields" class="delivery-fields">
                    <div class="delivery-notice">
                        <i class="fas fa-info-circle"></i>
                        <p>Доставка здійснюється за тарифами перевізника. Вартість доставки розраховується окремо та оплачується при отриманні замовлення.</p>
                    </div>
                    <div class="form-group">
                        <label>Місто*</label>
                        <input type="text" id="np-city" required placeholder="Введіть ваше місто">
                    </div>
                    <div class="form-group">
                        <label>Відділення Нової Пошти*</label>
                        <input type="text" id="np-warehouse" required placeholder="Номер відділення">
                    </div>
                </div>
                
                <div id="ukr-poshta-fields" class="delivery-fields" style="display: none;">
                    <div class="delivery-notice">
                        <i class="fas fa-info-circle"></i>
                        <p>Доставка здійснюється за тарифами Укрпошти. Вартість доставки розраховується окремо та оплачується при отриманні замовлення.</p>
                    </div>
                    <div class="form-group">
                        <label>Місто*</label>
                        <input type="text" id="up-city" required placeholder="Введіть ваше місто">
                    </div>
                    <div class="form-group">
                        <label>Відділення Укрпошти*</label>
                        <input type="text" id="up-warehouse" required placeholder="Номер відділення">
                    </div>
                    <div class="form-group">
                        <label>Поштовий індекс*</label>
                        <input type="text" id="up-index" required placeholder="01001" pattern="[0-9]{5}" maxlength="5">
                        <small class="form-hint">5 цифр, наприклад: 01001</small>
                    </div>
                    <div class="form-group">
                        <label>Адреса для кур'єрської доставки (опційно)</label>
                        <input type="text" id="up-address" placeholder="Вулиця, будинок, квартира">
                    </div>
                </div>
            </div>
            
            <div class="payment-section">
                <h4>Спосіб оплати</h4>
                <div class="payment-options">
                    <label class="payment-option">
                        <input type="radio" name="payment" value="cash" checked>
                        <span>Готівкою при отриманні</span>
                    </label>
                </div>
            </div>
            
            <div class="order-summary">
                <h4>Ваше замовлення</h4>
                <div class="order-items">
                    ${generateOrderSummary()}
                </div>
                <div class="order-total">
                    <div class="total-line">
                        <span>Сума замовлення:</span>
                        <span>${formatPrice(calculateCartTotal())} ₴</span>
                    </div>
                    <div class="total-line">
                        <span>Доставка:</span>
                        <span>Згідно тарифів перевізника</span>
                    </div>
                    <div class="total-line final-total">
                        <span>Разом:</span>
                        <span>${formatPrice(calculateCartTotal())} ₴</span>
                    </div>
                </div>
            </div>
            
            <button type="submit" class="btn btn-buy">Підтвердити замовлення</button>
        </form>
    `;
    
    openModal();
    
    // Добавляем обработчик для подсчета символов в комментарии
    const commentField = document.getElementById('order-comment');
    const charCounter = document.getElementById('comment-chars');
    
    if (commentField && charCounter) {
        commentField.addEventListener('input', function() {
            const length = this.value.length;
            charCounter.textContent = length;
            
            if (length > 450) {
                charCounter.style.color = '#e74c3c';
            } else if (length > 400) {
                charCounter.style.color = '#f39c12';
            } else {
                charCounter.style.color = '#666';
            }
        });
    }
    
    // Гарантируем правильное отображение полей доставки при открытии формы
    toggleDeliveryFields();
}

// Функция переключения полей доставки
function toggleDeliveryFields() {
    const deliveryMethod = document.querySelector('input[name="delivery"]:checked');
    
    if (!deliveryMethod) return;
    
    const deliveryValue = deliveryMethod.value;
    const npFields = document.getElementById('nova-poshta-fields');
    const upFields = document.getElementById('ukr-poshta-fields');
    
    if (!npFields || !upFields) return;
    
    // Гарантированно показываем/скрываем поля
    if (deliveryValue === 'nova-poshta') {
        npFields.style.display = 'block';
        upFields.style.display = 'none';
        
        // Делаем поля Новой Почты обязательными
        document.getElementById('np-city').required = true;
        document.getElementById('np-warehouse').required = true;
        
        // Убираем обязательность полей Укрпочты
        document.getElementById('up-city').required = false;
        document.getElementById('up-warehouse').required = false;
        document.getElementById('up-index').required = false;
    } else {
        npFields.style.display = 'none';
        upFields.style.display = 'block';
        
        // Убираем обязательность полей Новой Почты
        document.getElementById('np-city').required = false;
        document.getElementById('np-warehouse').required = false;
        
        // Делаем поля Укрпочты обязательными
        document.getElementById('up-city').required = true;
        document.getElementById('up-warehouse').required = true;
        document.getElementById('up-index').required = true;
    }
}

function placeOrder(event) {
    event.preventDefault();
    
    // ГАРАНТОВАНО викликаємо перемикання полів доставки перед отриманням значень
    toggleDeliveryFields();
    
    if (!currentUser || !currentUser.uid) {
        closeModal();
        openAuthModal();
        showNotification("Для оформлення замовлення необхідно авторизуватися", "warning");
        return;
    }
    
    const name = document.getElementById('order-name').value.trim();
    const phone = document.getElementById('order-phone').value.trim();
    const email = document.getElementById('order-email').value.trim();
    const comment = document.getElementById('order-comment')?.value.trim() || ''; // ДОБАВЛЕНО: получаем комментарий
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    const deliveryMethod = document.querySelector('input[name="delivery"]:checked').value;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification("Введіть коректну email адресу", "error");
        return;
    }
    
    const phoneRegex = /^[\+]?[0-9]{10,15}$/;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
        showNotification("Введіть коректний номер телефону", "error");
        return;
    }
    
    let deliveryDetails = {};
    
    if (deliveryMethod === 'nova-poshta') {
        const city = document.getElementById('np-city').value.trim();
        const warehouse = document.getElementById('np-warehouse').value.trim();
        
        if (!city || !warehouse) {
            showNotification('Заповніть всі поля для доставки Новою Поштою', 'error');
            return;
        }
        
        deliveryDetails = { 
            service: 'Нова Пошта', 
            city, 
            warehouse 
        };
    } else {
        // Исправлено: гарантированно получаем поля для Укрпочты
        const city = document.getElementById('up-city').value.trim();
        const warehouse = document.getElementById('up-warehouse').value.trim();
        const index = document.getElementById('up-index').value.trim();
        const address = document.getElementById('up-address').value.trim();
        
        if (!city || !warehouse || !index) {
            showNotification('Заповніть всі обов\'язкові поля для доставки Укрпоштою', 'error');
            return;
        }
        
        // Валидация индекса
        const indexRegex = /^\d{5}$/;
        if (!indexRegex.test(index)) {
            showNotification('Введіть коректний поштовий індекс (5 цифр)', 'error');
            return;
        }
        
        deliveryDetails = { 
            service: 'Укрпошта', 
            city, 
            warehouse,
            index,
            address: address || ''
        };
    }
    
    if (!name || !phone || !email) {
        showNotification('Заповніть всі обов\'язкові поля', 'error');
        return;
    }
    
    if (Object.keys(cart).length === 0) {
        showNotification('Кошик порожній', 'error');
        return;
    }
    
    const order = {
        userId: currentUser.uid,
        userName: name,
        userPhone: cleanPhone,
        userEmail: email,
        comment: comment, // ДОБАВЛЕНО: сохраняем комментарий в заказе
        items: {...cart},
        total: calculateCartTotal(),
        delivery: deliveryDetails,
        paymentMethod,
        status: 'new',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection("orders").add(order)
        .then((docRef) => {
            cart = {};
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
            updateCartCount();
            
            sendOrderEmail(docRef.id, order);
            
            showNotification(`Замовлення успішно оформлено. Номер вашого замовлення: ${docRef.id}`);
            closeModal();
            showOrderConfirmation(docRef.id, order);
        })
        .catch(error => {
            console.error("Помилка оформлення замовлення: ", error);
            showNotification("Помилка оформлення замовлення", "error");
        });
}

function sendOrderEmail(orderId, order) {
    let itemsList = '';
    for (const [productId, quantity] of Object.entries(order.items)) {
        const product = products.find(p => p.id === productId);
        if (product) {
            itemsList += `
                <tr>
                    <td>${product.title}</td>
                    <td>${quantity}</td>
                    <td>${formatPrice(product.price)} ₴</td>
                    <td>${formatPrice(product.price * quantity)} ₴</td>
                </tr>
            `;
        }
    }
    
    // ДОБАВЛЕНО: информация о комментарии в email
    const commentInfo = order.comment ? `
        <tr>
            <td colspan="4" style="background: #f8f9fa; padding: 10px; border: 1px solid #dee2e6;">
                <strong>Коментар клієнта:</strong><br>
                ${order.comment}
            </td>
        </tr>
    ` : '';
    
    const templateParams = {
        to_email: "korovinkonstantin0@gmail.com",
        order_id: orderId,
        customer_name: order.userName,
        customer_email: order.userEmail,
        customer_phone: order.userPhone,
        customer_comment: order.comment || 'Не вказано', // ДОБАВЛЕНО
        delivery_service: order.delivery.service,
        delivery_city: order.delivery.city,
        delivery_warehouse: order.delivery.warehouse,
        delivery_index: order.delivery.index || '',
        payment_method: order.paymentMethod === 'cash' ? 'Готівкою при отриманні' : 'Онлайн-оплата карткою',
        total_amount: formatPrice(order.total),
        items: itemsList + commentInfo, // ДОБАВЛЕНО комментарий в список товаров
        order_date: new Date().toLocaleString('uk-UA')
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(function(response) {
            console.log('Email успешно отправлен!', response.status, response.text);
        }, function(error) {
            console.error('Ошибка отправки email:', error);
        });
}

function generateOrderSummary() {
    let summaryHTML = '';
    
    for (const [productId, quantity] of Object.entries(cart)) {
        const product = products.find(p => p.id === productId);
        if (product) {
            summaryHTML += `
                <div class="order-item">
                    <span>${product.title} x${quantity}</span>
                    <span>${formatPrice(product.price * quantity)} ₴</span>
                </div>
            `;
        }
    }
    
    return summaryHTML;
}

function calculateCartTotal() {
    return Object.entries(cart).reduce((sum, [productId, quantity]) => {
        const product = products.find(p => p.id === productId);
        return sum + (product ? product.price * quantity : 0);
    }, 0);
}

function showOrderConfirmation(orderId, order) {
    const modalContent = document.getElementById("modal-content");
    
    let deliveryInfo = '';
    if (order.delivery.service === 'Нова Пошта') {
        deliveryInfo = `
            <p><strong>Спосіб доставки:</strong> ${order.delivery.service}</p>
            <p><strong>Місто:</strong> ${order.delivery.city}</p>
            <p><strong>Відділення:</strong> ${order.delivery.warehouse}</p>
        `;
    } else {
        deliveryInfo = `
            <p><strong>Спосіб доставки:</strong> ${order.delivery.service}</p>
            <p><strong>Місто:</strong> ${order.delivery.city}</p>
            <p><strong>Відділення:</strong> ${order.delivery.warehouse}</p>
            <p><strong>Поштовий індекс:</strong> ${order.delivery.index}</p>
            ${order.delivery.address ? `<p><strong>Адреса:</strong> ${order.delivery.address}</p>` : ''}
        `;
    }
    
    // ДОБАВЛЕНО: отображение комментария в подтверждении заказа
    let commentInfo = '';
    if (order.comment) {
        commentInfo = `
            <div class="comment-section" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
                <h4 style="margin: 0 0 10px 0; color: #333;">Ваш коментар:</h4>
                <p style="margin: 0; font-style: italic; color: #555;">"${order.comment}"</p>
            </div>
        `;
    }
    
    modalContent.innerHTML = `
        <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
        <div class="order-confirmation">
            <div class="confirmation-header">
                <i class="fas fa-check-circle"></i>
                <h3>Замовлення успішно оформлено!</h3>
            </div>
            <div class="confirmation-details">
                <p><strong>Номер замовлення:</strong> ${orderId}</p>
                <p><strong>Ім'я:</strong> ${order.userName}</p>
                <p><strong>Телефон:</strong> ${order.userPhone}</p>
                <p><strong>Email:</strong> ${order.userEmail}</p>
                ${commentInfo} <!-- ДОБАВЛЕНО: отображаем комментарий -->
                ${deliveryInfo}
                <div class="delivery-notice">
                    <i class="fas fa-info-circle"></i>
                    <p>Доставка здійснюється за тарифами перевізника. Вартість доставки розраховується окремо та оплачується при отриманні замовлення.</p>
                </div>
                <p><strong>Спосіб оплати:</strong> ${order.paymentMethod === 'cash' ? 'Готівкою при отриманні' : 'Онлайн-оплата карткою'}</p>
                <p><strong>Сума товарів:</strong> ${formatPrice(order.total)} ₴</p>
                
                <div class="manager-notice" style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
                    <i class="fas fa-phone" style="color: #007bff; margin-right: 10px;"></i>
                    <strong>Наш менеджер зв'яжеться з вами протягом години для підтвердження замовлення та уточнення деталей.</strong>
                </div>
            </div>
            <div class="confirmation-actions">
                <button class="btn btn-detail" onclick="closeModal()">Продовжити покупки</button>
                <button class="btn" onclick="viewOrders()">Мої замовлення</button>
            </div>
        </div>
    `;
    
    openModal();
}

// ===== УЛУЧШЕННАЯ СИСТЕМА УПРАВЛЕНИЯ ЗАКАЗАМИ =====

class OrderManager {
    constructor() {
        this.currentOrdersUnsubscribe = null;
        this.orders = [];
    }

    // Инициализация менеджера заказов
    init() {
        this.setupEventListeners();
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчик для кнопки "Мои заказы"
        const ordersBtn = document.getElementById('orders-btn');
        if (ordersBtn) {
            ordersBtn.addEventListener('click', () => this.viewOrders());
        }
    }

    // Показать заказы пользователя
    async viewOrders() {
        if (!currentUser) {
            showNotification("Для перегляду замовлень необхідно авторизуватися", "warning");
            openAuthModal();
            return;
        }

        const modalContent = document.getElementById("modal-content");
        modalContent.innerHTML = `
            <button class="modal-close" onclick="closeModal()" aria-label="Закрити">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
            <div class="orders-header">
                <h3>Мої замовлення</h3>
                <div class="orders-stats" id="orders-stats"></div>
            </div>
            <div class="orders-filter">
                <select id="orders-status-filter" onchange="orderManager.filterOrders(this.value)">
                    <option value="all">Всі замовлення</option>
                    <option value="new">Нові</option>
                    <option value="processing">В обробці</option>
                    <option value="shipped">Відправлені</option>
                    <option value="delivered">Доставлені</option>
                    <option value="cancelled">Скасовані</option>
                </select>
            </div>
            <div id="user-orders-list" class="user-orders-list">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Завантаження замовлень...</p>
                </div>
            </div>
        `;
        
        openModal();
        await this.loadUserOrders();
    }

    // Загрузить заказы пользователя
    async loadUserOrders() {
        const ordersList = document.getElementById("user-orders-list");
        if (!ordersList || !currentUser) return;

        try {
            // Отписываемся от предыдущего слушателя
            if (this.currentOrdersUnsubscribe) {
                this.currentOrdersUnsubscribe();
            }

            // Слушаем изменения в заказах в реальном времени
            this.currentOrdersUnsubscribe = db.collection("orders")
                .where("userId", "==", currentUser.uid)
                .orderBy("createdAt", "desc")
                .onSnapshot(
                    (querySnapshot) => this.handleOrdersSnapshot(querySnapshot),
                    (error) => this.handleOrdersError(error)
                );

        } catch (error) {
            console.error("Помилка завантаження замовлень: ", error);
            this.showOrdersError("Помилка завантаження замовлень");
        }
    }

    // Обработка снимка данных заказов
    handleOrdersSnapshot(querySnapshot) {
        const ordersList = document.getElementById("user-orders-list");
        const statsContainer = document.getElementById("orders-stats");
        
        if (querySnapshot.empty) {
            this.showEmptyOrders();
            if (statsContainer) statsContainer.innerHTML = '';
            return;
        }

        this.orders = [];
        let ordersHTML = '';
        const statusCount = {
            all: 0,
            new: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };

        querySnapshot.forEach((doc) => {
            const order = { 
                id: doc.id, 
                ...doc.data(),
                // Добавляем вычисляемые поля
                itemsCount: this.calculateItemsCount(doc.data().items),
                totalFormatted: formatPrice(doc.data().total || 0)
            };
            
            this.orders.push(order);
            statusCount.all++;
            statusCount[order.status] = (statusCount[order.status] || 0) + 1;

            ordersHTML += this.generateOrderItemHTML(order);
        });

        ordersList.innerHTML = ordersHTML;
        
        // Обновляем статистику
        if (statsContainer) {
            statsContainer.innerHTML = `
                <span class="orders-count">${statusCount.all} замовлень</span>
            `;
        }

        // Применяем текущий фильтр
        this.applyCurrentFilter();
    }

    // Обработка ошибок загрузки заказов
    handleOrdersError(error) {
        console.error("Помилка завантаження замовлень: ", error);
        this.showOrdersError("Не вдалося завантажити ваші замовлення. Спробуйте пізніше.");
    }

    // Показать сообщение об ошибке
    showOrdersError(message) {
        const ordersList = document.getElementById("user-orders-list");
        if (!ordersList) return;

        ordersList.innerHTML = `
            <div class="error-loading">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Помилка завантаження</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="orderManager.loadUserOrders()">
                    <i class="fas fa-redo"></i> Спробувати знову
                </button>
            </div>
        `;
    }

    // Показать пустой список заказов
    showEmptyOrders() {
        const ordersList = document.getElementById("user-orders-list");
        if (!ordersList) return;

        ordersList.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-box-open"></i>
                <h3>У вас ще немає замовлень</h3>
                <p>Поверніться до каталогу та оберіть товари</p>
                <button class="btn btn-primary" onclick="closeModal()">
                    <i class="fas fa-shopping-bag"></i> Перейти до покупок
                </button>
            </div>
        `;
    }

    // Подсчет количества товаров в заказе
    calculateItemsCount(items) {
        if (!items) return 0;
        return Object.values(items).reduce((sum, qty) => sum + qty, 0);
    }

    // Генерация HTML для элемента заказа
    generateOrderItemHTML(order) {
        const orderDate = order.createdAt ? 
            order.createdAt.toDate().toLocaleString('uk-UA') : 
            'Дата не вказана';
        
        const statusInfo = this.getStatusInfo(order.status);
        const trackingButton = this.generateTrackingButton(order);

        return `
            <div class="user-order-item" data-status="${order.status}">
                <div class="order-header">
                    <div class="order-main-info">
                        <h4>Замовлення #${order.id}</h4>
                        <span class="order-date">${orderDate}</span>
                    </div>
                    <span class="order-status ${statusInfo.class}">
                        ${statusInfo.icon} ${statusInfo.text}
                    </span>
                </div>
                
                <div class="order-summary-short">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <i class="fas fa-cube"></i>
                            <span>${order.itemsCount} товарів</span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-receipt"></i>
                            <span>${order.totalFormatted} ₴</span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-truck"></i>
                            <span>${order.delivery?.service || 'Не вказано'}</span>
                        </div>
                        ${order.ttn ? `
                            <div class="summary-item">
                                <i class="fas fa-barcode"></i>
                                <span>ТТН: ${order.ttn}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="user-order-actions">
                    <button class="btn btn-outline" onclick="orderManager.viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i> Деталі замовлення
                    </button>
                    ${trackingButton}
                    ${order.status === 'new' ? `
                        <button class="btn btn-danger" onclick="orderManager.cancelOrder('${order.id}')">
                            <i class="fas fa-times"></i> Скасувати
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Генерация кнопки отслеживания
    generateTrackingButton(order) {
        if (!order.ttn) return '';

        const trackingUrl = this.getTrackingUrl(order);
        if (!trackingUrl) return '';

        return `
            <a href="${trackingUrl}" 
               target="_blank" 
               class="btn btn-outline"
               onclick="orderManager.trackPackage('${order.id}')">
                <i class="fas fa-truck"></i> Відстежити
            </a>
        `;
    }

    // Получение URL для отслеживания
    getTrackingUrl(order) {
        if (!order.ttn) return null;

        const deliveryService = order.delivery?.service?.toLowerCase() || '';
        const ttn = order.ttn.trim();

        if (deliveryService.includes('нова') || deliveryService.includes('nova')) {
            // Новая Почта
            return `https://tracking.novaposhta.ua/#/uk/search/${ttn}`;
        } else if (deliveryService.includes('укрпошта') || deliveryService.includes('ukrposhta')) {
            // Укрпошта
            return `https://track.ukrposhta.ua/tracking_UA.html?barcode=${ttn}`;
        } else {
            // По умолчанию считаем, что это Новая Почта
            return `https://tracking.novaposhta.ua/#/uk/search/${ttn}`;
        }
    }

    // Получить информацию о статусе
    getStatusInfo(status) {
        const statusMap = {
            'new': { class: 'status-new', text: 'Новий', icon: '🆕' },
            'processing': { class: 'status-processing', text: 'В обробці', icon: '⚙️' },
            'shipped': { class: 'status-shipped', text: 'Відправлено', icon: '🚚' },
            'delivered': { class: 'status-delivered', text: 'Доставлено', icon: '✅' },
            'cancelled': { class: 'status-cancelled', text: 'Скасовано', icon: '❌' }
        };
        
        return statusMap[status] || statusMap['new'];
    }

    // Фильтрация заказов по статусу
    filterOrders(status) {
        const orderItems = document.querySelectorAll('.user-order-item');
        
        orderItems.forEach(item => {
            if (status === 'all' || item.dataset.status === status) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });

        // Показываем сообщение, если нет заказов с выбранным статусом
        const visibleOrders = document.querySelectorAll('.user-order-item[style="display: block"]');
        const ordersList = document.getElementById("user-orders-list");
        
        if (visibleOrders.length === 0 && this.orders.length > 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-orders-found';
            noResults.innerHTML = `
                <i class="fas fa-search"></i>
                <h4>Не знайдено замовлень з обраним статусом</h4>
                <button class="btn btn-outline" onclick="orderManager.filterOrders('all')">
                    Показати всі замовлення
                </button>
            `;
            
            // Убедимся, что сообщение добавляется только один раз
            const existingMessage = ordersList.querySelector('.no-orders-found');
            if (existingMessage) {
                existingMessage.remove();
            }
            ordersList.appendChild(noResults);
        } else {
            const existingMessage = ordersList.querySelector('.no-orders-found');
            if (existingMessage) {
                existingMessage.remove();
            }
        }
    }

    // Применить текущий фильтр
    applyCurrentFilter() {
        const filterSelect = document.getElementById('orders-status-filter');
        if (filterSelect) {
            this.filterOrders(filterSelect.value);
        }
    }

    // Просмотр деталей заказа
    async viewOrderDetails(orderId) {
        try {
            const doc = await db.collection("orders").doc(orderId).get();
            
            if (!doc.exists) {
                showNotification("Замовлення не знайдено", "error");
                return;
            }
            
            const order = { id: doc.id, ...doc.data() };
            
            // Проверка прав доступа
            if (!adminMode && order.userId !== currentUser.uid) {
                showNotification("У вас немає доступу до цього замовлення", "error");
                return;
            }
            
            this.showOrderDetailsModal(order);
            
        } catch (error) {
            console.error("Помилка завантаження деталей замовлення: ", error);
            showNotification("Помилка завантаження деталей замовлення", "error");
        }
    }

    // Показать модальное окно с деталями заказа
    showOrderDetailsModal(order) {
        const modalContent = document.getElementById("modal-content");
        const itemsHTML = this.generateOrderItemsHTML(order);
        const statusInfo = this.getStatusInfo(order.status);
        const trackingButton = this.generateTrackingButton(order);
        
        modalContent.innerHTML = `
            <button class="modal-close" onclick="closeModal()" aria-label="Закрити">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
            
            <div class="order-details-container">
                <div class="order-details-header">
                    <h3>Замовлення #${order.id}</h3>
                    <span class="order-status-badge ${statusInfo.class}">
                        ${statusInfo.icon} ${statusInfo.text}
                    </span>
                </div>

                ${this.generateTTNSection(order)}
                ${this.generateCustomerInfoSection(order)}
                ${this.generateOrderMetaSection(order)}
                ${this.generateDeliveryInfoSection(order)}
                ${adminMode ? this.generateAdminControlsSection(order) : ''}
                ${this.generateOrderItemsSection(order, itemsHTML)}
                ${this.generateOrderTotalSection(order)}
                
                <div class="order-actions-footer">
                    ${trackingButton}
                    <button class="btn btn-outline" onclick="orderManager.printOrder('${order.id}')">
                        <i class="fas fa-print"></i> Друк
                    </button>
                    <button class="btn" onclick="closeModal()">
                        <i class="fas fa-times"></i> Закрити
                    </button>
                </div>
            </div>
        `;
        
        openModal();
    }

    // Генерация секции ТТН
    generateTTNSection(order) {
        if (!order.ttn) {
            return `
                <div class="ttn-section no-ttn">
                    <i class="fas fa-info-circle"></i>
                    <p>ТТН ще не додано до цього замовлення. Ми повідомимо вас, коли замовлення буде відправлено.</p>
                </div>
            `;
        }

        const ttnDate = order.ttnAddedAt ? 
            order.ttnAddedAt.toDate().toLocaleString('uk-UA') : 
            'Дата не вказана';

        const trackingUrl = this.getTrackingUrl(order);

        return `
            <div class="ttn-section">
                <h4>📦 Інформація про відправлення</h4>
                <div class="ttn-info">
                    <div class="ttn-item">
                        <strong>ТТН номер:</strong>
                        <span class="ttn-number">${order.ttn}</span>
                    </div>
                    <div class="ttn-item">
                        <strong>Дата відправки:</strong>
                        <span>${ttnDate}</span>
                    </div>
                    <div class="ttn-item">
                        <strong>Служба доставки:</strong>
                        <span>${order.delivery?.service || 'Не вказано'}</span>
                    </div>
                </div>
                ${trackingUrl ? `
                    <a href="${trackingUrl}" 
                       target="_blank" 
                       class="btn btn-track"
                       onclick="orderManager.trackPackage('${order.id}')">
                        <i class="fas fa-external-link-alt"></i> Відстежити посилку
                    </a>
                ` : ''}
            </div>
        `;
    }

    // Генерация секции информации о клиенте
    generateCustomerInfoSection(order) {
        // ДОБАВЛЕНО: отображение комментария клиента
        let commentSection = '';
        if (order.comment) {
            commentSection = `
                <div class="info-item full-width">
                    <strong>Коментар клієнта:</strong>
                    <div class="customer-comment">${order.comment}</div>
                </div>
            `;
        }

        return `
            <div class="customer-info-section">
                <h4>👤 Інформація про клієнта</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Ім'я:</strong>
                        <span>${order.userName}</span>
                    </div>
                    <div class="info-item">
                        <strong>Email:</strong>
                        <span>${order.userEmail}</span>
                    </div>
                    <div class="info-item">
                        <strong>Телефон:</strong>
                        <span>${order.userPhone}</span>
                    </div>
                    ${commentSection}
                </div>
            </div>
        `;
    }

    // Генерация секции мета-информации заказа
    generateOrderMetaSection(order) {
        const orderDate = order.createdAt ? 
            order.createdAt.toDate().toLocaleString('uk-UA') : 
            'Дата не вказана';
        const updatedDate = order.updatedAt ? 
            order.updatedAt.toDate().toLocaleString('uk-UA') : 
            'Дата не вказана';

        return `
            <div class="order-meta-section">
                <h4>📋 Інформація про замовлення</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Дата створення:</strong>
                        <span>${orderDate}</span>
                    </div>
                    <div class="info-item">
                        <strong>Дата оновлення:</strong>
                        <span>${updatedDate}</span>
                    </div>
                    <div class="info-item">
                        <strong>Спосіб оплати:</strong>
                        <span>${order.paymentMethod === 'cash' ? '💵 Готівкою при отриманні' : '💳 Онлайн-оплата'}</span>
                    </div>
                    <div class="info-item">
                        <strong>Номер замовлення:</strong>
                        <span class="order-number">${order.id}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Генерация секции информации о доставке
    generateDeliveryInfoSection(order) {
        const deliveryService = order.delivery?.service || 'Не вказано';
        const estimatedDelivery = this.getEstimatedDelivery(deliveryService);

        return `
            <div class="delivery-info-section">
                <h4>🚚 Доставка</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Служба доставки:</strong>
                        <span>${deliveryService}</span>
                    </div>
                    ${order.delivery?.city ? `
                        <div class="info-item">
                            <strong>Місто:</strong>
                            <span>${order.delivery.city}</span>
                        </div>
                    ` : ''}
                    ${order.delivery?.warehouse ? `
                        <div class="info-item">
                            <strong>Відділення:</strong>
                            <span>${order.delivery.warehouse}</span>
                        </div>
                    ` : ''}
                    ${order.delivery?.index ? `
                        <div class="info-item">
                            <strong>Поштовий індекс:</strong>
                            <span>${order.delivery.index}</span>
                        </div>
                    ` : ''}
                    ${order.delivery?.address ? `
                        <div class="info-item">
                            <strong>Адреса:</strong>
                            <span>${order.delivery.address}</span>
                        </div>
                    ` : ''}
                    <div class="info-item">
                        <strong>Орієнтовний термін доставки:</strong>
                        <span>${estimatedDelivery}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Получение ориентировочного срока доставки
    getEstimatedDelivery(service) {
        if (service.includes('Нова Пошта')) {
            return '1-3 робочих дні';
        } else if (service.includes('Укрпошта')) {
            return '2-5 робочих днів';
        } else {
            return '2-4 робочих дні';
        }
    }

    // Генерация секции админ-контролов
    generateAdminControlsSection(order) {
        return `
            <div class="admin-controls-section">
                <h4>⚙️ Керування замовленням (Адмін)</h4>
                <div class="admin-controls-grid">
                    <select onchange="orderManager.changeOrderStatus('${order.id}', this.value)" 
                            class="status-select">
                        <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новий</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обробці</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Відправлено</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлено</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Скасовано</option>
                    </select>
                    <button class="btn btn-outline" onclick="orderManager.addTTNToOrder('${order.id}')">
                        <i class="fas fa-truck"></i> ${order.ttn ? 'Змінити ТТН' : 'Додати ТТН'}
                    </button>
                    <button class="btn btn-danger" onclick="orderManager.deleteOrder('${order.id}')">
                        <i class="fas fa-trash"></i> Видалити
                    </button>
                </div>
            </div>
        `;
    }

    // Генерация секции товаров заказа
    generateOrderItemsSection(order, itemsHTML) {
        const itemsCount = this.calculateItemsCount(order.items);
        
        return `
            <div class="order-items-section">
                <h4>🛍️ Товари у замовленні (${itemsCount} шт.)</h4>
                <div class="order-items-container">
                    ${itemsHTML || '<p class="no-items">Товари не знайдені</p>'}
                </div>
            </div>
        `;
    }

    // Генерация HTML для товаров заказа
    generateOrderItemsHTML(order) {
        if (!order.items) return '';
        
        let itemsHTML = '';
        let totalAmount = 0;
        
        for (const [productId, quantity] of Object.entries(order.items)) {
            const product = products.find(p => p.id === productId);
            if (product) {
                const itemTotal = product.price * quantity;
                totalAmount += itemTotal;
                
                itemsHTML += `
                    <div class="order-item-detail" onclick="showProductDetail('${product.id}')">
                        <img src="${product.image || 'https://via.placeholder.com/80x80?text=Fashion'}" 
                             alt="${product.title}" 
                             class="order-item-image">
                        <div class="order-item-info">
                            <h5 class="order-item-title">${product.title}</h5>
                            <div class="order-item-meta">
                                ${product.brand ? `<span class="item-brand">${product.brand}</span>` : ''}
                                <span class="item-quantity">Кількість: ${quantity}</span>
                                ${product.size ? `<span class="item-size">Розмір: ${product.size}</span>` : ''}
                            </div>
                            <div class="order-item-pricing">
                                <span class="item-price">${formatPrice(product.price)} ₴ × ${quantity}</span>
                                <span class="item-total">${formatPrice(itemTotal)} ₴</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        return itemsHTML;
    }

    // Генерация секции итоговой суммы
    generateOrderTotalSection(order) {
        const total = order.total || this.calculateOrderTotal(order.items);
        
        return `
            <div class="order-total-section">
                <div class="total-line">
                    <span>Сума товарів:</span>
                    <span>${formatPrice(total)} ₴</span>
                </div>
                <div class="total-line delivery-cost">
                    <span>Вартість доставки:</span>
                    <span>За тарифами перевізника</span>
                </div>
                <div class="total-line final-total">
                    <strong>Разом до сплати:</strong>
                    <strong>${formatPrice(total)} ₴</strong>
                </div>
            </div>
        `;
    }

    // Подсчет общей суммы заказа
    calculateOrderTotal(items) {
        if (!items) return 0;
        
        return Object.entries(items).reduce((sum, [productId, quantity]) => {
            const product = products.find(p => p.id === productId);
            return sum + (product ? product.price * quantity : 0);
        }, 0);
    }

    // Отслеживание посылки
    trackPackage(orderId) {
        console.log(`Tracking package for order: ${orderId}`);
        // Можно добавить аналитику здесь
    }

    // Печать заказа
    printOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const printWindow = window.open('', '_blank');
        const printContent = this.generatePrintContent(order);
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Замовлення #${order.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .print-section { margin-bottom: 20px; }
                    .print-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .print-table th, .print-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    .print-table th { background-color: #f5f5f5; }
                    .total-section { margin-top: 30px; text-align: right; font-weight: bold; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }

    // Генерация контента для печати
    generatePrintContent(order) {
        const orderDate = order.createdAt ? 
            order.createdAt.toDate().toLocaleString('uk-UA') : 
            'Дата не вказана';
        
        let itemsHTML = '';
        let total = 0;

        if (order.items) {
            for (const [productId, quantity] of Object.entries(order.items)) {
                const product = products.find(p => p.id === productId);
                if (product) {
                    const itemTotal = product.price * quantity;
                    total += itemTotal;
                    
                    itemsHTML += `
                        <tr>
                            <td>${product.title}</td>
                            <td>${product.brand || '-'}</td>
                            <td>${quantity}</td>
                            <td>${formatPrice(product.price)} ₴</td>
                            <td>${formatPrice(itemTotal)} ₴</td>
                        </tr>
                    `;
                }
            }
        }

        // ДОБАВЛЕНО: комментарий в печатную версию
        const commentSection = order.comment ? `
            <div class="print-section">
                <h3>Коментар клієнта</h3>
                <p style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
                    ${order.comment}
                </p>
            </div>
        ` : '';

        return `
            <div class="print-header">
                <h1>FashionStore</h1>
                <h2>Замовлення #${order.id}</h2>
                <p>Дата створення: ${orderDate}</p>
            </div>
            
            <div class="print-section">
                <h3>Інформація про клієнта</h3>
                <p><strong>Ім'я:</strong> ${order.userName}</p>
                <p><strong>Телефон:</strong> ${order.userPhone}</p>
                <p><strong>Email:</strong> ${order.userEmail}</p>
            </div>
            
            ${commentSection}
            
            <div class="print-section">
                <h3>Доставка</h3>
                <p><strong>Служба доставки:</strong> ${order.delivery?.service || 'Не вказано'}</p>
                <p><strong>Місто:</strong> ${order.delivery?.city || 'Не вказано'}</p>
                <p><strong>Відділення:</strong> ${order.delivery?.warehouse || 'Не вказано'}</p>
                ${order.delivery?.index ? `<p><strong>Поштовий індекс:</strong> ${order.delivery.index}</p>` : ''}
                ${order.delivery?.address ? `<p><strong>Адреса:</strong> ${order.delivery.address}</p>` : ''}
            </div>
            
            <div class="print-section">
                <h3>Товари</h3>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Товар</th>
                            <th>Бренд</th>
                            <th>Кількість</th>
                            <th>Ціна</th>
                            <th>Сума</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            </div>
            
            <div class="total-section">
                <p><strong>Загальна сума: ${formatPrice(total)} ₴</strong></p>
                <p><strong>Статус: ${this.getStatusInfo(order.status).text}</strong></p>
                ${order.ttn ? `<p><strong>ТТН: ${order.ttn}</strong></p>` : ''}
            </div>
        `;
    }

    // Отмена заказа
    async cancelOrder(orderId) {
        if (!confirm("Ви впевнені, що хочете скасувати це замовлення? Цю дію неможливо скасувати.")) {
            return;
        }

        try {
            await db.collection("orders").doc(orderId).update({
                status: 'cancelled',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification("Замовлення успішно скасовано");
            
        } catch (error) {
            console.error("Помилка скасування замовлення: ", error);
            showNotification("Помилка скасування замовлення", "error");
        }
    }

    // Изменение статуса заказа (для админа)
    async changeOrderStatus(orderId, status) {
        try {
            await db.collection("orders").doc(orderId).update({
                status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification(`Статус замовлення змінено на: ${this.getStatusInfo(status).text}`);
            
        } catch (error) {
            console.error("Помилка оновлення статусу замовлення: ", error);
            showNotification("Помилка оновлення статусу замовлення", "error");
        }
    }

    // Добавление ТТН к заказу (для админа)
    async addTTNToOrder(orderId) {
        const currentOrder = this.orders.find(order => order.id === orderId);
        const currentTTN = currentOrder?.ttn || '';
        
        const ttn = prompt('Введіть ТТН (трек-номер) для цього замовлення:', currentTTN);
        
        if (ttn && ttn.trim() !== '') {
            try {
                await db.collection("orders").doc(orderId).update({
                    ttn: ttn.trim(),
                    ttnAddedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showNotification("ТТН успішно додано до замовлення");
                
                // Отправка email с ТТН
                const orderDoc = await db.collection("orders").doc(orderId).get();
                if (orderDoc.exists) {
                    const order = { id: orderDoc.id, ...orderDoc.data() };
                    this.sendTTNEmail(order);
                }
                
            } catch (error) {
                console.error("Помилка додавання ТТН: ", error);
                showNotification("Помилка додавання ТТН", "error");
            }
        }
    }

    // Удаление заказа (для админа)
    async deleteOrder(orderId) {
        if (!confirm("Ви впевнені, що хочете видалити це замовлення? Цю дію неможливо скасувати.")) {
            return;
        }

        try {
            await db.collection("orders").doc(orderId).delete();
            showNotification("Замовлення успішно видалено");
        } catch (error) {
            console.error("Помилка видалення замовлення: ", error);
            showNotification("Помилка видалення замовлення", "error");
        }
    }

    // Отправка email с ТТН
    sendTTNEmail(order) {
        if (!order.ttn) return;
        
        const trackingUrl = this.getTrackingUrl(order);
        
        const templateParams = {
            to_email: order.userEmail,
            order_id: order.id,
            customer_name: order.userName,
            ttn_number: order.ttn,
            delivery_service: order.delivery?.service || 'Нова Пошта',
            delivery_city: order.delivery?.city || '',
            delivery_warehouse: order.delivery?.warehouse || '',
            delivery_index: order.delivery?.index || '',
            tracking_url: trackingUrl || '#'
        };

        emailjs.send(EMAILJS_SERVICE_ID, "template_ttn_notification", templateParams)
            .then(function(response) {
                console.log('Email с ТТН успішно відправлено!', response.status, response.text);
            }, function(error) {
                console.error('Помилка відправки email з ТТН:', error);
            });
    }

    // Очистка ресурсов
    cleanup() {
        if (this.currentOrdersUnsubscribe) {
            this.currentOrdersUnsubscribe();
            this.currentOrdersUnsubscribe = null;
        }
    }
}

// Создаем глобальный экземпляр менеджера заказов
const orderManager = new OrderManager();

// ===== ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ФУНКЦИЙ =====

// Обновляем функцию закрытия модального окна для очистки ресурсов
const originalCloseModal = closeModal;
closeModal = function() {
    orderManager.cleanup();
    originalCloseModal();
};

// Обновляем функцию viewOrders для использования нового менеджера
function viewOrders() {
    orderManager.viewOrders();
}

// Обновляем функцию viewOrderDetails
function viewOrderDetails(orderId) {
    orderManager.viewOrderDetails(orderId);
}

// ===== ДОБАВЛЯЕМ НОВЫЕ СТИЛИ =====

function addOrdersStyles() {
    const styles = `
        <style>
            /* Стили для улучшенной системы заказов */
            .orders-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #f0f0f0;
            }
            
            .orders-stats {
                font-size: 0.9em;
                color: #666;
            }
            
            .orders-count {
                background: #007bff;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: bold;
            }
            
            .orders-filter {
                margin-bottom: 20px;
            }
            
            .orders-filter select {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background: white;
            }
            
            .user-orders-list {
                max-height: 60vh;
                overflow-y: auto;
                padding-right: 10px;
            }
            
            .user-order-item {
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 15px;
                background: white;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .user-order-item:hover {
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                transform: translateY(-2px);
            }
            
            .order-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 15px;
            }
            
            .order-main-info h4 {
                margin: 0 0 5px 0;
                color: #333;
                font-size: 1.1em;
            }
            
            .order-date {
                color: #666;
                font-size: 0.85em;
            }
            
            .order-status {
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.8em;
                font-weight: bold;
                white-space: nowrap;
            }
            
            .status-new { background: #e3f2fd; color: #1976d2; }
            .status-processing { background: #fff3e0; color: #f57c00; }
            .status-shipped { background: #e8f5e8; color: #388e3c; }
            .status-delivered { background: #e8f5e8; color: #388e3c; }
            .status-cancelled { background: #ffebee; color: #d32f2f; }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
                margin: 15px 0;
            }
            
            .summary-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9em;
                color: #555;
            }
            
            .user-order-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-top: 15px;
            }
            
            .btn-outline {
                background: transparent;
                border: 1px solid #007bff;
                color: #007bff;
            }
            
            .btn-outline:hover {
                background: #007bff;
                color: white;
            }
            
            .btn-danger {
                background: #dc3545;
                color: white;
                border: none;
            }
            
            .btn-danger:hover {
                background: #c82333;
            }
            
            .loading-spinner {
                text-align: center;
                padding: 40px 20px;
                color: #666;
            }
            
            .loading-spinner i {
                font-size: 2em;
                margin-bottom: 15px;
                color: #007bff;
            }
            
            .empty-orders, .error-loading {
                text-align: center;
                padding: 40px 20px;
                color: #666;
            }
            
            .empty-orders i, .error-loading i {
                font-size: 3em;
                margin-bottom: 20px;
                color: #ddd;
            }
            
            .no-orders-found {
                text-align: center;
                padding: 40px 20px;
                color: #666;
                border: 2px dashed #ddd;
                border-radius: 12px;
                margin: 20px 0;
            }
            
            .order-details-container {
                max-height: 80vh;
                overflow-y: auto;
                padding-right: 10px;
            }
            
            .order-details-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid #f0f0f0;
            }
            
            .order-status-badge {
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 0.9em;
            }
            
            .ttn-section, .customer-info-section, 
            .order-meta-section, .delivery-info-section,
            .admin-controls-section, .order-items-section {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                border-left: 4px solid #007bff;
            }
            
            .ttn-section.no-ttn {
                background: #fff3cd;
                border-left-color: #ffc107;
            }
            
            .ttn-info {
                display: grid;
                gap: 10px;
                margin: 15px 0;
            }
            
            .ttn-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            
            .ttn-number {
                font-family: monospace;
                font-weight: bold;
                color: #007bff;
            }
            
            .btn-track {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #28a745;
                color: white;
                padding: 10px 15px;
                border-radius: 6px;
                text-decoration: none;
                margin-top: 10px;
            }
            
            .btn-track:hover {
                background: #218838;
                color: white;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 12px;
            }
            
            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            
            .info-item.full-width {
                grid-column: 1 / -1;
            }
            
            .customer-comment {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 6px;
                border-left: 3px solid #007bff;
                font-style: italic;
                margin-top: 8px;
                white-space: pre-wrap;
                word-break: break-word;
                line-height: 1.4;
            }
            
            .admin-controls-grid {
                display: grid;
                grid-template-columns: 1fr auto auto;
                gap: 15px;
                align-items: center;
            }
            
            .order-items-container {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .order-item-detail {
                display: flex;
                gap: 15px;
                padding: 15px;
                border: 1px solid #eee;
                border-radius: 8px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .order-item-detail:hover {
                background: #f8f9fa;
                border-color: #007bff;
            }
            
            .order-item-image {
                width: 80px;
                height: 80px;
                object-fit: cover;
                border-radius: 6px;
            }
            
            .order-item-info {
                flex: 1;
            }
            
            .order-item-title {
                margin: 0 0 8px 0;
                font-size: 1em;
                color: #333;
            }
            
            .order-item-meta {
                display: flex;
                gap: 15px;
                margin-bottom: 8px;
                font-size: 0.85em;
                color: #666;
            }
            
            .item-brand {
                background: #e9ecef;
                padding: 2px 8px;
                border-radius: 4px;
            }
            
            .order-item-pricing {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .item-price {
                color: #666;
            }
            
            .item-total {
                font-weight: bold;
                color: #333;
            }
            
            .order-total-section {
                background: white;
                padding: 20px;
                border-radius: 12px;
                border: 2px solid #f0f0f0;
            }
            
            .total-line {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #eee;
            }
            
            .total-line:last-child {
                border-bottom: none;
            }
            
            .delivery-cost {
                color: #666;
                font-style: italic;
            }
            
            .final-total {
                font-size: 1.1em;
                font-weight: bold;
                color: #333;
                padding-top: 15px;
                border-top: 2px solid #eee;
            }
            
            .order-actions-footer {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            
            .order-number {
                font-family: monospace;
                background: #f8f9fa;
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #dee2e6;
            }
            
            /* Стили для поля комментария */
            .form-group textarea {
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                resize: vertical;
                min-height: 80px;
                font-family: inherit;
                font-size: 14px;
                transition: border-color 0.3s ease;
            }
            
            .form-group textarea:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
            }
            
            .char-counter {
                font-size: 0.8em;
                color: #666;
                text-align: right;
                margin-top: 5px;
            }
            
            .comment-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                border-left: 4px solid #007bff;
            }
            
            @media (max-width: 768px) {
                .orders-header {
                    flex-direction: column;
                    gap: 10px;
                    align-items: flex-start;
                }
                
                .order-header {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .summary-grid {
                    grid-template-columns: 1fr;
                }
                
                .user-order-actions {
                    flex-direction: column;
                }
                
                .user-order-actions .btn {
                    width: 100%;
                    justify-content: center;
                }
                
                .admin-controls-grid {
                    grid-template-columns: 1fr;
                }
                
                .order-item-detail {
                    flex-direction: column;
                    text-align: center;
                }
                
                .order-item-pricing {
                    flex-direction: column;
                    gap: 5px;
                }
                
                .order-actions-footer {
                    flex-direction: column;
                }
                
                .order-actions-footer .btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}

// ===== АДМИН-ПАНЕЛЬ =====

function switchTab(tabId) {
    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");
    
    tabs.forEach(tab => tab.classList.remove("active"));
    tabContents.forEach(content => content.classList.remove("active"));
    
    document.querySelector(`.tab[onclick="switchTab('${tabId}')"]`).classList.add("active");
    document.getElementById(tabId).classList.add("active");
    
    if (tabId === 'products-tab') {
        loadAdminProducts();
    }
    
    if (tabId === 'orders-tab') {
        loadAdminOrders();
    }
}

function loadAdminOrders() {
    const ordersList = document.getElementById("admin-orders-list");
    if (!ordersList) return;
    
    ordersList.innerHTML = '<p>Завантаження замовлень...</p>';
    
    db.collection("orders")
        .orderBy("createdAt", "desc")
        .onSnapshot((querySnapshot) => {
            if (querySnapshot.empty) {
                ordersList.innerHTML = '<p>Замовлень немає</p>';
                return;
            }
            
            ordersList.innerHTML = '';
            
            querySnapshot.forEach((doc) => {
                const order = { id: doc.id, ...doc.data() };
                const orderDate = order.createdAt ? order.createdAt.toDate().toLocaleString('uk-UA') : 'Дата не вказана';
                
                let statusClass = 'status-new';
                let statusText = 'Новий';
                
                if (order.status === 'processing') {
                    statusClass = 'status-processing';
                    statusText = 'В обробці';
                } else if (order.status === 'shipped') {
                    statusClass = 'status-shipped';
                    statusText = 'Відправлено';
                } else if (order.status === 'delivered') {
                    statusClass = 'status-delivered';
                    statusText = 'Доставлено';
                } else if (order.status === 'cancelled') {
                    statusClass = 'status-cancelled';
                    statusText = 'Скасовано';
                }
                
                const orderElement = document.createElement('div');
                orderElement.className = 'admin-order-item';
                orderElement.innerHTML = `
                    <div class="order-header">
                        <h4>Замовлення #${order.id}</h4>
                        <span class="order-date">${orderDate}</span>
                    </div>
                    <div class="order-info">
                        <p><strong>Клієнт:</strong> ${order.userName} (${order.userEmail}, ${order.userPhone})</p>
                        ${order.comment ? `<p><strong>Коментар:</strong> ${order.comment}</p>` : ''}
                        <p><strong>Сума:</strong> ${formatPrice(order.total)} ₴</p>
                        <p><strong>Доставка:</strong> ${order.delivery.service}</p>
                        <p><strong>Статус:</strong> <span class="order-status ${statusClass}">${statusText}</span></p>
                        ${order.ttn ? `<p><strong>ТТН:</strong> ${order.ttn}</p>` : ''}
                    </div>
                    <div class="admin-order-actions">
                        <button class="btn btn-detail" onclick="orderManager.viewOrderDetails('${order.id}')">Деталі</button>
                        <select onchange="orderManager.changeOrderStatus('${order.id}', this.value)">
                            <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новий</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обробці</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Відправлено</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлено</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Скасовано</option>
                        </select>
                        <button class="btn" onclick="orderManager.addTTNToOrder('${order.id}')">ТТН</button>
                        <button class="btn btn-danger" onclick="orderManager.deleteOrder('${order.id}')">Видалити</button>
                    </div>
                `;
                
                ordersList.appendChild(orderElement);
            });
        }, (error) => {
            console.error("Помилка завантаження замовлень: ", error);
            ordersList.innerHTML = '<p>Помилка завантаження замовлень</p>';
        });
}

// ===== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ =====

function switchSource(source) {
    currentFilters.source = source;
    applyFilters();
    
    document.querySelectorAll('.source-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
}

function toggleFilters() {
    const filters = document.getElementById('filters');
    filters.classList.toggle('active');
}

function openRules() {
    document.getElementById('rules-modal').classList.add('active');
}

function closeRulesModal() {
    document.getElementById('rules-modal').classList.remove('active');
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ===== МОДАЛЬНЫЕ ОКНА =====

function openModal() {
    document.getElementById("modal").classList.add("active");
}

function closeModal() {
    const modal = document.getElementById("modal");
    modal.classList.remove("active");
    document.body.style.overflow = '';
    
    if (window.currentOrdersUnsubscribe) {
        window.currentOrdersUnsubscribe();
        window.currentOrdersUnsubscribe = null;
    }
}

function openAuthModal() {
    const modalContent = document.getElementById("modal-content");
    modalContent.innerHTML = `
        <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
        <h3>Вхід в систему</h3>
        <div class="auth-tabs">
            <div class="auth-tab active" onclick="switchAuthTab('login')">Вхід</div>
            <div class="auth-tab" onclick="switchAuthTab('register')">Реєстрація</div>
            <div class="auth-tab" onclick="switchAuthTab('admin')">Адміністратор</div>
        </div>
        <form id="login-form" onsubmit="login(event)">
            <div class="form-group">
                <label>Email</label>
                <input type="email" required>
            </div>
            <div class="form-group">
                <label>Пароль</label>
                <input type="password" required>
            </div>
            <button type="submit" class="btn btn-detail">Увійти</button>
        </form>
        <form id="register-form" style="display:none;" onsubmit="register(event)">
            <div class="form-group">
                <label>Ім'я</label>
                <input type="text" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" required>
            </div>
            <div class="form-group">
                <label>Пароль</label>
                <input type="password" required minlength="6">
            </div>
            <button type="submit" class="btn btn-detail">Зареєструватися</button>
        </form>
        <div id="admin-auth-form" style="display:none;">
            <p>Для доступу до панелі адміністратора введіть пароль:</p>
            <div class="form-group">
                <label>Пароль адміністратора</label>
                <input type="password" id="admin-password" required>
            </div>
            <button class="btn btn-admin" onclick="verifyAdminPassword()">Отримати права адміністратора</button>
        </div>
    `;
    
    openModal();
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const adminForm = document.getElementById("admin-auth-form");
    const tabs = document.querySelectorAll(".auth-tab");
    
    tabs.forEach(tab => tab.classList.remove('active'));
    
    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        adminForm.style.display = 'none';
        tabs[0].classList.add('active');
    } else if (tab === 'register') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        adminForm.style.display = 'none';
        tabs[1].classList.add('active');
    } else if (tab === 'admin') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        adminForm.style.display = 'block';
        tabs[2].classList.add('active');
    }
}

function login(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            showNotification("Вхід виконано успішно");
            closeModal();
        })
        .catch(error => {
            let message = "Помилка входу";
            switch (error.code) {
                case 'auth/user-not-found':
                    message = "Користувач не знайдений";
                    break;
                case 'auth/wrong-password':
                    message = "Невірний пароль";
                    break;
            }
            showNotification(message, "error");
        });
}

function register(event) {
    event.preventDefault();
    const name = event.target.querySelector('input[type="text"]').value;
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return userCredential.user.updateProfile({
                displayName: name
            });
        })
        .then(() => {
            showNotification("Реєстрація виконана успішно");
            closeModal();
        })
        .catch(error => {
            console.error("Помилка реєстрації: ", error);
            showNotification("Помилка реєстрації: " + error.message, "error");
        });
}

function verifyAdminPassword() {
    const password = document.getElementById("admin-password").value;
    if (password === ADMIN_PASSWORD) {
        if (!currentUser) {
            showNotification("Спочатку увійдіть в систему", "error");
            switchAuthTab('login');
            return;
        }
        
        const admins = JSON.parse(localStorage.getItem(ADMINS_STORAGE_KEY) || '{}');
        admins[currentUser.uid] = true;
        localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(admins));
        
        document.getElementById("admin-panel").style.display = "block";
        adminMode = true;
        showNotification("Права адміністратора отримані");
        closeModal();
        
        loadAdminOrders();
        
        // Показываем счетчик просмотров для администратора
        setupPageCounter();
    } else {
        showNotification("Невірний пароль адміністратора", "error");
    }
}

function promptAdminPassword() {
    const password = prompt("Введіть пароль адміністратора:");
    if (password === ADMIN_PASSWORD) {
        if (!currentUser) {
            showNotification("Спочатку увійдіть в систему", "error");
            openAuthModal();
            return;
        }
        
        const admins = JSON.parse(localStorage.getItem(ADMINS_STORAGE_KEY) || '{}');
        admins[currentUser.uid] = true;
        localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(admins));
        
        document.getElementById("admin-panel").style.display = "block";
        adminMode = true;
        showNotification("Права адміністратора отримані");
        
        loadAdminOrders();
        
        // Показываем счетчик просмотров для администратора
        setupPageCounter();
    } else if (password) {
        showNotification("Невірний пароль адміністратора", "error");
    }
}

function checkAdminStatus(userId) {
    db.collection("admins").doc(userId).get()
        .then((doc) => {
            if (doc.exists) {
                document.getElementById("admin-panel").style.display = "block";
                adminMode = true;
                loadAdminOrders();
                
                // Показываем счетчик просмотров для администратора
                setupPageCounter();
            }
        })
        .catch((error) => {
            console.error("Помилка перевірки прав адміністратора: ", error);
        });
}

function logout() {
    // Скрываем счетчик просмотров при выходе
    const pageViewsContainer = document.getElementById('page-views-container');
    if (pageViewsContainer) {
        pageViewsContainer.style.display = 'none';
    }
    
    auth.signOut()
        .then(() => {
            showNotification("Вихід виконано успішно");
        })
        .catch(error => {
            console.error("Помилка виходу: ", error);
            showNotification("Помилка виходу", "error");
        });
}

// Добавляем обработчик для закрытия голосового поиска при нажатии Esc
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && voiceSearch.isListening) {
        stopVoiceSearch();
        showNotification('Голосовий пошук скасовано', 'info');
    }
});

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function() {
    initApp();
});

// Глобальные переменные для улучшенного поиска
let searchIndexReady = false;
let searchLoading = false;

let searchTimeout = null;
const searchCache = new Map();
const MAX_CACHE_SIZE = 100;
const MAX_SEARCH_RESULTS = 1000;
const ENHANCED_DEBOUNCE_DELAY = 200;
const SEARCH_HISTORY_KEY = "fashionstore_search_history";
const MAX_SEARCH_HISTORY = 10;