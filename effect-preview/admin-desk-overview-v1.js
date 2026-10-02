(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const rows = $$('.post');
  const template = rows[0].cloneNode(true);
  const list = $('.post-list');
  const editor = $('#editor-dialog');
  const moduleDialog = $('#module-dialog');
  let filter = 'all', inTrash = false, editing = null, undo = null;
  const bodies = new Map();
  function toast(text, action) {
    $('#toast-copy').textContent = text;
    undo = action || null;
    $('#undo').hidden = !undo;
    $('.toast').hidden = false;
  }
  function showEditor(row) {
    editing = row;
    $('#draft-title').value = row?.querySelector('.post-title').textContent || '';
    $('#draft-excerpt').value = row?.querySelector('.post-copy>p').textContent || '';
    $('#draft-body').value = row ? bodies.get(row.dataset.id) || row.querySelector('.post-copy>p').textContent + '\n\n还没写完的句子，慢慢接着写。' : '';
    $('#editor-title').textContent = row ? '接着写，慢慢成篇。' : '为新文字，留一页纸。';
    $('#editor-form [type=submit]').firstChild.textContent = row?.dataset.status === 'published' ? '保存这篇 ' : '收为草稿 ';
    editor.showModal();
    $('#draft-title').focus();
  }
  function refresh() {
    cancelListMotion();
    const query = $('#search').value.trim().toLocaleLowerCase('zh-CN');
    const active = rows.filter(row => !row.dataset.trashed);
    const published = active.filter(row => row.dataset.status === 'published').length;
    const drafts = active.filter(row => row.dataset.status === 'draft');
    const trash = rows.length - active.length;
    $('#post-total').innerHTML = String(active.length).padStart(2, '0') + '<small>篇</small>';
    $('#post-summary').textContent = `已刊 ${String(published).padStart(2, '0')} · 待续 ${String(drafts.length).padStart(2, '0')}`;
    $('#trash-count').textContent = String(trash).padStart(2, '0');
    $$('.filters button').forEach(button => {
      const status = button.dataset.filter;
      button.setAttribute('aria-pressed', String(status === filter));
      button.querySelector('span').textContent = String(status === 'all' ? active.length : status === 'draft' ? drafts.length : published).padStart(2, '0');
    });
    let visible = 0;
    rows.forEach(row => {
      const matchesView = Boolean(row.dataset.trashed) === inTrash;
      const matchesStatus = inTrash || filter === 'all' || row.dataset.status === filter;
      const text = `${row.querySelector('.post-title').textContent} ${row.querySelector('.post-copy>p').textContent} ${row.dataset.slug}`.toLocaleLowerCase('zh-CN');
      row.hidden = !matchesView || !matchesStatus || !text.includes(query);
      if (!row.hidden) row.querySelector('.post-index').textContent = String(++visible).padStart(2, '0');
      const status = row.querySelector('.status');
      status.className = 'status ' + (row.dataset.trashed ? 'trashed' : row.dataset.status);
      status.textContent = row.dataset.trashed ? '已移入' : row.dataset.status === 'draft' ? '草稿' : '已发布';
      row.querySelector('.edit-post').innerHTML = row.dataset.trashed ? '恢复 <span>↗</span>' : row.dataset.status === 'draft' ? '续写 <span>↗</span>' : '编辑 <span>↗</span>';
      row.querySelector('details').hidden = Boolean(row.dataset.trashed);
    });
    $('.filters').hidden = inTrash;
    $('.empty').hidden = visible > 0;
    $('#empty-copy').textContent = inTrash && !trash ? '回收站里，暂时没有篇目。' : '没有找到符合条件的篇目。';
    $('.list-caption').hidden = visible === 0;
    $('#result-count').textContent = `显示 ${visible} / ${inTrash ? trash : active.length} 篇 · 按最近整理排列`;
    $('#archive-title').textContent = inTrash ? '回收站' : '最近整理';
    $('#trash-toggle').firstChild.textContent = inTrash ? '回到近稿 ' : '回收站 ';
    const cards = $('#draft-cards');
    cards.replaceChildren();
    drafts.slice(0, 2).forEach((row, index) => {
      const card = document.createElement('button');
      card.type = 'button';card.className = 'draft-note' + (index ? ' second-note' : '');card.dataset.edit = row.dataset.id;
      card.innerHTML = `${index ? '' : '<span class="note-tape" aria-hidden="true"></span>'}<small>手稿 / ${index ? '贰' : '壹'}</small><h3></h3><p></p><span class="note-action">接着写 <b aria-hidden="true">↗</b></span><i class="note-fold" aria-hidden="true"></i>`;
      card.querySelector('h3').textContent = row.querySelector('.post-title').textContent;
      card.querySelector('p').textContent = row.querySelector('.post-copy>p').textContent;
      cards.append(card);
    });
    if (!drafts.length) {const note = document.createElement('p');note.className = 'module-copy';note.textContent = '案头已清。想写时，另起一页。';cards.append(note);}
  }
  function restore(row) {
    delete row.dataset.trashed;row.dataset.status = 'draft';refresh();toast('这篇文字已回到待续手稿。');
  }
  list.addEventListener('click', event => {
    const row = event.target.closest('.post');
    if (!row) return;
    if (event.target.closest('.trash-post')) {
      const previous = row.dataset.status;
      row.dataset.trashed = 'true';row.querySelector('details').open = false;
      refresh();toast('已移入演示回收站。', () => {delete row.dataset.trashed;row.dataset.status = previous;refresh();toast('已撤销，篇目仍在原处。');});
    } else if (event.target.closest('.post-title,.edit-post')) {
      if (row.dataset.trashed) restore(row);else showEditor(row);
    }
  });
  $('#draft-cards').addEventListener('click', event => {const card = event.target.closest('[data-edit]');if(card) showEditor(rows.find(row => row.dataset.id === card.dataset.edit));});
  $$('.new-post').forEach(button => button.addEventListener('click', () => showEditor(null)));
  $('#editor-form').addEventListener('submit', event => {
    event.preventDefault();
    const title = $('#draft-title').value.trim();if(!title){$('#draft-title').focus();return;}
    let row = editing;
    if (!row) {
      row = template.cloneNode(true);row.dataset.id = String(Math.max(...rows.map(item => Number(item.dataset.id))) + 1);row.dataset.slug = 'new-manuscript-' + row.dataset.id;row.dataset.status = 'draft';
      row.dataset.date = '2026-10-02';row.querySelector('time').dateTime = '2026-10-02';row.querySelector('time').innerHTML = '十月二日<small>二〇二六</small>';
      rows.unshift(row);
    } else {rows.splice(rows.indexOf(row), 1);rows.unshift(row);}
    row.querySelector('.post-title').textContent = title;
    row.querySelector('.post-copy>p').textContent = $('#draft-excerpt').value.trim() || '这一篇，仍在慢慢写。';
    row.querySelector('.post-slug').textContent = '/' + row.dataset.slug;
    row.querySelector('summary').setAttribute('aria-label', title + '：更多操作');
    row.querySelector('time').dateTime = '2026-10-02';row.querySelector('time').innerHTML = '十月二日<small>二〇二六</small>';row.dataset.date = '2026-10-02';
    bodies.set(row.dataset.id, $('#draft-body').value);
    list.prepend(row);inTrash = false;filter = 'all';$('#search').value = '';refresh();revealRows();editor.close();toast('已收好这份手稿（本次演示）。');
  });
  function chooseFilter(value) {filter = value;inTrash = false;refresh();revealRows();}
  $$('.filters button').forEach(button => button.addEventListener('click', () => chooseFilter(button.dataset.filter)));
  $('#show-drafts').addEventListener('click', () => chooseFilter('draft'));
  $('[data-metric=all]').addEventListener('click', () => {$('#search').value = '';chooseFilter('all');$('#archive').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});});
  $('#trash-toggle').addEventListener('click', () => {inTrash = !inTrash;$('#search').value = '';filter = 'all';refresh();revealRows();});
  $('#clear-filter').addEventListener('click', () => {$('#search').value = '';chooseFilter('all');});
  $('#search').addEventListener('input', refresh);
  const modules = {
    moments: {title:'日常的只言片语',eyebrow:'MOMENTS / 闲语',copy:'用轻一点的方式，留下不必成篇的心绪。现有闲语管理支持编辑文字、附图和草稿暂存。',sample:'窗外有风，案头有一杯茶。今天，先把这句话留下。'},
    photos: {title:'沿途所见，收在一册',eyebrow:'FRAMES / 光影',copy:'沿用现有相册与照片管理。上传、归册、题注和排列放在同一条整理路径里。',images:true},
    profile: {title:'小屋主人，纸上落款',eyebrow:'PREFACE / 资料',copy:'头像、昵称和 Markdown 自序仍由原有资料页维护，前台关于页继续读取同一份资料。',sample:'ChoyChou · 似水流年\n写代码，也写生活。'},
  };
  $$('[data-module]').forEach(button => button.addEventListener('click', event => {
    if(button.dataset.module === 'posts') {inTrash = false;chooseFilter('all');return;}
    event.preventDefault();const item = modules[button.dataset.module];
    $('#module-title').textContent = item.title;$('#module-eyebrow').textContent = item.eyebrow;
    const content = $('#module-content');content.replaceChildren();
    const copy = document.createElement('p');copy.className = 'module-copy';copy.textContent = item.copy;content.append(copy);
    if(item.images) {const images = document.createElement('div');images.className = 'module-images';['about-ink-banner.png','guestbook-ink-banner.webp','qianli-bridge.jpg'].forEach((name,index)=>{const image = document.createElement('img');image.src='../public/bg/'+name;image.alt=['湖畔水墨景片（示例）','山窗水墨景片（示例）','青绿山水景片（示例）'][index];images.append(image);});content.append(images);}
    else {const sample=document.createElement('p');sample.className='module-sample';sample.textContent=item.sample;content.append(sample);}
    moduleDialog.showModal();
  }));
  $$('.dialog-close').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  $('#theme').addEventListener('click',event=>{const dark = document.documentElement.dataset.theme !== 'dark';document.documentElement.dataset.theme = dark ? 'dark' : 'light';event.currentTarget.setAttribute('aria-pressed',String(dark));event.currentTarget.textContent = dark ? '切换日色' : '切换夜色';});
  $('#undo').addEventListener('click',()=>{const action=undo;undo=null;if(action)action();});
  $('#dismiss-toast').addEventListener('click',()=>{$('.toast').hidden=true;undo=null;});
  document.addEventListener('keydown',event=>{
    if(event.key === '/' && !editor.open && !moduleDialog.open && !event.target.matches('input,textarea')) {event.preventDefault();$('#search').focus();}
    if(event.key === 'Escape') $$('details[open]').forEach(details=>details.open=false);
  });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const fineHover = matchMedia('(hover: hover) and (pointer: fine)');
  const listAnimations = new Map();
  function cancelListMotion() {
    listAnimations.forEach(animation => animation.cancel());
    listAnimations.clear();
  }
  function revealRows() {
    cancelListMotion();
    if (reducedMotion.matches) return;
    rows.filter(row => !row.hidden).forEach((row,index) => {
      const animation = row.animate(
        [{opacity:.35,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],
        {duration:340,delay:Math.min(index*38,152),easing:'cubic-bezier(.2,.7,.2,1)'}
      );
      listAnimations.set(row,animation);
      animation.onfinish = () => {if (listAnimations.get(row) === animation) listAnimations.delete(row);};
    });
  }
  const interactivePaper = '.post,.metric,.draft-note';
  let paperTarget = null, paperFrame = 0, pointerPosition = null;
  function clearPaperPointer() {
    if (paperFrame) cancelAnimationFrame(paperFrame);
    paperFrame = 0;
    if (paperTarget) {
      ['--mx','--my','--rx','--ry','--shade-x','--curl'].forEach(property => paperTarget.style.removeProperty(property));
    }
    paperTarget = null;
  }
  // 委托监听让新建文章与刷新后的手稿也能获得相同反馈。
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reducedMotion.matches || !fineHover.matches) return;
    const card = event.target.closest(interactivePaper);
    if (!card) {clearPaperPointer();return;}
    if (card !== paperTarget) {clearPaperPointer();paperTarget = card;}
    pointerPosition = {x:event.clientX,y:event.clientY};
    if (paperFrame) return;
    paperFrame = requestAnimationFrame(() => {
      paperFrame = 0;
      if (!paperTarget?.isConnected) {clearPaperPointer();return;}
      const box = paperTarget.getBoundingClientRect();
      const x = Math.min(1,Math.max(0,(pointerPosition.x-box.left)/box.width));
      const y = Math.min(1,Math.max(0,(pointerPosition.y-box.top)/box.height));
      paperTarget.style.setProperty('--mx',`${x*100}%`);
      paperTarget.style.setProperty('--my',`${y*100}%`);
      paperTarget.style.setProperty('--rx',`${(0.5-y)*2.4}deg`);
      paperTarget.style.setProperty('--ry',`${(x-0.5)*3}deg`);
      paperTarget.style.setProperty('--shade-x',`${(x-0.5)*8}px`);
      paperTarget.style.setProperty('--curl',`${(x+y)/2}`);
    });
  });
  document.addEventListener('pointerout', event => {
    if (!paperTarget || !paperTarget.contains(event.target)) return;
    if (event.relatedTarget instanceof Node && paperTarget.contains(event.relatedTarget)) return;
    clearPaperPointer();
  });
  reducedMotion.addEventListener('change',() => {clearPaperPointer();cancelListMotion();});
  fineHover.addEventListener('change',clearPaperPointer);
  window.addEventListener('blur',clearPaperPointer);
  refresh();
})();
