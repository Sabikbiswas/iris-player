import '@videojs/html/video/player';
import '@videojs/html/media/mux-video';
import '@/video/skin';
import skinTemplate from '@/video/skin.html?raw';

// What the preview plays: Wing It! (CC BY 4.0, Blender Foundation | studio.blender.org), hosted on Mux.
const PLAYBACK_ID = 'lIEE8jhRtmZTwvTyz1t5V01b4PukwZBSzXHnuxMGMtRc';
const SRC = `https://stream.mux.com/${PLAYBACK_ID}.m3u8`;
const POSTER = `https://image.mux.com/${PLAYBACK_ID}/thumbnail.webp?time=24`;
/** Tracks served from `apps/preview/public`: scene chapters, and sound captions (the film has no dialogue). */
const CHAPTERS = './wing-it-chapters.vtt';
const CAPTIONS = './wing-it-captions.vtt';

const MEDIA_PLACEHOLDER = '<!-- Add a compatible media component here. -->';

export function createPlayer(): HTMLElement {
  const player = document.createElement('video-player');
  player.setAttribute('poster', POSTER);
  player.setAttribute('content-title', 'Wing It!');

  player.innerHTML = skinTemplate.replace(
    MEDIA_PLACEHOLDER,
    `<mux-video class="vx-media" src="${SRC}" playsinline crossorigin>` +
      `<track kind="chapters" label="Chapters" srclang="en" src="${CHAPTERS}" default>` +
      `<track kind="captions" label="English (sounds)" srclang="en" src="${CAPTIONS}">` +
      `</mux-video>`
  );

  return player;
}
