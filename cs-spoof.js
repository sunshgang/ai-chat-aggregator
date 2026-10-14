// cs-spoof.js —— 运行在页面主世界（MAIN world），document_start
// 作用：当 <html data-aichat-ua="..."> 存在时，把 navigator / screen 伪装成移动端，
//       让依赖前端 JS 判断设备类型的站点切换到移动版布局。
// 说明：仅对设置了自定义 UA 的站点生效；未配置的页面所有取值均回落到原生值，不影响正常浏览。
(function () {
  'use strict';

  var UA_ATTR = 'data-aichat-ua';
  var MOBILE_SCREEN = { width: 412, height: 915 }; // 常见安卓逻辑像素

  // 当前页面是否配置了自定义 UA（延迟读取，避免与配置脚本写入产生时序竞争）
  function wantSpoof() {
    try {
      return !!(document.documentElement &&
        document.documentElement.getAttribute(UA_ATTR));
    } catch (e) {
      return false;
    }
  }

  function spoofUa() {
    try {
      return (document.documentElement &&
        document.documentElement.getAttribute(UA_ATTR)) || '';
    } catch (e) {
      return '';
    }
  }

  // 在覆盖之前先保存原生访问器
  var navDesc = {
    userAgent: Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent'),
    appVersion: Object.getOwnPropertyDescriptor(Navigator.prototype, 'appVersion'),
    platform: Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform'),
    maxTouchPoints: Object.getOwnPropertyDescriptor(Navigator.prototype, 'maxTouchPoints'),
    userAgentData: Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgentData')
  };
  var scrDesc = {
    width: Object.getOwnPropertyDescriptor(Screen.prototype, 'width'),
    height: Object.getOwnPropertyDescriptor(Screen.prototype, 'height'),
    availWidth: Object.getOwnPropertyDescriptor(Screen.prototype, 'availWidth'),
    availHeight: Object.getOwnPropertyDescriptor(Screen.prototype, 'availHeight')
  };

  function nativeValue(desc, target) {
    if (desc && typeof desc.get === 'function') {
      try { return desc.get.call(target); } catch (e) { /* ignore */ }
    }
    return undefined;
  }

  function overrideGetter(proto, prop, getter) {
    try {
      var d = Object.getOwnPropertyDescriptor(proto, prop);
      if (!d || !d.configurable) return;
      Object.defineProperty(proto, prop, {
        configurable: true,
        enumerable: d.enumerable,
        get: getter
      });
    } catch (e) { /* ignore */ }
  }

  // navigator.userAgentData 是一个对象，需要用 Proxy 拦截其 mobile / platform 等取值
  var uaDataProxy = null;
  var uaDataReal = null;

  function wrapUaData(real) {
    if (!real) return real;
    if (uaDataProxy && uaDataReal === real) return uaDataProxy;
    var proxy;
    try {
      proxy = new Proxy(real, {
        get: function (target, prop) {
          switch (prop) {
            case 'mobile':
              return true;
            case 'platform':
              return 'Android';
            case 'brands':
              return [
                { brand: 'Chromium', version: '130' },
                { brand: 'Google Chrome', version: '130' },
                { brand: 'Not?A_Brand', version: '24' }
              ];
            case 'getHighEntropyValues':
              return function (hints) {
                return Promise.resolve(target.getHighEntropyValues(hints)).then(function (v) {
                  return Object.assign({}, v, {
                    platform: 'Android',
                    platformVersion: '10',
                    architecture: '',
                    model: 'K',
                    mobile: true,
                    uaFullVersion: '130.0.0.0'
                  });
                });
              };
            default: {
              var val = target[prop];
              return (typeof val === 'function') ? val.bind(target) : val;
            }
          }
        }
      });
    } catch (e) {
      proxy = real;
    }
    uaDataProxy = proxy;
    uaDataReal = real;
    return proxy;
  }

  // ---- navigator ----
  overrideGetter(Navigator.prototype, 'userAgent', function () {
    return wantSpoof() ? spoofUa() : nativeValue(navDesc.userAgent, this);
  });
  overrideGetter(Navigator.prototype, 'appVersion', function () {
    var u = spoofUa();
    return u ? u.replace(/^Mozilla\//, '') : nativeValue(navDesc.appVersion, this);
  });
  overrideGetter(Navigator.prototype, 'platform', function () {
    return wantSpoof() ? 'Linux armv8l' : nativeValue(navDesc.platform, this);
  });
  overrideGetter(Navigator.prototype, 'maxTouchPoints', function () {
    return wantSpoof() ? 5 : nativeValue(navDesc.maxTouchPoints, this);
  });
  if (navDesc.userAgentData) {
    overrideGetter(Navigator.prototype, 'userAgentData', function () {
      var real = nativeValue(navDesc.userAgentData, this);
      return wantSpoof() ? wrapUaData(real) : real;
    });
  }

  // ---- screen ----
  overrideGetter(Screen.prototype, 'width', function () {
    return wantSpoof() ? MOBILE_SCREEN.width : nativeValue(scrDesc.width, this);
  });
  overrideGetter(Screen.prototype, 'height', function () {
    return wantSpoof() ? MOBILE_SCREEN.height : nativeValue(scrDesc.height, this);
  });
  overrideGetter(Screen.prototype, 'availWidth', function () {
    return wantSpoof() ? MOBILE_SCREEN.width : nativeValue(scrDesc.availWidth, this);
  });
  overrideGetter(Screen.prototype, 'availHeight', function () {
    return wantSpoof() ? MOBILE_SCREEN.height : nativeValue(scrDesc.availHeight, this);
  });

  // ---- viewport：确保按移动端宽度渲染 ----
  function ensureViewport() {
    try {
      var head = document.head;
      if (!head) return;
      var m = head.querySelector('meta[name="viewport"]');
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', 'viewport');
        head.appendChild(m);
      }
      m.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
    } catch (e) { /* ignore */ }
  }
  if (document.head) ensureViewport();
  else document.addEventListener('DOMContentLoaded', ensureViewport, { once: true });
})();
