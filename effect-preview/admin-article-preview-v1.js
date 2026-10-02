(() => {
  'use strict';
  const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),escape=text=>window.adminPreview.escape(text);
  const samples={1:['山窗下，写一点秋天','autumn-window','把风声、落叶和未写完的句子，一并收好。'],2:['代码之外，慢一点也无妨','slow-code','写完一段代码，也给生活留下一点余白。'],3:['在平凡的日子里拾光','daily-light','那些不起眼的片刻，也有自己的明亮。'],4:['一间不着急的小屋','unhurried-room','关于为什么还想认真写下这些文字。'],5:['沿着山路，走走停停','mountain-path','把经过的桥与远山，存进一册记忆。'],6:['写给路过这里的你','first-letter','山水有相逢，来日皆可期。']};
  const id=params.get('id')||'1',sample=samples[id]||samples[1],published=params.has('published')?params.get('published')==='true':['2','3','5','6'].includes(id);
  const title=params.get('title')??sample[0],slug=params.get('slug')??sample[1],excerpt=params.get('excerpt')??sample[2];
  const content=params.get('content')??`## 一扇开着的山窗\n\n窗外的山色一天比一天淡，风却更清楚了。午后收拾案头，看见一页没有写完的纸，便想把今天也留在这里。\n\n> 文字不急着成篇，日子也不急着过去。\n\n## 关于一片落叶\n\n一片叶子落在窗边。不必问它从哪里来，只想把它的形状记住。那些细小的纹路，像一条走过很久的山路。\n\n- 记下今日的风声\n- 收好未写完的句子\n- 留一点空白给明天\n\n**慢一点也无妨。** 写字的时候，山窗一直开着。`;
  $('article-title').textContent=title;$('article-excerpt').textContent=excerpt;$('article-excerpt').hidden=!excerpt;$('article-slug').textContent='/posts/'+(slug||'…');$('article-count').textContent=content.replace(/\s/g,'').length+' 字';$('article-state').textContent=published?'已发布预览':'草稿预览';
  if(published){document.querySelector('.article-manuscript-note h3').textContent='已经成篇，再读一遍。';$('article-status-note').textContent='这篇文字处于已发布状态。预览只呈现当前保存的版本。';}
  const editUrl='admin-editor-v1.html?'+new URLSearchParams({id,title,slug,excerpt,content,published:String(published)}).toString();$('article-back-edit').href=editUrl;$('article-continue').href=editUrl;
  function inline(text){return escape(text).replace(/!\[([^\]]*)\]\([^)]*\)/g,'<span class="article-image-syntax">图片：$1（语法预览）</span>').replace(/\[([^\]]+)\]\([^)]*\)/g,'<span class="article-link">$1</span>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');}
  let code=false,list=false,n=0;const out=[],outline=[];
  for(const line of content.split('\n')){
    if(line.startsWith('```')){if(list){out.push('</ul>');list=false;}out.push(code?'</code></pre>':'<pre><code>');code=!code;continue;}
    if(code){out.push(escape(line)+'\n');continue;}
    if(!line.startsWith('- ')&&list){out.push('</ul>');list=false;}
    if(/^#{1,3} /.test(line)){const text=line.replace(/^#{1,3} /,''),anchor='article-section-'+(++n),tag=line.startsWith('### ')?'h4':'h3';out.push(`<${tag} id="${anchor}">${inline(text)}</${tag}>`);outline.push(`<a href="#${anchor}"><span>${String(n).padStart(2,'0')}</span>${escape(text)}</a>`);}
    else if(line.startsWith('> '))out.push('<blockquote>'+inline(line.slice(2))+'</blockquote>');
    else if(line.startsWith('- ')){if(!list){out.push('<ul>');list=true;}out.push('<li>'+inline(line.slice(2))+'</li>');}
    else if(line.trim())out.push('<p>'+inline(line)+'</p>');
  }
  if(code)out.push('</code></pre>');if(list)out.push('</ul>');$('article-body').innerHTML=out.join('')||'<p>这一页还没有正文，返回编辑，从一句话开始。</p>';$('article-outline').innerHTML=outline.join('')||'<a href="#article-reading">从篇名读起</a>';
})();
