import {
  database,
  rewardSchema,
  type DB,
  type Settings,
  type Member,
  type Entry,
  type Voucher,
} from './model'
import seed from '../data/seed.json'
export const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n)
export const money = (n: number) => fmt(n) + 'đ'
export const dateTime = (s: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(s))
const vietnamDate = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
})
export function localDay(s: string) {
  const parts = Object.fromEntries(
    vietnamDate
      .formatToParts(new Date(s))
      .map(({ type, value }) => [type, value]),
  )
  return [parts.year, parts.month, parts.day].join('-')
}
export const tier = (p: number, s: Settings) =>
  p >= s.goldMin ? 'gold' : p >= s.silverMin ? 'silver' : 'bronze'
export const tiers = { bronze: 'Đồng', silver: 'Bạc', gold: 'Vàng' }
export const tierRank = { bronze: 0, silver: 1, gold: 2 }
export const types = {
  earn: 'Cộng điểm',
  redeem: 'Đổi điểm',
  adjust: 'Điều chỉnh',
  reversal: 'Hoàn tác',
}
export const normCode = (s: string) => s.normalize('NFKC').trim().toUpperCase()
export const normPhone = (s: string) =>
  s
    .trim()
    .replace(/[\s().-]/g, '')
    .replace(/^\+?84(?=\d{9}$)/, '0')
export const earned = (amount: number, s: Settings) =>
  Math.floor(amount / s.vndPerPoint)
export const defaults: Settings = {
  programName: import.meta.env.VITE_APP_NAME?.trim() || 'Vibe Rewards',
  vndPerPoint: 10000,
  silverMin: 1000,
  goldMin: 5000,
  voucherValidDays: 30,
}
const initialRewards = seed.rewards.map((reward) => rewardSchema.parse(reward))
export const empty = (now: string): DB => ({
  schemaVersion: 1,
  settings: { ...defaults },
  members: {},
  ledger: [],
  rewards: initialRewards.map((r) => ({ ...r })),
  vouchers: [],
  codeSeq: 0,
  meta: { updatedAt: now },
})
export const sample = (now: string) =>
  database.parse({
    ...empty(now),
    members: seed.members,
    ledger: seed.ledger,
    rewards: seed.rewards,
    codeSeq: Math.max(
      ...Object.keys(seed.members).map((code) => Number(code.slice(3))),
    ),
    meta: { updatedAt: now, sampleLoadedAt: now },
  })
export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}
const fail = (code: string, message: string): never => {
  throw new DomainError(code, message)
}
export function findMember(db: DB, query: string): Member | undefined {
  const code = normCode(query)
  return (
    (Object.prototype.hasOwnProperty.call(db.members, code)
      ? db.members[code]
      : undefined) ??
    Object.values(db.members).find((m) => m.phone === normPhone(query))
  )
}
const requireMember = (db: DB, code: string) =>
  findMember(db, code) ??
  fail(
    'MEMBER_NOT_FOUND',
    'Không tìm thấy thành viên. Kiểm tra lại mã hoặc số điện thoại.',
  )
const activeMember = (db: DB, code: string) => {
  const m = requireMember(db, code)
  if (m.status === 'locked')
    fail('MEMBER_LOCKED', 'Thẻ đang bị khóa, chưa thể giao dịch.')
  return m
}
export function validateMember(
  db: DB,
  fullName: string,
  phone: string,
  except?: string,
) {
  const name = fullName.trim(),
    normalized = normPhone(phone)
  if (name.length < 2 || name.length > 80)
    fail('INVALID_NAME', 'Vui lòng nhập họ tên (2–80 ký tự).')
  if (!/^0\d{9}$/.test(normalized))
    fail('INVALID_PHONE', 'Nhập 10 số bắt đầu bằng 0 hoặc số dạng +84.')
  if (
    Object.values(db.members).some(
      (m) => m.phone === normalized && m.code !== except,
    )
  )
    fail('PHONE_EXISTS', 'Số điện thoại này đã đăng ký thẻ.')
  return { fullName: name, phone: normalized }
}
export function register(db: DB, name: string, phone: string, now: string) {
  const details = validateMember(db, name, phone)
  const codeSeq = db.codeSeq + 1
  const code = 'KT-' + String(codeSeq).padStart(3, '0')
  const member: Member = {
    ...details,
    code,
    points: 0,
    openingPoints: 0,
    status: 'active',
    joinedAt: localDay(now),
  }
  return { ...db, codeSeq, members: { ...db.members, [code]: member } }
}
function change(
  db: DB,
  m: Member,
  entry: Omit<Entry, 'memberCode' | 'balanceAfter'>,
): DB {
  const points = m.points + entry.delta
  if (points < 0)
    fail('INSUFFICIENT_POINTS', 'Chưa đủ điểm. Số dư không thay đổi.')
  if (!Number.isSafeInteger(points))
    fail('INVALID_AMOUNT', 'Số dư vượt giới hạn hỗ trợ.')
  return {
    ...db,
    members: { ...db.members, [m.code]: { ...m, points } },
    ledger: [
      ...db.ledger,
      { ...entry, memberCode: m.code, balanceAfter: points },
    ],
  }
}
export function earn(
  db: DB,
  code: string,
  amount: number,
  raw: string,
  now: string,
) {
  const txCode = normCode(raw)
  if (!/^[A-Z0-9][A-Z0-9._/-]{2,39}$/.test(txCode))
    fail('INVALID_TX_CODE', 'Mã giao dịch cần 3–40 ký tự chữ, số hoặc - _ . /.')
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1e9)
    fail('INVALID_AMOUNT', 'Nhập số tiền nguyên dương, tối đa 1 tỷ đồng.')
  const delta = earned(amount, db.settings)
  if (delta === 0)
    fail(
      'AMOUNT_TOO_SMALL',
      'Giao dịch cần tối thiểu ' +
        money(db.settings.vndPerPoint) +
        ' để tích điểm.',
    )
  const m = activeMember(db, code)
  const prev = db.ledger.find((e) => normCode(e.txCode) === txCode)
  if (prev)
    fail(
      'DUPLICATE_TX',
      `Mã giao dịch ${txCode} đã được cộng điểm cho ${prev.memberCode} lúc ${dateTime(prev.createdAt)}. Không cộng điểm lần nữa.`,
    )
  return change(db, m, {
    txCode,
    type: 'earn',
    amountVnd: amount,
    delta,
    createdAt: now,
  })
}
function availableCode(used: string[], prefix: string): string {
  let i = used.length + 1
  while (used.includes(prefix + i.toString(36).toUpperCase().padStart(8, '0')))
    i++
  return prefix + i.toString(36).toUpperCase().padStart(8, '0')
}
export function redeem(db: DB, code: string, rewardCode: string, now: string) {
  const m = activeMember(db, code)
  const r =
    db.rewards.find((r) => r.code === rewardCode && r.active) ??
    fail('REWARD_UNAVAILABLE', 'Ưu đãi này hiện không còn áp dụng.')
  if (m.points < r.costPoints)
    fail(
      'INSUFFICIENT_POINTS',
      `Chưa đủ điểm: cần ${fmt(r.costPoints)}, hiện có ${fmt(m.points)} (thiếu ${fmt(r.costPoints - m.points)}). Số dư không thay đổi.`,
    )
  const txCode = availableCode(
    db.ledger.map((e) => e.txCode),
    'RD-',
  )
  const voucher: Voucher = {
    code: availableCode(
      db.vouchers.map((v) => v.code),
      'VC-',
    ),
    memberCode: m.code,
    rewardCode: r.code,
    rewardName: r.name,
    costPoints: r.costPoints,
    status: 'active',
    issuedAt: now,
    expiresAt: new Date(
      Date.parse(now) + db.settings.voucherValidDays * 86400000,
    ).toISOString(),
    redeemTxCode: txCode,
  }
  return {
    ...change(db, m, {
      txCode,
      type: 'redeem',
      delta: -r.costPoints,
      amountVnd: 0,
      rewardCode: r.code,
      note: r.name,
      createdAt: now,
    }),
    vouchers: [...db.vouchers, voucher],
  }
}
export const voucherStatus = (v: Voucher, now = Date.now()) =>
  v.status === 'used'
    ? 'used'
    : Date.parse(v.expiresAt) < now
      ? 'expired'
      : 'active'
export function markVoucherUsed(db: DB, code: string, now: string) {
  const v =
    db.vouchers.find((v) => v.code === normCode(code)) ??
    fail('VOUCHER_NOT_FOUND', 'Không tìm thấy voucher với mã này.')
  const status = voucherStatus(v, Date.parse(now))
  if (status === 'used')
    fail(
      'VOUCHER_USED',
      'Voucher đã được sử dụng lúc ' + dateTime(v.usedAt ?? v.issuedAt) + '.',
    )
  if (status === 'expired')
    fail(
      'VOUCHER_EXPIRED',
      'Voucher đã hết hạn ngày ' + dateTime(v.expiresAt) + '.',
    )
  return {
    ...db,
    vouchers: db.vouchers.map((item) =>
      item === v ? { ...v, status: 'used' as const, usedAt: now } : item,
    ),
  }
}
export function stats(db: DB) {
  const members = Object.values(db.members)
  const issued =
    members.reduce((s, m) => s + m.openingPoints, 0) +
    db.ledger.reduce(
      (s, e) =>
        s +
        (e.type === 'earn' ||
        e.type === 'reversal' ||
        (e.type === 'adjust' && e.delta > 0)
          ? e.delta
          : 0),
      0,
    )
  const spent = db.ledger.reduce(
    (s, e) =>
      s +
      (e.type === 'redeem' || (e.type === 'adjust' && e.delta < 0)
        ? -e.delta
        : 0),
    0,
  )
  const circulating = members.reduce((s, m) => s + m.points, 0)
  return { members: members.length, issued, spent, circulating }
}
export const reconcile = (db: DB) =>
  Object.values(db.members).filter((m) => {
    let balance = m.openingPoints
    return (
      db.ledger
        .filter((e) => e.memberCode === m.code)
        .some((e) => (balance += e.delta) !== e.balanceAfter) ||
      balance !== m.points
    )
  })
