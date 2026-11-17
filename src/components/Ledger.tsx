import { ArrowDownLeft,ArrowUpRight,History } from 'lucide-react';
import { num,time,type Entry } from '../domain/model';
export default function Ledger({entries,showMember=false}:{entries:Entry[];showMember?:boolean}){
 if(!entries.length)return <div className="empty"><History size={30}/><h3>Chưa có giao dịch</h3><p>Mỗi lần tích hoặc đổi điểm sẽ được ghi lại tại đây.</p></div>;
 return <div className="ledger">{[...entries].reverse().map(e=><div className="ledger-row" key={e.txCode}><span className={`activity-icon ${e.delta>0?'positive':'negative'}`}>{e.delta>0?<ArrowDownLeft size={20}/>:<ArrowUpRight size={20}/>}</span><div className="ledger-detail"><strong>{e.type==='earn'?'Tích điểm mua hàng':'Đổi ưu đãi'}{showMember&&<small> · {e.memberCode}</small>}</strong><span>{time(e.createdAt)}</span><code>{e.txCode}</code></div><div className="ledger-amount"><strong className={e.delta>0?'positive-text':'negative-text'}>{e.delta>0?'+':''}{num(e.delta)}</strong><span>Số dư {num(e.balanceAfter)}</span></div></div>)}</div>;
}
