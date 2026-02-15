import { spawn } from 'node:child_process';

import { _electron as electron, expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type Rect = { x: number; y: number; width: number; height: number };

function intersects(a: Rect, b: Rect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
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
  // Always rebuild bundles so the smoke test covers current source.
  await runNpx(repoRoot, ['electron-forge', 'package']);

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

  await expect(
    page.getByRole('img', { name: 'Orbital loop visualization showing pipeline stages' }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/offline/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Control' })).toBeVisible();
  await page.waitForTimeout(900);
  await attachScreenshot(page, 'main-offline');

  await page.setViewportSize({ width: 900, height: 768 });
  await expect(page.getByLabel('Filter nodes')).toBeVisible();
  await expect(page.getByTestId('events-count')).toBeVisible();
  await expect(page.getByLabel('Toggle live tail')).toBeVisible();
  await page.waitForTimeout(250);
  await attachScreenshot(page, 'log-header-narrow');

  const nodeFilterBox = await page.getByLabel('Filter nodes').boundingBox();
  const eventsCountBox = await page.getByTestId('events-count').boundingBox();
  const liveToggleBox = await page.getByLabel('Toggle live tail').boundingBox();

  expect(nodeFilterBox).not.toBeNull();
  expect(eventsCountBox).not.toBeNull();
  expect(liveToggleBox).not.toBeNull();

  const rects: Record<string, Rect> = {
    nodeFilter: nodeFilterBox as Rect,
    eventsCount: eventsCountBox as Rect,
    liveToggle: liveToggleBox as Rect,
  };

  expect(intersects(rects.nodeFilter, rects.eventsCount)).toBeFalsy();
  expect(intersects(rects.nodeFilter, rects.liveToggle)).toBeFalsy();
  expect(intersects(rects.eventsCount, rects.liveToggle)).toBeFalsy();

  await page.setViewportSize({ width: 1152, height: 768 });

  // Dismiss disconnected overlay so gates are clickable.
  const overlay = page.locator('.z-40').first();
  if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByLabel('Dismiss overlay').click({ force: true });
    await expect(overlay).toBeHidden({ timeout: 3000 });
  }

  // Evidence drawer opens and closes with Escape.
  await page.getByLabel('Select CI gate').click();
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
  await expect(page.getByRole('button', { name: 'Start Agent' })).toBeEnabled();
  await page.getByRole('button', { name: 'ARM KILL' }).click();
  await expect(page.getByRole('button', { name: 'CONFIRM KILL' })).toBeVisible();
  await page.waitForTimeout(350);
  await attachScreenshot(page, 'kill-armed');
  await attachScreenshot(page, 'anim-frame-a');
  await page.waitForTimeout(900);
  await attachScreenshot(page, 'anim-frame-b');
  await page.getByRole('button', { name: 'CONFIRM KILL' }).click();

  await electronApp.close();
});
