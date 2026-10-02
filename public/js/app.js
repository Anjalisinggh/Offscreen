// Offscreen: wallpaper gallery SPA (vanilla JS, hash router)

const state = {
  user: null,
  categories: [],
  likedIds: new Set(),
};

const ICON = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4M6 12v7h12v-7"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  arrowL: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  torch: '<svg viewBox="0 0 24 24"><path d="M9 3h6v5l-2 3v10h-2V11L9 8z"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><rect x="3.5" y="7" width="17" height="12" rx="2"/><circle cx="12" cy="13" r="3.2"/><path d="M9 7l1.5-2.5h3L15 7"/></svg>',
  desktop: '<svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M1.5 19.5h21"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
};

const ratio = (w) => (w.width && w.height ? `${w.width} / ${w.height}` : '9 / 16');
const isDesktop = (w) => w.device === 'desktop';

// ---------------- utils ----------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg) {
  const root = document.getElementById('toastRoot');
  root.innerHTML = '';
  const t = el(`<div class="toast">${esc(msg)}</div>`);
  root.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2400);
}
// a plain-language fallback for when the server didn't send its own message
function friendlyError(status) {
  if (status === 401) return 'Please sign in first';
  if (status === 404) return 'This page is out of date. Please refresh and try again.';
  if (status === 429) return 'Too many tries. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return 'That didn’t work. Please try again.';
}
async function api(path, opts = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
  } catch {
    throw Object.assign(new Error('Can’t reach Offscreen. Check your connection and try again.'), { status: 0 });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error || friendlyError(res.status)), { status: res.status, retryAfter: err.retryAfter });
  }
  return res.status === 204 ? null : res.json();
}
function initial(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}
function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  return `${Math.floor(days / 30)} mo`;
}
function fmt(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const thumb = (w) => `/thumbs/${w.filename}.webp`;
const thumbAvif = (w) => `/thumbs-avif/${w.filename}.avif`;
// a lighter, still-sharp stand-in for the original — for anywhere an image is shown large
// on screen (the wallpaper page, collection tiles) but isn't the actual file being downloaded
const display = (w) => `/display/${w.filename}.webp`;
const displayAvif = (w) => `/display-avif/${w.filename}.avif`;
const full = (w) => `/images/${w.filename}`;

// <picture> markup: the browser picks AVIF if it can decode it (typically 15-35% smaller
// than WebP at matched quality), falling back to the WebP <img> everywhere else. `attrs` is
// any extra attributes to put on the <img> itself (class, data-full, loading, etc).
function picture(avifSrc, webpSrc, alt, attrs = '') {
  return `<picture><source type="image/avif" srcset="${avifSrc}" /><img src="${webpSrc}" alt="${alt}" ${attrs} /></picture>`;
}
const pad = (n) => String(n).padStart(2, '0');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// images fade in once loaded; fall back to the full image if a thumbnail is missing
document.addEventListener('load', (e) => {
  if (e.target.tagName === 'IMG') e.target.classList.add('loaded');
}, true);
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName === 'IMG' && img.dataset.full && img.src.indexOf(img.dataset.full) === -1) img.src = img.dataset.full;
}, true);

// ---------------- motion ----------------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

function activateMotion(root = document) {
  root.querySelectorAll('.reveal, .line-mask, [data-reveal]').forEach(n => revealObserver.observe(n));
  root.querySelectorAll('img').forEach(img => { if (img.complete && img.naturalWidth) img.classList.add('loaded'); });
  root.querySelectorAll('[data-count]').forEach(countUp);
}

function countUp(node) {
  const target = Number(node.dataset.count);
  if (reducedMotion || !target) { node.textContent = fmt(target); return; }
  const start = performance.now();
  const dur = 1400;
  const tick = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 4);
    node.textContent = fmt(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const topbar = document.getElementById('topbar');
window.addEventListener('scroll', () => {
  topbar.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

// ---------------- cards ----------------
function cardHTML(w, i = 0) {
  const liked = state.likedIds.has(w.id);
  return `
  <article class="card reveal" style="--i:${i % 8}" data-id="${w.id}">
    <div class="card-media" style="--ar:${ratio(w)}">
      ${w.featured ? '<span class="badge">Featured</span>' : ''}
      ${picture(thumbAvif(w), thumb(w), esc(w.title), `data-full="${full(w)}" loading="lazy" decoding="async"`)}
      <div class="card-actions">
        <button class="like-btn ${liked ? 'liked' : ''}" data-id="${w.id}" aria-label="Like">${ICON.heart}</button>
        <button class="dl-btn" data-id="${w.id}" aria-label="Download">${ICON.download}</button>
      </div>
    </div>
    <div class="card-info">
      <div>
        <h3 class="card-title">${esc(w.title)}</h3>
        <div class="card-cat">${esc(w.category)}${isDesktop(w) ? '<span class="dev">· Desktop</span>' : ''}</div>
      </div>
      <span class="card-likes">${ICON.heart}<b>${fmt(w.likes)}</b></span>
    </div>
  </article>`;
}

function bindCards(container) {
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      go(`/wallpaper/${card.dataset.id}`);
    });
  });
  container.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const res = await toggleLike(btn.dataset.id);
      if (!res) return;
      document.querySelectorAll(`.like-btn[data-id="${btn.dataset.id}"]`).forEach(b => {
        b.classList.toggle('liked', res.liked);
        const count = b.closest('.card')?.querySelector('.card-likes b');
        if (count) count.textContent = fmt(res.likes);
      });
      btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
    });
  });
  container.querySelectorAll('.dl-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); downloadWallpaper(btn.dataset.id); });
  });
}

// Masonry columns, built in JS instead of CSS `columns`: CSS column-balancing fills a whole
// column before moving to the next, so a run of tall phone cards next to a run of short,
// wide desktop cards leaves one side visibly shorter than the other. Here every card goes
// into whichever column is currently shortest (by estimated height, from its own aspect
// ratio), which is what actually keeps both sides level regardless of the mix of shapes.
const liveGrids = [];

function columnCountFor(width) {
  if (width < 640) return 2;
  return Math.max(1, Math.min(4, Math.floor((width + 22) / (230 + 22))));
}
function estCardHeight(w, colWidth) {
  const ar = (w.width && w.height) ? w.width / w.height : 9 / 16;
  return colWidth / ar + 84; // + title/meta block
}

function layoutGrid(node, items) {
  const width = node.clientWidth || node.parentElement.clientWidth || 320;
  const mobile = width < 640;
  const gap = mobile ? 12 : 22;
  const cols = columnCountFor(width);
  const colWidth = (width - gap * (cols - 1)) / cols;
  const heights = new Array(cols).fill(0);

  node.innerHTML = '';
  node.style.display = 'flex';
  node.style.gap = gap + 'px';
  node.style.alignItems = 'flex-start';
  const colEls = Array.from({ length: cols }, () => {
    const col = document.createElement('div');
    col.className = 'grid-col';
    node.appendChild(col);
    return col;
  });

  items.forEach((w, i) => {
    const target = heights.indexOf(Math.min(...heights));
    colEls[target].insertAdjacentHTML('beforeend', cardHTML(w, i));
    heights[target] += estCardHeight(w, colWidth) + (mobile ? 22 : 40);
  });
  bindCards(node);
}

function fillGrid(node, items, emptyHTML) {
  if (!items.length) {
    node.style.display = '';
    node.innerHTML = emptyHTML;
    return;
  }
  layoutGrid(node, items);
  liveGrids.push({ node, items });
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    for (const { node, items } of liveGrids) {
      if (document.body.contains(node)) layoutGrid(node, items);
    }
  }, 200);
});

async function toggleLike(id) {
  if (!state.user) { openAuthModal({ reason: 'Sign in to like wallpapers and keep them in one place.' }); return null; }
  try {
    const res = await api(`/wallpapers/${id}/like`, { method: 'POST' });
    if (res.liked) state.likedIds.add(Number(id)); else state.likedIds.delete(Number(id));
    toast(res.liked ? 'Added to your likes' : 'Removed from your likes');
    return res;
  } catch (err) {
    toast(err.message);
    return null;
  }
}

async function downloadWallpaper(id) {
  if (!state.user) {
    openAuthModal({ reason: 'Sign in to download. It only takes your name and email.', then: () => downloadWallpaper(id) });
    return;
  }
  try {
    const { url, name } = await api(`/wallpapers/${id}/download`, { method: 'POST' });
    // fetch as a blob so the file is saved (with a readable name) instead of opened in a tab
    const blob = await (await fetch(url)).blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    toast('Your download has started');
  } catch (err) {
    toast(err.message === 'Please sign in first' ? err.message : 'Download failed, please try again');
  }
}

function sectionHead(num, eyebrow, title, link) {
  return `
    <div class="section-head">
      <div class="reveal">
        <span class="eyebrow">${num ? `<b class="num">${num}</b>` : ""}${eyebrow}</span>
        <h2>${title}</h2>
      </div>
      ${link || ''}
    </div>`;
}
const arrowLink = (href, label) => `<a class="link-arrow reveal" href="${href}">${label} ${ICON.arrow}</a>`;

// ---------------- auth ----------------
async function loadMe() {
  const { user } = await api('/auth/me');
  state.user = user;
  renderProfileSlot();
  if (user) {
    try {
      const liked = await api('/me/likes');
      state.likedIds = new Set(liked.map(w => w.id));
    } catch (e) { /* ignore */ }
  } else {
    state.likedIds = new Set();
  }
}

function avatarHTML(u, cls) {
  return u.avatar
    ? `<span class="${cls} has-photo"><img src="${u.avatar}" alt="" /></span>`
    : `<span class="${cls}">${initial(u.name)}</span>`;
}

function renderProfileSlot() {
  const slot = document.getElementById('profileSlot');
  if (state.user) {
    slot.innerHTML = `<a href="/profile" class="profile-chip">${avatarHTML(state.user, 'profile-avatar')}<span>${esc(state.user.name.split(' ')[0])}</span></a>`;
  } else {
    slot.innerHTML = `<button class="btn-login" id="loginBtn">Sign in</button>`;
    document.getElementById('loginBtn').addEventListener('click', () => openAuthModal());
  }
}

function openModal(inner) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = '';
  const modal = el(`<div class="modal-backdrop"><div class="modal"><button class="close-x" aria-label="Close">${ICON.close}</button>${inner}</div></div>`);
  root.appendChild(modal);
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('.close-x').addEventListener('click', close);
  return { modal, close };
}

function openAuthModal({ reason, then, mode = 'signup' } = {}) {
  const { modal, close } = openModal(`
    <span class="eyebrow">Members</span>
    <h3 id="authTitle"></h3>
    <p class="sub" id="authSub">${esc(reason || 'Sign in to like and download wallpapers. No password needed.')}</p>
    <div id="stepDetails">
      <div class="auth-switch" role="tablist">
        <button type="button" data-mode="signup" role="tab">Sign up</button>
        <button type="button" data-mode="login" role="tab">Log in</button>
      </div>
      <form id="detailsForm" novalidate>
        <label class="auth-field" id="nameField"><span>Name</span>
          <input class="field" type="text" id="authName" maxlength="60" autocomplete="name" /></label>
        <label class="auth-field"><span>Email</span>
          <input class="field" type="email" id="authEmail" maxlength="200" autocomplete="email" /></label>
        <p class="auth-error" role="alert"></p>
        <div class="modal-actions"><button class="btn accent" type="submit">Send code ${ICON.arrow}</button></div>
      </form>
    </div>
    <div id="stepCode" hidden>
      <form id="codeForm" novalidate>
        <label class="auth-field"><span>6-digit code</span>
          <input class="field code-input" type="text" id="authCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" /></label>
        <p class="auth-error" role="alert"></p>
        <div class="modal-actions code-actions">
          <button class="btn small" type="button" id="changeEmail">Change email</button>
          <button class="btn small" type="button" id="resendCode"></button>
          <button class="btn accent" type="submit">Verify ${ICON.arrow}</button>
        </div>
      </form>
    </div>`);
  const $ = (sel) => modal.querySelector(sel);
  const showError = (step, msg) => { $(`${step} .auth-error`).textContent = msg || ''; };
  let email = '';
  let resendTimer;

  const setMode = (m) => {
    mode = m;
    modal.querySelectorAll('.auth-switch button').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    $('#nameField').hidden = m === 'login';
    $('#authTitle').innerHTML = m === 'signup' ? 'Join <em>Offscreen</em>' : 'Welcome <em>back</em>';
    showError('#stepDetails', '');
    setTimeout(() => (m === 'signup' ? $('#authName') : $('#authEmail')).focus(), 30);
  };
  modal.querySelectorAll('.auth-switch button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  setMode(mode);

  const countdown = (secs) => {
    clearInterval(resendTimer);
    const btn = $('#resendCode');
    const tick = () => {
      btn.disabled = secs > 0;
      btn.textContent = secs > 0 ? `Resend in ${secs}s` : 'Resend code';
      if (secs-- <= 0) clearInterval(resendTimer);
    };
    tick();
    resendTimer = setInterval(tick, 1000);
  };

  const requestCode = async () => {
    const body = { mode, email: $('#authEmail').value.trim(), name: $('#authName').value.trim() };
    const res = await api('/auth/request-code', { method: 'POST', body: JSON.stringify(body) });
    email = res.email;
    return res;
  };

  $('#detailsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter || $('#detailsForm button[type=submit]');
    btn.disabled = true;
    try {
      const res = await requestCode();
      $('#stepDetails').hidden = true;
      $('#stepCode').hidden = false;
      $('#authTitle').innerHTML = 'Check your <em>email</em>';
      $('#authSub').innerHTML = `We sent a 6-digit code to <b>${esc(email)}</b>. It expires in 10 minutes.`;
      showError('#stepCode', '');
      countdown(res.resendAfter || 30);
      setTimeout(() => $('#authCode').focus(), 30);
    } catch (err) {
      showError('#stepDetails', err.message);
      if (/already has an account/.test(err.message)) { setMode('login'); showError('#stepDetails', err.message); }
      else if (/Sign up first/.test(err.message)) { setMode('signup'); showError('#stepDetails', err.message); }
    } finally { btn.disabled = false; }
  });

  const verify = async () => {
    const code = $('#authCode').value.replace(/\D/g, '');
    if (code.length !== 6) return showError('#stepCode', 'Enter all 6 digits');
    const btn = $('#codeForm button[type=submit]');
    btn.disabled = true;
    try {
      const { user } = await api('/auth/verify-code', { method: 'POST', body: JSON.stringify({ email, code }) });
      clearInterval(resendTimer);
      close();
      await loadMe();
      toast(mode === 'signup' ? `Welcome, ${user.name.split(' ')[0]}` : `Welcome back, ${user.name.split(' ')[0]}`);
      render();
      if (then) then();
    } catch (err) {
      showError('#stepCode', err.message);
      $('#authCode').select();
    } finally { btn.disabled = false; }
  };
  $('#codeForm').addEventListener('submit', (e) => { e.preventDefault(); verify(); });
  // submit as soon as the 6th digit is typed or pasted
  $('#authCode').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    if (e.target.value.length === 6) verify();
  });
  $('#resendCode').addEventListener('click', async () => {
    try {
      const res = await requestCode();
      showError('#stepCode', '');
      toast('A new code is on its way');
      countdown(res.resendAfter || 30);
    } catch (err) {
      showError('#stepCode', err.message);
      if (err.retryAfter) countdown(err.retryAfter);
    }
  });
  $('#changeEmail').addEventListener('click', () => {
    clearInterval(resendTimer);
    $('#stepCode').hidden = true;
    $('#stepDetails').hidden = false;
    $('#authCode').value = '';
    $('#authSub').textContent = reason || 'Sign in to like and download wallpapers. No password needed.';
    setMode(mode);
  });
}

async function logout() {
  await api('/auth/logout', { method: 'POST' });
  state.user = null;
  state.likedIds = new Set();
  renderProfileSlot();
  go('/');
}

// ---------------- pages ----------------
const app = document.getElementById('app');
const loaderHTML = '<div class="loader"><span></span></div>';

async function pageHome() {
  app.classList.add('is-home');
  const [all, trending, fresh, popular, categories] = await Promise.all([
    api('/wallpapers?dedupe=1'),
    api('/wallpapers?sort=trending&dedupe=1'),
    api('/wallpapers?sort=new&dedupe=1'),
    api('/wallpapers?sort=popular&dedupe=1'),
    api('/categories'),
  ]);
  state.categories = categories;

  // three drifting columns of wallpapers, each doubled so the loop is seamless
  // the plain colour-glass renders are flat next to everything else, so keep the hero to
  // the more visually rich wallpapers (they still show up everywhere else on the site)
  const pool = shuffle(all.filter(w => !isDesktop(w) && !w.tags.includes('glass')));
  const desktops = shuffle(all.filter(isDesktop));
  const cols = [0, 1, 2].map(c => pool.filter((_, i) => i % 3 === c).slice(0, 7));
  const colHTML = cols.map(col => {
    const imgs = col.map(w => `<a href="/wallpaper/${w.id}" tabindex="-1">${picture(thumbAvif(w), thumb(w), '', `data-full="${full(w)}"`)}</a>`).join('');
    return `<div class="hero-col">${imgs}${imgs}</div>`;
  }).join('');

  // phones/tablets get a fanned deck of wallpapers instead of the faded columns
  const deck = [...pool.filter(w => w.featured), ...pool.filter(w => !w.featured)].slice(0, 5);
  const now = new Date();
  const lockTime = `${now.getHours() % 12 || 12}:${pad(now.getMinutes())}`;
  const deckHTML = deck.map((w, k) => `
    <a class="deck-card" href="/wallpaper/${w.id}" data-k="${k}" aria-label="${esc(w.title)}">
      ${picture(displayAvif(w), display(w), '', `data-full="${full(w)}"`)}
      <span class="deck-island"></span>
      <span class="deck-time">${lockTime}</span>
    </a>`).join('');

  const marqueeItems = categories
    .map(c => ({ ...c, n: all.filter(w => w.category === c.name).length }))
    .filter(c => c.n)
    .map(c => `<a href="/explore?category=${encodeURIComponent(c.name)}">${esc(c.name)}<small>${c.n}</small></a>`).join('');

  app.innerHTML = `
    <section class="hero" data-reveal>
      <div class="hero-copy">
        <span class="eyebrow">A curated wallpaper gallery</span>
        <h1>
          <span class="line-mask" style="--i:0"><span>Wallpapers</span></span>
          <span class="line-mask" style="--i:1"><span>for your</span></span>
          <span class="line-mask" style="--i:2"><span><em>mood.</em></span></span>
        </h1>
        <p class="hero-sub">A collection for your screen. Hand-picked wallpapers, from quiet and minimal to bold and vintage. Find one you love, preview it, and keep it.</p>
        <div class="hero-deck" id="heroDeck">
          <div class="deck-stage">${deckHTML}</div>
          <p class="deck-caption" id="deckCaption" aria-live="polite"></p>
          <div class="deck-dots" id="deckDots">${deck.map(() => '<i></i>').join('')}</div>
        </div>
        <form class="hero-search" id="heroSearchForm">
          <input type="text" id="heroSearch" placeholder="Search dark, retro, pink…" autocomplete="off" />
          <button type="submit" aria-label="Search">${ICON.arrow}</button>
        </form>
        <div class="hero-meta">
          <div><span data-count="${all.length}">0</span><small>Wallpapers</small></div>
          <div><span data-count="${categories.length}">0</span><small>Collections</small></div>
          <div><span data-count="${all.reduce((s, w) => s + w.downloads, 0)}">0</span><small>Downloads</small></div>
        </div>
      </div>
      <div class="hero-wall" aria-hidden="true">${colHTML}</div>
    </section>

    <div class="marquee"><div class="marquee-track">${marqueeItems}${marqueeItems}</div></div>

    <section class="section">
      ${sectionHead('01', 'Trending', 'What everyone is <em>saving</em>', arrowLink('/explore?sort=trending', 'View all'))}
      <div class="grid" id="railTrending"></div>
    </section>

    <section class="section">
      ${sectionHead('02', 'New arrivals', 'Just <em>added</em>', arrowLink('/explore?sort=new', 'View all'))}
      <div class="grid" id="railNew"></div>
    </section>

    <section class="section">
      ${sectionHead('03', 'Popular', 'Most <em>loved</em>', arrowLink('/explore?sort=popular', 'View all'))}
      <div class="grid" id="popularGrid"></div>
    </section>

    ${desktops.length ? `<section class="section">
      ${sectionHead('04', 'Desktop', 'For your <em>desktop</em>', arrowLink('/explore?device=desktop', 'All desktop'))}
      <div class="grid" id="railDesktop"></div>
    </section>` : ''}

    <section class="section">
      ${sectionHead(desktops.length ? '05' : '04', 'The gallery', 'Keep <em>discovering</em>', arrowLink('/explore', 'Full gallery'))}
      <div class="grid" id="gallerySample"></div>
    </section>
  `;

  startDeck(deck);
  fillGrid(document.getElementById('railTrending'), trending.slice(0, 12));
  fillGrid(document.getElementById('railNew'), fresh.slice(0, 12));
  fillGrid(document.getElementById('popularGrid'), popular.slice(0, 8));
  if (desktops.length) fillGrid(document.getElementById('railDesktop'), desktops.slice(0, 10));
  fillGrid(document.getElementById('gallerySample'), shuffle([...all]).slice(0, 12));

  document.getElementById('heroSearchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('heroSearch').value.trim();
    go(`/search?q=${encodeURIComponent(q)}`);
  });
}

// ---------------- hero deck (phones/tablets) ----------------
let deckTimer;
function startDeck(items) {
  const deck = document.getElementById('heroDeck');
  if (!deck || !items.length) return;
  const cards = [...deck.querySelectorAll('.deck-card')];
  const dots = [...deck.querySelectorAll('#deckDots i')];
  const caption = document.getElementById('deckCaption');
  const n = cards.length;
  let i = 0;

  const layout = () => {
    cards.forEach((c, k) => {
      const rel = (k - i + n) % n;
      c.dataset.pos = rel === 0 ? 'center' : rel === 1 ? 'right' : rel === n - 1 ? 'left' : 'back';
      c.tabIndex = rel === 0 ? 0 : -1;
    });
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    const w = items[i];
    caption.innerHTML = `<b>${esc(w.title)}</b><span>${esc(w.category)}</span>`;
  };
  const go_ = (step) => { i = (i + step + n) % n; layout(); };
  const restart = () => {
    clearInterval(deckTimer);
    if (!reducedMotion) deckTimer = setInterval(() => go_(1), 3400);
  };

  // tapping a card at the side brings it to the front instead of opening it
  cards.forEach((c, k) => c.addEventListener('click', (e) => {
    if (c.dataset.pos === 'center') return;
    e.preventDefault();
    i = k;
    layout();
    restart();
  }));

  // swipe left/right
  let x0 = null;
  deck.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  deck.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) { go_(dx < 0 ? 1 : -1); restart(); }
  });

  layout();
  restart();
}

function collHTML(c, items, i) {
  const cover = [...items].sort((a, b) => b.likes - a.likes)[0];
  return `
    <a class="coll reveal" style="--i:${i}" href="/explore?category=${encodeURIComponent(c.name)}">
      ${cover ? picture(displayAvif(cover), display(cover), '', `data-full="${full(cover)}" loading="lazy"`) : ''}
      <span class="coll-num">${pad(i + 1)}</span>
      <h3>${esc(c.name)}</h3>
      <p>${items.length} wallpaper${items.length === 1 ? '' : 's'} ${ICON.arrow}</p>
    </a>`;
}

async function pageExplore(params) {
  const activeCategory = params.get('category') || 'All';
  const sort = params.get('sort') || '';
  const device = params.get('device') || '';
  // counts (category/device chip numbers) use the full, undeduped set so they read as
  // "how many wallpapers total" — only the rendered grid below hides paired duplicates
  const [categories, all] = await Promise.all([api('/categories'), api('/wallpapers')]);
  state.categories = categories;

  const query = new URLSearchParams();
  if (activeCategory !== 'All') query.set('category', activeCategory);
  if (sort) query.set('sort', sort);
  if (device) query.set('device', device);
  query.set('dedupe', '1');
  const items = await api('/wallpapers?' + query);

  // category counts follow the chosen device
  const scope = device ? all.filter(w => w.device === device) : all;
  const sortLabel = { trending: 'Trending', popular: 'Most loved', new: 'New arrivals', featured: 'Featured' }[sort];
  const heading = activeCategory !== 'All' ? `<em>${esc(activeCategory)}</em>`
    : sortLabel ? `<em>${sortLabel}</em>`
    : device === 'desktop' ? 'For your <em>desktop</em>'
    : device === 'phone' ? 'For your <em>phone</em>'
    : 'The <em>gallery</em>';

  app.innerHTML = `
    <div class="page-head">
      <span class="eyebrow reveal">Explore · ${items.length} wallpapers</span>
      <h1><span class="line-mask"><span>${heading}</span></span></h1>
    </div>
    <div class="filter-row reveal" id="deviceFilters" style="padding-bottom:14px">
      <button class="filter ${!device ? 'active' : ''}" data-device="">All devices</button>
      <button class="filter ${device === 'phone' ? 'active' : ''}" data-device="phone">Phone<sup>${all.filter(w => !isDesktop(w)).length}</sup></button>
      <button class="filter ${device === 'desktop' ? 'active' : ''}" data-device="desktop">Desktop<sup>${all.filter(isDesktop).length}</sup></button>
    </div>
    <div class="filter-row reveal" id="catFilters">
      <button class="filter ${activeCategory === 'All' ? 'active' : ''}" data-cat="All">All<sup>${scope.length}</sup></button>
      ${categories.map(c => `<button class="filter ${activeCategory === c.name ? 'active' : ''}" data-cat="${esc(c.name)}">${esc(c.name)}<sup>${scope.filter(w => w.category === c.name).length}</sup></button>`).join('')}
    </div>
    <div class="grid" id="exploreGrid"></div>
  `;

  const navigate = (cat, dev) => {
    const q = new URLSearchParams();
    if (cat !== 'All') q.set('category', cat);
    if (sort) q.set('sort', sort);
    if (dev) q.set('device', dev);
    go(`/explore${q.toString() ? '?' + q : ''}`);
  };
  document.getElementById('catFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (btn) navigate(btn.dataset.cat, device);
  });
  document.getElementById('deviceFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (btn) navigate(activeCategory, btn.dataset.device);
  });

  fillGrid(document.getElementById('exploreGrid'), items,
    `<div class="empty-state"><h3>Nothing here <em>yet</em></h3>This collection is waiting for its first wallpaper.</div>`);
}

async function pageCategories() {
  const [categories, all] = await Promise.all([api('/categories'), api('/wallpapers')]);
  app.innerHTML = `
    <div class="page-head">
      <span class="eyebrow reveal">${categories.length} collections</span>
      <h1><span class="line-mask"><span>The <em>collections</em></span></span></h1>
      <p class="reveal">Every wallpaper, sorted by feeling. Choose a mood and start browsing.</p>
    </div>
    <div class="coll-grid">
      ${categories.map((c, i) => collHTML(c, all.filter(w => w.category === c.name), i)).join('')}
    </div>
  `;
}

async function pageSearch(params) {
  const q = params.get('q') || '';
  const suggestions = ['dark', 'retro', 'pink', 'motivational', 'minimal', 'vintage', 'cute', 'desktop'];
  app.innerHTML = `
    <div class="page-head">
      <span class="eyebrow reveal">Search</span>
      <form class="search-big reveal" id="searchForm">
        <input class="field-underline" type="text" id="searchInput" placeholder="What’s your mood today?" value="${esc(q)}" autocomplete="off" />
        <button type="submit" aria-label="Search">${ICON.search}</button>
      </form>
      <div class="suggest reveal"><span>Try</span>${suggestions.map(s => `<a class="tag" href="/search?q=${s}">${s}</a>`).join('')}</div>
    </div>
    <div id="searchResults"></div>
  `;
  const input = document.getElementById('searchInput');
  if (!q) input.focus();
  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    go(`/search?q=${encodeURIComponent(input.value.trim())}`);
  });

  const results = document.getElementById('searchResults');
  if (!q) {
    results.innerHTML = `<div class="empty-state"><h3>Search by <em>feeling</em></h3>Try a mood, a colour or a style.</div>`;
    return;
  }
  const items = await api(`/wallpapers?dedupe=1&q=${encodeURIComponent(q)}`);
  results.innerHTML = `<p class="result-count reveal">${items.length} result${items.length === 1 ? '' : 's'} for “${esc(q)}”</p><div class="grid" id="searchGrid"></div>`;
  fillGrid(document.getElementById('searchGrid'), items,
    `<div class="empty-state"><h3>No <em>matches</em></h3>Nothing matched “${esc(q)}”. Try one of the suggestions above.</div>`);
}

function signInPrompt(title, text) {
  app.innerHTML = `<div class="empty-state" style="padding-top:140px"><span class="eyebrow">Members</span><h3 style="margin-top:18px">${title}</h3>${text}<br/><button class="btn accent" id="promptLogin">Sign in ${ICON.arrow}</button></div>`;
  document.getElementById('promptLogin').addEventListener('click', () => openAuthModal());
}

async function pageLikes() {
  if (!state.user) return signInPrompt('Your <em>likes</em> live here', 'Sign in to keep the wallpapers you love in one place.');
  const items = await api('/me/likes');
  app.innerHTML = `
    <div class="page-head">
      <span class="eyebrow reveal">${items.length} saved</span>
      <h1><span class="line-mask"><span>My <em>likes</em></span></span></h1>
    </div>
    <div class="grid" id="likesGrid"></div>
  `;
  fillGrid(document.getElementById('likesGrid'), items,
    `<div class="empty-state"><h3>Nothing <em>liked</em> yet</h3>Tap the heart on any wallpaper to keep it here.<br/><a class="btn" href="/explore">Start exploring ${ICON.arrow}</a></div>`);
}

function shrinkImage(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that image'))), 'image/jpeg', 0.9);
    };
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = URL.createObjectURL(file);
  });
}

async function pageProfile() {
  if (!state.user) return signInPrompt('Your <em>profile</em>', 'Sign in to see your profile and collection.');
  const [liked, downloaded] = await Promise.all([api('/me/likes'), api('/me/downloads')]);
  const u = state.user;
  const since = u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'recently';
  app.innerHTML = `
    <div class="profile-head reveal">
      <div class="avatar-edit">
        <button type="button" class="avatar-btn" id="avatarBtn" aria-label="Change profile photo">
          ${avatarHTML(u, 'profile-avatar-lg')}
          <span class="avatar-overlay">${ICON.camera}<small>${u.avatar ? 'Change' : 'Add photo'}</small></span>
        </button>
        <input type="file" id="avatarFile" accept="image/*" hidden />
        ${u.avatar ? '<button type="button" class="avatar-remove" id="avatarRemove">Remove photo</button>' : ''}
      </div>
      <div>
        <span class="eyebrow">Member since ${since}</span>
        <h1>${esc(u.name)}</h1>
        <p>${esc(u.email)} · ${liked.length} liked · ${downloaded.length} downloaded</p>
      </div>
      <button class="btn" id="logoutBtn">Sign out</button>
    </div>
    <div class="tabs" id="profileTabs">
      <button class="active" data-tab="liked">Liked<sup>${liked.length}</sup></button>
      <button data-tab="downloads">Downloads<sup>${downloaded.length}</sup></button>
      <span class="tabs-bar"></span>
    </div>
    <div class="grid" id="profileGrid"></div>
  `;
  const lists = {
    liked: [liked, '<div class="empty-state"><h3>An empty <em>gallery</em></h3>Your liked wallpapers will appear here.</div>'],
    downloads: [downloaded, '<div class="empty-state"><h3>No <em>downloads</em> yet</h3>Wallpapers you download will appear here.</div>'],
  };
  const tabs = document.getElementById('profileTabs');
  const moveBar = () => {
    const active = tabs.querySelector('button.active');
    const bar = tabs.querySelector('.tabs-bar');
    bar.style.width = active.offsetWidth + 'px';
    bar.style.transform = `translateX(${active.offsetLeft}px)`;
  };
  const show = (tab) => {
    const [items, empty] = lists[tab];
    fillGrid(document.getElementById('profileGrid'), items, empty);
    requestAnimationFrame(() => activateMotion(app));
  };
  tabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    tabs.querySelectorAll('button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    moveBar();
    show(b.dataset.tab);
  }));
  requestAnimationFrame(moveBar);
  show('liked');

  const fileInput = document.getElementById('avatarFile');
  document.getElementById('avatarBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Please choose an image');
    try {
      toast('Uploading your photo…');
      const blob = await shrinkImage(file, 512);
      const res = await fetch('/api/me/avatar', { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || friendlyError(res.status));
      state.user = data.user;
      renderProfileSlot();
      toast('Profile photo updated');
      pageProfile().then(() => activateMotion(app));
    } catch (err) { toast(err.message); }
  });
  document.getElementById('avatarRemove')?.addEventListener('click', async () => {
    try {
      const { user } = await api('/me/avatar', { method: 'DELETE' });
      state.user = user;
      renderProfileSlot();
      toast('Profile photo removed');
      pageProfile().then(() => activateMotion(app));
    } catch (err) { toast(err.message); }
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);
}

let clockTimer = null;

async function pageDetail(id) {
  let w, similar;
  try {
    [w, similar] = await Promise.all([api(`/wallpapers/${id}`), api(`/wallpapers/${id}/similar`)]);
  } catch (e) {
    app.innerHTML = `<div class="empty-state"><h3>Wallpaper <em>not found</em></h3><a class="btn" href="/explore">Back to gallery</a></div>`;
    return;
  }
  const liked = state.likedIds.has(w.id);
  const desktop = isDesktop(w);

  app.innerHTML = `
    <nav class="crumbs reveal"><a href="/explore">Gallery</a><span>/</span><a href="/explore?category=${encodeURIComponent(w.category)}">${esc(w.category)}</a></nav>
    <div class="detail ${desktop ? 'is-desktop' : ''}">
      <div class="detail-stage" id="stage">
        ${desktop ? `
        <div class="laptop" id="device">
          <div class="laptop-lid">
            <div class="laptop-screen">
              <div class="laptop-notch"></div>
              ${picture(displayAvif(w), display(w), esc(w.title), `data-full="${full(w)}"`)}
              <div class="mac-bar"><span><b>Finder</b><span>File</span><span>Edit</span><span>View</span></span><span id="macTime"></span></div>
              <div class="mac-win"></div>
              <div class="mac-dock">${'<i></i>'.repeat(8)}</div>
              <div class="phone-glare"></div>
            </div>
          </div>
          <div class="laptop-base"></div>
        </div>
        <div class="seg" id="seg">
          <span class="seg-pill"></span>
          <button class="active" data-mode="main">Desktop</button>
          <button data-mode="alt">Wallpaper only</button>
        </div>` : `
        <div class="phone" id="device">
          <div class="phone-screen">
            <div class="phone-island"></div>
            ${picture(displayAvif(w), display(w), esc(w.title), `data-full="${full(w)}"`)}
            <div class="ls">
              <div class="ls-date" id="lsDate"></div>
              <div class="ls-time" id="lsTime"></div>
              <div class="ls-bottom"><span>${ICON.torch}</span><span>${ICON.camera}</span></div>
            </div>
            <div class="hs">${'<i></i>'.repeat(16)}<div class="hs-dock"><i></i><i></i><i></i><i></i></div></div>
            <div class="phone-glare"></div>
          </div>
        </div>
        <div class="seg" id="seg">
          <span class="seg-pill"></span>
          <button class="active" data-mode="main">Lock screen</button>
          <button data-mode="alt">Home screen</button>
        </div>`}
      </div>

      <div class="detail-info">
        <span class="eyebrow reveal">${esc(w.category)} collection<span class="device-tag">${desktop ? ICON.desktop + 'Desktop' : ICON.phone + 'Phone'}</span></span>
        <h1><span class="line-mask"><span>${esc(w.title)}</span></span></h1>
        <div class="stats reveal">
          <div><strong data-count="${w.likes}" id="likeCount">0</strong><small>Likes</small></div>
          <div><strong data-count="${w.downloads}">0</strong><small>Downloads</small></div>
          <div><strong>${timeAgo(w.createdAt)}</strong><small>Added</small></div>
        </div>
        <div class="actions reveal">
          <button class="btn accent" id="detailDownload">${ICON.download} Download</button>
          <button class="btn ${liked ? 'liked' : ''}" id="detailLike">${ICON.heart} <span>${liked ? 'Liked' : 'Like'}</span></button>
          <button class="btn" id="detailShare">${ICON.share} Share</button>
        </div>
        <div class="meta-block reveal">
          <h4>Tags</h4>
          <div class="tags">${w.tags.map(t => `<a class="tag" href="/search?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div>
        </div>
      </div>
    </div>

    <section class="section">
      ${sectionHead('', 'Similar style', 'You might also <em>like</em>', arrowLink(`/explore?category=${encodeURIComponent(w.category)}`, 'More ' + esc(w.category)))}
      <div class="grid" id="similarGrid"></div>
    </section>
  `;

  // live clock on the lock screen / menu bar
  const tickClock = () => {
    const now = new Date();
    const time = `${now.getHours() % 12 || 12}:${pad(now.getMinutes())}`;
    const lsTime = document.getElementById('lsTime');
    const macTime = document.getElementById('macTime');
    if (!lsTime && !macTime) return false;
    if (lsTime) {
      lsTime.textContent = time;
      document.getElementById('lsDate').textContent = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    }
    if (macTime) macTime.textContent = `${now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}  ${time}`;
    return true;
  };
  tickClock();
  clearInterval(clockTimer);
  clockTimer = setInterval(() => { if (!tickClock()) clearInterval(clockTimer); }, 10000);

  // lock/home (phone) or desktop/wallpaper-only (laptop) toggle with sliding pill
  const seg = document.getElementById('seg');
  const phone = document.getElementById('device');
  const movePill = () => {
    const active = seg.querySelector('button.active');
    const pill = seg.querySelector('.seg-pill');
    pill.style.width = active.offsetWidth + 'px';
    pill.style.transform = `translateX(${active.offsetLeft - 4}px)`;
  };
  seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    seg.querySelectorAll('button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    phone.classList.toggle(desktop ? 'clean' : 'home', b.dataset.mode === 'alt');
    movePill();
  }));
  requestAnimationFrame(movePill);

  // gentle 3D tilt that follows the cursor
  const stage = document.getElementById('stage');
  if (!reducedMotion && window.matchMedia('(hover: hover)').matches) {
    phone.addEventListener('animationend', () => {
      stage.addEventListener('mousemove', (e) => {
        const r = stage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        const k = desktop ? 0.5 : 1;
        phone.style.transform = `rotateY(${x * 14 * k}deg) rotateX(${-y * 10 * k}deg)`;
      });
      stage.addEventListener('mouseleave', () => { phone.style.transform = ''; });
    }, { once: true });
  }

  // ambient glow tinted by the wallpaper's own colour
  const probe = new Image();
  probe.src = thumb(w);
  probe.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 8;
      const ctx = c.getContext('2d');
      ctx.drawImage(probe, 0, 0, 8, 8);
      const d = ctx.getImageData(0, 0, 8, 8).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      stage.style.setProperty('--glow', `rgba(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)}, .9)`);
    } catch (e) { /* keep default glow */ }
  };

  const likeBtn = document.getElementById('detailLike');
  likeBtn.addEventListener('click', async () => {
    const res = await toggleLike(w.id);
    if (!res) return;
    likeBtn.classList.toggle('liked', res.liked);
    likeBtn.querySelector('span').textContent = res.liked ? 'Liked' : 'Like';
    const svg = likeBtn.querySelector('svg');
    svg.classList.remove('pop'); void svg.offsetWidth; svg.classList.add('pop');
    document.getElementById('likeCount').textContent = fmt(res.likes);
  });
  document.getElementById('detailDownload').addEventListener('click', () => downloadWallpaper(w.id));
  document.getElementById('detailShare').addEventListener('click', async () => {
    const url = location.href;
    if (navigator.share) {
      navigator.share({ title: `${w.title} on Offscreen`, url }).catch(() => {});
    } else {
      try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch (e) { toast(url); }
    }
  });

  fillGrid(document.getElementById('similarGrid'), similar,
    `<div class="empty-state">No similar wallpapers yet.</div>`);
}

// ---------------- router ----------------
// real paths via the History API — no #, so links are ordinary, shareable URLs;
// the server (see server.js) sends index.html for any of these on a fresh load or refresh
function go(url) {
  if (location.pathname + location.search === url) { render(); return; }
  history.pushState(null, '', url);
  render();
}

function parseLocation() {
  return { path: location.pathname || '/', params: new URLSearchParams(location.search) };
}

const routes = [
  [/^\/?$/, () => pageHome()],
  [/^\/explore$/, (m, p) => pageExplore(p), 'explore'],
  [/^\/categories$/, () => pageCategories(), 'categories'],
  [/^\/search$/, (m, p) => pageSearch(p), 'search'],
  [/^\/likes$/, () => pageLikes(), 'likes'],
  [/^\/profile$/, () => pageProfile()],
  [/^\/wallpaper\/(\d+)$/, (m) => pageDetail(m[1])],
];

let renderId = 0;
let firstRender = true;

async function render() {
  const id = ++renderId;
  const { path, params } = parseLocation();
  liveGrids.length = 0; // the page below is about to be replaced; drop the old grid refs
  clearInterval(deckTimer);

  // fade the current page out before swapping content
  if (!firstRender && !reducedMotion) {
    app.classList.add('is-leaving');
    await sleep(320);
    if (id !== renderId) return;
  }
  app.classList.remove('is-home');
  window.scrollTo({ top: 0, behavior: 'instant' });

  document.querySelectorAll('.main-nav a').forEach(a => a.classList.remove('active'));
  const route = routes.find(([re]) => re.test(path));
  if (route && route[2]) document.querySelector(`.main-nav a[data-route="${route[2]}"]`)?.classList.add('active');

  app.innerHTML = loaderHTML;
  app.classList.remove('is-leaving');
  try {
    if (route) await route[1](path.match(route[0]), params);
    else app.innerHTML = `<div class="empty-state"><h3>Page <em>not found</em></h3><a class="btn" href="/">Return home</a></div>`;
  } catch (e) {
    app.innerHTML = `<div class="empty-state"><h3>Something went <em>wrong</em></h3>${esc(e.message)}</div>`;
  }
  if (id !== renderId) return;
  topbar.classList.toggle('scrolled', window.scrollY > 30);
  requestAnimationFrame(() => activateMotion(app));

  if (firstRender) {
    firstRender = false;
    setTimeout(() => document.body.classList.add('loaded'), reducedMotion ? 0 : 700);
  }
}

window.addEventListener('popstate', render);
document.getElementById('searchToggle').addEventListener('click', () => go('/search'));

// intercept clicks on ordinary same-site links (<a href="/explore">…</a>) and route them
// through pushState instead of a full page reload; anything external, modified, or aimed
// at a new tab/download is left completely alone
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== location.origin) return;
  if (a.pathname === location.pathname && a.search === location.search && a.hash) return; // in-page anchor
  e.preventDefault();
  go(a.pathname + a.search);
});

// ---------------- footer ----------------
revealObserver.observe(document.getElementById('footMark'));

// size the wordmark's viewBox to the exact ink of "OFFSCREEN" in Anton, so the letters run
// edge to edge at their true proportions (no stretching, no empty space above or below)
function fitWordmark() {
  const svg = document.getElementById('markSvg');
  const text = svg.querySelector('text');
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `200px ${getComputedStyle(text).fontFamily}`;
  const m = ctx.measureText(text.textContent);
  const left = m.actualBoundingBoxLeft, width = left + m.actualBoundingBoxRight;
  const top = m.actualBoundingBoxAscent, height = top + m.actualBoundingBoxDescent;
  if (!width || !height) return;
  svg.setAttribute('viewBox', `${-left} ${-top} ${width} ${height}`);
  const grad = document.getElementById('markFill');
  grad.setAttribute('y1', -top);
  grad.setAttribute('y2', m.actualBoundingBoxDescent);
}
fitWordmark();
document.fonts.load('200px Anton').then(fitWordmark).catch(() => {});

document.getElementById('backToTop').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
});

api('/wallpapers').then(all => {
  document.getElementById('footCount').textContent = `${all.length} wallpapers`;
}).catch(() => { /* keep the generic label */ });

// light (blush) is the default; the choice is remembered per browser.
// switching plays a circular reveal that grows from the toggle button, using the View
// Transitions API where the browser supports it; elsewhere it just swaps instantly as before.
document.getElementById('themeToggle').addEventListener('click', (e) => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  const applyTheme = () => {
    if (dark) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]').content = dark ? '#160e12' : '#faf3f1';
    try { localStorage.setItem('offscreen_theme', dark ? 'dark' : 'light'); } catch (err) { /* storage unavailable */ }
  };

  if (reducedMotion || !document.startViewTransition) { applyTheme(); return; }

  const btn = e.currentTarget.getBoundingClientRect();
  const x = btn.left + btn.width / 2;
  const y = btn.top + btn.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 12;
  const root = document.documentElement.style;
  root.setProperty('--reveal-x', `${x}px`);
  root.setProperty('--reveal-y', `${y}px`);
  root.setProperty('--reveal-r', `${radius}px`);

  // .ready/.finished reject if the transition gets interrupted (a fast double-click, the
  // page navigating away mid-animation); that's fine, just don't let it log as unhandled
  const transition = document.startViewTransition(applyTheme);
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
});

(async function init() {
  renderProfileSlot();
  try { await loadMe(); } catch (e) { /* offline or server down: still render */ }
  render();
})();
