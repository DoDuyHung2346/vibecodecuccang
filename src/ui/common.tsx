import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react'
import { ArrowDownLeft, ArrowUpRight, Gift, X, Search } from 'lucide-react'
import { dateTime, fmt, types, findMember } from '../domain/rules'
import type { DB, Entry, Member } from '../domain/model'
import { mutate } from '../data/storage'
import { toast } from 'sonner'

export function useAction() {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(
    fn: Parameters<typeof mutate>[0],
    done?: (db: DB) => void,
  ) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      done?.(await mutate(fn))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi khi lưu dữ liệu.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return { busy, error, run, clear: () => setError('') }
}
export function ErrorText({ children }: { children?: string }) {
  return children ? (
    <p role="alert" className="error">
      {children}
    </p>
  ) : null
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string
  children: ReactNode
  close: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    el?.showModal()
    return () => el?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="dialog-inner">
        <div className="section-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
export function Empty({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="tile-icon">
        <Gift size={23} />
      </span>
      <p>{children}</p>
      {action}
    </div>
  )
}
export function Lookup({
  db,
  label = 'Mã thành viên hoặc số điện thoại',
  initial = '',
  onFound,
  onEdit,
}: {
  db: DB
  label?: string
  initial?: string
  onFound: (m: Member) => void
  onEdit?: () => void
}) {
  const [query, setQuery] = useState(initial)
  const [error, setError] = useState('')
  function submit(e: FormEvent) {
    e.preventDefault()
    const m = findMember(db, query)
    if (m) {
      setError('')
      onFound(m)
    } else
      setError('Không tìm thấy thành viên. Kiểm tra lại mã hoặc số điện thoại.')
  }
  return (
    <form onSubmit={submit} className="stack">
      <label>
        {label}
        <div className="input-group">
          <input
            placeholder="Ví dụ KT-004"
            autoCapitalize="characters"
            autoComplete="off"
            enterKeyHint="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setError('')
              onEdit?.()
            }}
            required
          />
          <button className="secondary" type="submit">
            <Search size={17} /> Tra cứu
          </button>
        </div>
      </label>
      <ErrorText>{error}</ErrorText>
    </form>
  )
}
export function Ledger({
  entries,
  children,
}: {
  entries: Entry[]
  children?: (entry: Entry) => ReactNode
}) {
  if (!entries.length) return <Empty>Chưa có biến động điểm.</Empty>
  return (
    <ul className="ledger">
      {entries.map((e) => (
        <li key={e.txCode}>
          <span className={'tile-icon ' + (e.delta < 0 ? 'warm' : '')}>
            {e.delta < 0 ? (
              <ArrowUpRight size={20} />
            ) : (
              <ArrowDownLeft size={20} />
            )}
          </span>
          <div className="ledger-copy">
            <strong>{types[e.type]}</strong>
            <small>
              {e.memberCode} · {e.txCode} · {dateTime(e.createdAt)}
            </small>
            {e.note && <small>{e.note}</small>}
            {children?.(e)}
          </div>
          <div
            className={
              'ledger-value ' + (e.delta < 0 ? 'negative' : 'positive')
            }
          >
            <strong>
              {e.delta > 0 ? '+' : ''}
              {fmt(e.delta)}
            </strong>
            <small>Số dư {fmt(e.balanceAfter)}</small>
          </div>
        </li>
      ))}
    </ul>
  )
}
export async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success('Đã sao chép mã')
  } catch {
    toast.error('Không thể sao chép. Bạn có thể chọn mã để sao chép thủ công.')
  }
}
export function randomCode(prefix: string, bytes = 5) {
  return (
    prefix +
    Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (n) =>
      n.toString(16).padStart(2, '0'),
    )
      .join('')
      .toUpperCase()
  )
}
