/* Lightweight i18n engine.
   Usage in HTML:
     <span data-i18n="hero.greeting">Hi, I'm</span>
     <a data-i18n-attr="aria-label:nav.about" href="#about">About</a>
     <p data-i18n-html="about.bio">fallback HTML</p>

   The fallback (initial DOM text) is used if the JSON is missing or hasn't loaded yet.
*/
(function () {
  const KEY = 'dc-lang';
  const SUPPORTED = ['en', 'zh', 'id'];
  const DEFAULT = 'en';

  const I18N = {
    current: DEFAULT,
    data: {},
    cache: {},

    pick(saved) {
      if (saved && SUPPORTED.includes(saved)) return saved;
      const browser = (navigator.language || 'en').toLowerCase();
      if (browser.startsWith('zh')) return 'zh';
      if (browser.startsWith('id')) return 'id';
      return DEFAULT;
    },

    async load(lang) {
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
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : (lang === 'id' ? 'id' : 'en');
      this.apply();
      this.syncSwitcher();
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
  };

  window.I18N = I18N;

  document.addEventListener('DOMContentLoaded', () => {
    I18N.load(I18N.pick(localStorage.getItem(KEY)));
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => I18N.load(btn.dataset.lang));
    });
  });
})();
