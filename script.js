/* ============================================================
   PLAN YOUR TRIP INDIA — Complete JavaScript
   AI Chatbot · Clickable India Map · Light/Dark Theme
   ============================================================ */

// ─── STATE ──────────────────────────────────────────────────────
let travelerCount = 2;
let currentCityKey = '';
let currentStateClicked = '';
let indiaMapInstance = null;
let stateLayer = null;
let deferredInstallPrompt = null;
let chatHistory = [
    {
        role: 'user',
        content: 'You are India Travel AI, a helpful and knowledgeable travel planning assistant specializing in India. You help travelers with destinations, itineraries, budgets, local food, culture, hidden gems, and travel tips across all 28+ Indian states. Be friendly, use emojis sparingly, and keep responses concise and practical. Format nicely with line breaks when listing items.'
    },
    {
        role: 'assistant',
        content: 'Namaste! 🙏 I\'m your India Travel AI. I\'m here to help you plan the perfect trip across India\'s incredible 28+ states. Ask me about destinations, itineraries, budgets, local food, hidden gems, or anything about travelling in Incredible India!'
    }
];

// ─── CURRENT LOCATION ────────────────────────────────────────────
function useCurrentLocation() {
    const btn = document.getElementById('useLocationBtn');
    const btnText = document.getElementById('locationBtnText');
    const destInput = document.getElementById('wizDestInput');

    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser.', 'error');
        return;
    }

    btn.classList.add('loading');
    btnText.textContent = 'Detecting...';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                // Reverse geocode using open API
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
                );
                const data = await res.json();
                const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
                const state = data.address?.state || '';
                const country = data.address?.country || '';

                let locationStr = '';
                if (city) locationStr = city;
                if (state && state !== city) locationStr += (locationStr ? ', ' : '') + state;
                if (country && country !== 'India') locationStr += ' (' + country + ')';

                destInput.value = locationStr || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                showToast(`📍 Location detected: ${locationStr || 'Your coordinates'}`, 'success');
            } catch (e) {
                destInput.value = `Near ${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`;
                showToast('📍 Coordinates captured. Refine if needed.', 'success');
            }
            btn.classList.remove('loading');
            btnText.textContent = '✓ Location Set';
            setTimeout(() => { btnText.textContent = 'Use My Location'; }, 3000);
        },
        (err) => {
            btn.classList.remove('loading');
            btnText.textContent = 'Use My Location';
            const msgs = {
                1: 'Location access denied. Please allow location in your browser.',
                2: 'Unable to detect location. Check GPS/network.',
                3: 'Location request timed out. Please try again.'
            };
            showToast(msgs[err.code] || 'Could not get location.', 'error');
        },
        { timeout: 10000, enableHighAccuracy: false }
    );
}


const CITY_DATA = {
    jaipur: {
        name: 'Jaipur', badge: 'Rajasthan', tagline: 'The Pink City – Palaces, Forts & Royal Heritage',
        img: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80',
        famous: ['Amber Fort', 'City Palace', 'Hawa Mahal', 'Jantar Mantar', 'Nahargarh Fort'],
        food: [{ name: 'Pyaaz Kachori', price: '₹20' }, { name: 'Dal Baati Churma', price: '₹80' }, { name: 'Laal Maas', price: '₹200' }, { name: 'Ghewar', price: '₹60' }, { name: 'Mawa Kachori', price: '₹30' }],
        hidden: ['Panna Meena ka Kund', 'Sisodia Rani Garden', 'Khole ke Hanuman Ji', 'Sanganer Village', 'Galtaji Temple'],
        hotels: ['Rambagh Palace (Luxury)', 'Hotel Pearl Palace (Budget)', 'Jai Mahal Palace (Heritage)', 'Zostel Jaipur (Backpacker)'],
        tips: 'Visit forts early morning to avoid crowds. Hire a local guide for ₹500.',
        per_day: { budget: 1100, normal: 2900, luxury: 8700 }
    },
    goa: {
        name: 'Goa', badge: 'Beach', tagline: 'Sun, Sand & Portuguese Charm on India\'s Coast',
        img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&q=80',
        famous: ['Baga Beach', 'Basilica of Bom Jesus', 'Fort Aguada', 'Anjuna Beach', 'Calangute Beach'],
        food: [{ name: 'Prawn Balchão', price: '₹150' }, { name: 'Bebinca Dessert', price: '₹60' }, { name: 'Goan Fish Curry', price: '₹200' }, { name: 'Cafreal Chicken', price: '₹180' }],
        hidden: ['Butterfly Beach', 'Arambol Sweet Lake', 'Divar Island', 'Cabo de Rama Fort', 'Chorla Ghats'],
        hotels: ['Taj Exotica (Luxury)', 'Zostel Goa (Budget)', 'La Maison Fontaine (Boutique)', 'Backpacker Panda Calangute'],
        tips: 'North Goa for parties, South Goa for peace. Rent a scooter for ₹300/day.',
        per_day: { budget: 1550, normal: 4200, luxury: 10500 }
    },
    manali: {
        name: 'Manali', badge: 'Mountains', tagline: 'Snow-Capped Peaks, Rivers & Adventure Awaits',
        img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&q=80',
        famous: ['Rohtang Pass', 'Solang Valley', 'Hadimba Temple', 'Beas River', 'Mall Road'],
        food: [{ name: 'Siddu (Local Bread)', price: '₹50' }, { name: 'Trout Fish Fry', price: '₹250' }, { name: 'Aktori Pancake', price: '₹40' }, { name: 'Dham Feast', price: '₹120' }],
        hidden: ['Naggar Castle', 'Great Himalayan National Park', 'Chandrakhani Pass', 'Bijli Mahadev', 'Malana Village'],
        hotels: ['Span Resort (Luxury)', 'Zostel Manali (Budget)', 'Johnson Lodge (Mid-range)', 'Snow Valley Resorts'],
        tips: 'Carry warm clothes even in summer. Book Rohtang Pass permits online 24hrs in advance.',
        per_day: { budget: 1400, normal: 3500, luxury: 8800 }
    },
    varanasi: {
        name: 'Varanasi', badge: 'Spiritual', tagline: 'The Oldest Living City – Ghats, Temples & Ganga',
        img: 'https://images.unsplash.com/photo-1561361058-c24e01238a46?w=1200&q=80',
        famous: ['Dashashwamedh Ghat', 'Kashi Vishwanath Temple', 'Sarnath', 'Manikarnika Ghat', 'Assi Ghat'],
        food: [{ name: 'Kachori Sabzi', price: '₹30' }, { name: 'Banarasi Paan', price: '₹20' }, { name: 'Thandai', price: '₹50' }, { name: 'Tamatar Chaat', price: '₹40' }, { name: 'Malaiyo', price: '₹30' }],
        hidden: ['Lalita Ghat', 'Scindia Ghat', 'Tulsi Manas Temple', 'Ramnagar Fort', 'Banaras Ghats at Dawn'],
        hotels: ['BrijRama Palace (Heritage)', 'Stops Hostel (Budget)', 'Hotel Surya (Mid-range)', 'Ganges View Hotel'],
        tips: 'Wake up for sunrise boat ride on Ganga (₹200). Ganga Aarti at 7pm is unmissable.',
        per_day: { budget: 950, normal: 2550, luxury: 6500 }
    },
    kerala: {
        name: 'Kerala', badge: 'Nature', tagline: 'God\'s Own Country – Backwaters, Spice & Serenity',
        img: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=80',
        famous: ['Alleppey Backwaters', 'Munnar Tea Gardens', 'Kovalam Beach', 'Periyar Wildlife Sanctuary', 'Varkala Cliff'],
        food: [{ name: 'Appam & Stew', price: '₹80' }, { name: 'Kerala Sadya', price: '₹150' }, { name: 'Karimeen Pollichathu', price: '₹300' }, { name: 'Puttu & Kadala', price: '₹60' }, { name: 'Pazham Pori', price: '₹20' }],
        hidden: ['Gavi Eco Forest', 'Bekal Fort', 'Thenmala Eco Tourism', 'Athirapally Waterfalls', 'Wayanad Hills'],
        hotels: ['Kumarakom Lake Resort (Luxury)', 'Zostel Varkala (Budget)', 'Philipkutty Farm (Boutique)', 'EarthHome Stays'],
        tips: 'Houseboat stay in Alleppey is a must-do (from ₹6000/night). Oct–Feb is peak season.',
        per_day: { budget: 1400, normal: 3850, luxury: 10000 }
    },
    ladakh: {
        name: 'Ladakh', badge: 'High Altitude', tagline: 'Moonscapes, Monasteries & Cosmic Landscapes',
        img: 'https://images.unsplash.com/photo-1604537529428-15bcbeecfe4d?w=1200&q=80',
        famous: ['Pangong Lake', 'Nubra Valley', 'Leh Palace', 'Magnetic Hill', 'Hemis Monastery'],
        food: [{ name: 'Thukpa Noodle Soup', price: '₹80' }, { name: 'Skyu Pasta', price: '₹70' }, { name: 'Butter Tea', price: '₹30' }, { name: 'Tsampa Porridge', price: '₹50' }, { name: 'Steamed Momos', price: '₹60' }],
        hidden: ['Tso Moriri Lake', 'Zanskar Valley', 'Dah Hanu Village', 'Phugtal Monastery', 'Hanle Dark Sky Reserve'],
        hotels: ['Grand Dragon Ladakh (Luxury)', 'Zostel Leh (Budget)', 'Stok Palace Heritage (Heritage)', 'The Indus Valley'],
        tips: 'Acclimatize 2 days in Leh before excursions. Carry cash — ATMs are unreliable above 3500m.',
        per_day: { budget: 1900, normal: 4700, luxury: 12000 }
    }
};

// ─── STATE FLAGS / EMOJIS ───────────────────────────────────────
const STATE_FLAGS = {
    'Rajasthan': '🏜️', 'Maharashtra': '🌆', 'Tamil Nadu': '🏛️',
    'Kerala': '🌴', 'Goa': '🏖️', 'Himachal Pradesh': '🏔️',
    'Uttarakhand': '⛰️', 'Jammu & Kashmir': '❄️', 'Ladakh': '🌌',
    'Punjab': '🌾', 'Haryana': '🌾', 'Delhi': '🕌',
    'Uttar Pradesh': '🛕', 'Bihar': '🪷', 'West Bengal': '🐯',
    'Odisha': '🌊', 'Andhra Pradesh': '🌶️', 'Telangana': '💎',
    'Karnataka': '🌳', 'Gujarat': '🦁', 'Madhya Pradesh': '🐆',
    'Chhattisgarh': '🌿', 'Jharkhand': '⛏️', 'Assam': '🍵',
    'Meghalaya': '🌧️', 'Sikkim': '🏔️', 'Arunachal Pradesh': '🦅',
    'Manipur': '💃', 'Mizoram': '🌸', 'Nagaland': '🎭',
    'Tripura': '🏯', 'Andaman and Nicobar': '🐢', 'Lakshadweep': '🪸',
    'Chandigarh': '🏙️', 'Puducherry': '⛵'
};

// ─── WELCOME OVERLAY ────────────────────────────────────────────
const WELCOME_GREETINGS = [
    { word: 'Namaste', lang: 'Hindi · नमस्ते' },
    { word: 'Kem Cho', lang: 'Gujarati · કેમ છો' },
    { word: 'Vanakkam', lang: 'Tamil · வணக்கம்' },
    { word: 'Namaskar', lang: 'Marathi · नमस्कार' },
    { word: 'Sat Sri Akal', lang: 'Punjabi · ਸਤ ਸ੍ਰੀ ਅਕਾਲ' },
    { word: 'Nomoshkar', lang: 'Bengali · নমস্কার' },
    { word: 'Marhaba', lang: 'Urdu · مرحبا' },
];

function initWelcomeOverlay() {
    const overlay = document.getElementById('welcomeOverlay');
    const wordEl = document.getElementById('welcomeWord');
    const langEl = document.getElementById('welcomeLang');
    const dotsEl = document.getElementById('welcomeDots');
    if (!overlay) return;

    // Create dots
    WELCOME_GREETINGS.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'welcome-dot' + (i === 0 ? ' active' : '');
        dotsEl.appendChild(dot);
    });

    let idx = 0;
    const dots = dotsEl.querySelectorAll('.welcome-dot');

    function showGreeting(i) {
        const g = WELCOME_GREETINGS[i];
        wordEl.textContent = g.word;
        langEl.textContent = g.lang;
        wordEl.style.animation = 'none';
        langEl.style.animation = 'none';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                wordEl.style.animation = 'welcomeFadeSlide 1.3s ease forwards';
                langEl.style.animation = 'welcomeFadeSlide 1.3s ease forwards';
            });
        });
        dots.forEach((d, di) => d.classList.toggle('active', di === i));
    }

    showGreeting(0);

    const interval = setInterval(() => {
        idx++;
        if (idx >= WELCOME_GREETINGS.length) {
            clearInterval(interval);
            setTimeout(() => {
                overlay.classList.add('hidden');
                overlay.style.pointerEvents = 'none';
                // Show loader briefly then hide
                const loader = document.getElementById('loader');
                if (loader) {
                    loader.classList.add('active');
                    setTimeout(() => {
                        loader.classList.remove('active');
                        loader.classList.add('hidden');
                        loader.style.pointerEvents = 'none';
                        loader.style.display = 'none';
                        initScrollReveal();
                        initGreeting();
                        initIndiaMap();
                    }, 1800);
                }
            }, 400);
            return;
        }
        showGreeting(idx);
    }, 1400);
}

// ─── LOADER ─────────────────────────────────────────────────────
window.addEventListener('load', () => {
    initWelcomeOverlay();
});
function initGreeting() {
    const hour = new Date().getHours();
    let g = 'Namaste 🙏';
    if (hour < 12) g = 'Good Morning 🌅';
    else if (hour < 17) g = 'Good Afternoon ☀️';
    else if (hour < 20) g = 'Good Evening 🌇';
    const el = document.getElementById('greetingText');
    if (el) el.textContent = g;
}

// ─── THEME TOGGLE ─────────────────────────────────────────────
function getThemeIcon(theme) {
    return theme === 'dark' ? '🌙' : '🌊';
}

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('pyti_theme', next);
}

// Init theme from localStorage — runs immediately so no flash
(function initTheme() {
    const saved = localStorage.getItem('pyti_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
})();

// ─── NAVBAR ─────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    updateActiveNav();
});

function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const links = document.querySelectorAll('.nav-link');
    let current = '';
    sections.forEach(sec => {
        if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${current}`));
}

// ─── HAMBURGER ──────────────────────────────────────────────────
// ─── MOBILE NAV OVERLAY ─────────────────────────────────────────
(function setupMobileNav() {
    const hamburger = document.getElementById('hamburger');
    if (!hamburger) return;

    const overlay = document.createElement('div');
    overlay.className = 'nav-mobile-overlay';
    overlay.id = 'navMobileOverlay';
    overlay.innerHTML = `
    <a href="#home"      class="nav-link" data-close>Home</a>
    <a href="#india-map" class="nav-link" data-close>India Map</a>
    <a href="#places"    class="nav-link" data-close>Places</a>
    <a href="#planner"   class="nav-link" data-close>AI Planner</a>
    <a href="#about"     class="nav-link" data-close>About</a>
    <a href="#contact"   class="nav-link" data-close>Contact</a>
    <div class="nav-mobile-divider"></div>
    <div class="nav-mobile-auth" id="mobileAuthBtns">
      <button class="btn-nav-login" id="mobLoginBtn">Login</button>
      <button class="btn-nav-signup" id="mobSignupBtn">Sign Up ✦</button>
    </div>
  `;
    document.body.appendChild(overlay);

    function openNav() {
        hamburger.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (window.updateMobileAuthUI) window.updateMobileAuthUI();
    }
    function closeNav() {
        hamburger.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', () => {
        overlay.classList.contains('open') ? closeNav() : openNav();
    });

    overlay.querySelectorAll('[data-close]').forEach(el => {
        el.addEventListener('click', closeNav);
    });

    overlay.addEventListener('click', e => {
        const t = e.target;
        if (t.id === 'mobLoginBtn') { closeNav(); openModal('loginModal'); }
        if (t.id === 'mobSignupBtn') { closeNav(); openModal('signupModal'); }
        if (t.dataset.logout !== undefined) { closeNav(); logoutUser(); }
    });

    window.updateMobileAuthUI = function () {
        const area = document.getElementById('mobileAuthBtns');
        if (!area) return;
        if (currentUser) {
            const initials = ((currentUser.first || '?')[0] + (currentUser.last || '?')[0]).toUpperCase();
            area.innerHTML = `
        <div class="nav-user-badge" style="justify-content:center;gap:.6rem">
          <div class="nav-user-avatar">${initials}</div>
          <span>${currentUser.first}</span>
          <button data-logout style="background:none;border:none;color:var(--text-dim);font-size:.82rem;cursor:pointer;margin-left:.3rem">↩ Out</button>
        </div>`;
        } else {
            area.innerHTML = `
        <button class="btn-nav-login" id="mobLoginBtn">Login</button>
        <button class="btn-nav-signup" id="mobSignupBtn">Sign Up ✦</button>`;
        }
    };

    document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', closeNav));
})();

// ─── SCROLL REVEAL ──────────────────────────────────────────────
function initScrollReveal() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), i * 80);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// ─── TRAVELERS ──────────────────────────────────────────────────

// ─── INDIA MAP ──────────────────────────────────────────────────
function initIndiaMap() {
    if (!document.getElementById('indiaMap')) return;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    indiaMapInstance = L.map('indiaMap', {
        center: [22.5, 82],
        zoom: 4,
        minZoom: 3,
        maxZoom: 8,
        zoomControl: true,
        scrollWheelZoom: false,
        dragging: true,
        tap: true,
        tapTolerance: 20,
        touchZoom: true,
        doubleClickZoom: false,
        maxBounds: [[5, 65], [38, 100]],
        maxBoundsViscosity: 1.0
    });

    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd', maxZoom: 19
    }).addTo(indiaMapInstance);

    // Load India states GeoJSON
    fetch('https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson')
        .then(r => r.json())
        .then(data => {
            stateLayer = L.geoJSON(data, {
                style: getStateStyle,
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.NAME_1 || feature.properties.state || '';
                    layer.on({
                        mouseover: e => {
                            e.target.setStyle({
                                fillColor: '#FEFACD',
                                fillOpacity: 0.35,
                                color: '#FEFACD',
                                weight: 2
                            });
                            e.target.bindTooltip(name, { permanent: false, direction: 'center', className: 'state-tooltip' }).openTooltip();
                        },
                        mouseout: e => {
                            stateLayer.resetStyle(e.target);
                        },
                        click: e => {
                            L.DomEvent.stopPropagation(e);
                            onStateClick(name);
                        },
                        touchend: e => {
                            L.DomEvent.stopPropagation(e);
                            onStateClick(name);
                        }
                    });
                }
            }).addTo(indiaMapInstance);
        })
        .catch(() => {
            // Fallback: show a note
            console.log('India GeoJSON failed to load. Trying fallback...');
            loadIndiaMapFallback();
        });
}

function getStateStyle() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
        fillColor: isDark ? 'rgba(123,98,184,0.3)' : 'rgba(95,74,139,0.2)',
        fillOpacity: 1,
        color: isDark ? 'rgba(254,250,205,0.5)' : 'rgba(95,74,139,0.5)',
        weight: 1
    };
}

function loadIndiaMapFallback() {
    // Try alternate GeoJSON source
    fetch('https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States')
        .then(r => r.json())
        .then(data => {
            stateLayer = L.geoJSON(data, {
                style: getStateStyle,
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.ST_NM || feature.properties.name || '';
                    layer.on({
                        mouseover: e => {
                            e.target.setStyle({ fillColor: '#FEFACD', fillOpacity: 0.35, color: '#FEFACD', weight: 2 });
                        },
                        mouseout: e => stateLayer.resetStyle(e.target),
                        click: e => { L.DomEvent.stopPropagation(e); onStateClick(name); },
                        touchend: e => { L.DomEvent.stopPropagation(e); onStateClick(name); }
                    });
                }
            }).addTo(indiaMapInstance);
        })
        .catch(() => {
            console.log('Both GeoJSON sources failed. Map still navigable.');
        });
}

async function onStateClick(stateName) {
    if (!stateName) return;
    currentStateClicked = stateName;

    // Show result panel
    document.getElementById('mapPanelDefault').style.display = 'none';
    document.getElementById('mapPanelResult').style.display = 'flex';
    document.getElementById('mapStateFlag').textContent = STATE_FLAGS[stateName] || '🗺️';
    document.getElementById('mapStateName').textContent = stateName;
    document.getElementById('mapStateTagline').textContent = 'Getting AI recommendations...';
    document.getElementById('mapResultLoading').style.display = 'block';
    document.getElementById('mapResultContent').style.display = 'none';
    document.getElementById('mapResultActions').style.display = 'none';

    const prompt = `Give me a concise travel overview of ${stateName}, India. Format exactly like this:

📍 QUICK FACTS
• Capital: [city]
• Best season: [months]
• Known for: [2-3 things]

🌟 TOP 3 MUST-VISIT PLACES
• [Place 1] — [one line why]
• [Place 2] — [one line why]
• [Place 3] — [one line why]

🍽️ LOCAL FOOD TO TRY
• [Food 1], [Food 2], [Food 3]

💡 TRAVELLER TIP
[One practical tip for visiting ${stateName}]

Keep it under 180 words total.`;

    try {
        const response = await callClaudeAI([{ role: 'user', content: prompt }]);
        document.getElementById('mapResultLoading').style.display = 'none';
        document.getElementById('mapResultContent').style.display = 'block';
        document.getElementById('mapResultContent').textContent = response;
        document.getElementById('mapResultActions').style.display = 'flex';
        document.getElementById('mapStateTagline').textContent = `Explore ${stateName}`;
    } catch (err) {
        document.getElementById('mapResultLoading').style.display = 'none';
        document.getElementById('mapResultContent').style.display = 'block';
        document.getElementById('mapResultContent').textContent = `Could not load AI info for ${stateName}. Please check your connection and try again.`;
    }
}

function triggerStateAI(stateName) {
    onStateClick(stateName);
}

function chatAboutState() {
    openChat();
    setTimeout(() => {
        const msg = `Tell me more about travelling in ${currentStateClicked}, India — best hidden gems, visa-free zones, must-try local experiences and a suggested 5-day itinerary.`;
        document.getElementById('chatInput').value = msg;
        sendMessage();
    }, 300);
}

function planThisState() {
    wizSelectDest(currentStateClicked);
    document.getElementById('planner').scrollIntoView({ behavior: 'smooth' });
}

// ─── WIZARD STATE ────────────────────────────────────────────────
let wizCurrentStep = 1;
const WIZ_TOTAL = 5;
const wizState = {
    destination: '',
    dateFrom: '',
    dateTo: '',
    duration: 0,
    styles: [],
    adults: 2,
    children: 0,
    budget: 'normal',
    accom: ['Resort']
};

function wizNextStep() {
    if (!wizValidate(wizCurrentStep)) return;
    if (wizCurrentStep === WIZ_TOTAL) { wizGeneratePlan(); return; }

    const curItem = document.getElementById('wizStep' + wizCurrentStep);
    curItem.classList.remove('active');
    curItem.classList.add('completed');
    curItem.querySelector('.wiz-step-circle').innerHTML = '✓';
    document.getElementById('wizPanel' + wizCurrentStep).classList.remove('active');

    wizCurrentStep++;
    document.getElementById('wizStep' + wizCurrentStep).classList.add('active');
    document.getElementById('wizPanel' + wizCurrentStep).classList.add('active');

    document.getElementById('wizBackBtn').disabled = false;
    document.getElementById('wizStepCount').textContent = `Step ${wizCurrentStep} of ${WIZ_TOTAL}`;
    document.getElementById('wizNextBtnText').textContent = wizCurrentStep === WIZ_TOTAL ? 'Generate Plan ✦' : 'Continue';

    if (wizCurrentStep === WIZ_TOTAL) wizPopulateSummary();
    document.getElementById('wizardCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function wizPrevStep() {
    if (wizCurrentStep === 1) return;
    document.getElementById('wizPanel' + wizCurrentStep).classList.remove('active');
    document.getElementById('wizStep' + wizCurrentStep).classList.remove('active');

    wizCurrentStep--;
    document.getElementById('wizPanel' + wizCurrentStep).classList.add('active');
    const item = document.getElementById('wizStep' + wizCurrentStep);
    item.classList.remove('completed');
    item.classList.add('active');
    item.querySelector('.wiz-step-circle').innerHTML = wizCurrentStep;

    document.getElementById('wizBackBtn').disabled = (wizCurrentStep === 1);
    document.getElementById('wizStepCount').textContent = `Step ${wizCurrentStep} of ${WIZ_TOTAL}`;
    document.getElementById('wizNextBtnText').textContent = 'Continue';
}

function wizValidate(step) {
    if (step === 1 && !wizState.destination.trim()) {
        showToast('📍 Please enter or select a destination first!');
        document.getElementById('wizDestInput').focus();
        return false;
    }
    if (step === 2) {
        if (!wizState.dateFrom || !wizState.dateTo) {
            showToast('📅 Please select both departure and return dates');
            return false;
        }
        if (new Date(wizState.dateFrom) >= new Date(wizState.dateTo)) {
            showToast('📅 Return date must be after departure date');
            return false;
        }
    }
    return true;
}

function wizSelectDest(name) {
    wizState.destination = name;
    const inp = document.getElementById('wizDestInput');
    if (inp) inp.value = name;
    document.querySelectorAll('#wizDestChips .wiz-chip').forEach(c => {
        c.classList.toggle('selected', c.textContent.trim().includes(name));
    });
}

function wizFilterChips(val) {
    wizState.destination = val;
    document.querySelectorAll('#wizDestChips .wiz-chip').forEach(c => {
        const name = c.textContent.replace(/^[\u{1F000}-\u{1FFFF}]|\s*/gu, '').trim();
        c.style.display = (!val || name.toLowerCase().includes(val.toLowerCase())) ? '' : 'none';
    });
}

function wizCalcDuration() {
    const f = document.getElementById('wizDateFrom').value;
    const t = document.getElementById('wizDateTo').value;
    wizState.dateFrom = f; wizState.dateTo = t;
    if (f && t) {
        const days = Math.round((new Date(t) - new Date(f)) / 86400000);
        if (days > 0) {
            wizState.duration = days;
            document.getElementById('wizDurationBadge').textContent =
                `🗺️ ${days} day${days > 1 ? 's' : ''} trip · ${wizFmtDate(f)} → ${wizFmtDate(t)}`;
        } else {
            document.getElementById('wizDurationBadge').textContent = '⚠️ Return date must be after departure';
        }
    }
}

function wizFmtDate(str) {
    return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function wizSetDuration(days) {
    const from = new Date(); from.setDate(from.getDate() + 7);
    const to = new Date(from); to.setDate(from.getDate() + days);
    const fStr = from.toISOString().split('T')[0];
    const tStr = to.toISOString().split('T')[0];
    document.getElementById('wizDateFrom').value = fStr;
    document.getElementById('wizDateTo').value = tStr;
    wizState.dateFrom = fStr; wizState.dateTo = tStr; wizState.duration = days;
    document.getElementById('wizDurationBadge').textContent =
        `🗺️ ${days} day${days > 1 ? 's' : ''} trip · ${wizFmtDate(fStr)} → ${wizFmtDate(tStr)}`;
}

function wizToggleChip(el, group) {
    el.classList.toggle('selected');
    const name = el.textContent.replace(/^\S+\s*/, '').trim();
    if (group === 'style') {
        wizState.styles = el.classList.contains('selected')
            ? [...new Set([...wizState.styles, name])]
            : wizState.styles.filter(s => s !== name);
    } else {
        wizState.accom = el.classList.contains('selected')
            ? [...new Set([...wizState.accom, name])]
            : wizState.accom.filter(s => s !== name);
    }
}

function wizChangeTrav(type, delta) {
    if (type === 'adults') {
        wizState.adults = Math.max(1, wizState.adults + delta);
        document.getElementById('wizAdultsCount').textContent = wizState.adults;
        document.getElementById('wizAdultsDown').disabled = (wizState.adults <= 1);
    } else {
        wizState.children = Math.max(0, wizState.children + delta);
        document.getElementById('wizChildCount').textContent = wizState.children;
        document.getElementById('wizChildDown').disabled = (wizState.children <= 0);
    }
}

function wizSelectBudget(el, val) {
    document.querySelectorAll('.wiz-budget-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    wizState.budget = val;
}

function wizPopulateSummary() {
    document.getElementById('wizSumDest').textContent = wizState.destination || '—';
    document.getElementById('wizSumDuration').textContent = wizState.duration
        ? `${wizState.duration} days · ${wizFmtDate(wizState.dateFrom)} to ${wizFmtDate(wizState.dateTo)}`
        : '—';
    const people = wizState.adults + wizState.children;
    document.getElementById('wizSumTravelers').textContent =
        `${wizState.adults} adult${wizState.adults > 1 ? 's' : ''}${wizState.children ? ` + ${wizState.children} child${wizState.children > 1 ? 'ren' : ''}` : ''}`;
    const bl = { budget: '🎒 Budget (₹5k–₹15k)', normal: '✈️ Mid-Range (₹15k–₹40k)', luxury: '👑 Luxury (₹40k+)' };
    document.getElementById('wizSumBudget').textContent = bl[wizState.budget] || '—';
    document.getElementById('wizSumStyle').textContent = wizState.styles.length ? wizState.styles.join(' · ') : 'Not specified';
}

async function wizGeneratePlan() {
    const btn = document.getElementById('wizNextBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Crafting</span> <span class="wiz-dot-loader"><span></span><span></span><span></span></span>';
    document.getElementById('wizBackBtn').disabled = true;

    const dest = wizState.destination;
    const dur = wizState.duration || 5;
    const style = wizState.styles.join(', ') || 'cultural';

    // Check if known city
    const cityKey = Object.keys(CITY_DATA).find(k => dest.toLowerCase().includes(k));
    const cityData = cityKey ? CITY_DATA[cityKey] : null;

    try {
        const prompt = `Create a ${dur}-day travel itinerary for ${dest}, India for ${wizState.adults + wizState.children} traveler(s). Budget: ${wizState.budget}. Style: ${style}.
Respond ONLY with valid JSON:
{"city":"${dest}","tagline":"evocative line","famous":["place1","place2","place3","place4","place5"],"hidden":["gem1","gem2","gem3","gem4"],"food":[{"name":"dish","price":"₹XX"},{"name":"dish","price":"₹XX"},{"name":"dish","price":"₹XX"}],"day_plan":[{"day":1,"title":"title","morning":"activity","afternoon":"activity","evening":"activity","food":"food tip"}],"budget":{"accommodation":XXXX,"food":XXXX,"transport":XXXX,"activities":XXXX},"tips":"one practical tip"}
Generate all ${dur} days. Budget numbers per person total in INR.`;

        const response = await callClaudeAI([{ role: 'user', content: prompt }]);
        let planData;
        try {
            planData = JSON.parse(response.replace(/```json|```/g, '').trim());
        } catch (e) {
            planData = wizBuildFallback(dest, dur, cityData);
        }
        wizRenderResults(planData, dest, dur);
    } catch (err) {
        wizRenderResults(wizBuildFallback(dest, dur, cityData), dest, dur);
    }
}

function wizBuildFallback(destination, days, cityData) {
    const d = cityData || {
        famous: [`${destination} Heritage Site`, `${destination} City Centre`, `${destination} Museum`, 'Local Market', 'Viewpoint'],
        hidden: ['Old town lanes', 'Local village nearby', 'Scenic route', 'Sunrise point'],
        food: [{ name: 'Local Thali', price: '₹80' }, { name: 'Street Snacks', price: '₹30' }, { name: 'Regional Curry', price: '₹150' }],
        per_day: { budget: 1000, normal: 3000, luxury: 8000 },
        tips: `Hire a local guide for the best experience in ${destination}.`
    };
    const perDay = d.per_day?.[wizState.budget] || 3000;
    const totalDays = Math.min(days, 7);
    const allSpots = [...(d.famous || []), ...(d.hidden || [])];
    return {
        city: destination, tagline: `Discover the wonders of ${destination}`,
        famous: d.famous, hidden: d.hidden, food: d.food,
        day_plan: Array.from({ length: totalDays }, (_, i) => ({
            day: i + 1, title: `Day ${i + 1} in ${destination}`,
            morning: `Visit ${allSpots[i * 2 % allSpots.length]}`,
            afternoon: 'Explore local markets and cafes',
            evening: `Evening at ${allSpots[(i * 2 + 1) % allSpots.length]}`,
            food: (d.food[i % d.food.length]?.name || 'Local cuisine') + ' for dinner'
        })),
        budget: {
            accommodation: Math.round(perDay * 0.4) * totalDays,
            food: Math.round(perDay * 0.25) * totalDays,
            transport: Math.round(perDay * 0.2) * totalDays,
            activities: Math.round(perDay * 0.15) * totalDays
        },
        tips: d.tips || `Enjoy your trip to ${destination}!`
    };
}

function wizRenderResults(plan, destination, duration) {
    // Hide all panels, step bar, footer nav — show result
    document.querySelectorAll('.wiz-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('wizStepBar').style.display = 'none';
    document.getElementById('wizResultPanel').classList.add('active');

    const total = Object.values(plan.budget || {}).reduce((a, b) => a + b, 0);
    const people = wizState.adults + wizState.children;
    document.getElementById('wizResultTitle').textContent = `Your ${plan.city || destination} Plan ✦`;
    document.getElementById('wizResultSubtitle').textContent =
        `${duration} days · ${wizState.budget} budget · ${people} traveller${people > 1 ? 's' : ''}`;

    document.getElementById('wizResultCards').innerHTML = `
    <div class="result-card"><h4>🏛️ Famous Places</h4><ul>${(plan.famous || []).map(p => `<li>${p}</li>`).join('')}</ul></div>
    <div class="result-card"><h4>💎 Hidden Gems</h4><ul>${(plan.hidden || []).map(p => `<li>${p}</li>`).join('')}</ul></div>
    <div class="result-card"><h4>🍜 Must-Try Food</h4><ul>${(plan.food || []).map(f => `<li>${f.name} <span style="color:var(--lc);margin-left:auto">${f.price || ''}</span></li>`).join('')}</ul></div>
    <div class="result-card"><h4>💰 Budget Breakdown</h4>
      <div class="budget-breakdown">
        <div class="budget-row"><span>🏨 Accommodation</span><span>₹${(plan.budget?.accommodation || 0).toLocaleString()}</span></div>
        <div class="budget-row"><span>🍽️ Food</span><span>₹${(plan.budget?.food || 0).toLocaleString()}</span></div>
        <div class="budget-row"><span>🚗 Transport</span><span>₹${(plan.budget?.transport || 0).toLocaleString()}</span></div>
        <div class="budget-row"><span>🎭 Activities</span><span>₹${(plan.budget?.activities || 0).toLocaleString()}</span></div>
        <div class="budget-row total"><span>Total Estimate</span><span>₹${total.toLocaleString()}</span></div>
      </div>
    </div>
    <div class="result-card result-card-full"><h4>📅 Day-by-Day Itinerary</h4>
      ${(plan.day_plan || []).map(d => `
        <div class="day-plan-item">
          <strong>Day ${d.day}${d.title ? ` — ${d.title}` : ''}</strong>
          <p>🌅 ${d.morning}<br>☀️ ${d.afternoon}<br>🌙 ${d.evening}${d.food ? `<br>🍴 ${d.food}` : ''}</p>
        </div>`).join('')}
    </div>
    ${plan.tips ? `<div class="result-card result-card-full"><h4>💡 Local Tips</h4><p style="color:var(--text-muted);font-size:.9rem;line-height:1.7">${plan.tips}</p></div>` : ''}`;

    document.getElementById('wizFooter').innerHTML = `
      <button class="wiz-btn-back" onclick="wizReset()">← Plan Another</button>
      <span class="wiz-step-count">✦ Plan Generated</span>
      <button class="wiz-btn-next" onclick="window.print()">📥 Save Plan</button>`;

    document.getElementById('wizResultPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function wizReset() {
    location.reload();
}

// ─── WIZARD INIT ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    const df = document.getElementById('wizDateFrom');
    const dt = document.getElementById('wizDateTo');
    if (df) df.min = today;
    if (dt) dt.min = today;
    const wi = document.getElementById('wizDestInput');
    if (wi) wi.addEventListener('input', function () { wizState.destination = this.value; });
    const cd = document.getElementById('wizChildDown');
    if (cd) cd.disabled = true;
    const ad = document.getElementById('wizAdultsDown');
    if (ad) ad.disabled = true;
});


// ─── CITY PAGE ───────────────────────────────────────────────────
function openCityPage(key) {
    const city = CITY_DATA[key];
    if (!city) return;
    currentCityKey = key;
    document.getElementById('mainContent') && (document.getElementById('mainContent').style.display = 'none');
    const page = document.getElementById('cityPage');
    page.style.display = 'block';
    page.scrollTop = 0;

    const hero = document.getElementById('cityHero');
    hero.style.backgroundImage = `url('${city.img}')`;
    hero.style.backgroundSize = 'cover';
    hero.style.backgroundPosition = 'center';

    document.getElementById('cityBadge').textContent = city.badge;
    document.getElementById('cityTitle').textContent = city.name;
    document.getElementById('cityTagline').textContent = city.tagline;

    // Famous
    document.getElementById('famousCards').innerHTML = city.famous.map(p => `
    <div class="city-info-card"><div class="card-icon">🏛️</div><h4>${p}</h4><p>Must-visit attraction in ${city.name}</p></div>
  `).join('');

    // Food
    document.getElementById('foodCards').innerHTML = city.food.map(f => `
    <div class="city-info-card"><div class="card-icon">🍜</div><h4>${f.name}</h4><p>Local street food delicacy</p><span class="price-tag">${f.price}</span></div>
  `).join('');

    // Hidden
    document.getElementById('hiddenCards').innerHTML = city.hidden.map(p => `
    <div class="city-info-card"><div class="card-icon">💎</div><h4>${p}</h4><p>Hidden gem locals love</p></div>
  `).join('');

    // Hotels
    document.getElementById('hotelCards').innerHTML = city.hotels.map(h => `
    <div class="city-info-card"><div class="card-icon">🏨</div><h4>${h}</h4><p>Recommended stay in ${city.name}</p></div>
  `).join('');

    // Tab switching
    document.querySelectorAll('.city-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.city-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.city-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        };
    });
}

function closeCityPage() {
    document.getElementById('cityPage').style.display = 'none';
    document.getElementById('mainContent') && (document.getElementById('mainContent').style.display = 'block');
}

function quickPlanCity() {
    const city = CITY_DATA[currentCityKey];
    if (!city) return;
    closeCityPage();
    wizSelectDest(city.name);
    document.getElementById('planner').scrollIntoView({ behavior: 'smooth' });
}

// Expose for HTML
function showMain() { closeCityPage(); }

// ─── AI CHATBOT ──────────────────────────────────────────────────
function toggleChat() {
    const win = document.getElementById('chatWindow');
    win.classList.toggle('open');
    const notif = document.getElementById('chatNotif');
    if (notif) notif.style.display = 'none';
}

function openChat() {
    document.getElementById('chatWindow').classList.add('open');
    const notif = document.getElementById('chatNotif');
    if (notif) notif.style.display = 'none';
}

function sendQuickMsg(msg) {
    openChat();
    document.getElementById('chatInput').value = msg;
    sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    appendChatMsg('user', '🧳', message);
    input.value = '';
    chatHistory.push({ role: 'user', content: message });

    const typingId = showTypingIndicator();

    try {
        const response = await callClaudeAI(chatHistory);
        removeTyping(typingId);
        appendChatMsg('bot', '🤖', response);
        chatHistory.push({ role: 'assistant', content: response });
        if (chatHistory.length > 24) {
            chatHistory = [chatHistory[0], chatHistory[1], ...chatHistory.slice(-20)];
        }
    } catch (err) {
        removeTyping(typingId);
        appendChatMsg('bot', '🤖', `Sorry, I couldn't connect to AI right now. ${err.message}`);
    }
}

function appendChatMsg(type, avatar, text) {
    const msgs = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    div.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-content">${formatText(text)}</div>
  `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function formatText(text) {
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function showTypingIndicator() {
    const msgs = document.getElementById('chatMessages');
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'chat-msg bot'; div.id = id;
    div.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-content">
      <div class="ai-typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return id;
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ─── CLAUDE API ─────────────────────────────────────────────────
async function callClaudeAI(messages) {
    // Filter to only user/assistant roles for the API
    const apiMessages = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

    // Ensure starts with user
    if (!apiMessages.length || apiMessages[0].role !== 'user') {
        throw new Error('Invalid message format');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: `You are India Travel AI — a knowledgeable, friendly travel planning assistant specializing in India. 
You help travelers plan trips across India's 28+ states. You know about destinations, itineraries, budgets, local food, hidden gems, culture, and practical travel tips.
Keep responses concise, practical, and well-formatted. Use emojis sparingly for readability.
When asked for JSON, respond ONLY with valid JSON, no markdown fences or extra text.`,
            messages: apiMessages
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content || [];
    return content.filter(b => b.type === 'text').map(b => b.text).join('\n') || '';
}

// ─── CONTACT FORM ───────────────────────────────────────────────
function submitContact(event) {
    event.preventDefault();
    const success = document.getElementById('formSuccess');
    success.style.display = 'block';
    event.target.reset();
    setTimeout(() => success.style.display = 'none', 5000);
}

// ─── TOAST ──────────────────────────────────────────────────────
function showToast(message, duration = 3500) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// ─── KEYBOARD ───────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.getElementById('chatWindow').classList.remove('open');
        if (document.getElementById('cityPage').style.display !== 'none') closeCityPage();
    }
});


// ════════════════════════════════════════════════
//  AUTH — Login / Sign Up System
// ════════════════════════════════════════════════

// Simple in-memory user store (localStorage-backed)
let currentUser = JSON.parse(localStorage.getItem('pyti_user') || 'null');

// On init — reflect login state in navbar
window.addEventListener('DOMContentLoaded', () => {
    refreshNavAuth();

    // ── MOBILE SCROLL FIX ─────────────────────────────────────────
    // iOS Safari doesn't reliably handle href="#section" with fixed nav.
    // Override ALL internal anchor links to use JS scrollIntoView.
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            const navH = document.getElementById('navbar')?.offsetHeight || 70;
            const top = target.getBoundingClientRect().top + window.scrollY - navH;
            window.scrollTo({ top, behavior: 'smooth' });
        }, { passive: false });
    });
});

function refreshNavAuth() {
    const navActions = document.getElementById('navActions');
    if (navActions) {
        if (currentUser) {
            const initials = ((currentUser.first || '?')[0] + (currentUser.last || '?')[0]).toUpperCase();
            navActions.innerHTML = `
        <div class="nav-user-badge">
          <div class="nav-user-avatar">${initials}</div>
          <span>${currentUser.first}</span>
          <button style="background:none;border:none;color:var(--text-dim);font-size:.8rem;cursor:pointer;margin-left:.3rem;" onclick="logoutUser()">↩ Out</button>
        </div>`;
        } else {
            navActions.innerHTML = `
        <button class="btn-nav-login" onclick="openModal('loginModal')">Login</button>
        <button class="btn-nav-signup" onclick="openModal('signupModal')">Sign Up ✦</button>`;
        }
    }
    if (window.updateMobileAuthUI) window.updateMobileAuthUI();
}

// ── Modal open / close ────────────────────────
function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Focus first input
    setTimeout(() => {
        const inp = modal.querySelector('.auth-input');
        if (inp) inp.focus();
    }, 350);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    clearAuthErrors(id);
}

function switchModal(fromId, toId) {
    closeModal(fromId);
    setTimeout(() => openModal(toId), 200);
}

// Close on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('auth-modal-backdrop')) {
        closeModal(e.target.id);
    }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close mobile nav
        const mo = document.getElementById('navMobileOverlay');
        if (mo && mo.classList.contains('open')) {
            document.getElementById('hamburger').classList.remove('open');
            mo.classList.remove('open');
            document.body.style.overflow = '';
        }
        closeModal('loginModal');
        closeModal('signupModal');
        if (document.getElementById('chatWindow').classList.contains('open')) {
            document.getElementById('chatWindow').classList.remove('open');
        }
        if (document.getElementById('cityPage').style.display !== 'none') closeCityPage();
    }
});

function clearAuthErrors(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll('.auth-error,.auth-success').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    modal.querySelectorAll('.auth-input').forEach(el => el.value = '');
}

// ── Password toggle ───────────────────────────
function togglePw(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    if (inp.type === 'password') {
        inp.type = 'text';
        btn.textContent = '🙈';
    } else {
        inp.type = 'password';
        btn.textContent = '👁';
    }
}

// ── Password strength checker ─────────────────
function checkPwStrength(pw) {
    const fill = document.getElementById('pwStrengthFill');
    const label = document.getElementById('pwStrengthLabel');
    if (!fill || !label) return;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const levels = [
        { pct: '0%', color: '#f87171', text: '' },
        { pct: '25%', color: '#f87171', text: 'Weak' },
        { pct: '50%', color: '#fb923c', text: 'Fair' },
        { pct: '75%', color: '#facc15', text: 'Good' },
        { pct: '100%', color: '#4ade80', text: 'Strong ✓' },
    ];
    const lvl = levels[score];
    fill.style.width = lvl.pct;
    fill.style.background = lvl.color;
    label.textContent = lvl.text;
    label.style.color = lvl.color;
}

// ── Form validation helpers ───────────────────
function showAuthError(modalId, errorId, msg) {
    const el = document.getElementById(errorId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

function showAuthSuccess(successId, msg) {
    const el = document.getElementById(successId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) btn.classList.add('loading');
    else btn.classList.remove('loading');
    btn.disabled = loading;
}

// ── Login Handler ─────────────────────────────
function handleLogin() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    document.getElementById('loginError').style.display = 'none';

    if (!email || !password) {
        showAuthError('loginModal', 'loginError', '⚠ Please fill in all fields.');
        return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        showAuthError('loginModal', 'loginError', '⚠ Please enter a valid email address.');
        return;
    }

    setLoading('loginSubmitBtn', true);

    // Simulate API call (localStorage user store)
    setTimeout(() => {
        setLoading('loginSubmitBtn', false);
        const users = JSON.parse(localStorage.getItem('pyti_users') || '[]');
        const user = users.find(u => u.email === email && u.password === btoa(password));
        if (user) {
            currentUser = user;
            localStorage.setItem('pyti_user', JSON.stringify(user));
            closeModal('loginModal');
            refreshNavAuth();
            showToast('🎉 Welcome back, ' + user.first + '! Ready to explore India?');
        } else {
            showAuthError('loginModal', 'loginError', '✕ Invalid email or password. Please try again.');
        }
    }, 1200);
}

// ── Sign Up Handler ───────────────────────────
function handleSignup() {
    const first = document.getElementById('signupFirst')?.value.trim();
    const last = document.getElementById('signupLast')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;

    document.getElementById('signupError').style.display = 'none';
    document.getElementById('signupSuccess').style.display = 'none';

    if (!first || !last || !email || !password) {
        showAuthError('signupModal', 'signupError', '⚠ Please fill in all fields.');
        return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        showAuthError('signupModal', 'signupError', '⚠ Please enter a valid email address.');
        return;
    }
    if (password.length < 8) {
        showAuthError('signupModal', 'signupError', '⚠ Password must be at least 8 characters.');
        return;
    }

    setLoading('signupSubmitBtn', true);

    setTimeout(() => {
        setLoading('signupSubmitBtn', false);
        const users = JSON.parse(localStorage.getItem('pyti_users') || '[]');
        if (users.find(u => u.email === email)) {
            showAuthError('signupModal', 'signupError', '✕ An account with this email already exists.');
            return;
        }
        const newUser = { first, last, email, password: btoa(password), joined: new Date().toISOString() };
        users.push(newUser);
        localStorage.setItem('pyti_users', JSON.stringify(users));
        currentUser = newUser;
        localStorage.setItem('pyti_user', JSON.stringify(newUser));
        showAuthSuccess('signupSuccess', '🎉 Account created! Welcome to Plan Your Trip India!');
        setTimeout(() => {
            closeModal('signupModal');
            refreshNavAuth();
            showToast('🎉 Welcome aboard, ' + first + '! Start planning your dream trip!');
        }, 1600);
    }, 1400);
}

// ── Social Login (Placeholder) ─────────────────
function handleSocialLogin(provider) {
    showToast('🔗 ' + provider + ' login coming soon!');
}

// ── Logout ────────────────────────────────────
function logoutUser() {
    currentUser = null;
    localStorage.removeItem('pyti_user');
    refreshNavAuth();
    showToast('👋 Logged out. Come back soon!');
}