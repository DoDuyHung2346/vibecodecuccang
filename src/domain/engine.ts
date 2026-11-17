import seed from '../../seed.json';
import { dbSchema, normalize, phoneNormalize, type Command, type Database } from './model';
export const emptyDb=():Database=>({schemaVersion:1,revision:0,sampleLoaded:false,members:[],ledger:[],rewards:seed.rewards,vouchers:[],requests:{}});
export function sampleDb():Database {return dbSchema.parse({...emptyDb(),sampleLoaded:true,members:seed.members,ledger:seed.ledger});}
export function validateDb(input:unknown):Database {
 const db=dbSchema.parse(input);
 const unique=(xs:string[])=>new Set(xs).size===xs.length;
 if(!unique(db.members.map(m=>m.code))||!unique(db.members.map(m=>m.phone))||!unique(db.ledger.map(e=>normalize(e.txCode)))||!unique(db.vouchers.map(v=>v.code))||!unique(db.rewards.map(r=>r.code)))throw Error('Dữ liệu có mã hoặc số điện thoại trùng.');
 for(const m of db.members){if(m.qrPayload!==m.code||m.openingPoints+db.ledger.filter(e=>e.memberCode===m.code).reduce((s,e)=>s+e.delta,0)!==m.points)throw Error('Dữ liệu không khớp số dư hoặc mã QR.');}
 for(const e of db.ledger){if(!db.members.some(m=>m.code===e.memberCode)||!e.delta||(e.type==='earn'?(e.delta<0||e.amountVnd<10000):e.delta>0))throw Error('Lịch sử không hợp lệ.');}
 for(const v of db.vouchers){if(!db.members.some(m=>m.code===v.memberCode)||!db.ledger.some(e=>e.txCode===v.txCode&&e.memberCode===v.memberCode&&e.delta===-v.costPoints))throw Error('Voucher không khớp lịch sử.');}
 return db;
}
export function applyCommand(input:Database,cmd:Command,now=new Date().toISOString()):Database {
 if(cmd.type==='sample'){if(input.sampleLoaded&&!cmd.reset)return input;return {...sampleDb(),revision:input.revision+1};}
 const db=structuredClone(input);
 if(cmd.type==='register'){
  const fullName=cmd.name.trim().replace(/\s+/g,' '),phone=phoneNormalize(cmd.phone);
  if(fullName.length<2||fullName.length>80)throw Error('Họ tên cần từ 2 đến 80 ký tự.');
  if(!/^0\d{9}$/.test(phone))throw Error('Nhập số điện thoại 10 số bắt đầu bằng 0 (hoặc +84).');
  if(db.members.some(m=>m.phone===phone))throw Error('Số điện thoại này đã có thẻ thành viên.');
  let n=1;for(const m of db.members){const match=/^KT-(\d+)$/.exec(m.code);if(match)n=Math.max(n,Number(match[1])+1);}
  const code=`KT-${String(n).padStart(3,'0')}`;
  db.members.push({code,fullName,phone,points:0,openingPoints:0,status:'active',joinedAt:now.slice(0,10),qrPayload:code});
 }else if(cmd.type==='status'){
  const m=db.members.find(m=>m.code===cmd.code);if(!m)throw Error('Không tìm thấy thành viên.');m.status=m.status==='active'?'locked':'active';
 }else if(cmd.type==='reward'){
  const r=db.rewards.find(r=>r.code===cmd.code);if(!r)throw Error('Không tìm thấy ưu đãi.');
  if(r.active&&db.rewards.filter(r=>r.active).length<=2)throw Error('Cần giữ ít nhất 2 mức đổi đang hoạt động.');r.active=!r.active;
 }else if(cmd.type==='consume'){
  const v=db.vouchers.find(v=>v.code===normalize(cmd.voucher).replace(/^VCH:/,''));if(!v)throw Error('Không tìm thấy voucher.');
  if(v.usedAt)throw Error('Voucher này đã được sử dụng.');if(new Date(v.expiresAt)<=new Date(now))throw Error('Voucher đã hết hạn.');
  if(db.members.find(m=>m.code===v.memberCode)?.status!=='active')throw Error('Thẻ đang bị khóa.');v.usedAt=now;
 }else{
  if(!/^[a-zA-Z0-9-]{8,80}$/.test(cmd.requestId))throw Error('Mã yêu cầu không hợp lệ.');
  const fingerprint=JSON.stringify(cmd);
  if(db.requests[cmd.requestId]){if(db.requests[cmd.requestId]===fingerprint)return input;throw Error('Yêu cầu đã được dùng cho nội dung khác.');}
  const m=db.members.find(m=>m.code===normalize(cmd.code));if(!m)throw Error('Không tìm thấy thành viên.');if(m.status!=='active')throw Error('Thẻ đang bị khóa, chưa thể giao dịch.');
  let delta:number,txCode:string,note:string,amountVnd=0;
  if(cmd.type==='earn'){
   txCode=normalize(cmd.tx);if(!/^[A-Z0-9_./-]{3,40}$/.test(txCode))throw Error('Mã giao dịch cần 3–40 ký tự chữ, số hoặc - _ . /');
   if(db.ledger.some(e=>normalize(e.txCode)===txCode))throw Error(`Mã giao dịch ${txCode} đã được ghi nhận. Không cộng điểm lần nữa.`);
   if(!Number.isSafeInteger(cmd.amount)||cmd.amount<10000||cmd.amount>1e9)throw Error('Số tiền phải là số nguyên từ 10.000đ đến 1.000.000.000đ.');
   amountVnd=cmd.amount;delta=Math.floor(amountVnd/10000);note='Tích điểm tại quầy';
  }else{
   const r=db.rewards.find(r=>r.code===cmd.reward&&r.active);if(!r)throw Error('Ưu đãi không còn áp dụng.');
   if(m.points<r.costPoints)throw Error(`Chưa đủ điểm: cần ${r.costPoints}, hiện có ${m.points}. Số dư không thay đổi.`);
   delta=-r.costPoints;txCode=`RD-${cmd.requestId}`;note=r.name;
   db.vouchers.push({code:`VC-${cmd.requestId.toUpperCase()}`,memberCode:m.code,rewardName:r.name,costPoints:r.costPoints,txCode,issuedAt:now,expiresAt:new Date(new Date(now).getTime()+30*86400000).toISOString(),usedAt:null});
  }
  if(m.points+delta>9e12)throw Error('Số dư vượt giới hạn lưu trữ.');
  m.points+=delta;db.ledger.push({txCode,memberCode:m.code,type:cmd.type,amountVnd,delta,balanceAfter:m.points,createdAt:now,note});db.requests[cmd.requestId]=fingerprint;
 }
 db.revision++;return db;
}
export function stats(db:Database){return {members:db.members.length,issued:db.ledger.filter(e=>e.delta>0).reduce((s,e)=>s+e.delta,0),spent:-db.ledger.filter(e=>e.delta<0).reduce((s,e)=>s+e.delta,0),balance:db.members.reduce((s,m)=>s+m.points,0),opening:db.members.reduce((s,m)=>s+m.openingPoints,0)};}
