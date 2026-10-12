import { useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, ArrowDownToLine, BookOpen, Plus, Search, Trash2, Upload } from 'lucide-react';
import { themes, type SavedCard } from './model';
import styles from './App.module.css';

interface Props { cards: SavedCard[]; onOpen: (card: SavedCard, review: boolean) => void; onBack: () => void; onNew: () => void; onDelete: (id: string) => void; onBackup: () => void; onRestore: (event: ChangeEvent<HTMLInputElement>) => void; }
export function Library({ cards, onOpen, onBack, onNew, onDelete, onBackup, onRestore }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const file = useRef<HTMLInputElement>(null);
  const found = cards.filter(c => (!query || (c.draft.title + c.draft.content + c.draft.question).toLowerCase().includes(query.toLowerCase())) && (filter !== 'new' || !c.reviewedAt)).sort((a, b) => b.updatedAt - a.updatedAt);
  return <main className={styles.library}>
    <button className={styles.back} onClick={onBack}><ArrowLeft size={16} />返回编辑器</button>
    <div className={styles.libraryHeading}><div><span className={styles.eyebrow}>留给下一次的自己</span><h1>我的卡片库<span>{cards.length}</span></h1><p>找回一条知识，先回想，再打开答案。</p></div><button className={styles.primary} onClick={onNew}><Plus size={16} />新建笔记</button></div>
    <div className={styles.libraryTools}><label className={styles.search}><Search size={17} /><input aria-label="搜索卡片" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索标题、内容或复习问题" /></label><select aria-label="筛选卡片" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">全部笔记</option><option value="new">尚未复习</option></select><div className={styles.backupTools}><button onClick={onBackup} disabled={!cards.length}><ArrowDownToLine size={15} />备份</button><button onClick={() => file.current?.click()}><Upload size={15} />恢复备份</button><input ref={file} type="file" accept=".json,application/json" onChange={onRestore} hidden /></div></div>
    {!found.length ? <div className={styles.libraryEmpty}><BookOpen size={36} strokeWidth={1.2} /><h2>{cards.length ? '没有找到匹配的笔记' : '把第一条知识，留在这里'}</h2><p>{cards.length ? '换个关键词，或查看全部笔记。' : '在编辑器中点「存入卡片库」，下次就能找回来复习。'}</p><button className={styles.secondary} onClick={onBack}>回到编辑器</button></div> : <div className={styles.libraryGrid}>{found.map(item => { const t = themes.find(theme => theme.id === item.draft.theme)!; return <article className={styles.savedCard} key={item.id}>
      <button className={styles.savedPreview} onClick={() => onOpen(item, true)} aria-label={'复习：' + (item.draft.title || '未命名笔记')} style={{ background: t.bg, color: t.ink }}><span style={{ color: t.accent }}>{item.draft.layout === 'prompt' ? '提示词卡片' : '知识卡片'}</span><strong>{item.draft.title || '未命名笔记'}</strong><p>{item.draft.question || item.draft.content.replace(/[#*>\x60]/g, '').slice(0, 110)}</p></button>
      <div className={styles.savedCardMeta}><span>{item.reviewedAt ? '复习于 ' + new Date(item.reviewedAt).toLocaleDateString('zh-CN') : '尚未复习'}</span><button aria-label={'移除：' + (item.draft.title || '未命名笔记')} title="移除笔记，可撤销" onClick={() => onDelete(item.id)}><Trash2 size={15} /></button></div><div className={styles.savedActions}><button onClick={() => onOpen(item, false)}>继续编辑</button><button onClick={() => onOpen(item, true)}>开始复习 <BookOpen size={14} /></button></div>
    </article>; })}</div>}
    <p className={styles.libraryFootnote}>仅保存在当前浏览器，最多 100 份笔记。清理浏览器数据会移除卡片，请定期下载备份；恢复时合并新增笔记。</p>
  </main>;
}
