const SECRET_KEY = /(token|cookie|session|auth|secret|signature|sig|jwt|user|email|phone)/i;

export function truncate(value: string, max = 500): string {
  const normalized = redactSensitiveText(value).replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => {
      try {
        const parsed = new URL(url.replace(/&amp;/g, '&'));
        return `${parsed.origin}${parsed.pathname}`;
      } catch { return url.split(/[?#]/, 1)[0]; }
    })
    .replace(/(Инцидент\s*:\s*)[\w-]+/gi, '$1[redacted]')
    .replace(/\b(?:Bearer\s+)?eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-token]');
}

export function sanitizeUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value, 'https://www.ozon.ru');
    url.search = '';
    url.hash = '';
    return url.origin === 'https://www.ozon.ru' ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

export function sanitizeHtml(value: string): string {
  return truncate(value
    .replace(/\s(?:value|data-state|data-token|nonce|integrity)=("[^"]*"|'[^']*')/gi, '')
    .replace(/(href|src)=("[^"]*"|'[^']*')/gi, (_match, attr: string, quoted: string) => {
      const quote = quoted[0];
      return `${attr}=${quote}${sanitizeUrl(quoted.slice(1, -1))}${quote}`;
    }), 800);
}

export function safeAttribute(name: string, value: string): string {
  return SECRET_KEY.test(name) ? '[redacted]' : truncate(value, 200);
}
