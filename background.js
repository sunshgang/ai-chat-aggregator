'use strict';

importScripts('defaults.js');

// 点击扩展图标时打开侧边栏
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

const FRAME_RULE_ID = 1;      // 移除防 iframe 头的规则 id
const UA_RULE_ID_BASE = 2;    // 自定义 User-Agent 规则的起始 id

function hostOf(u) {
  try { return new URL(u).hostname.toLowerCase(); } catch { return ''; }
}

// 计算某个 AI Chat 需要放行的域名集合
function domainsFor(chat) {
  if (Array.isArray(chat.domains) && chat.domains.length) {
    return chat.domains.map(d => String(d).toLowerCase()).filter(Boolean);
  }
  const host = hostOf(chat.url);
  const out = new Set();
  if (host) {
    out.add(host);
    if (host.startsWith('www.')) out.add(host.slice(4));
  }
  return [...out];
}

// 依据当前列表重建动态规则：
// 1) 移除启用站点的 X-Frame-Options / CSP 响应头（仅 sub_frame，不影响正常标签页浏览）
// 2) 为设置了自定义请求头的站点改写 User-Agent（如 Chrome 移动版）
async function rebuildFrameRules() {
  const { chats = [] } = await chrome.storage.local.get({ chats: [] });
  const domains = new Set();
  const uaChats = [];

  for (const c of chats) {
    if (!c || c.enabled === false) continue;
    const ds = domainsFor(c);
    ds.forEach(d => domains.add(d));
    const ua = (c.ua || '').trim();
    if (ua) uaChats.push({ domains: ds, ua });
  }

  // 注意：getDynamicRules() 直接返回规则数组（Rule[]），不是 { rules: [...] }
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map(r => r.id);

  const addRules = [];
  if (domains.size) {
    addRules.push({
      id: FRAME_RULE_ID,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'X-Frame-Options', operation: 'remove' },
          { header: 'Content-Security-Policy', operation: 'remove' },
          { header: 'Content-Security-Policy-Report-Only', operation: 'remove' }
        ]
      },
      condition: {
        requestDomains: [...domains].sort(),
        resourceTypes: ['sub_frame']
      }
    });
  }

  uaChats.forEach((item, i) => {
    addRules.push({
      id: UA_RULE_ID_BASE + i,
      priority: 2,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'User-Agent', operation: 'set', value: item.ua }
        ]
      },
      condition: { requestDomains: [...item.domains].sort() }
    });
  });

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  } catch (e) {
    console.error('rebuildFrameRules failed:', e);
  }
}

chrome.runtime.onInstalled.addListener(rebuildFrameRules);
chrome.runtime.onStartup.addListener(rebuildFrameRules);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.chats) rebuildFrameRules();
});
