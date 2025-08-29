// public/scripts/initVideo.js — lazy HLS attach + hover preview + active-stream limit

/******** helpers ********/
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
async function loadHlsJs(){
  const probe = document.createElement("video");
  if (probe.canPlayType?.("application/vnd.apple.mpegurl")) return { useHlsJs:false };
  if (window.Hls && window.Hls.isSupported()) return { useHlsJs:true };
  let tag = document.getElementById("hlsjs");
  if (!tag){
    tag = document.createElement("script");
    tag.id = "hlsjs";
    tag.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.11/dist/hls.min.js";
    tag.defer = true;
    document.head.appendChild(tag);
  }
  await new Promise((res, rej)=>{ tag.addEventListener("load", res, {once:true}); tag.addEventListener("error", rej, {once:true}); });
  return { useHlsJs: !!(window.Hls && window.Hls.isSupported()) };
}
function ensurePaused(video){
  video.autoplay = false;
  video.removeAttribute('autoplay');
  try { video.preload = 'none'; } catch {}
  try { video.playsInline = true; video.setAttribute('playsinline',''); } catch {}
  video.pause();
}

/******** active-stream limiter ********/
const ActiveStreams = (() => {
  const list = []; // queue of controllers (oldest first)
  const LIMIT = 2; // tweak as you like
  const has = (c)=> list.includes(c);
  const remove = (c)=> { const i=list.indexOf(c); if (i>=0) list.splice(i,1); };
  return {
    claim(ctrl){
      if (has(ctrl)) return;
      list.push(ctrl);
      while (list.length > LIMIT){
        const oldest = list.shift();
        oldest?.pauseAndUnload?.();
      }
    },
    release(ctrl){ remove(ctrl); },
    releaseAll(){ for (const c of [...list]) c?.pauseAndUnload?.(); list.length = 0; }
  };
})();

/******** core attach ********/
function attachLazy(video, { useHlsJs }){
  const url = findHlsUrl(video);
  if (!url) return;

  const start = parseStart(video.dataset.startTime);
  const maxHeight = Number.isFinite(+video.dataset.maxHeight) ? +video.dataset.maxHeight : null;

  let hls = null;
  let attached = false;
  let usingHlsJs = false;

  const attachAndPrepare = () => new Promise((resolve) => {
    if (attached) return resolve();

    if (!useHlsJs && video.canPlayType("application/vnd.apple.mpegurl")){
      // Safari native HLS
      video.src = url;
      const onMeta = () => { if (Number.isFinite(start)) { try { video.currentTime = start; } catch {} } resolve(); };
      if (video.readyState >= 1) onMeta(); else video.addEventListener("loadedmetadata", onMeta, { once:true });
      attached = true; usingHlsJs = false;
    } else if (useHlsJs){
      usingHlsJs = true;
      hls = new window.Hls({
        autoStartLoad: false,
        capLevelToPlayerSize: true,
        maxBufferLength: 10,
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

      const onMeta = () => { if (Number.isFinite(start)) { try { video.currentTime = start; } catch {} } resolve(); };
      if (video.readyState >= 1) onMeta(); else video.addEventListener("loadedmetadata", onMeta, { once:true });
      attached = true;
    } else {
      console.warn("HLS not supported and hls.js unavailable.");
      resolve();
    }
  });

  const startNetwork = () => { if (hls) hls.startLoad(); };

  const pauseAndUnload = () => {
    try { video.pause(); } catch {}
    if (usingHlsJs && hls){
      try { hls.stopLoad(); } catch {}
      try { hls.detachMedia(); } catch {}
      try { hls.destroy(); } catch {}
      hls = null; attached = false;
    } else {
      // Safari native: remove src to stop fetching
      try { video.removeAttribute('src'); video.load(); } catch {}
      attached = false;
    }
  };

  // Loop from offset if needed
  if (video.loop && Number.isFinite(start)){
    video.addEventListener("ended", () => {
      video.currentTime = start;
      if (!video.paused) video.play().catch(()=>{});
    });
  }

  // Pause/unload when wrapper goes off-screen (set up in initOne with api in scope)
  const screenIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting){
        try { video.pause(); } catch {}
      }
    }
  }, { threshold: 0.15 });
  screenIO.observe(video);

  return { ensureAttached: attachAndPrepare, startNetwork, pauseAndUnload, get attached(){ return attached; } };
}

/******** interactions ********/
function setupHoverAndClick(wrapper, video, api){
  // Click/tap to start
  const kick = async () => {
    await api.ensureAttached();
    api.startNetwork?.();
    video.muted = true;
    ActiveStreams.claim(api);
    video.play().catch(()=>{});
  };
  wrapper.addEventListener('pointerdown', kick, { once:true });
  video.addEventListener('click', kick, { once:true });

  // Hover preview (muted) — desktop
  let enterT=null, leaveT=null, wanted=false;
  const onEnter = async () => {
    clearTimeout(leaveT);
    enterT = setTimeout(async ()=>{
      wanted = true;
      video.muted = true;
      await api.ensureAttached();
      api.startNetwork?.();
      ActiveStreams.claim(api);
      video.play().catch(()=>{});
    }, 60);
  };
  const onLeave = () => {
    clearTimeout(enterT);
    wanted = false;
    leaveT = setTimeout(()=>{
      video.pause();
      api.pauseAndUnload?.();
      ActiveStreams.release(api);
    }, 120);
  };
  wrapper.addEventListener('pointerenter', onEnter);
  wrapper.addEventListener('pointerleave', onLeave);

  // Unload when wrapper fully off-screen
  const io = new IntersectionObserver((entries)=>{
    const e = entries[0];
    if (!e) return;
    if (!e.isIntersecting){
      video.pause();
      api.pauseAndUnload?.();
      ActiveStreams.release(api);
    }
  }, { threshold:[0, 0.1] });
  io.observe(wrapper);
}

/******** boot ********/
async function initOne(wrapper){
  const video = wrapper.querySelector('video.project-video');
  if (!video) return;

  ensurePaused(video);
  const env = await loadHlsJs();
  const api = attachLazy(video, env);
  if (!api) return;

  // Eager: attach when visible, start network only when mostly visible (saves data)
  const eagerIO = new IntersectionObserver((entries)=>{
    const e = entries[0];
    if (!e) return;
    if (e.isIntersecting){
      api.ensureAttached?.();
      if (e.intersectionRatio >= 0.85){
        api.startNetwork?.();
        ActiveStreams.claim(api);
      }
    } else {
      api.pauseAndUnload?.();
      ActiveStreams.release(api);
    }
  }, { threshold:[0, 0.5, 0.85, 1], rootMargin:'10% 0px' });
  eagerIO.observe(wrapper);

  setupHoverAndClick(wrapper, video, api);
}

function run(){
  document.querySelectorAll(".video-wrapper").forEach(initOne);
}
if (document.readyState !== "loading") run();
document.addEventListener("DOMContentLoaded", run);
document.addEventListener("astro:page-load", run);
document.addEventListener("astro:after-swap", run);
