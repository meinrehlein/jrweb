let images;
let overlay;
let overlayImg;
let currentIndex = 0;

const createOverlay = () => {
  overlay = document.createElement('div');
  overlay.id = 'img-overlay';
  overlay.innerHTML = `
    <button class="close" aria-label="close">×</button>
    <button class="prev" aria-label="previous">‹</button>
    <img />
    <button class="next" aria-label="next">›</button>
  `;
  document.body.appendChild(overlay);
  overlayImg = overlay.querySelector('img');
  overlay.querySelector('.close').addEventListener('click', closeOverlay);
  overlay.querySelector('.prev').addEventListener('click', () => navigate(-1));
  overlay.querySelector('.next').addEventListener('click', () => navigate(1));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });
};

const openOverlay = (index) => {
  if (!overlay) createOverlay();
  currentIndex = index;
  updateImage();
  overlay.classList.add('open');
};

const closeOverlay = () => {
  overlay.classList.remove('open');
};

const navigate = (dir) => {
  currentIndex = (currentIndex + dir + images.length) % images.length;
  updateImage();
};

const updateImage = () => {
  const img = images[currentIndex];
  overlayImg.src = img.src;
  overlayImg.alt = img.alt;
};

const init = () => {
  images = document.querySelectorAll('.images img');
  images.forEach((img, idx) =>
    img.addEventListener('click', () => openOverlay(idx))
  );
};

document.addEventListener('astro:page-load', init);
