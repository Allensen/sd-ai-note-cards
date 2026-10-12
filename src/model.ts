export const themes = [
  { id: 'blueprint', name: '蓝橙', bg: '#fffdf5', ink: '#173b82', accent: '#1049bf' },
  { id: 'paper', name: '纸白', bg: '#faf7ee', ink: '#33362f', accent: '#98603d' },
  { id: 'sage', name: '浅苔', bg: '#e9efe4', ink: '#273e31', accent: '#44664a' },
  { id: 'ink', name: '墨黑', bg: '#272b29', ink: '#f0efe5', accent: '#c1d6a4' },
  { id: 'ocean', name: '深海', bg: '#202e3b', ink: '#edf1f4', accent: '#a9cce1' },
  { id: 'sand', name: '燕麦', bg: '#efe4d0', ink: '#463a2b', accent: '#88603a' },
  { id: 'rose', name: '烟粉', bg: '#f1e5e4', ink: '#4b3337', accent: '#96555e' },
  { id: 'lilac', name: '藤灰', bg: '#ebe8f1', ink: '#3c354b', accent: '#716082' },
  { id: 'forest', name: '松林', bg: '#253b32', ink: '#edf1e6', accent: '#c4d5a3' },
] as const;
export type Theme = typeof themes[number]['id'];
export type Ratio = 'portrait' | 'square';
export type FontFamily = 'sans' | 'serif' | 'wenkai';
export const fontFamilies: Record<FontFamily, string> = { sans: 'Noto Sans SC', serif: 'Noto Serif SC', wenkai: 'LXGW WenKai' };
export interface Draft {
  layout: 'note' | 'prompt';
  cardStyle: 'illustrated' | 'editorial' | 'minimal' | 'notebook';
  includeCover: boolean;
  seriesLabel: string;
  highlight: string;
  subtitle: string;
  title: string;
  content: string;
  source: string;
  question: string;
  theme: Theme;
  ratio: Ratio;
  fontFamily: FontFamily;
  fontSize: number;
  titleSize: number;
  lineHeight: number;
  letterSpacing: number;
  radius: number;
}
export interface SavedCard { id: string; draft: Draft; updatedAt: number; reviewedAt: number | null; }
export const MAX_CONTENT = 20000;
export const STORAGE_KEY = 'ai-note-cards:draft:v1';
export const LIBRARY_KEY = 'ai-note-cards:library:v1';
export const sample: Draft = {
  layout: 'note', cardStyle: 'editorial',
  includeCover: false, seriesLabel: '图解笔记', highlight: '', subtitle: '',
  title: '把 AI 回答，变成自己的知识',
  content: '## 先理解，再收藏\n\n收藏一段回答，不等于掌握一个知识。用自己的话讲一遍，才知道哪里还没懂。\n\n## 一张卡片，留下三件事\n\n1. **它是什么**：一句话说清核心意思。\n2. **何时有用**：记下与你有关的场景。\n3. **怎么使用**：留下能立刻尝试的步骤。\n\n> 学完之后，找一个真实问题试一试。',
  source: '我的 AI 学习笔记', question: '不看答案，我能讲清这三件事吗？',
  theme: 'paper', ratio: 'portrait', fontFamily: 'sans', fontSize: 23,
  titleSize: 36, lineHeight: 1.75, letterSpacing: 0, radius: 28,
};
export const demo: Draft = {
  ...sample, question: '',
  title: '让 AI 解释一个陌生概念',
  content: '## 适用场景\n\n第一次接触一个 AI 概念，想先建立直觉，再理解它的边界。\n\n## 提示词正文\n\n请向一位不懂编程的学习者解释「上下文窗口」。\n\n1. 先用一句话说明它是什么。\n2. 用一个生活中的例子帮助我理解。\n3. 指出这个比喻在哪些地方不准确。\n4. 最后给我一道小问题，检查我是否理解。\n\n**要求**：少用术语；如果必须用，先解释它。',
  source: '我的常用提示词',
};
export const illustratedSample: Draft = {
  ...sample, cardStyle: 'illustrated', theme: 'blueprint', fontSize: 20, titleSize: 34, lineHeight: 1.6,
  title: '学到的知识，怎样真正记住？', highlight: '真正记住', seriesLabel: '学习方法',
  subtitle: '3 个小动作，把「看过」变成「会用」。', question: '',
  content: '学完别急着收藏，做张能随时回想的卡片。\n\n## 先理解：用自己的话讲\n\n合上原文，用 **一句话** 讲清它解决什么问题。讲不清的地方，再回去看。\n\n## 找场景：和真实问题连起来\n\n记下一个 **你会用到它的场景**，让抽象概念有具体的落点。\n\n## 做练习：马上试一次\n\n做一道小题，或完成一个小任务。**用过一次，比多看一遍更扎实。**\n\n> 下次打开卡片：先回想，再看答案。',
  source: '我的学习方法笔记',
};
const bounded = (value: unknown, min: number, max: number, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const str = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : '';
export function normalizeDraft(value: unknown): Draft | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.content !== 'string' || v.content.length > MAX_CONTENT) return null;
  return {
    layout: v.layout === 'prompt' ? 'prompt' : 'note',
    cardStyle: v.cardStyle === 'minimal' || v.cardStyle === 'notebook' || v.cardStyle === 'illustrated' ? v.cardStyle : 'editorial',
    includeCover: v.includeCover === true, seriesLabel: typeof v.seriesLabel === 'string' ? str(v.seriesLabel, 12) : '图解笔记',
    highlight: str(v.highlight, 20), subtitle: str(v.subtitle, 70),
    title: str(v.title, 60), content: v.content, source: str(v.source, 60), question: str(v.question, 100),
    theme: themes.some(t => t.id === v.theme) ? v.theme as Theme : 'paper',
    ratio: v.ratio === 'square' ? 'square' : 'portrait',
    fontFamily: v.fontFamily === 'serif' || v.fontFamily === 'wenkai' ? v.fontFamily : 'sans',
    fontSize: bounded(v.fontSize, 18, 30, 23), titleSize: bounded(v.titleSize, 28, 42, 36),
    lineHeight: bounded(v.lineHeight, 1.4, 2.1, 1.75), letterSpacing: bounded(v.letterSpacing, 0, 2, 0),
    radius: bounded(v.radius, 12, 40, 28),
  };
}
export function readDraft(): Draft {
  try { return normalizeDraft(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')) || illustratedSample; }
  catch { return illustratedSample; }
}
export function readLibrary(): SavedCard[] {
  try { return parseLibrary(JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]')); }
  catch { return []; }
}
export function parseLibrary(value: unknown): SavedCard[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('卡片库需要是最多 100 份笔记的备份。');
  const ids = new Set<string>();
  return value.map(item => {
    const draft = normalizeDraft(item?.draft);
    if (!draft || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.updatedAt !== 'number' || !Number.isFinite(item.updatedAt)) throw new Error('备份中的笔记格式不完整。');
    ids.add(item.id);
    return { id: item.id, draft, updatedAt: item.updatedAt, reviewedAt: typeof item.reviewedAt === 'number' && Number.isFinite(item.reviewedAt) ? item.reviewedAt : null };
  });
}
