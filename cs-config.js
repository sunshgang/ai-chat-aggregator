// cs-config.js —— 运行在扩展隔离世界（ISOLATED），document_start
// 作用：读取 chrome.storage 中的 AI Chat 配置，若当前站点配置了自定义 UA，
//       把 UA 写到 <html data-aichat-ua="...">，供主世界脚本 cs-spoof.js 读取。
// 之所以分两个脚本：主世界脚本无法访问 chrome.storage，只能通过 DOM 属性作为通道传递。
(function () {
  'use strict';

  var ATTR = 'data-aichat-ua';

  function hostOf(u) {
    try { return new URL(u).hostname.toLowerCase(); } catch (e) { return ''; }
  }

  function domainsOf(chat) {
    if (Array.isArray(chat.domains) && chat.domains.length) {
      return chat.domains.map(function (d) { return String(d).toLowerCase(); }).filter(Boolean);
    }
    var host = hostOf(chat.url);
    var out = [];
    if (host) {
      out.push(host);
      if (host.indexOf('www.') === 0) out.push(host.slice(4));
    }
    return out;
  }

  function matchDomain(host, d) {
    return host === d || host.slice(-(d.length + 1)) === '.' + d;
  }

  function apply(ua) {
    try {
      var el = document.documentElement;
      if (!el) return false;
      el.setAttribute(ATTR, ua);
      return true;
    } catch (e) {
      return false;
    }
  }

  function applyWhenReady(ua) {
    if (apply(ua)) return;
    // document_start 阶段 <html> 尚未就绪时，等解析出文档元素后重试
    document.addEventListener('readystatechange', function onRS() {
      if (apply(ua)) document.removeEventListener('readystatechange', onRS);
    });
  }

  var host;
  try { host = location.hostname.toLowerCase(); } catch (e) { return; }
  if (!host) return;

  chrome.storage.local.get({ chats: [] }, function (res) {
    var chats = (res && res.chats) || [];
    for (var i = 0; i < chats.length; i++) {
      var c = chats[i];
      if (!c || c.enabled === false) continue;
      var ua = String(c.ua || '').trim();
      if (!ua) continue;
      var ds = domainsOf(c);
      for (var j = 0; j < ds.length; j++) {
        if (matchDomain(host, ds[j])) {
          applyWhenReady(ua);
          return;
        }
      }
    }
  });
})();
