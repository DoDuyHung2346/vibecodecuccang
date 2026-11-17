import { DomainError, earn, redeem, sample } from './rules'
export function selfTest() {
  const now = new Date().toISOString()
  const db = sample(now)
  function rejected(fn: () => unknown, code: string) {
    try {
      fn()
      return false
    } catch (e) {
      return e instanceof DomainError && e.code === code
    }
  }
  const redeemed = redeem(db, 'KT-005', 'KT-VCH-01', now)
  return [
    earn(db, 'KT-008', 1e6, 'TX-NEW-001', now).members['KT-008'].points === 100,
    rejected(
      () => earn(db, 'KT-002', 1500000, ' tx-kt-002 ', now),
      'DUPLICATE_TX',
    ),
    redeemed.members['KT-005'].points === 5300 &&
      redeemed.vouchers.length === 1,
    rejected(
      () => redeem(db, 'KT-008', 'KT-VCH-01', now),
      'INSUFFICIENT_POINTS',
    ) && db.members['KT-008'].points === 0,
  ]
}
