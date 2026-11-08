import '@/iris';
import './lens.css';
import './sections.css';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ── Hero: the aperture holds closed until the player is 60% on screen (or touched), then opens ── */
{
  const wrap = $('.stage-wrap');
  const open = () => {
    if (wrap.hasAttribute('data-open')) return;
    wrap.toggleAttribute('data-open', true);
    setTimeout(() => wrap.toggleAttribute('data-opened', true), 1600);
    io.disconnect();
  };
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.intersectionRatio >= 0.6)) open(); }, { threshold: [0, 0.6, 1] });
  io.observe(wrap);
  wrap.addEventListener('pointerdown', open, { capture: true });
  wrap.addEventListener('focusin', open);
}

const bar = $('.bar');
const onBar = () => bar.toggleAttribute('data-scrolled', scrollY > 8);
addEventListener('scroll', onBar, { passive: true });
onBar();

/* ── Hero: the engraved ring turns so its index points at the player's speed ── */
{
  const media = $<HTMLVideoElement>('.hero-player mux-video');
  const dial = $('.dial');
  const nums = $$<SVGTextElement>('.r-num text');
  const rates = nums.map((n) => Number(n.dataset.rate));
  const step = 12;
  const sync = () => {
    const r = media.playbackRate || 1;
    let best = 0;
    rates.forEach((v, i) => { if (Math.abs(v - r) < Math.abs(rates[best] - r)) best = i; });
    dial.style.setProperty('--rot', `${-(best - 3) * step}deg`);
    nums.forEach((n, i) => n.toggleAttribute('data-on', i === best));
  };
  media.addEventListener('ratechange', sync);
  sync();

  const ring = $('.ring');
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced.matches) {
    let raf = 0;
    addEventListener('pointermove', (e) => {
      raf ||= requestAnimationFrame(() => {
        raf = 0;
        const b = ring.getBoundingClientRect();
        if (b.bottom < 0) return;
        const cx = b.left + b.width / 2, cy = b.top + b.width / 2;
        ring.style.setProperty('--glint', `${(Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180) / Math.PI}deg`);
        ring.style.setProperty('--glint-o', '1');
      });
    }, { passive: true });
    document.addEventListener('pointerleave', () => ring.style.setProperty('--glint-o', '0'));
  }
}

/* ── 01 Controls: a zoom-lens tour of the four parts; the callouts hold a part when pressed ── */
{
  const img = $('.plate-img');
  const chipN = $('.fc-n', img), chipT = $('.fc-t', img);
  const items = $$('.callouts li');
  const marks = $$('.pin, .lead');
  const focusAt: Record<number, { x: number; y: number; z: number }> = {
    1: { x: 0.5, y: 0.87, z: 2.1 }, 2: { x: 0.4366, y: 0.87, z: 2.1 }, 3: { x: 0.5634, y: 0.87, z: 2.1 }, 4: { x: 0.3, y: 0.72, z: 1.6 },
  };
  let current = 0, visible = false, held = false, paused = false, tourAt = -1, timer = 0;
  const order = [1, 2, 3, 4, 0];
  const dwell = (n: number) => (n === 0 ? 2600 : 3400);
  const focus = (n: number) => {
    current = n;
    img.dataset.focus = String(n);
    const f = focusAt[n];
    const z = f && !reduced.matches ? f.z : 1;
    img.style.setProperty('--z', String(z));
    img.style.setProperty('--tx', String(f ? clamp(0.5 - f.x * z, 1 - z, 0) : 0));
    img.style.setProperty('--ty', String(f ? clamp(0.52 - f.y * z, 1 - z, 0) : 0));
    if (f) { img.style.setProperty('--fx', `${f.x * 100}%`); img.style.setProperty('--fy', `${f.y * 100}%`); }
    img.style.setProperty('--fr', f ? (n === 4 ? '22%' : '7%') : '160%');
    items.forEach((li) => {
      const on = Number(li.dataset.n) === n;
      li.toggleAttribute('data-hot', on);
      $('button', li).setAttribute('aria-pressed', String(on && held));
    });
    marks.forEach((m) => m.toggleAttribute('data-hot', Number(m.dataset.n) === n));
    if (f) { chipN.textContent = String(n); chipT.textContent = $('b', items[n - 1]).textContent; }
  };
  const tour = () => {
    if (!visible || held || paused || reduced.matches) return;
    tourAt = (tourAt + 1) % order.length;
    const n = order[tourAt];
    focus(n);
    items.forEach((li) => li.removeAttribute('data-tour'));
    const li = items[n - 1];
    if (li) { li.style.setProperty('--dwell', `${dwell(n)}ms`); void li.offsetWidth; li.toggleAttribute('data-tour', true); }
    timer = window.setTimeout(tour, dwell(n));
  };
  const stop = () => { clearTimeout(timer); items.forEach((li) => li.removeAttribute('data-tour')); };
  new IntersectionObserver((es) => {
    const v = es.some((e) => e.intersectionRatio >= 0.5);
    if (v === visible) return;
    visible = v;
    if (v) timer = window.setTimeout(tour, 900);
    else { stop(); if (!held) focus(0); }
  }, { threshold: [0, 0.5, 1] }).observe(img);
  const plate = $('.plate');
  plate.addEventListener('pointerenter', () => { paused = true; stop(); });
  plate.addEventListener('pointerleave', () => { paused = false; if (!held) { focus(0); tourAt = order.length - 1; timer = window.setTimeout(tour, 2200); } });
  items.forEach((li) => {
    const n = Number(li.dataset.n);
    const btn = $('button', li);
    li.addEventListener('pointerenter', () => { if (!held) focus(n); });
    btn.addEventListener('focus', () => { paused = true; stop(); if (!held) focus(n); });
    btn.addEventListener('blur', () => { paused = false; });
    btn.addEventListener('click', () => { held = !(held && current === n); focus(held ? n : 0); stop(); });
  });
}

/* ── 02 Fits any site: site, device, accent and corner radius ── */
const stage = $('.stage');
const benchSkin = $('iris-skin', stage);
const vAccent = $('.v-accent');
const vRadius = $('.v-radius');
const embedLink = $<HTMLAnchorElement>('.js-embed');
const look = { accent: '', radius: 16 };
const flash = (el: HTMLElement) => { el.toggleAttribute('data-flash', true); requestAnimationFrame(() => requestAnimationFrame(() => el.removeAttribute('data-flash'))); };
const syncEmbed = () => {
  const q = new URLSearchParams();
  if (look.accent) q.set('accent', look.accent.replace('#', ''));
  q.set('radius', String(look.radius));
  embedLink.href = `./embed.html?${q}`;
};
{
  let t = 0;
  const wipe = (change: () => void) => {
    if (reduced.matches) { change(); return; }
    clearTimeout(t);
    stage.dataset.wipe = 'close';
    t = window.setTimeout(() => { change(); stage.dataset.wipe = 'open'; t = window.setTimeout(() => delete stage.dataset.wipe, 640); }, 340);
  };
  for (const group of $$('.bench [role="radiogroup"]')) radioGroup(group, (btn) => {
    const { host, device, accent } = btn.dataset;
    if (host || device) wipe(() => { if (host) stage.dataset.host = host; if (device) stage.dataset.device = device; });
    if (accent !== undefined) {
      look.accent = accent;
      if (accent) benchSkin.style.setProperty('--media-accent-color', accent); else benchSkin.style.removeProperty('--media-accent-color');
      vAccent.style.setProperty('--v-sw', accent || '#f6f2ea');
      vAccent.lastChild!.textContent = accent || '#f6f2ea';
      flash(vAccent);
      syncEmbed();
    }
  });

  const dial = $('.dialctl');
  const out = $('.dial-v', dial);
  const MIN = 0, MAX = 32, SWEEP = 270;
  let value = 16;
  const set = (v: number) => {
    value = clamp(Math.round(v), MIN, MAX);
    dial.style.setProperty('--a', `${(value / MAX) * SWEEP - SWEEP / 2}deg`);
    dial.setAttribute('aria-valuenow', String(value));
    dial.setAttribute('aria-valuetext', `${value} pixels`);
    out.textContent = String(value);
    benchSkin.style.setProperty('--media-border-radius', `${value}px`);
    look.radius = value;
    if (vRadius.textContent !== `${value}px`) { vRadius.textContent = `${value}px`; flash(vRadius); }
    syncEmbed();
  };
  dial.addEventListener('keydown', (e) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 4, PageDown: -4 };
    if (e.key in steps) set(value + steps[e.key]);
    else if (e.key === 'Home') set(MIN);
    else if (e.key === 'End') set(MAX);
    else return;
    e.preventDefault();
  });
  const fromPointer = (e: PointerEvent) => {
    const b = dial.getBoundingClientRect();
    let a = (Math.atan2(e.clientX - (b.left + b.width / 2), -(e.clientY - (b.top + b.height / 2))) * 180) / Math.PI;
    a = clamp(a, -SWEEP / 2, SWEEP / 2);
    set(((a + SWEEP / 2) / SWEEP) * MAX);
  };
  dial.addEventListener('pointerdown', (e) => { dial.setPointerCapture(e.pointerId); fromPointer(e); dial.focus({ preventScroll: true }); });
  dial.addEventListener('pointermove', (e) => { if (dial.hasPointerCapture(e.pointerId)) fromPointer(e); });
  dial.addEventListener('wheel', (e) => { if (document.activeElement === dial) { e.preventDefault(); set(value + (e.deltaY < 0 ? 1 : -1)); } }, { passive: false });
  set(value);
}

/** A row of role="radio" buttons: click or arrow keys pick one. */
function radioGroup(group: HTMLElement, pick: (btn: HTMLElement) => void) {
  const radios = $$('[role="radio"]', group);
  const choose = (btn: HTMLElement) => {
    for (const r of radios) { r.setAttribute('aria-checked', String(r === btn)); r.tabIndex = r === btn ? 0 : -1; }
    pick(btn);
  };
  radios.forEach((r, i) => {
    r.tabIndex = r.getAttribute('aria-checked') === 'true' ? 0 : -1;
    r.addEventListener('click', () => choose(r));
    r.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const next = radios[(i + d + radios.length) % radios.length];
      choose(next);
      next.focus();
    });
  });
}

/* ── 03 Every state: the viewer stays put while the list scrolls; the state at the reading line is shown ── */
{
  const frame = $('.sv-frame');
  const items = $$<HTMLButtonElement>('.sv-i');
  const cur = $('.sv-cur'), grp = $('.sv-grp'), dev = $('.sv-dev');
  const stick = $('.sv-stick');
  const narrow = matchMedia('(width <= 899px)');
  let active = 0;
  let turnT = 0;

  const layerFor = (btn: HTMLButtonElement) => {
    const layer = document.createElement('div');
    layer.className = 'sv-layer';
    layer.dataset.kind = btn.dataset.kind!;
    const img = new Image(btn.dataset.kind === 'phone' ? 716 : 1792, btn.dataset.kind === 'phone' ? 402 : 1008);
    img.src = btn.dataset.src!;
    img.alt = btn.dataset.alt!;
    img.decoding = 'async';
    if (btn.dataset.kind === 'phone') {
      const phone = document.createElement('div');
      phone.className = 'sv-phone';
      const pic = img.cloneNode() as HTMLImageElement;
      pic.alt = '';
      phone.append(pic, document.createElement('i'), document.createElement('i'), document.createElement('i'));
      layer.append(img, phone);
    } else layer.append(img);
    return { layer, img };
  };

  const show = async (i: number) => {
    if (i === active) return;
    active = i;
    const btn = items[i];
    items.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    cur.textContent = String(i + 1).padStart(2, '0');
    grp.textContent = btn.dataset.group!;
    dev.textContent = btn.dataset.kind === 'phone' ? 'Phone' : 'Desktop';
    const { layer, img } = layerFor(btn);
    try { await img.decode(); } catch { /* show it anyway */ }
    if (active !== i) return;
    // Keep at most two layers (the one leaving and the one arriving), however fast the list is scrolled.
    const all = $$('.sv-layer', frame);
    all.slice(0, -1).forEach((l) => l.remove());
    const old = all.slice(-1);
    old.forEach((l) => { l.classList.remove('is-in'); l.classList.add('is-out'); });
    layer.classList.add('is-in');
    frame.append(layer);
    frame.removeAttribute('data-turn');
    void frame.offsetWidth;
    frame.toggleAttribute('data-turn', true);
    clearTimeout(turnT);
    turnT = window.setTimeout(() => { old.forEach((l) => l.remove()); layer.classList.remove('is-in'); frame.removeAttribute('data-turn'); }, 760);
  };

  // Desktop: the state crossing the middle of the window. Phone: the first state fully below the pinned viewer.
  const line = () => (narrow.matches ? stick.getBoundingClientRect().bottom + 6 : innerHeight * 0.46);
  let raf = 0;
  let lockUntil = 0;
  const pick = () => {
    raf = 0;
    if (performance.now() < lockUntil) return;
    const y = line();
    const list = $('.sv-list').getBoundingClientRect();
    if (list.bottom < 0 || list.top > innerHeight) return;
    let best = 0, dist = Infinity;
    items.forEach((b, k) => {
      const r = b.getBoundingClientRect();
      const d = narrow.matches ? (r.top >= y - 24 ? r.top - y : Infinity) : y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (d < dist) { dist = d; best = k; }
    });
    if (dist === Infinity) best = items.length - 1;
    show(best);
  };
  addEventListener('scroll', () => { raf ||= requestAnimationFrame(pick); }, { passive: true });
  addEventListener('resize', () => { raf ||= requestAnimationFrame(pick); });

  // Bring a chosen state to the reading line, so the list and the viewer agree.
  const align = (btn: HTMLElement) => {
    const r = btn.getBoundingClientRect();
    const target = narrow.matches ? scrollY + r.top - line() - 4 : scrollY + r.top + r.height / 2 - line();
    lockUntil = performance.now() + (reduced.matches ? 120 : 900);
    scrollTo({ top: target, behavior: reduced.matches ? 'auto' : 'smooth' });
  };
  items.forEach((btn, k) => {
    btn.addEventListener('click', () => { show(k); align(btn); });
    btn.addEventListener('focus', () => { show(k); if (btn.matches(':focus-visible')) align(btn); });
    btn.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      items[clamp(k + d, 0, items.length - 1)].focus();
    });
  });

  // Warm the cache once the section is near, one image at a time.
  new IntersectionObserver((es, io) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    let n = 0;
    const next = () => { if (n >= items.length) return; const im = new Image(); im.onload = im.onerror = next; im.src = items[n++].dataset.src!; };
    next();
  }, { rootMargin: '600px 0px' }).observe($('.sv'));
}

/* ── 05 Specifications: the drawing reads its sizes in u and in pixels ── */
{
  const svg = $<SVGSVGElement>('.bp-draw svg');
  const labels = $$<SVGTextElement>('[data-u]', svg);
  const fmt = (n: number) => String(Math.round(n * 10000) / 10000);
  const write = (unit: number) => {
    for (const t of labels) {
      const u = Number(t.dataset.u);
      const lead = t.textContent!.startsWith('⌀') ? '⌀ ' : '';
      t.textContent = '';
      t.append(`${lead}${fmt(u)}u`);
      const px = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      px.setAttribute('class', 'px');
      px.textContent = `  ${fmt(u * unit)} px${t.dataset.suffix ?? ''}`;
      t.append(px);
    }
  };
  radioGroup($('.bp-unit [role="radiogroup"]'), (btn) => write(Number(btn.dataset.unit)));
  write(16);
  // On narrow screens the drawing frames the middle of the row, so its text stays readable.
  const narrow = matchMedia('(width <= 640px)');
  const frame = () => svg.setAttribute('viewBox', narrow.matches ? '236 20 600 384' : '0 0 1120 400');
  narrow.addEventListener('change', frame);
  frame();
}

/* ── 06 Accessibility: bright vs dark, and reduced motion on a switch ── */
{
  const cmp = $('.cmp');
  const range = $<HTMLInputElement>('.cmp-range', cmp);
  const set = () => cmp.style.setProperty('--cut', `${range.value}%`);
  range.addEventListener('input', set);
  set();

  const calm = $('.calmv');
  const tog = $('.calm-tog', calm);
  tog.addEventListener('click', () => {
    const on = tog.getAttribute('aria-pressed') !== 'true';
    tog.setAttribute('aria-pressed', String(on));
    calm.dataset.calm = String(on);
  });

  $$('.ax-grid .ax').forEach((a, k) => a.style.setProperty('--k', String(k % 3)));
}

/* ── Footer: an iris diaphragm that closes as the page ends ── */
{
  const fin = $('.finale');
  const blades = $<SVGPathElement>('.fin-blades', fin);
  const edges = $<SVGPathElement>('.fin-edges', fin);
  const R = 100;
  const OPEN = 0.62 * R; // apothem of the opening when open, as in the logo
  const f = (n: number) => n.toFixed(2);
  const draw = (c: number) => {
    // Six straight blade edges, each a line at distance d from the center. As the iris closes, d shrinks to 0
    // and the opening turns, as a real diaphragm does.
    const d = OPEN * (1 - c) ** 1.15;
    const a0 = (-90 + 34 * c) * (Math.PI / 180);
    const v: [number, number][] = [];
    const k = d / Math.cos(Math.PI / 6);
    for (let i = 0; i < 6; i++) { const t = a0 + (i * Math.PI) / 3 + Math.PI / 6; v.push([k * Math.cos(t), k * Math.sin(t)]); }
    const hex = d > 0.05 ? `M${v.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z` : '';
    blades.setAttribute('d', `M${-R} 0a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0Z${hex}`);
    let e = '';
    const reach = Math.sqrt(R * R - d * d);
    for (let i = 0; i < 6; i++) {
      const th = a0 + (i * Math.PI) / 3;
      const n = [Math.cos(th), Math.sin(th)], u = [-Math.sin(th), Math.cos(th)];
      const along = d * Math.tan(Math.PI / 6);
      const s = [d * n[0] + along * u[0], d * n[1] + along * u[1]];
      const t = [d * n[0] - reach * u[0], d * n[1] - reach * u[1]];
      // A slight curve, as on real blades; it starts along the straight edge of the opening.
      const len = Math.hypot(t[0] - s[0], t[1] - s[1]);
      const q = [(s[0] + t[0]) / 2 - n[0] * len * 0.09, (s[1] + t[1]) / 2 - n[1] * len * 0.09];
      e += `M${f(s[0])} ${f(s[1])}Q${f(q[0])} ${f(q[1])} ${f(t[0])} ${f(t[1])}`;
    }
    edges.setAttribute('d', e);
    fin.toggleAttribute('data-shut', c > 0.995);
  };
  let raf = 0;
  const update = () => {
    raf = 0;
    if (reduced.matches) { draw(0.55); return; }
    const left = document.documentElement.scrollHeight - innerHeight - scrollY;
    draw(clamp(1 - left / (innerHeight * 0.75), 0, 1));
  };
  addEventListener('scroll', () => { raf ||= requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', () => { raf ||= requestAnimationFrame(update); });
  update();
}

/* ── Copy buttons ── */
for (const btn of $$<HTMLButtonElement>('.copy')) {
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($(`#${btn.dataset.copy}`).textContent ?? '');
      btn.textContent = 'Copied';
      btn.toggleAttribute('data-done', true);
      setTimeout(() => { btn.textContent = 'Copy'; btn.removeAttribute('data-done'); }, 1600);
    } catch {
      btn.textContent = 'Select and copy';
    }
  });
}

/* ── Reveal on scroll ── */
const reveal = new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
}, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
for (const el of $$('.rv')) reveal.observe(el);

/* One player at a time */
const players = $$<HTMLVideoElement>('mux-video');
for (const p of players) p.addEventListener('play', () => players.forEach((o) => { if (o !== p && !o.paused) o.pause(); }));

for (const el of $$('.js-origin')) el.textContent = location.origin + location.pathname.replace(/[^/]*$/, '').replace(/\/$/, '');
syncEmbed();
