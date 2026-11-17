import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Copy,
  CreditCard,
  Gift,
  History,
  Sparkles,
  Ticket,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import type { DB, Member, Reward, Voucher } from '../domain/model'
import {
  dateTime,
  fmt,
  register,
  redeem,
  tier,
  tierRank,
  tiers,
  voucherStatus,
} from '../domain/rules'
import {
  copy,
  Empty,
  ErrorText,
  Ledger,
  Lookup,
  Modal,
  useAction,
} from './common'

import { QrButton } from './qr'
import { feedback } from './devices'

function useAnimatedPoints(target: number) {
  const [shown, setShown] = useState(target)
  const current = useRef(target)
  useEffect(() => {
    const start = current.current,
      startAt = performance.now()
    let frame = 0
    function tick(time: number) {
      const progress = Math.min(1, Math.max(0, (time - startAt) / 650))
      current.current = Math.round(
        start + (target - start) * (1 - (1 - progress) ** 3),
      )
      setShown(current.current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target
      setShown(target)
    } else if (start !== target) frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return shown
}
export function Register({ done }: { done: (m: Member) => void }) {
  const action = useAction()
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    void action.run(
      (db, now) =>
        register(db, String(data.get('name')), String(data.get('phone')), now),
      (db) => {
        const code = 'KT-' + String(db.codeSeq).padStart(3, '0')
        done(db.members[code])
        toast.success('Đã phát thẻ ' + code)
      },
    )
  }
  return (
    <form className="stack" onSubmit={submit}>
      <label>
        Họ và tên
        <input
          name="name"
          autoComplete="name"
          placeholder="Nguyễn Minh Anh"
          minLength={2}
          maxLength={80}
          required
        />
      </label>
      <label>
        Số điện thoại
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="0912 345 678"
          required
        />
      </label>
      <ErrorText>{action.error}</ErrorText>
      <button className="primary" disabled={action.busy}>
        Tạo thẻ thành viên <ArrowRight size={17} />
      </button>
    </form>
  )
}
export function Card({ db, m }: { db: DB; m: Member }) {
  const t = tier(m.points, db.settings)
  const points = useAnimatedPoints(m.points)
  useEffect(() => {
    try {
      const key = 'vibe:tier:' + m.code
      const last = localStorage.getItem(key) as keyof typeof tiers | null
      if (last && tierRank[last] < tierRank[t]) {
        toast.success('Chúc mừng! Bạn đã lên hạng ' + tiers[t])
        feedback(true)
      }
      localStorage.setItem(key, t)
    } catch {
      /* Tier notification is optional. */
    }
  }, [m.code, t])
  const next = t === 'bronze' ? db.settings.silverMin : db.settings.goldMin
  const start = t === 'silver' ? db.settings.silverMin : 0
  const ratio = t === 'gold' ? 100 : ((m.points - start) / (next - start)) * 100
  return (
    <div className="stack">
      <article className={'membership ' + t}>
        <div className="section-head">
          <span className="card-brand">
            <Sparkles size={19} /> {db.settings.programName}
          </span>
          <span className="tier">
            <CreditCard size={14} /> Hạng {tiers[t]}
          </span>
        </div>
        <div>
          <small>ĐIỂM HIỆN CÓ</small>
          <div className="points">
            {fmt(points)} <span>điểm</span>
          </div>
        </div>
        <div className="section-head card-bottom">
          <div>
            <strong>{m.fullName}</strong>
            <div className="card-code">
              {m.code}{' '}
              <button
                type="button"
                className="card-copy"
                aria-label="Sao chép mã thành viên"
                onClick={() => void copy(m.code)}
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
          <div className="card-meta">
            <small>
              {m.phone.slice(0, 4)}•••{m.phone.slice(-3)}
              <br />
              Tham gia{' '}
              {new Date(m.joinedAt).toLocaleDateString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
              })}
            </small>
            <QrButton value={m.code} />
          </div>
        </div>
      </article>
      <section className="panel stack compact">
        <div className="section-head">
          <h2>Hạng thành viên</h2>
          <span className="pill">{tiers[t]}</span>
        </div>
        <progress max={100} value={ratio} aria-label="Tiến độ lên hạng" />
        <p className="muted">
          {t === 'gold' ? (
            'Bạn đang ở hạng cao nhất.'
          ) : (
            <>
              Còn <strong>{fmt(next - m.points)} điểm</strong> để lên hạng{' '}
              {t === 'bronze' ? 'Bạc' : 'Vàng'}.
            </>
          )}
        </p>
      </section>
    </div>
  )
}
export function Rewards({ db, m }: { db: DB; m: Member }) {
  const [reward, setReward] = useState<Reward>()
  const [voucher, setVoucher] = useState<Voucher>()
  const action = useAction()
  const after = reward ? m.points - reward.costPoints : m.points
  const currentTier = tier(m.points, db.settings)
  const nextTier = tier(after, db.settings)
  return (
    <>
      <div className="section-head">
        <h2>Ưu đãi đổi điểm</h2>
        <span className="pill">{fmt(m.points)} điểm</span>
      </div>
      <div className="reward-grid">
        {db.rewards
          .filter((r) => r.active)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((r) => (
            <article className="panel stack reward" key={r.code}>
              <span
                className={'tile-icon ' + (r.kind === 'gift' ? 'warm' : '')}
              >
                {r.kind === 'gift' ? <Gift /> : <Ticket />}
              </span>
              <h3>{r.name}</h3>
              <p className="muted">{r.description}</p>
              <strong>{fmt(r.costPoints)} điểm</strong>
              <small className="muted">
                {m.points >= r.costPoints
                  ? 'Bạn đủ điểm'
                  : `Còn thiếu ${fmt(r.costPoints - m.points)} điểm`}
              </small>
              <button
                className="secondary"
                onClick={() => {
                  action.clear()
                  setReward(r)
                }}
              >
                Đổi ngay
              </button>
            </article>
          ))}
      </div>
      {reward && (
        <Modal title={reward.name} close={() => setReward(undefined)}>
          <p>
            Số dư hiện tại <strong>{fmt(m.points)} điểm</strong>. Ưu đãi cần{' '}
            <strong>{fmt(reward.costPoints)} điểm</strong>.
          </p>
          {after >= 0 && (
            <p>
              Số dư sau khi đổi <strong>{fmt(after)} điểm</strong>.
            </p>
          )}
          {after >= 0 && tierRank[nextTier] < tierRank[currentTier] && (
            <p className="warning">
              Đổi ưu đãi sẽ đưa bạn từ hạng {tiers[currentTier]} xuống{' '}
              {tiers[nextTier]}.
            </p>
          )}
          <ErrorText>{action.error}</ErrorText>
          <button
            className="primary"
            disabled={action.busy}
            onClick={() =>
              void action.run(
                (latest, now) => redeem(latest, m.code, reward.code, now),
                (next) => {
                  setReward(undefined)
                  setVoucher(next.vouchers.at(-1))
                  toast.success('Đã thêm ưu đãi vào ví')
                },
              )
            }
          >
            Xác nhận đổi
          </button>
        </Modal>
      )}
      {voucher && (
        <Modal title="Đổi thành công" close={() => setVoucher(undefined)}>
          <VoucherDetails voucher={voucher} />
        </Modal>
      )}
    </>
  )
}
export function VoucherDetails({ voucher }: { voucher: Voucher }) {
  return (
    <div className="stack compact">
      <div className="section-head">
        <strong>{voucher.rewardName}</strong>
        <QrButton value={voucher.code} label="QR voucher" />
      </div>
      <div className="voucher-code">
        {voucher.code}
        <button
          className="icon-button"
          aria-label="Sao chép voucher"
          onClick={() => void copy(voucher.code)}
        >
          <Copy size={17} />
        </button>
      </div>
      <p className="muted">Hạn dùng {dateTime(voucher.expiresAt)}</p>
    </div>
  )
}
export function WalletView({ db, m }: { db: DB; m: Member }) {
  const [tab, setTab] = useState<'active' | 'used' | 'expired'>('active')
  const voucherList = db.vouchers
    .filter((v) => v.memberCode === m.code && voucherStatus(v) === tab)
    .reverse()
  const labels = { active: 'Còn hạn', used: 'Đã dùng', expired: 'Hết hạn' }
  return (
    <section className="panel stack">
      <h2>Ví ưu đãi</h2>
      <div className="pills">
        {Object.entries(labels).map(([k, label]) => (
          <button
            key={k}
            aria-pressed={tab === k}
            onClick={() => setTab(k as keyof typeof labels)}
          >
            {label}
          </button>
        ))}
      </div>
      {voucherList.length ? (
        voucherList.map((v) => (
          <article className="voucher" key={v.code}>
            <VoucherDetails voucher={v} />
          </article>
        ))
      ) : (
        <Empty>Chưa có voucher {labels[tab].toLowerCase()}.</Empty>
      )}
    </section>
  )
}
export function HistoryView({ db, m }: { db: DB; m: Member }) {
  const [filter, setFilter] = useState('')
  const [limit, setLimit] = useState(20)
  const list = db.ledger
    .filter((e) => e.memberCode === m.code && (!filter || e.type === filter))
    .reverse()
  return (
    <section className="panel stack">
      <div className="section-head">
        <h2>Lịch sử điểm</h2>
        <select
          aria-label="Loại biến động"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setLimit(20)
          }}
        >
          <option value="">Tất cả</option>
          <option value="earn">Cộng điểm</option>
          <option value="redeem">Đổi điểm</option>
          <option value="adjust">Điều chỉnh</option>
          <option value="reversal">Hoàn tác</option>
        </select>
      </div>
      <Ledger entries={list.slice(0, limit)} />
      {list.length > limit && (
        <button className="secondary" onClick={() => setLimit(limit + 20)}>
          Xem thêm
        </button>
      )}
    </section>
  )
}
export function MemberPage({
  db,
  m,
  section,
  select,
  load,
}: {
  db: DB
  m?: Member
  section: string
  select: (code: string) => void
  load: () => void
}) {
  const [dialog, setDialog] = useState<'register' | 'lookup'>()
  const choose = (m: Member) => {
    select(m.code)
    setDialog(undefined)
  }
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Sparkles size={15} /> CHƯƠNG TRÌNH THÀNH VIÊN
          </div>
          <h1>{m ? 'Xin chào, ' + m.fullName : 'Thẻ thành viên của bạn'}</h1>
          <p>Tích điểm mỗi lần mua hàng và đổi những ưu đãi dành cho bạn.</p>
        </div>
        {m && (
          <button className="secondary" onClick={() => setDialog('lookup')}>
            Chọn thẻ
          </button>
        )}
      </div>
      {!m && (
        <div className="hero">
          <div>
            <span className="hero-tag">
              <CreditCard size={17} /> {db.settings.programName}
            </span>
            <h2>
              Tích điểm hôm nay,
              <br />
              đổi ưu đãi mỗi ngày.
            </h2>
            <p>Đăng ký thẻ bằng tên và số điện thoại để bắt đầu.</p>
            <div className="actions">
              <button
                className="primary light"
                onClick={() => setDialog('register')}
              >
                Đăng ký thẻ mới <ArrowRight size={17} />
              </button>
              <button
                className="hero-secondary"
                onClick={() => setDialog('lookup')}
              >
                Chọn thẻ có sẵn
              </button>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-card">
              <Sparkles size={63} />
            </div>
          </div>
        </div>
      )}
      {!m && (
        <section className="panel section-head sample-strip">
          <div>
            <h2>Dùng thử với dữ liệu mẫu</h2>
            <p className="muted">
              Khám phá 8 thẻ thành viên từ bộ dữ liệu ban tổ chức.
            </p>
          </div>
          <button className="secondary" onClick={load}>
            Nạp dữ liệu mẫu
          </button>
        </section>
      )}
      {m &&
        (section === 'rewards' ? (
          <Rewards db={db} m={m} />
        ) : section === 'wallet' ? (
          <WalletView db={db} m={m} />
        ) : section === 'history' ? (
          <HistoryView db={db} m={m} />
        ) : (
          <div className="dashboard">
            <Card key={m.code} db={db} m={m} />
            <div className="stack">
              <section className="panel stack compact">
                <h2>Tiện ích thành viên</h2>
                <div className="quick-links">
                  <Link to="/m/rewards">
                    <span className="tile-icon">
                      <Gift size={20} />
                    </span>
                    Ưu đãi <ArrowRight size={15} />
                  </Link>
                  <Link to="/m/wallet">
                    <span className="tile-icon">
                      <Wallet size={20} />
                    </span>
                    Ví ưu đãi <ArrowRight size={15} />
                  </Link>
                  <Link to="/m/history">
                    <span className="tile-icon">
                      <History size={20} />
                    </span>
                    Lịch sử điểm <ArrowRight size={15} />
                  </Link>
                </div>
              </section>
              <section className="panel stack compact">
                <div className="section-head">
                  <h2>Hoạt động gần đây</h2>
                  <Link to="/m/history">Xem tất cả</Link>
                </div>
                <Ledger
                  entries={db.ledger
                    .filter((e) => e.memberCode === m.code)
                    .slice(-3)
                    .reverse()}
                />
              </section>
            </div>
          </div>
        ))}
      {dialog && (
        <Modal
          title={
            dialog === 'register'
              ? 'Đăng ký thẻ thành viên'
              : 'Chọn thẻ thành viên'
          }
          close={() => setDialog(undefined)}
        >
          {dialog === 'register' ? (
            <Register done={choose} />
          ) : (
            <>
              <Lookup db={db} onFound={choose} />
              {!!Object.keys(db.members).length && (
                <div className="member-list">
                  {Object.values(db.members)
                    .slice(0, 12)
                    .map((m) => (
                      <button
                        key={m.code}
                        className="secondary"
                        onClick={() => choose(m)}
                      >
                        <span>{m.fullName}</span>
                        <small>{m.code}</small>
                      </button>
                    ))}
                </div>
              )}
              <button
                className="text-button"
                onClick={() => setDialog('register')}
              >
                Đăng ký thẻ mới
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
