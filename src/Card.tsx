import { forwardRef, type CSSProperties } from 'react';
import { fontFamilies, type Draft } from './model';
import styles from './Card.module.css';

interface Props { draft: Draft; html: string; page: number; total: number; concealed?: boolean; }
export const Card = forwardRef<HTMLElement, Props>(function Card({ draft, html, page, total, concealed }, ref) {
  const variables = { '--body-size': draft.fontSize + 'px', '--title-size': draft.titleSize + 'px', '--line-height': draft.lineHeight, '--tracking': draft.letterSpacing + 'px', '--radius': draft.radius + 'px', '--card-font': '"' + fontFamilies[draft.fontFamily] + '"' } as CSSProperties;
  return <article ref={ref} className={[styles.card, styles[draft.theme], styles[draft.ratio], styles[draft.cardStyle], draft.layout === 'prompt' ? styles.prompt : ''].join(' ')} style={variables} data-card data-layout={draft.layout}>
    <header className={styles.header}>
      <div className={styles.kicker}><span className={styles.label}>{draft.layout === 'prompt' ? '提示词卡片' : '知识卡片'}</span><span className={styles.serial} data-card-serial>NO. {String(page).padStart(2, '0')}</span></div>
      <h1>{draft.title || '未命名笔记'}</h1>
    </header>
    {draft.question && <div className={styles.question}><span>复习时问自己</span><p>{draft.question}</p></div>}
    <div className={styles.body} data-card-body>
      {concealed ? <div className={styles.cover} data-answer-hidden><span>先回想，再揭晓</span><strong>{draft.question ? '试着在心里回答上面的问题' : '这条知识是什么？可以用在哪里？'}</strong><p>不用逐字记忆，用自己的话讲清楚。</p><span className={styles.coverMark}>···</span></div> : <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
    <footer className={styles.footer}><span>{draft.source || '记录 · 理解 · 复习'}</span><span data-card-count>{String(page).padStart(2, '0')} / {String(total).padStart(2, '0')}</span></footer>
  </article>;
});
