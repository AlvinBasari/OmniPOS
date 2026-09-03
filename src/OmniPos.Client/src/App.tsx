import React, { useState, useEffect } from 'react';
import { TopNavbar } from './components/layout/TopNavbar';
import { Sidebar, NavigationPage } from './components/layout/Sidebar';
import { PosPage } from './pages/PosPage';
import { TablesPage, KdsPage } from './pages/TablesAndKdsPages';
import { CfdPage, ShiftsPage } from './pages/CfdAndShiftsPages';
import { 
  InventoryPage, 
  CustomersPage, 
  ReportsPage, 
  BackupPage, 
  SettingsPage,
  UserManagementPage 
} from './pages/ManagementPages';
import { PurchasingPage } from './pages/PurchasingPage';
import { StockOpnamePage } from './pages/StockOpnamePage';
import { PriceTagLabelPage } from './pages/PriceTagLabelPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { ExpiredTrackerPage } from './pages/ExpiredTrackerPage';
import { SalesReturnPage } from './pages/SalesReturnPage';
import { ServiceCenterPage } from './pages/ServiceCenterPage';
import { ElectronicsSerialPage } from './pages/ElectronicsSerialPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { LoginPage } from './pages/LoginPage';
import { 
  OpenShiftModal, 
  CloseShiftModal, 
  QuickLockModal,
  CashMovementModal
} from './components/modals/ShiftAndSecurityModals';
import { HardwareStatusModal } from './components/modals/HardwareStatusModal';
import { ManualScaleModal } from './components/modals/ManualScaleModal';
import { ReceiptPrintFallbackModal } from './components/modals/ReceiptPrintFallbackModal';
import { MobileScannerModal } from './components/modals/MobileScannerModal';
import { MobileScannerPage } from './pages/MobileScannerPage';
import { useShiftStore, useThemeStore } from './store/useShiftAndThemeStores';
import { useBusinessModeStore } from './store/useBusinessModeStore';
import { useAuthStore } from './store/useAuthStore';
import { useHardwareStore } from './store/useHardwareStore';
import { useCartStore } from './store/useCartStore';
import { useToastStore } from './store/useToastStore';
import { useSettingsStore } from './store/useSettingsStore';
import { ToastContainer } from './components/common/ToastContainer';
import { DiningTable } from './types';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('OmniPOS UI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app text-center">
          <div className="p-6 bg-card border border-status-danger/30 rounded-2xl max-w-md shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <h2 className="text-base font-bold text-text-primary">Terjadi Kendala Tampilan Halaman</h2>
            <p className="text-xs text-text-secondary font-mono bg-subtle p-2 rounded border border-border-subtle text-left">
              {this.state.error?.message || 'Gagal memuat komponen antarmuka.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-text rounded-lg text-xs font-bold hover:bg-primary-hover shadow-sm"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('pos');
  const [isOpenShiftOpen, setIsOpenShiftOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [isCashMovementOpen, setIsCashMovementOpen] = useState(false);

  const { fetchActiveShift } = useShiftStore();
  const { theme } = useThemeStore();
  const { mode, fetchInitialMode } = useBusinessModeStore();
  const { currentUser, isSetupRequired, checkSetupStatus } = useAuthStore();
  const { fetchSettings: fetchSystemSettings } = useSettingsStore();
  const { setTable } = useCartStore();

  useEffect(() => {
    // Sync initial theme attribute & business mode to document
    document.documentElement.setAttribute('data-theme', theme);
    checkSetupStatus();
    fetchActiveShift();
    fetchInitialMode();
    fetchSystemSettings();
  }, [theme, checkSetupStatus, fetchActiveShift, fetchInitialMode, fetchSystemSettings]);

  // Global hotkey for quick navigation
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        useThemeStore.getState().lockScreen();
      } else if (e.key === 'F10') {
        e.preventDefault();
        setCurrentPage('shifts');
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const handleSelectTableForOrder = (table: DiningTable) => {
    setTable(table);
    setCurrentPage('pos');
  };

  const { isMobileScannerModalOpen, setIsMobileScannerModalOpen } = useHardwareStore();

  // If accessing directly from Android Phone via /mobile-scan or /scanner
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (path === '/mobile-scan' || path === '/scanner' || search.includes('mobile-scan') || search.includes('scanner=1')) {
      return (
        <>
          <MobileScannerPage />
          <ToastContainer />
        </>
      );
    }
  }

  // If initial setup is required, display the Onboarding Wizard directly
  if (isSetupRequired) {
    return (
      <>
        <OnboardingPage />
        <ToastContainer />
      </>
    );
  }

  // If no user is logged in, display the Split-Screen Login Page with branding & helpdesk
  if (!currentUser) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-app text-text-primary overflow-hidden font-sans">
      {/* Top Navbar */}
      <TopNavbar
        onOpenOpenShiftModal={() => setIsOpenShiftOpen(true)}
        onOpenCloseShiftModal={() => setIsCloseShiftOpen(true)}
        onOpenCashMovementModal={() => setIsCashMovementOpen(true)}
      />

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar with Dynamic RBAC */}
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

        {/* Dynamic Main Workspace Page with Error Boundary */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ErrorBoundary key={`${mode}-${currentPage}`}>
            {currentPage === 'pos' && <PosPage />}
            {currentPage === 'services' && (mode === 'Electronics' ? <ServiceCenterPage /> : <PosPage />)}
            {currentPage === 'electronics-serials' && (mode === 'Electronics' ? <ElectronicsSerialPage initialTab="warranty" /> : <PosPage />)}
            {currentPage === 'sim-cards' && (mode === 'Electronics' ? <ElectronicsSerialPage initialTab="simcards" /> : <PosPage />)}
            {currentPage === 'trade-in' && (mode === 'Electronics' ? <ElectronicsSerialPage initialTab="tradein" /> : <PosPage />)}
            {currentPage === 'tables' && (mode === 'FoodAndBeverage' ? <TablesPage onSelectTableForOrder={handleSelectTableForOrder} /> : <PosPage />)}
            {currentPage === 'kds' && (mode === 'FoodAndBeverage' ? <KdsPage /> : <PosPage />)}
            {currentPage === 'cfd' && <CfdPage />}
            {currentPage === 'inventory' && <InventoryPage />}
            {currentPage === 'purchasing' && <PurchasingPage />}
            {currentPage === 'stock-opname' && <StockOpnamePage />}
            {currentPage === 'price-tags' && <PriceTagLabelPage />}
            {currentPage === 'promos' && <PromotionsPage />}
            {currentPage === 'expired-tracker' && <ExpiredTrackerPage />}
            {currentPage === 'returns' && <SalesReturnPage />}
            {currentPage === 'shifts' && <ShiftsPage />}
            {currentPage === 'customers' && <CustomersPage />}
            {currentPage === 'reports' && <ReportsPage />}
            {currentPage === 'users' && <UserManagementPage />}
            {currentPage === 'backup' && <BackupPage />}
            {currentPage === 'settings' && <SettingsPage />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Modals */}
      <OpenShiftModal
        isOpen={isOpenShiftOpen}
        onClose={() => setIsOpenShiftOpen(false)}
      />

      <CloseShiftModal
        isOpen={isCloseShiftOpen}
        onClose={() => setIsCloseShiftOpen(false)}
        onShiftClosed={(zReport) => {
          useToastStore.getState().showToast(`Shift berhasil ditutup! Nomor Shift: ${zReport.shiftNumber} - Total: Rp ${zReport.netSales.toLocaleString('id-ID')}`, 'success');
        }}
      />

      <CashMovementModal
        isOpen={isCashMovementOpen}
        onClose={() => setIsCashMovementOpen(false)}
      />

      <HardwareStatusModal />
      <ManualScaleModal />
      <ReceiptPrintFallbackModal />
      <MobileScannerModal
        isOpen={isMobileScannerModalOpen}
        onClose={() => setIsMobileScannerModalOpen(false)}
      />

      <QuickLockModal />
      <ToastContainer />
    </div>
  );
};
export default App;
