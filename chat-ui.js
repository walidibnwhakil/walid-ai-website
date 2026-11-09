/* Shared, dependency-free conversation and citation helpers. */
(function (root) {
  'use strict';
  function safeUrl(value) {
    try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; }
  }
  function markdownLinks(text) {
    const links = []; const start = /\[([^\]\n]+)\]\(/g; let match;
    while ((match = start.exec(text))) {
      let depth = 1, end = start.lastIndex;
      while (end < text.length && depth) { if (text[end] === '(') depth++; if (text[end] === ')') depth--; if (depth) end++; }
      if (depth) continue;
      const url = safeUrl(text.slice(start.lastIndex, end));
      if (url) links.push({ start: match.index, end: end + 1, title: match[1], url });
      start.lastIndex = end + 1;
    }
    return links;
  }
  function normalizeSources(sources) {
    const unique = new Map();
    for (const item of Array.isArray(sources) ? sources : []) {
      const source = typeof item === 'string' ? { url: item } : item || {};
      const url = safeUrl(source.url);
      if (url && !unique.has(url)) unique.set(url, { title: String(source.title || new URL(url).hostname), url, date: String(source.date || '') });
    }
    return [...unique.values()].slice(0, 12);
  }
  function splitAnswer(text, sources = []) {
    const raw = String(text || '');
    const marker = /\n\s*(?:Sources|সূত্র|উৎস)\s*:\s*(?:\n|$)/i.exec(raw);
    const body = marker ? raw.slice(0, marker.index).trimEnd() : raw;
    const footer = marker ? raw.slice(marker.index) : '';
    return { body, sources: normalizeSources([...(Array.isArray(sources) ? sources : []), ...markdownLinks(body), ...markdownLinks(footer)]) };
  }
  function plainAnswer(text) {
    const { body } = splitAnswer(text); let out = '', last = 0;
    for (const link of markdownLinks(body)) { out += body.slice(last, link.start) + link.title; last = link.end; }
    return out + body.slice(last);
  }
  function publisher(source) {
    const host = new URL(source.url).hostname.replace(/^www\./, '');
    if (host.endsWith('wikipedia.org')) return 'Wikipedia';
    if (host === 'news.google.com') return source.title.split(/\s[-–—]\s/).at(-1) || 'News';
    return host;
  }
  function prepareTurn(messages, operation, question) {
    const original = messages.map(item => ({ ...item }));
    if (!operation) return { messages: [...original, { kind: 'user', text: question, source: '' }], history: original, answerIndex: original.length + 1 };
    const index = operation.index;
    if (!Number.isInteger(index) || index < 0 || index >= original.length) throw new Error('Invalid message');
    if (operation.kind === 'edit' && original[index].kind === 'user') {
      return { messages: [...original.slice(0, index), { ...original[index], text: question }], history: original.slice(0, index), answerIndex: index + 1 };
    }
    if (operation.kind === 'regenerate' && original[index].kind === 'ai') {
      let userIndex = index - 1; while (userIndex >= 0 && original[userIndex].kind !== 'user') userIndex--;
      if (userIndex < 0) throw new Error('Question missing');
      return { messages: original, history: original.slice(0, userIndex), answerIndex: index, question: original[userIndex].text };
    }
    throw new Error('Invalid turn operation');
  }
  const api = { safeUrl, markdownLinks, normalizeSources, splitAnswer, plainAnswer, publisher, prepareTurn };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WalidChatUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
