const init = () => {
  const videos = document.querySelectorAll('.project video');
  videos.forEach((video) => {
    video.addEventListener('mouseenter', () => video.play());
    video.addEventListener('mouseleave', () => video.pause());

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play();
          } else {
            video.pause();
          }
        });
      }, { threshold: 1.0 });
      observer.observe(video);
    }
  });
};

document.addEventListener('astro:page-load', init);

