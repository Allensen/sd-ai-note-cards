import { test, expect, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import fs from 'node:fs/promises';
import path from 'node:path';

const card = (page: Page) => page.locator('main [data-card]');
async function ready(page: Page) { await expect(page.getByRole('button', { name: '导出当前图片', exact: true })).toBeEnabled({ timeout: 30000 }); }
async function noOverflow(page: Page) {
  const result = await card(page).locator('[data-card-body]').evaluate(el => ({ h: el.scrollHeight - el.clientHeight, w: el.scrollWidth - el.clientWidth }));
  expect(result.h).toBeLessThanOrEqual(0); expect(result.w).toBeLessThanOrEqual(0);
}
test('中文示例、主题、真实 PNG 导出和草稿恢复', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const external: string[] = []; page.on('request', r => { if (new URL(r.url()).origin !== new URL(process.env.TEST_URL || 'http://127.0.0.1:4173').origin && !r.url().startsWith('data:')) external.push(r.url()); });
  await page.goto('/'); await ready(page); await noOverflow(page);
  await page.getByRole('button', { name: '浅苔主题' }).click(); await ready(page);
  await page.getByLabel('卡片标题').fill('中文导出验证：知识要能用'); await ready(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出当前图片', exact: true }).click();
  const download = await downloadPromise; const file = testInfo.outputPath('export.png'); await download.saveAs(file);
  const bytes = await fs.readFile(file); expect(bytes.readUInt32BE(16)).toBe(1080); expect(bytes.readUInt32BE(20)).toBe(1440); expect(bytes.length).toBeGreaterThan(20000);
  await page.reload(); await ready(page); await expect(page.getByLabel('卡片标题')).toHaveValue('中文导出验证：知识要能用');
  expect(errors).toEqual([]); expect(external).toEqual([]);
});
test('长中文与复杂格式分页不丢字，不溢出，ZIP 张数正确', async ({ page }, testInfo) => {
  await page.goto('/'); await ready(page);
  const long = '这是一段需要完整保留的中文知识。认真理解，然后实践。'.repeat(75);
  await page.getByLabel('卡片标题').fill('长段落测试');
  await page.getByLabel('正文', { exact: true }).fill(`## 连续中文\n\n**${long}**\n\n---\n\n## 代码与列表\n\n1. 第一件事\n2. 第二件事\n\n\`\`\`text\n${'very_long_identifier_'.repeat(20)}\n\`\`\`\n\n| 方法 | 用途 |\n|---|---|\n| 复述 | 检查理解 |`);
  await ready(page); await page.getByLabel('画布').selectOption('square'); await ready(page);
  let collected = ''; let count = 0;
  while (true) {
    await noOverflow(page); collected += await card(page).locator('[data-card-body]').innerText(); count++;
    if (await page.getByRole('button', { name: '下一张', exact: true }).isDisabled()) break;
    await page.getByRole('button', { name: '下一张', exact: true }).click();
  }
  expect(count).toBeGreaterThan(3); expect(collected.replace(/\s/g, '')).toContain(long.replace(/\s/g, ''));
  expect(collected).toContain('第一件事'); expect(collected).toContain('第二件事'); expect(collected).toContain('检查理解');
  const promise = page.waitForEvent('download'); await page.getByRole('button', { name: /全部打包/ }).click();
  const download = await promise; const file = testInfo.outputPath('cards.zip'); await download.saveAs(file);
  const files = unzipSync(await fs.readFile(file)); expect(Object.keys(files)).toHaveLength(count);
  for (const data of Object.values(files)) { expect(Buffer.from(data).readUInt32BE(16)).toBe(1080); expect(Buffer.from(data).readUInt32BE(20)).toBe(1080); }
});
test('导入、撤销、空状态、超限与不可信 Markdown', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await page.locator('input[type=file]').setInputFiles({ name: '笔记.md', mimeType: 'text/markdown', buffer: Buffer.from('# 导入中文笔记\n\n我的第一条知识。') });
  await ready(page); await expect(page.getByLabel('卡片标题')).toHaveValue('导入中文笔记');
  await page.getByRole('button', { name: '新建笔记', exact: true }).click();
  await expect(page.getByText('第一张卡片，从一句话开始')).toBeVisible(); await expect(page.getByRole('button', { name: '导出当前图片', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '撤销替换' }).click(); await ready(page);
  await expect(page.getByLabel('卡片标题')).toHaveValue('导入中文笔记');
  let exfil = false; page.on('request', req => { if (req.url().includes('example.com')) exfil = true; });
  await page.getByLabel('正文', { exact: true }).fill('<script>window.hacked=true</script>\n\n![外部图片](https://example.com/pixel.png)\n\n<img src=x onerror="window.hacked=true">\n\n[危险链接](javascript:alert(1))\n\n正常内容');
  await ready(page); expect(await page.evaluate(() => 'hacked' in window)).toBe(false); expect(exfil).toBe(false);
  await expect(card(page).locator('img,script,a[href]')).toHaveCount(0);
  await page.getByLabel('正文', { exact: true }).fill('长'.repeat(20001));
  await expect(page.getByRole('alert')).toContainText('最多 20,000 字'); await expect(page.getByRole('button', { name: '导出当前图片', exact: true })).toBeDisabled();
});
test('375px 移动端可编辑、翻页和导出', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 }); await page.goto('/');
  await expect(page.getByLabel('正文', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /卡片预览/ }).click(); await ready(page); await noOverflow(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByRole('button', { name: '墨黑主题' }).click(); await ready(page);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
  const promise = page.waitForEvent('download'); await page.getByRole('button', { name: '导出当前图片', exact: true }).click(); await promise;
  await page.getByRole('button', { name: '编辑内容', exact: true }).click(); await expect(page.getByLabel('正文', { exact: true })).toBeVisible();
});
test('素材截图使用同一份提示词示例', async ({ page }, testInfo) => {
  await page.goto('/'); await ready(page); await page.getByRole('button', { name: '提示词示例', exact: true }).click(); await ready(page);
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
  const promise = page.waitForEvent('download'); await page.getByRole('button', { name: '导出当前图片', exact: true }).click(); const d = await promise;
  await d.saveAs(testInfo.outputPath('same-example.png'));
  if (process.env.MATERIALS_DIR) {
    await fs.mkdir(process.env.MATERIALS_DIR, { recursive: true });
    await fs.copyFile(testInfo.outputPath('desktop.png'), path.join(process.env.MATERIALS_DIR, 'desktop.png'));
    await fs.copyFile(testInfo.outputPath('same-example.png'), path.join(process.env.MATERIALS_DIR, 'same-example.png'));
  }
});

test('手动分页边界、长标题、大字号和空表格有明确结果', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await page.getByLabel('卡片标题').fill('边界验证');
  await page.getByLabel('正文', { exact: true }).fill('---\n\n第一页\n\n---\n\n---\n\n第二页\n\n---');
  await ready(page); await expect(card(page).locator('[data-card-count]')).toHaveText('01 / 02');
  await expect(card(page)).toContainText('第一页'); await noOverflow(page);
  await page.getByRole('button', { name: '下一张', exact: true }).click(); await expect(card(page)).toContainText('第二页');
  await page.getByLabel('卡片标题').fill('一二三四五六七八九十'.repeat(6));
  await page.getByLabel('字号').selectOption('25'); await page.getByLabel('画布').selectOption('square');
  await ready(page); await noOverflow(page);
  await page.getByLabel('正文', { exact: true }).fill('🌱家庭👨‍👩‍👧‍👦一起学习 é '.repeat(30));
  await ready(page); await noOverflow(page);
});
