// <iris-behavior>: the few things Iris adds on top of Video.js components.
//  1. The speed gauge shows the current rate (label, accessible name, ring fill).
//  2. With a mouse, the speed scale opens on hover, like the volume slider.
//  3. On the speed scale you can slide a finger or the mouse along the stops.
//  4. In a phone-sized player, menus become a sheet across the bottom of the player.
//  5. The player's focus ring shows for keyboard focus only.
//  6. The volume capsule: its width (from the key back to the dock's left edge) and the level at its end.
// It sits inside the skin template and finds its player with closest('.vx').

const RATE_MIN = 0.5;
const RATE_MAX = 2;
const HOVER_OPEN_MS = 160;
const HOVER_CLOSE_MS = 160;
const SHEET_INSET_PX = 6;

type MenuElement = HTMLElement & { open: boolean; openMenu(reason?: string): void; close(reason?: string): void };

const formatRate = (rate: number) => `${Math.round(rate * 100) / 100}×`;
const canHover = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

export class IrisBehaviorElement extends HTMLElement {
  #abort: AbortController | null = null;

  connectedCallback() {
    this.#abort?.abort();
    this.#abort = new AbortController();
    const signal = this.#abort.signal;
    const root = this.closest<HTMLElement>('.vx');
    if (!root) return;

    const media = () => root.querySelector<HTMLMediaElement>('.vx-media');
    const trigger = root.querySelector<HTMLButtonElement>('.c3-rate');
    const gauge = root.querySelector<HTMLElement>('.c3-rategauge');
    const label = root.querySelector<HTMLElement>('.c3-rate-v');
    const speedMenu = root.querySelector<MenuElement>('.c3-speed');

    // 0 · The player's own focus ring is for keyboard focus only (Video.js also focuses it on a tap or click).
    //     After a tap, data-touch hides every ring in the player (Safari on iPhone can show them); a key press clears it.
    let fromKeyboard = false;
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      fromKeyboard = true;
      root.removeAttribute('data-touch');
    }, { capture: true, signal });
    document.addEventListener('pointerdown', (e) => {
      fromKeyboard = false;
      root.toggleAttribute('data-touch', e.pointerType === 'touch' || e.pointerType === 'pen');
    }, { capture: true, signal });
    root.addEventListener('focus', () => root.toggleAttribute('data-kbd-focus', fromKeyboard), { signal });

    // 1 · Show the rate on the gauge.
    const showRate = () => {
      const rate = media()?.playbackRate ?? 1;
      if (!trigger || !gauge || !label) return;
      const text = formatRate(rate);
      label.textContent = text;
      label.toggleAttribute('data-long', text.length > 3);
      trigger.dataset.rate = String(rate);
      trigger.setAttribute('aria-label', `Playback speed, ${text}`);
      const fill = Math.min(1, Math.max(0, (rate - RATE_MIN) / (RATE_MAX - RATE_MIN)));
      gauge.style.setProperty('--rf', `${(fill * 100).toFixed(2)}%`);
    };
    // ratechange does not bubble, but a capturing listener on the player still hears it.
    root.addEventListener('ratechange', showRate, { capture: true, signal });
    root.addEventListener('loadedmetadata', showRate, { capture: true, signal });
    requestAnimationFrame(showRate);

    // 2 · Hover opens the speed scale with a mouse; leaving closes it again.
    if (trigger && speedMenu) {
      let timer = 0;
      let byHover = false;
      const later = (fn: () => void, ms: number) => { clearTimeout(timer); timer = window.setTimeout(fn, ms); };
      // After a pick closes the picker, the pointer may still be over the gauge: wait until it leaves before hover opens again.
      let rest = false;
      let lastX = -1, lastY = -1;
      document.addEventListener('pointermove', (e) => { lastX = e.clientX; lastY = e.clientY; }, { passive: true, signal });
      const enter = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || !canHover() || rest) return;
        if (speedMenu.open) { clearTimeout(timer); return; }
        later(() => { byHover = true; speedMenu.openMenu('hover'); }, HOVER_OPEN_MS);
      };
      const leave = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        if (e.currentTarget === trigger) rest = false;
        if (!speedMenu.open) { clearTimeout(timer); return; }
        if (byHover) later(() => speedMenu.close('hover'), HOVER_CLOSE_MS);
      };
      trigger.addEventListener('pointerenter', enter, { signal });
      trigger.addEventListener('pointerleave', leave, { signal });
      speedMenu.addEventListener('pointerenter', () => clearTimeout(timer), { signal });
      speedMenu.addEventListener('pointerleave', leave, { signal });
      // A click on a gauge that hover already opened keeps the scale open instead of closing it.
      trigger.addEventListener('click', (e) => {
        if (speedMenu.open && byHover) { e.preventDefault(); e.stopImmediatePropagation(); byHover = false; clearTimeout(timer); }
      }, { capture: true, signal });
      speedMenu.addEventListener('open-change', (e) => {
        const detail = (e as CustomEvent<{ open: boolean; reason?: string }>).detail;
        if (!detail.open) { byHover = false; clearTimeout(timer); speedMenu.removeAttribute('data-hover-open'); const g = trigger.getBoundingClientRect(); rest = lastX >= g.left && lastX <= g.right && lastY >= g.top && lastY <= g.bottom; return; }
        speedMenu.toggleAttribute('data-hover-open', detail.reason === 'hover');
        if (detail.reason !== 'hover') byHover = false;
        // Start on the current speed, not at the top of the scale.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const checked = speedMenu.querySelector<HTMLElement>('.c3-stop[aria-checked="true"]');
          if (checked && speedMenu.contains(document.activeElement)) checked.focus({ preventScroll: true });
        }));
      }, { signal });
    }

    // 3 · Slide along the stops: the rate follows the pointer to the nearest stop, and letting go keeps it.
    const stops = root.querySelector<HTMLElement>('.c3-speed-rg');
    if (stops && speedMenu) {
      let start: HTMLElement | null = null;
      let current: HTMLElement | null = null;
      let pressed = false;
      const nearest = (x: number, y: number) => {
        let best: HTMLElement | null = null;
        let bestD = Infinity;
        for (const stop of stops.querySelectorAll<HTMLElement>('.c3-stop')) {
          const r = stop.getBoundingClientRect();
          const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
          if (d < bestD) { bestD = d; best = stop; }
        }
        return best;
      };
      speedMenu.addEventListener('pointerdown', (e) => {
        pressed = true;
        start = current = (e.target as Element).closest<HTMLElement>('.c3-stop') ?? null;
      }, { signal });
      speedMenu.addEventListener('pointermove', (e) => {
        if (!pressed || !(e.buttons & 1)) return;
        const stop = nearest(e.clientX, e.clientY);
        if (!stop || stop === current) return;
        current = stop;
        // Once the pointer slides, keep following it even outside the dial (no click will fire, so end() closes).
        if (!speedMenu.hasPointerCapture(e.pointerId)) speedMenu.setPointerCapture(e.pointerId);
        const m = media();
        const rate = Number(stop.dataset.rate);
        if (m && Number.isFinite(rate)) m.playbackRate = rate;
        speedMenu.setAttribute('data-sliding', '');
      }, { signal });
      const end = () => {
        const slid = pressed && current && current !== start;
        pressed = false;
        start = current = null;
        speedMenu.removeAttribute('data-sliding');
        // A tap is a click on the stop, which Video.js handles. A slide ends away from where it began, so close here.
        if (slid) speedMenu.close('imperative-action');
      };
      speedMenu.addEventListener('pointerup', end, { signal });
      speedMenu.addEventListener('pointercancel', end, { signal });
    }

    // While the row rolls out, keys pass under a still pointer. For 0.4 s after it opens, a press can only land on the
    // current speed (the key it grew out of), so a quick click never picks a neighbour by accident.
    if (speedMenu) {
      let openedAt = 0;
      new MutationObserver(() => { if (speedMenu.hasAttribute('data-open')) openedAt ||= performance.now(); else openedAt = 0; })
        .observe(speedMenu, { attributes: true, attributeFilter: ['data-open'] });
      const guard = (e: Event) => {
        if (!openedAt || performance.now() - openedAt > 400 || !speedMenu.hasAttribute('data-row')) return;
        const stop = (e.target as Element | null)?.closest?.('.c3-stop');
        if (stop && stop.getAttribute('aria-checked') !== 'true') { e.preventDefault(); e.stopPropagation(); }
      };
      for (const type of ['pointerdown', 'pointerup', 'click']) speedMenu.addEventListener(type, guard, { capture: true, signal });
    }

    // The row reads left to right (0.5× to 2×), so Left and Right walk it in that order; Home and End jump to the ends.
    if (speedMenu) {
      speedMenu.addEventListener('keydown', (e) => {
        if (!speedMenu.hasAttribute('data-row')) return;
        const stopsInView = [...speedMenu.querySelectorAll<HTMLElement>('.c3-stop')].reverse();
        const i = stopsInView.indexOf(document.activeElement as HTMLElement);
        let next = -1;
        if (e.key === 'ArrowRight') next = Math.min(stopsInView.length - 1, i + 1);
        else if (e.key === 'ArrowLeft') next = Math.max(0, i - 1);
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = stopsInView.length - 1;
        if (next < 0 || i < 0) return;
        e.preventDefault();
        e.stopPropagation();
        stopsInView[next]!.focus();
      }, { capture: true, signal });
    }

    // 4 · Phone-sized players: menus open as a sheet over the bottom of the player.
    const narrow = () => {
      const r = root.getBoundingClientRect();
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      // Phone-sized, or too short for a menu to rise above the dock.
      return r.width < 30 * rem || r.height < 17.5 * rem;
    };
    const placeSheet = (menu: HTMLElement) => {
      const r = root.getBoundingClientRect();
      menu.style.setProperty('--sheet-l', `${r.left + SHEET_INSET_PX}px`);
      menu.style.setProperty('--sheet-w', `${r.width - SHEET_INSET_PX * 2}px`);
      menu.style.setProperty('--sheet-b', `${window.innerHeight - r.bottom + SHEET_INSET_PX}px`);
      menu.style.setProperty('--sheet-h', `${r.height - SHEET_INSET_PX * 2}px`);
    };
    // The speed picker is a row of round keys laid over the dock row (desktop and phone alike).
    const placeOver = (menu: HTMLElement, target: HTMLElement | null) => {
      if (!target) return;
      const r = target.getBoundingClientRect();
      menu.style.setProperty('--place-l', `${r.left}px`);
      menu.style.setProperty('--place-w', `${r.width}px`);
      menu.style.setProperty('--place-b', `${window.innerHeight - r.bottom}px`);
      menu.style.setProperty('--place-h', `${r.height}px`);
    };
    const inlineTarget = () => root.querySelector<HTMLElement>('.c3-row');
    // Each stop starts at the speed key and travels out to its place, so the key visibly opens into the row;
    // nearer stops leave first. Closing runs the same path back into the key. The row is not laid out yet when it
    // opens, so the places are worked out from the row's geometry (keys 3.125em wide, .55em apart; smaller on phones).
    const setOrigins = (menu: HTMLElement) => {
      const row = inlineTarget();
      const g = trigger?.getBoundingClientRect();
      if (!row || !g) return;
      const r = row.getBoundingClientRect();
      const em = parseFloat(getComputedStyle(trigger!.parentElement!).fontSize) || 14;
      const phone = narrow();
      const size = (phone ? 2.62 : 3.125) * em;
      const gap = (phone ? 0.32 : 0.55) * em;
      const stops = [...menu.querySelectorAll<HTMLElement>('.c3-stop')].reverse(); // left to right on screen
      const total = stops.length * size + (stops.length - 1) * gap;
      const left = r.left + r.width / 2 - total / 2 + size / 2;
      const gx = g.left + g.width / 2;
      stops.forEach((stop, i) => {
        const dx = gx - (left + i * (size + gap));
        stop.style.setProperty('--fx', `${dx.toFixed(1)}px`);
        stop.style.setProperty('--fd', `${Math.min(80, Math.abs(dx) * 0.18).toFixed(0)}ms`);
      });
      // Once the row has opened, hover and press respond at once (no stagger).
      window.setTimeout(() => { for (const stop of stops) stop.style.setProperty('--fd', '0ms'); }, 650);
    };
    let openSheet: HTMLElement | null = null;
    let openInline: HTMLElement | null = null;
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (openSheet) placeSheet(openSheet); if (openInline) placeOver(openInline, inlineTarget()); });
    };
    for (const menu of root.querySelectorAll<HTMLElement>('media-menu')) {
      menu.addEventListener('open-change', (e) => {
        const open = (e as CustomEvent<{ open: boolean }>).detail.open;
        if (!open) { if (openSheet === menu) openSheet = null; if (openInline === menu) openInline = null; return; }
        const inline = menu === speedMenu;
        const sheet = narrow() && !inline;
        menu.toggleAttribute('data-sheet', sheet);
        if (sheet) { placeSheet(menu); openSheet = menu; }
        menu.toggleAttribute('data-row', inline);
        if (inline) {
          placeOver(menu, inlineTarget());
          openInline = menu;
          setOrigins(menu);
        }
      }, { signal });
    }
    window.addEventListener('resize', follow, { passive: true, signal });

    // 6 · The volume capsule opens leftwards from the key to the dock's left edge, and reads the level at its end.
    const cap = root.querySelector<HTMLElement>('.c3-cap');
    const vol = root.querySelector<HTMLElement>('.c3-vol');
    const capNum = cap?.querySelector<HTMLElement>('.cap-num');
    if (cap && vol) {
      const size = () => {
        const dockEl = root.querySelector<HTMLElement>('.c3-dock');
        if (!dockEl) return;
        const d = dockEl.getBoundingClientRect();
        const g = vol.getBoundingClientRect();
        const em = parseFloat(getComputedStyle(vol).fontSize) || 16;
        cap.style.setProperty('--cap-w', `${Math.max(10 * em, g.right - d.left - 0.1 * em).toFixed(1)}px`);
        // The capsule sits to the key's left and reaches back under it, so its right edge meets the dial's right edge.
        // Set in px: Video.js reads this offset to pick the side, and a plain length keeps it on the left.
        const k = (cap.previousElementSibling ?? vol).getBoundingClientRect();
        cap.style.setProperty('--media-popover-side-offset', `${(k.left - g.right).toFixed(1)}px`);
      };
      cap.addEventListener('beforetoggle', (e) => { if ((e as ToggleEvent).newState === 'open') size(); }, { signal });
      // While the capsule is open the controls stay up, as they do for an open menu. Without this, a pointer resting on
      // the capsule for two seconds counts as idle: the controls fade and take the capsule with them.
      type Lockable = { store?: { state?: { requestControlsLock?: () => () => void } } };
      let release: (() => void) | null = null;
      cap.addEventListener('toggle', (e) => {
        if ((e as ToggleEvent).newState === 'open') release ??= (root.closest('video-player') as Lockable | null)?.store?.state?.requestControlsLock?.() ?? null;
        else { release?.(); release = null; }
      }, { signal });
      signal.addEventListener('abort', () => release?.());
      vol.addEventListener('pointerenter', size, { signal });
      vol.addEventListener('focusin', size, { signal });
      window.addEventListener('resize', size, { passive: true, signal });
      requestAnimationFrame(size);
      const showLevel = () => {
        const m = media();
        if (!m) return;
        if (capNum) capNum.textContent = String(Math.round(m.volume * 100));
        cap.toggleAttribute('data-muted', m.muted || m.volume === 0);
      };
      // The capsule's end covers the key, so a click on it mutes or unmutes, as the key would. The key stays the
      // control for keyboards and screen readers; this end is for the pointer and is hidden from assistive tech.
      type Mutable = { store?: { state?: { setMuted?: (muted: boolean) => boolean } } };
      cap.querySelector('.cap-end')?.addEventListener('click', () => {
        const m = media();
        if (!m) return;
        const next = !(m.muted || m.volume === 0);
        const setMuted = (root.closest('video-player') as Mutable | null)?.store?.state?.setMuted;
        if (setMuted) setMuted(next);
        else { m.muted = next; if (!next && m.volume === 0) m.volume = 0.5; }
      }, { signal });
      root.addEventListener('volumechange', showLevel, { capture: true, signal });
      root.addEventListener('loadedmetadata', showLevel, { capture: true, signal });
      requestAnimationFrame(showLevel);
    }
    window.addEventListener('scroll', follow, { passive: true, capture: true, signal });
  }

  disconnectedCallback() {
    this.#abort?.abort();
    this.#abort = null;
  }
}

if (!customElements.get('iris-behavior')) customElements.define('iris-behavior', IrisBehaviorElement);
