import { useSyncExternalStore } from 'react';
import { applyCommand, emptyDb, validateDb } from '../domain/engine';
import type { Command, Database } from '../domain/model';
export const STORAGE_KEY='vibe-rewards:local:v1';
let db:Database=emptyDb();
let storageError='';
try{const raw=localStorage.getItem(STORAGE_KEY);if(raw)db=validateDb(JSON.parse(raw));}catch{storageError='Không đọc được dữ liệu đã lưu. Hãy tải bản sao thô trước khi đặt lại hoặc nhập bản sao lưu hợp lệ.';}
const listeners=new Set<()=>void>();
const notify=()=>listeners.forEach(l=>l());
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){try{db=e.newValue?validateDb(JSON.parse(e.newValue)):emptyDb();storageError='';}catch{storageError='Dữ liệu từ tab khác không hợp lệ. Chưa cập nhật.';}notify();}});
export function useDatabase(){return useSyncExternalStore(cb=>{listeners.add(cb);return()=>{listeners.delete(cb);};},()=>db);}
export const getStorageError=()=>storageError;
export function commit(next:Database){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{throw Error('Không thể lưu: bộ nhớ trình duyệt đầy hoặc bị chặn. Dữ liệu chưa thay đổi.');}db=next;storageError='';notify();return db;}
export async function dispatch(cmd:Command):Promise<Database>{
 if(!navigator.locks)throw Error('Trình duyệt chưa hỗ trợ ghi an toàn. Vui lòng dùng Chrome, Edge, Firefox hoặc Safari mới.');
 return navigator.locks.request(STORAGE_KEY,()=>{if(storageError&&cmd.type!=='sample')throw Error(storageError);const raw=localStorage.getItem(STORAGE_KEY);const current=storageError?emptyDb():raw?validateDb(JSON.parse(raw)):emptyDb();return commit(applyCommand(current,cmd));});
}
export async function importBackup(input:unknown){const parsed=validateDb(input);if(!navigator.locks)throw Error('Trình duyệt chưa hỗ trợ ghi an toàn.');return navigator.locks.request(STORAGE_KEY,()=>commit(parsed));}
export function download(name:string,text:string,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
