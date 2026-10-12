import { test, expect, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import fs from 'node:fs/promises';
import path from 'node:path';

const card = (page: Page) => page.locator('main [data-card]');
async function ready(page: Page) { await expect(page.getByRole('button', { name: '导出当前图片', exact: true })).toBeEnabled({ timeout: 30000 }); }
async function noOverflow(page: Page) {
  const bounds = await card(page).locator('[data-card-body]').evaluate(el => ({ h: el.scrollHeight - el.clientHeight, w: el.scrollWidth - el.clientWidth }));
  expect(bounds).toEqual({ h: 0, w: 0 });
}
async function saveArtifact(file: string, name: string) {
  if (!process.env.MATERIALS_DIR) return;
  await fs.mkdir(process.env.MATERIALS_DIR, { recursive: true });
  await fs.copyFile(file, path.join(process.env.MATERIALS_DIR, name));
}

test('图解模块、配套封面、跨页序号与真实 PNG/ZIP 导出', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('./'); await ready(page);
  await page.getByRole('button', { name: '图解知识卡片示例', exact: true }).click(); await ready(page); await noOverflow(page);
  await card(page).screenshot({ path: testInfo.outputPath('lesson-preview.png') });
  await saveArtifact(testInfo.outputPath('lesson-preview.png'), 'lesson-preview.png');
  await expect(card(page).locator('[data-lesson]')).toHaveCount(3);
  await expect(card(page).locator('[data-illustration]')).toHaveCount(3);
  await expect(card(page).locator('mark')).toHaveText('真正记住');
  await expect(card(page).locator('[data-card-count]')).toHaveText('01 / 01');
  const pngDownload = page.waitForEvent('download'); await page.getByRole('button', { name: '导出当前图片', exact: true }).click();
  const png = await pngDownload; await png.saveAs(testInfo.outputPath('illustrated-lesson.png'));
  await saveArtifact(testInfo.outputPath('illustrated-lesson.png'), 'illustrated-lesson.png');
  await page.getByRole('button', { name: '附加系列封面', exact: true }).click(); await ready(page); await noOverflow(page);
  await expect(card(page)).toHaveAttribute('data-kind', 'cover');
  await expect(card(page).locator('[data-card-count]')).toHaveText('01 / 02');
  await expect(card(page).locator('[data-illustration="stack"]')).toHaveCount(1);
  const hero = await card(page).locator('[data-illustration="stack"]').boundingBox();
  expect(hero!.width).toBeGreaterThan(300); expect(hero!.height).toBeGreaterThan(140);
  await page.getByRole('button', { name: '复习一下', exact: true }).click();
  await expect(card(page).locator('[data-illustration="stack"]')).toHaveCount(0);
  const zipDownload = page.waitForEvent('download'); await page.getByRole('button', { name: /全部打包/ }).click();
  const zip = await zipDownload; await zip.saveAs(testInfo.outputPath('series.zip'));
  const files = Object.values(unzipSync(await fs.readFile(testInfo.outputPath('series.zip'))));
  expect(files).toHaveLength(2);
  for (const [i, file] of files.entries()) {
    const bytes = Buffer.from(file); expect(bytes.readUInt32BE(16)).toBe(1080); expect(bytes.readUInt32BE(20)).toBe(1440);
    await fs.writeFile(testInfo.outputPath(`series-${i + 1}.png`), file);
    await saveArtifact(testInfo.outputPath(`series-${i + 1}.png`), `series-${i + 1}.png`);
    // Text content is present even when exporting from a concealed review.
    expect(bytes.length).toBeGreaterThan(40000);
  }
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('illustrated-workspace.png'), fullPage: true });
  await saveArtifact(testInfo.outputPath('illustrated-workspace.png'), 'illustrated-workspace.png');
  await page.getByRole('button', { name: '下一张', exact: true }).click(); await noOverflow(page);
  await expect(card(page).locator('[data-card-serial]')).toHaveText('02');
  await expect(card(page).locator('[data-card-total]')).toHaveText('/02');
  await page.reload(); await ready(page); await expect(page.getByRole('button', { name: '附加系列封面', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.setViewportSize({ width: 375, height: 850 });
  await page.getByRole('button', { name: '卡片预览', exact: true }).click(); await noOverflow(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await page.screenshot({ path: testInfo.outputPath('illustrated-mobile.png'), fullPage: true });
  await saveArtifact(testInfo.outputPath('illustrated-mobile.png'), 'illustrated-mobile.png');
  expect(errors).toEqual([]);
});

test('图解长段落续页完整，保留用户字体与主题，过滤不可信 SVG', async ({ page }) => {
  await page.goto('./'); await ready(page);
  await page.getByRole('button', { name: '图解版式', exact: true }).click();
  const long = '理解一个知识之后，用自己的话解释，再找到可以使用它的真实场景。'.repeat(45);
  await page.getByLabel('卡片标题').fill('长内容依然完整');
  await page.getByLabel('正文', { exact: true }).fill(`## 理解概念\n\n${long}\n\n---\n\n## 操作步骤\n\n1. 回想关键意思\n2. 练习应用\n\n<svg onload="window.injected=true"><text>不可信图形</text></svg>\n\n> 下次继续温习。`);
  await page.getByLabel('画布').selectOption('square');
  await page.getByLabel('字体', { exact: true }).selectOption('serif');
  await page.getByRole('button', { name: '墨黑主题', exact: true }).click(); await ready(page);
  let all = '';
  while (true) {
    await noOverflow(page); all += await card(page).locator('[data-card-body]').innerText();
    if (await page.getByRole('button', { name: '下一张', exact: true }).isDisabled()) break;
    await page.getByRole('button', { name: '下一张', exact: true }).click();
  }
  expect(all.replace(/\s/g, '')).toContain(long); expect(all).toContain('练习应用'); expect(all).toContain('下次继续温习');
  expect(await page.evaluate(() => 'injected' in window)).toBe(false);
  await expect(card(page).locator('[onload]')).toHaveCount(0);
  await expect(page.getByLabel('字体', { exact: true })).toHaveValue('serif');
});
