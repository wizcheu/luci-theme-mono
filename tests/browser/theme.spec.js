const { test, expect } = require('@playwright/test');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const fixtures = require('../../preview/mirror/responses.json');

const routes = fixtures.pages.map(page => page.path).concat([
 '/cgi-bin/luci/admin/status/components', '/login', '/login-error'
]);

async function ready(page) {
 await page.waitForLoadState('networkidle');
 await expect(page.locator('#view > .spinning')).toBeHidden();
}

// Each run uses its own mirror on port 8103, never the user's preview on 8101.
test.beforeEach(async ({ request }) => {
 await request.post('/__mirror/reset');
});

test('all captured native pages load without script errors or page overflow', async ({ page }) => {
 test.setTimeout(180000);
 const errors = [];
 page.on('pageerror', error => {
  // LuCI may cancel its active poll when navigating away from the document.
  if (!/XHR request aborted by browser/.test(error.message)) errors.push(error.message);
 });
 for (const route of routes) {
  const response = await page.goto(route);
  expect(response.status(), route).toBe(200);
  await ready(page);
  await expect(page.locator('body')).toHaveClass(/mono/);
  if (!route.startsWith('/login')) await expect(page.locator('#mono-navigation details')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
  expect(errors, route).toEqual([]);
 }
});

test('package upgrades refresh an existing session menu', async ({ page }) => {
 await page.goto('/');
 await ready(page);
 await page.evaluate(async () => {
  const session = await L.require('session');
  const menu = session.getLocalData('menu');
  const status = menu.children.admin.children.status.children;
  status.aeris = status.mono;
  delete status.mono;
  session.setLocalData('menu', menu);
  session.setLocalData('mono-menu-version', 'previous-package-version');
 });
 await page.reload();
 await ready(page);
 await expect(page.locator('#mono-navigation a[href="/cgi-bin/luci/admin/status/mono"]')).toHaveCount(1);
 await expect(page.locator('#mono-navigation a[href="/cgi-bin/luci/admin/status/aeris"]')).toHaveCount(0);
});

test('menu search filters native routes and restores the active group', async ({ page }, info) => {
 await page.goto('/');
 await ready(page);
 if (info.project.name === 'mobile') await page.locator('#mono-sidebar-toggle').click();
 const search = page.locator('#mono-menu-search');
 await search.click();
 await search.fill('OpenClash');
 await expect(page.getByRole('link', { name: 'OpenClash', exact: true })).toBeVisible();
 await expect(page.locator('#mono-navigation a[aria-current="page"]')).toBeHidden();
 await search.fill('no-such-plugin');
 await expect(page.locator('#mono-menu-empty')).toBeVisible();
 await search.fill('');
 await expect(page.locator('#mono-menu-empty')).toBeHidden();
 await expect(page.locator('.mono-nav-group').first()).toHaveAttribute('open', '');
});

test('appearance persists and the mobile sidebar supports Escape', async ({ page }, info) => {
 await page.goto('/');
 await ready(page);
 await page.locator('#mono-appearance').click();
 await expect(page.locator('html')).toHaveAttribute('data-darkmode', 'true');
 await page.goto('/cgi-bin/luci/admin/system/system');
 await ready(page);
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
 await page.keyboard.press('Control+k');
 await expect(page.locator('#mono-menu-search')).toBeFocused();
});

test('native interface dialog keeps editable fields, selection and visible actions', async ({ page }) => {
 await page.goto('/cgi-bin/luci/admin/network/network');
 await ready(page);
 await page.locator('#cbi-network-lan').getByRole('button', { name: '编辑', exact: true }).click();
 const dialog = page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeInViewport();
 await dialog.getByLabel('IPv4 地址', { exact: true }).fill('192.0.2.77');
 await expect(dialog.getByLabel('IPv4 地址', { exact: true })).toHaveValue('192.0.2.77');
 await dialog.getByRole('combobox', { name: '协议', exact: true }).click();
 await expect(page.getByRole('listbox')).toBeVisible();
 await page.keyboard.press('Escape');
 await dialog.getByRole('button', { name: '关闭', exact: true }).click();
 await expect(dialog).toBeHidden();
});

test('save and apply survives reload locally and reset restores the fixture', async ({ page }) => {
 await page.goto('/cgi-bin/luci/admin/system/system');
 await ready(page);
 const hostname = page.getByLabel('主机名', { exact: true });
 const original = await hostname.inputValue();
 await hostname.fill('Mono-Preview');
 await page.locator('.cbi-page-actions .cbi-button-apply > ul:not(.dropdown)').click();
 await expect.poll(async () => (await (await page.request.get('/__mirror/status')).json()).actions.some(action => action.method === 'apply')).toBe(true);
 await expect(page.locator('#modal_overlay')).toBeHidden({ timeout: 20000 });
 await page.reload();
 await expect(hostname).toHaveValue('Mono-Preview');
 await page.getByRole('button', { name: '重置示例', exact: true }).click();
 await expect(hostname).toHaveValue(original);
});

test('login shows its local error without running native authenticated scripts', async ({ page }) => {
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto('/login');
 await expect(page.getByLabel('密码', { exact: true })).toBeFocused();
 await page.getByLabel('密码', { exact: true }).fill('preview-only');
 await page.getByRole('button', { name: '登录', exact: true }).click();
 await expect(page.getByRole('alert')).toContainText('用户名或密码错误');
 expect(errors).toEqual([]);
});

test('monochrome primary actions remain readable in both appearances', async ({ page }, info) => {
 await page.goto('/cgi-bin/luci/admin/system/system');
 await ready(page);
 const directory = join(process.cwd(), 'preview', 'screenshots');
 mkdirSync(directory, { recursive: true });
 for (const dark of [false, true]) {
  if (dark) await page.locator('#mono-appearance').click();
  const apply = page.locator('.cbi-page-actions .cbi-button-apply');
  await expect(apply).toHaveCSS('background-color', dark ? 'rgb(250, 250, 250)' : 'rgb(23, 23, 23)');
  await expect(apply).toHaveCSS('color', dark ? 'rgb(23, 23, 23)' : 'rgb(250, 250, 250)');
  await page.screenshot({ path: join(directory, info.project.name + (dark ? '-dark.png' : '-light.png')), fullPage: true });
 }
});
