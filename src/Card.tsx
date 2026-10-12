import { forwardRef, type CSSProperties } from 'react';
import type { Draft } from './model';
import styles from './Card.module.css';

export const Card = forwardRef<HTMLElement, { draft: Draft; html: string; page: number; total: number }>(function Card({ draft, html, page, total }, ref) {
  return <article ref={ref} className={`${styles.card} ${styles[draft.theme]} ${styles[draft.ratio]} ${draft.layout === 'prompt' ? styles.prompt : ''}`} style={{ '--body-size': `${draft.fontSize}px` } as CSSProperties} data-card data-layout={draft.layout}>
    <header className={styles.header}>
      <span className={styles.kicker}>{draft.layout === 'prompt' ? '提示词卡片' : '知识卡片'}<span>{draft.layout === 'prompt' ? 'PROMPT' : 'AI NOTES'}</span></span>
      <h1>{draft.title.trim() || '未命名笔记'}</h1>
    </header>
    <div className={styles.body} data-card-body dangerouslySetInnerHTML={{ __html: html }} />
    <footer className={styles.footer}><span>{draft.source.trim() || '记录 · 理解 · 复习'}</span><span data-card-count>{String(page).padStart(2, '0')} / {String(total).padStart(2, '0')}</span></footer>
  </article>;
});
