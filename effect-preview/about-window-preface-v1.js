(() => {
  const root = document.documentElement;
  const scroll = document.querySelector('.scroll');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('.chapter-index>a')];
  const headings = chapters.map(section => section.querySelector('h2'));
  const chapterNames = ['自序', '留痕', '相逢'];
  let openingTimer = 0;
  function endOpening() { scroll.classList.remove('opening'); window.clearTimeout(openingTimer); }
  function replay() {
    endOpening();
    scroll.style.setProperty('--scroll-height', `${scroll.offsetHeight}px`);
    if (reduce.matches) return;
    scroll.classList.add('motion');
    void scroll.offsetHeight;
    scroll.classList.add('opening');
    openingTimer = window.setTimeout(endOpening, 1700);
  }
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
  document.getElementById('replay-button').addEventListener('click', () => {
    window.scrollTo({top:0, behavior:'instant'});
    replay();
  });
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
    endOpening();
    if (event.key === 'Escape' && document.getElementById('site-links').hasAttribute('data-open')) {
      closeMenu();document.getElementById('nav-menu').focus();
    }
  });
  document.addEventListener('pointerdown', endOpening, {passive:true});
  document.getElementById('site-links').addEventListener('click', closeMenu);
  links.forEach((link,index) => link.addEventListener('click', event => {
    event.preventDefault();endOpening();
    history.replaceState(null,'',link.getAttribute('href'));
    headings[index].focus({preventScroll:true});
    chapters[index].scrollIntoView({block:'start',behavior:reduce.matches?'instant':'smooth'});
  }));
  const progress = document.getElementById('reading-progress');
  let queued = false;
  function readPosition() {
    queued = false;
    const rect = document.querySelector('.manuscript').getBoundingClientRect();
    const range = Math.max(1,rect.height - innerHeight * .35);
    const fraction = Math.max(0,Math.min(1,(innerHeight * .25 - rect.top)/range));
    progress.style.width = `${fraction * 100}%`;
    let index = 0;
    chapters.forEach((section,i) => {if (section.getBoundingClientRect().top < innerHeight * .45) index = i;});
    links.forEach((link,i) => {if (i===index) link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    document.getElementById('reading-status').textContent = `正在读 · ${chapterNames[index]}`;
  }
  window.addEventListener('scroll', () => {
    if (!queued) {queued=true;requestAnimationFrame(readPosition);}
  }, {passive:true});
  window.addEventListener('resize', () => {endOpening();readPosition();});
  window.addEventListener('wheel',endOpening,{passive:true});
  window.addEventListener('touchmove',endOpening,{passive:true});
  reduce.addEventListener('change',()=>{
    if(reduce.matches) {endOpening();scroll.classList.remove('motion');}
    else scroll.classList.add('motion');
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const section = entry.target;
        if(!reduce.matches) section.classList.add('arriving');
        observer.unobserve(section);
      });
    }, {threshold:.13});
    chapters.forEach(section=>{
      observer.observe(section);
      section.addEventListener('animationend',event=>{
        if(event.target.matches('.prose')) section.classList.remove('arriving');
      });
    });
  }
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
  replay();readPosition();
})();
