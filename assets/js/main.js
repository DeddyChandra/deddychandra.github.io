/* Global UX: scroll reveals, nav state, smooth-scroll, mobile menu, age calc. */
(function () {
  // ---- Reveal-on-scroll ----
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    // ---- Nav scrolled state ----
    const nav = document.querySelector('.nav');
    if (nav) {
      const update = () => nav.classList.toggle('scrolled', window.scrollY > 8);
      update();
      window.addEventListener('scroll', update, { passive: true });
    }

    // ---- Mobile menu toggle ----
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => links.classList.toggle('open'));
      links.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => links.classList.remove('open'))
      );
    }

    // ---- Active section highlight ----
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    const sections = Array.from(navLinks)
      .map((l) => document.querySelector(l.getAttribute('href')))
      .filter(Boolean);
    if (sections.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              navLinks.forEach((l) =>
                l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id)
              );
            }
          });
        },
        { rootMargin: '-40% 0px -55% 0px' }
      );
      sections.forEach((s) => observer.observe(s));
    }

    // ---- Auto-update age (birth: Aug 1, 1999 — adjust if needed) ----
    const ageEl = document.getElementById('auto-age');
    if (ageEl) {
      const birth = new Date(1999, 7, 1); // 1999-08-01
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      ageEl.textContent = age;
    }

    // ---- Auto-update years of experience (start: Jun 2022) ----
    const yoeEl = document.getElementById('auto-yoe');
    if (yoeEl) {
      const start = new Date(2022, 5, 1); // 2022-06-01
      const now = new Date();
      const years = (now - start) / (1000 * 60 * 60 * 24 * 365.25);
      yoeEl.textContent = Math.floor(years) + '+';
    }

    // ---- Current year in footer ----
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  });
})();
