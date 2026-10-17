'use client';

/**
 * Phase 4 — App Lock screen. Covers the whole app until the PIN is verified.
 * - Accessible numeric keypad (real buttons) + physical keyboard input.
 * - Generic errors ("Incorrect PIN") that never reveal matched digits.
 * - Increasing delay after repeated failures (15s / 60s / 5min).
 * - Honest "Forgot PIN?" recovery: the lock can be disabled — business data
 *   is never deleted. Explained inline, requires typed confirmation.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';
import { verifyPin, throttleSecondsRemaining, recordFailedAttempt, isValidPin, resetLock, type AppLockConfig } from '@/lib/applock';

const GENERIC_ERROR = 'Incorrect PIN';

export const LockScreen: React.FC<{
  onUnlocked: () => void;
  onLockDisabled: (cfg: AppLockConfig | null) => void;
}> = ({ onUnlocked, onLockDisabled }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [waitLeft, setWaitLeft] = useState(0);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotText, setForgotText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // countdown for the throttle window
  useEffect(() => {
    if (waitLeft <= 0) return;
    const t = window.setInterval(() => {
      setWaitLeft(throttleSecondsRemaining());
    }, 1000);
    return () => window.clearInterval(t);
  }, [waitLeft]);

  useEffect(() => {
    setWaitLeft(throttleSecondsRemaining());
    inputRef.current?.focus();
  }, []);

  const submit = useCallback(async (candidate: string) => {
    if (!isValidPin(candidate) || checking || waitLeft > 0) return;
    setChecking(true);
    setError(null);
    try {
      const ok = await verifyPin(candidate);
      if (ok) {
        onUnlocked();
        return;
      }
      recordFailedAttempt();
      setError(GENERIC_ERROR);
      setWaitLeft(throttleSecondsRemaining());
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setChecking(false);
      setPin('');
    }
  }, [checking, onUnlocked, waitLeft]);

  const pressDigit = (d: string) => {
    if (waitLeft > 0) return;
    const next = (pin + d).slice(0, 6);
    setPin(next);
    setError(null);
    if (next.length === 6) void submit(next); // 6-digit PINs submit automatically
  };

  const onKeypadKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') { setPin((p) => p.slice(0, -1)); setError(null); }
    else if (e.key === 'Enter') void submit(pin);
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[var(--bg-main)] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="BillCraft is locked"
    >
      <div className="w-full max-w-[320px] space-y-5 text-center animate-in fade-in duration-200">
        <div className="flex flex-col items-center gap-2 pt-6">
          <BillCraftLogo variant="lockup" size={44} />
          <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">BillCraft is locked</div>
          <div className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Enter your PIN to continue</div>
        </div>

        {/* PIN dots + hidden input for physical keyboards */}
        <div className="relative">
          <input
            ref={inputRef}
            className="absolute inset-0 opacity-0 w-full h-full"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Enter PIN"
            value={pin}
            maxLength={6}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setPin(v); setError(null); if (v.length === 4 || v.length === 6) void submit(v); }}
            onKeyDown={onKeypadKeyDown}
            disabled={checking || waitLeft > 0}
          />
          <button
            type="button"
            className="flex justify-center gap-2.5 w-full py-2"
            aria-label="PIN entry, focus to type"
            onClick={() => inputRef.current?.focus()}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={`w-2.5 h-2.5 rounded-full transition ${i < pin.length ? 'bg-[#593C8F] dark:bg-[#A8D5BA]' : 'bg-[#E7E0EE] dark:bg-[#302B38]'}`}
              />
            ))}
          </button>
        </div>

        {error && <div className="text-[11px] font-bold text-red-500" role="alert">{error}</div>}
        {waitLeft > 0 && (
          <div className="text-[11px] font-bold text-[#B07C1E]" role="alert">
            Too many attempts — try again in {Math.floor(waitLeft / 60) > 0 ? `${Math.floor(waitLeft / 60)}m ` : ''}{waitLeft % 60}s
          </div>
        )}
        {checking && <div className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Checking…</div>}

        {/* Accessible keypad */}
        <div className="grid grid-cols-3 gap-2.5 px-2" role="group" aria-label="PIN keypad">
          {['1','2','3','4','5','6','7','8','9'].map((d) => (
            <button
              key={d}
              type="button"
              className="rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#1B1820] py-3 text-[16px] font-bold text-[#17151F] dark:text-[#F8F5FC] active:scale-95 transition disabled:opacity-40"
              onClick={() => { pressDigit(d); inputRef.current?.focus(); }}
              disabled={checking || waitLeft > 0}
            >{d}</button>
          ))}
          <button
            type="button"
            className="rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#1B1820] py-3 text-[13px] text-[#6D6879] dark:text-[#A39BB0] active:scale-95 transition"
            onClick={() => { setPin(''); setError(null); inputRef.current?.focus(); }}
            aria-label="Clear PIN"
          >Clear</button>
          <button
            type="button"
            className="rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#1B1820] py-3 text-[16px] font-bold text-[#17151F] dark:text-[#F8F5FC] active:scale-95 transition disabled:opacity-40"
            onClick={() => { pressDigit('0'); inputRef.current?.focus(); }}
            disabled={checking || waitLeft > 0}
          >0</button>
          <button
            type="button"
            className="rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#1B1820] py-3 text-[16px] text-[#17151F] dark:text-[#F8F5FC] active:scale-95 transition disabled:opacity-40"
            onClick={() => { setPin((p) => p.slice(0, -1)); setError(null); inputRef.current?.focus(); }}
            aria-label="Delete last digit"
          >⌫</button>
        </div>

        <button type="button" className="btn w-full justify-center" disabled={checking || waitLeft > 0 || !isValidPin(pin)} onClick={() => void submit(pin)}>
          Unlock
        </button>

        <div className="pt-1">
          <button type="button" className="text-[10px] font-bold text-[#6D6879] dark:text-[#A39BB0] underline" onClick={() => setShowForgot((v) => !v)}>
            Forgot PIN?
          </button>
          {showForgot && (
            <div className="card p-3 space-y-2 text-left mt-2 animate-in fade-in duration-150">
              <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] leading-relaxed">
                The lock is a privacy barrier, not encryption — resetting it never deletes your invoices, clients, products or settings.
                Resetting disables the lock until you set a new PIN. Anyone with full access to this browser could do the same; that is an
                honest limit of a local-first app.
              </p>
              <input
                className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]"
                placeholder="Type RESET to disable the lock"
                value={forgotText}
                onChange={(e) => setForgotText(e.target.value)}
                aria-label="Type RESET to disable the lock"
              />
              <button
                type="button"
                className="w-full px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10.5px] font-bold transition disabled:opacity-50"
                disabled={forgotText.trim().toUpperCase() !== 'RESET'}
                onClick={() => { resetLock(); onLockDisabled(null); }}
              >
                Reset lock (keep my data)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
