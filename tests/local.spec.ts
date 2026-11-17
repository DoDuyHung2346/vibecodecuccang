import { test, expect, type Page } from '@playwright/test'

async function loadSample(page: Page, url = '/') {
  await page.goto(url)
  await page
    .getByRole('button', { name: 'Nạp dữ liệu mẫu', exact: true })
    .click()
  await page.getByRole('button', { name: 'Xác nhận nạp' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
test('nạp bộ BTC và tự kiểm tra QR tham chiếu', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loadSample(page)
  await expect(
    page.getByRole('heading', { name: 'Xin chào, Dũng Phạm' }),
  ).toBeVisible()
  await expect(page.locator('.points')).toContainText('3.200')
  await expect(page.locator('.membership')).toContainText('Hạng Bạc')
  await page.getByRole('button', { name: 'Mã của tôi' }).click()
  await expect(
    page.getByRole('dialog').getByRole('img', { name: 'QR KT-004' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Đóng', exact: true }).click()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
  await page.getByRole('link', { name: 'Giám khảo', exact: true }).click()
  await page.getByRole('button', { name: 'Tự kiểm tra' }).click()
  await expect(page.getByText('5/5 ca đạt')).toBeVisible()
  expect(errors).toEqual([])
})
test('TC-KT-01 và TC-KT-02 · cộng điểm và chặn giao dịch trùng', async ({
  page,
}) => {
  await loadSample(page, '/counter?member=KT-008&tx=TX-NEW-001&amount=1000000')
  await page.getByRole('button', { name: 'Cộng điểm', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Đã cộng điểm' }),
  ).toContainText('Số dư mới 100 điểm')
  await page.goto('/counter?member=KT-002&tx=tx-kt-002&amount=1500000')
  await page.getByRole('button', { name: 'Cộng điểm', exact: true }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'đã được cộng điểm' }),
  ).toContainText('TX-KT-002')
  await expect(page.locator('.member-summary')).toContainText('1.450 điểm')
})
test('TC-KT-03 và TC-KT-04 · đổi, dùng voucher, từ chối thiếu điểm', async ({
  page,
}) => {
  await loadSample(page, '/counter/redeem?member=KT-005')
  await page.getByRole('button', { name: 'Đổi ngay' }).first().click()
  await page.getByRole('button', { name: 'Xác nhận đổi' }).click()
  const result = page.getByRole('dialog', { name: 'Đổi thành công' })
  await expect(result).toContainText('Voucher 20.000đ')
  const code =
    (await result.locator('.voucher-code').textContent())?.trim() ?? ''
  await expect(page.locator('.member-summary')).toContainText('5.300 điểm')
  await page.goto('/counter/voucher')
  await page.getByLabel('Mã voucher').fill(code)
  await page.getByRole('button', { name: 'Tra cứu' }).click()
  await page.getByRole('button', { name: 'Xác nhận đã dùng' }).click()
  await expect(page.getByText(/^Đã dùng ·/)).toBeVisible()
  await page.goto('/counter/redeem?member=KT-008')
  await page.getByRole('button', { name: 'Đổi ngay' }).first().click()
  await page.getByRole('button', { name: 'Xác nhận đổi' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Chưa đủ điểm' }),
  ).toBeVisible()
  await expect(page.locator('.member-summary')).toContainText('0 điểm')
})
test('TC-KT-05 · quét ảnh QR chuẩn KT-004', async ({ page }) => {
  await loadSample(page, '/counter')
  await page.getByRole('button', { name: 'Quét QR' }).click()
  await page
    .getByLabel('Chọn ảnh QR')
    .setInputFiles('public/sample-qr/KT-004.png')
  await expect(page.locator('.member-summary')).toContainText('Dũng Phạm')
  await expect(page.locator('.member-summary')).toContainText('3.200 điểm')
})
test('offline · tải lại, đăng ký, cộng điểm và đổi ưu đãi', async ({
  page,
  context,
}) => {
  await loadSample(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        ),
      )
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText(/Đang offline/)).toBeVisible()
  await page.getByRole('button', { name: 'Chọn thẻ', exact: true }).click()
  await page.getByRole('button', { name: 'Đăng ký thẻ mới' }).click()
  await page.getByLabel('Họ và tên').fill('Lan Hương')
  await page.getByLabel('Số điện thoại').fill('0911222333')
  await page.getByRole('button', { name: 'Tạo thẻ thành viên' }).click()
  await expect(page.locator('.membership')).toContainText('KT-009')
  await page.goto('/counter?member=KT-009&tx=TX-OFFLINE&amount=6000000')
  await page.getByRole('button', { name: 'Cộng điểm', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Đã cộng điểm' }),
  ).toContainText('600 điểm')
  await page.goto('/m/rewards')
  await page.getByRole('button', { name: 'Đổi ngay' }).first().click()
  await page.getByRole('button', { name: 'Xác nhận đổi' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Đổi thành công' }),
  ).toBeVisible()
  await page.goto('/m/history')
  await expect(page.locator('.ledger')).toContainText('TX-OFFLINE')
  await expect(page.locator('.ledger')).toContainText('Số dư 100')
  await page.goto('/m/wallet')
  await expect(page.locator('.voucher')).toContainText('Voucher 20.000đ')
})
test('đồng bộ điểm giữa hai tab', async ({ page, context }) => {
  await loadSample(page)
  const counter = await context.newPage()
  await counter.goto('/counter?member=KT-004&tx=TX-TABS&amount=1000000')
  await counter.getByRole('button', { name: 'Cộng điểm', exact: true }).click()
  await expect(
    counter.getByRole('dialog', { name: 'Đã cộng điểm' }),
  ).toBeVisible()
  await expect(page.locator('.points')).toContainText('3.300')
})
test('khách hàng cũ bị bỏ chọn ngay khi sửa mã', async ({ page }) => {
  await loadSample(page, '/counter?member=KT-004&tx=TX-TARGET&amount=50000')
  await expect(page.locator('.member-summary')).toContainText('Dũng Phạm')
  const field = page.getByLabel('Mã thành viên hoặc số điện thoại')
  await field.fill('KT-999')
  await expect(
    page.getByRole('button', { name: 'Cộng điểm', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click()
  await expect(page.getByText(/Không tìm thấy thành viên/)).toBeVisible()
  await field.fill('KT-008')
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Cộng điểm', exact: true }),
  ).toBeEnabled()
  await expect(page.locator('.member-summary')).toContainText('Phúc Hoàng')
})
test('thống kê mẫu và giao diện không cuộn ngang ở 360px', async ({
  page,
}, info) => {
  if (info.project.name === 'mobile')
    await page.setViewportSize({ width: 360, height: 800 })
  await loadSample(page, '/judge')
  await page.getByRole('link', { name: 'Thống kê', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Thống kê chương trình' }),
  ).toBeVisible()
  await expect(
    page.locator('.kpi').filter({ hasText: 'Tổng thành viên' }),
  ).toContainText('8')
  await expect(
    page.locator('.kpi').filter({ hasText: 'Tổng điểm đã phát' }),
  ).toContainText('28.900')
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
  if (info.project.name === 'mobile') {
    await page.getByRole('combobox', { name: 'Chuyển vai' }).selectOption('m')
  } else {
    await page
      .getByRole('navigation', { name: 'Chuyển vai' })
      .getByRole('link', { name: 'Thành viên' })
      .click()
  }
  await expect(
    page.getByRole('heading', { name: 'Xin chào, Dũng Phạm' }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
  expect(
    (await page.getByRole('button', { name: 'Mã của tôi' }).boundingBox())
      ?.height,
  ).toBeGreaterThanOrEqual(44)
})
