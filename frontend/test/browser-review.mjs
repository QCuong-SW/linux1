import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Optional browser review runner; keep Playwright outside app dependencies.
const { chromium } = await import(process.env.MINIFLOW_PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.MINIFLOW_BASE_URL || 'http://127.0.0.1:3000';
const artifacts = process.env.MINIFLOW_REVIEW_ARTIFACTS || '/tmp/miniflow-review/artifacts';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(20000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
const visible = (locator) => locator.waitFor({ state: 'visible' });
const hidden = (locator) => locator.waitFor({ state: 'hidden' });
const heading = (name) => page.getByRole('heading', { name, exact: true });
const controls = async () => {
  const details = page.locator('.demo-controls');
  if (!(await details.evaluate((element) => element.open)))
    await details.locator('summary').click();
};
const stats = async (expected) => {
  await page.waitForFunction(
    (values) =>
      JSON.stringify(
        [...document.querySelectorAll('.stat-card strong')].map((node) => node.textContent),
      ) === JSON.stringify(values),
    expected.map(String),
  );
};
const noOverflow = async () =>
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
const createButton = () => page.getByRole('button', { name: 'Tạo mới', exact: true });
const dialog = () => page.getByRole('dialog');

try {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.getByRole('link', { name: 'Đăng ký', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo tài khoản demo' }).click();
  await visible(page.getByText('Vui lòng nhập email.', { exact: true }));
  assert.equal(
    await page
      .getByLabel('Email', { exact: true })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await page.getByLabel('Email', { exact: true }).fill('review@example.com');
  await page.getByLabel('Mật khẩu (ít nhất 8 ký tự)', { exact: true }).fill('1234567');
  await page.getByRole('button', { name: 'Tạo tài khoản demo' }).click();
  await visible(page.getByText('Mật khẩu cần ít nhất 8 ký tự.', { exact: true }));
  await page.getByLabel('Mật khẩu (ít nhất 8 ký tự)', { exact: true }).fill('demo1234');
  await page.getByLabel('Mô phỏng lỗi xác thực').check();
  await page.getByRole('button', { name: 'Tạo tài khoản demo' }).click();
  await visible(page.getByRole('alert'));
  assert.equal(
    await page.getByLabel('Mật khẩu (ít nhất 8 ký tự)', { exact: true }).inputValue(),
    '',
  );
  await page.getByLabel('Mô phỏng lỗi xác thực').uncheck();
  await page.getByLabel('Mật khẩu (ít nhất 8 ký tự)', { exact: true }).fill('demo1234');
  await page.getByRole('button', { name: 'Tạo tài khoản demo' }).click();
  await page.waitForURL('**/dashboard');
  await stats([3, 5, 2, 2]);
  await noOverflow();
  assert.equal(await page.locator('.task-table tbody tr').count(), 5);
  await page.screenshot({ path: `${artifacts}/dashboard-desktop.png`, fullPage: true });

  await controls();
  await page.getByLabel('Mô phỏng lỗi tải dữ liệu').check();
  await visible(page.getByRole('alert'));
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await visible(page.getByRole('alert'));
  await page.getByLabel('Mô phỏng lỗi tải dữ liệu').uncheck();
  await stats([3, 5, 2, 2]);
  await page.getByRole('button', { name: 'Bắt đầu demo trống' }).click();
  await stats([0, 0, 0, 0]);
  await visible(heading('Chưa có Project'));

  await page.getByRole('button', { name: '＋ Tạo Project', exact: true }).click();
  await visible(dialog());
  const name = page.getByLabel('Tên Project', { exact: true });
  assert.equal(await name.evaluate((element) => element === document.activeElement), true);
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab');
    assert.equal(
      await dialog().evaluate((element) => element.contains(document.activeElement)),
      true,
    );
  }
  await page.keyboard.press('Escape');
  await hidden(dialog());
  assert.equal(
    await page
      .getByRole('button', { name: '＋ Tạo Project', exact: true })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await page.getByRole('button', { name: '＋ Tạo Project', exact: true }).click();
  await name.fill('   ');
  await createButton().click();
  await visible(page.getByText('Vui lòng nhập tên.', { exact: true }));
  await name.fill('x'.repeat(101));
  await createButton().click();
  await visible(page.getByText('Tên tối đa 100 ký tự.', { exact: true }));
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await controls();
  await page.getByLabel('Mô phỏng lỗi tạo / cập nhật').check();
  await page.getByRole('button', { name: '＋ Tạo Project', exact: true }).click();
  await name.fill('  Review Project  ');
  await createButton().click();
  await visible(dialog().getByRole('alert'));
  assert.equal(await name.inputValue(), '  Review Project  ');
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.getByLabel('Mô phỏng lỗi tạo / cập nhật').uncheck();
  await page.getByRole('button', { name: '＋ Tạo Project', exact: true }).click();
  await name.fill('  Review Project  ');
  await createButton().click();
  await visible(page.getByRole('button', { name: 'Đang tạo…', exact: true }));
  await page.keyboard.press('Escape');
  assert.equal(await dialog().isVisible(), true);
  await hidden(dialog());
  await stats([1, 0, 0, 0]);
  assert.equal(await page.locator('.project-card').count(), 1);
  assert.match(await page.locator('.project-card').innerText(), /0%/);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await visible(heading('Projects'));
  await visible(page.locator('.project-card'));
  assert.equal(await page.locator('.project-card').count(), 1);
  await page.locator('.project-card').click();
  await visible(heading('Review Project'));
  await stats([0, 0, 0, 0]);
  await visible(heading('Project chưa có Task'));

  await page.getByRole('button', { name: '＋ Tạo Task', exact: true }).click();
  const taskName = page.getByLabel('Tên Task', { exact: true });
  const description = page.getByLabel('Mô tả (tùy chọn)', { exact: true });
  await taskName.fill('Review Task');
  await description.fill('x'.repeat(1001));
  await createButton().click();
  await visible(page.getByText('Mô tả tối đa 1.000 ký tự.', { exact: true }));
  await description.fill('Verify shared progress');
  await createButton().click();
  await hidden(dialog());
  await stats([1, 1, 0, 0]);
  const status = page.getByRole('combobox', { name: 'Trạng thái Review Task', exact: true });
  await controls();
  await page.getByLabel('Mô phỏng lỗi tạo / cập nhật').check();
  await status.selectOption('DONE');
  await visible(page.getByRole('alert'));
  assert.equal(await status.inputValue(), 'TODO');
  await stats([1, 1, 0, 0]);
  await page.getByLabel('Mô phỏng lỗi tạo / cập nhật').uncheck();
  await page.getByRole('button', { name: /^Cần làm 1$/ }).click();
  await status.selectOption('DONE');
  await stats([1, 0, 0, 1]);
  await visible(heading('Bộ lọc chưa có Task'));
  assert.equal(
    await page
      .getByRole('button', { name: /^Cần làm 0$/ })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await page.getByRole('button', { name: /^Hoàn thành 1$/ }).click();
  await visible(status);
  await page.getByRole('button', { name: '＋ Tạo Task', exact: true }).click();
  await taskName.fill('Second Task');
  await createButton().click();
  await hidden(dialog());
  await stats([2, 1, 0, 1]);
  assert.equal(
    await page.getByRole('button', { name: /^Tất cả 2$/ }).getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(await page.locator('.task-table tbody tr').count(), 2);
  await page
    .getByRole('combobox', { name: 'Trạng thái Second Task', exact: true })
    .selectOption('IN_PROGRESS');
  await stats([2, 0, 1, 1]);
  await page
    .getByRole('combobox', { name: 'Trạng thái Second Task', exact: true })
    .selectOption('TODO');
  await stats([2, 1, 0, 1]);
  await page.screenshot({ path: `${artifacts}/project-desktop.png`, fullPage: true });

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await noOverflow();
    await page.getByRole('button', { name: '＋ Tạo Task', exact: true }).click();
    await visible(dialog());
    await noOverflow();
    const box = await dialog().boundingBox();
    assert.ok(Math.abs(box.x + box.width / 2 - width / 2) < 2);
    assert.ok(Math.abs(box.y + box.height / 2 - 844 / 2) < 2);
    await page.screenshot({ path: `${artifacts}/task-modal-${width}.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await hidden(dialog());
  }
  await page.screenshot({ path: `${artifacts}/project-mobile.png`, fullPage: true });
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await stats([1, 1, 0, 1]);
  assert.match(await page.locator('.project-card').innerText(), /50%/);
  assert.equal(await page.locator('.task-table tbody tr').count(), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({ path: `${artifacts}/dashboard-mobile.png`, fullPage: true });
  await page.locator('.task-table').getByRole('link', { name: 'Second Task', exact: true }).click();
  await page.waitForURL('**/projects/new-project-1');
  await visible(heading('Review Project'));
  // The history starts at /login. Returning there while signed in must keep session data.
  for (let index = 0; index < 5; index++) await page.goBack();
  await page.waitForURL('**/dashboard');
  await stats([1, 1, 0, 1]);
  await page.locator('.project-card').click();
  await page.waitForURL('**/projects/new-project-1');
  await visible(heading('Review Project'));
  await controls();
  await page.getByRole('button', { name: 'Bắt đầu demo trống' }).click();
  await visible(heading('Không tìm thấy Project'));
  await page.getByRole('link', { name: 'Quay lại danh sách Projects →' }).click();
  await visible(heading('Chưa có Project'));
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.waitForURL('**/login');
  await page.getByLabel('Email', { exact: true }).fill('another@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('demo1234');
  await page.getByRole('button', { name: 'Đăng nhập demo', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await stats([3, 5, 2, 2]);
  await page.reload();
  await page.waitForURL('**/login');
  await page.goto('/projects/does-not-exist');
  await page.waitForURL('**/login');
  assert.deepEqual(errors, []);
  console.log(
    'PASS: full journey, retry, validation, pending, modal keyboard/focus, filters, shared stats, session reset, mobile 320/390/768.',
  );
  console.log(`Screenshots: ${artifacts}`);
} catch (error) {
  await page.screenshot({ path: `${artifacts}/failure.png`, fullPage: true });
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
}
