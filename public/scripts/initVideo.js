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
    } else if (useHls
