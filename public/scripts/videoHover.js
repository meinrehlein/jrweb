const init = () => {
  const wrappers = document.querySelectorAll('.video-wrapper');
  wrappers.forEach((wrapper) => {
    const video = wrapper.querySelector('video');
    const button = wrapper.querySelector('.mute-toggle');
    if (!video || !button) return;

    wrapper.addEventListener('mouseenter', () => video.play());
    wrapper.addEventListener('mouseleave', () => {
      video.pause();
    });

    button.addEventListener('click', () => {
      video.muted = !video.muted;
      button.textContent = video.muted ? 'unmute' : 'mute';
    });
  });
};
if (document.readyState !== 'loading') init();
document.addEventListener('DOMContentLoaded', init);
document.addEventListener('astro:page-load', init);

