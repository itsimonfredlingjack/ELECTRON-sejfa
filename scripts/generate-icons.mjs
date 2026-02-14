import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function writeMinimalPdf({ outPath, sizePx }) {
  // Minimal PDF with correct xref offsets, using built-in Helvetica-Bold.
  // Renders a dark HUD tile with cyan border + big "S".
  const bg = [10 / 255, 14 / 255, 23 / 255]; // #0a0e17
  const panel = [17 / 255, 24 / 255, 39 / 255]; // #111827
  const cyan = [34 / 255, 211 / 255, 238 / 255]; // #22d3ee
  const text = [226 / 255, 232 / 255, 240 / 255]; // #e2e8f0

  const inset = Math.round(sizePx * 0.12);
  const inner = sizePx - inset * 2;

  const content = [
    // background
    `${bg[0].toFixed(4)} ${bg[1].toFixed(4)} ${bg[2].toFixed(4)} rg`,
    `0 0 ${sizePx} ${sizePx} re`,
    'f',
    // panel
    `${panel[0].toFixed(4)} ${panel[1].toFixed(4)} ${panel[2].toFixed(4)} rg`,
    `${inset} ${inset} ${inner} ${inner} re`,
    'f',
    // cyan border
    `${cyan[0].toFixed(4)} ${cyan[1].toFixed(4)} ${cyan[2].toFixed(4)} RG`,
    `${Math.max(6, Math.round(sizePx * 0.012))} w`,
    `${inset} ${inset} ${inner} ${inner} re`,
    'S',
    // corner ticks (industrial HUD vibe)
    `${cyan[0].toFixed(4)} ${cyan[1].toFixed(4)} ${cyan[2].toFixed(4)} RG`,
    `${Math.max(4, Math.round(sizePx * 0.008))} w`,
    // top-left
    `${inset} ${sizePx - inset} m ${inset + Math.round(inner * 0.16)} ${sizePx - inset} l S`,
    `${inset} ${sizePx - inset} m ${inset} ${sizePx - inset - Math.round(inner * 0.16)} l S`,
    // bottom-right
    `${sizePx - inset} ${inset} m ${sizePx - inset - Math.round(inner * 0.16)} ${inset} l S`,
    `${sizePx - inset} ${inset} m ${sizePx - inset} ${inset + Math.round(inner * 0.16)} l S`,
    // big "S"
    'BT',
    `/F1 ${Math.round(sizePx * 0.36)} Tf`,
    `${cyan[0].toFixed(4)} ${cyan[1].toFixed(4)} ${cyan[2].toFixed(4)} rg`,
    `1 0 0 1 ${Math.round(sizePx * 0.36)} ${Math.round(sizePx * 0.38)} Tm`,
    '(S) Tj',
    'ET',
    // small subtitle
    'BT',
    `/F1 ${Math.max(22, Math.round(sizePx * 0.04))} Tf`,
    `${text[0].toFixed(4)} ${text[1].toFixed(4)} ${text[2].toFixed(4)} rg`,
    `1 0 0 1 ${Math.round(sizePx * 0.2)} ${Math.round(sizePx * 0.22)} Tm`,
    '(COMMAND CENTER) Tj',
    'ET',
  ].join('\n');

  const contentBytes = Buffer.byteLength(content, 'utf8');

  const objects = new Map();
  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.set(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${sizePx} ${sizePx}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
  );
  objects.set(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  objects.set(5, `<< /Length ${contentBytes} >>\nstream\n${content}\nendstream`);

  let out = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';
  const offsets = [0];

  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(out, 'utf8');
    out += `${i} 0 obj\n${objects.get(i)}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(out, 'utf8');
  out += 'xref\n';
  out += '0 6\n';
  out += '0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    const off = String(offsets[i]).padStart(10, '0');
    out += `${off} 00000 n \n`;
  }
  out += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  fs.writeFileSync(outPath, out, 'utf8');
}

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit' });
}

function main() {
  const repoRoot = process.cwd();
  const resourcesDir = path.join(repoRoot, 'resources');
  fs.mkdirSync(resourcesDir, { recursive: true });

  const pdfPath = path.join(resourcesDir, 'icon.pdf');
  const pngPath = path.join(resourcesDir, 'icon.png');
  const icnsPath = path.join(resourcesDir, 'icon.icns');

  writeMinimalPdf({ outPath: pdfPath, sizePx: 1024 });

  // Render PNG from vector PDF.
  run('sips', ['-s', 'format', 'png', pdfPath, '--out', pngPath]);
  run('sips', ['-z', '1024', '1024', pngPath, '--out', pngPath]);

  // Build iconset for .icns.
  const iconsetDir = path.join(resourcesDir, 'icon.iconset');
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  fs.mkdirSync(iconsetDir, { recursive: true });

  const sizes = [
    [16, 16],
    [32, 32],
    [128, 128],
    [256, 256],
    [512, 512],
  ];

  for (const [w, h] of sizes) {
    run('sips', [
      '-z',
      String(h),
      String(w),
      pngPath,
      '--out',
      path.join(iconsetDir, `icon_${w}x${h}.png`),
    ]);
    run('sips', [
      '-z',
      String(h * 2),
      String(w * 2),
      pngPath,
      '--out',
      path.join(iconsetDir, `icon_${w}x${h}@2x.png`),
    ]);
  }

  fs.rmSync(icnsPath, { force: true });
  run('iconutil', ['-c', 'icns', iconsetDir, '-o', icnsPath]);

  fs.rmSync(iconsetDir, { recursive: true, force: true });
}

main();
