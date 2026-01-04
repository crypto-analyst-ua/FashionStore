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
const WHATSAPP_NUMBER = "380684296978"; // Замените на ваш номер телефона

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
    voiceSearch.recognition.onstart = function () {
      voiceSearch.isListening = true;
      updateVoiceSearchUI(true);
      showNotification('Слухаю... Говоріть зараз', 'info');
    };

    voiceSearch.recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      handleVoiceSearchResult(transcript);
    };

    voiceSearch.recognition.onerror = function (event) {
      console.error('Ошибка распознавания голоса:', event.error);
      handleVoiceSearchError(event.error);
    };

    voiceSearch.recognition.onend = function () {
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

  // Определяем, какое поле поиска активное
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
    'сумка': ['повседневная', 'вечерняя', 'пляжна', 'деловая', ' кросс-боди']
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
    'вечерний': ['нарядный', 'гламур', ' торжественный'],
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
      .sort(([, a], [, b]) => b - a)
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
  'кроссовки': ['кросовки', 'кроссовк', 'кроссовки'],
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
  'свитер': ['свитера', 'свитеров', 'кофта', 'кофты', 'джемпер'],
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

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ПРЕДОБРАБОТКИ ТОВАРОВ =====
function preprocessProducts(productsArray) {
  console.log("🔧 Предобработка товаров с характеристиками...");

  const processedProducts = productsArray.map((product, index) => {
    if (!product || typeof product !== 'object') return product;

    // Создаем уникальный ID если его нет
    if (!product.id) {
      product.id = `product_${Date.now()}_${index}`;
    }

    // Обрабатываем характеристики
    const specifications = processSpecifications(product);

    // Парсим доступные размеры и цвета
    let sizeOptions = '';
    let colorOptions = '';
    
    if (product.size) {
      // Пытаемся разобрать размеры из разных форматов
      const sizes = product.size.split(/[,;|/]/).map(s => s.trim()).filter(s => s);
      sizeOptions = sizes.join(',');
    }
    
    if (product.color) {
      // Пытаемся разобрать цвета из разных форматов
      const colors = product.color.split(/[,;|/]/).map(c => c.trim()).filter(c => c);
      colorOptions = colors.join(',');
    }

    const searchFields = [
      product.title || '',
      product.brand || '',
      product.category || '',
      product.description || '',
      specifications.searchText || '',
      product.model || '',
      product.sku || '',
      product.article || '',
      product.vendorCode || '',
      product.size ? `размер:${product.size} size:${product.size} розмір:${product.size}` : '',
      product.color ? `цвет:${product.color} color:${product.color} колір:${product.color}` : '',
      product.material ? `материал:${product.material} material:${product.material} матеріал:${product.material}` : '',
      product.season ? `сезон:${product.season} season:${product.season}` : '',
      product.style ? `стиль:${product.style} style:${product.style}` : ''
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
      oldPrice: Number(product.oldPrice) || null,
      image: product.image || '',
      inStock: product.inStock !== undefined ? product.inStock : true,
      discount: product.discount || 0,
      isNew: product.isNew || false,
      isPopular: product.isPopular || false,

      // Характеристики
      specifications: specifications.formatted,
      size: sizeOptions, // Сохраняем как строку с вариантами
      color: colorOptions, // Сохраняем как строку с вариантами
      material: product.material || '',
      season: product.season || '',
      style: product.style || '',

      // Технические характеристики
      model: product.model || '',
      sku: product.sku || '',
      article: product.article || '',
      vendorCode: product.vendorCode || '',
      composition: product.composition || '',
      care: product.care || '',
      country: product.country || '',
      weight: product.weight || '',
      dimensions: product.dimensions || '',

      // Для улучшенного поиска
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0
    };
  });

  console.log(`✅ Обработано ${processedProducts.length} товаров с характеристиками`);
  return processedProducts;
}

// ===== ФУНКЦИЯ ОБРАБОТКИ ХАРАКТЕРИСТИК =====
function processSpecifications(product) {
  let specifications = {};
  let searchText = '';

  // Если характеристики представлены как объект
  if (typeof product.specifications === 'object' && product.specifications !== null) {
    specifications = { ...product.specifications };
  }
  // Если характеристики представлены как строка
  else if (typeof product.specifications === 'string') {
    try {
      // Пробуем распарсить JSON
      specifications = JSON.parse(product.specifications);
    } catch (e) {
      // Если не JSON, разбиваем по строкам
      const lines = product.specifications.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          specifications[key.trim()] = value;
        }
      });
    }
  }

  // Добавляем основные характеристики если их нет
  const mainSpecs = {
    'Розмір': product.size,
    'Колір': product.color,
    'Матеріал': product.material || product.composition,
    'Сезон': product.season,
    'Стиль': product.style,
    'Бренд': product.brand,
    'Країна виробник': product.country,
    'Склад': product.composition,
    'Догляд': product.care,
    'Вага': product.weight,
    'Розміри упаковки': product.dimensions
  };

  Object.entries(mainSpecs).forEach(([key, value]) => {
    if (value && !specifications[key]) {
      specifications[key] = value;
    }
  });

  // Удаляем пустые характеристики
  Object.keys(specifications).forEach(key => {
    if (!specifications[key]) {
      delete specifications[key];
    } else {
      searchText += ` ${key} ${specifications[key]}`;
    }
  });

  // Форматируем для отображения
  const formattedSpecs = Object.entries(specifications)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  return {
    formatted: formattedSpecs,
    object: specifications,
    searchText: searchText
  };
}

// Улучшенная предобработка товаров
function preprocessProductsOld(productsArray) {
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

// Управление истории поиска
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
    searchInput.addEventListener('input', function () {
      const currentValue = this.value.trim();
      handleSearch(currentValue, false);
      if (searchMobileInput) {
        searchMobileInput.value = currentValue;
      }
    });

    // Обработчик фокуса - показываем историю
    searchInput.addEventListener('focus', function () {
      if (this.value === '') {
        showSearchHistorySuggestions(false);
      }
    });
  }

  // Обработчик для мобильного поиска
  if (searchMobileInput) {
    searchMobileInput.addEventListener('input', function () {
      const currentValue = this.value.trim();
      handleSearch(currentValue, true);
      if (searchInput) {
        searchInput.value = currentValue;
      }
    });

    searchMobileInput.addEventListener('focus', function () {
      if (this.value === '') {
        showSearchHistorySuggestions(true);
      }
    });
  }

  // Закрытие подсказок при клике вне области поиска
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search-container') &&
      !e.target.closest('.search-container-mobile') &&
      !e.target.closest('.voice-search-btn')) {
      hideSearchSuggestions(false);
      hideSearchSuggestions(true);
    }
  });

  // Остановка голосового поиска при клике вне области
  document.addEventListener('click', function (e) {
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
  window.searchProductsEnhanced = function (searchTerm) {
    return searchManager.search(searchTerm);
  };

  window.getEnhancedSearchSuggestions = function (query) {
    return searchManager.getSuggestions(query);
  };

  window.saveToSearchHistory = function (query) {
    searchManager.saveToHistory(query);
  };

  window.getSearchHistory = function () {
    return searchManager.getHistory();
  };

  window.clearSearchHistory = function () {
    searchManager.clearHistory();
  };

  window.removeFromSearchHistory = function (query) {
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

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ЗАГРУЗКИ ТОВАРОВ С ХАРАКТЕРИСТИКАМИ =====
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
          isPopular: product.isPopular || false,
          // Обеспечиваем наличие всех полей характеристик
          specifications: product.specifications || product.details || product.characteristics || '',
          size: product.size || '',
          color: product.color || '',
          material: product.material || '',
          brand: product.brand || '',
          category: product.category || '',
          season: product.season || '',
          style: product.style || '',
          // Добавляем поля для улучшенного поиска
          model: product.model || '',
          sku: product.sku || product.article || '',
          article: product.article || product.sku || '',
          vendorCode: product.vendorCode || '',
          // Дополнительные технические характеристики
          composition: product.composition || product.material || '',
          care: product.care || '',
          country: product.country || '',
          weight: product.weight || '',
          dimensions: product.dimensions || ''
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

// ===== ДОБАВЛЕНИЕ СТИЛЕЙ ДЛЯ МОБИЛЬНЫХ МОДАЛЬНЫХ ОКОН =====
function addMobileModalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Адаптивные стили для модального окна на мобильных устройствах */
    @media (max-width: 768px) {
      #modal {
        padding: 0;
        align-items: flex-start;
        padding-top: 20px;
      }
      
      #modal.active .modal-content {
        width: 95vw;
        max-width: 95vw;
        margin: 0 auto;
        padding: 20px 15px;
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      }
      
      .product-detail {
        flex-direction: column;
        gap: 20px;
      }
      
      .product-image {
        width: 100%;
        text-align: center;
      }
      
      .product-image img {
        max-width: 100%;
        max-height: 350px;
        width: auto;
        height: auto;
      }
      
      .product-info {
        width: 100%;
        padding: 0;
      }
      
      /* Улучшенные стили для характеристик */
      .product-specifications {
        max-height: 200px;
        overflow-y: auto;
        padding: 15px;
      }
      
      .spec-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
        padding: 10px 0;
      }
      
      .spec-value {
        text-align: left;
        word-break: break-word;
      }
      
      /* Адаптивные кнопки */
      .detail-actions {
        flex-direction: column;
        gap: 12px;
      }
      
      .detail-actions .btn {
        width: 100%;
        padding: 14px;
        font-size: 16px;
      }
      
      .btn-favorite {
        position: absolute;
        top: 15px;
        right: 15px;
      }
      
      /* Улучшенный инпут количества */
      .quantity-control {
        width: 100%;
        justify-content: center;
        margin: 20px 0;
      }
      
      .quantity-control .quantity-input {
        width: 60px;
        text-align: center;
      }
      
      /* Улучшенные отзывы */
      .product-reviews {
        max-height: 300px;
        overflow-y: auto;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #eee;
      }
      
      /* Закрывающая кнопка на мобильных */
      .modal-close {
        position: fixed;
        top: 10px;
        right: 15px;
        z-index: 1001;
        background: rgba(255,255,255,0.9);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
    
    /* Для очень маленьких экранов */
    @media (max-width: 375px) {
      #modal.active .modal-content {
        width: 98vw;
        max-width: 98vw;
        padding: 15px 12px;
      }
      
      .product-image img {
        max-height: 280px;
      }
      
      h3 {
        font-size: 1.3em;
        margin-bottom: 15px;
      }
      
      .detail-price {
        font-size: 1.5em;
      }
      
      .form-group textarea {
        font-size: 16px;
        min-height: 100px;
      }
    }
    
    /* Ландшафтная ориентация */
    @media (max-width: 768px) and (orientation: landscape) {
      #modal.active .modal-content {
        max-height: 85vh;
        padding: 15px;
      }
      
      .product-detail {
        flex-direction: row;
        gap: 15px;
      }
      
      .product-image {
        width: 40%;
      }
      
      .product-info {
        width: 60%;
      }
      
      .product-image img {
        max-height: 250px;
      }
    }
  `;
  document.head.appendChild(style);
}

// ===== ДОБАВЛЕНИЕ GOOGLE AUTH =====

function setupGoogleAuth() {
  // Создаем провайдер Google
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  
  // Добавляем дополнительные scope если нужно
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
  
  // Настраиваем язык
  googleProvider.setCustomParameters({
    'login_hint': 'user@example.com',
    'prompt': 'select_account'
  });
  
  return googleProvider;
}

// Функция входа через Google
function loginWithGoogle() {
  const googleProvider = setupGoogleAuth();
  
  auth.signInWithPopup(googleProvider)
    .then((result) => {
      // Успешный вход
      const user = result.user;
      console.log('Google login successful:', user);
      showNotification('Вхід через Google успішний');
      closeModal();
      
      // Проверяем админские права если есть в localStorage
      checkAdminStatus(user.uid);
    })
    .catch((error) => {
      // Обработка ошибок
      console.error('Google login error:', error);
      
      let errorMessage = 'Помилка входу через Google';
      
      switch (error.code) {
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'Акаунт з таким email вже існує з іншим способом входу';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Вспливаюче вікно було заблоковано. Дозвольте спливаючі вікна для цього сайту';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Вхід через Google було скасовано';
          break;
        case 'auth/unauthorized-domain':
          errorMessage = 'Цей домен не авторизований для входу через Google';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Вхід через Google було скасовано';
          break;
        default:
          errorMessage = `Помилка: ${error.message}`;
      }
      
      showNotification(errorMessage, 'error');
    });
}

// Функция регистрации через Google
function registerWithGoogle() {
  loginWithGoogle(); // Регистрация и вход через Google - это один процесс
}

// Функция переключения видимости пароля
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const button = input.parentElement.querySelector('.toggle-password-btn i');
  
  if (input.type === 'password') {
    input.type = 'text';
    button.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    button.className = 'fas fa-eye';
  }
}

// Функция открытия формы восстановления пароля
function openPasswordReset() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const adminForm = document.getElementById("admin-auth-form");
  const resetForm = document.getElementById("password-reset-form");
  const tabs = document.querySelectorAll(".auth-tab");

  tabs.forEach(tab => tab.classList.remove('active'));

  loginForm.style.display = 'none';
  registerForm.style.display = 'none';
  adminForm.style.display = 'none';
  resetForm.style.display = 'block';
}

// Функция отправки email для восстановления пароля
function sendPasswordResetEmail() {
  const email = document.getElementById('reset-email').value.trim();
  
  if (!email) {
    showNotification('Будь ласка, введіть email', 'error');
    return;
  }

  auth.sendPasswordResetEmail(email)
    .then(() => {
      showNotification('Посилання для відновлення пароля надіслано на вашу email адресу');
      switchAuthTab('login');
    })
    .catch(error => {
      let errorMessage = 'Помилка відправки email';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Користувача з таким email не знайдено';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Невірний формат email';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Забагато запитів. Спробуйте пізніше';
          break;
      }
      
      showNotification(errorMessage, 'error');
    });
}

// Функция открытия модального окна с условиями
function openTermsModal() {
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <h3>Умови використання</h3>
    <div class="terms-content">
      <p>Ласкаво просимо до FashionStore! Використовуючи наш сайт, ви погоджуєтеся з наступними умовами:</p>
      
      <h4>1. Загальні положення</h4>
      <p>1.1. FashionStore надає послуги з продажу модного одягу, взуття та аксесуарів.</p>
      <p>1.2. Використовуючи наш сайт, ви підтверджуєте, що маєте повне право укладати угоди.</p>
      
      <h4>2. Реєстрація та обліковий запис</h4>
      <p>2.1. Для здійснення покупок необхідно створити обліковий запис.</p>
      <p>2.2. Ви несете відповідальність за безпеку вашого пароля.</p>
      <p>2.3. Ми зберігаємо вашу персональну інформацію відповідно до нашої Політики конфіденційності.</p>
      
      <h4>3. Замовлення та доставка</h4>
      <p>3.1. Ціни на товари вказані в гривнях (₴) та включають ПДВ.</p>
      <p>3.2. Доставка здійснюється службами "Нова Пошта" та "Укрпошта".</p>
      <p>3.3. Вартість доставки оплачується додатково при отриманні замовлення.</p>
      
      <h4>4. Повернення та обмін</h4>
      <p>4.1. Ви маєте право повернути товар протягом 14 днів з моменту отримання.</p>
      <p>4.2. Товар повинен бути в оригінальній упаковці без слідів використання.</p>
      
      <h4>5. Інтелектуальна власність</h4>
      <p>5.1. Весь контент сайту (тексти, зображення, логотипи) є власністю FashionStore.</p>
      
      <h4>6. Контактна інформація</h4>
      <p>Email: voanarhes@gmail.com</p>
      
      <p>Дата останнього оновлення: ${new Date().toLocaleDateString('uk-UA')}</p>
    </div>
    <div class="terms-actions">
      <button class="btn btn-detail" onclick="openAuthModal()">Назад до реєстрації</button>
      <button class="btn" onclick="closeModal()">Закрити</button>
    </div>
  `;
}

// Функция открытия модального окна с политикой конфиденциальности
function openPrivacyModal() {
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <h3>Політика конфіденційності</h3>
    <div class="privacy-content">
      <p>Ми поважаємо вашу конфіденційність та прагнемо захистити вашу персональну інформацію.</p>
      
      <h4>1. Яку інформацію ми збираємо</h4>
      <p>1.1. Інформацію, яку ви надаєте при реєстрації: ім'я, email, телефон.</p>
      <p>1.2. Інформацію про замовлення: адреса доставки, історія покупок.</p>
      <p>1.3. Технічну інформацію: IP-адреса, тип браузера, час відвідування.</p>
      
      <h4>2. Як ми використовуємо вашу інформацію</h4>
      <p>2.1. Для обробки та доставки ваших замовлень.</p>
      <p>2.2. Для комунікації з вами щодо замовлень та акцій.</p>
      <p>2.3. Для покращення якості наших послуг.</p>
      
      <h4>3. Захист інформації</h4>
      <p>3.1. Ми використовуємо сучасні методи шифрування для захисту даних.</p>
      <p>3.2. Ваші паролі зберігаються у захешованому вигляді.</p>
      
      <h4>4. Cookies</h4>
      <p>4.1. Ми використовуємо cookies для покращення роботи сайту.</p>
      <p>4.2. Ви можете відключити cookies у налаштуваннях браузера.</p>
      
      <h4>5. Ваші права</h4>
      <p>5.1. Ви маєте право на доступ до вашої персональної інформації.</p>
      <p>5.2. Ви маєте право вимагати виправлення або видалення ваших даних.</p>
      <p>5.3. Ви можете відмовитися від маркетингових розсилок.</p>
      
      <h4>6. Контакти</h4>
      <p>З питань конфіденційності звертайтесь:</p>
      <p>Email: voanarhes@gmail.com</p>
      
      <p>Дата останнього оновлення: ${new Date().toLocaleDateString('uk-UA')}</p>
    </div>
    <div class="privacy-actions">
      <button class="btn btn-detail" onclick="openAuthModal()">Назад до реєстрації</button>
      <button class="btn" onclick="closeModal()">Закрити</button>
    </div>
  `;
}

// ===== ДОБАВЛЯЕМ СТИЛИ ДЛЯ GOOGLE AUTH =====

function addGoogleAuthStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Стили для кнопок социальной аутентификации */
    .social-auth {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .btn-google {
      background: #ffffff;
      color: #757575;
      border: 1px solid #dadce0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-weight: 500;
      padding: 12px 20px;
      border-radius: 8px;
      transition: all 0.3s ease;
    }
    
    .btn-google:hover {
      background: #f8f9fa;
      border-color: #c6c6c6;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transform: translateY(-1px);
    }
    
    .btn-google i {
      font-size: 18px;
      color: #4285F4;
    }
    
    .auth-separator {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 20px 0;
      color: #666;
    }
    
    .auth-separator::before,
    .auth-separator::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #dee2e6;
    }
    
    .auth-separator span {
      padding: 0 15px;
      font-size: 0.9em;
    }
    
    /* Стили для чекбоксов и ссылок */
    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.9em;
      color: #555;
    }
    
    .checkbox-label input[type="checkbox"] {
      margin: 0;
      width: 16px;
      height: 16px;
      accent-color: #007bff;
    }
    
    .forgot-password {
      font-size: 0.9em;
      color: #007bff;
      text-decoration: none;
      transition: color 0.3s ease;
    }
    
    .forgot-password:hover {
      color: #0056b3;
      text-decoration: underline;
    }
    
    .btn-block {
      width: 100%;
      display: block;
      text-align: center;
    }
    
    /* Стили для переключателя видимости пароля */
    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
    }
    
    .toggle-password-btn {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 5px;
      font-size: 16px;
    }
    
    .toggle-password-btn:hover {
      color: #007bff;
    }
    
    .form-group {
      position: relative;
    }
    
    /* Стили для содержания условий и политики */
    .terms-content, .privacy-content {
      max-height: 60vh;
      overflow-y: auto;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      margin: 15px 0;
      line-height: 1.6;
    }
    
    .terms-content h4, .privacy-content h4 {
      color: #333;
      margin: 20px 0 10px 0;
    }
    
    .terms-content p, .privacy-content p {
      margin-bottom: 10px;
      color: #555;
    }
    
    .terms-actions, .privacy-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 20px;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover {
      background: #5a6268;
    }
    
    /* Стили для индикатора загрузки при аутентификации */
    .auth-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }
    
    .auth-loading i {
      font-size: 3em;
      color: #007bff;
      margin-bottom: 20px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Адаптивные стили */
    @media (max-width: 768px) {
      .social-auth {
        gap: 10px;
      }
      
      .btn-google {
        padding: 10px 16px;
        font-size: 0.9em;
      }
      
      .form-options {
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
      }
      
      .terms-content, .privacy-content {
        max-height: 50vh;
        font-size: 0.9em;
      }
    }
  `;
  document.head.appendChild(style);
}

// ===== ДОБАВЛЯЕМ СТИЛИ ДЛЯ КНОПКИ WHATSAPP =====

function addWhatsAppButtonStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .btn-whatsapp {
      background-color: #25D366;
      color: white;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .btn-whatsapp:hover {
      background-color: #128C7E;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
    }
    
    .btn-whatsapp i {
      font-size: 18px;
    }
    
    .cart-action-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 15px;
    }
    
    @media (max-width: 768px) {
      .cart-action-buttons {
        flex-direction: column;
      }
      
      .btn-whatsapp, .btn-buy {
        width: 100%;
        padding: 12px;
        font-size: 16px;
      }
    }
    
    @media (min-width: 769px) {
      .cart-action-buttons {
        flex-direction: row;
      }
      
      .btn-whatsapp, .btn-buy {
        flex: 1;
      }
    }
    
    /* Анимация для кнопки WhatsApp */
    @keyframes pulse-whatsapp {
      0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(37, 211, 102, 0); }
      100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
    }
    
    .btn-whatsapp {
      animation: pulse-whatsapp 2s infinite;
    }
    
    .btn-whatsapp:hover {
      animation: none;
    }
  `;
  document.head.appendChild(style);
}

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ОТКРЫТИЯ МОДАЛЬНОГО ОКНА АВТОРИЗАЦИИ С GOOGLE =====
function openAuthModal() {
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <h3>Вхід в систему</h3>
    
    <!-- Кнопки быстрого входа через соцсети -->
    <div class="social-auth">
      <button class="btn btn-google" onclick="loginWithGoogle()">
        <i class="fab fa-google"></i> Увійти через Google
      </button>
    </div>
    
    <div class="auth-separator">
      <span>або</span>
    </div>
    
    <div class="auth-tabs">
      <div class="auth-tab active" onclick="switchAuthTab('login')">Вхід</div>
      <div class="auth-tab" onclick="switchAuthTab('register')">Реєстрація</div>
      <div class="auth-tab" onclick="switchAuthTab('admin')">Адміністратор</div>
    </div>
    
    <!-- Форма обычного входа -->
    <form id="login-form" onsubmit="login(event)">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="login-email" required>
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input type="password" id="login-password" required>
        <div class="password-toggle">
          <button type="button" class="toggle-password-btn" onclick="togglePassword('login-password')">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
      <div class="form-options">
        <label class="checkbox-label">
          <input type="checkbox" id="remember-me">
          <span>Запам'ятати мене</span>
        </label>
        <a href="#" onclick="openPasswordReset()" class="forgot-password">Забули пароль?</a>
      </div>
      <button type="submit" class="btn btn-detail btn-block">Увійти</button>
    </form>
    
    <!-- Форма регистрации -->
    <form id="register-form" style="display:none;" onsubmit="register(event)">
      <div class="form-group">
        <label>Ім'я та прізвище*</label>
        <input type="text" id="register-name" required>
      </div>
      <div class="form-group">
        <label>Email*</label>
        <input type="email" id="register-email" required>
      </div>
      <div class="form-group">
        <label>Пароль*</label>
        <input type="password" id="register-password" required minlength="6">
        <div class="password-toggle">
          <button type="button" class="toggle-password-btn" onclick="togglePassword('register-password')">
            <i class="fas fa-eye"></i>
          </button>
        </div>
        <small class="form-hint">Мінімум 6 символів</small>
      </div>
      <div class="form-group">
        <label>Підтвердіть пароль*</label>
        <input type="password" id="register-password-confirm" required minlength="6">
        <div class="password-toggle">
          <button type="button" class="toggle-password-btn" onclick="togglePassword('register-password-confirm')">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="accept-terms" required>
          <span>Я погоджуюсь з <a href="#" onclick="openTermsModal()">умовами використанства</a> та <a href="#" onclick="openPrivacyModal()">політикою конфіденційності</a>*</span>
        </label>
      </div>
      <button type="submit" class="btn btn-detail btn-block">Зареєструватися</button>
    </form>
    
    <!-- Форма админа -->
    <div id="admin-auth-form" style="display:none;">
      <p>Для доступу до панелі адміністратора введіть пароль:</p>
      <div class="form-group">
        <label>Пароль адміністратора</label>
        <input type="password" id="admin-password" required>
        <div class="password-toggle">
          <button type="button" class="toggle-password-btn" onclick="togglePassword('admin-password')">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
      <button class="btn btn-admin btn-block" onclick="verifyAdminPassword()">Отримати права адміністратора</button>
    </div>
    
    <!-- Ссылка на восстановление пароля -->
    <div id="password-reset-form" style="display:none;">
      <h4>Відновлення пароля</h4>
      <div class="form-group">
        <label>Введіть ваш email</label>
        <input type="email" id="reset-email" required>
      </div>
      <button class="btn btn-detail" onclick="sendPasswordResetEmail()">Надіслати посилання</button>
      <button class="btn btn-secondary" onclick="switchAuthTab('login')">Назад до входу</button>
    </div>
  `;

  openModal();
}

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ЛОГИНА =====
function login(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('remember-me')?.checked;

  // Настраиваем persistence (запоминание сессии)
  const persistence = rememberMe ? 
    firebase.auth.Auth.Persistence.LOCAL : 
    firebase.auth.Auth.Persistence.SESSION;

  auth.setPersistence(persistence)
    .then(() => {
      return auth.signInWithEmailAndPassword(email, password);
    })
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
        case 'auth/user-disabled':
          message = "Акаунт заблоковано";
          break;
        case 'auth/invalid-email':
          message = "Невірний формат email";
          break;
        case 'auth/too-many-requests':
          message = "Забагато невдалих спроб. Спробуйте пізніше";
          break;
      }
      showNotification(message, "error");
    });
}

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ РЕГИСТРАЦИИ =====
function register(event) {
  event.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;
  const acceptTerms = document.getElementById('accept-terms').checked;

  // Валидация
  if (!acceptTerms) {
    showNotification('Будь ласка, прийміть умови використання', 'error');
    return;
  }

  if (password !== passwordConfirm) {
    showNotification('Паролі не співпадають', 'error');
    return;
  }

  if (password.length < 6) {
    showNotification('Пароль повинен містити мінімум 6 символів', 'error');
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      return userCredential.user.updateProfile({
        displayName: name
      });
    })
    .then(() => {
      showNotification("Реєстрація виконана успішно");
      closeModal();
      
      // Отправляем email подтверждения (опционально)
      auth.currentUser.sendEmailVerification()
        .then(() => {
          console.log('Email verification sent');
        })
        .catch(error => {
          console.error('Error sending verification email:', error);
        });
    })
    .catch(error => {
      console.error("Помилка реєстрації: ", error);
      let errorMessage = "Помилка реєстрації";
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Цей email вже використовується';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Невірний формат email';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Реєстрація вимкнена для цього проекту';
          break;
        case 'auth/weak-password':
          errorMessage = 'Пароль занадто слабкий';
          break;
      }
      
      showNotification(errorMessage, "error");
    });
}

// ===== ОСНОВНЫЕ ФУНКЦИИ FASHION STORE =====

// Инициализация приложения
function initApp() {
  emailjs.init(EMAILJS_USER_ID);

  // Добавляем стили для Google Auth
  addGoogleAuthStyles();
  
  // Добавляем стили для кнопки WhatsApp
  addWhatsAppButtonStyles();
  
  // Инициализация голосового поиска ДО добавления кнопок
  initVoiceSearch();

  // Добавляем стили для комментариев
  addCommentStyles();

  // Добавляем стили для характеристик
  addSpecificationsStyles();

  // Добавляем стили для мобильных модальных окон
  addMobileModalStyles();

  // Добавляем стили для выбора размера и цвета
  addSizeColorStyles();

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

      // Проверяем, является ли пользователь администратором
      checkAdminStatus(user.uid);
      
      // Показываем источник аутентификации (если есть)
      if (user.providerData && user.providerData.length > 0) {
        console.log('User authenticated via:', user.providerData[0].providerId);
      }
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

    userBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });

    // Закрытие выпадающего меню при клике вне его
    document.addEventListener('click', function () {
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
  if (cartData) cart = JSON.parse(cartData);

  const favoritesData = localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (favoritesData) favorites = JSON.parse(favoritesData);

  const viewMode = localStorage.getItem(VIEW_MODE_KEY) || 'grid';
  setViewMode(viewMode);

  updateCartCount();

  const feedUrl = localStorage.getItem(FEED_URL_KEY);
  if (feedUrl) {
    document.getElementById("feed-url").value = feedUrl;
  }

  document.getElementById("year").innerText = new Date().getFullYear();

  // Настройка обработчиков фильтров
  document.getElementById('category').addEventListener('change', function () {
    currentFilters.category = this.value;
    applyFilters();
  });

  document.getElementById('brand').addEventListener('change', function () {
    currentFilters.brand = this.value;
    applyFilters();
  });

  document.getElementById('sort').addEventListener('change', function () {
    currentFilters.sort = this.value;
    applyFilters();
  });

  document.getElementById('availability').addEventListener('change', function () {
    currentFilters.availability = this.value;
    applyFilters();
  });

  document.getElementById('price-min').addEventListener('change', function () {
    currentFilters.minPrice = this.value ? parseInt(this.value) : null;
    applyFilters();
  });

  document.getElementById('price-max').addEventListener('change', function () {
    currentFilters.maxPrice = this.value ? parseInt(this.value) : null;
    applyFilters();
  });

  // Инициализируем менеджер заказов
  orderManager.init();

  // Добавляем стили для заказов
  addOrdersStyles();

  // Инициализация счетчика просмотров
  setupPageCounter();

  // Добавляем стили для полноэкранного просмотра изображений
  addFullscreenImageStyles();
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
      <img src="${product.image || 'https://via.placeholder.com/300x300?text=Fashion+Store'}" 
           alt="${product.title}" 
           loading="lazy"
           onclick="openFullscreenImage('${product.image || 'https://via.placeholder.com/300x300?text=Fashion+Store'}')"
           style="cursor: pointer; transition: transform 0.3s ease;"
           onmouseover="this.style.transform='scale(1.03)'"
           onmouseout="this.style.transform='scale(1)'"
           title="Натисніть для перегляду в повному розмірі">
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
  // Показываем детали товара для выбора размера и цвета
  showProductDetail(productId);
}

function updateCartCount() {
  const count = Object.values(cart).reduce((total, item) => total + item.quantity, 0);
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

// ===== ФУНКЦИЯ ГЕНЕРАЦИИ HTML ДЛЯ ХАРАКТЕРИСТИК =====
function generateSpecificationsHTML(product) {
  if (!product.specifications && !product.size && !product.color && !product.material) {
    return '<p></p>';
  }

  let specsHTML = '';

  // Обрабатываем строку характеристик
  if (typeof product.specifications === 'string' && product.specifications.trim()) {
    const lines = product.specifications.split('\n').filter(line => line.trim());
    specsHTML = lines.map(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        return `
          <div class="spec-item">
            <span class="spec-key">${key.trim()}:</span>
            <span class="spec-value">${value}</span>
          </div>
        `;
      }
      return '';
    }).join('');
  }

  // Добавляем основные характеристики если они не были включены
  const mainSpecs = [
    { key: 'Розмір', value: product.size },
    { key: 'Колір', value: product.color },
    { key: 'Матеріал', value: product.material },
    { key: 'Сезонність', value: product.season },
    { key: 'Стиль', value: product.style },
    { key: 'Склад', value: product.composition },
    { key: 'Країна виробник', value: product.country },
    { key: 'Догляд', value: product.care }
  ];

  mainSpecs.forEach(spec => {
    if (spec.value && !specsHTML.includes(spec.key)) {
      specsHTML += `
        <div class="spec-item">
          <span class="spec-key">${spec.key}:</span>
          <span class="spec-value">${spec.value}</span>
        </div>
      `;
    }
  });

  return specsHTML || '<p></p>';
}

// Функция для получения кода цвета по названию
function getColorCode(colorName) {
  const colorMap = {
    'Черный': '#000000',
    'Белый': '#FFFFFF',
    'Красный': '#FF0000',
    'Синий': '#0000FF',
    'Зеленый': '#00FF00',
    'Желтый': '#FFFF00',
    'Розовый': '#FFC0CB',
    'Серый': '#808080',
    'Коричневый': '#A52A2A',
    'Оранжевый': '#FFA500',
    'Фиолетовый': '#800080',
    'Голубой': '#00FFFF',
    // Украинские названия
    'Чорний': '#000000',
    'Білий': '#FFFFFF',
    'Червоний': '#FF0000',
    'Синій': '#0000FF',
    'Зелений': '#00FF00',
    'Жовтий': '#FFFF00',
    'Рожевий': '#FFC0CB',
    'Сірий': '#808080',
    'Коричневий': '#A52A2A',
    'Помаранчевий': '#FFA500',
    'Фіолетовий': '#800080',
    'Блакитний': '#00FFFF'
  };

  return colorMap[colorName] || '#CCCCCC';
}

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ПОКАЗА ДЕТАЛЕЙ ТОВАРА С ВЫБОРОМ РАЗМЕРА И ЦВЕТА =====
function showProductDetail(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const modalContent = document.getElementById("modal-content");

  // Формируем HTML для характеристик
  const specificationsHTML = generateSpecificationsHTML(product);

  // Парсим доступные размеры и цвета
  const availableSizes = product.size ? product.size.split(',').map(s => s.trim()).filter(s => s) : [];
  const availableColors = product.color ? product.color.split(',').map(c => c.trim()).filter(c => c) : [];

  // Генерация HTML для выбора размера
  let sizeSelectHTML = '';
  if (availableSizes.length > 0) {
    sizeSelectHTML = `
      <div class="form-group">
        <label for="product-size">Розмір${availableSizes.length > 1 ? ' (оберіть)' : ''}</label>
        <div class="size-options">
          ${availableSizes.map((size, index) => `
            <label class="size-option">
              <input type="radio" name="product-size" value="${size}" ${index === 0 ? 'checked' : ''}>
              <span class="size-label">${size}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Генерация HTML для выбора цвета
  let colorSelectHTML = '';
  if (availableColors.length > 0) {
    colorSelectHTML = `
      <div class="form-group">
        <label for="product-color">Колір${availableColors.length > 1 ? ' (оберіть)' : ''}</label>
        <div class="color-options">
          ${availableColors.map((color, index) => `
            <label class="color-option">
              <input type="radio" name="product-color" value="${color}" ${index === 0 ? 'checked' : ''}>
              <span class="color-label" style="background-color: ${getColorCode(color)}" title="${color}"></span>
              <span class="color-name">${color}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <h3>${product.title}</h3>
    <div class="product-detail">
      <div class="product-image">
        <img src="${product.image || 'https://via.placeholder.com/400x400?text=Fashion+Product'}" 
             alt="${product.title}" 
             loading="lazy"
             onclick="openFullscreenImage('${product.image || 'https://via.placeholder.com/400x400?text=Fashion+Product'}')"
             style="cursor: pointer; transition: transform 0.3s ease;"
             onmouseover="this.style.transform='scale(1.02)'"
             onmouseout="this.style.transform='scale(1)'"
             title="Натисніть для перегляду в повному розмірі">
        <div class="image-hint" style="text-align: center; margin-top: 10px; color: #666; font-size: 0.9em;">
          <i class="fas fa-expand-arrows-alt"></i> Натисніть на зображення для перегляду в повному розмірі
        </div>
      </div>
      <div class="product-info">
        ${product.brand ? `<p class="product-brand"><strong>Бренд:</strong> ${product.brand}</p>` : ''}
        
        <div class="price-container">
          <span class="detail-price">${formatPrice(product.price)} ₴</span>
          ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)} ₴</span>` : ''}
          ${product.discount ? `<span class="discount-badge">-${product.discount}%</span>` : ''}
        </div>
        
        <div class="product-description">
          <h4>Опис</h4>
          <p>${product.description || 'Опис відсутній'}</p>
        </div>
        
        <div class="product-specifications">
          <h4></h4>
          ${specificationsHTML}
        </div>
        
        <div class="availability-status">
          <p><strong>Наявність:</strong> 
            <span class="${product.inStock ? 'in-stock' : 'out-of-stock'}">
              ${product.inStock ? 'В наявності' : 'Немає в наявності'}
            </span>
          </p>
        </div>
        
        <!-- Выбор размера и цвета -->
        ${sizeSelectHTML}
        ${colorSelectHTML}
        
        <div class="quantity-control">
          <button class="quantity-btn" onclick="changeQuantity(-1)">-</button>
          <input type="number" class="quantity-input" id="product-quantity" value="1" min="1">
          <button class="quantity-btn" onclick="changeQuantity(1)">+</button>
        </div>
        
        <div class="form-group">
          <label for="product-comment">👉 Просимо зазначити бажаний розмір та колір товару в коментарі до замовлення.</label>
          <textarea 
            id="product-comment" 
            placeholder="Наприклад, особливі побажання щодо товару..."
            rows="2"
            maxlength="200"
          ></textarea>
          <div class="char-counter" style="text-align: right; font-size: 0.8em; color: #666;">
            <span id="product-comment-chars">0</span>/200 символів
          </div>
        </div>
        
        <div class="detail-actions">
          <button class="btn btn-buy" onclick="addToCartWithSizeColor('${product.id}')" ${!product.inStock ? 'disabled' : ''}>
            <i class="fas fa-shopping-cart"></i> 
            ${product.inStock ? 'Додати до кошика' : 'Немає в наявності'}
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

  // Добавляем обработчик для подсчета символов в комментарии товара
  const commentField = document.getElementById('product-comment');
  const charCounter = document.getElementById('product-comment-chars');

  if (commentField && charCounter) {
    commentField.addEventListener('input', function () {
      const length = this.value.length;
      charCounter.textContent = length;

      if (length > 180) {
        charCounter.style.color = '#e74c3c';
      } else if (length > 150) {
        charCounter.style.color = '#f39c12';
      } else {
        charCounter.style.color = '#666';
      }
    });
  }

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

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ В КОРЗИНУ С РАЗМЕРОМ И ЦВЕТОМ =====
function addToCartWithSizeColor(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  // Получаем выбранные размер и цвет
  let selectedSize = '';
  let selectedColor = '';

  // Проверяем, есть ли выбор размера
  const sizeInputs = document.querySelectorAll('input[name="product-size"]:checked');
  if (sizeInputs.length > 0) {
    selectedSize = sizeInputs[0].value;
  }

  // Проверяем, есть ли выбор цвета
  const colorInputs = document.querySelectorAll('input[name="product-color"]:checked');
  if (colorInputs.length > 0) {
    selectedColor = colorInputs[0].value;
  }

  // Проверяем обязательные поля (если есть варианты выбора)
  const availableSizes = product.size ? product.size.split(',').map(s => s.trim()).filter(s => s) : [];
  const availableColors = product.color ? product.color.split(',').map(c => c.trim()).filter(c => c) : [];

  if (availableSizes.length > 0 && !selectedSize) {
    showNotification('Будь ласка, оберіть розмір', 'warning');
    return;
  }

  if (availableColors.length > 0 && !selectedColor) {
    showNotification('Будь ласка, оберіть колір', 'warning');
    return;
  }

  const quantity = parseInt(document.getElementById("product-quantity").value) || 1;
  const comment = document.getElementById("product-comment")?.value.trim() || '';

  // Создаем уникальный ключ для корзины с учетом размера и цвета
  const cartKey = `${productId}_${selectedSize}_${selectedColor}`;

  if (!cart[cartKey]) {
    cart[cartKey] = {
      productId: productId,
      quantity: 0,
      comment: '',
      size: selectedSize,
      color: selectedColor
    };
  }
  
  cart[cartKey].quantity += quantity;

  // Сохраняем комментарий
  if (comment) {
    cart[cartKey].comment = comment;
  }

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

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ОТКРЫТИЯ КОРЗИНЫ С РАЗМЕРОМ И ЦВЕТОМ =====
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

    for (const [cartKey, item] of Object.entries(cart)) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const quantity = item.quantity;
        const comment = item.comment || '';
        const size = item.size || '';
        const color = item.color || '';
        const itemTotal = product.price * quantity;
        total += itemTotal;

        // Формируем информацию о размере и цвете
        let sizeColorInfo = '';
        if (size || color) {
          sizeColorInfo = `
            <div class="cart-item-attributes">
              ${size ? `<div class="cart-item-size"><strong>Розмір:</strong> ${size}</div>` : ''}
              ${color ? `<div class="cart-item-color"><strong>Колір:</strong> ${color}</div>` : ''}
            </div>
          `;
        }

        cartItemsHTML += `
          <div class="cart-item">
            <img src="${product.image || 'https://via.placeholder.com/80x80?text=Fashion'}" 
                 alt="${product.title}" 
                 class="cart-item-image">
            <div class="cart-item-details">
              <h4 class="cart-item-title">${product.title}</h4>
              ${sizeColorInfo}
              <div class="cart-item-price">${formatPrice(product.price)} ₴ x ${quantity} = ${formatPrice(itemTotal)} ₴</div>
              ${comment ? `
                <div class="cart-item-comment">
                  <strong>Коментар:</strong> ${comment}
                </div>
              ` : ''}
              <div class="cart-item-actions">
                <button class="btn" onclick="changeCartQuantity('${cartKey}', -1)">-</button>
                <span>${quantity}</span>
                <button class="btn" onclick="changeCartQuantity('${cartKey}', 1)">+</button>
                <button class="btn" onclick="removeFromCart('${cartKey}')"><i class="fas fa-trash"></i></button>
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
        <div class="cart-action-buttons">
          <button class="btn btn-buy" onclick="checkout()">Оформити замовлення</button>
          <button class="btn btn-whatsapp" onclick="orderViaWhatsApp()">
            <i class="fab fa-whatsapp"></i> Замовити через WhatsApp
          </button>
        </div>
      </div>
    `;
  }

  openModal();
}

// ===== ФУНКЦИЯ ЗАКАЗА ЧЕРЕЗ WHATSAPP =====
function orderViaWhatsApp() {
  if (Object.keys(cart).length === 0) {
    showNotification("Кошик порожній", "error");
    return;
  }

  // Формируем сообщение для WhatsApp
  let message = "🛍️ *Нове замовлення з FashionStore* 🛍️\n\n";
  message += "*Замовлення:*\n";

  let total = 0;
  let itemCount = 0;

  for (const [cartKey, item] of Object.entries(cart)) {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      itemCount++;
      const quantity = item.quantity;
      const comment = item.comment || '';
      const size = item.size || '';
      const color = item.color || '';
      const itemTotal = product.price * quantity;
      total += itemTotal;

      message += `\n${itemCount}. ${product.title}`;
      if (size) message += `, Розмір: ${size}`;
      if (color) message += `, Колір: ${color}`;
      message += `\n   Кількість: ${quantity}`;
      message += `\n   Ціна: ${formatPrice(product.price)} ₴`;
      message += `\n   Сума: ${formatPrice(itemTotal)} ₴`;
      
      if (comment) {
        message += `\n   📝 Коментар: ${comment}`;
      }
      message += `\n`;
    }
  }

  message += `\n══════════════════════════\n`;
  message += `*Загальна сума:* ${formatPrice(total)} ₴\n`;
  message += `*Кількість товарів:* ${itemCount} шт.\n\n`;
  
  // Добавляем информацию о доставке
  message += `*Інформація про доставку:*\n`;
  message += `📦 Доставка: Нова Пошта / Укрпошта\n`;
  message += `💰 Оплата: Готівкою при отриманні\n`;
  message += `⏱️ Термін доставки: 1-3 дні\n\n`;
  
  message += `Для оформлення замовлення, будь ласка, вкажіть:\n`;
  message += `1. Ваше ім'я та прізвище\n`;
  message += `2. Місто та відділення доставки\n`;
  message += `3. Номер телефону для зв'язку\n\n`;
  message += `Дякуємо за замовлення! 🎉`;

  // Кодируем сообщение для URL
  const encodedMessage = encodeURIComponent(message);
  
  // Создаем ссылку WhatsApp
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
  
  // Открываем WhatsApp в новом окне
  window.open(whatsappUrl, '_blank');
  
  // Показываем уведомление
  showNotification("Відкривається WhatsApp для відправки замовлення");
}

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ИЗМЕНЕНИЯ КОЛИЧЕСТВА В КОРЗИНЕ =====
function changeCartQuantity(cartKey, delta) {
  if (!cart[cartKey] && delta < 1) return;

  cart[cartKey].quantity += delta;

  if (cart[cartKey].quantity < 1) {
    delete cart[cartKey];
  }

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

  updateCartCount();
  openCart();
}

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ УДАЛЕНИЯ ИЗ КОРЗИНЫ =====
function removeFromCart(cartKey) {
  delete cart[cartKey];

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

  updateCartCount();
  openCart();
}

// ===== ФУНКЦИЯ ОБНОВЛЕНИЯ РАЗМЕРА И ЦВЕТА В КОРЗИНЕ =====
function updateCartItemSizeColor(cartKey) {
  const item = cart[cartKey];
  if (!item) return;

  // Находим товар
  const product = products.find(p => p.id === item.productId);
  if (!product) return;

  // Парсим доступные размеры и цвета
  const availableSizes = product.size ? product.size.split(',').map(s => s.trim()).filter(s => s) : [];
  const availableColors = product.color ? product.color.split(',').map(c => c.trim()).filter(c => c) : [];

  // Создаем модальное окно для обновления размера и цвета
  const modalContent = document.getElementById("modal-content");

  // Генерация HTML для выбора размера
  let sizeSelectHTML = '';
  if (availableSizes.length > 0) {
    sizeSelectHTML = `
      <div class="form-group">
        <label for="update-product-size">Розмір${availableSizes.length > 1 ? ' (оберіть)' : ''}</label>
        <div class="size-options">
          ${availableSizes.map((size) => `
            <label class="size-option">
              <input type="radio" name="update-product-size" value="${size}" ${item.size === size ? 'checked' : ''}>
              <span class="size-label">${size}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Генерация HTML для выбора цвета
  let colorSelectHTML = '';
  if (availableColors.length > 0) {
    colorSelectHTML = `
      <div class="form-group">
        <label for="update-product-color">Колір${availableColors.length > 1 ? ' (оберіть)' : ''}</label>
        <div class="color-options">
          ${availableColors.map((color) => `
            <label class="color-option">
              <input type="radio" name="update-product-color" value="${color}" ${item.color === color ? 'checked' : ''}>
              <span class="color-label" style="background-color: ${getColorCode(color)}" title="${color}"></span>
              <span class="color-name">${color}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <h3>Змінити розмір та колір</h3>
    <div class="update-size-color-form">
      <div class="product-preview">
        <img src="${product.image || 'https://via.placeholder.com/80x80?text=Fashion'}" 
             alt="${product.title}" 
             class="preview-image">
        <div class="preview-info">
          <h4>${product.title}</h4>
          <p>Поточний розмір: <strong>${item.size || 'Не вказано'}</strong></p>
          <p>Поточний колір: <strong>${item.color || 'Не вказано'}</strong></p>
        </div>
      </div>
      
      ${sizeSelectHTML}
      ${colorSelectHTML}
      
      <div class="form-group">
        <label for="update-product-comment">Коментар (необов'язково)</label>
        <textarea 
          id="update-product-comment" 
          placeholder="Ваші побажання..."
          rows="2"
          maxlength="200"
        >${item.comment || ''}</textarea>
        <div class="char-counter" style="text-align: right; font-size: 0.8em; color: #666;">
          <span id="update-comment-chars">${item.comment ? item.comment.length : 0}</span>/200 символів
        </div>
      </div>
      
      <div class="update-actions">
        <button class="btn btn-buy" onclick="saveUpdatedSizeColor('${cartKey}')">Зберегти зміни</button>
        <button class="btn" onclick="openCart()">Скасувати</button>
      </div>
    </div>
  `;

  // Добавляем обработчик для подсчета символов
  const commentField = document.getElementById('update-product-comment');
  const charCounter = document.getElementById('update-comment-chars');

  if (commentField && charCounter) {
    commentField.addEventListener('input', function () {
      const length = this.value.length;
      charCounter.textContent = length;

      if (length > 180) {
        charCounter.style.color = '#e74c3c';
      } else if (length > 150) {
        charCounter.style.color = '#f39c12';
      } else {
        charCounter.style.color = '#666';
      }
    });
  }

  openModal();
}

// ===== ФУНКЦИЯ СОХРАНЕНИЯ ОБНОВЛЕННЫХ РАЗМЕРА И ЦВЕТА =====
function saveUpdatedSizeColor(oldCartKey) {
  const item = cart[oldCartKey];
  if (!item) return;

  // Получаем выбранные размер и цвет
  let selectedSize = '';
  let selectedColor = '';

  // Проверяем, есть ли выбор размера
  const sizeInputs = document.querySelectorAll('input[name="update-product-size"]:checked');
  if (sizeInputs.length > 0) {
    selectedSize = sizeInputs[0].value;
  }

  // Проверяем, есть ли выбор цвета
  const colorInputs = document.querySelectorAll('input[name="update-product-color"]:checked');
  if (colorInputs.length > 0) {
    selectedColor = colorInputs[0].value;
  }

  // Получаем комментарий
  const comment = document.getElementById('update-product-comment')?.value.trim() || '';

  // Создаем новый ключ с обновленными размером и цветом
  const newCartKey = `${item.productId}_${selectedSize}_${selectedColor}`;

  // Если ключ изменился, удаляем старую запись и создаем новую
  if (oldCartKey !== newCartKey) {
    // Сохраняем количество товара
    const quantity = item.quantity;
    
    // Удаляем старую запись
    delete cart[oldCartKey];
    
    // Создаем новую запись
    cart[newCartKey] = {
      productId: item.productId,
      quantity: quantity,
      comment: comment,
      size: selectedSize,
      color: selectedColor
    };
  } else {
    // Если ключ не изменился, просто обновляем комментарий
    cart[oldCartKey].comment = comment;
    if (selectedSize) cart[oldCartKey].size = selectedSize;
    if (selectedColor) cart[oldCartKey].color = selectedColor;
  }

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

  showNotification("Розмір та колір оновлено");
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
    commentField.addEventListener('input', function () {
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
    items: { ...cart },
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
  for (const [cartKey, item] of Object.entries(order.items)) {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      const quantity = item.quantity;
      const comment = item.comment || '';
      const size = item.size || '';
      const color = item.color || '';
      
      itemsList += `
        <tr>
          <td>${product.title}</td>
          <td>${size || '-'}</td>
          <td>${color || '-'}</td>
          <td>${quantity}</td>
          <td>${formatPrice(product.price)} ₴</td>
          <td>${formatPrice(product.price * quantity)} ₴</td>
        </tr>
        ${comment ? `
        <tr>
          <td colspan="6" style="background: #f8f9fa; padding: 10px; border: 1px solid #dee2e6;">
            <strong>Коментар клієнта:</strong> ${comment}
          </td>
        </tr>
        ` : ''}
      `;
    }
  }

  // ДОБАВЛЕНО: информация о комментарии в email
  const commentInfo = order.comment ? `
    <tr>
      <td colspan="6" style="background: #f8f9fa; padding: 10px; border: 1px solid #dee2e6;">
        <strong>Коментар клієнта до замовлення:</strong><br>
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
    customer_comment: order.comment || 'Не вказано',
    delivery_service: order.delivery.service,
    delivery_city: order.delivery.city,
    delivery_warehouse: order.delivery.warehouse,
    delivery_index: order.delivery.index || '',
    payment_method: order.paymentMethod === 'cash' ? 'Готівкою при отриманні' : 'Онлайн-оплата карткою',
    total_amount: formatPrice(order.total),
    items: itemsList + commentInfo,
    order_date: new Date().toLocaleString('uk-UA')
  };

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(function (response) {
      console.log('Email успешно отправлен!', response.status, response.text);
    }, function (error) {
      console.error('Ошибка отправки email:', error);
    });
}

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ГЕНЕРАЦИИ СВОДКИ ЗАКАЗА С УЧЕТОМ РАЗМЕРА И ЦВЕТА =====
function generateOrderSummary() {
  let summaryHTML = '';

  for (const [cartKey, item] of Object.entries(cart)) {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      const quantity = item.quantity;
      const comment = item.comment || '';
      const size = item.size || '';
      const color = item.color || '';

      summaryHTML += `
        <div class="order-item">
          <div class="order-item-main">
            <span>${product.title} x${quantity}</span>
            <span>${formatPrice(product.price * quantity)} ₴</span>
          </div>
          ${size || color ? `
            <div class="order-item-attributes">
              ${size ? `<div><strong>Розмір:</strong> ${size}</div>` : ''}
              ${color ? `<div><strong>Колір:</strong> ${color}</div>` : ''}
            </div>
          ` : ''}
          ${comment ? `
            <div class="order-item-comment">
              <em>Коментар: "${comment}"</em>
            </div>
          ` : ''}
        </div>
      `;
    }
  }

  return summaryHTML;
}

function calculateCartTotal() {
  return Object.entries(cart).reduce((sum, [cartKey, item]) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
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
        <h4 style="margin: 0 0 10px 0; color: #333;">Ваш коментар до замовлення:</h4>
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
        ${commentInfo}
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

// ===== ДОБАВЛЯЕМ СТИЛИ ДЛЯ КОММЕНТАРИЕВ =====
function addCommentStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .cart-item-comment {
      margin: 8px 0;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid #007bff;
      font-size: 0.9em;
      color: #555;
    }
    
    .cart-item-comment strong {
      color: #333;
    }
    
    .order-item-comment {
      margin-top: 5px;
      padding: 5px 10px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 0.85em;
      color: #666;
      border-left: 2px solid #28a745;
    }
    
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
    
    @media (max-width: 768px) {
      .cart-item-comment {
        font-size: 0.85em;
        padding: 6px 10px;
      }
    }
  `;
  document.head.appendChild(style);
}

// ===== ДОБАВЛЕНИЕ СТИЛЕЙ ДЛЯ ВЫБОРА РАЗМЕРА И ЦВЕТА =====
function addSizeColorStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Стили для выбора размера */
    .size-options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 5px;
    }
    
    .size-option {
      position: relative;
    }
    
    .size-option input[type="radio"] {
      display: none;
    }
    
    .size-label {
      display: inline-block;
      padding: 8px 12px;
      border: 2px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
      min-width: 40px;
    }
    
    .size-option input[type="radio"]:checked + .size-label {
      border-color: #007bff;
      background-color: #007bff;
      color: white;
      font-weight: bold;
    }
    
    .size-option:hover .size-label {
      border-color: #0056b3;
    }
    
    /* Стили для выбора цвета */
    .color-options {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 5px;
    }
    
    .color-option {
      position: relative;
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }
    
    .color-option input[type="radio"] {
      display: none;
    }
    
    .color-label {
      display: inline-block;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2px solid #ddd;
      transition: all 0.3s ease;
      position: relative;
    }
    
    .color-option input[type="radio"]:checked + .color-label {
      border-color: #007bff;
      transform: scale(1.1);
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
    }
    
    .color-option input[type="radio"]:checked + .color-label::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: bold;
      font-size: 12px;
      text-shadow: 0 0 2px rgba(0,0,0,0.5);
    }
    
    .color-name {
      font-size: 0.9em;
      color: #666;
    }
    
    .color-option:hover .color-label {
      transform: scale(1.05);
      border-color: #0056b3;
    }
    
    /* Стили для отображения размера и цвета в корзине */
    .cart-item-attributes {
      margin: 5px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .cart-item-size, .cart-item-color {
      font-size: 0.9em;
      padding: 3px 8px;
      background: #f8f9fa;
      border-radius: 4px;
      border-left: 3px solid #007bff;
    }
    
    .cart-item-color {
      border-left-color: #28a745;
    }
    
    /* Стили для формы обновления размера и цвета */
    .update-size-color-form {
      padding: 20px;
    }
    
    .product-preview {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .preview-image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 6px;
    }
    
    .preview-info h4 {
      margin: 0 0 10px 0;
      font-size: 1.1em;
    }
    
    .preview-info p {
      margin: 5px 0;
      font-size: 0.9em;
      color: #666;
    }
    
    .update-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    
    /* Адаптивные стили */
    @media (max-width: 768px) {
      .size-options {
        gap: 5px;
      }
      
      .size-label {
        padding: 6px 10px;
        min-width: 35px;
        font-size: 0.9em;
      }
      
      .color-options {
        gap: 8px;
      }
      
      .color-label {
        width: 25px;
        height: 25px;
      }
      
      .cart-item-attributes {
        flex-direction: column;
        gap: 5px;
      }
      
      .product-preview {
        flex-direction: column;
        text-align: center;
      }
      
      .update-actions {
        flex-direction: column;
      }
      
      .update-actions .btn {
        width: 100%;
      }
    }
    
    /* Индикатор выбора в карточке товара */
    .card-size-indicator {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 123, 255, 0.9);
      color: white;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.8em;
      font-weight: bold;
      z-index: 2;
    }
    
    .card-color-indicator {
      position: absolute;
      top: 35px;
      right: 10px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 3px rgba(0,0,0,0.3);
      z-index: 2;
    }
  `;
  document.head.appendChild(style);
}

// ===== ДОБАВЛЕНИЕ СТИЛЕЙ ДЛЯ ХАРАКТЕРИСТИК =====
function addSpecificationsStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .product-specifications {
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #007bff;
    }
    
    .product-specifications h4 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 1.1em;
    }
    
    .spec-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    
    .spec-item:last-child {
      border-bottom: none;
    }
    
    .spec-key {
      font-weight: 600;
      color: #495057;
      min-width: 120px;
      margin-right: 15px;
    }
    
    .spec-value {
      color: #6c757d;
      text-align: right;
      flex: 1;
    }
    
    .product-brand {
      font-size: 0.95em;
      color: #666;
      margin-bottom: 10px;
      padding: 5px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .availability-status {
      margin: 15px 0;
      padding: 10px;
      border-radius: 6px;
      background: #f8f9fa;
    }
    
    .in-stock {
      color: #28a745;
      font-weight: 600;
    }
    
    .out-of-stock {
      color: #dc3545;
      font-weight: 600;
    }
    
    .discount-badge {
      background: #dc3545;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: bold;
      margin-left: 10px;
    }
    
    @media (max-width: 768px) {
      .spec-item {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .spec-value {
        text-align: left;
        margin-top: 5px;
      }
      
      .product-specifications {
        margin: 15px 0;
        padding: 12px;
      }
    }
  `;
  document.head.appendChild(style);
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
    return Object.values(items).reduce((sum, item) => sum + item.quantity, 0);
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

    for (const [cartKey, item] of Object.entries(order.items)) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const quantity = item.quantity;
        const comment = item.comment || '';
        const size = item.size || '';
        const color = item.color || '';
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
                ${size ? `<span class="item-size">Розмір: ${size}</span>` : ''}
                ${color ? `<span class="item-color">Колір: ${color}</span>` : ''}
              </div>
              ${comment ? `
                <div class="order-item-comment">
                  <strong>Коментар:</strong> ${comment}
                </div>
              ` : ''}
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

    return Object.entries(items).reduce((sum, [cartKey, item]) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
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
      for (const [cartKey, item] of Object.entries(order.items)) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const quantity = item.quantity;
          const comment = item.comment || '';
          const size = item.size || '';
          const color = item.color || '';
          const itemTotal = product.price * quantity;
          total += itemTotal;

          itemsHTML += `
            <tr>
              <td>${product.title}</td>
              <td>${product.brand || '-'}</td>
              <td>${size || '-'}</td>
              <td>${color || '-'}</td>
              <td>${quantity}</td>
              <td>${formatPrice(product.price)} ₴</td>
              <td>${formatPrice(itemTotal)} ₴</td>
            </tr>
            ${comment ? `
            <tr>
              <td colspan="7" style="background: #f8f9fa; padding: 8px; font-style: italic;">
                <strong>Коментар:</strong> ${comment}
              </td>
            </tr>
            ` : ''}
          `;
        }
      }
    }

    // ДОБАВЛЕНО: комментарий в печатную версию
    const commentSection = order.comment ? `
      <div class="print-section">
        <h3>Коментар клієнта до замовлення</h3>
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
              <th>Розмір</th>
              <th>Колір</th>
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
      .then(function (response) {
        console.log('Email с ТТН успішно відправлено!', response.status, response.text);
      }, function (error) {
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
closeModal = function () {
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
      
      .item-size, .item-color {
        background: #e3f2fd;
        padding: 2px 8px;
        border-radius: 4px;
        color: #1976d2;
      }
      
      .order-item-comment {
        margin: 8px 0;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 3px solid #28a745;
        font-size: 0.9em;
        color: #555;
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
            ${order.comment ? `<p><strong>Коментар до замовлення:</strong> ${order.comment}</p>` : ''}
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

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК АВТОРИЗАЦИИ =====
function switchAuthTab(tab) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const adminForm = document.getElementById("admin-auth-form");
  const resetForm = document.getElementById("password-reset-form");
  const tabs = document.querySelectorAll(".auth-tab");

  tabs.forEach(tab => tab.classList.remove('active'));

  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    adminForm.style.display = 'none';
    resetForm.style.display = 'none';
    tabs[0].classList.add('active');
  } else if (tab === 'register') {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    adminForm.style.display = 'none';
    resetForm.style.display = 'none';
    tabs[1].classList.add('active');
  } else if (tab === 'admin') {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    adminForm.style.display = 'block';
    resetForm.style.display = 'none';
    tabs[2].classList.add('active');
  }
}

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ ВЕРИФИКАЦИИ АДМИН-ПАРОЛЯ =====
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
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && voiceSearch.isListening) {
    stopVoiceSearch();
    showNotification('Голосовий пошук скасовано', 'info');
  }
});

// ===== ФУНКЦИЯ ОТКРЫТИЯ ИЗОБРАЖЕНИЯ НА ВЕСЬ ЭКРАН =====
function openFullscreenImage(imageUrl) {
  const modalContent = document.getElementById("modal-content");

  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити">
      <i class="fas fa-times" aria-hidden="true"></i>
    </button>
    <div class="fullscreen-image-container">
      <img src="${imageUrl}" alt="Зображення товару" class="fullscreen-image" id="fullscreen-img">
      <div class="image-actions">
        <button class="btn" onclick="zoomImage(1.2)">
          <i class="fas fa-search-plus"></i>
        </button>
        <button class="btn" onclick="zoomImage(0.8)">
          <i class="fas fa-search-minus"></i>
        </button>
        <button class="btn" onclick="resetImageZoom()">
          <i class="fas fa-sync-alt"></i>
        </button>
        <button class="btn" onclick="downloadImage('${imageUrl}')">
          <i class="fas fa-download"></i>
        </button>
      </div>
    </div>
  `;

  openModal();
}

// Функция зума изображения
function zoomImage(factor) {
  const img = document.getElementById('fullscreen-img');
  if (!img) return;

  const currentScale = parseFloat(img.style.transform.replace('scale(', '').replace(')', '')) || 1;
  const newScale = currentScale * factor;

  // Ограничиваем масштаб
  if (newScale < 0.5 || newScale > 3) return;

  img.style.transform = `scale(${newScale})`;
  img.style.transition = 'transform 0.3s ease';
}

// Сброс зума
function resetImageZoom() {
  const img = document.getElementById('fullscreen-img');
  if (img) {
    img.style.transform = 'scale(1)';
    img.style.transition = 'transform 0.3s ease';
  }
}

// Скачивание изображения
function downloadImage(imageUrl) {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = 'fashionstore-product.jpg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification('Зображення завантажується...');
}

// Стили для полноэкранного просмотра изображения
function addFullscreenImageStyles() {
  const styleId = 'fullscreen-image-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .fullscreen-image-container {
      width: 100%;
      height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .fullscreen-image {
      max-width: 95%;
      max-height: 85vh;
      object-fit: contain;
      cursor: pointer;
      border-radius: 8px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
      transition: transform 0.3s ease;
    }
    
    .fullscreen-image:hover {
      transform: scale(1.02);
    }
    
    .image-actions {
      position: fixed;
      bottom: 20px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50px;
      margin: 0 auto;
      width: fit-content;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
    }
    
    .image-actions .btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border: 1px solid #ddd;
      font-size: 18px;
      color: #333;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .image-actions .btn:hover {
      background: #007bff;
      color: white;
      transform: translateY(-3px);
      box-shadow: 0 5px 15px rgba(0,123,255,0.3);
    }
    
    @media (max-width: 768px) {
      .fullscreen-image {
        max-width: 100%;
        max-height: 80vh;
      }
      
      .image-actions {
        bottom: 10px;
        padding: 10px;
      }
      
      .image-actions .btn {
        width: 45px;
        height: 45px;
        font-size: 16px;
      }
    }
    
    /* Анимация появления */
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    
    .fullscreen-image-container {
      animation: fadeIn 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

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

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
  initApp();
});