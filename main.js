/* ============================================================
   DONHERS — main.js
   ============================================================ */

/* ===========================
   HERO INTRO SCREEN
   =========================== */
const heroIntro = document.getElementById('hero-intro');
if (heroIntro) {
  heroIntro.addEventListener('animationend', () => {
    heroIntro.remove();
  });
}

/* ===========================
   HERO PARALLAX
   =========================== */
const hero = document.querySelector('.hero');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ===========================
   NAVBAR: show after 80px scroll
   =========================== */
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;

  if (scrollY > 80) {
    navbar.classList.add('visible');
  } else {
    navbar.classList.remove('visible');
  }

  // Parallax solo en desktop con cursor (no táctil), respeta motion preference
  if (hero && !prefersReducedMotion && window.innerWidth > 1024 && window.matchMedia('(hover: hover)').matches) {
    hero.style.backgroundPositionY = `calc(50% + ${scrollY * 0.3}px)`;
  }
}, { passive: true });

/* ===========================
   GALLERY CAROUSEL
   =========================== */
const galleryTrack   = document.getElementById('gallery-track');
const galleryPrev    = document.getElementById('gallery-prev');
const galleryNext    = document.getElementById('gallery-next');
const galleryDotsEl  = document.getElementById('gallery-dots');

function getGalleryCards() {
  return Array.from(galleryTrack.querySelectorAll('.gallery-card:not(.hidden)'));
}

function getCardWidth() {
  const card = getGalleryCards()[0];
  if (!card) return 276;
  return card.offsetWidth + 16; // card + gap
}

function buildDots() {
  if (!galleryDotsEl) return;
  const cards = getGalleryCards();
  galleryDotsEl.innerHTML = '';
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Modelo ${i + 1}`);
    dot.addEventListener('click', () => scrollToCard(i));
    galleryDotsEl.appendChild(dot);
  });
}

function updateDots() {
  if (!galleryDotsEl || !galleryTrack) return;
  const cards = getGalleryCards();
  const scrollLeft = galleryTrack.scrollLeft;
  const cw = getCardWidth();
  const activeIndex = Math.round(scrollLeft / cw);
  galleryDotsEl.querySelectorAll('.gallery-dot').forEach((d, i) => {
    d.classList.toggle('active', i === activeIndex);
  });
  if (galleryPrev) galleryPrev.disabled = activeIndex === 0;
  if (galleryNext) galleryNext.disabled = activeIndex >= cards.length - 1;
}

function scrollToCard(index) {
  if (!galleryTrack) return;
  const cw = getCardWidth();
  galleryTrack.scrollTo({ left: index * cw, behavior: 'smooth' });
}

if (galleryPrev) galleryPrev.addEventListener('click', () => {
  const cw = getCardWidth();
  const current = Math.round(galleryTrack.scrollLeft / cw);
  scrollToCard(Math.max(0, current - 1));
});

if (galleryNext) galleryNext.addEventListener('click', () => {
  const cw = getCardWidth();
  const current = Math.round(galleryTrack.scrollLeft / cw);
  scrollToCard(current + 1);
});

/* Auto-scroll: avanza cada 3.5s, pausa al hover o toque */
let autoScrollTimer = null;
let userInteracting = false;

function startAutoScroll() {
  clearInterval(autoScrollTimer);
  autoScrollTimer = setInterval(() => {
    if (userInteracting || !galleryTrack) return;
    const cards = getGalleryCards();
    const cw = getCardWidth();
    const current = Math.round(galleryTrack.scrollLeft / cw);
    const next = current >= cards.length - 1 ? 0 : current + 1;
    galleryTrack.scrollTo({ left: next * cw, behavior: 'smooth' });
  }, 3500);
}

function pauseAutoScroll() {
  userInteracting = true;
  clearTimeout(autoScrollTimer);
  // Retoma después de 6s sin interacción
  setTimeout(() => { userInteracting = false; startAutoScroll(); }, 6000);
}

if (galleryTrack) {
  galleryTrack.addEventListener('scroll', updateDots, { passive: true });
  galleryTrack.addEventListener('pointerdown', pauseAutoScroll);
  galleryTrack.addEventListener('touchstart', pauseAutoScroll, { passive: true });
  buildDots();
  updateDots();
  startAutoScroll();
}

if (galleryPrev) galleryPrev.addEventListener('click', pauseAutoScroll);
if (galleryNext) galleryNext.addEventListener('click', pauseAutoScroll);

/* ===========================
   COLLECTION FILTER
   =========================== */
const filterBtns = document.querySelectorAll('.filter-btn');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;

    document.querySelectorAll('.gallery-card').forEach(card => {
      const matches = filter === 'all' || card.dataset.collection === filter;
      card.classList.toggle('hidden', !matches);
    });

    // Reset scroll y reconstruir dots
    if (galleryTrack) galleryTrack.scrollTo({ left: 0, behavior: 'instant' });
    buildDots();
    updateDots();
  });
});

/* ===========================
   ENTRANCE ANIMATION — IntersectionObserver
   =========================== */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -32px 0px'
});

document.querySelectorAll('[data-animate]').forEach(el => {
  observer.observe(el);
});

/* ===========================
   SMOOTH SCROLL for internal links
   (also handled by CSS scroll-behavior: smooth, but this
    ensures compatibility and handles navbar offset)
   =========================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ============================================================
   E-COMMERCE SYSTEM
   ============================================================ */

/* ===========================
   SHIPPING ZONES & OPTIONS
   =========================== */
const ZONE_A = ['Montevideo'];
const ZONE_B = ['Canelones', 'San José'];
// Todo lo demás → Zona C (interior)

const SHIP_ICONS = {
  bike:    `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 0 0 0-2h-1l-5 8H4"/><path d="m6 17 3.5-7 2 4h5l-2-6"/></svg>`,
  package: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  mail:    `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  store:   `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
};

const SHIPPING_OPTIONS = {
  A: {
    tag:  '📍 Montevideo — envío en tu ciudad',
    hint: 'Elegí cómo recibir tu reloj:',
    list: [
      { id: 'domicilio', icon: 'bike',    name: 'Envío a domicilio',  desc: '24–48 hs hábiles · Ciudad de Montevideo', price: 'A coordinar' },
      { id: 'oca',       icon: 'package', name: 'OCA',                desc: '1–2 días hábiles · Sucursal o domicilio',  price: 'A coordinar' },
      { id: 'correo',    icon: 'mail',    name: 'Correo Uruguayo',    desc: '2–3 días hábiles',                         price: 'A coordinar' },
    ]
  },
  B: {
    tag:  '🗺️ Área metropolitana — 2 a 4 días',
    hint: 'Elegí tu agencia de envío:',
    list: [
      { id: 'oca',       icon: 'package', name: 'OCA',             desc: '2–4 días hábiles · Sucursal o domicilio', price: 'A coordinar' },
      { id: 'correo',    icon: 'mail',    name: 'Correo Uruguayo', desc: '3–5 días hábiles',                        price: 'A coordinar' },
      { id: 'domicilio', icon: 'bike',    name: 'Envío a domicilio', desc: 'Disponibilidad a confirmar por WhatsApp', price: 'Consultar' },
    ]
  },
  C: {
    tag:  '📦 Interior del país — envío por agencia',
    hint: 'Seleccioná la agencia más conveniente:',
    list: [
      { id: 'oca',    icon: 'package', name: 'OCA',             desc: '3–5 días hábiles · Retiro en sucursal más cercana', price: 'A coordinar' },
      { id: 'correo', icon: 'mail',    name: 'Correo Uruguayo', desc: '4–7 días hábiles',                                  price: 'A coordinar' },
      { id: 'abitab', icon: 'store',   name: 'Abitab',          desc: 'Retiro en sucursal · Coordinar con Donher\'s',      price: 'A coordinar' },
    ]
  }
};

function getZone(dept) {
  if (ZONE_A.includes(dept)) return 'A';
  if (ZONE_B.includes(dept)) return 'B';
  return dept ? 'C' : null;
}

function getShippingLabel(id) {
  const names = { domicilio: 'Envío a domicilio', oca: 'OCA', correo: 'Correo Uruguayo', abitab: 'Abitab' };
  return names[id] || id;
}

function renderShippingOptions(dept) {
  const container = document.getElementById('shipping-method-container');
  if (!container) return;

  const zone = getZone(dept);
  if (!zone) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const { tag, hint, list } = SHIPPING_OPTIONS[zone];
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="shipping-zone-tag">
      ${tag}
    </div>
    <p class="shipping-options-hint">${hint}</p>
    <div class="shipping-options-list" role="radiogroup">
      ${list.map(opt => `
        <div class="shipping-option" data-ship-id="${opt.id}" data-ship-name="${opt.name}"
             role="radio" aria-checked="false" tabindex="0">
          <div class="so-radio"><div class="so-radio-dot"></div></div>
          <div class="so-icon">${SHIP_ICONS[opt.icon]}</div>
          <div class="so-info">
            <strong class="so-name">${opt.name}</strong>
            <span class="so-desc">${opt.desc}</span>
          </div>
          <span class="so-price">${opt.price}</span>
        </div>`).join('')}
    </div>`;

  container.querySelectorAll('.shipping-option').forEach(opt => {
    opt.addEventListener('click',   () => selectShippingOption(opt));
    opt.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectShippingOption(opt); }
    });
  });

  // Si hay solo una zona y ya estaba seleccionado algo del mismo tipo, re-seleccionar
  const prev = Checkout._shippingData && Checkout._shippingData.shippingMethodId;
  if (prev) {
    const match = container.querySelector(`[data-ship-id="${prev}"]`);
    if (match) selectShippingOption(match);
  }
}

function selectShippingOption(el) {
  const container = document.getElementById('shipping-method-container');
  container.querySelectorAll('.shipping-option').forEach(o => {
    o.classList.remove('selected');
    o.setAttribute('aria-checked', 'false');
  });
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  const errEl = document.getElementById('shipping-error-global');
  if (errEl) errEl.classList.add('hidden');
}

function getSelectedShipping() {
  const sel = document.querySelector('.shipping-option.selected');
  if (!sel) return null;
  return { id: sel.dataset.shipId, name: sel.dataset.shipName };
}

/* ===========================
   UTILS
   =========================== */
function formatPrice(num) {
  return '$' + num.toLocaleString('es-UY');
}

function parsePrice(str) {
  // "$900 — $1.200" → toma el primer número; "$2.490" → 2490
  const clean = str.replace(/[$.]/g, '').split('—')[0].trim();
  return parseInt(clean, 10);
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function genOrderId() {
  return 'DH-' + Date.now().toString(36).toUpperCase() + '-' +
    Math.random().toString(36).substring(2, 5).toUpperCase();
}

/* ===========================
   TOAST
   =========================== */
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast toast--' + type;

  const icon = type === 'success'
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
  });

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3200);
}

/* ===========================
   AUTH
   =========================== */
const Auth = {
  _key: 'dh_user',

  get() {
    try { return JSON.parse(localStorage.getItem(this._key)); }
    catch { return null; }
  },

  isLoggedIn() { return !!this.get(); },

  login(email, password) {
    if (!email || !password) return false;
    const name = email.split('@')[0].replace(/[._]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    const user = { email, name, createdAt: Date.now() };
    localStorage.setItem(this._key, JSON.stringify(user));
    this._updateUI();
    return true;
  },

  register(name, email, password) {
    if (!name || !email || password.length < 6) return false;
    const user = { email, name, createdAt: Date.now() };
    localStorage.setItem(this._key, JSON.stringify(user));
    this._updateUI();
    sendToSheet('registro', { nombre: name, email, fecha: new Date().toISOString() });
    return true;
  },

  logout() {
    localStorage.removeItem(this._key);
    this._updateUI();
  },

  _updateUI() {
    const user = this.get();
    const loggedOut = document.getElementById('ud-logged-out');
    const loggedIn  = document.getElementById('ud-logged-in');
    const nameNav   = document.getElementById('user-name-nav');
    const udName    = document.getElementById('ud-name');

    if (user) {
      loggedOut.classList.add('hidden');
      loggedIn.classList.remove('hidden');
      const firstName = user.name.split(' ')[0];
      if (udName) udName.textContent = firstName;
      if (nameNav) nameNav.textContent = firstName;
    } else {
      loggedOut.classList.remove('hidden');
      loggedIn.classList.add('hidden');
      if (nameNav) nameNav.textContent = '';
    }
  }
};

/* ===========================
   ORDERS
   =========================== */
const Orders = {
  _key: 'dh_orders',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this._key)) || []; }
    catch { return []; }
  },

  save(order) {
    const all = this.getAll();
    all.unshift(order);
    localStorage.setItem(this._key, JSON.stringify(all));
  },

  render() {
    const list = document.getElementById('orders-list');
    const orders = this.getAll();
    if (!orders.length) {
      list.innerHTML = '<p class="orders-empty">Todavía no tenés pedidos.</p>';
      return;
    }
    const trackSteps = ['Confirmado', 'En preparación', 'Enviado', 'Entregado'];

    list.innerHTML = orders.map(o => {
      const date = new Date(o.date).toLocaleDateString('es-UY', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      const itemsSummary = o.items.map(i => `${i.name} × ${i.qty}`).join(', ');
      const isPendingPay = (o.status || '') === 'pendiente_pago';
      // Pedido pendiente de verificación de pago: el track aún no arrancó
      const statusIndex  = isPendingPay ? -1 : trackSteps.findIndex(s => s.toLowerCase() === (o.status || 'confirmado'));
      const payBadge = isPendingPay
        ? '<span class="order-pay-badge order-pay-badge--pending">⏳ Pago a verificar</span>'
        : '';

      const trackHtml = trackSteps.map((s, i) => {
        const done = i <= statusIndex;
        return `
          <div class="order-track-step ${done ? 'order-track-step--done' : ''}">
            <div class="order-track-dot"></div>
            <span class="order-track-label">${s}</span>
          </div>
          ${i < trackSteps.length - 1 ? '<div class="order-track-line"></div>' : ''}`;
      }).join('');

      const methodLabel = o.paymentMethod === 'transfer'
        ? '🏦 Transferencia bancaria'
        : '💳 Mercado Pago';

      // Datos de envío y zona
      let shipInfo = '';
      if (o.shipping) {
        const s = o.shipping;
        const addr = [s.address, s.apt].filter(Boolean).join(', ');
        const loc  = [s.city, s.dept, s.zip].filter(Boolean).join(' · ');
        const zoneLabels = { A: 'Montevideo', B: 'Área metropolitana', C: 'Interior del país' };
        const zoneText   = s.zone ? ` (${zoneLabels[s.zone] || s.zone})` : '';
        const shipMethod = s.shippingMethodName ? `📦 ${s.shippingMethodName}${zoneText}` : '';
        shipInfo = `
          <p class="order-ship-addr">${addr}</p>
          <p class="order-ship-loc">${loc}</p>
          ${shipMethod ? `<p class="order-ship-method">${shipMethod}</p>` : ''}`;
      }

      return `
        <div class="order-card">
          <div class="order-card-header">
            <span class="order-id">${o.id}</span>
            <span class="order-date">${date}</span>
          </div>
          ${payBadge}
          <p class="order-items-text">${itemsSummary}</p>
          ${shipInfo}
          <div class="order-track">${trackHtml}</div>
          <div class="order-card-footer-row">
            <p class="order-card-total">Total: <strong>${formatPrice(o.total)}</strong></p>
            <p class="order-method">${methodLabel}</p>
          </div>
        </div>`;
    }).join('');
  }
};

/* ===========================
   CART
   =========================== */
const Cart = {
  _key: 'dh_cart',
  items: [],

  init() {
    try {
      this.items = JSON.parse(localStorage.getItem(this._key)) || [];
    } catch {
      this.items = [];
    }
    this._render();
  },

  _save() {
    localStorage.setItem(this._key, JSON.stringify(this.items));
  },

  add(id, name, price, waLink, imgSrc = '') {
    const existing = this.items.find(i => i.id === id);
    if (existing) {
      existing.qty++;
    } else {
      this.items.push({ id, name, price, waLink, imgSrc, qty: 1 });
    }
    this._save();
    this._render();
    showToast(`${name} agregado al carrito`);
  },

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this._save();
    this._render();
  },

  updateQty(id, delta) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    this._save();
    this._render();
  },

  clear() {
    this.items = [];
    this._save();
    this._render();
  },

  total() {
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  count() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  _render() {
    const badge     = document.getElementById('cart-badge');
    const empty     = document.getElementById('cart-empty');
    const list      = document.getElementById('cart-items-list');
    const footer    = document.getElementById('cart-footer');
    const subtotal  = document.getElementById('cart-subtotal');

    const n = this.count();
    if (badge) {
      badge.textContent = n || '';
      badge.style.display = n ? 'flex' : 'none';
    }

    if (!this.items.length) {
      empty.classList.remove('hidden');
      list.classList.add('hidden');
      footer.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');
    footer.classList.remove('hidden');

    list.innerHTML = this.items.map(item => `
      <li class="cart-item" data-id="${item.id}">
        <div class="cart-item-img">${item.imgSrc ? `<img src="${item.imgSrc}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;border-radius:2px;">` : '<span class="cart-item-dh">DH</span>'}</div>
        <div class="cart-item-info">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-price">${formatPrice(item.price)}</span>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" data-action="dec" data-id="${item.id}" aria-label="Reducir">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" data-action="inc" data-id="${item.id}" aria-label="Aumentar">+</button>
        </div>
        <button class="cart-item-remove" data-id="${item.id}" aria-label="Eliminar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </li>`).join('');

    if (subtotal) subtotal.textContent = formatPrice(this.total());
  }
};

/* ===========================
   CHECKOUT
   =========================== */
const Checkout = {
  _shippingData: null,
  _orderId: null,
  _paymentMethod: 'card', // 'card' | 'transfer'

  goToStep(n) {
    document.querySelectorAll('.checkout-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-' + n).classList.add('active');
    document.querySelectorAll('.cp-step').forEach(s => {
      const sn = parseInt(s.dataset.step);
      s.classList.toggle('active', sn === n);
      s.classList.toggle('done', sn < n);
    });
    // Al llegar al paso 2: generar orden ID y poner referencia bancaria
    if (n === 2) {
      if (!this._orderId) this._orderId = genOrderId();
      const bankRef = document.getElementById('bank-ref-val');
      if (bankRef) bankRef.textContent = this._orderId;
      const mpRef = document.getElementById('mp-ref-val');
      if (mpRef) mpRef.textContent = this._orderId;
      // Actualizar ambos totales
      const t1 = document.getElementById('checkout-total-val');
      const t2 = document.getElementById('checkout-total-val-t');
      const total = formatPrice(Cart.total());
      if (t1) t1.textContent = total;
      if (t2) t2.textContent = total;
    }
  },

  renderSummary() {
    const el = document.getElementById('checkout-summary');
    if (!el) return;

    const shipLine = this._shippingData
      ? `<div class="co-item-row"><span>Envío · ${this._shippingData.shippingMethodName || 'A coordinar'}</span><span style="color:var(--text-muted)">A coordinar</span></div>`
      : '';

    el.innerHTML = Cart.items.map(i => `
      <div class="co-item-row">
        <span>${i.name} × ${i.qty}</span>
        <span>${formatPrice(i.price * i.qty)}</span>
      </div>`).join('') +
      shipLine +
      `<div class="co-total-row">
        <strong>Total productos</strong><strong>${formatPrice(Cart.total())}</strong>
       </div>`;
  },

  open() {
    if (!Cart.items.length) {
      showToast('Tu carrito está vacío', 'error');
      return;
    }
    if (!Auth.isLoggedIn()) {
      openModal('login-overlay');
      showToast('Ingresá para continuar con tu compra', 'error');
      return;
    }
    // Reset para nueva sesión de checkout
    this._orderId = null;
    this._paymentMethod = 'card';
    this.goToStep(1);
    this.renderSummary();

    // Pre-fill datos de envío con datos del usuario
    const user = Auth.get();
    if (user) {
      const shipEmail = document.getElementById('ship-email');
      const shipName  = document.getElementById('ship-name');
      if (shipEmail && !shipEmail.value) shipEmail.value = user.email;
      if (shipName  && !shipName.value)  shipName.value  = user.name;
    }

    closeCart();
    openModal('checkout-overlay');
  },

  _confirmOrder(paymentMethod) {
    const user  = Auth.get();
    const email = user ? user.email : (this._shippingData && this._shippingData.email) || '';
    const order = {
      id:            this._orderId,
      date:          Date.now(),
      items:         Cart.items.map(i => ({ ...i })),
      total:         Cart.total(),
      shipping:      this._shippingData,
      email,
      paymentMethod, // 'mercadopago' | 'transfer'
      status:        'pendiente_pago'
    };

    Orders.save(order);

    // Guardar el pedido en Supabase (si está disponible).
    // El localStorage (Orders) ya quedó como respaldo: la compra nunca se pierde.
    if (window.DB && DB.ok) {
      DB.crearPedido({
        id:             order.id,
        cliente_email:  order.email,
        cliente_nombre: (user && user.name) || (order.shipping && order.shipping.name) || null,
        total:          order.total,
        estado:         'pendiente_pago',
        metodo_pago:    paymentMethod === 'transfer' ? 'transferencia' : 'mercadopago',
        datos_envio:    order.shipping || null,
        items:          order.items,
      });
      DB.track('checkout', { meta: { id: order.id, total: order.total, metodo: paymentMethod } });
    }

    sendToSheet('pedido', {
      id: order.id,
      items: order.items.map(i => `${i.name} x${i.qty}`).join(' | '),
      total: order.total,
      email: order.email,
      metodo_pago: paymentMethod,
      envio: order.shipping ? order.shipping.shippingMethodName : '',
      direccion: order.shipping ? `${order.shipping.address}, ${order.shipping.city}, ${order.shipping.dept}` : ''
    });

    const numEl   = document.getElementById('order-num-display');
    const emailEl = document.getElementById('order-email-display');
    if (numEl)   numEl.textContent   = this._orderId;
    if (emailEl) emailEl.textContent = email;

    // Mensaje honesto: el pedido queda registrado, el pago se verifica aparte
    const successTitle = document.querySelector('.success-title');
    const successMsg   = document.querySelector('.success-message');
    if (successTitle) successTitle.textContent = '¡Pedido registrado!';
    if (successMsg) {
      const metodo = paymentMethod === 'transfer' ? 'tu transferencia' : 'tu pago en Mercado Pago';
      successMsg.innerHTML = `Confirmamos el envío en cuanto verifiquemos ${metodo}. Envianos el comprobante por WhatsApp para agilizar el despacho.`;
    }

    Cart.clear();
    this.goToStep(3);
  },

  confirmMercadoPago() {
    const btn = document.getElementById('btn-mp-confirm');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'CONFIRMANDO...';
    setTimeout(() => {
      this._confirmOrder('mercadopago');
      btn.disabled = false;
      btn.textContent = 'Ya realicé el pago — confirmar pedido';
    }, 600);
  },

  processBankTransfer() {
    const btn = document.getElementById('btn-bank-pay');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'CONFIRMANDO...';
    setTimeout(() => {
      this._confirmOrder('transfer');
      btn.disabled = false;
      btn.textContent = 'CONFIRMAR PEDIDO';
    }, 800);
  }
};

/* ===========================
   MODAL HELPERS
   =========================== */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active');
  // Solo restaurar scroll si no hay otro modal activo
  const anyOpen = document.querySelector('.modal-overlay.active, .cart-sidebar.open');
  if (!anyOpen) document.body.style.overflow = '';
}

function openCart() {
  const sidebar  = document.getElementById('cart-sidebar');
  const backdrop = document.getElementById('cart-backdrop');
  const waFloat  = document.querySelector('.wa-float');
  sidebar.classList.add('open');
  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (waFloat) waFloat.style.display = 'none';
}

function closeCart() {
  const sidebar  = document.getElementById('cart-sidebar');
  const backdrop = document.getElementById('cart-backdrop');
  const waFloat  = document.querySelector('.wa-float');
  sidebar.classList.remove('open');
  backdrop.classList.remove('active');
  if (waFloat) waFloat.style.display = '';
  const anyOpen = document.querySelector('.modal-overlay.active');
  if (!anyOpen) document.body.style.overflow = '';
}

/* ===========================
   WEBHOOK — Google Sheets via n8n
   Enviá datos de registro y pedidos a un webhook externo
   =========================== */
const WEBHOOK_URL = ''; // Pegar acá la URL del webhook de n8n cuando esté configurado

async function sendToSheet(type, data) {
  if (!WEBHOOK_URL) return; // No hacer nada si no hay webhook configurado
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...data, timestamp: new Date().toISOString() })
    });
  } catch (e) {
    console.warn('Webhook no disponible:', e.message);
  }
}

/* ===========================
   EXPORT — descarga datos como CSV
   =========================== */
function exportToCSV() {
  const orders = Orders.getAll();
  if (!orders.length) {
    showToast('No hay pedidos para exportar', 'error');
    return;
  }

  const rows = [
    ['ID Pedido', 'Fecha', 'Cliente', 'Email', 'Teléfono', 'Productos', 'Total', 'Método de pago', 'Envío', 'Dirección', 'Ciudad', 'Departamento', 'Estado']
  ];

  orders.forEach(o => {
    const fecha    = new Date(o.date).toLocaleDateString('es-UY');
    const productos = o.items.map(i => `${i.name} x${i.qty}`).join(' | ');
    const s        = o.shipping || {};
    rows.push([
      o.id, fecha,
      s.name || '', s.email || '', s.phone || '',
      productos, o.total,
      o.paymentMethod === 'transfer' ? 'Transferencia' : 'Tarjeta/MP',
      s.shippingMethodName || '',
      [s.address, s.apt].filter(Boolean).join(', '),
      s.city || '', s.dept || '', o.status || 'confirmado'
    ]);
  });

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `donhers-pedidos-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Archivo descargado ✓');
}

/* ===========================
   CARD TRANSFORMATION
   — reemplaza .card-btn por dos botones:
     [Agregar al carrito] [icono WA]
   =========================== */
function transformCards() {
  document.querySelectorAll('.product-card').forEach(card => {
    const nameEl  = card.querySelector('.card-name');
    const priceEl = card.querySelector('.card-price');
    const waLink  = card.querySelector('.card-btn');
    if (!nameEl || !priceEl || !waLink) return;

    const name   = nameEl.textContent.trim();
    const price  = parsePrice(priceEl.textContent);
    const id     = slugify(name);
    const href   = waLink.href;
    const imgEl  = card.querySelector('.card-image img');
    const imgSrc = imgEl ? imgEl.src : '';

    // Crear estructura de acciones
    // Marcar la card con su id de producto para poder linkearla
    card.dataset.productId = id;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const cartBtn = document.createElement('button');
    cartBtn.className = 'card-btn-cart btn-shimmer';
    cartBtn.setAttribute('aria-label', `Agregar ${name} al carrito`);
    cartBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> AGREGAR`;
    cartBtn.addEventListener('click', () => Cart.add(id, name, price, href, imgSrc));

    const waBtn = document.createElement('a');
    waBtn.href   = href;
    waBtn.target = '_blank';
    waBtn.rel    = 'noopener noreferrer';
    waBtn.className = 'card-btn-wa';
    waBtn.setAttribute('aria-label', `Consultar ${name} por WhatsApp`);
    waBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

    const shareBtn = document.createElement('button');
    shareBtn.className = 'card-share-btn';
    shareBtn.setAttribute('aria-label', `Compartir ${name}`);
    shareBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = `${window.location.origin}${window.location.pathname}?producto=${id}`;
      if (navigator.share) {
        navigator.share({ title: `Donher's — ${name}`, text: `Mirá este reloj: ${name}`, url })
          .catch(() => {}); // ignorar si el usuario cancela
      } else {
        navigator.clipboard.writeText(url)
          .then(() => showToast('Link copiado al portapapeles'))
          .catch(() => showToast('No se pudo copiar el link', 'error'));
      }
    });

    actions.appendChild(cartBtn);
    actions.appendChild(waBtn);
    actions.appendChild(shareBtn);
    waLink.replaceWith(actions);
  });
}

/* ===========================
   EVENT LISTENERS
   =========================== */
document.addEventListener('DOMContentLoaded', () => {

  // Inicializar
  Cart.init();
  Auth._updateUI();
  transformCards();

  /* -- Carrito -- */
  const cartToggle   = document.getElementById('cart-toggle');
  const cartClose    = document.getElementById('cart-close');
  const cartBackdrop = document.getElementById('cart-backdrop');
  const cartEmptyCta = document.getElementById('cart-empty-cta');

  if (cartToggle)   cartToggle.addEventListener('click', openCart);
  if (cartClose)    cartClose.addEventListener('click', closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);
  if (cartEmptyCta) cartEmptyCta.addEventListener('click', () => {
    closeCart();
    document.getElementById('colecciones').scrollIntoView({ behavior: 'smooth' });
  });

  // Qty + remove (delegación en la lista)
  const cartList = document.getElementById('cart-items-list');
  if (cartList) {
    cartList.addEventListener('click', e => {
      const qtyBtn    = e.target.closest('.qty-btn');
      const removeBtn = e.target.closest('.cart-item-remove');
      if (qtyBtn) {
        const id     = qtyBtn.dataset.id;
        const action = qtyBtn.dataset.action;
        Cart.updateQty(id, action === 'inc' ? 1 : -1);
      }
      if (removeBtn) {
        Cart.remove(removeBtn.dataset.id);
      }
    });
  }

  // Checkout CTA desde carrito
  const checkoutBtn = document.getElementById('cart-checkout-btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', () => Checkout.open());

  /* -- User dropdown -- */
  const userToggle   = document.getElementById('user-toggle');
  const userDropdown = document.getElementById('user-dropdown');

  if (userToggle) {
    userToggle.addEventListener('click', e => {
      e.stopPropagation();
      userDropdown.classList.toggle('active');
    });
  }
  document.addEventListener('click', e => {
    if (userDropdown && !userDropdown.contains(e.target) && e.target !== userToggle) {
      userDropdown.classList.remove('active');
    }
  });

  /* -- Login / Register -- */
  const openLoginBtn = document.getElementById('open-login-btn');
  const loginClose   = document.getElementById('login-close');
  const loginOverlay = document.getElementById('login-overlay');

  if (openLoginBtn) openLoginBtn.addEventListener('click', () => {
    userDropdown.classList.remove('active');
    openModal('login-overlay');
  });
  if (loginClose) loginClose.addEventListener('click', () => closeModal('login-overlay'));
  if (loginOverlay) loginOverlay.addEventListener('click', e => {
    if (e.target === loginOverlay) closeModal('login-overlay');
  });

  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + '-form').classList.add('active');
    });
  });

  // Login form submit
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const err      = document.getElementById('login-error');
      if (!email || !password) {
        err.classList.remove('hidden'); return;
      }
      err.classList.add('hidden');
      Auth.login(email, password);
      closeModal('login-overlay');
      userDropdown.classList.remove('active');
      showToast(`Bienvenido/a, ${Auth.get().name.split(' ')[0]}!`);
    });
  }

  // Register form submit
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', e => {
      e.preventDefault();
      const name     = document.getElementById('reg-name').value.trim();
      const email    = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const err      = document.getElementById('reg-error');
      if (!name || !email || password.length < 6) {
        err.classList.remove('hidden'); return;
      }
      err.classList.add('hidden');
      Auth.register(name, email, password);
      closeModal('login-overlay');
      showToast(`Cuenta creada. Bienvenido/a, ${name.split(' ')[0]}!`);
    });
  }

  /* -- Logout -- */
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout();
      userDropdown.classList.remove('active');
      showToast('Sesión cerrada');
    });
  }

  /* -- Mis pedidos -- */
  const viewOrdersBtn = document.getElementById('view-orders-btn');
  const ordersClose   = document.getElementById('orders-close');
  const ordersOverlay = document.getElementById('orders-overlay');

  if (viewOrdersBtn) {
    viewOrdersBtn.addEventListener('click', () => {
      userDropdown.classList.remove('active');
      Orders.render();
      openModal('orders-overlay');
    });
  }
  if (ordersClose)   ordersClose.addEventListener('click', () => closeModal('orders-overlay'));
  if (ordersOverlay) ordersOverlay.addEventListener('click', e => {
    if (e.target === ordersOverlay) closeModal('orders-overlay');
  });
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) exportBtn.addEventListener('click', exportToCSV);

  /* -- Checkout -- */
  const checkoutClose   = document.getElementById('checkout-close');
  const checkoutOverlay = document.getElementById('checkout-overlay');
  const shippingForm    = document.getElementById('shipping-form');
  const backToStep1Btn  = document.getElementById('back-to-step1');

  if (checkoutClose) checkoutClose.addEventListener('click', () => closeModal('checkout-overlay'));
  if (checkoutOverlay) checkoutOverlay.addEventListener('click', e => {
    if (e.target === checkoutOverlay) closeModal('checkout-overlay');
  });

  // Listener: departamento → actualizar opciones de envío
  const shipDeptEl = document.getElementById('ship-dept');
  if (shipDeptEl) {
    // Renderizar al cargar si ya hay un valor (ej: viene pre-seleccionado Montevideo)
    if (shipDeptEl.value) renderShippingOptions(shipDeptEl.value);
    shipDeptEl.addEventListener('change', () => renderShippingOptions(shipDeptEl.value));
  }

  // Step 1 → 2
  if (shippingForm) {
    shippingForm.addEventListener('submit', e => {
      e.preventDefault();

      // Validar que se eligió método de envío
      const selectedShip = getSelectedShipping();
      if (!selectedShip) {
        const errEl = document.getElementById('shipping-error-global');
        if (errEl) errEl.classList.remove('hidden');
        document.getElementById('shipping-method-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      const dept = document.getElementById('ship-dept').value;
      Checkout._shippingData = {
        name:             document.getElementById('ship-name').value,
        phone:            document.getElementById('ship-phone').value,
        email:            document.getElementById('ship-email').value,
        address:          document.getElementById('ship-address').value,
        apt:              (document.getElementById('ship-apt')  || {}).value  || '',
        zip:              (document.getElementById('ship-zip')  || {}).value  || '',
        dept,
        city:             document.getElementById('ship-city').value,
        notes:            (document.getElementById('ship-notes') || {}).value || '',
        zone:             getZone(dept),
        shippingMethodId: selectedShip.id,
        shippingMethodName: selectedShip.name,
      };
      Checkout.goToStep(2);
    });
  }

  // Tabs método de pago
  document.querySelectorAll('.pm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pm-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const method = tab.dataset.method;
      Checkout._paymentMethod = method;
      const cardPanel     = document.getElementById('pm-card-panel');
      const transferPanel = document.getElementById('pm-transfer-panel');
      if (cardPanel)     cardPanel.classList.toggle('hidden', method !== 'card');
      if (transferPanel) transferPanel.classList.toggle('hidden', method !== 'transfer');
    });
  });

  // Step 2 → back
  if (backToStep1Btn) backToStep1Btn.addEventListener('click', () => Checkout.goToStep(1));

  // Step 2 → confirmar pago con Mercado Pago
  const mpConfirmBtn = document.getElementById('btn-mp-confirm');
  if (mpConfirmBtn) {
    mpConfirmBtn.addEventListener('click', () => Checkout.confirmMercadoPago());
  }

  // Step 2 → confirmar transferencia bancaria
  const bankPayBtn = document.getElementById('btn-bank-pay');
  if (bankPayBtn) {
    bankPayBtn.addEventListener('click', () => Checkout.processBankTransfer());
  }

  // Step 3 botones post-confirmación
  const btnViewOrders = document.getElementById('btn-view-my-orders');
  const btnKeepShop   = document.getElementById('btn-keep-shopping');

  if (btnViewOrders) {
    btnViewOrders.addEventListener('click', () => {
      closeModal('checkout-overlay');
      Orders.render();
      openModal('orders-overlay');
    });
  }
  if (btnKeepShop) {
    btnKeepShop.addEventListener('click', () => {
      closeModal('checkout-overlay');
      document.getElementById('colecciones').scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* -- Escape key cierra modales -- */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['login-overlay', 'checkout-overlay', 'orders-overlay'].forEach(id => closeModal(id));
    closeCart();
    const ud = document.getElementById('user-dropdown');
    if (ud) ud.classList.remove('active');
  });

  /* -- Highlight producto si viene por link compartido -- */
  const urlParams   = new URLSearchParams(window.location.search);
  const productoId  = urlParams.get('producto');
  if (productoId) {
    const targetCard = document.querySelector(`[data-product-id="${productoId}"]`);
    if (targetCard) {
      setTimeout(() => {
        document.getElementById('colecciones').scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          targetCard.classList.add('card-highlight');
          setTimeout(() => targetCard.classList.remove('card-highlight'), 3200);
        }, 600);
      }, 400);
    }
  }

});

/* ============================================================
   GALERÍA DINÁMICA + CARRITO (Supabase)
   Reemplaza las cards estáticas por las de la base. Si Supabase
   no responde, quedan las estáticas como fallback.
   ============================================================ */
function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function renderGalleryFromDB(productos) {
  if (!galleryTrack || !productos || !productos.length) return;
  galleryTrack.innerHTML = productos.map((p) => {
    const cat = (p.categoria || '').toLowerCase();
    const tag = cat === 'damas' ? 'Damas' : 'Caballeros';
    const wa = p.wa_link || '#';
    return '' +
      '<article class="gallery-card" data-collection="' + cat + '" data-product-id="' + escapeAttr(p.id) + '">' +
        '<div class="gallery-card-img"><img src="' + escapeAttr(p.img_url) + '" alt="' + escapeAttr(p.nombre) + '" loading="lazy"></div>' +
        '<div class="gallery-card-info">' +
          '<span class="gallery-card-tag">' + tag + '</span>' +
          '<h3 class="gallery-card-name">' + escapeAttr(p.nombre) + '</h3>' +
          '<p class="gallery-card-price">' + formatPrice(p.precio) + '</p>' +
          '<button class="gallery-card-cta btn-shimmer add-cart-btn" type="button" ' +
            'data-id="' + escapeAttr(p.id) + '" data-name="' + escapeAttr(p.nombre) + '" ' +
            'data-price="' + p.precio + '" data-wa="' + escapeAttr(wa) + '" data-img="' + escapeAttr(p.img_url) + '">' +
            'AGREGAR AL CARRITO</button>' +
          '<a href="' + escapeAttr(wa) + '" class="gallery-card-consultar consultar-link" target="_blank" rel="noopener noreferrer" data-id="' + escapeAttr(p.id) + '">Consultar por WhatsApp</a>' +
        '</div>' +
      '</article>';
  }).join('');

  // Re-aplicar el filtro activo (Todos / Caballeros / Damas)
  const activeBtn = document.querySelector('.filter-btn.active');
  const activeFilter = activeBtn ? activeBtn.dataset.filter : 'all';
  galleryTrack.querySelectorAll('.gallery-card').forEach((card) => {
    const matches = activeFilter === 'all' || card.dataset.collection === activeFilter;
    card.classList.toggle('hidden', !matches);
  });

  buildDots();
  updateDots();
}

// Delegación de clicks: agregar al carrito + medir "consultar"
if (galleryTrack) {
  galleryTrack.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-cart-btn');
    if (addBtn) {
      Cart.add(addBtn.dataset.id, addBtn.dataset.name, parseInt(addBtn.dataset.price, 10) || 0, addBtn.dataset.wa, addBtn.dataset.img);
      if (window.DB && DB.track) DB.track('add_carrito', { producto_id: addBtn.dataset.id });
      return;
    }
    const cons = e.target.closest('.consultar-link');
    if (cons && window.DB && DB.track) DB.track('click_whatsapp', { producto_id: cons.dataset.id });
  });
}

// Cargar productos reales desde Supabase
if (window.DB && DB.ok) {
  DB.track('visita');
  DB.getProductos()
    .then((prods) => { if (prods && prods.length) renderGalleryFromDB(prods); })
    .catch((err) => console.warn('[galería] usando fallback estático:', err));
}
