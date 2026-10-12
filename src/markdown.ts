import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { decorateCardContent } from './cardIcons';
import { illustration, illustrationFor } from './illustrations';

// Rendering content never loads external images, embeds, styles or scripts.
export function markdownBlocks(markdown: string, layout: 'note' | 'prompt' = 'note', illustrated = false): HTMLElement[] {
  const renderer = new marked.Renderer();
  renderer.image = ({ text }) => `[图片：${text.replace(/[<>&]/g, '') || '未命名'}]`;
  const html = marked.parse(markdown, { async: false, breaks: true, gfm: true, renderer });
  const safe = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'start'],
  });
  const root = document.createElement('div');
  root.innerHTML = safe;
  root.querySelectorAll('a').forEach(a => { a.removeAttribute('href'); });
  if (illustrated) return illustratedBlocks(root);
  decorateCardContent(root);
  // Make list items and table rows independent pagination units.
  const blocks: HTMLElement[] = [];
  for (const element of Array.from(root.children) as HTMLElement[]) {
    if (element.matches('ul,ol')) {
      const start = Number(element.getAttribute('start') || 1);
      Array.from(element.children).forEach((item, i) => {
        const list = element.cloneNode(false) as HTMLElement;
        if (list.tagName === 'OL') list.setAttribute('start', String(start + i));
        list.append(item.cloneNode(true)); blocks.push(list);
      });
    } else if (element.tagName === 'TABLE') {
      const rows = Array.from(element.querySelectorAll('tbody > tr'));
      if (!rows.length) blocks.push(element);
      else for (const row of rows) {
        const table = document.createElement('table');
        const header = element.querySelector('thead');
        if (header) table.append(header.cloneNode(true));
        const body = document.createElement('tbody');
        body.append(row.cloneNode(true)); table.append(body); blocks.push(table);
      }
    } else blocks.push(element);
  }
  if (!blocks.length && root.textContent?.trim()) {
    const p = document.createElement('p'); p.textContent = root.textContent; blocks.push(p);
  }
  if (layout !== 'prompt') return blocks;
  const sections: HTMLElement[] = [];
  let context: HTMLElement | null = null;
  for (const block of blocks) {
    if (block.matches('h1,h2,h3,h4,h5,h6')) {
      context = null;
      if (/^(适用场景|使用场景)$/.test(block.textContent?.trim() || '')) {
        context = document.createElement('div'); context.dataset.part = 'context';
        sections.push(context);
      } else if (block.textContent?.trim() === '提示词正文') block.dataset.part = 'prompt-label';
    }
    if (block.tagName === 'HR') context = null;
    if (context) context.append(block); else sections.push(block);
  }
  return sections;
}

// Keep each heading and its explanation together; oversized modules still use
// the same measured grapheme pagination as every other card style.
function illustratedBlocks(root: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  let section: HTMLElement | null = null;
  let step = 0;
  for (const node of Array.from(root.children) as HTMLElement[]) {
    if (node.matches('h1,h2,h3,h4,h5,h6')) {
      section = document.createElement('section');
      section.dataset.lesson = String(step % 3);
      section.dataset.step = String(++step).padStart(2, '0');
      section.innerHTML = illustration(illustrationFor(node.textContent || ''));
      section.append(node); blocks.push(section);
    } else if (node.matches('hr,blockquote')) {
      section = null; blocks.push(node);
    } else if (section) section.append(node);
    else {
      if (node.tagName === 'P' && !blocks.length) node.dataset.intro = '';
      blocks.push(node);
    }
  }
  return blocks;
}

// Split at grapheme boundaries with DOM Ranges, preserving inline emphasis/code.
function cut(element: HTMLElement, count: number): [HTMLElement, HTMLElement] {
  const nodes: Text[] = [];
  const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) nodes.push(walk.currentNode as Text);
  const a = element.cloneNode(false) as HTMLElement;
  const b = element.cloneNode(false) as HTMLElement;
  let remaining = count;
  for (const node of nodes) {
    if (remaining > node.length) { remaining -= node.length; continue; }
    const range = document.createRange(); range.selectNodeContents(element); range.setEnd(node, remaining);
    a.append(range.cloneContents());
    range.selectNodeContents(element); range.setStart(node, remaining); b.append(range.cloneContents());
    break;
  }
  return [a, b];
}

export function paginate(blocks: HTMLElement[], body: HTMLElement): string[] {
  body.replaceChildren();
  const pages: string[] = [];
  const fits = () => body.scrollHeight <= body.clientHeight && body.scrollWidth <= body.clientWidth;
  const flush = () => {
    if (body.childNodes.length) pages.push(body.innerHTML);
    if (pages.length > 60) throw new Error('内容超过 60 张卡片，请分批整理。');
    body.replaceChildren();
  };
  const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
  for (const original of blocks) {
    let block = original.cloneNode(true) as HTMLElement;
    if (block.tagName === 'HR') { flush(); continue; }
    body.append(block);
    if (fits()) continue;
    block.remove();
    if (body.childNodes.length) {
      // Keep a trailing heading with the following paragraph when possible.
      const last = body.lastElementChild;
      if (last?.matches('h1,h2,h3,h4,h5,h6') && body.children.length > 1) {
        last.remove(); flush(); body.append(last);
      } else flush();
    }
    while (true) {
      body.append(block);
      if (fits()) break;
      block.remove();
      const text = block.textContent || '';
      const points = Array.from(segmenter.segment(text), part => part.index + part.segment.length);
      if (!points.length) throw new Error('这段内容无法排入画布，请检查空表格或特殊格式。');
      let lo = 0, hi = points.length - 1, best = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const [head] = cut(block, points[mid]); body.append(head);
        const ok = fits(); head.remove();
        if (ok) { best = mid; lo = mid + 1; } else hi = mid - 1;
      }
      if (best < 0) {
        if (body.childNodes.length) { flush(); continue; }
        throw new Error('有一段格式超出画布，请简化表格或减少标题长度。');
      }
      const [head, tail] = cut(block, points[best]); body.append(head); flush();
      if (!tail.textContent) break;
      block = tail;
      if (pages.length >= 60) throw new Error('内容超过 60 张卡片，请分批整理。');
    }
  }
  flush();
  return pages;
}
