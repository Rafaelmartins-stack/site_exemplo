/**
 * AURAL // Motion layer
 * Entrance and scroll-reveal animations, number count-ups, header state,
 * scroll progress bar and cursor spotlight on cards.
 *
 * Everything is progressive: content is only hidden once this script has
 * added `js-motion` to <html>, and nothing animates for visitors who ask
 * for reduced motion.
 */
(function () {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  if (reducedMotion || !('IntersectionObserver' in window)) return;
  root.classList.add('js-motion');

  const STAGGER_MS = 90;

  /* ---------- Helpers ---------- */

  function markReveal(el, variant, delay) {
    if (!el || el.dataset.revealed) return;
    el.dataset.revealed = 'pending';
    el.classList.add(variant === 'card' ? 'reveal-card' : 'reveal');
    el.style.setProperty('--reveal-delay', `${delay || 0}ms`);
    revealObserver.observe(el);
  }

  // Once an element has finished revealing, drop the reveal classes so its
  // own hover transitions (cards lift on hover, etc.) work as before.
  function finishReveal(el) {
    const delay = parseFloat(el.style.getPropertyValue('--reveal-delay')) || 0;
    window.setTimeout(() => {
      el.classList.remove('reveal', 'reveal-card', 'is-in');
      el.style.removeProperty('--reveal-delay');
      el.dataset.revealed = 'done';
    }, delay + 1100);
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');
      revealObserver.unobserve(el);
      finishReveal(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  /* ---------- Hero entrance ---------- */

  function splitWords(heading) {
    const nodes = Array.from(heading.childNodes);
    heading.textContent = '';
    let index = 0;

    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            heading.appendChild(document.createTextNode(' '));
            return;
          }
          const word = document.createElement('span');
          word.className = 'hero-word';
          word.textContent = part;
          word.style.setProperty('--word-index', index++);
          heading.appendChild(word);
        });
      } else {
        // Keep styled fragments (the gradient highlight) as one unit.
        node.classList.add('hero-word');
        node.style.setProperty('--word-index', index++);
        heading.appendChild(node);
      }
    });
    return index;
  }

  function setupHero() {
    const overlay = document.getElementById('hero-intro-overlay');
    if (!overlay) return;

    const top = overlay.firstElementChild;
    const bottom = overlay.lastElementChild;
    const heading = top && top.querySelector('h1');
    let wordCount = 0;
    if (heading) {
      wordCount = splitWords(heading);
      heading.classList.add('hero-heading');
    }

    const sequence = [];
    if (top) {
      Array.from(top.children).forEach((child) => {
        if (child !== heading) sequence.push(child);
        else sequence.push(null); // placeholder: heading animates word by word
      });
    }
    if (bottom && bottom !== top) {
      Array.from(bottom.children).forEach((child) => sequence.push(child));
    }

    let delay = 150;
    sequence.forEach((el) => {
      if (el === null) {
        if (heading) heading.style.setProperty('--hero-delay', `${delay}ms`);
        delay += wordCount * 55 + 200;
        return;
      }
      el.classList.add('hero-item');
      el.style.setProperty('--hero-delay', `${delay}ms`);
      delay += 140;
    });

    // Two frames so the initial (hidden) state is painted before animating.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add('hero-in');
    }));
  }

  /* ---------- Scroll reveals ---------- */

  function setupSectionReveals() {
    const sections = document.querySelectorAll('section:not(#phone-3d-section), footer');

    sections.forEach((section) => {
      // Section intro: badge, heading, lead paragraph — staggered.
      const intro = section.querySelectorAll(
        '[class*="badge-"], h2, h2 + p, h2 ~ p'
      );
      const seenParents = new Map();
      intro.forEach((el) => {
        if (el.closest('.aural-card')) return;
        const parent = el.parentElement;
        const i = seenParents.get(parent) || 0;
        seenParents.set(parent, i + 1);
        markReveal(el, 'text', i * STAGGER_MS);
      });

      // Filter pills, rating row and other small header controls.
      section.querySelectorAll('[data-filter]').forEach((el, i) => {
        markReveal(el, 'text', 200 + i * 50);
      });

      // Cards: staggered within their grid.
      section.querySelectorAll('.aural-card').forEach((card) => {
        const siblings = Array.from(card.parentElement.children);
        const i = siblings.indexOf(card);
        const columns = Math.max(1, Math.round(card.parentElement.clientWidth / Math.max(card.clientWidth, 1)));
        markReveal(card, 'card', (i % Math.max(columns, 1)) * 110 + Math.floor(i / columns) * 60);
      });
    });

    // Footer columns.
    document.querySelectorAll('footer .grid > div').forEach((col, i) => {
      markReveal(col, 'text', i * 100);
    });

    // Boutique grid is re-rendered by app.js when filters change.
    const grid = document.getElementById('accessories-grid');
    if (grid && 'MutationObserver' in window) {
      new MutationObserver(() => {
        Array.from(grid.children).forEach((card, i) => {
          if (card.dataset.revealed) return;
          markReveal(card, 'card', (i % 3) * 90);
        });
      }).observe(grid, { childList: true });
      Array.from(grid.children).forEach((card, i) => markReveal(card, 'card', (i % 3) * 90));
    }
  }

  /* ---------- Number count-ups ---------- */

  function setupCountUps() {
    const strip = document.querySelector('#phone-3d-section + section');
    if (!strip) return;

    const targets = strip.querySelectorAll('.aural-card > span:first-child');
    const counter = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        counter.unobserve(entry.target);
        animateNumber(entry.target);
      });
    }, { threshold: 0.6 });

    targets.forEach((el) => {
      const match = el.textContent.trim().match(/^(\D*?)(\d+)(.*)$/);
      if (!match) return;
      el.dataset.countPrefix = match[1];
      el.dataset.countValue = match[2];
      el.dataset.countSuffix = match[3];
      el.textContent = `${match[1]}0${match[3]}`;
      counter.observe(el);
    });
  }

  function animateNumber(el) {
    const end = parseInt(el.dataset.countValue, 10);
    const prefix = el.dataset.countPrefix || '';
    const suffix = el.dataset.countSuffix || '';
    const duration = 1400 + Math.min(end, 1000) * 0.6;
    const start = performance.now();

    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = `${prefix}${Math.round(end * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Header state + scroll progress ---------- */

  function setupHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    header.appendChild(bar);

    let ticking = false;
    function update() {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      header.classList.toggle('is-scrolled', y > 24);
      bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ---------- Cursor spotlight on cards ---------- */

  function setupSpotlight() {
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;

    let activeCard = null;
    document.addEventListener('pointermove', (event) => {
      const card = event.target.closest ? event.target.closest('.aural-card') : null;
      if (activeCard && activeCard !== card) {
        activeCard.style.removeProperty('--spot-x');
        activeCard.style.removeProperty('--spot-y');
      }
      activeCard = card;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    }, { passive: true });
  }

  /* ---------- Boot ---------- */

  function init() {
    setupHero();
    setupSectionReveals();
    setupCountUps();
    setupHeader();
    setupSpotlight();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
