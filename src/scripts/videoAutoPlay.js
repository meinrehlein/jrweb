const init = () => {
  if (!window.matchMedia('(max-width: 50em)').matches) return;

  const wrappers = document.querySelectorAll('.video-wrapper');
  if (!wrappers.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector('video');
      if (!video) return;

      if (entry.isIntersecting) {
        video.play();
      } else {
        video.pause();
      }
    });
  }, { threshold: 1 });

  wrappers.forEach((wrapper) => observer.observe(wrapper));
};

document.addEventListener('astro:page-load', init);
