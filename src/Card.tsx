import { Fragment, forwardRef, type CSSProperties } from 'react';
import { BookOpen, Brain, CircleHelp, NotebookPen, SquareTerminal, Sparkles } from 'lucide-react';
import { fontFamilies, type Draft } from './model';
import { illustration } from './illustrations';
import styles from './Card.module.css';

interface Props { draft: Draft; html: string; page: number; total: number; concealed?: boolean; isCover?: boolean; }
export const Card = forwardRef<HTMLElement, Props>(function Card({ draft, html, page, total, concealed, isCover = false }, ref) {
  const illustrated = draft.cardStyle === 'illustrated';
  const title = draft.title || '未命名笔记';
  const clause = title.indexOf('，') + 1;
  const titleLines = isCover && clause >= 3 && clause <= 9 && title.length - clause >= 3 && !draft.highlight.includes('，') ? [title.slice(0, clause), title.slice(clause)] : [title];
  function highlighted(text: string) {
    const at = illustrated && draft.highlight ? text.indexOf(draft.highlight) : -1;
    return at < 0 ? text : <>{text.slice(0, at)}<mark className={draft.highlight.length <= 8 ? styles.keepWord : undefined}>{draft.highlight}</mark>{text.slice(at + draft.highlight.length)}</>;
  }
  const topics = Array.from(draft.content.matchAll(/^#{1,6}\s+(.+)$/gm), match => match[1].replace(/[*_`]/g, '')).slice(0, 3);
  const variables = { '--body-size': draft.fontSize + 'px', '--title-size': draft.titleSize + 'px', '--cover-title-size': Math.min(64, draft.titleSize * 1.6) + 'px', '--line-height': draft.lineHeight, '--tracking': draft.letterSpacing + 'px', '--radius': draft.radius + 'px', '--card-font': '"' + fontFamilies[draft.fontFamily] + '"' } as CSSProperties;
  return <article ref={ref} className={[styles.card, styles[draft.theme], styles[draft.ratio], styles[draft.cardStyle], isCover ? styles.seriesCover : '', draft.layout === 'prompt' ? styles.prompt : ''].join(' ')} style={variables} data-card data-layout={draft.layout} data-kind={isCover ? 'cover' : 'lesson'}>
    <header className={styles.header}>
      <div className={styles.kicker}><span className={styles.label}><span className={styles.labelIcon} aria-hidden="true">{illustrated ? <NotebookPen size={24} strokeWidth={1.8} /> : draft.layout === 'prompt' ? <SquareTerminal size={19} strokeWidth={1.7} /> : <BookOpen size={19} strokeWidth={1.7} />}</span>{illustrated ? draft.seriesLabel || '图解笔记' : draft.layout === 'prompt' ? '提示词卡片' : '知识卡片'}</span>{illustrated && <span className={styles.seriesDots} aria-hidden="true"><i /><i /><i /><Sparkles size={20} /></span>}<span className={styles.serial}>{illustrated ? <><b data-card-serial>{String(page).padStart(2, '0')}</b><small data-card-total>/{String(total).padStart(2, '0')}</small></> : <span data-card-serial>NO. {String(page).padStart(2, '0')}</span>}</span></div>
      <h1>{titleLines.map((line, i) => <Fragment key={i}>{i > 0 && <br />}{highlighted(line)}</Fragment>)}</h1>
      {isCover && draft.subtitle && <p className={styles.subtitle}>{draft.subtitle}</p>}
    </header>
    {!isCover && draft.question && <div className={styles.question}><span><CircleHelp size={16} strokeWidth={1.7} aria-hidden="true" />复习时问自己</span><p>{draft.question}</p></div>}
    <div className={styles.body} data-card-body>
      {concealed ? <div className={styles.cover} data-answer-hidden><span>先回想，再揭晓</span><strong>{draft.question && !isCover ? '试着在心里回答上面的问题' : '这条知识是什么？可以用在哪里？'}</strong><p>不用逐字记忆，用自己的话讲清楚。</p><span className={styles.coverMark}><Brain size={42} strokeWidth={1.3} aria-hidden="true" /></span></div> : isCover ? <div className={styles.coverContent}>
        <div className={styles.heroArt} dangerouslySetInnerHTML={{ __html: illustration('stack') }} />
        {!!topics.length && <div className={styles.topicList}>{topics.map((topic, i) => <div key={i}><span>{String(i + 1).padStart(2, '0')}</span><strong>{topic}</strong></div>)}</div>}
        <div className={styles.coverTakeaway}><Brain size={27} strokeWidth={1.8} aria-hidden="true" /><p>{draft.question || '留下一张卡片，给未来的自己。'}<span>随时回看 · 主动回想 · 试着使用</span></p></div>
      </div> : <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
    <footer className={styles.footer}><span>{draft.source || '记录 · 理解 · 复习'}</span><span data-card-count>{String(page).padStart(2, '0')} / {String(total).padStart(2, '0')}</span></footer>
  </article>;
});
