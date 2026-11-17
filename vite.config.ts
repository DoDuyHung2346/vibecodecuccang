import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
 plugins:[react(),VitePWA({registerType:'prompt', includeAssets:['icon.svg','sample-qr/*.png'], manifest:{name:'Vibe Rewards',short_name:'Vibe',description:'Thẻ thành viên, tích điểm và đổi ưu đãi offline',lang:'vi',theme_color:'#174e3c',background_color:'#f7f8f4',display:'standalone',start_url:'/',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]},workbox:{globPatterns:['**/*.{js,css,html,svg,png,woff2,json}'],navigateFallback:'/index.html'}})],
 test:{include:['src/**/*.test.ts']}, server:{port:5173,strictPort:true},preview:{port:4173,strictPort:true}
});
