import { z } from 'zod'
const integer = z.number().int().safe()
const points = integer.nonnegative()
const date = z.string().refine((s) => Number.isFinite(Date.parse(s)))
export const settingsSchema = z
  .object({
    programName: z.string().trim().min(2).max(80),
    vndPerPoint: integer.min(1).max(1e9),
    silverMin: integer.positive(),
    goldMin: integer.positive(),
    voucherValidDays: integer.min(1).max(365),
  })
  .refine((s) => s.silverMin < s.goldMin)
const member = z.object({
  code: z.string().regex(/^KT-\d{3,}$/),
  fullName: z.string().min(2).max(80),
  phone: z.string().regex(/^0\d{9}$/),
  openingPoints: points,
  points,
  status: z.enum(['active', 'locked']),
  joinedAt: date,
})
const entry = z.object({
  txCode: z.string().min(3),
  memberCode: z.string(),
  type: z.enum(['earn', 'redeem', 'adjust', 'reversal']),
  amountVnd: points,
  delta: integer,
  balanceAfter: points,
  createdAt: date,
  note: z.string().optional(),
  rewardCode: z.string().optional(),
  reversesTxCode: z.string().optional(),
  legacyHistoryId: z.string().optional(),
})
export const rewardSchema = z.object({
  code: z.string().min(3),
  name: z.string().trim().min(2).max(100),
  description: z.string().optional(),
  costPoints: integer.positive(),
  kind: z.enum(['voucher', 'gift']),
  valueVnd: points.optional(),
  active: z.boolean(),
  sortOrder: points,
})
const voucher = z.object({
  code: z.string(),
  memberCode: z.string(),
  rewardCode: z.string(),
  rewardName: z.string(),
  costPoints: integer.positive(),
  status: z.enum(['active', 'used']),
  issuedAt: date,
  expiresAt: date,
  usedAt: date.optional(),
  redeemTxCode: z.string(),
})
export const database = z
  .object({
    schemaVersion: z.literal(1),
    settings: settingsSchema,
    members: z.record(member),
    ledger: z.array(entry),
    rewards: z.array(rewardSchema),
    vouchers: z.array(voucher),
    codeSeq: points,
    meta: z.object({ updatedAt: date, sampleLoadedAt: date.optional() }),
  })
  .superRefine((db, ctx) => {
    const unique = (values: string[]) => new Set(values).size === values.length
    if (
      Object.entries(db.members).some(
        ([key, m]) => key !== m.code || Number(key.slice(3)) > db.codeSeq,
      ) ||
      !unique(Object.values(db.members).map((m) => m.phone)) ||
      !unique(db.ledger.map((e) => e.txCode)) ||
      !unique(db.rewards.map((r) => r.code)) ||
      !unique(db.vouchers.map((v) => v.code)) ||
      db.ledger.some(
        (e) => !Object.prototype.hasOwnProperty.call(db.members, e.memberCode),
      ) ||
      db.vouchers.some(
        (v) => !Object.prototype.hasOwnProperty.call(db.members, v.memberCode),
      )
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Dữ liệu chứa mã trùng hoặc tham chiếu không hợp lệ',
      })
    }
  })
export type DB = z.infer<typeof database>
export type Settings = DB['settings']
export type Member = z.infer<typeof member>
export type Entry = z.infer<typeof entry>
export type Reward = z.infer<typeof rewardSchema>
export type Voucher = z.infer<typeof voucher>
