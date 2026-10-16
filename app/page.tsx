'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentModel,
  DocumentType,
  AppSettings,
  TemplateId,
  ColorThemeId,
  CurrencyCode,
} from '@/types/document';
import {
  createEmptyDocument,
  createSampleDocument,
  convertDocument,
} from '@/lib/sample-data';
import { Header, NavTab } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { MobileTabBar } from '@/components/navigation/MobileTabBar';
import { HomeView } from '@/components/home/HomeView';
import { WelcomeView } from '@/components/home/WelcomeView';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { DocumentTypeWizard } from '@/components/editor/DocumentTypeWizard';
import { DocumentEditor } from '@/components/editor/DocumentEditor';
import { LivePreviewView } from '@/components/preview/LivePreviewView';
import { TemplatesGallery } from '@/components/templates/TemplatesGallery';
import { BusinessTools, ToolId } from '@/components/tools/BusinessTools';
import { SettingsView } from '@/components/settings/SettingsView';
import { PrivacyView } from '@/components/pages/PrivacyView';
import { AboutView } from '@/components/pages/AboutView';
import { CommandPalette } from '@/components/modals/CommandPalette';
import { ToastContainer, ToastMessage } from '@/components/ui/ToastContainer';
import { PWAInstallBanner } from '@/components/pwa/PWAInstallBanner';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { downloadPDF } from '@/lib/pdf-generator';
import { LocalDataProvider, useLocalData } from '@/hooks/useLocalData';
import { ClientsView } from '@/components/data/ClientsView';
import { ProductsView } from '@/components/data/ProductsView';
import { HistoryView } from '@/components/data/HistoryView';
import { DashboardSection } from '@/components/data/DashboardSection';
import { PrivacyNoticeCard, PRIVACY_NOTICE_TEXT } from '@/components/data/DataSections';
import { nextDocumentNumber, getDraft, saveDraft, clearDraft, getImage } from '@/lib/db/repository';
import { calculateDocument } from '@/lib/calculations';
import { convertDocument as convertDocModel } from '@/lib/sample-data';
import { SavedDocument, DraftRecord } from '@/types/local';
import { Undo2, X } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  defaultCurrency: 'INR',
  defaultTemplate: 'modern',
  defaultColorTheme: 'plum',
  defaultTaxMode: 'gst',
  paperSize: 'a4',
  autoRoundOff: true,
  showBranding: true,
};

export default function BillCraftApp() {
  return (
    <LocalDataProvider>
      <AppShell />
    </LocalDataProvider>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedToolId, setSelectedToolId] = useState<ToolId>('gst');
  const [document, setDocument] = useState<DocumentModel>(() => createSampleDocument('invoice'));
  const [hasStartedEditing, setHasStartedEditing] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [splashState, setSplashState] = useState<'show' | 'fade' | 'done'>('show');
  const { profile, docPrefs, saveDocument, setDocumentStatus, documents, refresh } = useLocalData();
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [convertingFromId, setConvertingFromId] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveBusy, setSaveBusy] = useState(false);
  const [recoverableDraft, setRecoverableDraft] = useState<DraftRecord | null>(null);
  const [noticeSeen, setNoticeSeen] = useState(true);
  const autosaveRev = React.useRef(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Show Toast
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Theme Sync
  useEffect(() => {
    let shouldBeDark = false;
    if (settings.theme === 'dark') {
      shouldBeDark = true;
    } else if (settings.theme === 'system') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (shouldBeDark) {
      window.document.documentElement.classList.add('dark');
    } else {
      window.document.documentElement.classList.remove('dark');
    }

    Promise.resolve().then(() => {
      setIsDarkMode(shouldBeDark);
    });
  }, [settings.theme]);

  // Official brand splash: visible on cold launch / PWA launch / refresh,
  // fades out and unmounts so it never blocks interaction.
  useEffect(() => {
    const t1 = setTimeout(() => setSplashState('fade'), 1100);
    const t2 = setTimeout(() => setSplashState('done'), 1650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Register offline service worker (static export lives under /billcraft/)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/billcraft/sw.js').catch(() => undefined);
    }
  }, []);

  // Unsaved Session Warning (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasStartedEditing) {
        e.preventDefault();
        e.returnValue = 'Your current document exists only in this browser session. Export it before leaving.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasStartedEditing]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Cmd/Ctrl + P -> Print
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
      }
      // Cmd/Ctrl + E -> Export PDF
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const el = window.document.getElementById('printable-document');
        if (el) {
          downloadPDF(el, document, { paperSize: document.paperSize })
            .then((filename) => showToast(`PDF exported: ${filename}`))
            .catch(() => showToast('PDF export failed. Use Print dialog.', 'error'));
        }
      }
      // Alt + I -> Add Item (when in editor)
      else if (e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (activeTab === 'editor') {
          const newItem = {
            id: `item_${Date.now()}`,
            name: '',
            description: '',
            hsn: '998314',
            quantity: 1,
            unit: 'service' as const,
            rate: '',
            discountType: 'percent' as const,
            discountValue: 0,
            taxRate: 18,
          };
          setDocument((prev) => ({ ...prev, items: [...prev.items, newItem] }));
          showToast('Added new line item');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, document, showToast]);

  // Navigation and Document Creation
  const handleCreateDocument = async (type: DocumentType) => {
    const blank = createEmptyDocument(type, (profile?.defaultCurrency as DocumentModel['currency']) || settings.defaultCurrency);
    blank.template = settings.defaultTemplate;
    blank.colorTheme = settings.defaultColorTheme;
    blank.paperSize = settings.paperSize;
    blank.autoRoundOff = docPrefs.autoRoundOff ?? settings.autoRoundOff;
    blank.showBillCraftBranding = docPrefs.showBranding ?? settings.showBranding;
    // prefill from saved business profile (documents keep their own snapshot)
    if (profile) {
      blank.business = {
        ...blank.business,
        name: profile.businessName || blank.business.name,
        phone: profile.phone,
        email: profile.email,
        website: profile.website || blank.business.website,
        address: profile.address || blank.business.address,
        gstin: profile.gstin,
        pan: profile.pan || blank.business.pan,
        state: profile.state || blank.business.state,
        stateCode: profile.stateCode || blank.business.stateCode,
      };
      blank.payment = {
        ...blank.payment,
        bankName: profile.bankName || blank.payment.bankName,
        accountHolder: profile.bankAccountHolder || blank.payment.accountHolder,
        accountNumber: profile.bankAccountNumber || blank.payment.accountNumber,
        ifsc: profile.bankIfsc || blank.payment.ifsc,
        upiId: profile.upiId || blank.payment.upiId,
        notes: profile.paymentInstructions || blank.payment.notes,
      };
      blank.terms = profile.defaultPaymentTerms || blank.terms;
      blank.notes = profile.defaultFooterNotes || blank.notes;
      blank.tax = { ...blank.tax, gstType: profile.defaultGstType };
      if (profile.logoId) blank.business.logo = (await getImage(profile.logoId)) || '';
      if (profile.signatureId) {
        const sig = (await getImage(profile.signatureId)) || '';
        if (sig) blank.signature = { ...blank.signature, type: 'upload', image: sig };
      }
    }
    // global document preferences + sequential numbering
    blank.watermark = docPrefs.watermark;
    blank.density = docPrefs.density;
    blank.meta.documentNumber = await nextDocumentNumber(type);
    setDocument(blank);
    setSavedDocId(null);
    setConvertingFromId(null);
    setHasStartedEditing(true);
    setActiveTab('editor');
    showToast(`New ${type.toUpperCase()} ${blank.meta.documentNumber}`);
  };

  const handleLoadDemo = () => {
    const sample = createSampleDocument('invoice', settings.defaultCurrency);
    sample.template = settings.defaultTemplate;
    sample.colorTheme = settings.defaultColorTheme;
    setDocument(sample);
    setHasStartedEditing(true);
    setActiveTab('editor');
    showToast('Loaded interactive demo invoice');
  };

  const handleResetDocument = () => {
    const blank = createEmptyDocument(document.type, settings.defaultCurrency);
    blank.template = document.template;
    blank.colorTheme = document.colorTheme;
    blank.watermark = document.watermark;
    blank.density = document.density;
    setDocument(blank);
    setSavedDocId(null);
    setConvertingFromId(null);
    setHasStartedEditing(false);
    void clearDraft();
    setAutosaveStatus('idle');
    showToast('Document cleared');
  };

  // ---------- Draft autosave (Feature 6) ----------
  useEffect(() => {
    if (!hasStartedEditing) return;
    setAutosaveStatus('saving');
    const rev = ++autosaveRev.current;
    const timer = setTimeout(async () => {
      try {
        await saveDraft({ revision: rev, savedAt: new Date().toISOString(), document, hasStartedEditing });
        if (autosaveRev.current === rev) setAutosaveStatus('saved'); // only after the write succeeded
      } catch {
        if (autosaveRev.current === rev) setAutosaveStatus('error'); // never claim saved on failure
      }
    }, 900); // debounce frequent edits
    return () => clearTimeout(timer);
  }, [document, hasStartedEditing]);

  // ---------- Draft recovery (offer restore after refresh / reopen) ----------
  useEffect(() => {
    void getDraft().then((draft) => {
      if (draft && draft.hasStartedEditing) setRecoverableDraft(draft);
    });
    try {
      setNoticeSeen(localStorage.getItem('bc-privacy-notice-seen') === '1');
    } catch { /* private mode */ }
  }, []);

  const dismissNotice = () => {
    setNoticeSeen(true);
    try { localStorage.setItem('bc-privacy-notice-seen', '1'); } catch { /* ignore */ }
  };

  const restoreDraft = () => {
    if (!recoverableDraft) return;
    setDocument(recoverableDraft.document);
    setHasStartedEditing(true);
    setActiveTab('editor');
    setRecoverableDraft(null);
    showToast('Draft restored — continue where you left off');
  };

  const discardDraft = () => {
    void clearDraft();
    setRecoverableDraft(null);
    showToast('Draft discarded');
  };

  // ---------- Save to History (Feature 4) ----------
  const handleSaveToHistory = async () => {
    const calc = calculateDocument(document);
    const hasContent =
      (document.customer.company || document.customer.name).trim() !== '' ||
      (document.business.name || '').trim() !== '';
    if (!hasContent || document.items.length === 0) {
      showToast('Add client or business details and at least one item before saving');
      return;
    }
    setSaveBusy(true);
    try {
      const id = savedDocId || crypto.randomUUID();
      const existing = savedDocId ? documents.find((d) => d.id === savedDocId) : undefined;
      const record = {
        id,
        type: document.type,
        documentNumber: document.meta.documentNumber,
        document,
        calc,
        status: (existing?.status as SavedDocument['status']) ||
          (document.type === 'invoice' ? 'unpaid' : document.type === 'receipt' ? 'issued' : 'issued'),
        payments: existing?.payments || [],
        clientId: existing?.clientId || null,
        clientName: document.customer.company || document.customer.name || '',
        issueDate: document.meta.date || new Date().toISOString().slice(0, 10),
        dueDate: document.type === 'invoice' || document.type === 'proforma' ? document.meta.dueDate : '',
        totalMinor: Math.round(calc.grandTotal * 100),
        amountPaidMinor: existing?.amountPaidMinor || 0,
        convertedFromId: existing?.convertedFromId || convertingFromId,
        convertedToId: existing?.convertedToId || null,
      } as Omit<SavedDocument, 'createdAt' | 'updatedAt'>;
      await saveDocument(record);
      if (convertingFromId) {
        // conversion completed: mark source quotation, keep it intact
        const src = documents.find((d) => d.id === convertingFromId);
        if (src) await setDocumentStatus(src.id, 'converted');
        setConvertingFromId(null);
        showToast(`Saved as ${record.documentNumber} — original quotation kept as Converted`);
      } else {
        showToast(savedDocId ? `Updated ${record.documentNumber}` : `Saved to History: ${record.documentNumber}`);
      }
      setSavedDocId(id);
      await refresh();
    } catch (err) {
      showToast(`Save failed: ${err instanceof Error ? err.message : 'storage error'}`);
    } finally {
      setSaveBusy(false);
    }
  };

  // ---------- History actions ----------
  const handleOpenSavedDoc = async (saved: SavedDocument) => {
    if (recoverableDraft && !window.confirm('You have an unsaved draft. Opening this document will replace it — continue?')) return;
    setDocument(saved.document);
    setSavedDocId(saved.id);
    setConvertingFromId(null);
    setHasStartedEditing(true);
    void clearDraft();
    setActiveTab('editor');
    showToast(`Opened ${saved.documentNumber}`);
  };

  const handleDuplicateSavedDoc = async (saved: SavedDocument) => {
    const copy = { ...saved.document, id: crypto.randomUUID() as unknown as string };
    copy.meta.documentNumber = await nextDocumentNumber(copy.type);
    setDocument(copy);
    setSavedDocId(null);
    setConvertingFromId(null);
    setHasStartedEditing(true);
    setActiveTab('editor');
    showToast(`Duplicated as new draft ${copy.meta.documentNumber} — independent copy`);
  };

  const handleConvertSavedDoc = async (saved: SavedDocument) => {
    const converted = convertDocModel(saved.document, 'invoice');
    converted.meta.documentNumber = await nextDocumentNumber('invoice');
    converted.meta.date = new Date().toISOString().slice(0, 10);
    setDocument(converted);
    setSavedDocId(null);
    setConvertingFromId(saved.id);
    setHasStartedEditing(true);
    setActiveTab('editor');
    showToast('Converted to invoice draft — Save to History when ready (original is untouched)');
  };

  // Command Palette Action Dispatcher
  const handleCommandAction = (actionId: string, payload?: unknown) => {
    switch (actionId) {
      case 'create-doc':
        handleCreateDocument((payload as DocumentType) || 'invoice');
        break;
      case 'add-item':
        if (activeTab !== 'editor') setActiveTab('editor');
        setDocument((prev) => ({
          ...prev,
          items: [
            ...prev.items,
            {
              id: `item_${Date.now()}`,
              name: '',
              description: '',
              hsn: '998314',
              quantity: 1,
              unit: 'service',
              rate: '',
              discountType: 'percent',
              discountValue: 0,
              taxRate: 18,
            },
          ],
        }));
        showToast('Line item added');
        break;
      case 'open-preview':
        setActiveTab('preview');
        break;
      case 'export-pdf': {
        const el = window.document.getElementById('printable-document');
        if (el) {
          downloadPDF(el, document)
            .then((f) => showToast(`PDF exported: ${f}`))
            .catch(() => showToast('PDF export failed', 'error'));
        }
        break;
      }
      case 'print':
        window.print();
        break;
      case 'share': {
        const btn = window.document.querySelector('[title="Share"]') as HTMLButtonElement;
        if (btn) btn.click();
        break;
      }
      case 'toggle-theme':
        setSettings((prev) => ({ ...prev, theme: isDarkMode ? 'light' : 'dark' }));
        showToast(isDarkMode ? 'Switched to Light Mode' : 'Switched to Dark Mode');
        break;
      case 'navigate':
        setActiveTab((payload as NavTab) || 'home');
        break;
      case 'reset-document':
        handleResetDocument();
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Official In-App Splash (cold launch / PWA launch) */}
      {splashState !== 'done' && <SplashScreen fading={splashState === 'fade'} />}

      {/* PWA In-App Install Banner */}
      <PWAInstallBanner />

      {/* Draft recovery banner (Feature 6) */}
      {recoverableDraft && (
        <div className="fixed top-16 inset-x-2 z-[65] rounded-xl border border-[#593C8F] bg-[#F6F2FA] dark:bg-[#241D31] dark:border-[#593C8F]/50 p-2.5 shadow-lg animate-in slide-in-from-top-2 fade-in duration-200" data-testid="draft-recovery">
          <div className="row sp" style={{ gap: 8 }}>
            <Undo2 className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Unsaved draft found ({new Date(recoverableDraft.savedAt).toLocaleString()})</div>
              <div className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">Recover it or discard — saved documents are in History.</div>
            </div>
            <button type="button" onClick={discardDraft} className="p-1 rounded-lg hover:bg-[#593C8F]/10" aria-label="Discard draft"><X className="w-3.5 h-3.5 text-[#6D6879]" /></button>
            <button type="button" onClick={restoreDraft} className="btn shrink-0" style={{ fontSize: 10 }}>Restore draft</button>
          </div>
        </div>
      )}

      {/* First-use privacy notice (Feature 7) */}
      {!noticeSeen && (activeTab === 'home' || activeTab === 'editor') && (
        <div className="max-w-[420px] mx-auto px-2 pt-2">
          <PrivacyNoticeCard onExportBackup={() => setActiveTab('settings')} dismissible onDismiss={dismissNotice} />
        </div>
      )}

      {/* Global Header */}
      <Header
        activeTab={activeTab}
        onNavigate={(tab) => setActiveTab(tab)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() =>
          setSettings((prev) => ({ ...prev, theme: isDarkMode ? 'light' : 'dark' }))
        }
        hasActiveDocument={Boolean(document)}
      />

      {/* Main Body */}
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full pb-20 md:pb-6">
        <ErrorBoundary onReset={() => setActiveTab('home')}>
          {activeTab === 'welcome' && (
            <WelcomeView
              onGetStarted={() => setActiveTab('create')}
              onExplore={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'home' && (
            <div className="space-y-3.5">
              <HomeView
                onCreateDocument={handleCreateDocument}
                onNavigateToCreate={() => setActiveTab('create')}
                onOpenTemplates={() => setActiveTab('templates')}
                onOpenTools={() => setActiveTab('tools')}
                onOpenTool={(toolId) => {
                  setSelectedToolId(toolId as ToolId);
                  setActiveTab('tools');
                }}
                onLoadDemo={handleLoadDemo}
                onViewWelcome={() => setActiveTab('welcome')}
              />
              {/* Phase 1: real business dashboard + local-data shortcuts */}
              <DashboardSection
                onOpenHistory={() => setActiveTab('history')}
                onOpenDocument={(saved) => void handleOpenSavedDoc(saved)}
                onCreateDocument={(t) => void handleCreateDocument(t)}
              />
              <div className="max-w-[420px] mx-auto grid grid-cols-3 gap-2" data-testid="data-nav">
                <button type="button" onClick={() => setActiveTab('clients')} className="btn o justify-center inline-flex items-center gap-1.5" style={{ fontSize: 10.5 }}>Clients</button>
                <button type="button" onClick={() => setActiveTab('products')} className="btn o justify-center inline-flex items-center gap-1.5" style={{ fontSize: 10.5 }}>Catalogue</button>
                <button type="button" onClick={() => setActiveTab('history')} className="btn o justify-center inline-flex items-center gap-1.5" style={{ fontSize: 10.5 }}>History</button>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <ClientsView onShowToast={showToast} />
          )}

          {activeTab === 'products' && (
            <ProductsView onShowToast={showToast} />
          )}

          {activeTab === 'history' && (
            <HistoryView
              onOpenDocument={(saved) => void handleOpenSavedDoc(saved)}
              onDuplicateDocument={(saved) => void handleDuplicateSavedDoc(saved)}
              onConvertDocument={(saved) => void handleConvertSavedDoc(saved)}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'create' && (
            <DocumentTypeWizard
              onSelectType={handleCreateDocument}
              onLoadDemo={handleLoadDemo}
            />
          )}

          {activeTab === 'editor' && (
            <DocumentEditor
              document={document}
              onUpdateDocument={(upd) => {
                setDocument(upd);
                setHasStartedEditing(true);
              }}
              onResetDocument={handleResetDocument}
              onShowToast={showToast}
              onBackToHome={() => setActiveTab('home')}
              onSaveToHistory={() => void handleSaveToHistory()}
              saveBusy={saveBusy}
              autosaveStatus={autosaveStatus}
              onOpenPreview={() => setActiveTab('preview')}
            />
          )}

          {activeTab === 'preview' && (
            <LivePreviewView
              document={document}
              onBack={() => setActiveTab('editor')}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesGallery
              currentTemplate={document.template}
              currentColorTheme={document.colorTheme}
              customColor={document.customColor}
              onSelectTemplate={(tpl) => {
                setDocument((prev) => ({ ...prev, template: tpl }));
                showToast(`Applied ${tpl.toUpperCase()} template`);
              }}
              onSelectColorTheme={(thm, customHex) => {
                setDocument((prev) => ({
                  ...prev,
                  colorTheme: thm,
                  customColor: customHex || prev.customColor,
                }));
                showToast(`Applied ${thm} color theme`);
              }}
              onNavigateToEditor={() => setActiveTab('editor')}
              onBack={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'tools' && <BusinessTools key={selectedToolId} initialTool={selectedToolId} />}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={(upd) => setSettings((prev) => ({ ...prev, ...upd }))}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'privacy' && <PrivacyView />}

          {activeTab === 'about' && <AboutView />}
        </ErrorBoundary>
      </main>

      {/* Global Footer */}
      <Footer onNavigate={(tab) => setActiveTab(tab)} />

      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar
        activeTab={activeTab}
        onNavigate={(tab) => setActiveTab(tab)}
        hasActiveDocument={Boolean(document)}
      />

      {/* Offline Status Toast/Banner */}
      <OfflineIndicator />

      {/* Floating Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Cmd + K Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onAction={handleCommandAction}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
