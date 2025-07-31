const init = () => {
  const wrappers = document.querySelectorAll('.video-wrapper');
  wrappers.forEach((wrapper) => {
    const video = wrapper.querySelector('video');
    const button = wrapper.querySelector('.mute-toggle');
    if (!video || !button) return;

    wrapper.addEventListener('mouseenter', () => video.play());
    wrapper.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
    });

    button.addEventListener('click', () => {
      video.muted = !video.muted;
      button.textContent = video.muted ? 'Mute' : 'Unmute';
    });
  });
};

document.addEventListener('astro:page-load', init);

