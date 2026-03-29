import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { getOfflineStatus, subscribeToOfflineStatus } from '../api';

export default function OfflineStatus() {
  const [isOffline, setIsOffline] = useState(getOfflineStatus());
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOfflineStatus((status) => {
      setIsOffline(status);
      if (status) {
        setShowBanner(true);
      }
    });

    const handleOnline = () => {
      setIsOffline(false);
      setShowBanner(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 p-4 rounded-lg shadow-lg border ${
      isOffline 
        ? 'bg-amber-900/90 border-amber-700 text-amber-100' 
        : 'bg-green-900/90 border-green-700 text-green-100'
    }`}>
      <div className="flex items-start gap-3">
        {isOffline ? (
          <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5" />
        ) : (
          <Wifi className="w-5 h-5 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <div className="font-medium text-sm">
            {isOffline ? '离线模式' : '已恢复在线'}
          </div>
          <div className="text-xs mt-1 opacity-80">
            {isOffline 
              ? '数据将保存在本地浏览器中，联网后可同步'
              : '已连接到服务器'}
          </div>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-current opacity-70 hover:opacity-100"
        >
          <span className="text-lg leading-none">&times;</span>
        </button>
      </div>
    </div>
  );
}
