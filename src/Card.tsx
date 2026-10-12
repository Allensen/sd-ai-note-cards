import { forwardRef, type CSSProperties } from 'react';
import type { Draft } from './model';
import styles from './Card.module.css';

export const Card = forwardRef<HTMLElement, { draft: Draft; html: string; page: number; total: number }>(function Card({ draft, html, page, total }, ref) {
  return <article ref={ref} className={`${styles.card} ${styles[draft.theme]} ${styles[draft.ratio]}`} style={{ '--body-size': `${draft.fontSize}px` } as CSSProperties} data-card>
    <header className={styles.header}>
      <span className={styles.kicker}>知识卡片<span>AI NOTES</span></span>
      <h1>{draft.title.trim() || '未命名笔记'}</h1>
    </header>
    <div className={styles.body} data-card-body dangerouslySetInnerHTML={{ __html: html }} />
    <footer className={styles.footer}><span>{draft.source.trim() || '记录 · 理解 · 复习'}</span><span data-card-count>{String(page).padStart(2, '0')} / {String(total).padStart(2, '0')}</span></footer>
  </article>;
});
