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
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedToolId, setSelectedToolId] = useState<ToolId>('gst');
  const [document, setDocument] = useState<DocumentModel>(() => createSampleDocument('invoice'));
  const [hasStartedEditing, setHasStartedEditing] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
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
  const handleCreateDocument = (type: DocumentType) => {
    const blank = createEmptyDocument(type, settings.defaultCurrency);
    blank.template = settings.defaultTemplate;
    blank.colorTheme = settings.defaultColorTheme;
    blank.paperSize = settings.paperSize;
    blank.autoRoundOff = settings.autoRoundOff;
    blank.showBillCraftBranding = settings.showBranding;
    setDocument(blank);
    setHasStartedEditing(true);
    setActiveTab('editor');
    showToast(`Created new ${type.toUpperCase()}`);
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
    setDocument(blank);
    setHasStartedEditing(false);
    showToast('Document cleared');
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
      {/* PWA In-App Install Banner */}
      <PWAInstallBanner />

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
