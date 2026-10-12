import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const card = (page: Page) => page.locator('main [data-card]');
const ready = (page: Page) => expect(page.getByRole('button', { name: '导出当前图片', exact: true })).toBeEnabled({ timeout: 30000 });
async function noOverflow(page: Page) {
  const size = await card(page).locator('[data-card-body]').evaluate(el => ({ h: el.scrollHeight - el.clientHeight, w: el.scrollWidth - el.clientWidth }));
  expect(size.h).toBeLessThanOrEqual(0); expect(size.w).toBeLessThanOrEqual(0);
}
test('三种字体、三套版式、数字排版控制与透明圆角 PNG', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const external: string[] = []; page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== new URL(process.env.TEST_URL || 'http://127.0.0.1:4173').origin) external.push(r.url()); });
  await page.goto('./'); await ready(page);
  await page.getByLabel('卡片标题').fill('记住一个概念，从理解开始');
  await page.getByLabel('正文', { exact: true }).fill('## 用自己的话讲清楚\n\n学习不是复述原文，而是能解释这个概念解决什么问题。\n\n> 找一个真实场景，把它用一次。');
  await page.getByLabel('字号', { exact: true }).fill('26');
  await page.getByLabel('标题字号', { exact: true }).fill('38');
  await page.getByLabel('行距').fill('1.8'); await page.getByLabel('字间距').fill('0.8'); await page.getByLabel('圆角', { exact: true }).fill('40');
  for (const [family, name, layout, theme] of [['serif', 'Noto Serif SC', '留白', '燕麦'], ['wenkai', 'LXGW WenKai', '重点', '松林'], ['sans', 'Noto Sans SC', '经典', '烟粉']]) {
    await page.getByLabel('字体', { exact: true }).selectOption(family);
    await page.getByRole('button', { name: layout + '版式' }).click(); await page.getByRole('button', { name: theme + '主题' }).click(); await ready(page); await noOverflow(page);
    expect(await card(page).evaluate(el => getComputedStyle(el).fontFamily)).toContain(name);
    const promise = page.waitForEvent('download'); await page.getByRole('button', { name: '导出当前图片', exact: true }).click(); const download = await promise;
    await download.saveAs(testInfo.outputPath(family + '.png')); const bytes = await fs.readFile(testInfo.outputPath(family + '.png'));
    const alpha = await page.evaluate(async data => { const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode(); const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height; const context = canvas.getContext('2d')!; context.drawImage(img, 0, 0); return [context.getImageData(0, 0, 1, 1).data[3], context.getImageData(100, 100, 1, 1).data[3]]; }, bytes.toString('base64'));
    expect(alpha).toEqual([0, 255]); expect(bytes.readUInt32BE(16)).toBe(1080);
  }
  await page.reload(); await ready(page); await expect(page.getByLabel('字间距')).toHaveValue('0.8'); await expect(page.getByLabel('字号', { exact: true })).toHaveValue('26');
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('收藏、搜索、复习遮挡、更新和备份恢复保留笔记', async ({ page }, testInfo) => {
  await page.goto('./'); await ready(page);
  await page.getByLabel('卡片标题').fill('测试我的学习闭环'); await page.getByLabel('留一道复习问题').fill('这条知识怎么用？');
  await page.getByLabel('正文', { exact: true }).fill('这里是不能提前泄露的答案。'); await ready(page);
  await page.getByRole('button', { name: '存入卡片库', exact: true }).click();
  await page.getByRole('button', { name: /我的卡片库/ }).click();
  await page.getByLabel('搜索卡片').fill('学习闭环'); await expect(page.getByRole('button', { name: '开始复习' })).toHaveCount(1);
  await page.getByRole('button', { name: '开始复习' }).click(); await ready(page);
  await expect(card(page)).not.toContainText('不能提前泄露'); await expect(card(page).locator('[data-answer-hidden]')).toBeVisible();
  await page.getByRole('button', { name: '显示答案', exact: true }).click(); await expect(card(page)).toContainText('不能提前泄露');
  await page.getByRole('button', { name: '记为已复习' }).click();
  await page.getByRole('button', { name: /我的卡片库/ }).click(); await expect(page.getByText(/复习于/)).toBeVisible();
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: '备份', exact: true }).click(); const backup = await pending; const backupPath = testInfo.outputPath('library.json'); await backup.saveAs(backupPath);
  await page.getByRole('button', { name: '移除：测试我的学习闭环' }).click(); await expect(page.getByText('把第一条知识，留在这里')).toBeVisible();
  await page.getByRole('button', { name: '撤销移除' }).click(); await expect(page.getByRole('button', { name: '开始复习' })).toHaveCount(1);
  await page.getByRole('button', { name: '继续编辑' }).click(); await page.getByLabel('正文', { exact: true }).fill('更新之后的内容。'); await ready(page); await page.getByRole('button', { name: '更新卡片', exact: true }).click();
  await page.reload(); await ready(page); await expect(page.getByLabel('正文', { exact: true })).toHaveValue('更新之后的内容。');
  await page.getByRole('button', { name: /我的卡片库/ }).click(); await expect(page.getByRole('article').getByText('尚未复习', { exact: true })).toBeVisible();
  await page.locator('input[accept=".json,application/json"]').setInputFiles(backupPath); await expect(page.getByRole('status')).toContainText('已恢复 0 份');
  await page.getByRole('button', { name: '继续编辑' }).click(); await expect(page.getByLabel('正文', { exact: true })).toHaveValue('更新之后的内容。');
  await page.getByRole('button', { name: /我的卡片库/ }).click(); await page.getByRole('button', { name: '移除：测试我的学习闭环' }).click();
  await page.locator('input[accept=".json,application/json"]').setInputFiles(backupPath); await expect(page.getByRole('status')).toContainText('已恢复 1 份');
  await page.getByRole('button', { name: '继续编辑' }).click(); await expect(page.getByLabel('正文', { exact: true })).toHaveValue('这里是不能提前泄露的答案。');
});

test('旧版草稿兼容、存储失败提示和畸形备份不覆盖数据', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ai-note-cards:draft:v1', JSON.stringify({ title: '旧笔记', content: '保留旧版文字。', source: '之前的署名', theme: 'sage', ratio: 'portrait', fontSize: 25, layout: 'note' })));
  await page.goto('./'); await ready(page); await expect(page.getByLabel('正文', { exact: true })).toHaveValue('保留旧版文字。'); await expect(page.getByLabel('字号', { exact: true })).toHaveValue('25');
  await page.getByRole('button', { name: '存入卡片库', exact: true }).click(); await page.getByRole('button', { name: /我的卡片库/ }).click();
  await page.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, cards: [{ draft: { content: null } }] })) });
  await expect(page.getByRole('status')).toContainText('恢复失败'); await expect(page.getByRole('button', { name: '开始复习' })).toHaveCount(1);
  await page.getByRole('button', { name: '继续编辑' }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); }; });
  await page.getByLabel('卡片标题').fill('保存失败时仍保留文字'); await page.getByRole('button', { name: '更新卡片' }).click(); await expect(page.getByRole('status')).toContainText('卡片库保存失败'); await expect(page.getByLabel('正文', { exact: true })).toHaveValue('保留旧版文字。');
});

test('桌面、平板与手机布局，以及公开产品截图', async ({ page }, testInfo) => {
  await page.goto('./'); await ready(page);
  for (const width of [1280, 1024, 820, 700, 375]) {
    await page.setViewportSize({ width, height: 900 });
    if (width <= 700) await page.getByRole('button', { name: '卡片预览', exact: true }).click();
    await noOverflow(page); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.getByRole('button', { name: '样式设置', exact: true }).click(); await page.getByLabel('字体', { exact: true }).selectOption('serif');
  await page.getByRole('button', { name: '深海主题' }).click(); await page.getByRole('button', { name: '卡片预览', exact: true }).click(); await ready(page);
  await page.screenshot({ path: testInfo.outputPath('mobile-redesign.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: '纸白主题' }).click(); await page.getByLabel('字体', { exact: true }).selectOption('sans'); await ready(page);
  await page.screenshot({ path: testInfo.outputPath('desktop-redesign.png'), fullPage: true });
  await page.getByRole('button', { name: '存入卡片库', exact: true }).click(); await page.getByRole('button', { name: '提示词示例', exact: true }).click(); await ready(page); await page.getByRole('button', { name: '浅苔主题' }).click(); await page.getByRole('button', { name: '存入卡片库', exact: true }).click(); await page.getByRole('button', { name: /我的卡片库/ }).click();
  await page.screenshot({ path: testInfo.outputPath('library-redesign.png'), fullPage: true });
  if (process.env.MATERIALS_DIR) for (const name of ['mobile-redesign.png', 'desktop-redesign.png', 'library-redesign.png']) { await fs.mkdir(process.env.MATERIALS_DIR, { recursive: true }); await fs.copyFile(testInfo.outputPath(name), path.join(process.env.MATERIALS_DIR, name)); }
});
