import { useEffect,useState } from 'react';
import QRCode from 'qrcode';
export default function QR({value,size=120}:{value:string;size?:number}){
 const [src,setSrc]=useState('');
 useEffect(()=>{let active=true;QRCode.toDataURL(value,{width:size*2,margin:3,errorCorrectionLevel:'M'}).then(s=>{if(active)setSrc(s);});return()=>{active=false;};},[value,size]);
 return src?<img className="qr-image" src={src} width={size} height={size} alt={`Mã QR ${value}`}/>:<div style={{width:size,height:size}} aria-label="Đang tạo QR"/>;
}
