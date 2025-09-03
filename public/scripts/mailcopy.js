// Guard so we don't re-register listeners multiple times across navigations
if (!window.__copyEmailInit) {
  window.__copyEmailInit = true;

  function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);

    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  // Event delegation: 1 listener for the whole document
  async function onClick(e) {
    const target = e.target.closest('#mail,[data-copy]'); // support #mail or any element with data-copy
    if (!target) return;

    const original = target.textContent.trim();
    const toCopy = target.dataset.copy ?? original;

    try {
      await copyTextToClipboard(toCopy);
      target.classList.add('copied');
      target.textContent = 'Copied!';
      setTimeout(() => {
        target.textContent = original;
        target.classList.remove('copied');
      }, 1200);
    } catch (err) {
      console.error('Copy failed', err);
    }
  }

  function init() {
    // ensure our delegated click handler exists exactly once
    document.removeEventListener('click', onClick, false);
    document.addEventListener('click', onClick, false);
  }

  // Run once on full page load
  document.addEventListener('DOMContentLoaded', init);

  // Re-run after Astro swaps (view transitions / partial nav)
  document.addEventListener('astro:after-swap', init);
  document.addEventListener('astro:page-load', init);
}
