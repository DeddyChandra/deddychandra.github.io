/* Lightweight i18n engine.
   Usage in HTML:
     <span data-i18n="hero.greeting">Hi, I'm</span>
     <a data-i18n-attr="aria-label:nav.about" href="#about">About</a>
     <p data-i18n-html="about.bio">fallback HTML</p>

   The fallback (initial DOM text) is used if the JSON is missing or hasn't loaded yet.

   Language in the URL:
     /calendar/?lang=zh  — pins the page to a language, so a link can be shared
   Precedence: ?lang= > previously saved choice > browser language > English.
   Picking a language (or landing on a ?lang= URL) rewrites the address bar and
   every internal link, so the language survives navigation and copy-paste.
*/
(function () {
  const KEY = 'dc-lang';
  const PARAM = 'lang';
  const SUPPORTED = ['en', 'zh', 'id'];
  const DEFAULT = 'en';
  // BCP-47 tags for <html lang> and hreflang
  const TAGS = { en: 'en', zh: 'zh-Hans', id: 'id' };
  // Assets that should never get a ?lang= appended
  const NOT_A_PAGE = /\.(pdf|zip|png|jpe?g|gif|svg|webp|ico|json|xml|txt|css|js)$/i;

  const I18N = {
    current: DEFAULT,
    data: {},
    cache: {},

    fromUrl() {
      const v = (new URLSearchParams(location.search).get(PARAM) || '').toLowerCase();
      return SUPPORTED.includes(v) ? v : null;
    },

    pick(saved) {
      const fromUrl = this.fromUrl();
      if (fromUrl) return fromUrl;
      if (saved && SUPPORTED.includes(saved)) return saved;
      const browser = (navigator.language || 'en').toLowerCase();
      if (browser.startsWith('zh')) return 'zh';
      if (browser.startsWith('id')) return 'id';
      return DEFAULT;
    },

    /* `explicit` means the language was chosen deliberately — via ?lang= or the
       switcher — so it gets pinned into the URL. An auto-detected language
       leaves the address bar clean. */
    async load(lang, explicit) {
      if (!SUPPORTED.includes(lang)) lang = DEFAULT;
      if (this.cache[lang]) {
        this.data = this.cache[lang];
      } else {
        try {
          const res = await fetch(`/assets/i18n/${lang}.json`, { cache: 'no-cache' });
          if (!res.ok) throw new Error('failed');
          this.data = await res.json();
          this.cache[lang] = this.data;
        } catch (e) {
          // Fallback: try relative path (handles deeper pages like /blog/posts/x.html)
          try {
            const depth = location.pathname.split('/').filter(Boolean).length - 1;
            const rel = '../'.repeat(Math.max(depth, 0)) + `assets/i18n/${lang}.json`;
            const res2 = await fetch(rel, { cache: 'no-cache' });
            this.data = await res2.json();
            this.cache[lang] = this.data;
          } catch (err) {
            console.warn('i18n: could not load', lang, err);
            return;
          }
        }
      }
      this.current = lang;
      localStorage.setItem(KEY, lang);
      document.documentElement.lang = TAGS[lang];
      this.apply();
      this.syncSwitcher();
      this.syncAlternates();
      if (explicit) {
        this.syncUrl();
        this.syncLinks();
      }
    },

    get(key) {
      return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), this.data);
    },

    apply() {
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const v = this.get(el.dataset.i18n);
        if (typeof v === 'string') el.textContent = v;
      });
      document.querySelectorAll('[data-i18n-html]').forEach((el) => {
        const v = this.get(el.dataset.i18nHtml);
        if (typeof v === 'string') el.innerHTML = v;
      });
      document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
        el.dataset.i18nAttr.split(',').forEach((pair) => {
          const [attr, key] = pair.split(':').map((s) => s.trim());
          const v = this.get(key);
          if (typeof v === 'string' && attr) el.setAttribute(attr, v);
        });
      });
    },

    syncSwitcher() {
      document.querySelectorAll('.lang-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.lang === this.current);
      });
    },

    /* Reflect the language in the address bar without adding a history entry. */
    syncUrl() {
      const url = new URL(location.href);
      if (url.searchParams.get(PARAM) === this.current) return;
      url.searchParams.set(PARAM, this.current);
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    },

    /* Carry the language across internal navigation, so any URL the visitor
       copies while browsing already points at the language they're reading. */
    syncLinks() {
      document.querySelectorAll('a[href]').forEach((a) => {
        const raw = a.getAttribute('href');
        if (!raw || raw.startsWith('#')) return;
        let url;
        try {
          url = new URL(raw, location.href);
        } catch (e) {
          return;
        }
        if (url.origin !== location.origin || NOT_A_PAGE.test(url.pathname)) return;
        url.searchParams.set(PARAM, this.current);
        a.setAttribute('href', url.pathname + url.search + url.hash);
      });
    },

    /* <link rel="alternate" hreflang> for the other two languages. */
    syncAlternates() {
      document.querySelectorAll('link[data-i18n-alt]').forEach((el) => el.remove());
      const head = document.head;
      SUPPORTED.concat('x-default').forEach((lang) => {
        const url = new URL(location.href);
        url.searchParams.set(PARAM, lang === 'x-default' ? DEFAULT : lang);
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = lang === 'x-default' ? 'x-default' : TAGS[lang];
        link.href = url.origin + url.pathname + url.search;
        link.dataset.i18nAlt = '';
        head.appendChild(link);
      });
    },
  };

  window.I18N = I18N;

  document.addEventListener('DOMContentLoaded', () => {
    I18N.load(I18N.pick(localStorage.getItem(KEY)), !!I18N.fromUrl());
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => I18N.load(btn.dataset.lang, true));
    });
  });
})();
