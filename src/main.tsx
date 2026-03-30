import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import MobileApp from './MobileApp.tsx';
import './index.css';
import { Workbox } from 'workbox-window';

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  const wb = new Workbox('/service-worker.js');
  wb.register();
}

const searchParams = new URLSearchParams(window.location.search);
const mindset = searchParams.get('mindset');

const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isLightMode = searchParams.get('mode') === 'light' || window.location.search.includes('mode=light');
const isOfflineMode = searchParams.get('mode') === 'offline' || window.location.search.includes('mode=offline');
const isMacMode = searchParams.get('mode') === 'mac' || window.location.search.includes('mode=mac');

const shouldShowMobile = mindset === 'mobile' || (mindset !== 'desktop' && (isMobileUA || isLightMode));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shouldShowMobile ? <MobileApp /> : <App isOffline={isOfflineMode} isMac={isMacMode} />}
  </StrictMode>,
);
