(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const original = [
    {id:1,name:'清和',mark:'清',date:'2026.09.29',text:'从文章一路翻到这里，像走进了一间安静的书房。\n愿这方小天地，长久留住你的热爱。',replies:[{name:'博主',text:'谢谢你停下来读这些文字。山窗常开，欢迎再来。',owner:true}]},
    {id:2,name:'山间过客',mark:'山',date:'2026.09.24',text:'今天下了一场雨。读到你的山行手记，忽然也想找个周末，去走一段有风的路。',replies:[]},
    {id:3,name:'听雨',mark:'雨',date:'2026.09.18',text:'见字如面。\n把一句问候留在这里，祝你秋日安好。',replies:[]},
    {id:4,name:'远川',mark:'川',date:'2026.09.10',text:'喜欢这里的山水，也喜欢文字里慢慢展开的日常。',replies:[{name:'博主',text:'日子虽平常，记录下来便有了来处。',owner:true}]},
    {id:5,name:'木末',mark:'木',date:'2026.09.02',text:'偶然路过，读了很久。希望以后还能在这里看到新的故事。',replies:[]},
    {id:6,name:'南风',mark:'风',date:'2026.08.21',text:'不赶路的时候，看看山，写写字，也很好。',replies:[]}
  ];
  const data = structuredClone(original);
  const paperNames=['apricot','moss','moon','lotus','rose','oat'];
  let paperBag=[];
  function nextPaper() {
    if(!paperBag.length){paperBag=[...paperNames];for(let i=paperBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[paperBag[i],paperBag[j]]=[paperBag[j],paperBag[i]];}}
    return paperBag.pop();
  }
  data.forEach(item=>item.paper=nextPaper());
  let page = 1, nextId = 7, busy = false, returnFocus = null, timer = null, pendingDelete = null;
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bodyText = value => value.split('\n').map(line => `<p>${escape(line) || '<br>'}</p>`).join('');
  const pad = value => String(value).padStart(2,'0');
  const digits='〇一二三四五六七八九';
  function chineseNumber(value) {if(value<10)return digits[value];if(value<20)return '十'+(value%10?digits[value%10]:'');if(value<100)return digits[Math.floor(value/10)]+'十'+(value%10?digits[value%10]:'');return String(value).split('').map(n=>digits[Number(n)]).join('');}
  function chineseDate(value) {const [year,month,day]=value.split('.').map(Number);const yearText=String(year).split('').map(n=>digits[Number(n)]).join('')+'年';const dayText=day>20&&day<30?'廿'+(day%10?digits[day%10]:''):chineseNumber(day);return {year:yearText,day:chineseNumber(month)+'月'+dayText,full:yearText+chineseNumber(month)+'月'+dayText+'日'};}
  const today=new Date();$('composer-date').textContent=chineseDate(`${today.getFullYear()}.${pad(today.getMonth()+1)}.${pad(today.getDate())}`).full;
  function notify(text) { clearTimeout(timer);$('toast').textContent=text;$('toast').classList.add('visible');timer=setTimeout(()=>$('toast').classList.remove('visible'),3200); }
  function replyHTML(reply) { return `<div class="reply"><span class="reply-seal" aria-hidden="true">复</span><span class="reply-name">${escape(reply.name)}${reply.owner ? '<small>博主回信</small>' : '<small>访客回信</small>'}</span><p>${escape(reply.text).replace(/\n/g,'<br>')}</p></div>`; }
  function letterCraft(item, index) {
    const folio=pad((page-1)*3+index+1), gradient=`fold-${item.id}`;
    return `<span class="letter-backing" aria-hidden="true"></span><span class="letter-surface" aria-hidden="true"></span><span class="letter-folio" aria-hidden="true"><i>笺</i><b>${folio}</b></span><span class="letter-fold" aria-hidden="true"><svg viewBox="0 0 60 60"><defs><linearGradient id="${gradient}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--fold-shadow)"/><stop offset=".55" stop-color="var(--fold-paper)"/><stop offset="1" stop-color="var(--fold-light)"/></linearGradient></defs><path d="M0 60H60V0Z" fill="var(--paper)"/><path d="M0 60L60 0Q51 30 53 52Q25 44 0 60Z" fill="url(#${gradient})"/><path d="M0 60Q25 44 53 52Q51 30 60 0" fill="none" stroke="var(--line)" stroke-width=".8"/></svg></span>`;
  }
  function render() {
    const state = $('demo-state').value, guest = $('identity').value === 'guest', owner = $('identity').value === 'owner';
    const pages = Math.max(1,Math.ceil(data.length/3));page=Math.min(page,pages);
    const list=$('letter-list');const stateBox=$('list-state');const empty=state==='empty'||data.length===0;
    list.hidden=empty||state==='loading'||state==='error';stateBox.hidden=!list.hidden;
    $('total-count').textContent=pad(empty?0:data.length);
    if(list.hidden) {
      const [symbol,title,copy] = state==='loading'?['候','正在收拢来信','请稍候，山窗即将打开。']:state==='error'?['待','来信暂未送达','请重试载入，书写入口仍为你保留。']:['笺','第一封信，等你来写','留下此刻想说的话，让这里多一声问候。'];
      stateBox.innerHTML=`<span class="state-symbol" aria-hidden="true">${symbol}</span><h3>${title}</h3><p>${copy}</p>${state==='error'?'<button type="button" id="retry-list">重新收信</button>':''}`;
      stateBox.toggleAttribute('data-loading',state==='loading');
    } else {
      list.innerHTML=data.slice((page-1)*3,page*3).map((item,index)=>{const date=chineseDate(item.date);return `<article class="letter crafted-letter${item.replies.length?' has-reply':''}" data-paper="${item.paper}" data-id="${item.id}" aria-label="${escape(item.name)}的来信">${letterCraft(item,index)}<header class="letter-head"><span class="avatar" aria-hidden="true">${escape(item.mark)}</span><span class="author">${escape(item.name)}<small class="author-tag">山窗来客 · 留笺</small></span><time class="letter-postmark" datetime="${item.date.replaceAll('.','-')}" aria-label="${date.full}"><span>${date.year}</span><b>${date.day}</b><i aria-hidden="true">山窗来信</i></time></header><div class="letter-body">${bodyText(item.text)}</div><div class="replies">${item.replies.map(replyHTML).join('')}</div><footer class="letter-foot"><span>来信 / ${pad((page-1)*3+index+1)}${item.replies.length?` · ${pad(item.replies.length)} 回信`:''}</span><div class="letter-actions">${!guest?`<button class="text-action reply-toggle" type="button" aria-expanded="false" aria-controls="reply-${item.id}"><span>回信</span><b aria-hidden="true">↗</b></button>`:''}${owner?'<button class="text-action delete-button" type="button">收起</button>':''}</div></footer><form class="reply-input" id="reply-${item.id}" hidden><label class="sr-only" for="reply-text-${item.id}">回复${escape(item.name)}</label><textarea id="reply-text-${item.id}" maxlength="500" placeholder="写一封简短的回信……" required></textarea><div><small>示意回信 · 最多500字</small><button type="submit">寄出回信</button></div></form></article>`;}).join('');
    }
    document.querySelector('.pagination').hidden=list.hidden||pages<2;
    $('page-caption').textContent=`第 ${pad(page)} / ${pad(pages)} 页`;
    $('page-numbers').innerHTML=Array.from({length:pages},(_,index)=>`<button class="page-number" data-page="${index+1}" type="button" aria-label="第${index+1}页留言"${index+1===page?' aria-current="page"':''}>${pad(index+1)}</button>`).join('');
    $('prev-page').disabled=page===1;$('next-page').disabled=page===pages;
    $('write-button').hidden=guest;$('login-action').hidden=!guest;$('writing-note').textContent=guest?'登录后以你的名字落款':'以你的名字落款 · 最多 500 字';
    $('signature-name').textContent=owner?'博主':'山窗访客';
    observeLetters();
  }
  let observer;
  function observeLetters() {
    observer?.disconnect();if(reduced()||!('IntersectionObserver' in window))return;
    observer=new IntersectionObserver(items=>items.forEach(item=>{if(!item.isIntersecting)return;item.target.classList.add('arriving');item.target.addEventListener('animationend',function done(event){if(event.target!==item.target)return;item.target.classList.remove('arriving');item.target.removeEventListener('animationend',done)});observer.unobserve(item.target)}),{threshold:.12});
    document.querySelectorAll('.letter').forEach(letter=>observer.observe(letter));
  }
  function openComposer(trigger) {returnFocus=trigger;$('form-error').hidden=true;$('composer').showModal();$('message').focus();resizeMessage();}
  function resizeMessage(followTail=false) {const message=$('message'),line=parseFloat(getComputedStyle(message).lineHeight)||36;message.style.height='auto';message.style.height=Math.max(line*7,message.scrollHeight)+'px';const lines=Math.ceil(parseInt(message.style.height)/line);document.querySelector('.line-numbers').innerHTML=Array.from({length:lines},(_,i)=>chineseNumber(i+1)).join('<br>');$('char-count').textContent=`${message.value.length} / 500`;$('send-button').disabled=busy||!message.value.trim();if(followTail&&message.selectionStart===message.value.length){const paper=document.querySelector('.manuscript');paper.scrollTop=paper.scrollHeight;}}
  $('write-button').addEventListener('click',event=>openComposer(event.currentTarget));
  $('close-composer').addEventListener('click',()=>$('composer').close());
  $('composer').addEventListener('cancel',event=>{if(busy)event.preventDefault()});
  $('composer').addEventListener('close',()=>{returnFocus?.focus()});
  $('composer').addEventListener('click',event=>{const r=$('composer').getBoundingClientRect();if(!busy&&event.target===$('composer')&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))$('composer').close()});
  $('message').addEventListener('input',()=>resizeMessage(true));
  [$('composer'),$('delete-dialog')].forEach(dialog=>dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const stops=[...dialog.querySelectorAll('button:not(:disabled),textarea:not(:disabled),a[href],select:not(:disabled),[tabindex="0"]')].filter(element=>element.getClientRects().length);
    const first=stops[0],last=stops[stops.length-1];
    if(!first){event.preventDefault();dialog.focus();return;}
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }));
  $('composer-form').addEventListener('submit',event=>{
    event.preventDefault();if(busy||!$('message').value.trim())return;busy=true;$('message').readOnly=true;$('form-error').hidden=true;$('composer').setAttribute('aria-busy','true');$('send-label').textContent='寄送中…';$('send-button').disabled=true;$('close-composer').disabled=true;
    setTimeout(()=>{busy=false;$('message').readOnly=false;$('composer').removeAttribute('aria-busy');$('close-composer').disabled=false;$('send-label').textContent='寄出留言';
      if($('demo-state').value==='send-error') {$('form-error').textContent='示意寄送失败，内容已保留。切换到“来信往来”后可重试。';$('form-error').hidden=false;resizeMessage();$('message').focus();return;}
      const now=new Date();const date=`${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())}`;
      data.unshift({id:nextId++,name:$('signature-name').textContent,mark:'客',date,text:$('message').value.trim(),replies:[],paper:nextPaper()});$('message').value='';page=1;$('demo-state').value='normal';render();$('composer').close();resizeMessage();notify('信已收好 · 本页演示留言');
    },650);
  });
  $('letter-list').addEventListener('click',event=>{
    const article=event.target.closest('.letter');if(!article)return;
    if(event.target.closest('.reply-toggle')){const button=event.target.closest('.reply-toggle'),form=article.querySelector('.reply-input');form.hidden=!form.hidden;button.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)form.querySelector('textarea').focus();}
    if(event.target.closest('.delete-button')){pendingDelete=Number(article.dataset.id);returnFocus=event.target.closest('.delete-button');$('delete-dialog').showModal();}
  });
  function resetPaper(letter) {letter?.style.removeProperty('--letter-rx');letter?.style.removeProperty('--letter-ry');letter?.style.removeProperty('--letter-mx');letter?.style.removeProperty('--letter-my');}
  const hoverPointer=matchMedia('(hover:hover) and (pointer:fine)');
  $('letter-list').addEventListener('pointermove',event=>{
    if(reduced()||!hoverPointer.matches||event.pointerType==='touch')return;
    const letter=event.target.closest('.crafted-letter');if(!letter)return;
    const box=letter.getBoundingClientRect(),x=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),y=Math.max(0,Math.min(1,(event.clientY-box.top)/box.height));
    letter.style.setProperty('--letter-rx',`${(0.5-y)*1.1}deg`);letter.style.setProperty('--letter-ry',`${(x-0.5)*1.5}deg`);letter.style.setProperty('--letter-mx',`${x*100}%`);letter.style.setProperty('--letter-my',`${y*100}%`);
  });
  $('letter-list').addEventListener('pointerout',event=>{const letter=event.target.closest('.crafted-letter');if(letter&&!letter.contains(event.relatedTarget))resetPaper(letter)});
  matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',()=>document.querySelectorAll('.crafted-letter').forEach(resetPaper));
  $('letter-list').addEventListener('submit',event=>{if(!event.target.matches('.reply-input'))return;event.preventDefault();const textarea=event.target.querySelector('textarea'),text=textarea.value.trim();if(!text)return;const article=event.target.closest('.letter'),item=data.find(item=>item.id===Number(article.dataset.id));item.replies.push({name:$('signature-name').textContent,text,owner:$('identity').value==='owner'});render();const target=document.querySelector(`.letter[data-id="${item.id}"] .reply-toggle`);target?.focus();notify('回信已收好 · 本页演示');});
  $('delete-dialog').addEventListener('close',()=>{if($('delete-dialog').returnValue==='confirm'){const index=data.findIndex(item=>item.id===pendingDelete);if(index>=0)data.splice(index,1);render();$('letters-title').focus();notify('示例来信已收起')}else{returnFocus?.focus()}pendingDelete=null;});
  function turnPage(value){page=value;render();$('letters-title').focus();$('letters-title').scrollIntoView({block:'start',behavior:reduced()?'instant':'smooth'});}
  $('page-numbers').addEventListener('click',event=>{const button=event.target.closest('.page-number');if(button)turnPage(Number(button.dataset.page))});
  $('prev-page').addEventListener('click',()=>turnPage(page-1));$('next-page').addEventListener('click',()=>turnPage(page+1));
  $('demo-state').addEventListener('change',()=>{page=1;render()});$('identity').addEventListener('change',()=>{if($('composer').open)$('composer').close();render()});
  $('list-state').addEventListener('click',event=>{if(event.target.id==='retry-list'){$('demo-state').value='normal';render();notify('示例来信已重新载入')}});
  function themeToggle(){const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('theme-button').textContent=dark?'切换日色':'切换夜色';$('theme-button').setAttribute('aria-pressed',String(dark));$('nav-theme').textContent=dark?'☾':'☼';$('nav-theme').setAttribute('aria-label',dark?'切换到日色':'切换到夜色');}
  $('theme-button').addEventListener('click',themeToggle);$('nav-theme').addEventListener('click',themeToggle);
  $('nav-menu').addEventListener('click',()=>{const open=$('nav-menu').getAttribute('aria-expanded')!=='true';$('nav-menu').setAttribute('aria-expanded',String(open));$('nav-menu').setAttribute('aria-label',open?'收起导航':'展开导航');$('site-links').classList.toggle('open',open)});
  $('replay-button').addEventListener('click',()=>{document.documentElement.classList.remove('motion-ready');document.querySelectorAll('.arriving').forEach(item=>item.classList.remove('arriving'));void document.body.offsetWidth;document.documentElement.classList.add('motion-ready');observeLetters();notify(reduced()?'已减少动态效果，设计稿保持静态。':'已重播山窗与展笺效果。')});
  matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',()=>{document.querySelectorAll('.arriving').forEach(item=>item.classList.remove('arriving'));observeLetters()});
  window.addEventListener('resize',()=>{if($('composer').open)resizeMessage()});document.fonts.ready.then(()=>{if($('composer').open)resizeMessage()});
  document.documentElement.classList.add('motion-ready');render();
})();
