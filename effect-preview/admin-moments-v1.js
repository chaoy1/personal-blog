(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const toast = (message) => window.adminPreview?.toast(message);
  const image = '../public/bg/qianli-bridge.jpg';
  const examples = [
    ['笺一', '2026-10-02', '窗外的桂花又开了。\n晚饭后散步，连风里也有一点甜。', [], 'sage'],
    ['笺二', '2026-10-01', '翻过一页山水，也就走过一个下午。\n今天没有远行，心里却很宽。', [{ url: image, name: '山水之间 · 示例配图' }], 'ochre'],
    ['笺三', '2026-09-28', '给桌上的绿植浇了水。\n也给自己留一段不用赶路的时间。', [], 'clay'],
    ['笺四', '2026-09-26', '代码终于跑通。合上电脑，看见天边还有最后一点晚霞。', [], 'ink'],
    ['笺五', '2026-09-22', '山路上的每一次停步，都有自己的理由。', [{ url: image, name: '远山 · 示例配图' }], 'sage'],
    ['笺六', '2026-09-18', '雨停以后，树叶把整个街角擦亮了。', [], 'ochre'],
    ['笺七', '2026-09-15', '买了一本空白的笔记。第一页只写了日期，也很好。', [], 'clay'],
    ['笺八', '2026-09-12', '有些话不必等到想清楚。先记下来，来日再读。', [], 'ink'],
  ];
  let moments = examples.map(([id, date, content, images, tone]) => ({ id, date, content, images, tone }));
  let page = 1;
  const pageSize = 4;
  let editingId = null;
  let selectedImages = [];
  let baseline = { content: '', images: [] };
  const objectUrls = new Set();
  const removals = new Map();
  let confirmAction = null;
  const node = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
  const cn = (number) => number < 10 ? '零一二三四五六七八九'[number] : number === 10 ? '十' : number < 20 ? `十${cn(number % 10)}` : `${cn(Math.floor(number / 10))}十${number % 10 ? cn(number % 10) : ''}`;
  function dateParts(date) { const [, month, day] = date.split('-').map(Number); return `${cn(month)}月${cn(day)}日`; }
  function dateYear(date) { return date.slice(0, 4).split('').map((digit) => '〇一二三四五六七八九'[Number(digit)]).join(''); }
  function ask(title, description, label, action) {
    $('moment-confirm-title').textContent = title;
    $('moment-confirm-description').textContent = description;
    $('moment-confirm-yes').textContent = label;
    confirmAction = action;
    $('moment-confirm').showModal();
    $('moment-confirm-no').focus();
  }
  function closeDialog() { confirmAction = null; $('moment-confirm').close(); }
  $('moment-confirm-no').addEventListener('click', closeDialog);
  $('moment-dialog-close').addEventListener('click', closeDialog);
  $('moment-confirm').addEventListener('cancel', () => { confirmAction = null; });
  $('moment-confirm-yes').addEventListener('click', () => { const action = confirmAction; closeDialog(); action?.(); });
  function dirty() { return $('moment-content').value !== baseline.content || selectedImages.length !== baseline.images.length || selectedImages.some((item, index) => item.url !== baseline.images[index]?.url); }
  function discardThen(action) { if (dirty()) ask('放下这张尚未保存的短笺？', '当前正文和配图会被清空，已发布的闲语不受影响。', '放弃更改', action); else action(); }
  function updateComposer() {
    const count = Array.from($('moment-content').value).length;
    $('moment-count').textContent = `已写 ${count} 字`;
    $('moment-image-count').textContent = `${selectedImages.length} 张`;
    $('moment-composer-status').textContent = editingId ? '正在编辑 · 保存前保留原内容' : count || selectedImages.length ? '短笺写作中 · 仅保留在当前页面' : '尚未开始书写';
    $('moment-error').hidden = true;
  }
  function renderImages() {
    $('moment-image-tray').replaceChildren();
    selectedImages.forEach((item, index) => {
      const figure = node('div', 'moment-selected-image');
      const img = node('img'); img.src = item.url; img.alt = `已选择配图：${item.name}`;
      const remove = node('button', '', '×'); remove.type = 'button'; remove.setAttribute('aria-label', `移除第 ${index + 1} 张配图：${item.name}`);
      remove.addEventListener('click', () => { selectedImages.splice(index, 1); renderImages(); $('moment-files').focus(); });
      figure.append(img, remove, node('span', '', item.name)); $('moment-image-tray').append(figure);
    });
    updateComposer();
  }
  function resetComposer() {
    editingId = null; selectedImages = []; baseline = { content: '', images: [] }; $('moment-content').value = '';
    $('moment-composer-title').textContent = '写一则闲语'; $('moment-mode').textContent = '新笺'; $('moment-publish').textContent = '发布闲语 ↗'; $('moment-cancel').hidden = true;
    renderImages();
  }
  function edit(moment) {
    if (editingId === moment.id) { $('moment-content').focus(); return; }
    discardThen(() => {
      editingId = moment.id; selectedImages = moment.images.map((item) => ({ ...item })); $('moment-content').value = moment.content;
      baseline = { content: moment.content, images: [...selectedImages] };
      $('moment-composer-title').textContent = '续写这一则闲语'; $('moment-mode').textContent = '修笺'; $('moment-publish').textContent = '保存更改 ↗'; $('moment-cancel').hidden = false;
      renderImages(); $('moment-composer').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); $('moment-content').focus({ preventScroll: true });
    });
  }
  function removeMoment(moment) {
    const preview = moment.content.trim().slice(0, 24) || '仅图片闲语';
    ask(`删除“${preview}”？`, '确认后将等待 5 秒，期间可在列表上方撤销。此操作只影响本页演示数据。', '删除闲语', () => {
      const index = moments.findIndex((item) => item.id === moment.id);
      moments = moments.filter((item) => item.id !== moment.id);
      if (editingId === moment.id) resetComposer();
      const banner = node('div', 'moment-undo-note'); const label = node('span', '', `“${preview}”已移出列表，5 秒内可撤销。`); const undo = node('button', '', '撤销'); undo.type = 'button';
      banner.append(label, undo); $('moment-undo-stack').append(banner);
      const timer = setTimeout(() => { removals.delete(moment.id); banner.remove(); toast('已删除这则闲语 · 演示'); }, 5000);
      removals.set(moment.id, { timer, banner, moment, index });
      undo.addEventListener('click', () => { const removal = removals.get(moment.id); if (!removal) return; clearTimeout(removal.timer); moments.splice(Math.min(removal.index, moments.length), 0, moment); removals.delete(moment.id); banner.remove(); render(); toast('已撤销删除'); });
      render(); undo.focus();
    });
  }
  function render() {
    const pages = Math.max(1, Math.ceil(moments.length / pageSize)); page = Math.min(page, pages);
    const start = (page - 1) * pageSize;
    $('moment-list').replaceChildren();
    moments.slice(start, start + pageSize).forEach((moment, index) => {
      const card = node('article', 'paper-item moment-card'); card.setAttribute('role', 'listitem'); card.dataset.momentId = moment.id; card.dataset.tone = moment.tone;
      const header = node('header', 'moment-card-header'); const date = node('time', '', dateParts(moment.date)); date.dateTime = moment.date; date.append(node('small', '', dateYear(moment.date)));
      header.append(date, node('span', 'moment-card-number', `NOTE / ${String(start + index + 1).padStart(2, '0')}`));
      const content = node('p', `moment-card-content${moment.content.trim() ? '' : ' moment-image-only'}`, moment.content.trim() ? moment.content : '（这一则，只有光影。）');
      card.append(header, content);
      if (moment.images.length) { const gallery = node('div', 'moment-card-images'); moment.images.slice(0, 3).forEach((item, imageIndex) => { const img = node('img'); img.src = item.url; img.alt = `闲语配图 ${imageIndex + 1}：${item.name}`; img.loading = 'lazy'; gallery.append(img); }); if (moment.images.length > 3) gallery.append(node('span', '', `另有 ${moment.images.length - 3} 张`)); card.append(gallery); }
      const footer = node('footer', 'moment-card-foot'); const ops = node('div', 'moment-card-ops');
      const editButton = node('button', '', '编辑 ↗'); editButton.type = 'button'; editButton.dataset.action = 'edit'; editButton.setAttribute('aria-label', `编辑${moment.date}闲语`); editButton.addEventListener('click', () => edit(moment));
      const deleteButton = node('button', '', '删除'); deleteButton.type = 'button'; deleteButton.dataset.action = 'delete'; deleteButton.setAttribute('aria-label', `删除${moment.date}闲语`); deleteButton.addEventListener('click', () => removeMoment(moment));
      ops.append(editButton, deleteButton); footer.append(node('span', '', `ChoyChou · 配图 ${moment.images.length} 张`), ops); card.append(footer, node('i', 'moment-fold')); $('moment-list').append(card);
    });
    $('moment-total').textContent = String(moments.length).padStart(2, '0'); $('moment-empty').hidden = !!moments.length;
    $('moment-page-status').textContent = moments.length ? `共 ${moments.length} 则 · 第 ${start + 1}—${Math.min(start + pageSize, moments.length)} 则` : '尚未留下闲语';
    $('moment-page-number').textContent = `${page} / ${pages}`; $('moment-prev').disabled = page === 1; $('moment-next').disabled = page === pages;
    window.adminPreview?.reveal($('moment-list'));
  }
  $('moment-content').addEventListener('input', updateComposer);
  $('moment-files').addEventListener('change', (event) => {
    let skipped = 0;
    Array.from(event.target.files || []).forEach((file) => { if (!file.type.startsWith('image/')) { skipped++; return; } const url = URL.createObjectURL(file); objectUrls.add(url); selectedImages.push({ url, name: file.name }); });
    event.target.value = ''; renderImages(); if (skipped) toast(`已跳过 ${skipped} 个非图片文件`);
  });
  $('moment-cancel').addEventListener('click', () => discardThen(() => { resetComposer(); toast('已取消编辑'); }));
  $('moment-form').addEventListener('submit', (event) => {
    event.preventDefault(); const content = $('moment-content').value;
    if (!content.trim() && !selectedImages.length) { $('moment-error').hidden = false; $('moment-error').textContent = '正文和配图不能同时为空。'; $('moment-content').focus(); return; }
    const images = selectedImages.map((item) => ({ ...item })); const editing = !!editingId;
    if (editing) { const moment = moments.find((item) => item.id === editingId); if (!moment) { toast('这则闲语已删除，请重新落笔'); resetComposer(); return; } moment.content = content; moment.images = images; page = Math.floor(moments.indexOf(moment) / pageSize) + 1; }
    else { const now = new Date(); const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; moments.unshift({ id: `note-${crypto.randomUUID()}`, date, content, images, tone: ['sage', 'ochre', 'clay', 'ink'][moments.length % 4] }); page = 1; }
    resetComposer(); render(); toast(editing ? '闲语已更新 · 演示' : '闲语已发布 · 演示');
  });
  $('moment-prev').addEventListener('click', () => { page--; render(); });
  $('moment-next').addEventListener('click', () => { page++; render(); });
  window.addEventListener('pagehide', () => { objectUrls.forEach((url) => URL.revokeObjectURL(url)); removals.forEach(({ timer }) => clearTimeout(timer)); });
  render(); updateComposer();
})();
