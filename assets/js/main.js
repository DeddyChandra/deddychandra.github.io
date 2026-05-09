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
    // Uses Math.round so e.g. 3.9 years reads as "4+" (matches CV convention
    // of rounding to the year you're currently in).
    const yoeEl = document.getElementById('auto-yoe');
    if (yoeEl) {
      const start = new Date(2022, 5, 1); // 2022-06-01
      const now = new Date();
      const years = (now - start) / (1000 * 60 * 60 * 24 * 365.25);
      yoeEl.textContent = Math.max(1, Math.round(years)) + '+';
    }

    // ---- Current year in footer ----
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

    // ---- Carousels ----
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('.carousel').forEach((root) => {
      const track = root.querySelector('.carousel-track');
      const slides = root.querySelectorAll('.carousel-slide');
      const dots = root.querySelectorAll('.carousel-dot');
      const counter = root.querySelector('.carousel-counter');
      const progress = root.querySelector('.carousel-progress');
      const prev = root.querySelector('.carousel-prev');
      const next = root.querySelector('.carousel-next');
      const total = slides.length;
      const interval = parseInt(root.dataset.autoplay, 10) || 0;
      let current = 0;
      let timer = null;
      let progressStart = null;

      function go(i) {
        current = ((i % total) + total) % total;
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((d, idx) => d.classList.toggle('active', idx === current));
        if (counter) counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      }

      function startProgress() {
        if (!progress) return;
        progress.style.transition = 'none';
        progress.style.width = '0%';
        // Force reflow so the next assignment animates
        // eslint-disable-next-line no-unused-expressions
        progress.offsetWidth;
        progress.style.transition = `width ${interval}ms linear`;
        progress.style.width = '100%';
        progressStart = Date.now();
      }
      function clearProgress() {
        if (!progress) return;
        progress.style.transition = 'none';
        progress.style.width = '0%';
      }

      function play() {
        if (!interval || reducedMotion) return;
        stop();
        startProgress();
        timer = setTimeout(() => {
          go(current + 1);
          play();
        }, interval);
      }
      function stop() {
        if (timer) { clearTimeout(timer); timer = null; }
        clearProgress();
      }

      if (prev) prev.addEventListener('click', () => { stop(); go(current - 1); play(); });
      if (next) next.addEventListener('click', () => { stop(); go(current + 1); play(); });
      dots.forEach((d, idx) => d.addEventListener('click', () => { stop(); go(idx); play(); }));

      // Pause on hover / focus, keyboard nav when focused
      root.addEventListener('mouseenter', stop);
      root.addEventListener('mouseleave', play);
      root.addEventListener('focusin', stop);
      root.addEventListener('focusout', play);
      root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { stop(); go(current - 1); play(); }
        if (e.key === 'ArrowRight') { stop(); go(current + 1); play(); }
      });

      // Pause when tab is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else play();
      });

      go(0);
      play();
    });
  });
})();
