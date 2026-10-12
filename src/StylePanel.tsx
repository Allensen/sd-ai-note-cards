import { Check, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { themes, type Draft } from './model';
import styles from './App.module.css';

export function StylePanel({ draft, patch, busy, className }: { draft: Draft; patch: (v: Partial<Draft>) => void; busy: boolean; className: string }) {
  return <aside className={className} aria-label="卡片样式设置">
    <div className={styles.panelHeading}><h2><SlidersHorizontal size={16} />卡片样式</h2><span>即时预览</span></div>
    <fieldset disabled={busy} className={styles.settings}>
      <section className={styles.settingSection}>
        <h3>排版风格</h3>
        <div className={styles.styleChoices}>{([['editorial', '经典'], ['minimal', '留白'], ['notebook', '重点']] as const).map(([id, label]) => <button key={id} aria-label={label + '版式'} aria-pressed={draft.cardStyle === id} onClick={() => patch({ cardStyle: id })}><span className={`${styles.styleMini} ${styles[id]}`} aria-hidden="true"><i /><b>把知识<br />留下来</b><em /><em /><em /></span><span>{label}</span></button>)}</div>
        <div className={styles.layoutSwitch}>{([['note', '知识卡片'], ['prompt', '提示词卡片']] as const).map(([id, label]) => <button key={id} aria-pressed={draft.layout === id} onClick={() => patch({ layout: id })}>{label}</button>)}</div>
        {draft.layout === 'prompt' && <p className={styles.hint}>用「## 适用场景」「## 提示词正文」分区。</p>}
      </section>
      <section className={styles.settingSection}>
        <h3>卡片配色<span>{themes.find(t => t.id === draft.theme)?.name}</span></h3>
        <div className={styles.themeList}>{themes.map(theme => <button key={theme.id} aria-label={theme.name + '主题'} aria-pressed={draft.theme === theme.id} onClick={() => patch({ theme: theme.id })}><span className={styles.swatch} style={{ background: theme.bg, color: theme.accent }}><b>Aa</b>{draft.theme === theme.id && <Check size={13} />}</span><span>{theme.name}</span></button>)}</div>
      </section>
      <section className={styles.settingSection}>
        <h3>阅读排版<button className={styles.smallIcon} aria-label="重置阅读排版" title="重置阅读排版" onClick={() => patch({ fontFamily: 'sans', fontSize: 23, titleSize: 36, lineHeight: 1.75, letterSpacing: 0 })}><RotateCcw size={13} /></button></h3>
        <label className={styles.controlLabel} htmlFor="font-family">字体</label>
        <select id="font-family" value={draft.fontFamily} onChange={e => patch({ fontFamily: e.target.value as Draft['fontFamily'] })}><option value="sans">思源黑体 · 清晰现代</option><option value="serif">思源宋体 · 书页质感</option><option value="wenkai">霞鹜文楷 · 手写温度</option></select>
        <div className={styles.presets} aria-label="阅读预设"><button onClick={() => patch({ fontSize: 23, lineHeight: 1.75, letterSpacing: 0 })}>标准</button><button onClick={() => patch({ fontSize: 27, lineHeight: 1.8, letterSpacing: .5 })}>大字</button><button onClick={() => patch({ fontSize: 20, lineHeight: 1.6, letterSpacing: 0 })}>紧凑</button></div>
        <div className={styles.controlPair}><label htmlFor="font-size">正文 / px<input id="font-size" aria-label="字号" type="number" min={18} max={30} value={draft.fontSize} onChange={e => patch({ fontSize: Math.min(30, Math.max(18, Number(e.target.value))) })} /></label><label htmlFor="title-size">标题 / px<input id="title-size" aria-label="标题字号" type="number" min={28} max={42} value={draft.titleSize} onChange={e => patch({ titleSize: Math.min(42, Math.max(28, Number(e.target.value))) })} /></label></div>
        <label className={styles.rangeLabel} htmlFor="line-height">行距<span>{draft.lineHeight.toFixed(2)} 倍</span></label><input id="line-height" aria-label="行距" type="range" min="1.4" max="2.1" step="0.05" value={draft.lineHeight} onChange={e => patch({ lineHeight: Number(e.target.value) })} />
        <label className={styles.rangeLabel} htmlFor="letter-spacing">字间距<span>{draft.letterSpacing.toFixed(1)} px</span></label><input id="letter-spacing" aria-label="字间距" type="range" min="0" max="2" step="0.1" value={draft.letterSpacing} onChange={e => patch({ letterSpacing: Number(e.target.value) })} />
      </section>
      <section className={styles.settingSection}>
        <h3>画布与圆角</h3><select aria-label="画布" value={draft.ratio} onChange={e => patch({ ratio: e.target.value as Draft['ratio'] })}><option value="portrait">3:4 竖版 · 适合手机阅读</option><option value="square">1:1 方形 · 适合短句收藏</option></select>
        <label className={styles.rangeLabel} htmlFor="radius">圆角<span>{draft.radius} px</span></label><input id="radius" aria-label="圆角" type="range" min="12" max="40" step="2" value={draft.radius} onChange={e => patch({ radius: Number(e.target.value) })} />
        <p className={styles.hint}>字号基于 600 px 画布；导出等比放大至 1080 px，保留圆角和字体。</p>
      </section>
    </fieldset>
  </aside>;
}
