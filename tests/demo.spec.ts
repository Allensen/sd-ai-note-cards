import { test, expect } from '@playwright/test';
import { demo, sample } from '../src/model';

test.use({ video: { mode: process.env.RECORD_DEMO ? 'on' : 'off', size: { width: 1920, height: 1080 } }, viewport: { width: 1920, height: 1080 } });

// These recordings are real browser test runs. They do not simulate a terminal
// or fabricate development history, and are opt-in rather than CI smoke tests.
test.describe('真实浏览器演示录制', () => {
  test.skip(!process.env.RECORD_DEMO, '设置 RECORD_DEMO=1 才录制');
  test('粘贴笔记、导出、同文切换版式', async ({ page }) => {
    await page.goto('/');
    const exportButton = page.getByRole('button', { name: '导出当前图片', exact: true });
    await expect(exportButton).toBeEnabled();
    await page.getByRole('button', { name: '新建笔记', exact: true }).click();
    await page.waitForTimeout(1000);
    await page.getByLabel('卡片标题').fill(sample.title);
    await page.getByLabel('正文', { exact: true }).fill(sample.content);
    await page.getByLabel('页脚署名').fill(sample.source);
    await expect(exportButton).toBeEnabled(); await page.waitForTimeout(2000);
    await page.getByRole('button', { name: '浅苔主题' }).click();
    await expect(exportButton).toBeEnabled(); await page.waitForTimeout(1200);
    const png = page.waitForEvent('download'); await exportButton.click(); await png;
    await expect(page.getByRole('status')).toContainText('图片已生成。'); await page.waitForTimeout(1600);
    await page.getByRole('button', { name: '提示词示例', exact: true }).click();
    await expect(exportButton).toBeEnabled(); await page.waitForTimeout(2200);
    await page.getByRole('button', { name: '提示词卡片', exact: true }).click();
    await expect(exportButton).toBeEnabled();
    await expect(page.getByLabel('正文', { exact: true })).toHaveValue(demo.content);
    await page.waitForTimeout(2500);
    const prompt = page.waitForEvent('download'); await exportButton.click(); await prompt;
    await page.waitForTimeout(1800);
  });
});
