const applyLang = (lang) => {
  document.documentElement.setAttribute('lang', lang);
  const btn = document.getElementById('lang-toggle');
if (btn) btn.textContent = lang.toLowerCase();};

const init = () => {
  let lang = localStorage.getItem('lang') || 'de';
  applyLang(lang);
  const btn = document.getElementById('lang-toggle');
  btn?.addEventListener('click', () => {
    lang = lang === 'de' ? 'en' : 'de';
    localStorage.setItem('lang', lang);
    applyLang(lang);
  });
};

document.addEventListener('astro:page-load', init);
