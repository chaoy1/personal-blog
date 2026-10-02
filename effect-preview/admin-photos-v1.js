(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const toast = (message) => window.adminPreview?.toast(message);
  const images = ['../public/bg/qianli-bridge.jpg', '../public/bg/opening-scroll-day.png', '../public/bg/opening-scroll-night.png'];
  let albums = [
    { id: 'mountains', title: '山行', description: '沿着青绿山路，走走停停。', date: '2026-09-22' },
    { id: 'waterside', title: '湖畔', description: '风吹水面，也吹过午后的闲意。', date: '2026-09-25' },
    { id: 'dusk', title: '暮色', description: '天色将晚，把最后一点光留下。', date: '2026-09-28' },
  ];
  let photos = [
    { id: 'p1', url: images[0], file: '青山远桥.jpg', caption: '青山远桥，秋色在水边', album: 'mountains', date: '2026-10-02', position: '12% 45%' },
    { id: 'p2', url: images[0], file: '一湾静水.jpg', caption: '一湾静水，把午后留住', album: 'waterside', date: '2026-10-01', position: '48% 65%' },
    { id: 'p3', url: images[2], file: '山窗入夜.png', caption: '山窗入夜，灯火还温着', album: 'dusk', date: '2026-09-29', position: '55% 50%' },
    { id: 'p4', url: images[0], file: '远山层叠.jpg', caption: '山的那边，还有一重山', album: 'mountains', date: '2026-09-27', position: '85% 35%' },
    { id: 'p5', url: images[1], file: '湖上清风.png', caption: '湖上清风，不必急着归', album: 'waterside', date: '2026-09-25', position: '50% 60%' },
    { id: 'p6', url: images[0], file: '经过一座桥.jpg', caption: '经过一座桥，也经过秋天', album: '', date: '2026-09-22', position: '35% 50%' },
  ];
  let staged = [], nextId = 10, editingAlbum = null, editingPhoto = null, pendingDelete = null, dialogOpener = null;
  const objectUrls = new Set();
  const count = (number) => String(number).padStart(2, '0');
  const dateLabel = (value) => {
    const [, month, day] = value.split('-').map(Number);
    const numbers = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const chinese = (n) => n < 10 ? numbers[n] : (n < 20 ? '十' : numbers[Math.floor(n / 10)] + '十') + (n % 10 ? numbers[n % 10] : '');
    return `${chinese(month)}月${chinese(day)}日`;
  };
  const albumName = (id) => albums.find((album) => album.id === id)?.title || '未归类';
  const albumOptions = (selected, first = '不归入相册') => `<option value="">${first}</option>${albums.map((album) => `<option value="${escape(album.id)}"${selected === album.id ? ' selected' : ''}>${escape(album.title)}</option>`).join('')}`;
  function refillSelects() {
    const filter = $('photo-filter').value;
    const activeAlbum = $('photo-upload-album').value;
    $('photo-filter').innerHTML = `<option value="all">全部相册</option><option value="unfiled">未归类</option>${albums.map((album) => `<option value="${escape(album.id)}">${escape(album.title)}</option>`).join('')}`;
    $('photo-filter').value = filter === 'unfiled' || filter === 'all' || albums.some((album) => album.id === filter) ? filter : 'all';
    $('photo-upload-album').innerHTML = albumOptions(activeAlbum);
    $('photo-upload-album').value = albums.some((album) => album.id === activeAlbum) ? activeAlbum : '';
  }
  function totals() {
    $('photo-total').textContent = count(photos.length);
    $('photo-album-total').textContent = count(albums.length);
    $('photo-stage-total').textContent = count(staged.length);
    $('photo-stage-badge').textContent = staged.length ? count(staged.length) : '叁';
  }
  function renderLibrary() {
    const query = $('photo-query').value.trim().toLocaleLowerCase('zh-CN');
    const filter = $('photo-filter').value;
    const sort = $('photo-sort').value;
    const visible = photos.filter((photo) => (!query || `${photo.caption} ${photo.file} ${photo.url}`.toLocaleLowerCase('zh-CN').includes(query)) && (filter === 'all' || photo.album === (filter === 'unfiled' ? '' : filter)));
    if (sort !== 'manual') visible.sort((a, b) => sort === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
    $('photo-library-count').textContent = `${visible.length} 帧 · ${sort === 'manual' ? '按手动顺序排列' : sort === 'newest' ? '按最新收录排列' : '按最早收录排列'}`;
    $('photo-empty').hidden = visible.length > 0;
    $('photo-grid').innerHTML = visible.map((photo, index) => {
      const globalIndex = photos.findIndex((entry) => entry.id === photo.id);
      return `<figure class="photo-card paper-item" data-photo-id="${escape(photo.id)}"><div class="photo-card-image"><img src="${escape(photo.url)}" alt="${escape(photo.caption || '未命名照片')}" loading="lazy" style="object-position:${photo.position || '50% 50%'}"><span class="photo-frame-index" aria-hidden="true">FRAME ${count(index + 1)}</span></div><figcaption><h3>${escape(photo.caption || '未命名的光影')}</h3><div class="photo-card-note"><span>${escape(albumName(photo.album))}</span><span aria-hidden="true">·</span><time datetime="${escape(photo.date)}">${dateLabel(photo.date)}</time></div></figcaption><div class="photo-card-actions"><button type="button" data-photo-action="previous" aria-label="${escape(photo.caption)}：向前移动"${sort !== 'manual' || globalIndex === 0 ? ' disabled' : ''}>←</button><button type="button" data-photo-action="next" aria-label="${escape(photo.caption)}：向后移动"${sort !== 'manual' || globalIndex === photos.length - 1 ? ' disabled' : ''}>→</button><button type="button" data-photo-action="edit">编辑小记</button><button type="button" data-photo-action="delete" aria-label="删除照片：${escape(photo.caption)}">删除</button></div></figure>`;
    }).join('');
    window.adminPreview?.reveal($('photo-grid'));
  }
  function renderAlbums() {
    $('photo-album-grid').innerHTML = albums.length ? albums.map((album, index) => {
      const contents = photos.filter((photo) => photo.album === album.id);
      const cover = contents[0];
      return `<article class="photo-album-card paper-item" data-album-id="${escape(album.id)}"><div class="photo-album-cover">${cover ? `<img src="${escape(cover.url)}" alt="${escape(album.title)}相册封面" style="object-position:${cover.position || '50% 50%'}">` : ''}</div><span class="photo-album-number">COLLECTION / ${count(index + 1)}</span><h3>${escape(album.title)}</h3><p>${escape(album.description || '留一点余白，等下一段光阴。')}</p><div class="photo-album-meta"><span>${count(contents.length)} 帧光影</span><time datetime="${escape(album.date)}">${dateLabel(album.date)}建册</time></div><div class="photo-album-actions"><button type="button" class="quiet-button" data-album-action="view">翻看 ↗</button><button type="button" class="quiet-button" data-album-action="edit">编辑</button><button type="button" class="quiet-button" data-album-action="delete">删除相册</button></div></article>`;
    }).join('') : '<div class="sub-empty"><h3>还没有相册</h3><p>先新建一册，为光影留出位置。</p></div>';
    $('photo-unfiled-copy').textContent = `${photos.filter((photo) => !photo.album).length} 帧光影，还在等一个归处。`;
    window.adminPreview?.reveal($('photo-album-grid'));
  }
  function renderStage() {
    $('photo-stage-grid').innerHTML = staged.map((photo) => `<article class="photo-stage-card paper-item" data-stage-id="${escape(photo.id)}"><img src="${escape(photo.url)}" alt="${escape(photo.file)}"><span class="photo-stage-name">${escape(photo.file)}</span><label class="control"><span>照片说明</span><input type="text" data-stage-field="caption" value="${escape(photo.caption)}" maxlength="200" placeholder="留下一句小记"></label><label class="control"><span>存入相册</span><select data-stage-field="album">${albumOptions(photo.album)}</select></label><button type="button" class="quiet-button" data-stage-remove>移出暂存 ×</button></article>`).join('');
    $('photo-stage-empty').hidden = staged.length > 0;
    $('photo-stage-clear').disabled = !staged.length;
    $('photo-confirm-upload').disabled = !staged.length;
    $('photo-queue-count').textContent = `${staged.length} 帧`;
    $('photo-stage-status').textContent = staged.length ? `${staged.length} 帧待收录 · 确认前可继续整理` : '尚未选择照片';
    totals(); window.adminPreview?.reveal($('photo-stage-grid'));
  }
  function renderAll() { refillSelects(); totals(); renderLibrary(); renderAlbums(); renderStage(); }
  function switchTab(name, focus = false) {
    document.querySelectorAll('.photo-tabs [role=tab]').forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      $(tab.getAttribute('aria-controls')).hidden = !active;
      if (active && focus) tab.focus();
    });
  }
  function openDialog(dialog) { dialogOpener = document.activeElement; dialog.showModal(); }
  function restoreFocus(dialog) {
    if (dialogOpener?.isConnected) dialogOpener.focus();
    else document.querySelector('.photo-tabs [aria-selected="true"]')?.focus();
    if (dialog.id === 'photo-delete-dialog') pendingDelete = null;
  }
  document.querySelectorAll('.photo-dialog').forEach((dialog) => {
    dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('close', () => restoreFocus(dialog));
  });
  function editAlbum(album = null) {
    editingAlbum = album?.id || null;
    $('photo-album-dialog-title').textContent = album ? '整理这一册' : '新建相册';
    $('photo-album-title').value = album?.title || ''; $('photo-album-description').value = album?.description || '';
    openDialog($('photo-album-dialog')); $('photo-album-title').focus();
  }
  function requestDelete(type, item) {
    pendingDelete = { type, id: item.id };
    $('photo-delete-title').textContent = type === 'album' ? '删除这一册？' : '删除这一帧？';
    $('photo-delete-copy').textContent = type === 'album' ? `“${item.title}”将从示例相册中移除，里面的照片全部保留，转入未归类。` : `“${item.caption || '未命名的光影'}”将从本次示例照片库中移除。`;
    openDialog($('photo-delete-dialog')); $('photo-delete-dialog').querySelector('[value="cancel"]').focus();
  }
  $('photo-delete-confirm').addEventListener('click', () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    if (type === 'album') {
      albums = albums.filter((album) => album.id !== id); photos.forEach((photo) => { if (photo.album === id) photo.album = ''; }); staged.forEach((photo) => { if (photo.album === id) photo.album = ''; });
      toast('相册已移除，照片保留在未归类中。');
    } else {
      const photo = photos.find((item) => item.id === id); release(photo?.url); photos = photos.filter((item) => item.id !== id); toast('已从本次照片库移除。');
    }
    renderAll();
  });
  $('photo-album-form').addEventListener('submit', (event) => {
    event.preventDefault(); const title = $('photo-album-title').value.trim(); if (!title) { $('photo-album-title').setCustomValidity('请为相册起个名字'); $('photo-album-title').reportValidity(); return; }
    const values = { title, description: $('photo-album-description').value.trim() };
    if (editingAlbum) Object.assign(albums.find((album) => album.id === editingAlbum), values);
    else albums.push({ id: `album-${nextId++}`, ...values, date: '2026-10-02' });
    renderAll(); $('photo-album-dialog').close(); toast(editingAlbum ? '相册小记已更新。' : '新相册已放到案头。');
  });
  $('photo-album-title').addEventListener('input', () => $('photo-album-title').setCustomValidity(''));
  $('photo-edit-form').addEventListener('submit', (event) => {
    event.preventDefault(); const photo = photos.find((item) => item.id === editingPhoto); if (!photo) return;
    photo.caption = $('photo-caption').value.trim(); photo.album = $('photo-edit-album').value;
    renderAll(); $('photo-edit-dialog').close(); toast('照片说明与相册归属已更新。');
  });
  $('photo-grid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-photo-action]'); if (!button) return;
    const id = button.closest('[data-photo-id]').dataset.photoId, photo = photos.find((item) => item.id === id);
    const action = button.dataset.photoAction;
    if (action === 'delete') return requestDelete('photo', photo);
    if (action === 'edit') {
      editingPhoto = id; $('photo-caption').value = photo.caption; $('photo-edit-album').innerHTML = albumOptions(photo.album); $('photo-edit-image').src = photo.url; $('photo-edit-image').alt = photo.caption || '未命名照片';
      openDialog($('photo-edit-dialog')); $('photo-caption').focus(); return;
    }
    if ($('photo-sort').value !== 'manual') return;
    const index = photos.indexOf(photo), target = index + (action === 'previous' ? -1 : 1);
    if (target < 0 || target >= photos.length) return;
    [photos[index], photos[target]] = [photos[target], photos[index]]; renderLibrary();
    const movedCard = $('photo-grid').querySelector(`[data-photo-id="${id}"]`);
    const originalControl = movedCard?.querySelector(`[data-photo-action="${action}"]`);
    (originalControl && !originalControl.disabled ? originalControl : movedCard?.querySelector('[data-photo-action="edit"]'))?.focus();
    toast(action === 'previous' ? '这一帧已向前移一位。' : '这一帧已向后移一位。');
  });
  $('photo-album-grid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-album-action]'); if (!button) return;
    const album = albums.find((item) => item.id === button.closest('[data-album-id]').dataset.albumId);
    if (button.dataset.albumAction === 'edit') return editAlbum(album);
    if (button.dataset.albumAction === 'delete') return requestDelete('album', album);
    $('photo-filter').value = album.id; $('photo-query').value = ''; renderLibrary(); switchTab('library', true);
  });
  document.querySelectorAll('.photo-tabs [role=tab]').forEach((tab, index, tabs) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    tab.addEventListener('keydown', (event) => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0; if (event.key === 'End') target = tabs.length - 1;
      if (target !== undefined) { event.preventDefault(); switchTab(tabs[target].dataset.tab, true); }
    });
  });
  $('photo-query').addEventListener('input', renderLibrary); $('photo-filter').addEventListener('change', renderLibrary); $('photo-sort').addEventListener('change', renderLibrary);
  $('photo-clear-filter').addEventListener('click', () => { $('photo-filter').value = 'all'; $('photo-query').value = ''; renderLibrary(); $('photo-query').focus(); });
  $('photo-new-album').addEventListener('click', () => editAlbum());
  $('photo-open-upload').addEventListener('click', () => switchTab('upload', true)); $('photo-go-albums').addEventListener('click', () => switchTab('albums', true));
  $('photo-view-unfiled').addEventListener('click', () => { $('photo-filter').value = 'unfiled'; $('photo-query').value = ''; renderLibrary(); switchTab('library', true); });
  function release(url) { if (objectUrls.has(url)) { URL.revokeObjectURL(url); objectUrls.delete(url); } }
  function chooseFiles(files) {
    let accepted = 0;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file); objectUrls.add(url);
      staged.push({ id: `stage-${nextId++}`, url, file: file.name, caption: '', album: $('photo-upload-album').value, date: '2026-10-02', position: '50% 50%' }); accepted++;
    });
    renderStage(); toast(accepted ? `${accepted} 帧已放到暂存桌，可继续补充说明。` : '请选择图片文件。');
  }
  $('photo-files').addEventListener('change', (event) => { chooseFiles(event.target.files); event.target.value = ''; });
  $('photo-demo-add').addEventListener('click', () => {
    staged.push({ id: `stage-${nextId++}`, url: images[0], file: '青绿山水 · 演示图片.jpg', caption: '秋日山水，收一帧清闲', album: $('photo-upload-album').value, date: '2026-10-02', position: '65% 50%' }); renderStage(); toast('一帧示例山水已放到暂存桌。');
  });
  const drop = $('photo-drop');
  ['dragenter', 'dragover'].forEach((type) => drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.add('is-dragging'); }));
  drop.addEventListener('dragleave', (event) => { if (!drop.contains(event.relatedTarget)) drop.classList.remove('is-dragging'); });
  drop.addEventListener('drop', (event) => { event.preventDefault(); drop.classList.remove('is-dragging'); chooseFiles(event.dataTransfer.files); });
  $('photo-stage-grid').addEventListener('input', (event) => {
    const field = event.target.dataset.stageField; if (!field) return;
    const photo = staged.find((item) => item.id === event.target.closest('[data-stage-id]').dataset.stageId); if (photo) photo[field] = event.target.value;
  });
  $('photo-stage-grid').addEventListener('change', (event) => {
    if (event.target.dataset.stageField !== 'album') return;
    const photo = staged.find((item) => item.id === event.target.closest('[data-stage-id]').dataset.stageId); if (photo) photo.album = event.target.value;
  });
  $('photo-stage-grid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-stage-remove]'); if (!button) return;
    const id = button.closest('[data-stage-id]').dataset.stageId; release(staged.find((item) => item.id === id)?.url); staged = staged.filter((item) => item.id !== id); renderStage(); $('photo-demo-add').focus();
  });
  $('photo-stage-clear').addEventListener('click', () => { staged.forEach((photo) => release(photo.url)); staged = []; renderStage(); $('photo-demo-add').focus(); toast('暂存桌已清空。'); });
  $('photo-confirm-upload').addEventListener('click', () => {
    if (!staged.length) return;
    const total = staged.length; photos.push(...staged.map((photo) => ({ ...photo, id: `p-${nextId++}` }))); staged = []; renderAll();
    $('photo-filter').value = 'all'; $('photo-query').value = ''; $('photo-sort').value = 'newest'; renderLibrary(); switchTab('library', true); toast(`${total} 帧已收进本次示例照片库。`);
  });
  window.addEventListener('pagehide', () => { objectUrls.forEach((url) => URL.revokeObjectURL(url)); objectUrls.clear(); });
  renderAll();
})();
