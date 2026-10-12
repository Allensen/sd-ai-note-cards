import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { toBlob } from 'html-to-image';
import { zipSync } from 'fflate';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, FileText, Code2, Eye, EyeOff, LibraryBig, LoaderCircle, Plus, RotateCcw, Upload, X } from 'lucide-react';
import { Card } from './Card';
import { demo, illustratedSample, MAX_CONTENT, readDraft, sample, STORAGE_KEY, LIBRARY_KEY, parseLibrary, readLibrary, type Draft, type SavedCard } from './model';
import { StylePanel } from './StylePanel';
import { Library } from './Library';
import { markdownBlocks, paginate } from './markdown';
import { embedFonts, waitForFonts } from './fonts';
import styles from './App.module.css';

const repo = 'https://github.com/Allensen/sd-ai-note-cards';
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
function filename(title: string) { return (title.trim() || '知识卡片').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 70); }
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = name; a.click(); return url;
}

export function App() {
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [pages, setPages] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [storage, setStorage] = useState('草稿保存在此浏览器');
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);
  const [undo, setUndo] = useState<Draft | null>(null);
  const [info, setInfo] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview' | 'style'>('edit');
  const [view, setView] = useState<'editor' | 'library'>('editor');
  const [library, setLibrary] = useState<SavedCard[]>(readLibrary);
  const [activeId, setActiveId] = useState<string | null>(() => { try { return localStorage.getItem('ai-note-cards:active'); } catch { return null; } });
  const [undoLibrary, setUndoLibrary] = useState<SavedCard | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [scale, setScale] = useState(.6);
  const measure = useRef<HTMLElement>(null);
  const coverMeasure = useRef<HTMLElement>(null);
  const preview = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [retry, setRetry] = useState(0);
  const patch = (next: Partial<Draft>) => { setPending(true); setDraft(value => ({ ...value, ...next })); };
  const hasCover = draft.cardStyle === 'illustrated' && draft.includeCover;
  const cardText = draft.title + draft.content + draft.source + draft.question + draft.seriesLabel + draft.subtitle + '图解笔记 知识卡片 提示词卡片 复习时问自己 先回想再揭晓 试着在心里回答上面的问题 这条知识是什么可以用在哪里 不用逐字记忆用自己的话讲清楚 留下一张卡片给未来的自己 随时回看主动回想试着使用 NO. 记录理解复习 0123456789 /';

  useEffect(() => {
    const id = ++generation.current;
    setPending(true); setError('');
    const timeout = setTimeout(async () => {
      try {
        if (draft.content.length > MAX_CONTENT) throw new Error('正文最多 20,000 字，请分成几份笔记。当前输入仍保留在编辑框中。');
        if (!draft.content.trim()) { if (id === generation.current) setPages([]); return; }
        await waitForFonts(cardText, draft.fontFamily);
        if (id !== generation.current || !measure.current) return;
        const body = measure.current.querySelector<HTMLElement>('[data-card-body]')!;
        const next = paginate(markdownBlocks(draft.content, draft.layout, draft.cardStyle === 'illustrated'), body);
        if (hasCover) {
          const coverBody = coverMeasure.current?.querySelector<HTMLElement>('[data-card-body]');
          if (!coverBody || coverBody.scrollHeight > coverBody.clientHeight || coverBody.scrollWidth > coverBody.clientWidth) throw new Error('封面内容超出画布，请精简标题、导语或小标题，或切换为 3:4 竖版。正文仍保留。');
          if (next.length >= 60) throw new Error('加上封面后超过 60 张卡片，请分批整理。');
          next.unshift('');
        }
        if (id === generation.current) { setPages(next); setPage(current => Math.min(current, Math.max(0, next.length - 1))); }
      } catch (reason) {
        if (id === generation.current) { setError(reason instanceof Error ? reason.message : '排版失败，请重试。'); setPages([]); }
      } finally { if (id === generation.current) setPending(false); }
    }, 240);
    return () => { clearTimeout(timeout); generation.current++; };
  }, [draft, retry]);

  useEffect(() => {
    if (draft.content.length > MAX_CONTENT) { setStorage('内容过长，暂未保存草稿'); return; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); setStorage('草稿保存在此浏览器'); }
    catch { setStorage('浏览器未允许保存，请下载原文备份'); }
  }, [draft]);
  useEffect(() => { try { if (activeId) localStorage.setItem('ai-note-cards:active', activeId); else localStorage.removeItem('ai-note-cards:active'); } catch { /* Draft status already reports storage availability. */ } }, [activeId]);
  useEffect(() => setRevealed(false), [page, reviewMode, draft]);

  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const widthScale = entry.contentRect.width / 600;
      const heightScale = window.innerWidth > 900 ? entry.contentRect.height / (draft.ratio === 'square' ? 600 : 800) : .8;
      setScale(Math.max(.2, Math.min(.85, widthScale, heightScale)));
    });
    observer.observe(stage.current); return () => observer.disconnect();
  }, [draft.ratio]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  function replace(next: Draft) { setUndo(draft); setPending(true); setDraft({ ...next }); setPage(0); setActiveId(null); setReviewMode(false); setNotice('已替换内容，可撤销'); }
  function newDraft() { replace({ ...draft, title: '', content: '', source: '', question: '' }); setView('editor'); setMobileTab('edit'); }
  function commitLibrary(next: SavedCard[]) {
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(next)); setLibrary(next); return true; }
    catch { setNotice('卡片库保存失败，浏览器空间不足或禁止存储。请先下载原文备份。'); return false; }
  }
  const activeEntry = library.find(item => item.id === activeId);
  const dirty = !activeEntry || JSON.stringify(activeEntry.draft) !== JSON.stringify(draft);
  function saveToLibrary() {
    if (!draft.content.trim() || draft.content.length > MAX_CONTENT) return;
    if (!activeEntry && library.length >= 100) { setNotice('卡片库已有 100 份笔记，请备份并移除暂时不用的笔记。'); return; }
    const entry: SavedCard = { id: activeEntry?.id || crypto.randomUUID(), draft: { ...draft }, updatedAt: Date.now(), reviewedAt: dirty ? null : activeEntry?.reviewedAt || null };
    const next = activeEntry ? library.map(item => item.id === entry.id ? entry : item) : [entry, ...library];
    if (commitLibrary(next)) { setActiveId(entry.id); setNotice('已保存到我的卡片库，下次可以打开复习。'); }
  }
  function openSaved(entry: SavedCard, review: boolean) { replace(entry.draft); setActiveId(entry.id); setReviewMode(review); setView('editor'); setMobileTab(review ? 'preview' : 'edit'); setNotice(review ? '先回想，再显示答案。' : '正在编辑已保存的笔记，改完后点「更新卡片」。'); }
  function removeSaved(id: string) { const removed = library.find(item => item.id === id); if (removed && commitLibrary(library.filter(item => item.id !== id))) { setUndoLibrary(removed); setNotice('已移除笔记，可以撤销。'); if (activeId === id) setActiveId(null); } }
  function backupLibrary() { const url = download(new Blob([JSON.stringify({ version: 1, cards: library }, null, 2)], { type: 'application/json' }), '知识卡片库备份.json'); setTimeout(() => URL.revokeObjectURL(url), 30000); }
  async function restoreLibrary(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]; event.target.value = ''; if (!selected) return;
    try {
      if (selected.size > 10 * 1024 * 1024) throw new Error('备份不能超过 10 MB。');
      const data = JSON.parse(await selected.text());
      if (data.version !== 1) throw new Error('不支持这个备份版本。');
      const restored = parseLibrary(data.cards);
      const additions = restored.filter(item => !library.some(current => current.id === item.id));
      if (library.length + additions.length > 100) throw new Error('合并后超过 100 份笔记，请先整理卡片库。');
      if (commitLibrary([...library, ...additions])) setNotice(`已恢复 ${additions.length} 份笔记，已有笔记保持原样。`);
    } catch (reason) { setNotice(`恢复失败：${reason instanceof Error ? reason.message : '请选择有效备份。'}`); }
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]; event.target.value = '';
    if (!selected) return;
    try {
      if (!/\.(txt|md|markdown)$/i.test(selected.name)) throw new Error('请选择 .txt、.md 或 .markdown 文本文件。');
      if (selected.size > 250 * 1024) throw new Error('文件超过 250 KB，请精简后导入。');
      const content = (await selected.text()).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
      if (content.length > MAX_CONTENT) throw new Error('文件正文超过 20,000 字，请分批导入。');
      if (content.includes('\uFFFD')) throw new Error('文件编码可能不是 UTF-8，请另存为 UTF-8 后导入。');
      if (!content.trim()) throw new Error('文件为空，请选择有内容的文本。');
      const heading = content.match(/^# ([^\n]+)\n?/);
      replace({ ...draft, question: '', title: (heading?.[1] || selected.name.replace(/\.[^.]+$/, '')).slice(0, 60), content: heading ? content.slice(heading[0].length).trimStart() : content });
      setNotice(`已导入 ${selected.name}`);
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : '读取失败，请重新选择文件。'); }
  }

  async function exportCards(all: boolean) {
    if (!preview.current || pending || error || busy || !pages.length) return;
    setBusy('正在准备字体'); setNotice('');
    const host = document.createElement('div'); host.className = styles.exportHost; document.body.append(host);
    try {
      const fontEmbedCSS = await embedFonts(cardText, draft.fontFamily);
      const indices = all ? pages.map((_, i) => i) : [page];
      const files: Record<string, Uint8Array> = {};
      let single: Blob | null = null;
      for (let i = 0; i < indices.length; i++) {
        setBusy(`正在导出 ${i + 1} / ${indices.length}`); await nextFrame();
        const isCover = hasCover && indices[i] === 0;
        const clone = (isCover ? coverMeasure.current! : measure.current!).cloneNode(true) as HTMLElement;
        if (!isCover) clone.querySelector('[data-card-body]')!.innerHTML = pages[indices[i]];
        clone.querySelector('[data-card-serial]')!.textContent = `${draft.cardStyle === 'illustrated' ? '' : 'NO. '}${String(indices[i] + 1).padStart(2, '0')}`;
        const totalBadge = clone.querySelector('[data-card-total]');
        if (totalBadge) totalBadge.textContent = '/' + String(pages.length).padStart(2, '0');
        clone.querySelector('[data-card-count]')!.textContent = `${String(indices[i] + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`;
        host.replaceChildren(clone);
        const blob = await toBlob(clone, { pixelRatio: 1.8, fontEmbedCSS, width: 600, height: draft.ratio === 'square' ? 600 : 800 });
        if (!blob) throw new Error('浏览器没有生成图片，请重试或减少每次导出的张数。');
        single = blob;
        if (all) files[`${filename(draft.title)}-${String(indices[i] + 1).padStart(2, '0')}.png`] = new Uint8Array(await blob.arrayBuffer());
      }
      const name = all ? `${filename(draft.title)}.zip` : `${filename(draft.title)}-${String(page + 1).padStart(2, '0')}.png`;
      const blob = all ? new Blob([new Uint8Array(zipSync(files, { level: 0 }))], { type: 'application/zip' }) : single!;
      const url = download(blob, name); setResult({ url, name }); setNotice(all ? `${pages.length} 张卡片已打包。` : '图片已生成。');
    } catch (reason) { setNotice(`导出失败：${reason instanceof Error ? reason.message : '请重试；手机可先逐张导出。'}`); }
    finally { host.remove(); setBusy(''); }
  }

  function saveMarkdown() {
    const blob = new Blob([`# ${draft.title}\n\n${draft.content}\n`], { type: 'text/markdown;charset=utf-8' });
    const url = download(blob, `${filename(draft.title)}.md`); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  const disabled = pending || !pages.length || !!error || !!busy;
  return <div className={styles.app}>
    <a href="#editor" className={styles.skip} onClick={() => { setView('editor'); setMobileTab('edit'); }}>跳到编辑区</a>
    <header className={styles.topbar}>
      <button className={styles.brand} onClick={() => setView('editor')} aria-label="sd-ai-note-cards，返回编辑器"><span className={styles.mark}><BookOpen size={22} strokeWidth={1.8} /></span><strong>sd-ai-note-cards</strong><span className={styles.brandTag}>把知识留给自己</span></button>
      <nav className={styles.topNav} aria-label="主导航"><button aria-current={view === 'editor' ? 'page' : undefined} onClick={() => setView('editor')}><FileText size={16} />编辑器</button><button aria-current={view === 'library' ? 'page' : undefined} onClick={() => setView('library')} disabled={!!busy}><LibraryBig size={16} />我的卡片库<span>{library.length}</span></button></nav>
      <div className={styles.topActions}><span className={styles.local}><i />本机保存 · 无需登录</span><a href={repo} target="_blank" rel="noreferrer" aria-label="GitHub 源码仓库"><Code2 size={19} /></a></div>
    </header>
    {view === 'library' && <Library cards={library} onOpen={openSaved} onBack={() => setView('editor')} onNew={newDraft} onDelete={removeSaved} onBackup={backupLibrary} onRestore={restoreLibrary} />}
    <div hidden={view !== 'editor'}>
      <div className={styles.workbar}><div className={styles.breadcrumb}><span>工作台</span><span>/</span><strong>{draft.title || '未命名笔记'}</strong></div><div><span className={styles.draftStatus}><i />{activeEntry ? dirty ? '有未更新的修改' : '已存入卡片库' : '草稿自动保存'}</span><button className={styles.saveButton} onClick={saveToLibrary} disabled={!!busy || !draft.content.trim() || draft.content.length > MAX_CONTENT}><Bookmark size={15} />{activeEntry ? '更新卡片' : '存入卡片库'}</button></div></div>
      <nav className={styles.mobileTabs} aria-label="工作区切换"><button aria-pressed={mobileTab === 'edit'} onClick={() => setMobileTab('edit')}>编辑内容</button><button aria-pressed={mobileTab === 'preview'} onClick={() => setMobileTab('preview')}>卡片预览</button><button aria-pressed={mobileTab === 'style'} onClick={() => setMobileTab('style')}>样式设置</button></nav>
      <main className={styles.workspace}>
        <section className={[styles.editorPanel, mobileTab !== 'edit' ? styles.mobileHidden : ''].join(' ')} aria-labelledby="edit-title">
          <div className={styles.panelHeading}><h2 id="edit-title"><FileText size={16} />编辑内容</h2><button className={styles.iconButton} title="新建笔记，可撤销" aria-label="新建笔记" onClick={newDraft} disabled={!!busy}><Plus size={18} /></button></div>
          <div className={styles.inputTools}><button onClick={() => file.current?.click()} disabled={!!busy}><Upload size={14} />导入文件</button><div className={styles.exampleMenu}><span>试用示例</span><button onClick={() => replace(sample)} disabled={!!busy} aria-label="学习笔记示例">笔记</button><button onClick={() => replace(demo)} disabled={!!busy} aria-label="提示词示例">提示词</button></div></div>
          <button className={styles.illustratedExample} onClick={() => replace(illustratedSample)} disabled={!!busy} aria-label="图解知识卡片示例"><BookOpen size={18} /><span><strong>试试图解知识卡片</strong><small>编号模块 · 彩色插画 · 配套封面</small></span><ArrowRight size={15} /></button>
          <input ref={file} type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={importFile} hidden />
          <fieldset className={styles.fields} disabled={!!busy}>
            <label htmlFor="title">卡片标题<span>{draft.title.length}/60</span></label>
            <input id="title" maxLength={60} value={draft.title} onChange={e => patch({ title: e.target.value })} placeholder="给这条知识起一个名字" />
            <label htmlFor="editor">正文<span>Markdown</span></label>
            <textarea id="editor" aria-label="正文" spellCheck={false} value={draft.content} onChange={e => patch({ content: e.target.value })} placeholder={'粘贴 AI 的回答或你的学习笔记…\n\n## 小标题\n用 **加粗** 标出重点。\n\n单独一行 --- 可以手动分页。'} />
            <div className={styles.editorMeta}><span>{draft.content.length.toLocaleString()} / 20,000 字</span><button onClick={saveMarkdown} disabled={!draft.content.trim()} type="button"><ArrowDownToLine size={13} />原文</button></div>
            <div className={styles.recallField}><label htmlFor="question">留一道复习问题<span>可选</span></label><input id="question" maxLength={100} value={draft.question} onChange={e => patch({ question: e.target.value })} placeholder="下次看到卡片时，先问自己什么？" /><p>把答案藏起来，试着回想一次。</p></div>
            <label htmlFor="source">页脚署名<span>可选</span></label><input id="source" maxLength={60} value={draft.source} onChange={e => patch({ source: e.target.value })} placeholder="例如：我的 AI 学习笔记" />
          </fieldset>
          <div className={styles.saved}><Check size={13} /><span>{storage}</span>{undo && <button onClick={() => { setPending(true); setDraft(undo); setUndo(null); setActiveId(null); setNotice('已撤销内容替换'); }} disabled={!!busy}><RotateCcw size={13} />撤销替换</button>}</div>
          <details className={styles.help}><summary>排版小提示</summary><p>用 ## 写小标题，用 **文字** 加粗，空行分段。长内容自动分页，单独一行 --- 手动换页。支持列表、引用、代码和简单表格；图片仅显示说明文字。</p></details>
          <div className={styles.editorFooter}><button onClick={() => setInfo(!info)}>隐私与使用说明</button><a href={repo + '/issues'} target="_blank" rel="noreferrer">反馈建议 ↗</a></div>
          {info && <div className={styles.info}><button className={styles.iconButton} aria-label="关闭说明" onClick={() => setInfo(false)}><X size={16} /></button><strong>你的文字留在你的浏览器</strong><p>编辑、排版和导出在本机完成，不调用模型 API，不发送正文，不收集使用统计。草稿和卡片库仅保存在当前浏览器，请定期下载备份。</p><p>首次访问会向托管平台加载程序和字体。请确认你有权分享所用素材。本工具按 MIT 许可证提供，不作适用性保证。</p></div>}
        </section>
        <section className={[styles.previewPanel, mobileTab !== 'preview' ? styles.mobileHidden : ''].join(' ')} aria-labelledby="preview-title">
          <div className={styles.previewHead}><h2 id="preview-title">{reviewMode ? '温习这条知识' : '卡片预览'}<span>{pending ? '排版中' : pages.length + ' 张'}</span></h2><div className={styles.previewMode}><button aria-pressed={!reviewMode} onClick={() => setReviewMode(false)}>预览</button><button aria-pressed={reviewMode} onClick={() => setReviewMode(true)}><EyeOff size={13} />复习一下</button></div></div>
          <div className={styles.stage} ref={stage} aria-busy={pending}>
            {error ? <div className={styles.empty} role="alert"><FileText size={34} /><h3>暂时无法生成卡片</h3><p>{error}</p><button onClick={() => { setPending(true); setRetry(v => v + 1); }}>重新排版</button></div> : !pages.length ? <div className={styles.empty}><BookOpen size={42} strokeWidth={1} /><h3>{pending ? '正在准备中文字体' : '第一张卡片，从一句话开始'}</h3><p>{pending ? '字体准备好后会自动排版' : '在编辑区粘贴内容，预览会出现在这里。'}</p></div> : <div className={styles.cardFrame} style={{ width: 600 * scale, height: (draft.ratio === 'square' ? 600 : 800) * scale, borderRadius: draft.radius * scale } as CSSProperties}><div className={styles.scaledCard} style={{ transform: 'scale(' + scale + ')' }}><Card ref={preview} draft={draft} html={pages[page] || ''} page={page + 1} total={pages.length} isCover={hasCover && page === 0} concealed={reviewMode && !revealed} /></div>{pending && <div className={styles.updating}>正在更新排版…</div>}</div>}
          </div>
          {reviewMode && pages.length > 0 && <div className={styles.reviewBar}><button className={styles.primary} disabled={pending} onClick={() => setRevealed(!revealed)}>{revealed ? <EyeOff size={15} /> : <Eye size={15} />}{revealed ? '再次遮住答案' : '显示答案'}</button>{revealed && activeEntry && !dirty && <button className={styles.secondary} onClick={() => { if (commitLibrary(library.map(item => item.id === activeId ? { ...item, reviewedAt: Date.now() } : item))) setNotice('已记录本次复习。'); }}><Check size={15} />记为已复习</button>}<span>{revealed ? '能用自己的话讲清楚了吗？' : '先用自己的话回答，再对照笔记。'}</span></div>}
          <div className={styles.pagination}><button aria-label="上一张" onClick={() => setPage(p => p - 1)} disabled={disabled || page === 0}><ArrowLeft size={16} /></button><span>{pages.length ? page + 1 + ' / ' + pages.length : '0 / 0'}</span><button aria-label="下一张" onClick={() => setPage(p => p + 1)} disabled={disabled || page >= pages.length - 1}><ArrowRight size={16} /></button><span className={styles.dimensions}>1080 × {draft.ratio === 'square' ? '1080' : '1440'} px</span></div>
          <div className={styles.canvasHint}>改完即预览 · 长内容自动分页{reviewMode && ' · 导出包含完整答案'}</div>
          <div className={styles.exportBar}><div><strong>把知识带走</strong><span>高清 PNG · 可存入手机相册</span></div><button className={styles.secondary} onClick={() => exportCards(true)} disabled={disabled}>全部打包{pages.length > 1 ? ' (' + pages.length + ')' : ''}</button><button className={styles.primary} onClick={() => exportCards(false)} disabled={disabled}>{busy ? <LoaderCircle size={17} className={styles.spinner} /> : <ArrowDownToLine size={17} />}{busy || '导出当前图片'}</button></div>
        </section>
        <StylePanel draft={draft} patch={patch} busy={!!busy} className={[styles.stylePanel, mobileTab !== 'style' ? styles.mobileHidden : ''].join(' ')} />
      </main>
    </div>
    <div className={styles.status} role="status" aria-live="polite"><span>{notice || '你的内容仅在本机处理。保存一张，随时温习。'}</span>{result && <a href={result.url} download={result.name}>重新下载</a>}{undoLibrary && <button onClick={() => { if (library.length < 100 && commitLibrary(library.some(item => item.id === undoLibrary.id) ? library : [undoLibrary, ...library])) { setUndoLibrary(null); setNotice('已恢复移除的笔记。'); } }}><RotateCcw size={13} />撤销移除</button>}</div>
    <div className={styles.measure} aria-hidden="true"><Card ref={measure} draft={draft} html="" page={1} total={1} />{hasCover && <Card ref={coverMeasure} draft={draft} html="" page={1} total={1} isCover />}</div>
  </div>;
}
