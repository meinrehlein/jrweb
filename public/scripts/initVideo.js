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
function parseResume(val){
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : NaN;
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

// Eagerly fetch the poster so it displays without delay
function primePoster(video){
  try {
    const poster = video.getAttribute('poster');
    if (!poster) return;
    if (video.dataset.posterPrimed === '1') return;
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = poster;
    video.dataset.posterPrimed = '1';
  } catch {}
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
        const resume = parseResume(video.dataset.resumeTime);
        const target = Number.isFinite(resume) ? resume : start;
        if (Number.isFinite(target)) { try { video.currentTime = target; } catch {} }
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
        const resume = parseResume(video.dataset.resumeTime);
        const target = Number.isFinite(resume) ? resume : start;
        if (Number.isFinite(target)) { try { video.currentTime = target; } catch {} }
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
    startNetwork: () => {
      if (hls) {
        hls.startLoad();
      } else {
        try {
          // For native HLS (Safari), avoid calling load() once frame is ready to prevent poster resets
          if (video.readyState < 2 && video.dataset.safariMetaLoaded !== '1') {
            video.preload = 'metadata';
            video.load();
            video.dataset.safariMetaLoaded = '1';
          }
        } catch {}
      }
    },
  };
}

/***** hover preview + mute toggle *****/
function setupHover(wrapper, video, api){
  const button = wrapper.querySelector('.mute-toggle');
  video.muted = true; // hover needs muted for autoplay policy

  let enterT = null, leaveT = null, wanted = false;
  // Only enable hover-to-play on desktop (devices that support hover + fine pointer)
  const canHover = (() => {
    try {
      return (
        window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
        (window.matchMedia('(any-hover: hover)').matches && !window.matchMedia('(pointer: coarse)').matches)
      );
    } catch { return false; }
  })();

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

  if (canHover) {
    wrapper.addEventListener('pointerenter', onEnter);
    wrapper.addEventListener('pointerleave', onLeave);
  }

  if (button) {
    button.addEventListener('click', () => {
      video.muted = !video.muted;
      button.textContent = video.muted ? 'unmute' : 'mute';
      if (!video.muted && wanted && video.paused) video.play().catch(()=>{});
    });
  }

  const io = new IntersectionObserver((entries) => {
    const e = entries[0];
    if (!e) return;
    if (!e.isIntersecting) {
      wanted = false;
      video.pause();
    }
  }, { threshold: [0, 0.1] });
  io.observe(wrapper);
}

/***** boot *****/
async function initOne(wrapper){
  const video = wrapper.querySelector('video.project-video');
  if (!video) return;

  ensurePaused(video);
  // Stable poster overlay: show until the first frame is ready, then keep video visible
  const posterUrl = video.getAttribute('poster') || '';
  const isSafari = (() => {
    try { return /^((?!chrome|android).)*safari/i.test(navigator.userAgent); } catch { return false; }
  })();
  const showBg = () => {
    if (!posterUrl) return;
    if (wrapper.dataset.bg === '1') return;
    wrapper.style.backgroundImage = `url(${posterUrl})`;
    wrapper.style.backgroundSize = 'cover';
    wrapper.style.backgroundPosition = 'center';
    wrapper.style.backgroundRepeat = 'no-repeat';
    wrapper.dataset.bg = '1';
  };
  const hideBg = () => {
    if (wrapper.dataset.bg !== '1') return;
    wrapper.style.backgroundImage = 'none';
    wrapper.dataset.bg = '0';
  };
  try { showBg(); } catch {}
  // As soon as we can paint a frame, remove the bg and drop poster attr (Safari stop reverting to poster)
  video.addEventListener('canplay', () => {
    try {
      if (video.readyState >= 2) {
        hideBg();
        if (isSafari && video.hasAttribute('poster')) video.removeAttribute('poster');
      }
    } catch {}
  }, { once: true });
  primePoster(video);
  const hlsEnv = await whenHlsReady();
  const api = attachLazy(video, hlsEnv);

  // Eager: attach HLS when in view; start network when mostly visible
  try {
    const eagerIO = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      if (e.isIntersecting) {
        // Ensure HLS attached and resume time restored
        api?.ensureAttached?.().then(() => {
          const r = parseResume(video.dataset.resumeTime);
          if (Number.isFinite(r)) {
            try { video.currentTime = r; } catch {}
          }
          // If frame is available, keep video visible
          try { if (video.readyState >= 2) hideBg(); } catch {}
        });
        // Safari (native HLS) hint
        try {
          if (!hlsEnv.useHlsJs) {
            // Only nudge Safari once and only before first frame to avoid resets
            if (video.readyState < 2 && video.dataset.safariMetaLoaded !== '1') {
              video.preload = 'metadata';
              video.load();
              video.dataset.safariMetaLoaded = '1';
            }
          }
        } catch {}
        if (e.intersectionRatio >= 0.6) {
          api?.startNetwork?.();
        }
        // When back on screen, keep poster until actual play to avoid flash; video covers bg anyway
      }
      // Only when completely off-screen, switch the wrapper back to the poster
      if (e.intersectionRatio === 0) {
        // Save resume time and pause — do NOT show poster again after first hide
        try { video.dataset.resumeTime = String(video.currentTime || 0); } catch {}
        try { if (!video.paused) video.pause(); } catch {}
      }
    }, { threshold: [0, 0.1, 0.25, 0.6, 1], rootMargin: '10% 0px' });
    eagerIO.observe(wrapper);
  } catch {}

  // Persist resume time whenever user/system pauses
  try {
    video.addEventListener('pause', () => {
      try { video.dataset.resumeTime = String(video.currentTime || 0); } catch {}
    });
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
