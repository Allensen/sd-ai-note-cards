import fontRegular from '@fontsource/noto-sans-sc/400.css?inline';
import fontBold from '@fontsource/noto-sans-sc/700.css?inline';
import { fontFamilies, type FontFamily } from './model';

export const fontCss = fontRegular + '\n' + fontBold;
const families = new Map<FontFamily, Promise<string>>();
families.set('sans', Promise.resolve(fontCss));
async function getFontCss(family: FontFamily) {
  if (!families.has(family)) families.set(family, (async () => {
    const parts = family === 'serif'
      ? await Promise.all([import('@fontsource/noto-serif-sc/400.css?inline'), import('@fontsource/noto-serif-sc/700.css?inline')])
      : await Promise.all([import('lxgw-wenkai-webfont/lxgwwenkai-regular.css?inline'), import('lxgw-wenkai-webfont/lxgwwenkai-bold.css?inline')]);
    const css = parts.map(p => p.default).join('\n');
    const style = document.createElement('style'); style.textContent = css; document.head.append(style);
    return css;
  })().catch(error => { families.delete(family); throw error; }));
  return families.get(family)!;
}
const cache = new Map<string, Promise<string>>();
function dataURL(url: string): Promise<string> {
  if (!cache.has(url)) cache.set(url, fetch(url).then(response => {
    if (!response.ok) throw new Error('字体文件读取失败，请检查网络后重试。');
    return response.blob();
  }).then(blob => new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
  })).catch(error => { cache.delete(url); throw error; }));
  return cache.get(url)!;
}
export async function waitForFonts(text: string, family: FontFamily = 'sans') {
  await getFontCss(family);
  await Promise.all([400, 700].map(weight => document.fonts.load(`${weight} 23px "${fontFamilies[family]}"`, text || '知识卡片')));
  await document.fonts.ready;
}
export async function embedFonts(text: string, family: FontFamily = 'sans'): Promise<string> {
  const codes = new Set(Array.from(text, c => c.codePointAt(0)!));
  const sheet = new CSSStyleSheet(); sheet.replaceSync(await getFontCss(family));
  const rules = Array.from(sheet.cssRules).filter((rule): rule is CSSFontFaceRule => rule instanceof CSSFontFaceRule);
  const needed = rules.filter(rule => {
    const range = rule.style.getPropertyValue('unicode-range');
    return !range || range.split(',').some(part => {
      const [a, b] = part.trim().replace(/^U\+/i, '').split('-');
      const min = parseInt(a.replace(/\?/g, '0'), 16);
      const max = parseInt((b || a).replace(/\?/g, 'f'), 16);
      return Array.from(codes).some(code => code >= min && code <= max);
    });
  });
  return (await Promise.all(needed.map(async rule => {
    // Only woff2 is needed by supported browsers; omit duplicate woff fallbacks.
    const source = rule.style.getPropertyValue('src').match(/url\((['"]?)([^)'"\s]+)\1\)\s*format\(['"]?woff2['"]?\)/);
    if (!source) throw new Error('未找到可嵌入的中文字体。');
    const style = rule.style;
    return `@font-face { font-family: '${fontFamilies[family]}'; font-style: normal; font-weight: ${style.getPropertyValue('font-weight')}; src: url("${await dataURL(source[2])}") format("woff2"); unicode-range: ${style.getPropertyValue('unicode-range') || 'U+0-10FFFF'}; }`;
  }))).join('\n');
}
