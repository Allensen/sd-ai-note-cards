import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { toBlob } from 'html-to-image';
import { zipSync } from 'fflate';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, FileText, Code2, LoaderCircle, RotateCcw, Upload, X } from 'lucide-react';
import { Card } from './Card';
import { demo, MAX_CONTENT, readDraft, sample, STORAGE_KEY, type Draft } from './model';
import { markdownBlocks, paginate } from './markdown';
import { embedFonts, waitForFonts } from './fonts';
import styles from './App.module.css';

const repo = 'https://github.com/Allensen/ai-note-cards';
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
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [scale, setScale] = useState(.6);
  const measure = useRef<HTMLElement>(null);
  const preview = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [retry, setRetry] = useState(0);
  const patch = (next: Partial<Draft>) => { setPending(true); setDraft(value => ({ ...value, ...next })); };

  useEffect(() => {
    const id = ++generation.current;
    setPending(true); setError('');
    const timeout = setTimeout(async () => {
      try {
        if (draft.content.length > MAX_CONTENT) throw new Error('正文最多 20,000 字，请分成几份笔记。当前输入仍保留在编辑框中。');
        if (!draft.content.trim()) { if (id === generation.current) setPages([]); return; }
        await waitForFonts(draft.title + draft.content + draft.source + '知识卡片 AI NOTES 0123456789 /');
        if (id !== generation.current || !measure.current) return;
        const body = measure.current.querySelector<HTMLElement>('[data-card-body]')!;
        const next = paginate(markdownBlocks(draft.content), body);
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

  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(.73, Math.max(.2, (entry.contentRect.width - 40) / 600))));
    observer.observe(stage.current); return () => observer.disconnect();
  }, []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  function replace(next: Draft) { setUndo(draft); setPending(true); setDraft(next); setPage(0); setNotice('已替换内容，可撤销'); }
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
      replace({ ...draft, title: (heading?.[1] || selected.name.replace(/\.[^.]+$/, '')).slice(0, 60), content: heading ? content.slice(heading[0].length).trimStart() : content });
      setNotice(`已导入 ${selected.name}`);
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : '读取失败，请重新选择文件。'); }
  }

  async function exportCards(all: boolean) {
    if (!preview.current || pending || error || busy || !pages.length) return;
    setBusy('正在准备字体'); setNotice('');
    const host = document.createElement('div'); host.className = styles.exportHost; document.body.append(host);
    try {
      const text = draft.title + draft.content + draft.source + '知识卡片 AI NOTES 0123456789 /';
      const fontEmbedCSS = await embedFonts(text);
      const indices = all ? pages.map((_, i) => i) : [page];
      const files: Record<string, Uint8Array> = {};
      let single: Blob | null = null;
      for (let i = 0; i < indices.length; i++) {
        setBusy(`正在导出 ${i + 1} / ${indices.length}`); await nextFrame();
        const clone = preview.current.cloneNode(true) as HTMLElement;
        clone.querySelector('[data-card-body]')!.innerHTML = pages[indices[i]];
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
    <a href="#editor" className={styles.skip}>跳到编辑区</a>
    <header className={styles.topbar}>
      <div className={styles.brand}><span className={styles.mark}><BookOpen size={23} strokeWidth={1.7} /></span><div><strong>AI 知识卡片</strong><span>把有用的回答留下来</span></div></div>
      <div className={styles.topActions}><span className={styles.local}>无需登录 · 内容在本机处理</span><a href={repo} target="_blank" rel="noreferrer" aria-label="GitHub 源码仓库"><Code2 size={20} /></a></div>
    </header>

    <nav className={styles.mobileTabs} aria-label="工作区切换"><button aria-pressed={mobileTab === 'edit'} onClick={() => setMobileTab('edit')}>编辑内容</button><button aria-pressed={mobileTab === 'preview'} onClick={() => setMobileTab('preview')}>卡片预览 {pages.length > 0 && `(${pages.length})`}</button></nav>

    <main className={styles.workspace}>
      <section className={`${styles.editorPanel} ${mobileTab !== 'edit' ? styles.mobileHidden : ''}`} aria-labelledby="edit-title">
        <div className={styles.sectionHead}><div><span className={styles.step}>01 / 内容</span><h2 id="edit-title">值得留下的，写在这里</h2></div><button className={styles.iconButton} title="清空并新建笔记，可撤销" aria-label="新建笔记" onClick={() => replace({ ...sample, title: '', content: '', source: '' })} disabled={!!busy}><FileText size={19} /></button></div>
        <div className={styles.inputTools}><button onClick={() => file.current?.click()} disabled={!!busy}><Upload size={15} />导入文件</button><button onClick={() => replace(sample)} disabled={!!busy}>学习笔记示例</button><button onClick={() => replace(demo)} disabled={!!busy}>提示词示例</button></div>
        <input ref={file} type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={importFile} hidden />
        <fieldset className={styles.fields} disabled={!!busy}>
          <label htmlFor="title">卡片标题<span>{draft.title.length}/60</span></label>
          <input id="title" maxLength={60} value={draft.title} onChange={e => patch({ title: e.target.value })} placeholder="给这条知识起一个名字" />
          <label htmlFor="editor">正文<span>支持 Markdown</span></label>
          <textarea id="editor" aria-label="正文" spellCheck={false} value={draft.content} onChange={e => patch({ content: e.target.value })} placeholder={'粘贴 AI 的回答或你的学习笔记…\n\n## 小标题\n用 **加粗** 标出重点。\n\n单独一行 --- 可以手动分页。'} />
          <div className={styles.editorMeta}><span>{draft.content.length.toLocaleString()} / 20,000 字</span><button onClick={saveMarkdown} disabled={!draft.content.trim()} type="button">保存原文 <ArrowDownToLine size={13} /></button></div>
          <label htmlFor="source">页脚署名<span>可选</span></label>
          <input id="source" maxLength={60} value={draft.source} onChange={e => patch({ source: e.target.value })} placeholder="例如：我的 AI 学习笔记" />
        </fieldset>
        <div className={styles.saved}><Check size={14} /><span>{storage}</span>{undo && <button onClick={() => { setPending(true); setDraft(undo); setUndo(null); setNotice('已撤销内容替换'); }} disabled={!!busy}><RotateCcw size={13} />撤销替换</button>}</div>
        <details className={styles.help}><summary>排版小提示</summary><p>用 ## 写小标题，用 **文字** 加粗，空行分段。长内容自动分页，单独一行 --- 手动换页。支持列表、引用、代码和简单表格；图片仅显示说明文字。</p></details>
        <div className={styles.editorFooter}><button onClick={() => setInfo(!info)}>隐私与使用说明</button><a href={`${repo}/issues`} target="_blank" rel="noreferrer">反馈建议 ↗</a></div>
        {info && <div className={styles.info}><button className={styles.iconButton} aria-label="关闭说明" onClick={() => setInfo(false)}><X size={16} /></button><strong>你的文字留在你的浏览器</strong><p>编辑和导出在本机完成，不调用模型 API，不发送正文，不收集使用统计。草稿保存在当前浏览器；点“新建笔记”可清除旧草稿。</p><p>首次访问会向托管平台加载程序和字体。请自行备份重要内容，并确认你有权分享所用素材。本工具按 MIT 许可证提供，不作适用性保证。</p></div>}
      </section>

      <section className={`${styles.previewPanel} ${mobileTab !== 'preview' ? styles.mobileHidden : ''}`} aria-labelledby="preview-title">
        <div className={styles.previewHead}><div><span className={styles.step}>02 / 排版</span><h2 id="preview-title">让知识，有自己的样子</h2></div><span className={styles.live}>{pending ? '正在排版' : `${pages.length} 张卡片`}</span></div>
        <fieldset className={styles.options} disabled={!!busy}>
          <div className={styles.optionGroup}><span>主题</span><div className={styles.themeList}>{([['paper', '纸白'], ['sage', '浅苔'], ['ink', '墨黑']] as const).map(([key, name]) => <button key={key} aria-label={`${name}主题`} aria-pressed={draft.theme === key} className={`${styles.themeButton} ${styles[key]}`} onClick={() => patch({ theme: key })}><span />{name}{draft.theme === key && <Check size={12} />}</button>)}</div></div>
          <div className={styles.optionGroup}><label htmlFor="ratio">画布</label><select id="ratio" value={draft.ratio} onChange={e => patch({ ratio: e.target.value as Draft['ratio'] })}><option value="portrait">3:4 竖版</option><option value="square">1:1 方形</option></select></div>
          <div className={styles.optionGroup}><label htmlFor="font-size">字号</label><select id="font-size" value={draft.fontSize} onChange={e => patch({ fontSize: Number(e.target.value) })}><option value={21}>紧凑</option><option value={23}>标准</option><option value={25}>大字</option></select></div>
        </fieldset>
        <div className={styles.stage} ref={stage} aria-busy={pending}>
          {error ? <div className={styles.empty} role="alert"><FileText size={34} /><h3>暂时无法生成卡片</h3><p>{error}</p><button onClick={() => { setPending(true); setRetry(v => v + 1); }}>重新排版</button></div> : !pages.length ? <div className={styles.empty}><BookOpen size={42} strokeWidth={1} /><h3>{pending ? '正在准备中文字体' : '第一张卡片，从一句话开始'}</h3><p>{pending ? '字体准备好后会自动排版' : '在编辑区粘贴内容，预览会出现在这里。'}</p></div> : <div className={styles.cardFrame} style={{ width: 600 * scale, height: (draft.ratio === 'square' ? 600 : 800) * scale } as CSSProperties}><div className={styles.scaledCard} style={{ transform: `scale(${scale})` }}><Card ref={preview} draft={draft} html={pages[page] || ''} page={page + 1} total={pages.length} /></div>{pending && <div className={styles.updating}>正在更新排版…</div>}</div>}
        </div>
        <div className={styles.pagination}><button aria-label="上一张" onClick={() => setPage(p => p - 1)} disabled={disabled || page === 0}><ArrowLeft size={17} /></button><span>{pages.length ? `${page + 1} / ${pages.length}` : '0 / 0'}</span><button aria-label="下一张" onClick={() => setPage(p => p + 1)} disabled={disabled || page >= pages.length - 1}><ArrowRight size={17} /></button><span className={styles.dimensions}>1080 × {draft.ratio === 'square' ? '1080' : '1440'} px</span></div>
        <div className={styles.exportBar}><div><strong>把这一页，带走</strong><span>高清 PNG · 保留中文字体</span></div><button className={styles.secondary} onClick={() => exportCards(true)} disabled={disabled}>全部打包{pages.length > 1 ? ` (${pages.length})` : ''}</button><button className={styles.primary} onClick={() => exportCards(false)} disabled={disabled}>{busy ? <LoaderCircle size={17} className={styles.spinner} /> : <ArrowDownToLine size={17} />}{busy || '导出当前图片'}</button></div>
        <div className={styles.status} role="status" aria-live="polite">{notice || '改完即预览，长内容会自动分成多张。'}{result && <a href={result.url} download={result.name}>重新下载</a>}</div>
      </section>
    </main>
    <div className={styles.measure} aria-hidden="true"><Card ref={measure} draft={draft} html="" page={1} total={1} /></div>
  </div>;
}
