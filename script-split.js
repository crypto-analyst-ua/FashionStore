// script-split.js
const productShowcaseData = [
    { image: 'file1.jpeg', category: 'Новинка', name: 'Вечірня сукня', price: '1,850 ₴' },
    { image: 'file2.jpeg', category: 'Чоловіче', name: 'Костюм бізнес', price: '2,450 ₴' },
    { image: 'file3.jpeg', category: 'Дитяче', name: 'Комплект осінь', price: '1,250 ₴' },
    { image: 'file4.jpeg', category: 'Взуття', name: 'Кросівки Premium', price: '1,990 ₴' },
    { image: 'file5.jpeg', category: 'Аксесуари', name: 'Дизайнерська сумка', price: '1,550 ₴' },
    { image: 'file6.jpeg', category: 'Літо 2025', name: 'Літня сукня', price: '1,450 ₴' },
    { image: 'file7.jpeg', category: 'Зима', name: 'Пуховик Premium', price: '3,200 ₴' },
    { image: 'file8.jpeg', category: 'Спорт', name: 'Спортивний костюм', price: '1,750 ₴' },
    { image: 'file9.jpeg', category: 'Весілля', name: 'Весільна сукня', price: '4,500 ₴' },
    { image: 'file10.jpeg', category: 'Офіс', name: 'Діловий костюм', price: '2,850 ₴' },
    { image: 'file11.jpeg', category: 'Джинси', name: 'Джинси преміум', price: '1,650 ₴' },
    { image: 'file12.jpeg', category: 'Дім', name: 'Піжама комфорт', price: '950 ₴' },
    { image: 'file13.jpeg', category: 'Пляж', name: 'Купальник', price: '1,150 ₴' },
    { image: 'file14.jpeg', category: 'Школа', name: 'Шкільна форма', price: '1,350 ₴' },
    { image: 'file15.jpeg', category: 'Весна', name: 'Пальто весняне', price: '2,150 ₴' },
    { image: 'file16.jpeg', category: 'Осінь', name: 'Куртка джинсова', price: '1,850 ₴' },
    { image: 'file17.jpeg', category: 'Светри', name: 'Светер вовняний', price: '1,450 ₴' },
    { image: 'file18.jpeg', category: 'Футболки', name: 'Футболка преміум', price: '750 ₴' },
    { image: 'file19.jpeg', category: 'Окуляри', name: 'Сонцезахисні', price: '850 ₴' },
    { image: 'file20.jpeg', category: 'Акція', name: 'Комплект -30%', price: '2,250 ₴' }
];

let fashionShowInterval, timerInterval, progressInterval, orientationChangeHandler;
const loadingMessages = [
    "🎯 Підбираємо найкращі товари для вас...",
    "✨ Знаходимо ексклюзивні пропозиції...",
    "💎 Перевіряємо якість кожної моделі...",
    "🚀 Завантажуємо новинки сезону...",
    "🌟 Формуємо персональні рекомендації...",
    "🎁 Готуємо спеціальні пропозиції..."
];

function showFashionShow() {
    const fashionShow = document.getElementById('fashion-show');
    const showcase = document.getElementById('product-showcase');
    fashionShow.style.display = 'block';
    showcase.innerHTML = '';
    createFloatingShapes();
    const shuffledProducts = [...productShowcaseData].sort(() => Math.random() - 0.5);
    shuffledProducts.forEach((product, index) => {
        const productDiv = document.createElement('div');
        productDiv.className = 'image-preview';
        productDiv.style.animationDelay = `${index * 0.05}s`;
        productDiv.innerHTML = `
            <img src="${product.image}" 
                 alt="${product.name} - ${product.category}" 
                 title="${product.name} - ${product.price}"
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/300x400/f8f5ff/9c27b0?text=Модний+магазин'">
            <div class="image-overlay">
                <div class="product-category">${product.category}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price"><i class="fas fa-tag"></i> ${product.price}</div>
            </div>
        `;
        showcase.appendChild(productDiv);
    });
    updateLoadingStats();
    const progressBar = document.getElementById('loading-progress');
    let progress = 0;
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        progress += Math.random() * 2 + 1;
        if (progress >= 100) { progress = 100; clearInterval(progressInterval); }
        progressBar.style.width = `${progress}%`;
    }, 50);
    let timeLeft = 3;
    const timerElement = document.getElementById('timer');
    timerElement.textContent = timeLeft;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        if (timeLeft < 3) changeLoadingMessage();
        if (timeLeft <= 0) { clearInterval(timerInterval); closeFashionShow(); }
    }, 1000);
    changeLoadingMessage();
    const messageInterval = setInterval(changeLoadingMessage, 2000);
    orientationChangeHandler = function() {
        const fashionShow = document.getElementById('fashion-show');
        if (fashionShow.style.display === 'block') {
            setTimeout(() => {
                const showcase = document.getElementById('product-showcase');
                if (showcase.scrollHeight > showcase.clientHeight) showcase.style.maxHeight = '150px';
            }, 100);
        }
    };
    window.addEventListener('resize', orientationChangeHandler);
    window.addEventListener('orientationchange', orientationChangeHandler);
    setTimeout(() => { clearInterval(messageInterval); closeFashionShow(); }, 4000);
}

function createFloatingShapes() {
    const shapesContainer = document.querySelector('.floating-shapes') || document.createElement('div');
    shapesContainer.className = 'floating-shapes';
    shapesContainer.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const shape = document.createElement('div');
        shape.className = 'shape';
        const size = Math.random() * 80 + 40;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const duration = Math.random() * 40 + 30;
        const delay = Math.random() * 5;
        shape.style.width = `${size}px`;
        shape.style.height = `${size}px`;
        shape.style.left = `${posX}%`;
        shape.style.top = `${posY}%`;
        shape.style.opacity = Math.random() * 0.03 + 0.02;
        shape.style.animationDuration = `${duration}s`;
        shape.style.animationDelay = `${delay}s`;
        shapesContainer.appendChild(shape);
    }
    document.getElementById('fashion-show').appendChild(shapesContainer);
}

function changeLoadingMessage() {
    const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
    const subtitle = document.querySelector('.loading-subtitle');
    if (subtitle) {
        subtitle.style.opacity = 0;
        setTimeout(() => { subtitle.textContent = randomMessage; subtitle.style.opacity = 1; }, 300);
    }
}

function updateLoadingStats() {
    const stats = { loaded: Math.floor(Math.random() * 20) + 80, newItems: Math.floor(Math.random() * 50) + 100, discounts: Math.floor(Math.random() * 30) + 20 };
    document.querySelectorAll('.loading-count').forEach((el, index) => {
        if (index === 0) el.textContent = `${stats.loaded}%`;
        if (index === 1) el.textContent = `+${stats.newItems}`;
        if (index === 2) el.textContent = `${stats.discounts}%`;
    });
}

function closeFashionShow() {
    const fashionShow = document.getElementById('fashion-show');
    fashionShow.style.opacity = '0';
    fashionShow.style.transform = 'scale(0.95)';
    setTimeout(() => {
        fashionShow.style.display = 'none';
        fashionShow.style.opacity = '1';
        fashionShow.style.transform = 'scale(1)';
        document.getElementById('loading-progress').style.width = '0%';
        clearInterval(timerInterval);
        clearInterval(progressInterval);
        if (orientationChangeHandler) {
            window.removeEventListener('resize', orientationChangeHandler);
            window.removeEventListener('orientationchange', orientationChangeHandler);
        }
    }, 300);
}

function switchCategory(category) {
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
        card.setAttribute('aria-selected', 'false');
    });
    const selectedCard = document.getElementById(`cat-${category}`);
    if (selectedCard) {
        selectedCard.classList.add('active');
        selectedCard.setAttribute('aria-selected', 'true');
        selectedCard.style.transform = 'scale(1.05)';
        setTimeout(() => { selectedCard.style.transform = ''; }, 300);
    }
    showFashionShow();
    let fileName = 'all';
    switch (category) {
        case 'women': fileName = 'women.json'; break;
        case 'men': fileName = 'men.json'; break;
        case 'kids': fileName = 'kids.json'; break;
        case 'shoes': fileName = 'shoes.json'; break;
        case 'accessories': fileName = 'accessories.json'; break;
        default: fileName = 'all';
    }
    if (typeof window.switchSource === 'function') {
        setTimeout(() => { window.switchSource(fileName); }, 1500);
    }
    setTimeout(() => {
        const productGrid = document.getElementById('product-grid');
        if (productGrid) productGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function initCategoryCards() {
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
        card.setAttribute('aria-selected', 'false');
    });
    const defaultCard = document.getElementById('cat-all');
    if (defaultCard) {
        defaultCard.classList.add('active');
        defaultCard.setAttribute('aria-selected', 'true');
    }
}

function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 300) backToTopBtn.classList.add('show');
        else backToTopBtn.classList.remove('show');
    });
    backToTopBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    backToTopBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

function preloadProductImages() {
    productShowcaseData.forEach(product => { const img = new Image(); img.src = product.image; });
}

document.addEventListener('DOMContentLoaded', function () {
    initCategoryCards();
    initBackToTop();
    document.getElementById('year').textContent = new Date().getFullYear();
    setTimeout(() => {
        const productGrid = document.getElementById('product-grid');
        if (productGrid && productGrid.querySelector('.skeleton-item')) showFashionShow();
    }, 1000);
});

window.addEventListener('load', preloadProductImages);

// Banner click handlers
document.addEventListener('DOMContentLoaded', function() {
    const bannerImages = ['banners/sale1.webp','banners/sale2.webp','banners/sale3.webp','banners/sale4.webp','banners/sale5.webp','banners/sale6.webp'];
    bannerImages.forEach(src => { const img = new Image(); img.src = src; });
    document.querySelectorAll('.banner-btn').forEach(btn => {
        btn.addEventListener('click', function(e) { e.stopPropagation(); });
    });
    document.querySelectorAll('.discount-banner').forEach(banner => {
        banner.addEventListener('click', function() {
            const btn = this.querySelector('.banner-btn');
            if (btn) { const category = btn.getAttribute('onclick'); if (category && category.includes('switchCategory')) eval(category); }
        });
    });
});

// Pagination scroll
(function() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPaginationScroll);
    else initPaginationScroll();
    function initPaginationScroll() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        pagination.addEventListener('click', function(e) {
            const target = e.target.closest('a, button');
            if (!target) return;
            if (target.tagName === 'A' && target.getAttribute('href') === '#') e.preventDefault();
            setTimeout(() => {
                const productGrid = document.getElementById('product-grid');
                if (productGrid) productGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 200);
        });
    }
})();

// Old price conversion (69% discount)
(function() {
    const KEYWORDS = [
        'зим', 'зима', 'winter',
        'утеплені', 'утеплена', 'утеплений', 'утеплене',
        'утепленные', 'утепленная', 'утепленный',
        'insulated', 'warm',
        'фліс', 'fleece',
        'демісезон', 'осінь', 'весна', 'autumn', 'fall', 'spring',
        'велюровий', 'велюр', 'velour',
        'спортивні', 'спортивний', 'спортивна', 'спортивне',
        'спортивные', 'спортивный', 'спортивная',
        'sport', 'sports', 'athletic',
        'спортивний костюм', 'спорт костюм', 'спортивка', 'tracksuit', 'sport suit', 'sportswear',
        'светр', 'светри',
        'свитер', 'свитера',
        'кофта', 'кофти',
        'світшот', 'світшоти',
        'свитшот', 'свитшоты',
        'толстовка', 'толстовки',
        'худі', 'худі',
        'худи', 'худи',
        'кардиган', 'кардигани',
        'кардиган', 'кардиганы',
        'пуловер', 'пуловери',
        'пуловер', 'пуловеры',
        'в\'язаний', 'в\'язані',
        'sweater', 'sweaters',
        'hoodie', 'hoodies',
        'sweatshirt', 'sweatshirts',
        'cardigan', 'cardigans',
        'pullover', 'pullovers'
    ];

    function isEligibleProduct(card) {
        const cardText = card.innerText.toLowerCase();
        return KEYWORDS.some(keyword => cardText.includes(keyword.toLowerCase()));
    }

    function applyOldPriceToCard(card) {
        if (card.querySelector('.old-price')) return;

        if (!isEligibleProduct(card)) return;

        let priceElement = card.querySelector('.price') || 
                           card.querySelector('.product-price') || 
                           card.querySelector('.new-price') ||
                           card.querySelector('[class*="price"]');
        if (!priceElement) {
            const all = card.querySelectorAll('*');
            for (let el of all) {
                if (el.innerText && /[\d\s]+₴/.test(el.innerText)) {
                    priceElement = el;
                    break;
                }
            }
        }
        if (!priceElement) return;

        let currentPrice = parseFloat(priceElement.innerText.replace(/[^\d]/g, ''));
        if (isNaN(currentPrice) || currentPrice <= 0) return;

        const oldPrice = Math.round(currentPrice / 0.31);
        const discountPercent = 69;

        const priceContainer = document.createElement('div');
        priceContainer.className = 'price-container';
        priceContainer.innerHTML = `
            <span class="old-price">${oldPrice} ₴</span>
            <span class="new-price">${currentPrice} ₴</span>
            <span class="discount-badge">-${discountPercent}%</span>
        `;
        priceElement.replaceWith(priceContainer);
    }

    function addOldPriceToCards() {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        const cards = grid.querySelectorAll('.card:not(.skeleton-item)');
        cards.forEach(card => applyOldPriceToCard(card));
    }

    function observeProductGrid() {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        const observer = new MutationObserver(mutations => {
            mutations.forEach(m => {
                if (m.addedNodes.length > 0) setTimeout(addOldPriceToCards, 100);
            });
        });
        observer.observe(grid, { childList: true, subtree: true });
    }

    window.addEventListener('load', () => {
        setTimeout(addOldPriceToCards, 500);
        observeProductGrid();
    });
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(addOldPriceToCards, 800);
    });
})();