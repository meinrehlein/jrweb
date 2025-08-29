// public/scripts/initVideo.js — lazy HLS attach, start paused, play on user action

function parseStart(val){
  if (val == null) return NaN;
  const s = String(val).trim(); if (!s) return NaN;
  const p = s.split(":").map(Number);
  if (p.some(Number.isNaN)) return parseFloat(s);
  if (p.length===3) return p[0]*3600 + p[1]*60 + p[2];
  if (p.length===2) return p[0]*60 + p[1];
  return p[0];
}
function normalizeHlsUrl(u){
  if (!u) return "";
  let url = String(u).trim();
  if (/^https?:\/\/stream\.mux\.com\/[^?]+$/.test(url) && !url.endsWith(".m3u8")) url += ".m3u8";
  return url;
}
function findHlsUrl(video){
  if (video.dataset.hls) return normalizeHlsUrl(video.dataset.hls);
  const hlsSource = video.querySelector('source[type="application/vnd.apple.mpegurl"], source[type="application/x-mpegURL"]');
  if (hlsSource?.src) return normalizeHlsUrl(hlsSource.src);
  const any = video.querySelector("source");
  if (any?.src) return normalizeHlsUrl(any.src);
  return normalizeHlsUrl(video.getAttribute("src") || "");
}
async function whenHlsReady(){
  const probe = document.createElement("video");
  if (probe.canPlayType?.("application/vnd.apple.mpegurl")) return { useHlsJs: false };
  if (window.Hls && window.Hls.isSupported()) return { useHlsJs: true };
  const tag = document.getElementById("hlsjs");
  if (tag && !window.Hls){
    await new Promise((res, rej) => {
      tag.addEventListener("load", res, { once:true });
      tag.addEventListener("error", rej, { once:true });
    });
  }
  return { useHlsJs: !!(window.Hls && window.Hls.isSupported()) };
}

function ensurePaused(video){
  video.autoplay = false;
  video.removeAttribute('autoplay');
  video.pause();
  // preload budget: avoid browser fetching anything until we attach
  try { video.preload = 'none'; } catch {}
}

/**
 * Lazily attach HLS only when the user actually plays.
 * - If Safari: set src on first play, wait for metadata, seek, then play.
 * - If hls.js: create with autoStartLoad:false; startLoad() only after play.
 * Optional: cap ABR by height via data-max-height (e.g., 720 / 1080).
 */
function wireLazyPlay(video, useHlsJs){
  const url = findHlsUrl(video);
  if (!url) return;

  const start = parseStart(video.dataset.startTime);
  const maxHeight = Number.isFinite(+video.dataset.maxHeight) ? +video.dataset.maxHeight : null;

  let hls;               // hls.js instance (if used)
  let attached = false;  // did we attach a source to the element?

  const attachAndPrepare = () => new Promise((resolve) => {
    if (attached) return resolve();

    if (!useHlsJs && video.canPlayType("application/vnd.apple.mpegurl")){
      // Safari native HLS: set src now, wait metadata for seeking
      video.src = url;
      const onMeta = () => {
        if (Number.isFinite(start)) {
          try { video.currentTime = start; } catch {}
        }
        resolve();
      };
      if (video.readyState >= 1) onMeta(); else video.addEventListener("loadedmetadata", onMeta, { once:true });
      attached = true;
    } else if (useHlsJs){
      // hls.js: load with autoStartLoad:false, attach, seek on metadata, then startLoad on play
      hls = new window.Hls({ autoStartLoad: false });
      hls.loadSource(url);
      hls.attachMedia(video);

      if (maxHeight && Number.isFinite(maxHeight)) {
        // cap ABR by height once levels are known
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels || [];
          // pick highest level with height <= maxHeight
          let capIndex = levels.length ? levels.length - 1 : -1;
          for (let i = 0; i < levels.length; i++){
            if (levels[i].height <= maxHeight) capIndex = i;
          }
          if (capIndex >= 0) hls.autoLevelCapping = capIndex;
        });
      }

      const onMeta = () => {
        if (Number.isFinite(start)) {
          try { video.currentTime = start; } catch {}
        }
        resolve();
      };
      if (video.readyState >= 1) onMeta(); else video.addEventListener("loadedmetadata", onMeta, { once:true });
      attached = true;
    } else {
      console.warn("HLS not supported and hls.js unavailable.");
      resolve();
    }
  });

  // First user play intent: attach, seek, then begin segment loading.
  const onFirstPlay = async (e) => {
    // prevent immediate fetch storm if we’re not attached yet:
    video.pause(); // keep it paused while we attach + seek
    await attachAndPrepare();
    // now allow network to start only when actually playing
    if (hls) hls.startLoad();
    video.play().catch(()=>{ /* gesture could be needed if not triggered by click */ });
    // remove this handler – we’re initialized
    video.removeEventListener('play', onFirstPlay);
  };
  video.addEventListener('play', onFirstPlay);

  // Loop from offset if requested
  if (video.loop && Number.isFinite(start)){
    video.addEventListener("ended", () => {
      video.currentTime = start;
      if (!video.paused) video.play().catch(()=>{});
    });
  }

  // Pause when off-screen (saves bandwidth)
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting && !video.paused) video.pause();
    }
  }, { threshold: 0.15 });
  io.observe(video);
}

async function initOne(video){
  ensurePaused(video);
  const { useHlsJs } = await whenHlsReady();
  wireLazyPlay(video, useHlsJs);
}

async function run(){
  const nodes = document.querySelectorAll("video.project-video");
  for (const v of nodes) initOne(v);
}
if (document.readyState !== "loading") run();
else document.addEventListener("DOMContentLoaded", run);
document.addEventListener("astro:page-load", run);
document.addEventListener("astro:after-swap", run);
