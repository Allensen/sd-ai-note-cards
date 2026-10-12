import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const lock = JSON.parse(await fs.readFile(path.join(root, 'package-lock.json'), 'utf8'));
const rows = [];
const notices = [];
for (const [location, info] of Object.entries(lock.packages)) {
  if (!location || info.dev) continue;
  const folder = path.join(root, location);
  const pkg = JSON.parse(await fs.readFile(path.join(folder, 'package.json'), 'utf8'));
  const files = (await fs.readdir(folder)).filter(name => /^(licen[sc]e|copying|notice)(\.|$|-)/i.test(name));
  if (!files.length) throw new Error(`Missing license text for ${pkg.name}`);
  const license = typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license);
  rows.push(`| ${pkg.name} | ${pkg.version} | ${license} |`);
  for (const file of files) {
    const full = path.join(folder, file);
    if ((await fs.stat(full)).isFile()) notices.push(`\n${'='.repeat(72)}\n${pkg.name} ${pkg.version} / ${file}\n${'='.repeat(72)}\n${await fs.readFile(full, 'utf8')}`);
  }
}
await fs.mkdir(path.join(root, 'public/licenses'), { recursive: true });
await fs.writeFile(path.join(root, 'public/licenses/third-party.txt'), notices.join('\n').replace(/[ \t]+$/gm, ''));
await fs.writeFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), `# 第三方归属\n\n原创界面与业务逻辑采用 MIT。下面列出随运行时交付的包（来自 package-lock.json）。其原始版权声明和完整许可证保留于 [public/licenses/third-party.txt](public/licenses/third-party.txt)，构建后也可通过站点的 licenses/third-party.txt 访问。\n\n| 包 | 锁定版本 | 许可 |\n| --- | --- | --- |\n${rows.join('\n')}\n\nNoto Sans SC 字体使用 SIL Open Font License 1.1。Marked 用于解析 Markdown，DOMPurify 用于清理输出，html-to-image 用于 DOM 到 PNG，fflate 用于 ZIP，Lucide 用于界面图标，React 用于界面状态管理。未复制参考产品的源码或品牌资产。\n\n运行 \`npm run licenses\` 可以按本地锁定依赖重新生成此文件。\n`);
console.log(`Preserved licenses for ${rows.length} runtime packages.`);
