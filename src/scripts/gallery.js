  let currentIndex = 0;
  const images = Astro.glob ? Object.values(Astro.glob('./public/images/uploads/*')) : [];

  function openGallery(index) {
    const modal = document.getElementById('gallery-modal');
    const modalImg = document.getElementById('gallery-modal-img');
    const caption = document.getElementById('gallery-modal-caption');
    const imgElements = document.querySelectorAll('.gallery-thumb');
    currentIndex = index;
    modal.style.display = "flex";
    modalImg.src = imgElements[index].src;
    caption.innerText = imgElements[index].alt;
    document.body.style.overflow = "hidden";
  }

  function closeGallery(e) {
    if (e.target.classList.contains('gallery-modal') || e.target.classList.contains('gallery-close')) {
      document.getElementById('gallery-modal').style.display = "none";
      document.body.style.overflow = "";
    }
  }