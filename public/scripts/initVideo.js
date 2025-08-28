// public/scripts/initVideo.js  — start paused

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

// Seek to start-time, then PAUSE (no autoplay)
function onReadyPaused(video, start){
  const go = () => {
    if (Number.isFinite(start)) {
      try { video.currentTime = start; } catch {}
    }
    // ensure paused state even if autoplay attribute exists
    video.autoplay = false;
    video.removeAttribute('autoplay');
    video.pause();
  };
  if (video.readyState >= 1) go();
  else video.addEventListener("loadedmetadata", go, { once:true });
}

function initOne(video, useHlsJs){
  // disable autoplay up-front just in case
  video.autoplay = false;
  video.removeAttribute('autoplay');

  const url = findHlsUrl(video);
  if (!url) return;
  const start = parseStart(video.dataset.startTime);

  if (!useHlsJs && video.canPlayType("application/vnd.apple.mpegurl")){
    if (!video.src) video.src = url;
    onReadyPaused(video, start);
  } else if (useHlsJs){
    const hls = new window.Hls({ startPosition: Number.isFinite(start) ? start : -1 });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(window.Hls.Events.MEDIA_ATTACHED, () => onReadyPaused(video, start));
  } else {
    console.warn("HLS not supported and hls.js unavailable.");
  }

  // If user plays and it loops, restart from offset; stay paused otherwise
  if (video.loop && Number.isFinite(start)){
    video.addEventListener("ended", () => {
      video.currentTime = start;
      if (!video.paused) video.play().catch(()=>{});
    });
  }
}

async function run(){
  const { useHlsJs } = await whenHlsReady();
  document.querySelectorAll("video.project-video").forEach(v => initOne(v, useHlsJs));
}
if (document.readyState !== "loading") run();
else document.addEventListener("DOMContentLoaded", run);
document.addEventListener("astro:page-load", run);
document.addEventListener("astro:after-swap", run);
