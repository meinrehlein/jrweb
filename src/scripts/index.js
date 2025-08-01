import gsap from 'gsap';

let lines;
let textSliders;
let gridContainer;
let gridItems;
let hasPreloaderComponent;
let animationTimeline;

const initializeVariables = () => {
  lines = document.querySelectorAll('hr');
  textSliders = document.querySelectorAll('header .oh > .oh__inner');
  gridContainer = document.querySelector('[data-grid]');
  gridItems = gridContainer ? Array.from(gridContainer.children) : [];
  hasPreloaderComponent = document.querySelector('.loading');
};

const animateHomepageElements = () => {
  if (!gridContainer || !gridItems.length) return;

  animationTimeline = gsap.set(gridContainer, { autoAlpha: 0 });

  gsap.timeline({
    defaults: {
      duration: 1.4,
      ease: 'power4',
    },
    onComplete: () => {
      const event = new CustomEvent('gridRendered');
      document.dispatchEvent(event);
    },
  })
    .fromTo(
      lines,
      { transformOrigin: '0% 50%', scaleX: 0 },
      { duration: 1.6, ease: 'power2', stagger: 0.9, scaleX: 1 }
    )
    .from(textSliders, { yPercent: 100, stagger: 0.1 }, 0.2)
    .set(gridContainer, { autoAlpha: 1 }, '<+=1')
    .from(gridItems, { yPercent: 100, stagger: 0.08 }, '<')
    .from(gridItems, { ease: 'sine', autoAlpha: 0, stagger: 0.08 }, '<');
};

const cleanup = () => {
  if (animationTimeline) {
    animationTimeline.kill();
    animationTimeline = null;
  }
  lines = null;
  textSliders = null;
  gridContainer = null;
  gridItems = null;
  hasPreloaderComponent = null;
};

const init = () => {
  initializeVariables();

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  if (hasPreloaderComponent && sessionStorage.getItem('preloadComplete') !== 'true') {
    document.addEventListener('assetsLoaded', animateHomepageElements, { once: true });
  } else {
    animateHomepageElements();
  }
};

// 🔁 No longer restricted to the "home" page
document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', cleanup);
