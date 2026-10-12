const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
 testDir: './tests/browser',
 fullyParallel: true,
 use: { baseURL: 'http://127.0.0.1:8098', headless: true, screenshot: 'only-on-failure' },
 projects: [
  { name: 'desktop', use: { browserName: 'chromium', channel: process.env.MONO_CHROME_CHANNEL || undefined, viewport: { width: 1440, height: 1000 } } },
  { name: 'mobile', use: { browserName: 'chromium', channel: process.env.MONO_CHROME_CHANNEL || undefined, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
 ],
 webServer: { command: 'python3 scripts/preview.py', url: 'http://127.0.0.1:8098', reuseExistingServer: !process.env.CI }
});
