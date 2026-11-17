import { BarChart3, Coins, Users } from 'lucide-react'
import type { DB } from '../domain/model'
import { fmt, stats, tier, tiers } from '../domain/rules'
export function StatsPage({ db }: { db: DB }) {
  const totals = stats(db)
  const values = [
    { label: 'Tổng thành viên', value: totals.members, icon: Users },
    { label: 'Tổng điểm đã phát', value: totals.issued, icon: Coins },
    { label: 'Điểm đã dùng', value: totals.spent, icon: Coins },
    { label: 'Điểm đang lưu hành', value: totals.circulating, icon: Coins },
  ]
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <BarChart3 size={16} /> TỔNG QUAN
          </div>
          <h1>Thống kê chương trình</h1>
          <p>Số liệu cập nhật theo giao dịch trên thiết bị này.</p>
        </div>
      </div>
      <div className="kpis">
        {values.map(({ label, value, icon: Icon }) => (
          <section key={label} className="panel kpi">
            <span className="tile-icon">
              <Icon size={19} />
            </span>
            <h2>{label}</h2>
            <strong>{fmt(value)}</strong>
          </section>
        ))}
      </div>
      <section className="panel stack">
        <h2>Phân bố hạng</h2>
        {Object.entries(tiers).map(([key, label]) => {
          const n = Object.values(db.members).filter(
            (m) => tier(m.points, db.settings) === key,
          ).length
          return (
            <div className="stack compact" key={key}>
              <div className="section-head">
                <span>{label}</span>
                <strong>{fmt(n)} thành viên</strong>
              </div>
              <progress
                aria-label={label}
                value={n}
                max={totals.members || 1}
              />
            </div>
          )
        })}
      </section>
    </>
  )
}
