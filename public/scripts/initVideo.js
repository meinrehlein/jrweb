// public/scripts/initVideo.js — lazy HLS attach + hover preview + safe bandwidth

/***** helpers *****/
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

  // already present?
  if (window.Hls && window.Hls.isSupported()) return { useHlsJs: true };

  // load (or wait for) hls.js
  let tag = document.getElementById("hlsjs");
  if (!tag) {
    tag = document.createElement("script");
    tag.id = "hlsjs";
    tag.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.11/dist/hls.min.js";
    tag.defer = true;
    document.head.appendChild(tag);
  }
  await new Promise((res, rej) => {
    tag.addEventListener("load", res, { once:true });
    tag.addEventListener("error", rej, { once:true });
  });
  return { useHlsJs: !!(window.Hls && window.Hls.isSupported()) };
}
function ensurePaused(video){
  video.autoplay = false;
  video.removeAttribute('autoplay');
  try { video.preload = 'none'; } catch {}
  try { video.playsInline = true; video.setAttribute('playsinline',''); } catch {}
  video.pause();
}

/***** core: lazy attach + controls *****/
function attachLazy(video, { useHlsJs }){
  const url = findHlsUrl(video);
  if (!url) return;

  const start = parseStart(video.dataset.startTime);
  const maxHeight = Number.isFinite(+video.dataset.maxHeight) ? +video.dataset.maxHeight : null;

  let hls = null;
  let attached = false;

  const attachAndPrepare = () => new Promise((resolve) => {
    if (attached) return resolve();

    if (!useHlsJs && video.canPlayType("application/vnd.apple.mpegurl")){
      // Safari native HLS
      video.src = url;
      const onMeta = () => {
        if (Number.isFinite(start)) { try { video.currentTime = start; } catch {} }
        resolve();
      };
      if (video.readyState >= 1) onMeta(); else video.addEventListener("loadedmetadata", onMeta, { once:true });
      attached = true;
    } else if (useHlsJs){
      hls = new window.Hls({
       autoStartLoad: false,
       capLevelToPlayerSize: true,  // 👈 keep renditions at/below element size
       maxBufferLength: 10,         // 👈 avoid buffering too much ahead
       maxMaxBufferLength: 20
  });
  hls.loadSource(url);
  hls.attachMedia(video);

      if (maxHeight && Number.isFinite(maxHeight)) {
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels || [];
          let capIndex = levels.length ? levels.length - 1 : -1;
          for (let i = 0; i < levels.length; i++){
            if (levels[i].height <= maxHeight) capIndex = i;
          }
          if (capIndex >= 0) hls.autoLevelCapping = capIndex;
        });
      }

      const onMeta = () => {
        if (Number.isFinite(start)) { try { video.currentTime = start; } catch {} }
        resolve();
      };
      if (video.readyState >= 1) onMeta(); else video.addEventListener("loadedmetadata", onMeta, { once:true });
      attached = true;
    } else {
      console.warn("HLS not supported and hls.js unavailable.");
      resolve();
    }
  });

  // First real play: attach then start loading (do NOT pause first)
  const onFirstPlay = async () => {
    await attachAndPrepare();          // keep user gesture alive while attaching
    if (hls) hls.startLoad();          // begin fetching segments
    if (video.paused) video.play().catch(()=>{});
    video.removeEventListener('play', onFirstPlay);
  };
  video.addEventListener('play', onFirstPlay);

  // Loop from offset if needed
  if (video.loop && Number.isFinite(start)){
    video.addEventListener("ended", () => {
      video.currentTime = start;
      if (!video.paused) video.play().catch(()=>{});
    });
  }

  // Pause when off-screen
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting && !video.paused) video.pause();
    }
  }, { threshold: 0.15 });
  io.observe(video);

  // small API for hover logic
  return {
    ensureAttached: attachAndPrepare,
    startNetwork: () => { if (hls) hls.startLoad(); },
  };
}

/***** hover preview + mute toggle *****/
function setupHover(wrapper, video, api){
  const button = wrapper.querySelector('.mute-toggle');
  video.muted = true; // hover needs muted for autoplay policy

  let enterT = null, leaveT = null, wanted = false;

  const tryPlay = () => {
    const p = video.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {
        const onReady = () => {
          video.removeEventListener('loadedmetadata', onReady);
          video.removeEventListener('canplay', onReady);
          if (wanted) video.play().catch(()=>{});
        };
        video.addEventListener('loadedmetadata', onReady, { once:true });
        video.addEventListener('canplay', onReady, { once:true });
      });
    }
  };

  const onEnter = async () => {
    clearTimeout(leaveT);
    enterT = setTimeout(async () => {
      wanted = true;
      video.muted = true;
      await api.ensureAttached();
      api.startNetwork?.();
      tryPlay();
    }, 60);
  };

  const onLeave = () => {
    clearTimeout(enterT);
    wanted = false;
    leaveT = setTimeout(() => { video.pause(); }, 120);
  };

  wrapper.addEventListener('pointerenter', onEnter);
  wrapper.addEventListener('pointerleave', onLeave);

  if (button) {
    button.addEventListener('click', () => {
      video.muted = !video.muted;
      button.textContent = video.muted ? 'unmute' : 'mute';
      if (!video.muted && wanted && video.paused) video.play().catch(()=>{});
    });
  }

  const io = new IntersectionObserver((entries) => {
    if (entries[0] && !entries[0].isIntersecting) {
      wanted = false;
      video.pause();
    }
  }, { threshold: 0.1 });
  io.observe(wrapper);
}

/***** boot *****/
async function initOne(wrapper){
  const video = wrapper.querySelector('video.project-video');
  if (!video) return;

  ensurePaused(video);
  const hlsEnv = await whenHlsReady();
  const api = attachLazy(video, hlsEnv);

  // Eager: attach HLS when in view; start network when mostly visible
  try {
    const eagerIO = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      if (e.isIntersecting) {
        api?.ensureAttached?.();
        if (e.intersectionRatio >= 0.6) {
          api?.startNetwork?.();
        }
      }
    }, { threshold: [0, 0.25, 0.6, 1], rootMargin: '10% 0px' });
    eagerIO.observe(wrapper);
  } catch {}

  setupHover(wrapper, video, api || {});
}

async function run(){
  const wrappers = document.querySelectorAll(".video-wrapper");
  for (const w of wrappers) initOne(w);
}

if (document.readyState !== "loading") run();
document.addEventListener("DOMContentLoaded", run);
document.addEventListener("astro:page-load", run);
document.addEventListener("astro:after-swap", run);
