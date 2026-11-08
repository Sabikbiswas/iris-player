import '@/iris';

// Embed page: the host site picks the accent and corner radius in the query string,
// e.g. embed.html?accent=0D99FF&radius=12. Anything that is not a hex color or a 0–48 radius is ignored.
const params = new URLSearchParams(location.search);
const skin = document.querySelector<HTMLElement>('iris-skin')!;
const accent = params.get('accent');
if (accent && /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(accent)) skin.style.setProperty('--media-accent-color', `#${accent}`);
const radius = Number(params.get('radius'));
if (params.has('radius') && Number.isInteger(radius) && radius >= 0 && radius <= 48) skin.style.setProperty('--media-border-radius', `${radius}px`);
