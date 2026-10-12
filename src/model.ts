export type Theme = 'paper' | 'sage' | 'ink';
export type Ratio = 'portrait' | 'square';
export interface Draft {
  title: string;
  content: string;
  source: string;
  theme: Theme;
  ratio: Ratio;
  fontSize: number;
}
export const MAX_CONTENT = 20000;
export const STORAGE_KEY = 'ai-note-cards:draft:v1';
export const sample: Draft = {
  title: '把 AI 回答，变成自己的知识',
  content: '## 先理解，再收藏\n\n收藏一段回答，不等于掌握一个知识。试着用自己的话，把它讲给刚接触这个概念的人听。\n\n## 一张卡片，留下三件事\n\n1. **它是什么**：用一句话说清核心意思。\n2. **何时有用**：记下一个与你有关的场景。\n3. **怎么使用**：留下一个能立刻尝试的步骤。\n\n> 下次复习时，先遮住答案，再问自己：我能讲明白吗？',
  source: '我的 AI 学习笔记',
  theme: 'paper', ratio: 'portrait', fontSize: 23,
};
export const demo: Draft = {
  ...sample,
  title: '让 AI 解释一个陌生概念',
  content: '## 适用场景\n\n第一次接触一个 AI 概念，想先建立直觉，再理解它的边界。\n\n## 提示词正文\n\n请向一位不懂编程的学习者解释「上下文窗口」。\n\n1. 先用一句话说明它是什么。\n2. 用一个生活中的例子帮助我理解。\n3. 指出这个比喻在哪些地方不准确。\n4. 最后给我一道小问题，检查我是否理解。\n\n**要求**：少用术语；如果必须用，先解释它。',
  source: '我的常用提示词',
};
export function readDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!value || typeof value.content !== 'string' || value.content.length > MAX_CONTENT) return sample;
    return {
      title: typeof value.title === 'string' ? value.title.slice(0, 60) : sample.title,
      content: value.content,
      source: typeof value.source === 'string' ? value.source.slice(0, 60) : '',
      theme: ['paper', 'sage', 'ink'].includes(value.theme) ? value.theme : 'paper',
      ratio: value.ratio === 'square' ? 'square' : 'portrait',
      fontSize: [21, 23, 25].includes(value.fontSize) ? value.fontSize : 23,
    };
  } catch { return sample; }
}
