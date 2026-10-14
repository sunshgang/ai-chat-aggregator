// 内置的主流 AI Chat 列表（domains 用于允许内嵌时移除防 iframe 头）
const DEFAULT_CHATS = [
  { id: 'deepseek', name: 'DeepSeek',   url: 'https://chat.deepseek.com/',        domains: ['deepseek.com'], enabled: true },
  { id: 'kimi',     name: 'Kimi',       url: 'https://kimi.moonshot.cn/',         domains: ['moonshot.cn'], enabled: true },
  { id: 'doubao',   name: '豆包',        url: 'https://www.doubao.com/chat/',      domains: ['doubao.com'], enabled: true },
  { id: 'tongyi',   name: '通义千问',    url: 'https://www.tongyi.com/',           domains: ['tongyi.com', 'aliyun.com'], enabled: true },
  { id: 'yuanbao',  name: '腾讯元宝',    url: 'https://yuanbao.tencent.com/chat/', domains: ['yuanbao.tencent.com'], enabled: true },
  { id: 'yiyan',    name: '文心一言',    url: 'https://yiyan.baidu.com/',          domains: ['yiyan.baidu.com'], enabled: true },
  { id: 'chatglm',  name: '智谱清言',    url: 'https://chatglm.cn/',               domains: ['chatglm.cn'], enabled: true },
  { id: 'chatgpt',  name: 'ChatGPT',    url: 'https://chatgpt.com/',              domains: ['chatgpt.com', 'openai.com', 'oaistatic.com', 'oaiusercontent.com'], enabled: true },
  { id: 'claude',   name: 'Claude',     url: 'https://claude.ai/new',             domains: ['claude.ai'], enabled: true },
  { id: 'gemini',   name: 'Gemini',     url: 'https://gemini.google.com/',        domains: ['gemini.google.com', 'accounts.google.com'], enabled: true },
  { id: 'grok',     name: 'Grok',       url: 'https://grok.com/',                 domains: ['grok.com'], enabled: true },
  { id: 'pplx',     name: 'Perplexity', url: 'https://www.perplexity.ai/',        domains: ['perplexity.ai'], enabled: true },
  { id: 'copilot',  name: 'Copilot',    url: 'https://copilot.microsoft.com/',    domains: ['copilot.microsoft.com', 'login.microsoftonline.com', 'login.live.com'], enabled: true }
];
