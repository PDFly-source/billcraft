'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useIsMounted } from '@/hooks/useIsMounted';
import { Download, X, Smartphone, Share } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const mounted = useIsMounted();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (!mounted || isInstalled || isDismissed) {
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="pwa-banner bg-[#593C8F] text-white px-4 py-2 text-xs flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/billcraft-emblem.png"
            alt="BillCraft"
            className="w-5 h-5 object-contain rounded-md shrink-0 shadow-xs"
          />
          <span className="font-medium">
            <strong className="font-bold">Install BillCraft:</strong> Create business documents offline anywhere.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isInstallable && (
            <button
              onClick={install}
              className="px-3 py-1 bg-white text-[#593C8F] hover:bg-[#FAF6EE] font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          )}

          {isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="px-3 py-1 bg-white text-[#593C8F] hover:bg-[#FAF6EE] font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <Share className="w-3.5 h-3.5" />
              Install on iOS
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded text-white/70 hover:text-white"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/billcraft-emblem.png"
                alt="BillCraft"
                className="w-9 h-9 object-contain rounded-xl shadow-md"
              />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Install BillCraft Studio
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">CREATE • CALCULATE • SHARE</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              1. Tap the <strong className="text-slate-900 dark:text-white">Share</strong> button in your Safari toolbar.<br />
              2. Scroll down and choose <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong>.<br />
              3. Tap <strong className="text-slate-900 dark:text-white">Add</strong> in the top right corner.
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full rounded-xl bg-[#593C8F] py-2.5 text-xs font-bold text-white hover:bg-[#483076] transition shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
