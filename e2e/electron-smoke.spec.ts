import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function runNpx(cwd: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('npx', args, { cwd, stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npx ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function attachScreenshot(page: Page, name: string) {
  const screenshotPath = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await test.info().attach(name, { path: screenshotPath, contentType: 'image/png' });
}

test('electron smoke (offline backend)', async () => {
  test.setTimeout(180_000);

  const repoRoot = process.cwd();
  const builtMain = path.join(repoRoot, '.vite', 'build', 'main.js');
  const builtIndexHtml = path.join(repoRoot, '.vite', 'renderer', 'main_window', 'index.html');

  if (!(await exists(builtMain)) || !(await exists(builtIndexHtml))) {
    // Build production bundles (Forge Vite plugin) once.
    await runNpx(repoRoot, ['electron-forge', 'package']);
  }

  const electronApp = await electron.launch({
    args: [repoRoot],
    env: {
      ...process.env,
      // Force offline backend.
      SEJFA_MONITOR_URL: 'http://127.0.0.1:5999',
    },
  });

  const page = await electronApp.firstWindow();
  await page.setViewportSize({ width: 1152, height: 768 });

  await expect(page.getByText('Pipeline')).toBeVisible();
  await expect(page.getByText('OFFLINE')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Control' })).toBeVisible();
  await page.waitForTimeout(900);
  await attachScreenshot(page, 'main-offline');

  // Evidence drawer opens and closes with Escape.
  const pipeline = page.getByRole('navigation', { name: 'Gate pipeline' });
  await pipeline.getByRole('button', { name: /CI/i }).click();
  await expect(page.getByText(/CI evidence/i)).toBeVisible();
  await page.waitForTimeout(250);
  await attachScreenshot(page, 'evidence-open');
  await page.keyboard.press('Escape');
  await expect(page.getByText(/CI evidence/i)).toBeHidden();

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
  });
  await expect(page.getByText('Shortcuts')).toBeVisible();
  await page.waitForTimeout(250);
  await attachScreenshot(page, 'keyboard-help');
  await page.keyboard.press('Escape');
  await expect(page.getByText('Shortcuts')).toBeHidden();

  // Mode switch enables actions; kill is two-step in UI + IPC.
  await page.getByRole('button', { name: 'Control' }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled();
  await page.getByRole('button', { name: 'Arm Kill' }).click();
  await expect(page.getByRole('button', { name: 'KILL', exact: true })).toBeEnabled();
  await page.waitForTimeout(350);
  await attachScreenshot(page, 'kill-armed');
  await attachScreenshot(page, 'anim-frame-a');
  await page.waitForTimeout(900);
  await attachScreenshot(page, 'anim-frame-b');
  await page.getByRole('button', { name: 'KILL', exact: true }).click();

  await electronApp.close();
});
