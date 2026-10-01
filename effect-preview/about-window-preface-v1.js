(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function themeToggle() {
    const dark = root.dataset.theme !== 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    const button = document.getElementById('theme-button');
    button.textContent = dark ? '切换日色' : '切换夜色';
    button.setAttribute('aria-pressed', String(dark));
    const nav = document.getElementById('nav-theme');
    nav.setAttribute('aria-label', dark ? '切换到日色' : '切换到夜色');
    nav.textContent = dark ? '☾' : '☼';
  }
  document.getElementById('theme-button').addEventListener('click', themeToggle);
  document.getElementById('nav-theme').addEventListener('click', themeToggle);
  function closeMenu() {
    document.getElementById('site-links').removeAttribute('data-open');
    const button = document.getElementById('nav-menu');
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-label','展开导航');
  }
  document.getElementById('nav-menu').addEventListener('click', event => {
    const open = event.currentTarget.getAttribute('aria-expanded') !== 'true';
    event.currentTarget.setAttribute('aria-expanded', String(open));
    event.currentTarget.setAttribute('aria-label', open ? '收起导航' : '展开导航');
    document.getElementById('site-links').toggleAttribute('data-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('site-links').hasAttribute('data-open')) {
      closeMenu();document.getElementById('nav-menu').focus();
    }
  });
  document.getElementById('site-links').addEventListener('click', closeMenu);
  document.querySelectorAll('.collection').forEach(card=>{
    card.addEventListener('pointermove',event=>{
      if(reduce.matches || event.pointerType==='touch')return;
      const box=card.getBoundingClientRect();
      const x=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width));
      const y=Math.max(0,Math.min(1,(event.clientY-box.top)/box.height));
      card.style.setProperty('--rx',`${(.5-y)*1.4}deg`);
      card.style.setProperty('--ry',`${(x-.5)*1.8}deg`);
    });
    card.addEventListener('pointerleave',()=>{card.style.removeProperty('--rx');card.style.removeProperty('--ry');});
  });
  const avatar = document.querySelector('.portrait img');
  avatar.addEventListener('load',()=>{avatar.parentElement.classList.add('loaded');});
  if(avatar.complete && avatar.naturalWidth) avatar.parentElement.classList.add('loaded');
  avatar.addEventListener('error',()=>{
    avatar.hidden=true;
    avatar.parentElement.classList.remove('loaded');
    avatar.parentElement.classList.add('portrait-fallback');
  });
})();
