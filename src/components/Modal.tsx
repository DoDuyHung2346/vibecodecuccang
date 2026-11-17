import { useEffect,useRef,type ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;d?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{d?.close();document.body.style.overflow=old;};},[]);
 return <dialog ref={ref} className="modal" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={21}/></button></div><div className="modal-body">{children}</div></dialog>;
}
