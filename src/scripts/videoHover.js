const init = () => {
  const videos = document.querySelectorAll('.project video');
  videos.forEach((video) => {
    const container = video.closest('.project');
    const toggle = container?.querySelector('.mute-toggle');

    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        toggle.textContent = video.muted ? 'Unmute' : 'Mute';
      });
    }

    video.addEventListener('mouseenter', () => video.play());
    video.addEventListener('mouseleave', () => video.pause());
  });
};

document.addEventListener('astro:page-load', init);

