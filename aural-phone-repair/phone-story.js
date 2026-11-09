/**
 * AURAL // Scroll story for the 3D phone
 *
 * The phone section becomes a tall scroll track whose viewport sticks to
 * the screen. Scroll progress through that track (0–1) drives:
 *   - the phone pose / camera / x-ray (AuralPhoneViewer.setStoryProgress)
 *   - which chapter copy is visible
 *   - a video-style player: play/pause, draggable timeline, chapter jumps
 *
 * The player and the page scroll are always in sync: scrubbing or playing
 * simply scrolls the page, so the browser scrollbar, the wheel and the
 * timeline all control the same thing.
 */
(function () {
  const DURATION_S = 16; // length of the "video" when played

  function init() {
    const section = document.getElementById('phone-3d-section');
    const overlay = document.getElementById('hero-intro-overlay');
    const player = document.getElementById('story-player');
    if (!section || !player) return;

    section.classList.add('is-story');

    const chapters = Array.from(section.querySelectorAll('.story-chapter')).map((el) => ({
      el,
      start: parseFloat(el.dataset.start),
      end: parseFloat(el.dataset.end)
    }));

    const track = player.querySelector('.story-track');
    const fill = player.querySelector('.story-track-fill');
    const thumb = player.querySelector('.story-track-thumb');
    const timeLabel = player.querySelector('.story-time');
    const playButton = player.querySelector('.story-play');
    const labelButtons = Array.from(player.querySelectorAll('[data-seek]'));

    labelButtons.forEach((button) => {
      const at = parseFloat(button.dataset.seek);
      if (at > 0) button.style.left = `${at * 100}%`;
    });

    let progress = 0;
    let sectionTop = 0;
    let scrollRange = 1;
    let playing = false;
    let lastFrame = 0;
    let tween = null;

    /* ---------- Geometry ---------- */

    function measure() {
      sectionTop = section.getBoundingClientRect().top + window.scrollY;
      scrollRange = Math.max(section.offsetHeight - window.innerHeight, 1);
    }

    function readProgress() {
      return Math.min(Math.max((window.scrollY - sectionTop) / scrollRange, 0), 1);
    }

    function scrollToProgress(p) {
      const top = sectionTop + Math.min(Math.max(p, 0), 1) * scrollRange;
      window.scrollTo({ top, behavior: 'instant' });
    }

    /* ---------- Rendering ---------- */

    function formatTime(seconds) {
      const s = Math.round(seconds);
      return `00:${String(s).padStart(2, '0')}`;
    }

    function render() {
      const viewer = window.phoneViewer;
      if (viewer && typeof viewer.setStoryProgress === 'function') {
        viewer.setStoryProgress(progress);
      }

      // Hero copy fades out as soon as the story starts.
      if (overlay) {
        const heroOpacity = 1 - Math.min(Math.max((progress - 0.012) / 0.045, 0), 1);
        overlay.style.opacity = heroOpacity.toFixed(3);
        overlay.style.visibility = heroOpacity <= 0.01 ? 'hidden' : '';
      }

      chapters.forEach((chapter) => {
        const active = progress >= chapter.start && progress < chapter.end;
        chapter.el.classList.toggle('is-active', active);
        chapter.el.setAttribute('aria-hidden', active ? 'false' : 'true');
      });

      const percent = progress * 100;
      fill.style.width = `${percent}%`;
      thumb.style.left = `${percent}%`;
      track.setAttribute('aria-valuenow', String(Math.round(percent)));
      timeLabel.textContent = `${formatTime(progress * DURATION_S)} / ${formatTime(DURATION_S)}`;

      let current = labelButtons[0];
      labelButtons.forEach((button) => {
        if (progress + 0.0001 >= parseFloat(button.dataset.seek) - 0.1) current = button;
      });
      labelButtons.forEach((button) => button.classList.toggle('is-current', button === current));
    }

    let scheduled = false;
    function onScroll() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        progress = readProgress();
        render();
      });
    }

    /* ---------- Playback ---------- */

    function setPlaying(value) {
      playing = value;
      player.classList.toggle('is-playing', playing);
      playButton.setAttribute('aria-label', playing ? 'Pausar animação' : 'Reproduzir animação');
      if (playing) {
        cancelTween();
        lastFrame = performance.now();
        requestAnimationFrame(step);
      }
    }

    function step(now) {
      if (!playing) return;
      const dt = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;
      const next = progress + dt / DURATION_S;
      if (next >= 1) {
        scrollToProgress(1);
        setPlaying(false);
        return;
      }
      progress = next;
      scrollToProgress(next);
      requestAnimationFrame(step);
    }

    playButton.addEventListener('click', () => {
      if (playing) {
        setPlaying(false);
        return;
      }
      // Restart from the beginning when the story already finished, or when
      // the visitor is outside the section.
      const outside = window.scrollY < sectionTop - 4 || window.scrollY > sectionTop + scrollRange + 4;
      if (progress >= 0.999 || outside) {
        progress = 0;
        scrollToProgress(0);
      }
      setPlaying(true);
    });

    // Any manual scrolling input pauses playback.
    ['wheel', 'touchstart'].forEach((type) => {
      window.addEventListener(type, () => {
        if (playing) setPlaying(false);
        cancelTween();
      }, { passive: true });
    });
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
        && event.target === document.body) {
        if (playing) setPlaying(false);
        cancelTween();
      }
    });

    /* ---------- Smooth jumps (chapter labels) ---------- */

    function cancelTween() {
      if (tween) cancelAnimationFrame(tween);
      tween = null;
    }

    function animateTo(target) {
      cancelTween();
      setPlaying(false);
      const from = progress;
      const start = performance.now();
      const duration = 500 + Math.abs(target - from) * 1600;
      function frame(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        progress = from + (target - from) * eased;
        scrollToProgress(progress);
        tween = t < 1 ? requestAnimationFrame(frame) : null;
      }
      tween = requestAnimationFrame(frame);
    }

    labelButtons.forEach((button) => {
      button.addEventListener('click', () => animateTo(parseFloat(button.dataset.seek)));
    });

    /* ---------- Scrubbing ---------- */

    let scrubbing = false;
    let wasPlaying = false;

    function progressFromPointer(event) {
      const rect = track.getBoundingClientRect();
      return Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    }

    track.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      scrubbing = true;
      wasPlaying = playing;
      setPlaying(false);
      cancelTween();
      track.classList.add('is-scrubbing');
      track.setPointerCapture && track.setPointerCapture(event.pointerId);
      progress = progressFromPointer(event);
      scrollToProgress(progress);
    });

    track.addEventListener('pointermove', (event) => {
      if (!scrubbing) return;
      progress = progressFromPointer(event);
      scrollToProgress(progress);
    });

    function endScrub(event) {
      if (!scrubbing) return;
      scrubbing = false;
      track.classList.remove('is-scrubbing');
      track.releasePointerCapture && track.releasePointerCapture(event.pointerId);
      if (wasPlaying && progress < 1) setPlaying(true);
    }
    track.addEventListener('pointerup', endScrub);
    track.addEventListener('pointercancel', endScrub);

    track.addEventListener('keydown', (event) => {
      const stepSize = event.shiftKey ? 0.1 : 0.02;
      let next = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = progress + stepSize;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = progress - stepSize;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = 1;
      if (next === null) return;
      event.preventDefault();
      event.stopPropagation();
      setPlaying(false);
      progress = Math.min(Math.max(next, 0), 1);
      scrollToProgress(progress);
    });

    /* ---------- Boot ---------- */

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      measure();
      onScroll();
    });
    // The viewer is created on DOMContentLoaded by app.js; make sure it gets
    // the current progress once its model is ready.
    document.addEventListener('aural:phone-ready', render);
    window.addEventListener('load', () => {
      measure();
      onScroll();
    });

    measure();
    progress = readProgress();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
