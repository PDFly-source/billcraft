'use client';

import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useIsMounted } from '@/hooks/useIsMounted';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const mounted = useIsMounted();
  const isOnline = useOnlineStatus();

  if (!mounted || isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-bottom duration-200">
      <WifiOff className="w-4 h-4 text-white" />
      <span>Offline Mode — Core document generator & calculations running locally.</span>
    </div>
  );
};
