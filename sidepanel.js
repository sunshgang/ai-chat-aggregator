'use strict';

const $ = (sel) => document.querySelector(sel);

const TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
const EDIT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
const PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';

// Chrome 移动版（Android）User-Agent，用于一键填入
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

const state = {
  chats: [],
  defaultId: null,
  currentId: null,
  editingId: null
};

let spinnerTimer = null;

/* ---------- 工具 ---------- */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function hostOf(u) {
  try { return new URL(u).hostname; } catch { return ''; }
}

function enabledChats() {
  return state.chats.filter(c => c.enabled !== false);
}

function chatById(id) {
  return state.chats.find(c => c.id === id);
}

function normalizeUrl(raw) {
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  try { return new URL(raw).href; } catch { return ''; }
}

/* ---------- 设置读写 ---------- */
async function loadSettings() {
  const { chats, defaultId } = await chrome.storage.local.get({ chats: null, defaultId: null });
  if (!Array.isArray(chats) || chats.length === 0) {
    // 首次使用：写入内置列表
    state.chats = structuredClone(DEFAULT_CHATS);
    state.defaultId = DEFAULT_CHATS[0].id; // 默认 DeepSeek
    await chrome.storage.local.set({ chats: state.chats, defaultId: state.defaultId });
  } else {
    state.chats = chats;
    state.defaultId = (defaultId && chats.some(c => c.id === defaultId))
      ? defaultId
      : (chats[0] ? chats[0].id : null);
  }
}

function saveSettings() {
  return chrome.storage.local.set({ chats: state.chats, defaultId: state.defaultId });
}

/* ---------- 聊天视图 ---------- */
function resolveCurrentId() {
  const en = enabledChats();
  if (!en.length) return null;
  if (state.currentId && en.some(c => c.id === state.currentId)) return state.currentId;
  if (en.some(c => c.id === state.defaultId)) return state.defaultId;
  return en[0].id;
}

function renderSelect() {
  const sel = $('#chatSelect');
  const en = enabledChats();
  sel.innerHTML = en.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  if (state.currentId) sel.value = state.currentId;
  sel.disabled = en.length === 0;
}

function showLoading() {
  $('#loadingWrap').hidden = false;
  clearTimeout(spinnerTimer);
  // 超时兜底：避免个别站点无法内嵌时一直转圈
  spinnerTimer = setTimeout(() => { $('#loadingWrap').hidden = true; }, 15000);
}

function hideLoading() {
  clearTimeout(spinnerTimer);
  $('#loadingWrap').hidden = true;
}

function bindFrame(frame) {
  frame.addEventListener('load', hideLoading);
}

function renderChat() {
  state.currentId = resolveCurrentId();
  renderSelect();

  const chat = chatById(state.currentId);
  const frame = $('#chatFrame');
  const empty = $('#emptyState');

  if (!chat) {
    hideLoading();
    frame.removeAttribute('src');
    frame.hidden = true;
    empty.hidden = false;
    $('#btnRefresh').disabled = true;
    $('#btnOpenTab').disabled = true;
    return;
  }

  $('#btnRefresh').disabled = false;
  $('#btnOpenTab').disabled = false;
  empty.hidden = true;
  frame.hidden = false;
  showLoading();
  frame.src = chat.url;
}

function refreshChat() {
  const chat = chatById(state.currentId);
  if (!chat) return;
  // 重建 iframe 节点，保证完全重新加载
  const old = $('#chatFrame');
  showLoading();
  const frame = old.cloneNode(false);
  frame.src = chat.url;
  old.replaceWith(frame);
  bindFrame(frame);
}

/* ---------- 设置视图 ---------- */
function renderSettings() {
  $('#defaultSelect').innerHTML = state.chats.map(c =>
    `<option value="${esc(c.id)}"${c.id === state.defaultId ? ' selected' : ''}>${esc(c.name)}</option>`
  ).join('');

  $('#chatList').innerHTML = state.chats.map(c => {
    const editing = c.id === state.editingId;
    return `
    <li class="chat-row" data-id="${esc(c.id)}">
      <div class="row-main">
        <div class="info">
          <div class="name">${esc(c.name)}${c.id === state.defaultId ? '<span class="badge">默认</span>' : ''}${(c.ua || '').trim() ? '<span class="badge" title="已设置自定义请求头">UA</span>' : ''}</div>
          <div class="host">${esc(hostOf(c.url))}</div>
        </div>
        <label class="switch" title="在顶部切换列表中显示 / 隐藏">
          <input type="checkbox" data-act="toggle"${c.enabled !== false ? ' checked' : ''}>
          <span class="track"></span>
        </label>
        <div class="row-actions">
          <button class="del-btn" data-act="edit" title="编辑">${EDIT_SVG}</button>
          <button class="del-btn" data-act="del" title="删除">${TRASH_SVG}</button>
        </div>
      </div>
      ${editing ? `
      <div class="edit-form">
        <input class="input" id="editName" type="text" value="${esc(c.name)}" placeholder="名称">
        <input class="input" id="editUrl" type="text" value="${esc(c.url)}" placeholder="网址">
        <div class="ua-field">
          <input class="input" id="editUa" type="text" value="${esc(c.ua || '')}" placeholder="自定义请求头 User-Agent（可选）">
          <button class="icon-btn" type="button" data-act="fill-ua" title="自动填入 Chrome 移动版请求头">${PHONE_SVG}</button>
        </div>
        <div class="edit-actions">
          <button class="btn" type="button" data-act="save-edit">保存</button>
          <button class="btn ghost" type="button" data-act="cancel-edit">取消</button>
        </div>
      </div>` : ''}
    </li>`;
  }).join('');
}

function addChat() {
  const name = $('#newName').value.trim();
  const ua = $('#newUa').value.trim();
  const url = normalizeUrl($('#newUrl').value.trim());
  if (!name) { alert('请输入名称'); return; }
  if (!url) { alert('请输入有效网址，例如 https://chat.example.com'); return; }
  if (state.chats.some(c => c.url === url)) { alert('该网址已存在'); return; }

  state.chats.push({
    id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    url,
    ua,
    enabled: true
  });
  $('#newName').value = '';
  $('#newUrl').value = '';
  $('#newUa').value = '';
  saveSettings().then(renderSettings);
}

function saveEdit(id) {
  const chat = chatById(id);
  const row = document.querySelector(`.chat-row[data-id="${id}"]`);
  if (!chat || !row) return;

  const name = row.querySelector('#editName').value.trim();
  const ua = row.querySelector('#editUa').value.trim();
  const url = normalizeUrl(row.querySelector('#editUrl').value.trim());

  if (!name) { alert('请输入名称'); return; }
  if (!url) { alert('请输入有效网址'); return; }
  if (state.chats.some(c => c.id !== id && c.url === url)) { alert('该网址已存在'); return; }

  Object.assign(chat, { name, url, ua });
  state.editingId = null;
  saveSettings().then(renderSettings);
}

function toggleView(showSettings) {
  $('#settingsView').hidden = !showSettings;
  $('#chatView').hidden = showSettings;
  $('#btnSettings').classList.toggle('active', showSettings);
  if (showSettings) renderSettings();
  else renderChat();
}

/* ---------- 事件绑定 ---------- */
function init() {
  $('#chatSelect').addEventListener('change', e => {
    state.currentId = e.target.value;
    renderChat();
  });

  $('#btnRefresh').addEventListener('click', refreshChat);

  $('#btnOpenTab').addEventListener('click', () => {
    const chat = chatById(state.currentId);
    if (chat) chrome.tabs.create({ url: chat.url });
  });

  $('#btnSettings').addEventListener('click', () => toggleView(true));
  $('#btnGoSettings').addEventListener('click', () => toggleView(true));
  $('#btnBack').addEventListener('click', () => toggleView(false));

  $('#defaultSelect').addEventListener('change', e => {
    state.defaultId = e.target.value;
    saveSettings().then(renderSettings);
  });

  $('#btnRestore').addEventListener('click', () => {
    if (!confirm('恢复默认列表将清除全部自定义修改，确定继续？')) return;
    state.chats = structuredClone(DEFAULT_CHATS);
    state.defaultId = DEFAULT_CHATS[0].id;
    state.currentId = null;
    state.editingId = null;
    saveSettings().then(renderSettings);
  });

  // 显示开关
  $('#chatList').addEventListener('change', e => {
    if (!e.target.matches('input[type="checkbox"]')) return;
    const row = e.target.closest('.chat-row');
    const chat = chatById(row && row.dataset.id);
    if (!chat) return;
    chat.enabled = e.target.checked;
    saveSettings();
  });

  // 编辑 / 删除 / 行内表单按钮
  $('#chatList').addEventListener('click', e => {
    const row = e.target.closest('.chat-row');
    const id = row && row.dataset.id;

    const editBtn = e.target.closest('[data-act="edit"]');
    if (editBtn) {
      state.editingId = id;
      renderSettings();
      return;
    }

    const fillBtn = e.target.closest('[data-act="fill-ua"]');
    if (fillBtn) {
      const input = fillBtn.closest('.ua-field').querySelector('input');
      if (input) input.value = MOBILE_UA;
      return;
    }

    const saveBtn = e.target.closest('[data-act="save-edit"]');
    if (saveBtn) {
      saveEdit(id);
      return;
    }

    const cancelBtn = e.target.closest('[data-act="cancel-edit"]');
    if (cancelBtn) {
      state.editingId = null;
      renderSettings();
      return;
    }

    const delBtn = e.target.closest('[data-act="del"]');
    if (delBtn) {
      const chat = chatById(id);
      if (!chat) return;
      if (!confirm(`确定删除「${chat.name}」？`)) return;

      state.chats = state.chats.filter(c => c.id !== chat.id);
      if (state.defaultId === chat.id) {
        state.defaultId = state.chats.length ? state.chats[0].id : null;
      }
      if (state.currentId === chat.id) state.currentId = null;
      if (state.editingId === chat.id) state.editingId = null;
      saveSettings().then(renderSettings);
    }
  });

  $('#btnAdd').addEventListener('click', addChat);
  $('#btnFillUa').addEventListener('click', () => {
    $('#newUa').value = MOBILE_UA;
  });
  $('#newName').addEventListener('keydown', e => { if (e.key === 'Enter') addChat(); });
  $('#newUrl').addEventListener('keydown', e => { if (e.key === 'Enter') addChat(); });
}

/* ---------- 启动 ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  init();
  bindFrame($('#chatFrame'));
  await loadSettings();
  renderChat();
});
