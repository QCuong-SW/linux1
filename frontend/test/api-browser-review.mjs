import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

// Run against local development services; each review uses fresh accounts.
const { chromium } = await import(process.env.MINIFLOW_PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.MINIFLOW_BASE_URL || 'http://localhost:3000';
const artifacts = process.env.MINIFLOW_REVIEW_ARTIFACTS || '/tmp/miniflow-review/artifacts';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const suffix = randomUUID();
const email = `review-${suffix}@example.test`;
const password = 'Review-password-123';
const projectName = `Review ${suffix}`;
const taskName = 'Kiểm tra API thật';
const heading = (name) => page.getByRole('heading', { name, exact: true });
const stats = async (values) => {
  await page.waitForFunction(
    (expected) =>
      JSON.stringify(
        [...document.querySelectorAll('.stat-card strong')].map((node) => node.textContent),
      ) === JSON.stringify(expected),
    values.map(String),
  );
};
async function authenticate(target, account, register = false) {
  await target.goto(register ? '/register' : '/login');
  await target.getByLabel('Email', { exact: true }).fill(account);
  await target.getByLabel(/Mật khẩu/).fill(password);
  await target
    .getByRole('button', { name: register ? 'Tạo tài khoản' : 'Đăng nhập', exact: true })
    .click();
  await target.waitForURL('**/dashboard');
  await target.locator('.stat-card strong').first().waitFor();
}
try {
  await page.goto('/projects');
  await page.waitForURL('**/login');
  await authenticate(page, email, true);
  await stats([0, 0, 0, 0]);
  await page.getByRole('button', { name: /Tạo Project/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên Project', { exact: true }).fill(`  ${projectName}  `);
  await dialog.getByRole('button', { name: 'Tạo mới', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await stats([1, 0, 0, 0]);
  await page
    .getByRole('link')
    .filter({ has: heading(projectName) })
    .click();
  await page.waitForURL('**/projects/*');
  await heading(projectName).waitFor();
  const projectURL = page.url();
  await stats([0, 0, 0, 0]);
  await page.getByRole('button', { name: /Tạo Task/ }).click();
  await dialog.getByLabel('Tên Task', { exact: true }).fill(taskName);
  await dialog.getByLabel(/Mô tả/).fill('Dữ liệu phải còn sau refresh.');
  await dialog.getByRole('button', { name: 'Tạo mới', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await stats([1, 1, 0, 0]);
  await page.getByRole('combobox', { name: `Trạng thái ${taskName}` }).selectOption('DONE');
  await stats([1, 0, 0, 1]);
  await page.reload();
  await heading(projectName).waitFor();
  await stats([1, 0, 0, 1]);
  assert.equal(
    await page.getByRole('combobox', { name: `Trạng thái ${taskName}` }).inputValue(),
    'DONE',
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    );
    await page.screenshot({ path: `${artifacts}/api-project-${width}.png`, fullPage: true });
  }
  await page.goto('/dashboard');
  await stats([1, 0, 0, 1]);
  const otherContext = await browser.newContext({ baseURL });
  try {
    const other = await otherContext.newPage();
    await authenticate(other, `other-${suffix}@example.test`, true);
    await other.goto(projectURL);
    try {
      await other.getByRole('heading', { name: 'Không tìm thấy Project', exact: true }).waitFor();
    } catch (error) {
      console.log(await other.locator('body').innerText());
      await other.screenshot({ path: `${artifacts}/api-ownership-error.png`, fullPage: true });
      throw error;
    }
    assert.equal(await other.getByRole('heading', { name: projectName, exact: true }).count(), 0);
  } finally {
    await otherContext.close();
  }
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.waitForURL('**/login');
  await page.goto(projectURL);
  await page.waitForURL('**/login');
  await authenticate(page, email);
  await stats([1, 0, 0, 1]);
  // A private API 401 must redirect the UI without retaining workspace data.
  await page.route('**/api/projects', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/projects');
  await page.waitForURL('**/login');
  await page
    .getByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', { exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'API browser review passed: auth, projects, tasks, persistence, ownership, logout, expiry, mobile.',
  );
  console.log(`Local review accounts: ${email}, other-${suffix}@example.test`);
} finally {
  await browser.close();
}
