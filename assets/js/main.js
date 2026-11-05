/* Rakam website — interactions (no dependencies).
   Hero film slider · header · mobile menu · reveals · accordion · stats · parallax · marquee · First Look form */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement, body = doc.body;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const rtl = root.dir === 'rtl';

  /* ---------- split titles into words (masked rise) */
  const splitWords = el => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const text = el.textContent;
    el.textContent = '';
    const sr = doc.createElement('span'); sr.className = 'sr-only'; sr.textContent = text.trim(); el.appendChild(sr);
    let wi = 0;
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { el.appendChild(doc.createTextNode(' ')); continue; }
      const w = doc.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
      const s = doc.createElement('span'); s.textContent = part; s.style.setProperty('--wi', wi++);
      w.appendChild(s); el.appendChild(w);
    }
  };
  $$('[data-words], [data-split]').forEach(splitWords);

  /* ---------- reveal on scroll */
  $$('[data-stagger]').forEach(g => $$(':scope > [data-reveal]', g).forEach((c, i) => c.style.setProperty('--d', i * 110)));
  $$('[data-reveal]').forEach(c => $$('.chk', c).forEach((k, i) => k.style.setProperty('--ci', i)));
  const reveal = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      reveal.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  $$('[data-reveal], [data-split], .report').forEach(el => reveal.observe(el));

  /* ---------- header: transparent over the hero, glass after, hides on scroll down */
  const hdr = $('[data-hdr]');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    if (hdr) {
      hdr.classList.toggle('is-top', y < 24);
      const menuOpen = root.classList.contains('menu-open');
      if (!menuOpen && y > 480 && y > lastY + 4 && !hdr.contains(doc.activeElement)) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 480) hdr.classList.remove('is-hidden');
    }
    lastY = y;
    parallax();
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- parallax on large photos */
  const plx = new Set();
  const plxIO = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? plx.add(e.target) : plx.delete(e.target))));
  if (!reduce.matches) $$('.ph[data-parallax]').forEach(p => plxIO.observe(p));
  function parallax() {
    if (!plx.size) return;
    const vh = innerHeight;
    plx.forEach(p => {
      const r = p.getBoundingClientRect();
      const prog = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      const img = p.querySelector('img');
      if (img) img.style.setProperty('--py', (-prog * r.height * 0.05).toFixed(1) + 'px');
    });
  }

  /* ---------- mobile menu */
  const menu = $('[data-menu]'), openBtn = $('[data-menu-open]');
  if (menu && openBtn) {
    const closeBtn = $('[data-menu-close]', menu);
    $$('.mmenu__list li', menu).forEach((li, i) => li.style.setProperty('--i', i));
    const focusables = () => $$('a[href], button:not([disabled])', menu);
    // the menu grows out of the button that opened it and closes back into it; reopening mid-close
    // simply reverses the running transition from where it is
    const anchor = () => {
      const r = openBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      menu.style.setProperty('--ox', x + 'px'); menu.style.setProperty('--oy', y + 'px');
      menu.style.setProperty('--r', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
    };
    const open = () => {
      anchor();
      menu.inert = false; menu.classList.add('is-open');
      root.classList.add('menu-open'); openBtn.setAttribute('aria-expanded', 'true');
      closeBtn.focus({ preventScroll: true });
    };
    const close = (restore = true) => {
      if (!menu.classList.contains('is-open')) return;
      anchor();
      menu.classList.remove('is-open'); menu.inert = true;
      openBtn.setAttribute('aria-expanded', 'false'); root.classList.remove('menu-open');
      if (restore) openBtn.focus({ preventScroll: true });
    };
    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', () => close());
    menu.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab') return;
      const f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => close(false)));
    matchMedia('(min-width: 1080px)').addEventListener('change', e => e.matches && close(false));
  }

  /* ---------- language choice is remembered for the root redirect */
  $$('[data-lang-switch]').forEach(a => a.addEventListener('click', () => { try { localStorage.setItem('rakam-lang', a.hreflang); } catch (e) { /* private mode */ } }));

  /* ---------- FAQ accordion */
  $$('[data-faq]').forEach(item => {
    const q = $('.faq__q', item);
    q.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- marquee: make each set at least as wide as its row so the loop never shows a gap */
  const fillMarquee = () => $$('[data-marquee] .mq__row').forEach(row => {
    const sets = $$('.mq__set', row);
    if (!sets.length || !sets[0].dataset.base) sets.forEach(s => { s.dataset.base = s.innerHTML; });
    sets.forEach(s => { s.innerHTML = s.dataset.base; });
    let guard = 0;
    while (sets[0].scrollWidth < row.clientWidth + 40 && guard++ < 6) sets.forEach(s => s.insertAdjacentHTML('beforeend', s.dataset.base));
  });
  fillMarquee();
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(fillMarquee, 200); });

  /* ---------- HERO: film-synced slider */
  const hero = $('[data-hero]');
  if (hero) {
    const video = $('[data-hero-video]', hero);
    const slides = $$('.hero__slide', hero), dots = $$('.hero__dot', hero), pp = $('[data-hero-toggle]', hero);
    const chapters = video.dataset.chapters.split(',').map(Number);
    const [l0, l1] = video.dataset.light.split(',').map(Number);
    const N = slides.length, SLIDE_MS = 7000;
    let cur = 0, userPaused = false, inView = true, mode = 'video', timerStart = performance.now(), timerOffset = 0, raf = 0, gesture = false;

    const setTone = light => {
      hero.dataset.tone = light ? 'light' : 'dark';
      if (hdr) hdr.classList.toggle('tone-light', light);
    };
    const leaving = [];
    const go = i => {
      if (i === cur) return;
      const old = slides[cur], nxt = slides[i];
      old.classList.remove('is-active'); old.classList.add('is-leaving');
      old.setAttribute('aria-hidden', 'true'); old.inert = true;
      clearTimeout(leaving[cur]);
      leaving[cur] = setTimeout(() => old.classList.remove('is-leaving'), reduce.matches ? 0 : 750);
      // re-selecting a slide that is still on its way out takes it straight back from where it is
      clearTimeout(leaving[i]); nxt.classList.remove('is-leaving');
      nxt.classList.add('is-active'); nxt.removeAttribute('aria-hidden'); nxt.inert = false;
      dots.forEach((d, k) => {
        d.classList.toggle('is-active', k === i); d.classList.toggle('is-done', k < i);
        if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
        if (k !== i) d.style.removeProperty('--p');
      });
      cur = i;
    };
    const chapterAt = t => { let i = 0; for (let k = 0; k < chapters.length; k++) if (t >= chapters[k]) i = k; return i; };

    const tick = () => {
      raf = 0;
      if (mode === 'video') {
        const t = video.currentTime, dur = video.duration || 32;
        const i = chapterAt(t), end = chapters[i + 1] || dur;
        if (!gesture) go(i);
        dots[i].style.setProperty('--p', Math.min(1, (t - chapters[i]) / (end - chapters[i])).toFixed(4));
        setTone(t >= l0 && t < l1);
      } else {
        const el = userPaused ? timerOffset : timerOffset + (performance.now() - timerStart);
        const i = Math.floor(el / SLIDE_MS) % N;
        if (!gesture) go(i);
        dots[i].style.setProperty('--p', ((el % SLIDE_MS) / SLIDE_MS).toFixed(4));
      }
      if (!userPaused && inView) raf = requestAnimationFrame(tick);
    };
    const loop = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const stopLoop = () => { cancelAnimationFrame(raf); raf = 0; };

    const setPaused = p => {
      userPaused = p;
      hero.classList.toggle('is-paused', p);
      pp.setAttribute('aria-label', p ? pp.dataset.lPlay : pp.dataset.lPause);
      if (mode === 'video') {
        if (p) video.pause(); else video.play().catch(() => {});
      } else if (p) timerOffset += performance.now() - timerStart;
      else timerStart = performance.now();
      if (!p) loop(); else tick();
    };
    const toTimer = () => {
      mode = 'timer'; hero.classList.remove('is-playing'); setTone(false);
      timerStart = performance.now(); timerOffset = cur * SLIDE_MS;
    };

    video.addEventListener('playing', () => { hero.classList.add('is-playing', 'has-played'); mode = 'video'; loop(); });
    video.addEventListener('pause', () => hero.classList.remove('is-playing'));
    video.addEventListener('error', toTimer, true);

    pp.addEventListener('click', () => {
      if (mode === 'timer' && video.readyState > 0 && !saveData) {
        // reduced motion / blocked autoplay: the play button starts the film on request
        mode = 'video'; video.currentTime = chapters[cur]; video.play().then(() => setPaused(false)).catch(() => { mode = 'timer'; setPaused(!userPaused); });
        return;
      }
      setPaused(!userPaused);
    });
    const seek = i => {
      if (mode === 'video') { video.currentTime = chapters[i] + 0.04; }
      else { timerOffset = i * SLIDE_MS; timerStart = performance.now(); }
      go(i); tick();
    };
    dots.forEach((d, i) => d.addEventListener('click', () => seek(i)));

    /* swipe between chapters — direct manipulation (Apple, Designing Fluid Interfaces):
       10 px hysteresis, then 1:1 tracking; release velocity projects where the flick is going,
       and a spring takes over at that velocity, starting from wherever the content is on screen */
    const track = $('.hero__slides', hero);
    const drag = { x: 0, v: 0, raf: 0 };
    let ptr = null;
    const paint = x => {
      if (!x) { track.style.transform = ''; track.style.opacity = ''; return; }
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      track.style.opacity = (1 - Math.min(1, Math.abs(x) / (hero.clientWidth * 0.45)) * 0.85).toFixed(3);
    };
    // spring with Apple's parameters (damping ratio, response in s), velocity in px/s
    const springTo = (to, { damping = 1, response = 0.4, velocity = 0 }, done) => {
      cancelAnimationFrame(drag.raf);
      const k = (2 * Math.PI / response) ** 2, c = 4 * Math.PI * damping / response;
      let last = performance.now();
      drag.v = velocity;
      const step = now => {
        const dt = Math.min(0.032, (now - last) / 1000); last = now;
        for (let n = 0; n < 4; n++) { const h = dt / 4; drag.v += (-k * (drag.x - to) - c * drag.v) * h; drag.x += drag.v * h; }
        if (Math.abs(drag.x - to) < 0.4 && Math.abs(drag.v) < 8) { drag.x = to; drag.v = 0; drag.raf = 0; paint(to); if (done) done(); return; }
        paint(drag.x); drag.raf = requestAnimationFrame(step);
      };
      drag.raf = requestAnimationFrame(step);
    };
    const capture = id => { try { hero.setPointerCapture(id); } catch (err) { /* pointer already released */ } };
    const project = (v, d = 0.99) => (v / 1000) * d / (1 - d); // Apple's momentum projection
    const settle = () => { gesture = false; hero.classList.remove('is-swiped'); tick(); };
    const commit = (step, v) => {
      const W = hero.clientWidth, side = Math.sign(drag.x) || (((step > 0) !== rtl) ? -1 : 1);
      if (reduce.matches) { drag.x = 0; paint(0); seek((cur + step + N) % N); settle(); return; }
      hero.classList.add('is-swiped');
      // out the side the finger pushed …
      springTo(side * W * 0.32, { damping: 1, response: 0.28, velocity: v }, () => {
        seek((cur + step + N) % N);
        // … and the next chapter comes in from the other side, carrying a little of the flick
        drag.x = -side * W * 0.14; paint(drag.x);
        springTo(0, { damping: 0.8, response: 0.35, velocity: v * 0.3 }, settle);
      });
    };
    hero.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('a, button')) return;
      ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: drag.x, hist: [[e.timeStamp, e.clientX]], on: false };
      if (drag.raf) { // grabbing content mid-flight stops it right there
        cancelAnimationFrame(drag.raf); drag.raf = 0;
        ptr.on = true; gesture = true; capture(e.pointerId); hero.classList.add('is-dragging');
      }
    });
    hero.addEventListener('pointermove', e => {
      if (!ptr || e.pointerId !== ptr.id) return;
      if (!ptr.on) {
        const dx = e.clientX - ptr.x0, dy = e.clientY - ptr.y0;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dy) >= Math.abs(dx)) { ptr = null; return; } // vertical: the page scroll wins
        ptr.on = true; gesture = true; ptr.x0 = e.clientX; ptr.base = drag.x;
        capture(e.pointerId); hero.classList.add('is-dragging');
        const sel = getSelection(); if (sel) sel.removeAllRanges();
      }
      ptr.hist.push([e.timeStamp, e.clientX]); if (ptr.hist.length > 6) ptr.hist.shift();
      drag.x = ptr.base + (e.clientX - ptr.x0); paint(drag.x);
    });
    const release = e => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const p = ptr; ptr = null;
      hero.classList.remove('is-dragging');
      if (!p.on) return;
      const h = p.hist.filter(([t]) => e.timeStamp - t < 100), a = h[0] || p.hist[0], b = p.hist[p.hist.length - 1];
      const v = b[0] > a[0] ? (b[1] - a[1]) / ((b[0] - a[0]) / 1000) : 0;
      const end = drag.x + project(v);
      if (e.type !== 'pointercancel' && Math.abs(end) > hero.clientWidth * 0.22) commit((end < 0) !== rtl ? 1 : -1, v);
      else springTo(0, { damping: 1, response: 0.4, velocity: v }, settle); // not far enough: settle back
    };
    hero.addEventListener('pointerup', release);
    hero.addEventListener('pointercancel', release);
    // keyboard: arrows move between slides when the dots have focus
    hero.querySelector('.hero__dots').addEventListener('keydown', e => {
      const k = e.key;
      if (k !== 'ArrowLeft' && k !== 'ArrowRight') return;
      const dir = (k === 'ArrowRight') !== rtl ? 1 : -1;
      const i = (cur + dir + N) % N;
      dots[i].click(); dots[i].focus(); e.preventDefault();
    });
    // save work while the hero is off-screen
    new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (mode === 'video' && !userPaused) { if (inView) video.play().catch(() => {}); else video.pause(); }
      if (inView && !userPaused) loop(); else stopLoop();
    }, { threshold: 0.05 }).observe(hero);

    const start = () => {
      hero.classList.add('is-ready');
      if (reduce.matches || saveData) {
        // no autoplay: show the still, slides on request only
        toTimer(); userPaused = true; hero.classList.add('is-paused'); pp.setAttribute('aria-label', pp.dataset.lPlay);
        if (saveData) video.preload = 'none';
        return;
      }
      const p = video.play();
      if (p && p.catch) p.catch(() => { toTimer(); loop(); });
      loop();
    };
    (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(start));
  }

  /* ---------- film tile (bento): load the right cut only near the viewport, play only while visible */
  $$('[data-film]').forEach(v => {
    const tile = v.parentElement, desk = matchMedia('(min-width: 1080px)');
    const hevc = v.canPlayType('video/mp4; codecs="hvc1"') ? '-hevc' : '';
    let near = false, src = '';
    const calm = () => reduce.matches || saveData;
    const sync = () => {
      if (calm() || !near) { v.pause(); if (calm()) tile.classList.remove('is-playing'); return; }
      const want = `${v.dataset.film}-${desk.matches ? 'tall' : 'wide'}${hevc}.mp4`;
      if (want !== src) { src = want; tile.classList.remove('is-playing'); v.src = want; }
      v.muted = true; v.play().catch(() => {});
    };
    v.addEventListener('playing', () => tile.classList.add('is-playing'));
    new IntersectionObserver(([e]) => { near = e.isIntersecting; sync(); }, { rootMargin: '160px 0px' }).observe(tile);
    desk.addEventListener('change', sync); reduce.addEventListener('change', sync);
  });

  /* ---------- First Look form */
  const wrap = $('[data-form-wrap]');
  if (wrap) {
    const form = $('[data-form]', wrap), ok = $('[data-form-ok]', wrap), submit = $('.flf__submit', form), fail = $('.flf__fail', form);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const checks = [
      ['name', v => v.trim().length > 0],
      ['email', v => emailRe.test(v.trim())],
    ];
    const setErr = (input, bad) => {
      const fld = input.closest('.fld'), msg = fld && $('.fld__err', fld);
      if (fld) fld.classList.toggle('is-error', bad);
      if (msg) { msg.hidden = !bad; if (bad) input.setAttribute('aria-describedby', msg.id); else input.removeAttribute('aria-describedby'); }
      input.setAttribute('aria-invalid', String(bad));
    };
    const consent = form.elements.consent, cb = consent.closest('.cb');
    const validate = () => {
      let first = null;
      for (const [name, test] of checks) {
        const el = form.elements[name], bad = !test(el.value);
        setErr(el, bad); if (bad && !first) first = el;
      }
      const cbBad = !consent.checked; cb.classList.toggle('is-error', cbBad); consent.setAttribute('aria-invalid', String(cbBad));
      if (cbBad && !first) first = consent;
      return first;
    };
    for (const [name, test] of checks) form.elements[name].addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true' && test(e.target.value)) setErr(e.target, false); });
    form.elements.email.addEventListener('blur', e => { const v = e.target.value.trim(); if (v) setErr(e.target, !emailRe.test(v)); });
    consent.addEventListener('change', () => { if (consent.checked) { cb.classList.remove('is-error'); consent.setAttribute('aria-invalid', 'false'); } });
    const done = () => {
      form.hidden = true; ok.hidden = false;
      ok.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'center' }); ok.focus({ preventScroll: true });
    };
    const label = $('.btn__label', submit), idle = label.textContent;
    const busy = on => {
      submit.disabled = on; submit.toggleAttribute('aria-busy', on);
      label.textContent = on ? form.dataset.lSending : idle;
    };
    // delivery: 'endpoint' (Formspree-style JSON service), 'netlify' (Netlify Forms) or 'prototype' (nothing sent)
    const send = async () => {
      const mode = form.dataset.mode;
      if (mode === 'prototype') return new Promise(r => setTimeout(r, 600));
      const data = new FormData(form);
      data.set('page', location.href);
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(form.getAttribute('action'), {
          method: 'POST', signal: ctrl.signal,
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data).toString(),
        });
        if (res.ok) return;
        // services such as Formspree name the field they rejected
        let info = null; try { info = await res.json(); } catch (e) { /* not JSON */ }
        const field = info && Array.isArray(info.errors) && info.errors.map(x => x.field).find(f => f === 'email' || f === 'name');
        const err = new Error('HTTP ' + res.status); err.field = field; throw err;
      } finally { clearTimeout(timer); }
    };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (submit.disabled) return;
      fail.hidden = true;
      const bad = validate();
      if (bad) { bad.focus(); return; }
      if (form.elements._gotcha && form.elements._gotcha.value) { done(); return; } // bot: drop quietly
      busy(true);
      try { await send(); done(); }
      catch (err) {
        if (err.field && form.elements[err.field]) { setErr(form.elements[err.field], true); form.elements[err.field].focus(); }
        else { fail.hidden = false; }
      } finally { busy(false); }
    });
  }

  /* ---------- page entrance */
  requestAnimationFrame(() => { body.classList.add('is-loaded'); onScroll(); });
})();
