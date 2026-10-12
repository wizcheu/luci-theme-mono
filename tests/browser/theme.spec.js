const { test, expect } = require('@playwright/test');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');

test('native LuCI surfaces render without script errors or page overflow', async ({ page }, info) => {
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 for (const route of ['/', '/cgi-bin/luci/admin/network/network', '/cgi-bin/luci/admin/system/system', '/cgi-bin/luci/admin/status/components', '/login', '/login-error']) {
  await page.goto(route);
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  if (!route.startsWith('/login')) await expect(page.locator('#mono-navigation details')).toHaveCount(4);
  expect(errors).toEqual([]);
 }
});

test('navigation search restores groups and exposes zero results', async ({ page }, info) => {
 await page.goto('/');
 if (info.project.name === 'mobile') await page.locator('#mono-sidebar-toggle').click();
 const search = page.locator('#mono-menu-search');
 await search.fill('OpenClash');
 await expect(page.getByRole('link', { name: 'OpenClash' })).toBeVisible();
 await expect(page.locator('#mono-navigation a[aria-current="page"]')).toBeHidden();
 await search.fill('no-such-plugin');
 await expect(page.locator('#mono-menu-empty')).toBeVisible();
 await search.fill('');
 await expect(page.locator('#mono-menu-empty')).toBeHidden();
 await expect(page.locator('.mono-nav-group').first()).toHaveAttribute('open', '');
 await expect(page.locator('.mono-nav-group').nth(2)).not.toHaveAttribute('open', '');
});

test('appearance persists across navigation and sidebar is keyboard accessible', async ({ page }, info) => {
 await page.goto('/');
 await page.locator('#mono-appearance').click();
 await expect(page.locator('html')).toHaveAttribute('data-darkmode', 'true');
 await page.goto('/cgi-bin/luci/admin/system/system');
 await expect(page.locator('html')).toHaveAttribute('data-darkmode', 'true');
 const toggle = page.locator('#mono-sidebar-toggle');
 await toggle.click();
 if (info.project.name === 'mobile') {
  await expect(page.locator('#mono-backdrop')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(page.locator('#mono-sidebar')).toHaveJSProperty('inert', true);
 } else {
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
 }
});

test('forms, modal and native login preserve usable controls', async ({ page }) => {
 await page.goto('/cgi-bin/luci/admin/system/system');
 await page.getByLabel('主机名', { exact: true }).fill('new-hostname');
 await page.getByRole('button', { name: '保存并应用', exact: true }).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button', { name: '关闭', exact: true }).click();
 await page.getByRole('button', { name: '重置', exact: true }).click();
 await expect(page.getByLabel('主机名', { exact: true })).toHaveValue('OpenWrt');
 await page.goto('/login');
 await expect(page.getByLabel('密码', { exact: true })).toBeFocused();
 await page.getByLabel('密码', { exact: true }).fill('preview-only');
 await page.getByRole('button', { name: '登录', exact: true }).click();
 await expect(page.getByRole('alert')).toContainText('用户名或密码错误');
});

test('capture light, dark and login previews', async ({ page }, info) => {
 const directory = join(process.cwd(), 'preview', 'screenshots');
 mkdirSync(directory, { recursive: true });
 await page.goto('/cgi-bin/luci/admin/system/system');
 await page.waitForLoadState('networkidle');
 await page.screenshot({ path: join(directory, info.project.name + '-light.png'), fullPage: true });
 await page.locator('#mono-appearance').click();
 await expect(page.locator('.cbi-button-apply')).toHaveCSS('background-color', 'rgb(250, 250, 250)');
 await page.screenshot({ path: join(directory, info.project.name + '-dark.png'), fullPage: true });
 await page.locator('#mono-appearance').click();
 await page.goto('/login');
 await page.screenshot({ path: join(directory, info.project.name + '-login.png'), fullPage: true });
});

test('primary and secondary button text stay readable in both appearances', async ({ page }) => {
 await page.goto('/cgi-bin/luci/admin/system/system');
 for (const dark of [false, true]) {
  if (dark) await page.locator('#mono-appearance').click();
  await expect(page.locator('.cbi-button-apply')).toHaveCSS('background-color', dark ? 'rgb(250, 250, 250)' : 'rgb(23, 23, 23)');
  const ratios = await page.locator('.cbi-page-actions button').evaluateAll(buttons => buttons.map(button => {
   const style = getComputedStyle(button);
   function luminance(color) {
    const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
   }
   const a = luminance(style.color), b = luminance(style.backgroundColor);
   return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  }));
  ratios.forEach(ratio => expect(ratio).toBeGreaterThanOrEqual(4.5));
 }
});
