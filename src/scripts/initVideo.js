export default function initVideo() {
  if (window.Hls && Hls.isSupported()) {
    const video = document.getElementById('video');
    if (!video) return;
    const hls = new Hls();
    hls.loadSource(video.src);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const startTime = parseFloat(video.dataset.startTime) || 0;
      video.currentTime = startTime;
      video.pause();
    });
  } else {
    alert("Cannot stream HLS, use another video source");
  }
}