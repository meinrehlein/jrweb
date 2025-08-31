function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
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

function initCopyHandler() {
  const emailNode = document.getElementById('mail');
  if (emailNode) {
    emailNode.addEventListener('click', async () => {
      const email = emailNode.textContent.trim();
      try {
        await copyTextToClipboard(email);
        emailNode.classList.add('copied');
        const original = email;
        emailNode.textContent = 'Copied!';
        setTimeout(() => {
          emailNode.textContent = original;
          emailNode.classList.remove('copied');
        }, 1200);
      } catch (e) {
        console.error('Copy failed', e);
      }
    });
  }
}

// Run once on DOM ready
document.addEventListener('DOMContentLoaded', initCopyHandler);

// Re-run on Astro navigation
document.addEventListener('astro:after-swap', initCopyHandler);
document.addEventListener('astro:page-load', initCopyHandler);
