// public/scripts/mobileAutoPlay.js
(function () {
  const mq = window.matchMedia('(max-width: 50em)');
  if (!mq.matches) return;

  const wrappers = Array.from(document.querySelectorAll('.video-wrapper'));
  if (!wrappers.length) return;

  // Keep track of all videos so we can pause others
  const videos = wrappers
    .map(w => w.querySelector('video.project-video'))
    .filter(Boolean);

  const pauseOthers = (except) => {
    for (const v of videos) {
      if (v !== except && !v.paused) v.pause();
    }
  };

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const wrapper = entry.target;
      const video = wrapper.querySelector('video.project-video');
      if (!video) continue;

      if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
        // Make autoplay succeed on mobile
        video.muted = true;
        // Trigger lazy attach from initVideo by calling play()
        pauseOthers(video);
        const p = video.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            // If it failed (still attaching), try once when ready
            const onReady = () => {
              video.removeEventListener('loadedmetadata', onReady);
              video.removeEventListener('canplay', onReady);
              // Only retry if still mostly visible
              const r = entry.intersectionRatio;
              if (r >= 0.75) video.play().catch(() => {});
            };
            video.addEventListener('loadedmetadata', onReady, { once: true });
            video.addEventListener('canplay', onReady, { once: true });
          });
        }
      } else {
        video.pause();
      }
    }
  }, {
    threshold: [0, 0.25, 0.5, 0.75, 1],
    rootMargin: '0px 0px -10% 0px', // small nudge to pause a bit earlier off-screen
  });

  wrappers.forEach(w => io.observe(w));

  // Re-run if Astro swaps pages
  const init = () => {
    io.disconnect();
    const w2 = document.querySelectorAll('.video-wrapper');
    w2.forEach(w => io.observe(w));
  };
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:after-swap', init);
})();
