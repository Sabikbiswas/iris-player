/**
 * Iris as one drop-in element. Load this module once, then wrap any Video.js media element:
 *
 *   <media-i18n><video-player>
 *     <iris-skin>
 *       <mux-video src="https://stream.mux.com/PLAYBACK_ID.m3u8" playsinline crossorigin></mux-video>
 *     </iris-skin>
 *   </video-player></media-i18n>
 *
 * It brings the Video.js player, the Mux media element, every control Iris uses, and its styles.
 */
import '@videojs/html/i18n';
import '@videojs/html/video/player';
import '@videojs/html/media/mux-video';
import './video/elements';
import css from './video/skin.css?inline';
import template from './video/skin.html?raw';

const MEDIA_PLACEHOLDER = '<!-- Add a compatible media component here. -->';
let count = 0;

function injectStyles(): void {
  if (document.getElementById('iris-skin-styles')) return;
  const style = document.createElement('style');
  style.id = 'iris-skin-styles';
  style.textContent = `iris-skin{display:contents}\n${css}`;
  document.head.append(style);
}

export class IrisSkinElement extends HTMLElement {
  connectedCallback(): void {
    if (this.hasAttribute('data-iris-ready')) return;
    this.setAttribute('data-iris-ready', '');
    injectStyles();

    // The media the page put inside: a <video>, <mux-video> or any Video.js media element, with its tracks.
    const media = [...this.children];
    // Template ids link buttons to their menus and tooltips; suffix them so several players can share a page.
    const suffix = (++count).toString(36);
    this.innerHTML = template
      .replace(/\b(id|trigger|commandfor)="(vx[^"]+)"/g, (_m, attr: string, value: string) => `${attr}="${value}-${suffix}"`)
      .replace(MEDIA_PLACEHOLDER, '<span data-iris-media></span>');

    const slot = this.querySelector('[data-iris-media]')!;
    for (const element of media) {
      element.classList.add('vx-media');
      slot.before(element);
    }
    slot.remove();
  }
}

if (!customElements.get('iris-skin')) customElements.define('iris-skin', IrisSkinElement);
