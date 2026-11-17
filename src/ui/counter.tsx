import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Printer,
  ScanLine,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { DB, Entry, Member } from '../domain/model'
import {
  dateTime,
  earn,
  earned,
  findMember,
  fmt,
  money,
  normCode,
  tier,
  tiers,
  markVoucherUsed,
  voucherStatus,
} from '../domain/rules'
import {
  Empty,
  ErrorText,
  Ledger,
  Lookup,
  Modal,
  randomCode,
  useAction,
} from './common'
import { Register, Rewards, VoucherDetails } from './member'

import { QrScanner } from './qr'
import { DevicePanel, feedback, useWakeLock, useWedge } from './devices'

function scanCode(raw: string) {
  return normCode(raw.split(/\r?\n/, 1)[0].replace(/\p{Cc}/gu, ''))
}
export function MemberSummary({ m, db }: { m: Member; db: DB }) {
  return (
    <div className="member-summary">
      <div>
        <strong>{m.fullName}</strong>
        <small>
          {m.code} ·{' '}
          {m.status === 'locked'
            ? 'Đã khóa'
            : tiers[tier(m.points, db.settings)]}
        </small>
      </div>
      <strong>{fmt(m.points)} điểm</strong>
    </div>
  )
}
function RedeemVoucher({ db }: { db: DB }) {
  const [code, setCode] = useState('')
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const action = useAction()
  const [scanner, setScanner] = useState(false)
  const v = db.vouchers.find((v) => v.code === selected)
  function search(e: FormEvent) {
    e.preventDefault()
    action.clear()
    const codeKey = normCode(code)
    setSelected(codeKey)
    setError(
      db.vouchers.some((v) => v.code === codeKey)
        ? ''
        : 'Không tìm thấy voucher với mã này.',
    )
  }
  return (
    <section className="panel stack">
      <div className="section-head">
        <h2>Dùng voucher</h2>
        <button className="secondary" onClick={() => setScanner(true)}>
          <ScanLine size={17} /> Quét QR
        </button>
      </div>
      {scanner && (
        <QrScanner
          onClose={() => setScanner(false)}
          onDetect={(raw) => {
            const key = scanCode(raw)
            if (!db.vouchers.some((v) => v.code === key)) return false
            action.clear()
            setCode(key)
            setSelected(key)
            setError('')
            setScanner(false)
            feedback()
            return true
          }}
        />
      )}
      <form className="stack" onSubmit={search}>
        <label>
          Mã voucher
          <div className="input-group">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setSelected('')
                setError('')
              }}
              placeholder="VC-…"
              required
            />
            <button className="secondary">Tra cứu</button>
          </div>
        </label>
      </form>
      <ErrorText>{error}</ErrorText>
      {v && (
        <>
          <VoucherDetails voucher={v} />
          <p>
            {voucherStatus(v) === 'used'
              ? 'Đã dùng · ' + dateTime(v.usedAt ?? v.issuedAt)
              : voucherStatus(v) === 'expired'
                ? 'Voucher đã hết hạn'
                : 'Voucher còn hạn'}
          </p>
          <ErrorText>{action.error}</ErrorText>
          <button
            className="primary"
            disabled={action.busy || voucherStatus(v) !== 'active'}
            onClick={() =>
              void action.run(
                (latest, now) => markVoucherUsed(latest, v.code, now),
                () => toast.success('Đã đánh dấu voucher đã dùng'),
              )
            }
          >
            Xác nhận đã dùng
          </button>
        </>
      )}
    </section>
  )
}
export function Counter({
  db,
  section,
  load,
}: {
  db: DB
  section: string
  load: () => void
}) {
  const [params] = useSearchParams()
  const [memberCode, setMemberCode] = useState(params.get('member') ?? '')
  const [amount, setAmount] = useState(Number(params.get('amount')) || 0)
  const [tx, setTx] = useState(params.get('tx') ?? '')
  const [registering, setRegistering] = useState(false)
  const [result, setResult] = useState<{
    entry: Entry
    name: string
    up: boolean
    newTier: string
  }>()
  const action = useAction()
  const [scanner, setScanner] = useState(false)
  const [devices, setDevices] = useState(false)
  const [lookupEdited, setLookupEdited] = useState(false)
  const [awake, setAwake] = useState(false)
  useWakeLock(awake, setAwake)
  const [last, setLast] = useState('')
  function scan(raw: string) {
    const code = scanCode(raw)
    const match =
      findMember(db, code) ?? findMember(db, code.match(/KT-\d+/)?.[0] ?? '')
    if (!match) return false
    setLookupEdited(false)
    setMemberCode(match.code)
    setScanner(false)
    action.clear()
    feedback()
    setLast(match.code + ' · ' + dateTime(new Date().toISOString()))
    return true
  }
  useWedge((raw) => {
    if (section === 'earn' || section === 'redeem') scan(raw)
  })
  const m = lookupEdited ? undefined : findMember(db, memberCode)
  const calculated = earned(amount, db.settings)
  const recent = db.ledger.slice(-10).reverse()
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!m) return
    let prior = 0
    void action.run(
      (latest, now) => {
        prior = findMember(latest, memberCode)?.points ?? 0
        return earn(latest, memberCode, amount, tx, now)
      },
      (next) => {
        const entry = next.ledger.at(-1)!
        const after = tier(entry.balanceAfter, next.settings)
        const up = after !== tier(prior, next.settings)
        setResult({
          entry,
          name: next.members[entry.memberCode].fullName,
          up,
          newTier: tiers[after],
        })
        feedback(up)
        toast.success(
          up
            ? 'Chúc mừng! Thành viên đã lên hạng ' + tiers[after]
            : 'Đã cộng ' + fmt(entry.delta) + ' điểm',
        )
        setAmount(0)
        setTx('')
      },
    )
  }
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Coins size={16} /> VẬN HÀNH CỬA HÀNG
          </div>
          <h1>Quầy giao dịch</h1>
          <p>Tìm thẻ thành viên, cộng điểm và xử lý ưu đãi tại quầy.</p>
        </div>
        <div className="actions">
          <button className="secondary" onClick={() => setDevices(true)}>
            <Settings2 size={17} /> Thiết bị
          </button>
          <button className="secondary" onClick={load}>
            Nạp dữ liệu mẫu
          </button>
        </div>
      </div>
      {section === 'voucher' ? (
        <RedeemVoucher db={db} />
      ) : section === 'recent' ? (
        <section className="panel stack">
          <h2>Giao dịch gần đây</h2>
          <Ledger entries={recent} />
        </section>
      ) : (
        <div className="counter-layout">
          <div className="stack">
            <section className="panel stack">
              <div className="section-head">
                <h2>Khách hàng</h2>
                <button
                  className="text-button"
                  onClick={() => setRegistering(true)}
                >
                  Đăng ký hộ
                </button>
              </div>
              <button className="secondary" onClick={() => setScanner(true)}>
                <ScanLine size={17} /> Quét QR
              </button>
              <Lookup
                key={memberCode}
                db={db}
                initial={memberCode}
                onEdit={() => setLookupEdited(true)}
                onFound={(m) => {
                  setLookupEdited(false)
                  setMemberCode(m.code)
                  action.clear()
                }}
              />
              {m && <MemberSummary m={m} db={db} />}
            </section>
            {section === 'redeem' ? (
              m ? (
                <Rewards db={db} m={m} />
              ) : (
                <Empty>Tra cứu thành viên để đổi ưu đãi.</Empty>
              )
            ) : (
              <section className="panel stack">
                <h2>Cộng điểm giao dịch</h2>
                <form className="stack" onSubmit={submit}>
                  <label>
                    Số tiền giao dịch
                    <div className="input-group">
                      <input
                        inputMode="numeric"
                        value={amount ? fmt(amount) : ''}
                        placeholder="0"
                        onChange={(e) =>
                          setAmount(
                            Number(e.target.value.replace(/[^0-9]/g, '')),
                          )
                        }
                        maxLength={15}
                        required
                      />
                      <span className="currency">VND</span>
                    </div>
                  </label>
                  <div className="pills">
                    {[50000, 100000, 200000, 500000].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setAmount(n)}
                      >
                        {money(n)}
                      </button>
                    ))}
                  </div>
                  <label>
                    Mã giao dịch
                    <div className="input-group">
                      <input
                        placeholder="Ví dụ TX-NEW-001"
                        value={tx}
                        onChange={(e) => setTx(e.target.value.toUpperCase())}
                        autoCapitalize="characters"
                        maxLength={40}
                        required
                      />
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setTx(randomCode('TX-', 6))}
                      >
                        Tạo mã
                      </button>
                    </div>
                  </label>
                  <div className="preview">
                    <strong>+{fmt(calculated)} điểm</strong>
                    <span>
                      {m && calculated > 0 ? (
                        <>
                          Số dư dự kiến {fmt(m.points + calculated)} ·{' '}
                          {tiers[tier(m.points + calculated, db.settings)]}
                        </>
                      ) : (
                        money(db.settings.vndPerPoint) + ' = 1 điểm'
                      )}
                    </span>
                  </div>
                  {amount > 0 && calculated === 0 && (
                    <p className="warning">
                      Tối thiểu {money(db.settings.vndPerPoint)} để tích điểm.
                    </p>
                  )}
                  <ErrorText>{action.error}</ErrorText>
                  <button className="primary" disabled={!m || action.busy}>
                    Cộng điểm <ArrowRight size={17} />
                  </button>
                </form>
              </section>
            )}
          </div>
          <aside className="panel stack recent-panel">
            <h2>Giao dịch gần đây</h2>
            <Ledger entries={recent.slice(0, 5)} />
          </aside>
        </div>
      )}
      {scanner && (
        <QrScanner onDetect={scan} onClose={() => setScanner(false)} />
      )}
      {devices && (
        <DevicePanel
          last={last}
          awake={awake}
          setAwake={setAwake}
          close={() => setDevices(false)}
        />
      )}
      {registering && (
        <Modal title="Đăng ký thành viên" close={() => setRegistering(false)}>
          <Register
            done={(m) => {
              setLookupEdited(false)
              setMemberCode(m.code)
              setRegistering(false)
            }}
          />
        </Modal>
      )}
      {result && (
        <Modal title="Đã cộng điểm" close={() => setResult(undefined)}>
          <div className="receipt stack compact">
            <CheckCircle2 size={38} />
            <div className="receipt-points">
              +{fmt(result.entry.delta)} điểm
            </div>
            {result.up && <strong>Chúc mừng! Lên hạng {result.newTier}</strong>}
            <strong>
              {result.name} · {result.entry.memberCode}
            </strong>
            <p>
              Số dư mới {fmt(result.entry.balanceAfter)} điểm · Hạng{' '}
              {result.newTier}
            </p>
            <small>
              {result.entry.txCode} · {dateTime(result.entry.createdAt)}
            </small>
          </div>
          <div className="actions no-print">
            <button className="secondary" onClick={() => window.print()}>
              <Printer size={17} /> In biên lai
            </button>
          </div>
          <button
            className="primary no-print"
            onClick={() => {
              setResult(undefined)
              setMemberCode('')
            }}
          >
            Giao dịch tiếp
          </button>
        </Modal>
      )}
    </>
  )
}
