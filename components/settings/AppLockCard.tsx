'use client';

/**
 * Phase 4 — App Lock settings card: enable/disable, PIN setup with
 * confirmation, inactivity timeout, lock-on-start, manual "Lock now".
 * Includes the honest security explanation required by the spec.
 */
import React, { useState } from 'react';
import {
  setupLock, resetLock, changePin, isValidPin, webCryptoAvailable,
  type AppLockConfig,
} from '@/lib/applock';
import { Lock, LockOpen, Timer, ShieldQuestion, LogOut } from 'lucide-react';

const TIMEOUTS = [
  { v: 0, label: 'Never (manual lock only)' },
  { v: 1, label: 'After 1 minute idle' },
  { v: 5, label: 'After 5 minutes idle' },
  { v: 15, label: 'After 15 minutes idle' },
  { v: 30, label: 'After 30 minutes idle' },
];

export const AppLockCard: React.FC<{
  lockConfig: AppLockConfig | null;
  onLockConfigChange: (cfg: AppLockConfig | null) => void;
  onLockNow: () => void;
  onShowToast: (m: string) => void;
}> = ({ lockConfig, onLockConfigChange, onLockNow, onShowToast }) => {
  const [setupOpen, setSetupOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [timeoutMinutes, setTimeoutMinutes] = useState(1);
  const [lockOnStart, setLockOnStart] = useState(true);
  const [busy, setBusy] = useState(false);
  const [changeMode, setChangeMode] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [disableText, setDisableText] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  const cryptoOk = webCryptoAvailable();
  const enabled = !!lockConfig?.enabled;

  const startSetup = () => {
    setPin(''); setConfirmPin(''); setSetupOpen(true); setChangeMode(false);
  };

  const doSetup = async () => {
    if (!isValidPin(pin)) { onShowToast('PIN must be 4 to 6 digits'); return; }
    if (pin !== confirmPin) { onShowToast('PINs do not match'); return; }
    setBusy(true);
    try {
      const cfg = await setupLock(pin, { timeoutMinutes, lockOnStart });
      onLockConfigChange(cfg);
      setSetupOpen(false);
      setPin(''); setConfirmPin('');
      onShowToast('App lock enabled');
    } catch (err) {
      onShowToast(`Could not enable lock: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setBusy(false);
    }
  };

  const doChangePin = async () => {
    if (!isValidPin(currentPin)) { onShowToast('Enter your current 4-6 digit PIN'); return; }
    if (!isValidPin(pin)) { onShowToast('New PIN must be 4 to 6 digits'); return; }
    if (pin !== confirmPin) { onShowToast('New PINs do not match'); return; }
    setBusy(true);
    try {
      const cfg = await changePin(currentPin, pin);
      onLockConfigChange(cfg);
      setSetupOpen(false);
      setCurrentPin(''); setPin(''); setConfirmPin('');
      onShowToast('PIN changed');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Could not change PIN');
    } finally {
      setBusy(false);
    }
  };

  const updateOptions = async (patch: Partial<AppLockConfig>) => {
    if (!lockConfig) return;
    const next = { ...lockConfig, ...patch };
    try {
      localStorage.setItem('bc-app-lock-config', JSON.stringify(next));
      onLockConfigChange(next);
    } catch { onShowToast('Could not save lock settings'); }
  };

  const doDisable = () => {
    resetLock();
    onLockConfigChange(null);
    setShowDisable(false);
    setDisableText('');
    onShowToast('App lock disabled — your data is untouched');
  };

  return (
    <div className="card p-3 space-y-2.5">
      <div className="row sp">
        <div className="row" style={{ gap: 6 }}>
          {enabled ? <Lock className="w-4 h-4 text-[#2E7D5B] dark:text-[#6FBF9E]" /> : <LockOpen className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />}
          <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">App lock (PIN)</span>
        </div>
        <span className={`bdg ${enabled ? '' : 'opacity-60'}`}>{enabled ? 'ON' : 'OFF'}</span>
      </div>

      <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] leading-relaxed">
        Optional privacy barrier for this browser. Your PIN is verified locally with PBKDF2 (Web Crypto) — it is never stored as text and never leaves this device.
        {' '}No account, no server.
      </p>

      {!cryptoOk && (
        <div className="rounded-xl bg-[#FDF6E7] dark:bg-[#2A2415] border border-[#F0B83A]/40 p-2 text-[9.5px] text-[#B07C1E]">
          App lock needs Web Crypto, which this page does not provide (it requires HTTPS or localhost). The lock is unavailable here.
        </div>
      )}

      {enabled ? (
        <div className="space-y-2">
          <label className="row sp">
            <span className="row" style={{ gap: 6 }}><Timer className="w-3.5 h-3.5 text-[#6D6879]" /><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Lock after inactivity</span></span>
            <select
              className="rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-1.5 py-1 text-[10px]"
              value={lockConfig.timeoutMinutes}
              onChange={(e) => void updateOptions({ timeoutMinutes: parseInt(e.target.value, 10) })}
            >
              {TIMEOUTS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </label>
          <label className="row sp">
            <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Require PIN on every launch / refresh</span>
            <input
              type="checkbox"
              checked={lockConfig.lockOnStart}
              onChange={(e) => void updateOptions({ lockOnStart: e.target.checked })}
              aria-label="Require PIN on every launch or refresh"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn justify-center" onClick={onLockNow}>
              <LogOut className="w-3.5 h-3.5" /> Lock now
            </button>
            <button type="button" className="btn o justify-center" onClick={() => { setSetupOpen(true); setChangeMode(true); setPin(''); setConfirmPin(''); setCurrentPin(''); }}>
              Change PIN
            </button>
          </div>
          <button type="button" className="text-[10px] font-bold text-red-500 hover:underline" onClick={() => setShowDisable((v) => !v)}>
            Disable app lock
          </button>
          {showDisable && (
            <div className="space-y-2 rounded-xl border border-[#E7E0EE] dark:border-[#302B38] p-2.5 animate-in fade-in duration-150">
              <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
                Disabling the lock keeps ALL your business data — invoices, clients, products, settings. Only the PIN requirement is removed.
              </p>
              <div className="row" style={{ gap: 6 }}>
                <input
                  className="flex-1 rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[10.5px]"
                  placeholder="Type DISABLE to confirm"
                  value={disableText}
                  onChange={(e) => setDisableText(e.target.value)}
                  aria-label="Type DISABLE to confirm"
                />
                <button type="button" className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10.5px] font-bold disabled:opacity-50" disabled={disableText.trim().toUpperCase() !== 'DISABLE'} onClick={doDisable}>
                  Disable
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button type="button" className="btn w-full justify-center" disabled={!cryptoOk} onClick={startSetup}>
          <Lock className="w-3.5 h-3.5" /> Enable app lock
        </button>
      )}

      {setupOpen && (
        <div className="space-y-2.5 rounded-xl border border-[#E7E0EE] dark:border-[#302B38] p-2.5 animate-in fade-in duration-150">
          <div className="text-[10.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{changeMode ? 'Change your PIN' : 'Choose a PIN'}</div>
          {changeMode && (
            <label className="block">
              <span className="lab">Current PIN</span>
              <input
                className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[12px] tracking-[0.3em]"
                type="password" inputMode="numeric" maxLength={6} value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                aria-label="Current PIN"
              />
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="lab">New PIN (4-6 digits)</span>
              <input
                className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[12px] tracking-[0.3em]"
                type="password" inputMode="numeric" maxLength={6} value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                aria-label="New PIN"
              />
            </label>
            <label className="block">
              <span className="lab">Confirm PIN</span>
              <input
                className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[12px] tracking-[0.3em]"
                type="password" inputMode="numeric" maxLength={6} value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                aria-label="Confirm PIN"
              />
            </label>
          </div>
          {!changeMode && (
            <>
              <label className="row sp">
                <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Lock after inactivity</span>
                <select
                  className="rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-1.5 py-1 text-[10px]"
                  value={timeoutMinutes}
                  onChange={(e) => setTimeoutMinutes(parseInt(e.target.value, 10))}
                >
                  {TIMEOUTS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                </select>
              </label>
              <label className="row sp">
                <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Require PIN on every launch / refresh</span>
                <input type="checkbox" checked={lockOnStart} onChange={(e) => setLockOnStart(e.target.checked)} />
              </label>
            </>
          )}
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn o flex-1 justify-center" onClick={() => setSetupOpen(false)}>Cancel</button>
            <button type="button" className="btn flex-1 justify-center" disabled={busy} onClick={() => void (changeMode ? doChangePin() : doSetup())}>
              {busy ? 'Saving…' : changeMode ? 'Save new PIN' : 'Enable lock'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-[#F6F2FA] dark:bg-[#241D31] p-2.5 space-y-1.5">
        <div className="row" style={{ gap: 5 }}>
          <ShieldQuestion className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />
          <span className="text-[10px] font-bold text-[#17151F] dark:text-[#F8F5FC]">What this lock is — and is not</span>
        </div>
        <p className="text-[9px] text-[#6D6879] dark:text-[#A39BB0] leading-relaxed">
          It is a privacy barrier against casual snooping on an unlocked device, enforced in your browser. It is NOT device-level
          encryption: a technically capable person who can access this browser&apos;s storage could remove it. Biometric unlock
          (fingerprint / Face ID) is not supported — a GitHub Pages website cannot offer native device biometrics. If you forget
          your PIN the lock can be reset — your data is never deleted — so treat it as a lock on a diary, not a vault.
        </p>
      </div>
    </div>
  );
};
