/* Theme switcher: dark (default) / light, persists to localStorage,
   respects system preference on first visit. Applied early in <head> to avoid FOUC. */
(function () {
  const KEY = 'dc-theme';
  const root = document.documentElement;

  function getInitial() {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function apply(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelectorAll('[data-theme-icon]').forEach((el) => {
      el.dataset.themeIcon = theme;
    });
  }

  apply(getInitial());

  window.toggleTheme = function () {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    localStorage.setItem(KEY, next);
  };

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem(KEY)) apply(e.matches ? 'light' : 'dark');
  });
})();
