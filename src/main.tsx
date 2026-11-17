import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  Coins,
  CreditCard,
  Gift,
  History,
  MonitorCheck,
  Sparkles,
  Store,
  Ticket,
  Wallet,
  WifiOff,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import '@fontsource-variable/inter'
import './styles.css'
import { changed, dbKey, readDB } from './data/storage'
import { fmt, money, sample } from './domain/rules'
import type { DB } from './domain/model'
import { MemberPage } from './ui/member'
import { Counter } from './ui/counter'
import { StatsPage } from './ui/stats'
import { ErrorText, Modal, useAction } from './ui/common'
import seed from './data/seed.json'
import { Install } from './ui/install'
import { decodeQrImage, QrImage } from './ui/qr'
import { selfTest } from './domain/selfTest'

const roles = [
  {
    id: 'm',
    label: 'Thành viên',
    icon: CreditCard,
    tabs: [
      ['card', 'Thẻ', CreditCard],
      ['rewards', 'Ưu đãi', Gift],
      ['wallet', 'Ví', Wallet],
      ['history', 'Lịch sử', History],
    ] as const,
  },
  {
    id: 'counter',
    label: 'Quầy',
    icon: Store,
    tabs: [
      ['earn', 'Cộng điểm', Coins],
      ['redeem', 'Đổi hộ', Gift],
      ['voucher', 'Voucher', Ticket],
      ['recent', 'Gần đây', History],
    ] as const,
  },
] as const
const memberKey = 'vibe:current-member'
const readMember = () => {
  try {
    return localStorage.getItem(memberKey) ?? ''
  } catch {
    return ''
  }
}
function Rules({ db }: { db: DB }) {
  const s = db.settings
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <BookOpen size={16} /> CHƯƠNG TRÌNH THÀNH VIÊN
          </div>
          <h1>Thể lệ tích điểm</h1>
          <p>Quy tắc và mốc hạng của {s.programName}.</p>
        </div>
      </div>
      <div className="dashboard">
        <section className="panel stack">
          <h2>Tích điểm tại quầy</h2>
          <p>
            <strong>{money(s.vndPerPoint)} = 1 điểm</strong>. Hệ thống làm tròn
            xuống. Giao dịch tối thiểu {money(s.vndPerPoint)} và tối đa{' '}
            {money(1e9)}.
          </p>
          <p>
            Mỗi mã giao dịch chỉ được cộng điểm một lần trên toàn hệ thống, kể
            cả khi nhập khác chữ hoa hoặc chữ thường.
          </p>
          <h2>Đổi ưu đãi</h2>
          <p>
            Điểm được trừ ngay khi đổi. Voucher vào ví, dùng một lần trong{' '}
            {s.voucherValidDays} ngày.
          </p>
          <ul className="rules-list">
            {db.rewards
              .filter((r) => r.active)
              .map((r) => (
                <li key={r.code}>
                  {r.name} · <strong>{fmt(r.costPoints)} điểm</strong>
                </li>
              ))}
          </ul>
        </section>
        <section className="panel stack">
          <h2>Mốc hạng thành viên</h2>
          <div className="rules-tier bronze">
            <strong>Đồng</strong>
            <span>Dưới {fmt(s.silverMin)} điểm</span>
          </div>
          <div className="rules-tier silver">
            <strong>Bạc</strong>
            <span>
              {fmt(s.silverMin)}–{fmt(s.goldMin - 1)} điểm
            </span>
          </div>
          <div className="rules-tier gold">
            <strong>Vàng</strong>
            <span>Từ {fmt(s.goldMin)} điểm</span>
          </div>
          <p className="muted">
            Hạng dựa trên số dư hiện có, vì vậy hạng có thể giảm khi đổi ưu đãi.
          </p>
        </section>
      </div>
    </>
  )
}
function Judge({
  db,
  load,
  select,
}: {
  db: DB
  load: () => void
  select: (code: string) => void
}) {
  const [results, setResults] = useState<boolean[]>()
  const [running, setRunning] = useState(false)
  async function run() {
    setRunning(true)
    try {
      const img = new Image()
      img.src = '/sample-qr/KT-004.png'
      let qr = false
      try {
        await img.decode()
        qr = (await decodeQrImage(img)) === 'KT-004'
      } catch {
        /* Show the QR check as failed. */
      }
      setResults([...selfTest(), qr])
    } finally {
      setRunning(false)
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <MonitorCheck size={16} /> BẢNG KỸ THUẬT
          </div>
          <h1>Khu vực giám khảo</h1>
          <p>Chạy các ca kiểm tra với bộ dữ liệu của ban tổ chức.</p>
        </div>
        <button className="primary" onClick={load}>
          Nạp dữ liệu mẫu
        </button>
      </div>
      <section className="panel stack">
        <h2>Dữ liệu kiểm tra</h2>
        <p>
          {db.meta.sampleLoadedAt
            ? 'Đã nạp dữ liệu mẫu.'
            : 'Hãy nạp dữ liệu mẫu trước khi chạy thử.'}{' '}
          Nạp lại để khôi phục số dư ban đầu giữa các ca kiểm tra.
        </p>
        <p>
          Mã tham chiếu <strong>KT-004</strong> · Dũng Phạm · 3.200 điểm · Hạng
          Bạc.
        </p>
      </section>
      <section className="panel judge-qr">
        <div className="stack compact">
          <h2>QR tham chiếu KT-004</h2>
          <p className="muted">
            Quét ảnh chuẩn của ban tổ chức hoặc QR do ứng dụng tạo.
          </p>
          <button
            className="secondary"
            disabled={running}
            onClick={() => void run()}
          >
            {running ? 'Đang kiểm tra…' : 'Tự kiểm tra'}
          </button>
          {results && (
            <div role="status">
              <strong>
                {results.filter(Boolean).length}/{results.length} ca đạt
              </strong>
              <ul className="rules-list">
                {results.map((pass, i) => (
                  <li key={i}>
                    {seed.cases[i].id} · {pass ? 'Đạt' : 'Chưa đạt'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          <img
            className="qr-image"
            src="/sample-qr/KT-004.png"
            width={130}
            height={130}
            alt="QR chuẩn KT-004"
          />
          <small>QR ban tổ chức</small>
        </div>
        <div>
          <QrImage value="KT-004" size={130} />
          <small>QR ứng dụng</small>
        </div>
      </section>
      <div className="case-list">
        {seed.cases.map((c) => (
          <article key={c.id} className="panel stack compact">
            <small className="eyebrow">{c.id}</small>
            <h2>{c.title}</h2>
            <p>{c.expected}</p>
            <Link
              className="secondary"
              to={
                c.amount
                  ? `/counter?member=${c.member}&tx=${c.reference}&amount=${c.amount}`
                  : c.id === 'TC-KT-05'
                    ? '/counter'
                    : '/counter/redeem?member=' + c.member
              }
            >
              Mở ca kiểm tra
            </Link>
            {db.members[c.member] && (
              <button className="text-button" onClick={() => select(c.member)}>
                Mở hồ sơ {c.member}
              </button>
            )}
            {c.id === 'TC-KT-05' && (
              <a
                className="text-button"
                href="/sample-qr/KT-004.png"
                target="_blank"
                rel="noreferrer"
              >
                Mở ảnh QR chuẩn
              </a>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
function App() {
  const [state, setState] = useState(readDB)
  const db = state.db
  const [member, setMember] = useState(readMember)
  const [online, setOnline] = useState(navigator.onLine)
  const [loading, setLoading] = useState(false)
  const action = useAction()
  const location = useLocation()
  const navigate = useNavigate()
  const [, group, section = ''] = location.pathname.split('/')
  const role = roles.find((r) => r.id === group) ?? roles[0]
  const activeSection = section || role.tabs[0][0]
  const statistics = group === 'stats'
  const judge = group === 'judge'
  const rules = group === 'rules'
  useEffect(() => {
    function sync() {
      setState(readDB())
    }
    function storage(e: StorageEvent) {
      if (e.key === dbKey || e.key === null) sync()
    }
    function network() {
      setOnline(navigator.onLine)
    }
    window.addEventListener(changed, sync)
    window.addEventListener('storage', storage)
    window.addEventListener('online', network)
    window.addEventListener('offline', network)
    return () => {
      window.removeEventListener(changed, sync)
      window.removeEventListener('storage', storage)
      window.removeEventListener('online', network)
      window.removeEventListener('offline', network)
    }
  }, [])
  useEffect(() => {
    if (state.recovered)
      toast.warning('Dữ liệu cục bộ bị lỗi. Đã mở bộ dữ liệu trống.')
  }, [state.recovered])
  function select(code: string, go = true) {
    setMember(code)
    try {
      localStorage.setItem(memberKey, code)
    } catch {
      /* The current card stays selected for this visit. */
    }
    if (go) navigate('/m')
  }
  function load() {
    action.clear()
    setLoading(true)
  }
  return (
    <>
      <header className="top">
        <div className="top-shell">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <Sparkles size={22} />
            </span>
            <span>
              {db.settings.programName}
              <small>Thẻ thành viên</small>
            </span>
          </Link>
          <nav className="role-tabs" aria-label="Chuyển vai">
            {roles.map((r) => (
              <NavLink
                key={r.id}
                className={
                  role.id === r.id && !judge && !rules && !statistics
                    ? 'selected'
                    : ''
                }
                to={'/' + r.id}
              >
                <r.icon size={17} />
                {r.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-tools">
            <span className="mode">
              <i /> Chế độ thi
            </span>
            <Link
              className="secondary header-rules"
              to="/rules"
              aria-label="Mở thể lệ"
            >
              <BookOpen size={16} /> Thể lệ
            </Link>
          </div>
          <label className="role-select">
            <span className="sr-only">Chuyển vai</span>
            <select
              value={judge || rules || statistics ? '' : role.id}
              onChange={(e) => navigate('/' + e.target.value)}
            >
              <option value="" disabled>
                Chuyển vai
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      {!online && (
        <div className="offline">
          <WifiOff size={17} /> Đang offline · Dữ liệu vẫn lưu trên máy
        </div>
      )}
      {!judge && !rules && !statistics && (
        <nav aria-label="Điều hướng chức năng" className="subnav">
          {role.tabs.map(([id, label, Icon], i) => (
            <Link
              key={id}
              to={'/' + role.id + (i === 0 ? '' : '/' + id)}
              aria-current={activeSection === id ? 'page' : undefined}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
      )}
      <main className="content stack">
        {statistics ? (
          <StatsPage db={db} />
        ) : rules ? (
          <Rules db={db} />
        ) : judge ? (
          <Judge db={db} load={load} select={select} />
        ) : role.id === 'counter' ? (
          <Counter
            key={location.search}
            db={db}
            section={activeSection}
            load={load}
          />
        ) : (
          <MemberPage
            db={db}
            m={db.members[member]}
            section={activeSection}
            select={select}
            load={load}
          />
        )}
      </main>
      <footer className="footer">
        <span>{db.settings.programName} · Dữ liệu lưu trên thiết bị</span>
        <nav aria-label="Thông tin">
          <Link to="/rules">Thể lệ</Link>
          <Link to="/judge">Giám khảo</Link>
          <Link to="/stats">
            <BarChart3 size={16} /> Thống kê
          </Link>
          <Install />
        </nav>
      </footer>
      {loading && (
        <Modal title="Nạp dữ liệu mẫu" close={() => setLoading(false)}>
          <p>
            Ứng dụng sẽ nạp 8 thành viên, 7 giao dịch và 3 ưu đãi từ bộ dữ liệu
            ban tổ chức.
          </p>
          {(Object.keys(db.members).length > 0 || db.meta.sampleLoadedAt) && (
            <p className="warning">Dữ liệu cục bộ hiện tại sẽ được thay thế.</p>
          )}
          <ErrorText>{action.error}</ErrorText>
          <button
            className="primary"
            disabled={action.busy}
            onClick={() =>
              void action.run(
                (_, now) => sample(now),
                () => {
                  select('KT-004', false)
                  setLoading(false)
                  toast.success('Đã nạp dữ liệu mẫu')
                },
              )
            }
          >
            Xác nhận nạp
          </button>
        </Modal>
      )}
      <Toaster position="top-center" richColors closeButton />
    </>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </BrowserRouter>
  </StrictMode>,
)
