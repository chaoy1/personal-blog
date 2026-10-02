(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const samples = {
    1:['山窗下，写一点秋天','autumn-window','把风声、落叶和未写完的句子，一并收好。'],
    2:['代码之外，慢一点也无妨','slow-code','写完一段代码，也给生活留下一点余白。'],
    3:['在平凡的日子里拾光','daily-light','那些不起眼的片刻，也有自己的明亮。'],
    4:['一间不着急的小屋','unhurried-room','关于为什么还想认真写下这些文字。'],
    5:['沿着山路，走走停停','mountain-path','把经过的桥与远山，存进一册记忆。'],
    6:['写给路过这里的你','first-letter','山水有相逢，来日皆可期。'],
  };
  let slugTouched = false, published = false, snapshot = null, mode = 'edit', focusBeforeDialog = null;
  const seed = params.get('new') === '1' ? ['','',''] : samples[params.get('id') || '1'] || samples[1];
  [$('editor-title').value,$('editor-slug').value,$('editor-excerpt').value] = [params.get('title')??seed[0],params.get('slug')??seed[1],params.get('excerpt')??seed[2]];
  $('editor-content').value = params.get('new') === '1' ? '' : `## 一扇开着的山窗\n\n窗外的山色一天比一天淡，风却更清楚了。午后收拾案头，看见一页没有写完的纸，便想把今天也留在这里。\n\n> 文字不急着成篇，日子也不急着过去。\n\n## 关于一片落叶\n\n一片叶子落在窗边。不必问它从哪里来，只想把它的形状记住。那些细小的纹路，像一条走过很久的山路。\n\n- 记下今日的风声\n- 收好未写完的句子\n- 留一点空白给明天\n\n**慢一点也无妨。** 写字的时候，山窗一直开着。`;
  if(params.has('content'))$('editor-content').value=params.get('content');
  slugTouched = Boolean($('editor-slug').value);published = params.has('published')?params.get('published')==='true':['2','3','5','6'].includes(params.get('id'));
  const escape = text => window.adminPreview.escape(text);
  function inline(text) { return escape(text).replace(/!\[([^\]]*)\]\([^)]*\)/g,'<span class="editor-markdown-image">图片：$1（仅呈现语法）</span>').replace(/\[([^\]]+)\]\([^)]*\)/g,'<span class="editor-markdown-link">$1</span>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>'); }
  function markdown(raw) {
    let inCode=false, list=false; const out=[];
    for(const line of raw.split('\n')) {
      if(line.startsWith('```')) { if(list){out.push('</ul>');list=false;}out.push(inCode?'</code></pre>':'<pre><code>');inCode=!inCode;continue; }
      if(inCode){out.push(escape(line)+'\n');continue;}
      if(!line.startsWith('- ') && list){out.push('</ul>');list=false;}
      if(line.startsWith('### '))out.push('<h3>'+inline(line.slice(4))+'</h3>');
      else if(line.startsWith('## '))out.push('<h2>'+inline(line.slice(3))+'</h2>');
      else if(line.startsWith('# '))out.push('<h2>'+inline(line.slice(2))+'</h2>');
      else if(line.startsWith('> '))out.push('<blockquote>'+inline(line.slice(2))+'</blockquote>');
      else if(line.startsWith('- ')){if(!list){out.push('<ul>');list=true;}out.push('<li>'+inline(line.slice(2))+'</li>');}
      else if(line.trim())out.push('<p>'+inline(line)+'</p>');
    }
    if(inCode)out.push('</code></pre>');if(list)out.push('</ul>');return out.join('')||'<p>这一页还没有正文，切回编辑，从一句话开始。</p>';
  }
  function count(){return $('editor-content').value.replace(/\s/g,'').length;}
  function update() {
    $('editor-count').textContent = `${count()} 字 · ${$('editor-content').value.trim()?$('editor-content').value.trim().split(/\n\s*\n/).length:0} 段`;
    $('editor-link-hint').textContent = '/posts/'+($('editor-slug').value || '…');
    $('editor-status').textContent = published?'已发布':'草稿';
    $('editor-paper-status').textContent=published?'已刊 · 成篇':'未刊 · 待续';
    $('editor-publish-note').textContent=published?'当前已发布，保存草稿可收回公开状态。':'收为草稿，暂不出现在前台。';
    $('editor-publish').textContent=published?'更新发布 ↗':'发布文章 ↗';
    if(mode==='preview')$('editor-inline-preview').innerHTML=markdown($('editor-content').value);
  }
  function dirty(){ $('editor-save-state').textContent='手稿已改动 · 尚未保存';$('editor-error').hidden=true;update(); }
  $('editor-title').addEventListener('input',()=>{if(!slugTouched)$('editor-slug').value=$('editor-title').value.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');dirty();});
  $('editor-slug').addEventListener('input',()=>{slugTouched=true;dirty();});
  ['editor-excerpt','editor-content'].forEach(id=>$(id).addEventListener('input',dirty));
  function valid(){if(!$('editor-title').value.trim()){ $('editor-error').hidden=false;$('editor-error').textContent='请先给这篇文字起一个名字。';$('editor-title').focus();return false;}if($('editor-slug').value && !$('editor-slug').checkValidity()){ $('editor-error').hidden=false;$('editor-error').textContent='文章链接只含小写字母、数字和连字符。';$('editor-slug').focus();return false; }return true;}
  function save(nextPublished=false){if(!valid())return false;published=nextPublished;snapshot={title:$('editor-title').value,slug:$('editor-slug').value,excerpt:$('editor-excerpt').value,content:$('editor-content').value};$('editor-save-state').textContent='已保存于本页 · 刚刚';update();window.adminPreview.toast(nextPublished?'文章已发布 · 内存演示':'草稿已保存 · 内存演示');return true;}
  $('editor-save').addEventListener('click',()=>save(false));
  $('editor-form').addEventListener('submit',e=>{e.preventDefault();if(!valid())return;focusBeforeDialog=document.activeElement;$('editor-confirm-copy').textContent='“'+$('editor-title').value+'”已经准备好了。确认发布后，这篇文字会切换为已发布状态。';$('editor-confirm-slug').textContent='/posts/'+($('editor-slug').value||'自动生成');$('editor-confirm-count').textContent=count()+' 字';$('editor-publish-dialog').showModal();$('editor-publish-cancel').focus();});
  function closeDialog(){$('editor-publish-dialog').close();}
  $('editor-publish-dialog').addEventListener('close',()=>focusBeforeDialog?.focus());
  $('editor-dialog-close').addEventListener('click',closeDialog);$('editor-publish-cancel').addEventListener('click',closeDialog);$('editor-publish-accept').addEventListener('click',()=>{save(true);closeDialog();});
  $('editor-draft-preview').addEventListener('click',()=>{if(!save(false))return;const qs=new URLSearchParams({...snapshot,published:'false',id:params.get('id')||'1'});location.href='admin-article-preview-v1.html?'+qs.toString();});
  function setMode(next){mode=next;$('editor-content').hidden=next==='preview';document.querySelector('.editor-body-label').hidden=next==='preview';$('editor-inline-preview').hidden=next!=='preview';$('editor-edit-mode').setAttribute('aria-pressed',String(next==='edit'));$('editor-preview-mode').setAttribute('aria-pressed',String(next==='preview'));document.querySelectorAll('[data-md]').forEach(b=>b.disabled=next==='preview');update();}
  $('editor-edit-mode').addEventListener('click',()=>setMode('edit'));$('editor-preview-mode').addEventListener('click',()=>setMode('preview'));
  const inserts={heading:['## ','','小标题'],bold:['**','**','加粗'],italic:['*','*','斜体'],quote:['> ','','引用的文字'],link:['[','](https://)','链接文字'],code:['`','`','代码'],block:['```\n','\n```','代码块'],image:['![','](图片地址)','图片说明'],list:['- ','','列表项']};
  document.querySelectorAll('[data-md]').forEach(button=>button.addEventListener('click',()=>{const ta=$('editor-content'),[before,after,placeholder]=inserts[button.dataset.md],start=ta.selectionStart,end=ta.selectionEnd,selection=ta.value.slice(start,end)||placeholder;ta.value=ta.value.slice(0,start)+before+selection+after+ta.value.slice(end);ta.focus();ta.setSelectionRange(start+before.length,start+before.length+selection.length);dirty();}));
  $('editor-content').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const ta=e.currentTarget,start=ta.selectionStart;ta.setRangeText('  ',start,ta.selectionEnd,'end');dirty();}});
  document.querySelectorAll('.editor-tones button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.editor-tones button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('editor-writing-stage').dataset.tone=button.dataset.tone;}));
  function immersive(next){document.body.classList.toggle('editor-is-immersive',next);$('editor-immersive').textContent=next?'← 返回案头 · Esc':'专心写作';$('editor-immersive').setAttribute('aria-pressed',String(next));}
  $('editor-immersive').addEventListener('click',()=>immersive(!document.body.classList.contains('editor-is-immersive')));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('editor-publish-dialog').open)immersive(false);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(!$('editor-publish-dialog').open)save(false);}});update();
})();
