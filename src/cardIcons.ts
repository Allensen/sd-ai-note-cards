// Trusted Lucide geometry (ISC); attribution is retained in public/licenses/third-party.txt.
// Insert only after Markdown sanitization. User-provided SVG is never allowed.
const geometry = {
  idea: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
  steps: '<path d="M13 5h8M13 12h8M13 19h8m-18-2 2 2 4-4M3 7l2 2 4-4"/>',
  context: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  prompt: '<path d="m7 11 2-2-2-2M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2"/>',
  takeaway: '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/>',
  quote: '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2zM5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
} as const;
type IconKind = keyof typeof geometry;

function icon(kind: IconKind) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', 'data-card-icon': kind })) svg.setAttribute(key, value);
  svg.innerHTML = geometry[kind];
  return svg;
}

export function decorateCardContent(root: HTMLElement) {
  for (const heading of root.querySelectorAll('h1,h2,h3')) {
    const text = heading.textContent?.trim() || '';
    let kind: IconKind | undefined;
    if (/^(适用场景|使用场景)$/.test(text)) kind = 'context';
    else if (text === '提示词正文') kind = 'prompt';
    else if (/(场景|何时|什么时候|应用)/.test(text)) kind = 'context';
    else if (/(步骤|方法|实践|行动|三件事|清单|怎么用)/.test(text)) kind = 'steps';
    else if (/(理解|概念|原理|是什么|定义)/.test(text)) kind = 'idea';
    else if (/(总结|重点|记住|要点|小结)/.test(text)) kind = 'takeaway';
    if (kind) heading.prepend(icon(kind));
  }
  for (const quote of root.querySelectorAll('blockquote')) quote.prepend(icon('quote'));
}
