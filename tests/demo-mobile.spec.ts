import { test, expect } from '@playwright/test';

test.use({ video: { mode: process.env.RECORD_DEMO ? 'on' : 'off', size: { width: 540, height: 960 } }, viewport: { width: 540, height: 960 } });
test('竖屏编辑与提示词导出', async ({ page }) => {
  test.skip(!process.env.RECORD_DEMO, '设置 RECORD_DEMO=1 才录制');
  await page.goto('./'); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '提示词示例', exact: true }).click(); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /卡片预览/ }).click();
  const exportButton = page.getByRole('button', { name: '导出当前图片', exact: true });
  await expect(exportButton).toBeEnabled(); await page.waitForTimeout(1800);
  await page.getByRole('button', { name: '样式设置', exact: true }).click();
  await page.getByRole('button', { name: '提示词卡片', exact: true }).click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: '墨黑主题' }).click();
  await page.getByRole('button', { name: '卡片预览', exact: true }).click();
  await expect(exportButton).toBeEnabled(); await page.waitForTimeout(1600);
  await exportButton.scrollIntoViewIfNeeded(); await page.waitForTimeout(1000);
  const png = page.waitForEvent('download'); await exportButton.click(); await png; await page.waitForTimeout(1800);
});
