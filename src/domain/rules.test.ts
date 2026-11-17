import { describe, it, expect } from 'vitest'
import {
  earn,
  reconcile,
  redeem,
  register,
  sample,
  stats,
  tier,
  markVoucherUsed,
  voucherStatus,
} from './rules'
const now = '2026-11-17T09:00:00+07:00'
describe('Dữ liệu và nghiệp vụ', () => {
  const db = sample(now)
  it('nạp dữ liệu BTC đúng số dư, giao dịch và thống kê', () => {
    expect(db.members['KT-004'].points).toBe(3200)
    expect(db.ledger).toHaveLength(7)
    expect(db.rewards).toHaveLength(3)
    expect(db.vouchers).toHaveLength(0)
    expect(reconcile(db)).toEqual([])
    expect(stats(db)).toEqual({
      members: 8,
      issued: 28900,
      spent: 200,
      circulating: 28700,
    })
  })
  it.each([
    [999, 'bronze'],
    [1000, 'silver'],
    [4999, 'silver'],
    [5000, 'gold'],
  ])('hạng tại %s điểm', (n, expected) =>
    expect(tier(n as number, db.settings)).toBe(expected),
  )
  it('đăng ký, cấp mã tuần tự và chuẩn hóa điện thoại', () => {
    const next = register(db, ' Lan Hương ', '+84911222333', now)
    expect(next.members['KT-009']).toMatchObject({
      fullName: 'Lan Hương',
      phone: '0911222333',
      joinedAt: '2026-11-17',
    })
    expect(() => register(next, 'Lan', '0911 222 333', now)).toThrow(
      /đã đăng ký/,
    )
  })
  it('TC-KT-01 cộng đúng và làm tròn xuống, giữ nguyên đầu vào', () => {
    const next = earn(db, 'kt-008', 1009999, 'tx-new-001', now)
    expect(next.members['KT-008'].points).toBe(100)
    expect(db.members['KT-008'].points).toBe(0)
  })
  it.each(['TX-KT-002', ' tx-kt-002 '])(
    'TC-KT-02 từ chối trùng %s trên toàn hệ thống',
    (tx) =>
      expect(() => earn(db, 'KT-008', 1500000, tx, now)).toThrow(
        /đã được cộng/,
      ),
  )
  it('TC-KT-03 đổi đúng điểm, voucher dùng một lần', () => {
    const next = redeem(db, 'KT-005', 'KT-VCH-01', now)
    expect(next.members['KT-005'].points).toBe(5300)
    const v = next.vouchers[0]
    expect(voucherStatus(v, Date.parse(now) + 31 * 86400000)).toBe('expired')
    const used = markVoucherUsed(next, v.code, now)
    expect(used.vouchers[0].status).toBe('used')
    expect(() => markVoucherUsed(used, v.code, now)).toThrow(/đã được sử dụng/)
  })
  it('TC-KT-04 từ chối thiếu điểm', () =>
    expect(() => redeem(db, 'KT-008', 'KT-VCH-01', now)).toThrow(
      /Chưa đủ điểm/,
    ))
  it('kiểm tra mã trước số tiền, và số tiền trước hồ sơ', () => {
    expect(() => earn(db, 'KT-999', -1, '?', now)).toThrow(/Mã giao dịch/)
    expect(() => earn(db, 'KT-999', -1, 'TX-000', now)).toThrow(/Nhập số tiền/)
    expect(() => earn(db, 'KT-999', 9999, 'TX-000', now)).toThrow(/tối thiểu/)
  })
})
