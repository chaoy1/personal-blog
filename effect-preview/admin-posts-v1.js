(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (text) => window.adminPreview.escape(String(text));
  const chineseDay = date => {const m=Number(date.slice(5,7)),d=Number(date.slice(8)),numbers=['','一','二','三','四','五','六','七','八','九','十','十一','十二'];const day=d<=10?numbers[d]:d<20?'十'+numbers[d-10]:d===20?'二十':d<30?'廿'+numbers[d-20]:d===30?'三十':'卅一';return numbers[m]+'月'+day+'日';};
  const items = [
    {id:1,title:'山窗下，写一点秋天',excerpt:'把风声、落叶和未写完的句子，一并收好。',slug:'autumn-window',published:false,date:'2026-10-02'},
    {id:2,title:'代码之外，慢一点也无妨',excerpt:'写完一段代码，也给生活留下一点余白。',slug:'slow-code',published:true,date:'2026-10-01'},
    {id:3,title:'在平凡的日子里拾光',excerpt:'那些不起眼的片刻，也有自己的明亮。',slug:'daily-light',published:true,date:'2026-09-28'},
    {id:4,title:'一间不着急的小屋',excerpt:'关于为什么还想认真写下这些文字。',slug:'unhurried-room',published:false,date:'2026-09-26'},
    {id:5,title:'沿着山路，走走停停',excerpt:'把经过的桥与远山，存进一册记忆。',slug:'mountain-path',published:true,date:'2026-09-22'},
    {id:6,title:'写给路过这里的你',excerpt:'山水有相逢，来日皆可期。',slug:'first-letter',published:true,date:'2026-09-18'},
    {id:7,title:'一页旧日的手记',excerpt:'留在回收站，仍可恢复的文字。',slug:'old-notebook',published:false,date:'2026-09-12',trashed:true},
  ];
  const params = new URLSearchParams(location.search);
  let trash = params.get('view') === 'trash';
  let pending = null, returnFocus = null;
  $('posts-search').value = params.get('q') || '';
  if (['all','draft','published'].includes(params.get('status'))) $('posts-status').value = params.get('status');
  function render() {
    const needle = $('posts-search').value.trim().toLocaleLowerCase('zh-CN');
    const inView = items.filter(p => Boolean(p.trashed) === trash);
    const visible = inView.filter(p => (!needle || `${p.title} ${p.excerpt} ${p.slug}`.toLocaleLowerCase('zh-CN').includes(needle)) && (trash || $('posts-status').value === 'all' || p.published === ($('posts-status').value === 'published')));
    visible.sort((a,b) => $('posts-sort').value === 'title' ? a.title.localeCompare(b.title,'zh-CN') : ($('posts-sort').value === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
    $('posts-list-title').textContent = trash ? '回收站' : '成篇与待续';
    $('posts-heading').textContent = trash ? '旧稿，仍可拾回。' : '文章，收在这里。';
    $('posts-status').disabled = trash;
    $('posts-trash').innerHTML = trash ? '← 返回文章' : `回收站 <span id="posts-trash-count">${String(items.filter(p=>p.trashed).length).padStart(2,'0')}</span>`;
    const active = items.filter(p=>!p.trashed);
    ['total','published','drafts'].forEach(key => { $('posts-'+key).innerHTML = String(key === 'total' ? active.length : active.filter(p => key === 'published' ? p.published : !p.published).length).padStart(2,'0') + '<span>篇</span>'; });
    $('posts-list').innerHTML = visible.map((p,i) => `<article class="paper-item posts-row" role="listitem" data-post-id="${p.id}"><span class="posts-row-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><div class="posts-row-copy"><h3><a href="admin-editor-v1.html?id=${p.id}">${esc(p.title)}</a></h3><p>${esc(p.excerpt)}</p><div class="posts-row-meta"><span class="chip">${trash?'已删除':p.published?'已发布':'草稿'}</span><span>/${esc(p.slug)}</span></div></div><time datetime="${p.date}">${chineseDay(p.date)}<small>二〇二六</small></time><div class="posts-row-ops">${trash?`<button type="button" data-restore="${p.id}">恢复草稿 ↗</button>`:`<a href="admin-editor-v1.html?id=${p.id}">${p.published?'编辑':'续写'} ↗</a><a href="admin-article-preview-v1.html?id=${p.id}">预览</a>`}<details><summary aria-label="${esc(p.title)}：更多操作">···</summary><div><button type="button" data-action="${trash?'remove':'trash'}" data-id="${p.id}">${trash?'彻底删除':'移入回收站'}</button></div></details></div></article>`).join('');
    $('posts-empty').hidden = visible.length > 0;
    $('posts-result').textContent = `显示 ${visible.length} / ${inView.length} 篇 · ${$('posts-sort').selectedOptions[0].textContent}`;
    window.adminPreview.reveal($('posts-list'));
  }
  function closeDialog() { $('posts-confirm').close(); }
  $('posts-confirm').addEventListener('close', () => { returnFocus?.focus(); pending = null; });
  $('posts-list').addEventListener('click', e => {
    const restore = e.target.closest('[data-restore]');
    if (restore) { const p = items.find(p=>p.id===Number(restore.dataset.restore));p.trashed=false;p.published=false;render();$('posts-trash').focus();window.adminPreview.toast('已恢复为草稿 · 本页演示');return; }
    const action = e.target.closest('[data-action]');
    if (!action) return;
    pending = {id:Number(action.dataset.id),action:action.dataset.action};returnFocus=action;
    const p = items.find(p=>p.id===pending.id);
    $('posts-confirm-title').textContent = pending.action === 'trash' ? '移入回收站？' : '彻底删除？';
    $('posts-confirm-copy').textContent = `“${p.title}”${pending.action === 'trash' ? '将从篇目册移出，之后可恢复为草稿。' : '将从本次演示中删除，无法恢复。'}`;
    $('posts-accept').textContent = pending.action === 'trash' ? '移入回收站' : '彻底删除';
    $('posts-confirm').showModal();$('posts-cancel').focus();
  });
  $('posts-accept').addEventListener('click', () => { if(!pending)return;const p=items.find(p=>p.id===pending.id);const message=pending.action==='trash'?'已移入回收站':'已彻底删除';if(pending.action==='trash')p.trashed=true;else items.splice(items.indexOf(p),1);closeDialog();render();$('posts-trash').focus();window.adminPreview.toast(message+' · 本页演示'); });
  $('posts-cancel').addEventListener('click',closeDialog);$('posts-dialog-close').addEventListener('click',closeDialog);
  $('posts-filters').addEventListener('submit',e=>e.preventDefault());
  ['posts-search','posts-status','posts-sort'].forEach(id=>$(id).addEventListener(id==='posts-search'?'input':'change',render));
  function reset() { $('posts-search').value='';$('posts-status').value='all';render(); }
  $('posts-reset').addEventListener('click',reset);$('posts-trash').addEventListener('click',()=>{trash=!trash;reset();});
  $('posts-refresh').addEventListener('click',()=>{render();window.adminPreview.toast('篇目已重新排列 · 保留本页演示操作');});render();
})();
