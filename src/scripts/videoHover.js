const init = () => {
  const videos = document.querySelectorAll('.hover-video');
  videos.forEach((vid) => {
    vid.addEventListener('mouseenter', () => {
      vid.play();
    });
    vid.addEventListener('mouseleave', () => {
      vid.pause();
    });
  });
};

document.addEventListener('astro:page-load', init);
