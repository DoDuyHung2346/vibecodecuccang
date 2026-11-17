import { Copy,Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { rank,rankClass,num,type Member } from '../domain/model';
import QR from './QR';
export default function MemberCard({member,onQr}:{member:Member;onQr:()=>void}){
 return <div className={`member-card ${rankClass(member.points)}`}><div className="card-top"><span className="card-wordmark"><Sparkles size={22}/> vibe<span>rewards</span></span><span className="card-tier">✦ HẠNG {rank(member.points).toUpperCase()}</span></div><div className="card-content"><div><p className="card-label">THẺ THÀNH VIÊN</p><h2>{member.fullName}</h2><button className="card-code" aria-label="Sao chép mã thành viên" onClick={()=>void navigator.clipboard?.writeText(member.code).then(()=>toast.success('Đã sao chép mã thành viên.')).catch(()=>toast.error('Hãy chọn và sao chép mã thủ công.'))}>{member.code}<Copy size={14}/></button><div className="card-points" key={member.points}>{num(member.points)} <span>điểm</span></div></div><button className="qr-button" onClick={onQr} aria-label="Phóng to mã QR thành viên"><QR value={member.code} size={108}/><span>Quét để tích điểm</span></button></div><div className="card-footer"><span>Mỗi lần ghé, thêm niềm vui.</span><span>{member.phone.slice(0,4)} ••• {member.phone.slice(-3)}</span></div></div>;
}
