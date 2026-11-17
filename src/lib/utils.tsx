import { Leaf } from 'lucide-react';
import type { ReactNode } from 'react';
export const message=(e:unknown)=>e instanceof Error?e.message:'Có lỗi xảy ra. Vui lòng thử lại.';
export const uid=()=>crypto.randomUUID();
export function Empty({title,children}:{title:string;children?:ReactNode}){return <div className="empty"><Leaf size={36}/><h3>{title}</h3><div>{children}</div></div>;}
