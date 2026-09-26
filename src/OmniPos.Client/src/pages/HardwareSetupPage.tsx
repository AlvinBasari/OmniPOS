import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Archive, 
  Barcode, 
  Scale, 
  Monitor, 
  ChefHat, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wifi, 
  Settings, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  Info, 
  Smartphone, 
  Save, 
  Check, 
  Sliders, 
  Volume2, 
  HelpCircle, 
  Laptop, 
  Terminal, 
  Play, 
  RotateCcw, 
  Keyboard, 
  Coffee, 
  Flame, 
  Receipt, 
  FileText, 
  Eye, 
  Download,
  CreditCard,
  QrCode,
  Building2,
  Hash,
  Radio
} from 'lucide-react';
import { useHardwareStore } from '../store/useHardwareStore';
import { useBusinessModeStore } from '../store/useBusinessModeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { PaymentGatewaySettings, BusinessMode } from '../types';
import { printThermalReceipt } from '../utils/printHelper';
import { RealBarcodeSvg } from '../utils/barcodeGenerator';

export const HardwareSetupPage: React.FC = () => {
  const { mode, edition } = useBusinessModeStore();
  const { 
    hardwareStatus, 
    fetchHardwareStatus, 
    isLoading: isHardwareLoading,
    testPrinter, 
    testCashDrawer,
    setIsMobileScannerModalOpen
  } = useHardwareStore();
  const { isCfdEnabled, updateCfdSetting } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'printer' | 'drawer' | 'scanner' | 'scale' | 'cfd' | 'kds' | 'payment' | 'diagnostics'>('printer');

  useEffect(() => {
    if (activeTab === 'kds' && mode !== 'FoodAndBeverage') {
      setActiveTab('printer');
    }
  }, [mode, activeTab]);

  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      if (e.detail && ['printer', 'drawer', 'scanner', 'scale', 'cfd', 'kds', 'payment', 'diagnostics'].includes(e.detail)) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('omnipos-hardware-tab', handleTabSwitch);
    return () => window.removeEventListener('omnipos-hardware-tab', handleTabSwitch);
  }, []);

  // Printer Settings State
  const [printerType, setPrinterType] = useState('VIRTUAL');
  const [printerUsbPort, setPrinterUsbPort] = useState('/dev/usb/lp0');
  const [customUsbPort, setCustomUsbPort] = useState('');
  const [printerSystemName, setPrinterSystemName] = useState('');
  const [printerIp, setPrinterIp] = useState('192.168.1.200');
  const [printerPort, setPrinterPort] = useState('9100');
  const [paperSize, setPaperSize] = useState('80mm');
  const [autoCut, setAutoCut] = useState(true);
  const [autoDrawer, setAutoDrawer] = useState(true);
  const [drawerPin, setDrawerPin] = useState<'PIN_2' | 'PIN_5'>('PIN_2');

  // Enterprise Anti-Cut & Margin Calibration State
  const [printLeftMargin, setPrintLeftMargin] = useState(0);
  const [printMaxChars, setPrintMaxChars] = useState(42);
  const [printFeedLines, setPrintFeedLines] = useState(3);
  const [printCutMode, setPrintCutMode] = useState('FULL');
  const [printFontStyle, setPrintFontStyle] = useState('FONT_A');
  const [printAutoDrawer, setPrintAutoDrawer] = useState('AFTER');

  // Enterprise Receipt Branding & Details State
  const [storeName, setStoreName] = useState('OmniPOS Retail Supermarket');
  const [receiptHeaderSubtitle, setReceiptHeaderSubtitle] = useState('NPWP: 01.234.567.8-901.000 / NIB: 8120001234');
  const [storeAddress, setStoreAddress] = useState('Jl. Sudirman No. 45, Jakarta Pusat');
  const [storePhone, setStorePhone] = useState('0812-9876-5432');
  const [receiptFooter, setReceiptFooter] = useState('Terima kasih atas kunjungan Anda!');
  const [receiptPolicyNote, setReceiptPolicyNote] = useState('Barang yang dibeli tidak dapat ditukar/dikembalikan.');
  const [showTaxDetail, setShowTaxDetail] = useState(true);
  const [showDiscount, setShowDiscount] = useState(true);
  const [showLoyalty, setShowLoyalty] = useState(true);
  const [showWifi, setShowWifi] = useState(false);
  const [receiptWifiName, setReceiptWifiName] = useState('OmniPOS_Store_Guest');
  const [receiptWifiPassword, setReceiptWifiPassword] = useState('belanjamurah');
  const [receiptQrMode, setReceiptQrMode] = useState('INVOICE');
  const [receiptQrContent, setReceiptQrContent] = useState('');

  // Live Interactive Thermal Receipt Preview State
  const getAutoSampleMode = (currentMode?: string): 'retail' | 'fnb' | 'pharmacy' | 'electronics' => {
    switch (currentMode) {
      case 'FoodAndBeverage': return 'fnb';
      case 'Pharmacy': return 'pharmacy';
      case 'Electronics':
      case 'Services': return 'electronics';
      case 'Retail':
      default: return 'retail';
    }
  };

  const getEditionTitle = () => {
    if (edition?.displayName) return edition.displayName;
    switch (mode) {
      case 'FoodAndBeverage': return 'F&B Resto & Kafe';
      case 'Pharmacy': return 'Apotek & Farmasi';
      case 'Electronics': return 'Elektronik & Gadget';
      case 'Services': return 'Jasa & Servis';
      case 'Retail':
      default: return 'Retail & Minimarket';
    }
  };

  const [receiptPreviewText, setReceiptPreviewText] = useState('');
  const [previewSampleMode, setPreviewSampleMode] = useState<'retail' | 'fnb' | 'pharmacy' | 'electronics'>(getAutoSampleMode(mode));
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Scale Settings State (Zero Dummy)
  const [scaleMode, setScaleMode] = useState<'MANUAL' | 'SERIAL'>('MANUAL');
  const [scalePort, setScalePort] = useState('/dev/ttyUSB0');
  const [scaleBaudRate, setScaleBaudRate] = useState('9600');
  const [scaleProtocol, setScaleProtocol] = useState('AUTO');
  const [scaleTestResult, setScaleTestResult] = useState<{
    success: boolean;
    weightKg: number;
    unit: string;
    isStable: boolean;
    protocol: string;
    message: string;
    error?: string;
    isRealHardware: boolean;
    rawResponse?: string;
  } | null>(null);
  const [isTestingScale, setIsTestingScale] = useState(false);

  // CFD & KDS Settings State
  const [cfdWelcomeText, setCfdWelcomeText] = useState('Selamat Datang di Toko Kami! Belanja Hemat & Nyaman');
  const [showQrisOnCfd, setShowQrisOnCfd] = useState(true);

  // Payment Gateway & EDC Settings State
  const [qrisProvider, setQrisProvider] = useState<'SIMULATOR' | 'MIDTRANS' | 'XENDIT' | 'TRIPAY' | 'EMVCO_DYNAMIC'>('SIMULATOR');
  const [qrisNmid, setQrisNmid] = useState('ID1020023456789');
  const [qrisMerchantName, setQrisMerchantName] = useState('OmniPOS Store');
  const [qrisMerchantCity, setQrisMerchantCity] = useState('JAKARTA');
  const [qrisServerKey, setQrisServerKey] = useState('');
  const [qrisClientKey, setQrisClientKey] = useState('');
  const [edcIntegrationMode, setEdcIntegrationMode] = useState<'STANDALONE' | 'ECR_DIRECT_LINK'>('STANDALONE');
  const [edcDefaultBank, setEdcDefaultBank] = useState('BCA');
  const [edcEcrIp, setEdcEcrIp] = useState('192.168.1.150');
  const [edcEcrPort, setEdcEcrPort] = useState(8888);
  const [edcEcrComPort, setEdcEcrComPort] = useState('COM3');
  const [edcSurchargePercent, setEdcSurchargePercent] = useState(0);
  const [isTestingEdc, setIsTestingEdc] = useState(false);
  const [edcTestResult, setEdcTestResult] = useState<{
    success: boolean;
    approvalCode?: string;
    message: string;
    cardNumber?: string;
    bank?: string;
  } | null>(null);

  // Detected System Ports State
  const [detectedPorts, setDetectedPorts] = useState<{
    usbPrinterPorts: string[];
    systemPrinters: string[];
    serialPorts: string[];
    scanners: string[];
    platform: string;
    recommendedPrinterPort: string;
    recommendedScalePort: string;
  }>({
    usbPrinterPorts: [],
    systemPrinters: [],
    serialPorts: [],
    scanners: [],
    platform: '',
    recommendedPrinterPort: '/dev/usb/lp0',
    recommendedScalePort: '/dev/ttyUSB0'
  });
  const [isScanningPorts, setIsScanningPorts] = useState(false);

  // Barcode Scanner Playground State
  const [scanInput, setScanInput] = useState('');
  const [scanHistory, setScanHistory] = useState<Array<{
    code: string;
    timestamp: string;
    durationMs: number;
    isLaserSpeed: boolean;
    hasEnter: boolean;
  }>>([]);
  const scanStartTimeRef = useRef<number | null>(null);
  const playgroundInputRef = useRef<HTMLInputElement>(null);

  // Status & Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isTestingDrawer, setIsTestingDrawer] = useState(false);

  useEffect(() => {
    const autoMode = getAutoSampleMode(mode);
    setPreviewSampleMode(autoMode);
    fetchHardwareStatus();
    loadHardwareSettings();
    scanHardwarePorts();
    fetchReceiptPreview(autoMode);
  }, [mode]);

  const fetchReceiptPreview = async (sampleMode?: string) => {
    const targetMode = sampleMode || getAutoSampleMode(mode);
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/v1/hardware/receipt/preview?mode=${targetMode}`);
      if (res.ok) {
        const data = await res.json();
        setReceiptPreviewText(data.previewText || '');
      }
    } catch (e) {
      console.error('Failed to load receipt preview:', e);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const loadHardwareSettings = async () => {
    try {
      const res = await fetch('/api/v1/settings');
      if (res.ok) {
        const settings = await res.json();
        if (Array.isArray(settings)) {
          for (const s of settings) {
            if (s.settingKey === 'PRINTER_TYPE') setPrinterType(s.settingValue);
            if (s.settingKey === 'PRINTER_USB_PORT') {
              setPrinterUsbPort(s.settingValue);
              setCustomUsbPort(s.settingValue);
            }
            if (s.settingKey === 'PRINTER_SYSTEM_NAME') setPrinterSystemName(s.settingValue);
            if (s.settingKey === 'PRINTER_IP') setPrinterIp(s.settingValue);
            if (s.settingKey === 'PRINTER_PORT') setPrinterPort(s.settingValue);
            if (s.settingKey === 'PAPER_SIZE') setPaperSize(s.settingValue);
            if (s.settingKey === 'AUTO_CUT_PAPER') setAutoCut(s.settingValue !== 'false');
            if (s.settingKey === 'AUTO_OPEN_DRAWER') setAutoDrawer(s.settingValue !== 'false');
            if (s.settingKey === 'DRAWER_PIN') setDrawerPin(s.settingValue === 'PIN_5' ? 'PIN_5' : 'PIN_2');
            
            // Margins & Anti-Cut Calibration
            if (s.settingKey === 'PRINT_LEFT_MARGIN') setPrintLeftMargin(parseInt(s.settingValue) || 0);
            if (s.settingKey === 'PRINT_MAX_CHARS') setPrintMaxChars(parseInt(s.settingValue) || 42);
            if (s.settingKey === 'PRINT_FEED_LINES') setPrintFeedLines(parseInt(s.settingValue) || 3);
            if (s.settingKey === 'PRINT_CUT_MODE') setPrintCutMode(s.settingValue);
            if (s.settingKey === 'PRINT_FONT_STYLE') setPrintFontStyle(s.settingValue);
            if (s.settingKey === 'PRINT_AUTO_DRAWER') setPrintAutoDrawer(s.settingValue);

            // Store Branding & Receipt Details
            if (s.settingKey === 'STORE_NAME') setStoreName(s.settingValue);
            if (s.settingKey === 'RECEIPT_HEADER_SUBTITLE') setReceiptHeaderSubtitle(s.settingValue);
            if (s.settingKey === 'STORE_ADDRESS') setStoreAddress(s.settingValue);
            if (s.settingKey === 'STORE_PHONE') setStorePhone(s.settingValue);
            if (s.settingKey === 'RECEIPT_FOOTER') setReceiptFooter(s.settingValue);
            if (s.settingKey === 'RECEIPT_POLICY_NOTE') setReceiptPolicyNote(s.settingValue);
            if (s.settingKey === 'RECEIPT_SHOW_TAX_DETAIL') setShowTaxDetail(s.settingValue !== 'false');
            if (s.settingKey === 'RECEIPT_SHOW_DISCOUNT') setShowDiscount(s.settingValue !== 'false');
            if (s.settingKey === 'RECEIPT_SHOW_LOYALTY') setShowLoyalty(s.settingValue !== 'false');
            if (s.settingKey === 'RECEIPT_SHOW_WIFI') setShowWifi(s.settingValue === 'true');
            if (s.settingKey === 'RECEIPT_WIFI_NAME') setReceiptWifiName(s.settingValue);
            if (s.settingKey === 'RECEIPT_WIFI_PASSWORD') setReceiptWifiPassword(s.settingValue);
            if (s.settingKey === 'RECEIPT_QR_MODE') setReceiptQrMode(s.settingValue);
            if (s.settingKey === 'RECEIPT_QR_CONTENT') setReceiptQrContent(s.settingValue);

            // Scale
            if (s.settingKey === 'SCALE_MODE') setScaleMode(s.settingValue === 'SERIAL' ? 'SERIAL' : 'MANUAL');
            if (s.settingKey === 'SCALE_PORT') setScalePort(s.settingValue);
            if (s.settingKey === 'SCALE_BAUD_RATE') setScaleBaudRate(s.settingValue);
            if (s.settingKey === 'SCALE_PROTOCOL') setScaleProtocol(s.settingValue);

            // CFD
            if (s.settingKey === 'CFD_WELCOME_TEXT') setCfdWelcomeText(s.settingValue);
          }
        }
      }

      // Also load payment settings
      const payRes = await fetch('/api/v1/payments/settings');
      if (payRes.ok) {
        const p: PaymentGatewaySettings = await payRes.json();
        if (p.qrisProvider) setQrisProvider(p.qrisProvider);
        if (p.qrisNmid) setQrisNmid(p.qrisNmid);
        if (p.qrisMerchantName) setQrisMerchantName(p.qrisMerchantName);
        if (p.qrisMerchantCity) setQrisMerchantCity(p.qrisMerchantCity);
        if (p.qrisServerKey) setQrisServerKey(p.qrisServerKey);
        if (p.qrisClientKey) setQrisClientKey(p.qrisClientKey);
        if (p.edcIntegrationMode) setEdcIntegrationMode(p.edcIntegrationMode);
        if (p.edcDefaultBank) setEdcDefaultBank(p.edcDefaultBank);
        if (p.edcEcrIp) setEdcEcrIp(p.edcEcrIp);
        if (p.edcEcrPort) setEdcEcrPort(p.edcEcrPort);
        if (p.edcEcrComPort) setEdcEcrComPort(p.edcEcrComPort);
        if (p.edcSurchargePercent !== undefined) setEdcSurchargePercent(p.edcSurchargePercent);
      }
    } catch (e) {
      console.error('Failed to load hardware settings:', e);
    }
  };

  const handleTestEdcConnection = async () => {
    setIsTestingEdc(true);
    setEdcTestResult(null);
    try {
      const res = await fetch('/api/v1/payments/edc/ecr-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 10000,
          invoiceNumber: `TEST-EDC-${Date.now()}`,
          bank: edcDefaultBank,
          cardType: 'Debit GPN',
          ecrHost: edcEcrIp,
          ecrPort: edcEcrPort,
          comPort: edcEcrComPort
        })
      });
      if (res.ok) {
        const data = await res.json();
        setEdcTestResult({
          success: data.success,
          approvalCode: data.approvalCode,
          cardNumber: data.cardNumber,
          bank: data.bank,
          message: data.message
        });
        if (data.success) {
          useToastStore.getState().showToast(`Test EDC Berhasil: Bank ${data.bank} Approved (00) - Code: ${data.approvalCode}`, 'success');
        } else {
          useToastStore.getState().showToast(`Test EDC Gagal: ${data.message}`, 'error');
        }
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi bridge mesin EDC.', 'error');
    } finally {
      setIsTestingEdc(false);
    }
  };

  const scanHardwarePorts = async () => {
    setIsScanningPorts(true);
    try {
      const res = await fetch('/api/v1/hardware/ports');
      if (res.ok) {
        const data = await res.json();
        setDetectedPorts(data);
        if (data.recommendedPrinterPort && !printerUsbPort) {
          setPrinterUsbPort(data.recommendedPrinterPort);
        }
        if (data.recommendedScalePort && !scalePort) {
          setScalePort(data.recommendedScalePort);
        }
      }
    } catch (e) {
      console.error('Failed to scan ports:', e);
    } finally {
      setIsScanningPorts(false);
    }
  };

  const handleSaveAllSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const selectedPort = customUsbPort.trim() || printerUsbPort;
      const payload = [
        { settingKey: 'PRINTER_TYPE', settingValue: printerType },
        { settingKey: 'PRINTER_USB_PORT', settingValue: selectedPort },
        { settingKey: 'PRINTER_SYSTEM_NAME', settingValue: printerSystemName },
        { settingKey: 'PRINTER_IP', settingValue: printerIp },
        { settingKey: 'PRINTER_PORT', settingValue: printerPort },
        { settingKey: 'PAPER_SIZE', settingValue: paperSize },
        { settingKey: 'AUTO_CUT_PAPER', settingValue: autoCut ? 'true' : 'false' },
        { settingKey: 'AUTO_OPEN_DRAWER', settingValue: autoDrawer ? 'true' : 'false' },
        { settingKey: 'DRAWER_PIN', settingValue: drawerPin },
        { settingKey: 'PRINT_LEFT_MARGIN', settingValue: printLeftMargin.toString() },
        { settingKey: 'PRINT_MAX_CHARS', settingValue: printMaxChars.toString() },
        { settingKey: 'PRINT_FEED_LINES', settingValue: printFeedLines.toString() },
        { settingKey: 'PRINT_CUT_MODE', settingValue: printCutMode },
        { settingKey: 'PRINT_FONT_STYLE', settingValue: printFontStyle },
        { settingKey: 'PRINT_AUTO_DRAWER', settingValue: printAutoDrawer },
        { settingKey: 'STORE_NAME', settingValue: storeName },
        { settingKey: 'RECEIPT_HEADER_SUBTITLE', settingValue: receiptHeaderSubtitle },
        { settingKey: 'STORE_ADDRESS', settingValue: storeAddress },
        { settingKey: 'STORE_PHONE', settingValue: storePhone },
        { settingKey: 'RECEIPT_FOOTER', settingValue: receiptFooter },
        { settingKey: 'RECEIPT_POLICY_NOTE', settingValue: receiptPolicyNote },
        { settingKey: 'RECEIPT_SHOW_TAX_DETAIL', settingValue: showTaxDetail ? 'true' : 'false' },
        { settingKey: 'RECEIPT_SHOW_DISCOUNT', settingValue: showDiscount ? 'true' : 'false' },
        { settingKey: 'RECEIPT_SHOW_LOYALTY', settingValue: showLoyalty ? 'true' : 'false' },
        { settingKey: 'RECEIPT_SHOW_WIFI', settingValue: showWifi ? 'true' : 'false' },
        { settingKey: 'RECEIPT_WIFI_NAME', settingValue: receiptWifiName },
        { settingKey: 'RECEIPT_WIFI_PASSWORD', settingValue: receiptWifiPassword },
        { settingKey: 'RECEIPT_QR_MODE', settingValue: receiptQrMode },
        { settingKey: 'RECEIPT_QR_CONTENT', settingValue: receiptQrContent },
        { settingKey: 'SCALE_MODE', settingValue: scaleMode },
        { settingKey: 'SCALE_PORT', settingValue: scalePort },
        { settingKey: 'SCALE_BAUD_RATE', settingValue: scaleBaudRate },
        { settingKey: 'SCALE_PROTOCOL', settingValue: scaleProtocol },
        { settingKey: 'CFD_WELCOME_TEXT', settingValue: cfdWelcomeText },
        { settingKey: 'ENABLE_CFD', settingValue: isCfdEnabled ? 'true' : 'false' }
      ];

      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Save Payment Gateway & EDC settings
      try {
        await fetch('/api/v1/payments/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrisProvider,
            qrisNmid,
            qrisMerchantName,
            qrisMerchantCity,
            qrisServerKey,
            qrisClientKey,
            edcIntegrationMode,
            edcDefaultBank,
            edcEcrIp,
            edcEcrPort: Number(edcEcrPort) || 8888,
            edcEcrComPort,
            edcSurchargePercent: Number(edcSurchargePercent) || 0
          })
        });
      } catch {
        // Silently ignore secondary payment save error
      }

      if (res.ok) {
        setSaveSuccess(true);
        useToastStore.getState().showToast('Konfigurasi hardware enterprise & gateway pembayaran berhasil disimpan!', 'success');
        await fetchHardwareStatus();
        await fetchReceiptPreview(getAutoSampleMode(mode));
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        useToastStore.getState().showToast('Gagal menyimpan konfigurasi hardware.', 'error');
      }
    } catch (e) {
      useToastStore.getState().showToast('Kesalahan jaringan saat menyimpan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrinterSlip = async () => {
    if (printerType === 'VIRTUAL') {
      if (receiptPreviewText) {
        printThermalReceipt(receiptPreviewText, {
          title: `Uji Cetak Struk - ${storeName || 'OmniPOS'}`,
          paperSize: paperSize as '58mm' | '80mm',
          storeName: storeName
        });
      } else {
        useToastStore.getState().showToast('Pratinjau struk belum termuat.', 'warning');
      }
      return;
    }
    setIsTestingPrinter(true);
    try {
      await testPrinter();
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const handleTestKickDrawer = async () => {
    setIsTestingDrawer(true);
    try {
      await testCashDrawer();
    } finally {
      setIsTestingDrawer(false);
    }
  };

  const handleTestScale = async () => {
    setIsTestingScale(true);
    setScaleTestResult(null);
    try {
      const res = await fetch('/api/v1/hardware/test/scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          port: scalePort, 
          baudRate: parseInt(scaleBaudRate) || 9600,
          protocol: scaleProtocol 
        })
      });
      if (res.ok) {
        const data = await res.json();
        setScaleTestResult({
          success: data.success,
          weightKg: data.weightKg || 0,
          unit: data.unit || 'kg',
          isStable: data.isStable ?? true,
          protocol: data.protocol || 'AUTO',
          message: data.message || '',
          error: data.error,
          isRealHardware: data.isRealHardware ?? false,
          rawResponse: data.rawResponse
        });
        if (data.success) {
          useToastStore.getState().showToast(`Respon Timbangan: ${data.weightKg} kg (${data.protocol})`, 'success');
        } else {
          useToastStore.getState().showToast(data.message || 'Timbangan fisik tidak terdeteksi.', 'warning');
        }
      } else {
        useToastStore.getState().showToast('Gagal menghubungi port serial timbangan.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Koneksi port serial timbangan gagal.', 'error');
    } finally {
      setIsTestingScale(false);
    }
  };

  // Barcode Scanner Playground handlers
  const handlePlaygroundKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!scanStartTimeRef.current) {
      scanStartTimeRef.current = performance.now();
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const code = scanInput.trim();
      if (!code) return;

      const durationMs = Math.round(performance.now() - (scanStartTimeRef.current || performance.now()));
      const isLaser = durationMs < 120 && code.length >= 3;

      setScanHistory(prev => [
        {
          code,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          durationMs,
          isLaserSpeed: isLaser,
          hasEnter: true
        },
        ...prev.slice(0, 7)
      ]);

      setScanInput('');
      scanStartTimeRef.current = null;
    }
  };

  const clearScanHistory = () => {
    setScanHistory([]);
    setScanInput('');
    scanStartTimeRef.current = null;
  };

  const playBuzzerAudio = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      useToastStore.getState().showToast('Alarm Dapur (Buzzer) Berbunyi!', 'info');
    } catch (e) {
      useToastStore.getState().showToast('Browser audio error.', 'warning');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      
      {/* Top Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              Pusat Perangkat & Hardware Kasir (Hardware Hub)
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary uppercase">
                {mode} Edition
              </span>
            </h2>
            <p className="text-xs text-text-secondary">
              Konfigurasi terpadu printer thermal ESC/POS, laci kasir RJ-11, scanner barcode, timbangan, dan layar ganda
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchHardwareStatus();
              scanHardwarePorts();
            }}
            disabled={isHardwareLoading || isScanningPorts}
            className="px-3 py-2 bg-card hover:bg-card-hover border border-border-subtle text-text-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${(isHardwareLoading || isScanningPorts) ? 'animate-spin' : ''}`} />
            <span>Pindai Ulang Perangkat</span>
          </button>

          <button
            onClick={handleSaveAllSettings}
            disabled={isSaving}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'Simpan Konfigurasi'}</span>
          </button>
        </div>
      </div>

      {/* Quick Status Ribbon */}
      <div className="px-6 py-2.5 bg-subtle/70 border-b border-border-subtle flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-text-muted font-bold text-[11px] uppercase tracking-wider shrink-0 mr-1">
          Status Perangkat:
        </span>
        
        {/* Printer Status */}
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 ${
          hardwareStatus?.printer.isOnline 
            ? 'bg-status-success/10 border-status-success/30 text-status-success' 
            : 'bg-card border-border-subtle text-text-muted'
        }`}>
          <Printer className="w-3.5 h-3.5" />
          <span className="font-semibold">Printer: {hardwareStatus?.printer.status || 'Virtual'}</span>
        </div>

        {/* Drawer Status */}
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 ${
          hardwareStatus?.cashDrawer.isOnline 
            ? 'bg-status-success/10 border-status-success/30 text-status-success' 
            : 'bg-card border-border-subtle text-text-muted'
        }`}>
          <Archive className="w-3.5 h-3.5" />
          <span className="font-semibold">Laci Kasir: {hardwareStatus?.cashDrawer.isOnline ? 'Standby' : 'Kunci Manual'}</span>
        </div>

        {/* Scanner Status */}
        <div className="px-2.5 py-1 rounded-lg border border-border-subtle bg-card text-text-secondary flex items-center gap-1.5 shrink-0">
          <Barcode className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold">Scanner: USB HID Siap</span>
        </div>

        {/* Scale Status */}
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 ${
          hardwareStatus?.digitalScale.isOnline 
            ? 'bg-status-success/10 border-status-success/30 text-status-success' 
            : 'bg-card border-border-subtle text-text-muted'
        }`}>
          <Scale className="w-3.5 h-3.5" />
          <span className="font-semibold">Timbangan: {scaleMode === 'SERIAL' ? 'Serial RS232' : 'Input Manual'}</span>
        </div>

        {/* CFD Status */}
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 ${
          hardwareStatus?.customerDisplay.isOnline 
            ? 'bg-status-success/10 border-status-success/30 text-status-success' 
            : 'bg-card border-border-subtle text-text-muted'
        }`}>
          <Monitor className="w-3.5 h-3.5" />
          <span className="font-semibold">CFD: {hardwareStatus?.customerDisplay.isOnline ? 'Terhubung' : 'Off'}</span>
        </div>

        {/* KDS Status (Only in F&B) */}
        {mode === 'FoodAndBeverage' && (
          <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 ${
            hardwareStatus?.kitchenDisplay.isOnline 
              ? 'bg-status-success/10 border-status-success/30 text-status-success' 
              : 'bg-card border-border-subtle text-text-muted'
          }`}>
            <ChefHat className="w-3.5 h-3.5" />
            <span className="font-semibold">KDS: {hardwareStatus?.kitchenDisplay.isOnline ? 'Terhubung' : 'Off'}</span>
          </div>
        )}

        {/* Payment Gateway & EDC Status Pill */}
        <button 
          type="button"
          onClick={() => setActiveTab('payment')}
          title="Klik untuk membuka pengaturan Gateway QRIS Dinamis & Mesin EDC"
          className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 cursor-pointer transition-all shadow-xs ${
            activeTab === 'payment'
              ? 'bg-primary text-primary-text border-primary font-bold shadow-sm'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-500/20'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Gateway & EDC: {qrisProvider} ({edcIntegrationMode === 'ECR_DIRECT_LINK' ? 'ECR Link' : 'EDC Manual'})</span>
        </button>
      </div>

      {/* Main Container with Sidebar Tabs */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Tabs (Left Sidebar) */}
        <div className="w-64 bg-surface border-r border-border-subtle p-3 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab('printer')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'printer'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
            }`}
          >
            <Printer className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 truncate">
              <p>Printer Struk Thermal</p>
              <span className={`text-[10px] font-normal ${activeTab === 'printer' ? 'text-white/80' : 'text-text-muted'}`}>
                {printerType === 'RAW_USB' ? 'USB Fisik' : printerType === 'NETWORK_LAN' ? 'LAN / IP' : 'Browser / Virtual'}
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('drawer')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'drawer'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
            }`}
          >
            <Archive className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 truncate">
              <p>Laci Kasir (Cash Drawer)</p>
              <span className={`text-[10px] font-normal ${activeTab === 'drawer' ? 'text-white/80' : 'text-text-muted'}`}>
                Port RJ-11 DK ({drawerPin})
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'scanner'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
            }`}
          >
            <Barcode className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 truncate">
              <p>Scanner Barcode & HP</p>
              <span className={`text-[10px] font-normal ${activeTab === 'scanner' ? 'text-white/80' : 'text-text-muted'}`}>
                USB Wedge & WiFi Android
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('scale')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'scale'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
            }`}
          >
            <Scale className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 truncate">
              <p>Timbangan Digital</p>
              <span className={`text-[10px] font-normal ${activeTab === 'scale' ? 'text-white/80' : 'text-text-muted'}`}>
                {scaleMode === 'SERIAL' ? 'RS-232 / USB' : 'Kalkulator Manual'}
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('cfd')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'cfd'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
            }`}
          >
            <Monitor className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 truncate">
              <p>Layar Pelanggan (CFD)</p>
              <span className={`text-[10px] font-normal ${activeTab === 'cfd' ? 'text-white/80' : 'text-text-muted'}`}>
                Monitor Ganda & QRIS
              </span>
            </div>
          </button>

          {mode === 'FoodAndBeverage' && (
            <button
              onClick={() => setActiveTab('kds')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'kds'
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
              }`}
            >
              <ChefHat className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 truncate">
                <p>Layar Dapur (KDS)</p>
                <span className={`text-[10px] font-normal ${activeTab === 'kds' ? 'text-white/80' : 'text-text-muted'}`}>
                  Tiket Dapur & Alarm
                </span>
              </div>
            </button>
          )}

          <button
            onClick={() => setActiveTab('payment')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left relative ${
              activeTab === 'payment'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary border border-emerald-500/20 bg-emerald-500/5'
            }`}
          >
            <CreditCard className={`w-4 h-4 flex-shrink-0 ${activeTab === 'payment' ? 'text-primary-text' : 'text-emerald-500'}`} />
            <div className="flex-1 truncate">
              <div className="flex items-center justify-between">
                <p>Gateway QRIS & Mesin EDC</p>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-black tracking-wider ${
                  activeTab === 'payment' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                  AKTIF
                </span>
              </div>
              <span className={`text-[10px] font-normal ${activeTab === 'payment' ? 'text-white/80' : 'text-text-muted'}`}>
                {qrisProvider} • {edcIntegrationMode === 'ECR_DIRECT_LINK' ? 'ECR Link' : 'EDC Manual'}
              </span>
            </div>
          </button>

          <div className="pt-2 border-t border-border-subtle mt-2">
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'diagnostics'
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
              }`}
            >
              <HelpCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <div className="flex-1 truncate">
                <p>Diagnostik & Solusi</p>
                <span className={`text-[10px] font-normal ${activeTab === 'diagnostics' ? 'text-white/80' : 'text-text-muted'}`}>
                  Troubleshooting Wizard
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 max-w-7xl space-y-6">

          {/* ======================================================== */}
          {/* TAB 1: PRINTER STRUK THERMAL (ENTERPRISE WYSIWYG) */}
          {/* ======================================================== */}
          {activeTab === 'printer' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-border-subtle gap-3">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Printer className="w-5 h-5 text-primary" />
                    Konfigurasi Driver & Format Struk Kasir Enterprise
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Kalibrasi margin anti-terpotong, characters per line (CPL), printer OS CUPS/Spooler, serta pratinjau nota interaktif real-time.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchReceiptPreview(getAutoSampleMode(mode))}
                    disabled={isLoadingPreview}
                    className="px-3 py-2 bg-card hover:bg-card-hover text-text-primary border border-border-subtle rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    title="Segarkan Pratinjau Nota"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-primary ${isLoadingPreview ? 'animate-spin' : ''}`} />
                    <span>Segarkan Pratinjau</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestPrinterSlip}
                    disabled={isTestingPrinter}
                    className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isTestingPrinter ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    <span>{isTestingPrinter ? 'Mencetak Slip...' : 'Cetak Lembar Uji Fisik'}</span>
                  </button>
                </div>
              </div>

              {/* 2-Column Split: Settings Form (Left) & Live Receipt Preview (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: Configuration Form */}
                <div className="lg:col-span-7 space-y-5">
                  
                  {/* Mode Selection Cards */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      1. Mode Komunikasi & Driver Printer:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* RAW_USB Card */}
                      <div 
                        onClick={() => setPrinterType('RAW_USB')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          printerType === 'RAW_USB' || printerType === 'USB_DIRECT'
                            ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-card border-border-subtle hover:bg-card-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Laptop className="w-4 h-4 text-primary" />
                          <input
                            type="radio"
                            name="printerMode"
                            checked={printerType === 'RAW_USB' || printerType === 'USB_DIRECT'}
                            onChange={() => setPrinterType('RAW_USB')}
                            className="text-primary focus:ring-primary"
                          />
                        </div>
                        <h4 className="text-xs font-bold text-text-primary">Kabel USB Langsung (RAW POS)</h4>
                        <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                          ESC/POS langsung ke port USB (/dev/usb/lp0). Cepat tanpa perantara driver OS.
                        </p>
                      </div>

                      {/* SYSTEM_SPOOLER / CUPS Card */}
                      <div 
                        onClick={() => setPrinterType('SYSTEM_SPOOLER')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          printerType === 'SYSTEM_SPOOLER' || printerType === 'CUPS'
                            ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-card border-border-subtle hover:bg-card-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Printer className="w-4 h-4 text-emerald-500" />
                          <input
                            type="radio"
                            name="printerMode"
                            checked={printerType === 'SYSTEM_SPOOLER' || printerType === 'CUPS'}
                            onChange={() => setPrinterType('SYSTEM_SPOOLER')}
                            className="text-primary focus:ring-primary"
                          />
                        </div>
                        <h4 className="text-xs font-bold text-text-primary">Driver OS / CUPS Spooler</h4>
                        <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                          Antrean printer sistem Linux CUPS (lp) atau Windows Spooler. Sangat stabil untuk printer USB terinstal.
                        </p>
                      </div>

                      {/* NETWORK_LAN Card */}
                      <div 
                        onClick={() => setPrinterType('NETWORK_LAN')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          printerType === 'NETWORK_LAN'
                            ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-card border-border-subtle hover:bg-card-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Wifi className="w-4 h-4 text-blue-500" />
                          <input
                            type="radio"
                            name="printerMode"
                            checked={printerType === 'NETWORK_LAN'}
                            onChange={() => setPrinterType('NETWORK_LAN')}
                            className="text-primary focus:ring-primary"
                          />
                        </div>
                        <h4 className="text-xs font-bold text-text-primary">Jaringan LAN / WiFi (TCP 9100)</h4>
                        <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                          Printer kasir jaringan ethernet atau printer dapur melalui IP address lokal.
                        </p>
                      </div>

                      {/* BROWSER / VIRTUAL Card */}
                      <div 
                        onClick={() => setPrinterType('VIRTUAL')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          printerType === 'VIRTUAL' || printerType === 'BROWSER_PRINT'
                            ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-card border-border-subtle hover:bg-card-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Monitor className="w-4 h-4 text-purple-500" />
                          <input
                            type="radio"
                            name="printerMode"
                            checked={printerType === 'VIRTUAL' || printerType === 'BROWSER_PRINT'}
                            onChange={() => setPrinterType('VIRTUAL')}
                            className="text-primary focus:ring-primary"
                          />
                        </div>
                        <h4 className="text-xs font-bold text-text-primary">Browser Print / PDF Virtual</h4>
                        <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                          Dialog standar browser (Ctrl+P) / simulator nota. Sangat ideal untuk demo atau toko tanpa printer kasir fisik.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Connection Details per Mode */}
                  {(printerType === 'RAW_USB' || printerType === 'USB_DIRECT') && (
                    <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-primary" />
                          Port Fisik USB POS
                        </h4>
                        <button
                          type="button"
                          onClick={scanHardwarePorts}
                          disabled={isScanningPorts}
                          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isScanningPorts ? 'animate-spin' : ''}`} />
                          Pindai Ulang Port
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Pilihan Port USB Terdeteksi:
                          </label>
                          <select
                            value={printerUsbPort}
                            onChange={(e) => {
                              setPrinterUsbPort(e.target.value);
                              setCustomUsbPort(e.target.value);
                            }}
                            className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                          >
                            {detectedPorts.usbPrinterPorts.map((port) => (
                              <option key={port} value={port}>
                                {port} {port === detectedPorts.recommendedPrinterPort ? '(Rekomendasi Utama)' : ''}
                              </option>
                            ))}
                            <option value="CUSTOM">-- Ketik Jalur Port Manual --</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Jalur Port Manual:
                          </label>
                          <input
                            type="text"
                            value={customUsbPort}
                            onChange={(e) => setCustomUsbPort(e.target.value)}
                            placeholder="/dev/usb/lp0"
                            className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(printerType === 'SYSTEM_SPOOLER' || printerType === 'CUPS') && (
                    <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
                          <Printer className="w-4 h-4 text-emerald-500" />
                          Nama Antrean Printer OS (CUPS Spooler)
                        </h4>
                        <button
                          type="button"
                          onClick={scanHardwarePorts}
                          disabled={isScanningPorts}
                          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isScanningPorts ? 'animate-spin' : ''}`} />
                          Pindai Printer CUPS
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Pilih Printer Terinstal di Sistem:
                        </label>
                        {detectedPorts.systemPrinters && detectedPorts.systemPrinters.length > 0 ? (
                          <select
                            value={printerSystemName}
                            onChange={(e) => setPrinterSystemName(e.target.value)}
                            className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                          >
                            <option value="">-- Pilih Printer CUPS --</option>
                            {detectedPorts.systemPrinters.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={printerSystemName}
                              onChange={(e) => setPrinterSystemName(e.target.value)}
                              placeholder="Contoh: EPSON_TM_T82 atau POS-58"
                              className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                            />
                            <p className="text-[11px] text-text-muted">
                              Perintah Linux OS: <code className="text-primary font-mono">lpstat -e</code> untuk melihat nama printer CUPS.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {printerType === 'NETWORK_LAN' && (
                    <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-3">
                      <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-blue-500" />
                        Alamat IP Jaringan Printer LAN / Dapur
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            IP Address Printer Kasir:
                          </label>
                          <input
                            type="text"
                            value={printerIp}
                            onChange={(e) => setPrinterIp(e.target.value)}
                            placeholder="192.168.1.200"
                            className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Port Raw TCP (Standar 9100):
                          </label>
                          <input
                            type="text"
                            value={printerPort}
                            onChange={(e) => setPrinterPort(e.target.value)}
                            placeholder="9100"
                            className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Kalibrasi Anti-Cut, Margin & Mekanik Nota (Detail Enterprise) */}
                  <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-primary" />
                        2. Kalibrasi Margin & Karakter Anti-Terpotong (Anti-Cut)
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        Enterprise Quality
                      </span>
                    </div>

                    {/* Paper Size Selector */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        Ukuran Lebar Kertas Struk:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPaperSize('58mm');
                            if (printMaxChars > 34) setPrintMaxChars(32);
                          }}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            paperSize === '58mm'
                              ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm ring-1 ring-primary/30'
                              : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card-hover'
                          }`}
                        >
                          <p className="text-xs">58 mm (Kecil / Mobile)</p>
                          <span className="text-[10px] text-text-muted">Standar 30 - 32 Karakter/baris</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPaperSize('80mm');
                            if (printMaxChars < 36) setPrintMaxChars(42);
                          }}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            paperSize === '80mm'
                              ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm ring-1 ring-primary/30'
                              : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card-hover'
                          }`}
                        >
                          <p className="text-xs">80 mm (Standar POS Kasir)</p>
                          <span className="text-[10px] text-text-muted">Standar 40 - 48 Karakter/baris</span>
                        </button>
                      </div>
                    </div>

                    {/* Left Margin Calibration Slider */}
                    <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-text-primary">
                            Margin Kiri Kertas (Left Margin):
                          </label>
                          <p className="text-[11px] text-text-secondary">
                            Tambahkan spasi di sisi kiri jika teks nota Anda terpotong di tepi fisik printer atau roll kertas miring.
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-primary text-primary-text font-mono font-bold text-xs">
                          +{printLeftMargin} Spasi
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="8"
                          step="1"
                          value={printLeftMargin}
                          onChange={(e) => setPrintLeftMargin(parseInt(e.target.value) || 0)}
                          className="flex-1 accent-primary cursor-pointer"
                        />
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setPrintLeftMargin(val)}
                              className={`px-2 py-0.5 text-[10px] rounded border font-mono ${
                                printLeftMargin === val ? 'bg-primary text-primary-text border-primary font-bold' : 'bg-card border-border-subtle text-text-secondary'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Characters Per Line (CPL) Calibration Slider */}
                    <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-text-primary">
                            Batas Karakter Per Baris (CPL / Characters Per Line):
                          </label>
                          <p className="text-[11px] text-text-secondary">
                            Batas kolom horizontal nota. Teks di atas batas ini akan terpotong pada printer thermal fisik.
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-primary text-primary-text font-mono font-bold text-xs">
                          {printMaxChars} CPL
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="24"
                          max="56"
                          step="1"
                          value={printMaxChars}
                          onChange={(e) => setPrintMaxChars(parseInt(e.target.value) || 42)}
                          className="flex-1 accent-primary cursor-pointer"
                        />
                        <div className="flex flex-wrap gap-1">
                          {(paperSize === '58mm' ? [28, 30, 32, 34] : [38, 40, 42, 48]).map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setPrintMaxChars(val)}
                              className={`px-2 py-0.5 text-[10px] rounded border font-mono ${
                                printMaxChars === val ? 'bg-primary text-primary-text border-primary font-bold' : 'bg-card border-border-subtle text-text-secondary'
                              }`}
                            >
                              {val} CPL
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Feed Lines before Cutter Slider */}
                    <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-text-primary">
                            Line Feeds Sebelum Cut (Baris Kosong Bawah):
                          </label>
                          <p className="text-[11px] text-text-secondary">
                            Memberi jarak gulung kertas sebelum pisau memotong, agar teks catatan kaki/footer tidak terpotong pisau cutter.
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-primary text-primary-text font-mono font-bold text-xs">
                          {printFeedLines} Baris
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="8"
                          step="1"
                          value={printFeedLines}
                          onChange={(e) => setPrintFeedLines(parseInt(e.target.value) || 3)}
                          className="flex-1 accent-primary cursor-pointer"
                        />
                        <div className="flex gap-1">
                          {[2, 3, 4, 5, 6].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setPrintFeedLines(val)}
                              className={`px-2 py-0.5 text-[10px] rounded border font-mono ${
                                printFeedLines === val ? 'bg-primary text-primary-text border-primary font-bold' : 'bg-card border-border-subtle text-text-secondary'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Font & Hardware Mechanics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Gaya Huruf ESC/POS:
                        </label>
                        <select
                          value={printFontStyle}
                          onChange={(e) => setPrintFontStyle(e.target.value)}
                          className="w-full px-2.5 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                        >
                          <option value="FONT_A">Font A (12x24 Standar)</option>
                          <option value="FONT_B">Font B (9x17 Condensed)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Mode Pemotong Kertas:
                        </label>
                        <select
                          value={printCutMode}
                          onChange={(e) => {
                            setPrintCutMode(e.target.value);
                            setAutoCut(e.target.value !== 'NONE');
                          }}
                          className="w-full px-2.5 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                        >
                          <option value="FULL">Potong Penuh (Full Cut)</option>
                          <option value="PARTIAL">Potong Sebagian (Partial Cut)</option>
                          <option value="NONE">Tanpa Potong (Tear Bar Manual)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Buka Laci Kasir (Kick):
                        </label>
                        <select
                          value={printAutoDrawer}
                          onChange={(e) => {
                            setPrintAutoDrawer(e.target.value);
                            setAutoDrawer(e.target.value !== 'DISABLED');
                          }}
                          className="w-full px-2.5 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                        >
                          <option value="AFTER">Buka Setelah Cetak Nota</option>
                          <option value="BEFORE">Buka Sebelum Mulai Cetak</option>
                          <option value="DISABLED">Nonaktifkan Buka Otomatis</option>
                        </select>
                      </div>
                    </div>

                  </div>

                  {/* Enterprise Receipt Branding & Details Form */}
                  <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-primary" />
                        3. Desain Header, Legalitas & Elemen Struk
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Nama Toko / Usaha:
                        </label>
                        <input
                          type="text"
                          value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                          placeholder="OmniPOS Supermarket"
                          className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Subtitle / NPWP / NIB Usaha:
                        </label>
                        <input
                          type="text"
                          value={receiptHeaderSubtitle}
                          onChange={(e) => setReceiptHeaderSubtitle(e.target.value)}
                          placeholder="NPWP: 01.234.567.8-901.000 / NIB: 8120001234"
                          className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Alamat Toko:
                        </label>
                        <input
                          type="text"
                          value={storeAddress}
                          onChange={(e) => setStoreAddress(e.target.value)}
                          placeholder="Jl. Sudirman No. 45, Jakarta Pusat"
                          className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Nomor Telepon Toko:
                        </label>
                        <input
                          type="text"
                          value={storePhone}
                          onChange={(e) => setStorePhone(e.target.value)}
                          placeholder="0812-9876-5432"
                          className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Catatan Kaki (Footer):
                        </label>
                        <input
                          type="text"
                          value={receiptFooter}
                          onChange={(e) => setReceiptFooter(e.target.value)}
                          placeholder="Terima kasih atas kunjungan Anda!"
                          className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Kebijakan Retur / Garansi:
                        </label>
                        <input
                          type="text"
                          value={receiptPolicyNote}
                          onChange={(e) => setReceiptPolicyNote(e.target.value)}
                          placeholder="Barang yang dibeli tidak dapat ditukar/dikembalikan."
                          className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Checkbox Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
                      <label className="flex items-center gap-2 p-2 bg-subtle rounded-lg border border-border-subtle cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={showTaxDetail}
                          onChange={(e) => setShowTaxDetail(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border-subtle"
                        />
                        <span className="text-text-primary font-medium">Tampilkan Rincian Pajak (PPN 11%)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-subtle rounded-lg border border-border-subtle cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={showDiscount}
                          onChange={(e) => setShowDiscount(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border-subtle"
                        />
                        <span className="text-text-primary font-medium">Tampilkan Baris Diskon Promo / Member</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-subtle rounded-lg border border-border-subtle cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={showLoyalty}
                          onChange={(e) => setShowLoyalty(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border-subtle"
                        />
                        <span className="text-text-primary font-medium">Tampilkan Poin Loyalitas Member</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-subtle rounded-lg border border-border-subtle cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={showWifi}
                          onChange={(e) => setShowWifi(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border-subtle"
                        />
                        <span className="text-text-primary font-medium">Tampilkan Akses Free Wi-Fi Pelanggan</span>
                      </label>
                    </div>

                    {/* Wi-Fi Details if Enabled */}
                    {showWifi && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-subtle rounded-lg border border-border-subtle animate-in fade-in">
                        <div>
                          <label className="block text-[11px] font-medium text-text-secondary mb-1">
                            Nama SSID Wi-Fi:
                          </label>
                          <input
                            type="text"
                            value={receiptWifiName}
                            onChange={(e) => setReceiptWifiName(e.target.value)}
                            placeholder="OmniPOS_Store_Guest"
                            className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-text-secondary mb-1">
                            Kata Sandi Wi-Fi:
                          </label>
                          <input
                            type="text"
                            value={receiptWifiPassword}
                            onChange={(e) => setReceiptWifiPassword(e.target.value)}
                            placeholder="belanjamurah"
                            className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    )}

                    {/* QR Code Options */}
                    <div className="pt-2 border-t border-border-subtle">
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Cetak Barcode / QR Code 2D ESC/POS di Bawah Nota:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'NONE', label: 'Tidak Ada QR' },
                          { id: 'INVOICE', label: 'Nomor Faktur' },
                          { id: 'CUSTOM', label: 'Teks / URL Khusus' }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setReceiptQrMode(opt.id)}
                            className={`p-2 rounded-lg border text-xs text-center transition-all ${
                              receiptQrMode === opt.id
                                ? 'bg-primary/10 border-primary text-primary font-bold'
                                : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card-hover'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {receiptQrMode === 'CUSTOM' && (
                        <input
                          type="text"
                          value={receiptQrContent}
                          onChange={(e) => setReceiptQrContent(e.target.value)}
                          placeholder="https://tokoanda.com/review"
                          className="mt-2 w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary animate-in fade-in"
                        />
                      )}
                    </div>

                  </div>

                </div>

                {/* RIGHT COLUMN: Live Interactive Thermal Receipt Preview (WYSIWYG) */}
                <div className="lg:col-span-5 space-y-4 sticky top-4">
                  <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-lg space-y-3">
                    
                    {/* Preview Controls Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                          Pratinjau Nota Thermal (WYSIWYG)
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-subtle text-text-muted border border-border-subtle">
                        {paperSize} • {printMaxChars} CPL
                      </span>
                    </div>

                    {/* Active Store Type Indicator (Automatic, no confusing switch buttons) */}
                    <div className="flex items-center justify-between p-2.5 bg-subtle rounded-xl border border-border-subtle">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-bold text-text-primary">
                          Format Nota: <span className="text-primary">{getEditionTitle()}</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Otomatis Toko Aktif
                      </span>
                    </div>

                    {/* Paper Size Indicator Banner */}
                    <div className="flex items-center justify-between text-[11px] text-text-secondary px-1">
                      <span>Ukuran: <strong className="text-text-primary font-mono">{paperSize}</strong> ({paperSize === '80mm' ? 'Standar Kasir 80mm' : 'Kecil / Mobile 58mm'})</span>
                      <span>Batas Teks: <strong className="text-text-primary font-mono">{printMaxChars} CPL</strong></span>
                    </div>

                    {/* Realistic Thermal Receipt Paper Roll Simulation */}
                    <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-xl border border-border-subtle flex justify-center overflow-x-auto min-h-[420px] max-h-[580px] overflow-y-auto">
                      <div 
                        id="hardware-receipt-preview-slip"
                        className={`bg-white text-zinc-900 shadow-2xl border border-zinc-300 rounded-xs transition-all duration-200 select-text flex flex-col ${
                          paperSize === '58mm' ? 'w-[250px]' : 'w-[330px]'
                        }`}
                      >
                        {/* Top Paper Tear Cut Simulation */}
                        <div className="h-3 w-full bg-[radial-gradient(circle_at_bottom,_transparent_4px,_#ffffff_4px)] bg-[length:10px_10px] bg-repeat-x border-b border-dashed border-zinc-300 shrink-0" />

                        {/* Paper Body */}
                        <div className="p-4 flex-1">
                          {isLoadingPreview ? (
                            <div className="flex flex-col items-center justify-center h-48 space-y-2 text-zinc-400">
                              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                              <span className="text-xs font-sans">Menyiapkan Nota Thermal...</span>
                            </div>
                          ) : receiptPreviewText ? (
                            <pre className="font-mono text-[11px] leading-tight text-zinc-900 whitespace-pre font-normal tracking-tight">
                              {receiptPreviewText}
                            </pre>
                          ) : (
                            <div className="text-center text-zinc-400 py-12">
                              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-xs font-sans">Klik "Segarkan Pratinjau" untuk memuat nota.</p>
                            </div>
                          )}

                          {/* Visual QR Code Display if Custom / Invoice QR enabled */}
                          {receiptQrMode !== 'NONE' && (
                            <div className="mt-3 pt-2 border-t border-dashed border-zinc-400 flex flex-col items-center text-center">
                              <div className="p-1 bg-white border border-zinc-300 rounded shadow-xs mb-1">
                                <RealBarcodeSvg
                                  code={receiptQrMode === 'CUSTOM' ? (receiptQrContent || 'OMNIPOS-QR') : 'INV-20260913-SAMPEL'}
                                  width={paperSize === '58mm' ? 95 : 125}
                                  height={28}
                                />
                              </div>
                              <span className="font-mono text-[9px] text-zinc-500">
                                {receiptQrMode === 'CUSTOM' ? 'QR / Barcode Promosi Toko' : 'Barcode Verifikasi Faktur'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Paper Tear Cut Simulation */}
                        <div className="h-3 w-full bg-[radial-gradient(circle_at_top,_transparent_4px,_#ffffff_4px)] bg-[length:10px_10px] bg-repeat-x border-t border-dashed border-zinc-300 shrink-0" />
                      </div>
                    </div>

                    {/* Precision Print Notice */}
                    <div className="p-2.5 bg-status-success/10 border border-status-success/30 rounded-xl text-xs text-status-success flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="font-medium">Format Nota Presisi: Karakter dan margin struk kasir thermal siap cetak.</span>
                    </div>

                    {/* Action Buttons Below Preview */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTestPrinterSlip}
                        disabled={isTestingPrinter}
                        className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isTestingPrinter ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Printer className="w-3.5 h-3.5" />
                        )}
                        <span>{printerType === 'VIRTUAL' ? 'Cetak Uji (Virtual)' : 'Cetak Fisik'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (receiptPreviewText) {
                            printThermalReceipt(receiptPreviewText, {
                              title: `Uji Cetak Struk - ${storeName || 'OmniPOS'}`,
                              paperSize: paperSize as '58mm' | '80mm',
                              storeName: storeName
                            });
                          } else {
                            useToastStore.getState().showToast('Pratinjau struk belum termuat.', 'warning');
                          }
                        }}
                        className="w-full py-2.5 bg-card hover:bg-card-hover border border-border-subtle text-text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-primary" />
                        <span>Cetak Browser / PDF</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CASH DRAWER (LACI KASIR RJ-11) */}
          {/* ======================================================== */}
          {activeTab === 'drawer' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Archive className="w-5 h-5 text-amber-500" />
                    Pengaturan Laci Kasir (Cash Drawer)
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Laci kasir dihubungkan ke port RJ-11 (DK Port) di belakang printer thermal menggunakan sinyal solenoid 24V.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestKickDrawer}
                  disabled={isTestingDrawer}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                  {isTestingDrawer ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                  <span>{isTestingDrawer ? 'Mengirim Sinyal...' : 'Uji Buka Laci Kasir (Kick Test)'}</span>
                </button>
              </div>

              {/* Kick Pin Selection */}
              <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Pin Sinyal RJ-11 Solenoid:
                </h4>
                <p className="text-xs text-text-secondary">
                  Sebagian besar printer thermal (Epson, Xprinter, Kasir) memakai Pin 2. Jika laci tidak terbuka, ubah ke Pin 5.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div 
                    onClick={() => setDrawerPin('PIN_2')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      drawerPin === 'PIN_2'
                        ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                        : 'bg-subtle border-border-subtle hover:bg-card-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-text-primary">RJ-11 Pin 2 (Standar Epson/Xprinter)</span>
                      <input
                        type="radio"
                        name="drawerPin"
                        checked={drawerPin === 'PIN_2'}
                        onChange={() => setDrawerPin('PIN_2')}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[11px] text-text-secondary font-mono">
                      ESC p 0 25 250 (Pin 2 Solenoid Ground)
                    </p>
                  </div>

                  <div 
                    onClick={() => setDrawerPin('PIN_5')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      drawerPin === 'PIN_5'
                        ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                        : 'bg-subtle border-border-subtle hover:bg-card-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-text-primary">RJ-11 Pin 5 (Star / Citizen / Posiflex)</span>
                      <input
                        type="radio"
                        name="drawerPin"
                        checked={drawerPin === 'PIN_5'}
                        onChange={() => setDrawerPin('PIN_5')}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[11px] text-text-secondary font-mono">
                      ESC p 1 25 250 (Pin 5 Solenoid Ground)
                    </p>
                  </div>
                </div>
              </div>

              {/* Automatic Kick Triggers */}
              <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Pemicu Otomatis Buka Laci:
                </h4>
                
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-subtle border border-border-subtle flex items-center justify-between">
                    <div>
                      <p className="font-bold text-text-primary">Pembayaran Tunai (Cash)</p>
                      <p className="text-[11px] text-text-secondary">Otomatis terbuka saat kasir menekan tombol Bayar Tunai.</p>
                    </div>
                    <span className="text-[11px] font-bold text-status-success bg-status-success/10 px-2 py-0.5 rounded border border-status-success/30">
                      Aktif Otomatis
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-subtle border border-border-subtle flex items-center justify-between">
                    <div>
                      <p className="font-bold text-text-primary">Pengembalian Uang Retur Belanja (Refund)</p>
                      <p className="text-[11px] text-text-secondary">Otomatis terbuka saat kasir mengembalikan uang tunai retur barang.</p>
                    </div>
                    <span className="text-[11px] font-bold text-status-success bg-status-success/10 px-2 py-0.5 rounded border border-status-success/30">
                      Aktif Otomatis
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-subtle border border-border-subtle flex items-center justify-between">
                    <div>
                      <p className="font-bold text-text-primary">Buka Kasir / Tutup Kasir (Z-Report Shift)</p>
                      <p className="text-[11px] text-text-secondary">Otomatis terbuka saat hitung modal awal dan rekap setoran kas.</p>
                    </div>
                    <span className="text-[11px] font-bold text-status-success bg-status-success/10 px-2 py-0.5 rounded border border-status-success/30">
                      Aktif Otomatis
                    </span>
                  </div>
                </div>
              </div>

              {/* Safety Manual Key Tip */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-text-primary">Kunci Manual Darurat Kasir</h5>
                  <p className="text-text-secondary mt-0.5 leading-relaxed">
                    Setiap laci kasir dilengkapi dengan anak kunci manual di bawah laci. Jika listrik padam atau kabel printer terputus, kasir dapat memutar kunci secara fisik ke kanan untuk membuka laci kasir secara manual.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: BARCODE SCANNER PLAYGROUND */}
          {/* ======================================================== */}
          {activeTab === 'scanner' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-primary" />
                    Integrasi Scanner Barcode USB & Nirkabel HP
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Uji pemindaian langsung (Playground) untuk memastikan kecepatan pembacaan dan tombol Enter terdeteksi.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileScannerModalOpen(true)}
                  className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pasangkan HP Android (QR Code)</span>
                </button>
              </div>

              {/* Interactive Live Scan Playground Box */}
              <div className="p-5 rounded-2xl bg-card border-2 border-primary/30 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-pulse" />
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Area Uji Pemindaian Langsung (Live Scanner Playground)
                    </h4>
                  </div>
                  {scanHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={clearScanHistory}
                      className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Bersihkan Riwayat
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    ref={playgroundInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handlePlaygroundKeyDown}
                    placeholder="Tembakkan scanner barcode fisik ke sini (atau ketik lalu tekan Enter)..."
                    className="w-full px-4 py-3 bg-subtle border-2 border-border-subtle focus:border-primary rounded-xl text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted bg-card px-2 py-0.5 rounded border border-border-subtle">
                    Menunggu Barcode...
                  </div>
                </div>

                {/* Scan Speed and Diagnostics Results */}
                {scanHistory.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Hasil Uji Pemindaian Terakhir:
                    </p>
                    <div className="space-y-2">
                      {scanHistory.map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-3 rounded-xl bg-subtle border border-border-subtle flex items-center justify-between text-xs font-mono animate-in fade-in"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`px-2 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] gap-1 shrink-0 ${
                              item.isLaserSpeed 
                                ? 'bg-status-success/15 text-status-success' 
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                            }`}>
                              {item.isLaserSpeed ? (
                                <>
                                  <Zap className="w-3.5 h-3.5" />
                                  <span>LASER</span>
                                </>
                              ) : (
                                <>
                                  <Keyboard className="w-3.5 h-3.5" />
                                  <span>MANUAL</span>
                                </>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-text-primary">{item.code}</p>
                              <p className="text-[10px] text-text-muted">
                                Waktu scan: {item.timestamp} • Durasi input: {item.durationMs} ms
                              </p>
                            </div>
                          </div>

                          <div className="text-right font-sans">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-status-success/15 text-status-success border border-status-success/30">
                              <Check className="w-3 h-3" />
                              <span>Enter Terminated</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-subtle/60 border border-dashed border-border-subtle text-center text-xs text-text-muted">
                    <Barcode className="w-8 h-8 mx-auto text-text-muted/60 mb-1" />
                    <span>Arahkan laser scanner USB ke barcode kemasan barang untuk menguji respon realtime.</span>
                  </div>
                )}
              </div>

              {/* Connected Physical Hardware Info */}
              <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-3 text-xs">
                <h4 className="font-bold text-text-primary uppercase tracking-wider">
                  Deteksi Port Input Linux OS:
                </h4>
                {detectedPorts.scanners.length > 0 ? (
                  <div className="space-y-1.5">
                    {detectedPorts.scanners.map((sc, i) => (
                      <div key={i} className="p-2 rounded bg-subtle font-mono text-status-success flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{sc}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-secondary leading-relaxed">
                    Scanner USB bekerja sebagai perangkat input keyboard standar (HID Keyboard Wedge). Tidak diperlukan driver khusus. Pastikan scanner diatur ke format output <strong>US English</strong> dengan akhiran <strong>Carriage Return (CR / Enter)</strong>.
                  </p>
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: DIGITAL WEIGHING SCALE (ZERO DUMMY ENTERPRISE) */}
          {/* ======================================================== */}
          {activeTab === 'scale' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-border-subtle gap-3">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Scale className="w-5 h-5 text-primary" />
                    Konfigurasi Timbangan Digital Kasir (Zero Dummy)
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Integrasi komunikasi port serial fisik RS-232 / USB ke timbangan ritel komersial (CAS, Kenko, Toledo, Sayaki, GPrinter).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestScale}
                  disabled={isTestingScale}
                  className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                  {isTestingScale ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Scale className="w-4 h-4" />
                  )}
                  <span>{isTestingScale ? 'Membaca Sensor Hardware...' : 'Uji Baca Timbangan (Test Read)'}</span>
                </button>
              </div>

              {/* Scale Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  onClick={() => setScaleMode('MANUAL')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    scaleMode === 'MANUAL'
                      ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Scale className="w-5 h-5 text-primary" />
                    <input
                      type="radio"
                      name="scaleMode"
                      checked={scaleMode === 'MANUAL'}
                      onChange={() => setScaleMode('MANUAL')}
                      className="text-primary focus:ring-primary"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary">Kalkulator Timbang Manual (Popup)</h4>
                  <p className="text-[11px] text-text-secondary mt-1">
                    Kasir memasukkan berat produk kg/gram saat item ditimbang. Sangat fleksibel untuk kasir tanpa kabel serial RS-232.
                  </p>
                </div>

                <div 
                  onClick={() => setScaleMode('SERIAL')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    scaleMode === 'SERIAL'
                      ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    <input
                      type="radio"
                      name="scaleMode"
                      checked={scaleMode === 'SERIAL'}
                      onChange={() => setScaleMode('SERIAL')}
                      className="text-primary focus:ring-primary"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary">Timbangan Serial Fisik (RS-232 / USB)</h4>
                  <p className="text-[11px] text-text-secondary mt-1">
                    Membaca bobot secara otomatis dari timbangan komersial POS (CAS, Mettler Toledo, Fairbanks NCI, Continuous ASCII).
                  </p>
                </div>
              </div>

              {/* Serial Port & Protocol Settings */}
              {scaleMode === 'SERIAL' && (
                <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-primary" />
                      Parameter Port Serial & Protokol Hardware:
                    </h4>
                    <button
                      type="button"
                      onClick={scanHardwarePorts}
                      disabled={isScanningPorts}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanningPorts ? 'animate-spin' : ''}`} />
                      Pindai Port Serial
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Port COM / Serial (/dev/tty*):
                      </label>
                      <select
                        value={scalePort}
                        onChange={(e) => setScalePort(e.target.value)}
                        className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                      >
                        {detectedPorts.serialPorts.map((port) => (
                          <option key={port} value={port}>{port}</option>
                        ))}
                        <option value="/dev/ttyUSB0">/dev/ttyUSB0 (Standar USB-Serial Linux)</option>
                        <option value="/dev/ttyUSB1">/dev/ttyUSB1</option>
                        <option value="/dev/ttyACM0">/dev/ttyACM0</option>
                        <option value="/dev/ttyS0">/dev/ttyS0 (COM1)</option>
                        <option value="COM1">COM1 (Windows)</option>
                        <option value="COM2">COM2 (Windows)</option>
                        <option value="COM3">COM3 (Windows)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Baud Rate (Kecepatan Serial):
                      </label>
                      <select
                        value={scaleBaudRate}
                        onChange={(e) => setScaleBaudRate(e.target.value)}
                        className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                      >
                        <option value="9600">9600 bps (Standar CAS/Kenko/Sayaki)</option>
                        <option value="4800">4800 bps</option>
                        <option value="2400">2400 bps</option>
                        <option value="19200">19200 bps</option>
                        <option value="115200">115200 bps</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Format Protokol Timbangan:
                      </label>
                      <select
                        value={scaleProtocol}
                        onChange={(e) => setScaleProtocol(e.target.value)}
                        className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                      >
                        <option value="AUTO">Auto-Detect Multi-Protocol</option>
                        <option value="CAS">CAS Standard (ST,GS,...)</option>
                        <option value="TOLEDO">Mettler Toledo Protocol</option>
                        <option value="NCI">NCI Standard / Fairbanks</option>
                        <option value="CONTINUOUS">Continuous Decimal Stream</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Digital LED Scale Display Preview */}
              <div className={`p-6 rounded-2xl border-2 shadow-xl flex flex-col items-center justify-center space-y-3 transition-all ${
                scaleTestResult?.success
                  ? 'bg-zinc-950 text-emerald-400 border-emerald-500/40'
                  : scaleTestResult && !scaleTestResult.success
                  ? 'bg-zinc-950 text-amber-400 border-amber-500/40'
                  : 'bg-zinc-950 text-emerald-400 border-zinc-800'
              }`}>
                <div className="flex items-center justify-between w-full px-4 text-[10px] tracking-widest uppercase font-sans">
                  <span className="text-zinc-500 font-bold">Layar Indikator Bobot Timbangan Digital POS</span>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                    scaleTestResult?.success
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : scaleTestResult && !scaleTestResult.success
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {scaleTestResult?.success ? 'HARDWARE ONLINE (REAL)' : scaleTestResult ? 'HARDWARE OFFLINE' : 'STANDBY'}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 py-2">
                  <span className="text-6xl font-black tracking-tight font-mono">
                    {scaleTestResult && scaleTestResult.success ? scaleTestResult.weightKg.toFixed(3) : '0.000'}
                  </span>
                  <span className="text-2xl font-bold text-zinc-400 font-mono">
                    {scaleTestResult?.unit?.toUpperCase() || 'KG'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-1">
                  {scaleTestResult?.success ? (
                    <>
                      <span className="flex items-center gap-1.5 text-emerald-400 font-sans font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        STABIL (ZERO OK)
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-400 font-sans">
                        Protokol: <strong>{scaleTestResult.protocol}</strong>
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5 text-zinc-500 font-sans">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                      Menunggu respon sinyal fisik dari port {scalePort}
                    </span>
                  )}
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400 font-sans">
                    Port: {scalePort} @ {scaleBaudRate} bps (8N1)
                  </span>
                </div>

                {/* Raw Hardware Response Line */}
                {scaleTestResult?.rawResponse && (
                  <div className="w-full max-w-md p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-left font-mono text-[11px] text-zinc-300">
                    <span className="text-zinc-500 block text-[9px] uppercase font-sans">Raw Response Packet:</span>
                    <code className="text-emerald-400 select-all">{scaleTestResult.rawResponse}</code>
                  </div>
                )}
              </div>

              {/* Honest Diagnostics & Troubleshooting Panel (Zero Dummy) */}
              {scaleTestResult && !scaleTestResult.success && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Diagnosa Port Fisik Timbangan: Tidak Terdeteksi Sinyal
                      </h4>
                      <p className="text-xs leading-relaxed text-text-secondary">
                        {scaleTestResult.error || scaleTestResult.message || 'Port serial fisik belum merespon stream data timbangan.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-card rounded-xl border border-border-subtle space-y-2 text-xs">
                    <p className="font-bold text-text-primary">Langkah Troubleshooting Perangkat Fisik:</p>
                    <ol className="list-decimal list-inside space-y-1 text-text-secondary leading-relaxed text-[11px]">
                      <li>
                        <strong>Koneksi Kabel Data:</strong> Pastikan kabel USB-to-RS232 (chip CH340, FTDI, atau Prolific) terhubung kencang ke port USB komputer kasir.
                      </li>
                      <li>
                        <strong>Hak Akses Linux OS (Grup dialout):</strong> Di Linux, jalankan perintah terminal:
                        <code className="mx-1 px-1.5 py-0.5 bg-subtle rounded text-primary font-mono font-bold">sudo usermod -a -G dialout $USER</code>
                        lalu logout & login kembali agar OS mengizinkan pembacaan port <code className="font-mono">/dev/ttyUSB*</code>.
                      </li>
                      <li>
                        <strong>Pengaturan Timbangan:</strong> Pastikan timbangan Anda disetel ke mode <em>Continuous Send</em> atau <em>Host Command Mode</em> di buku manualnya.
                      </li>
                      <li>
                        <strong>Gunakan Alternatif Manual:</strong> Anda dapat mengaktifkan <strong>Kalkulator Timbang Manual (Popup)</strong> di atas sehingga kasir tetap dapat menimbang barang kiloan dengan mengetik berat langsung saat transaksi.
                      </li>
                    </ol>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: CUSTOMER FACING DISPLAY (CFD) */}
          {/* ======================================================== */}
          {activeTab === 'cfd' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    Layar Pelanggan (Customer Facing Display - CFD)
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Tampilkan rincian belanjaan dan barcode QRIS dinamis di monitor kedua yang menghadap ke pembeli.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.open('/cfd', 'OmniPosCFD', 'width=1024,height=768')}
                  className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka Layar Pelanggan (Monitor 2)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">Status Fitur Layar Pelanggan:</h4>
                    <p className="text-[11px] text-text-secondary">Aktifkan sinkronisasi otomatis keranjang kasir ke layar pembeli.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCfdEnabled}
                      onChange={(e) => updateCfdSetting(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-subtle after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Pesan Teks Selamat Datang (Running Marquee):
                  </label>
                  <input
                    type="text"
                    value={cfdWelcomeText}
                    onChange={(e) => setCfdWelcomeText(e.target.value)}
                    placeholder="Selamat Datang di Toko Kami! Belanja Hemat & Nyaman"
                    className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                  <p className="text-[11px] text-text-muted mt-1">
                    Ditampilkan saat kasir sedang tidak ada transaksi aktif (Idle Standby)
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Cara Mengatur Monitor Kedua (Dual Screen):
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-blue-800 dark:text-blue-300">
                  <li>Hubungkan monitor kedua ke port HDMI/VGA komputer kasir.</li>
                  <li>Di Windows/Linux, atur mode tampilan menjadi <strong>"Extend Desktop" (Perluas Tampilan)</strong>.</li>
                  <li>Klik tombol <em>"Buka Layar Pelanggan"</em> di atas, lalu geser jendela browser tersebut ke layar kedua dan tekan <strong>F11</strong> untuk Fullscreen.</li>
                </ol>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: KITCHEN DISPLAY SYSTEM (KDS) */}
          {/* ======================================================== */}
          {activeTab === 'kds' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-primary" />
                    Layar Dapur Resto (Kitchen Display System - KDS)
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Monitor pesanan dapur untuk koki memasak tanpa kertas, lengkap dengan timer masak dan alarm bel.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={playBuzzerAudio}
                    className="px-3 py-2 bg-card hover:bg-card-hover border border-border-subtle text-text-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Volume2 className="w-4 h-4 text-amber-500" />
                    <span>Uji Bel Buzzer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open('/kds', 'OmniPosKDS')}
                    className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Monitor Dapur (KDS)</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-4">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Pengaturan Stasiun Kerja Dapur:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-subtle border border-border-subtle text-center space-y-1">
                    <ChefHat className="w-5 h-5 mx-auto text-rose-500 mb-0.5" />
                    <p className="text-xs font-bold text-text-primary">Dapur Utama (Kitchen)</p>
                    <span className="text-[10px] text-text-muted">Makanan berat, goreng, rebus</span>
                  </div>
                  <div className="p-3 rounded-xl bg-subtle border border-border-subtle text-center space-y-1">
                    <Coffee className="w-5 h-5 mx-auto text-amber-500 mb-0.5" />
                    <p className="text-xs font-bold text-text-primary">Bar & Minuman (Bar)</p>
                    <span className="text-[10px] text-text-muted">Kopi, teh, jus, dessert</span>
                  </div>
                  <div className="p-3 rounded-xl bg-subtle border border-border-subtle text-center space-y-1">
                    <Flame className="w-5 h-5 mx-auto text-orange-500 mb-0.5" />
                    <p className="text-xs font-bold text-text-primary">Grill / Panggangan</p>
                    <span className="text-[10px] text-text-muted">Steak, sate, bakaran</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: DIAGNOSTICS & TROUBLESHOOTING WIZARD */}
          {/* ======================================================== */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                    Diagnostik Lengkap & Solusi Masalah Hardware
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Panduan pemecahan masalah cepat jika perangkat kasir tidak merespon atau gagal mencetak.
                  </p>
                </div>
              </div>

              {/* Hardware Health Scorecard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">Printer Thermal</span>
                    {hardwareStatus?.printer.isOnline ? (
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    {hardwareStatus?.printer.details || 'Virtual Mode Aktif'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">Laci Kasir Solenoid</span>
                    {hardwareStatus?.cashDrawer.isOnline ? (
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    {hardwareStatus?.cashDrawer.details || 'Gunakan anak kunci manual kasir'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">Scanner Barcode</span>
                    <CheckCircle2 className="w-4 h-4 text-status-success" />
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    HID Wedge Keyboard Mode Standby
                  </p>
                </div>
              </div>

              {/* Troubleshooting Q&A Accordion */}
              <div className="p-5 rounded-xl bg-card border border-border-subtle space-y-4 text-xs">
                <h4 className="font-bold text-text-primary uppercase tracking-wider">
                  Tanya Jawab & Solusi Masalah Teknis (Troubleshooting Guide):
                </h4>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg bg-subtle border border-border-subtle space-y-1">
                    <p className="font-bold text-text-primary text-xs">
                      1. Kertas struk keluar kosong (putih tanpa tinta)?
                    </p>
                    <p className="text-text-secondary leading-relaxed text-[11px]">
                      Printer thermal tidak memakai tinta. Jika kertas keluar putih polos, gulungan kertas thermal Anda terbalik. Balik posisi gulungan kertas dan coba cetak ulang.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-subtle border border-border-subtle space-y-1">
                    <p className="font-bold text-text-primary text-xs">
                      2. Sinyal buka laci kasir tidak merespon?
                    </p>
                    <p className="text-text-secondary leading-relaxed text-[11px]">
                      Pastikan kabel RJ-11 laci kasir dicolokkan ke port bertuliskan <strong>DK / Cash Drawer</strong> di belakang printer thermal. Kemudian di tab Laci Kasir, coba ganti pengaturan <strong>Pin 2 ke Pin 5</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-subtle border border-border-subtle space-y-1">
                    <p className="font-bold text-text-primary text-xs">
                      3. Izin Akses Port USB Linux (Permission Denied)?
                    </p>
                    <p className="text-text-secondary leading-relaxed text-[11px]">
                      Jika sistem Linux memblokir akses ke <code className="text-primary font-mono">/dev/usb/lp0</code>, jalankan perintah terminal:
                      <code className="block bg-zinc-900 text-emerald-400 p-2 rounded mt-1 font-mono text-[10px]">
                        sudo chmod 666 /dev/usb/lp* && sudo usermod -a -G lp $USER
                      </code>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-subtle border border-border-subtle space-y-1">
                    <p className="font-bold text-text-primary text-xs">
                      4. Scanner barcode tidak otomatis berpindah baris (Enter)?
                    </p>
                    <p className="text-text-secondary leading-relaxed text-[11px]">
                      Ambil buku manual scanner barcode Anda dan scan barcode pengaturan bernama <strong>"Enable CR / LF Suffix" (Add Enter)</strong>.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 8: GATEWAY QRIS & MESIN EDC INTERKONEKSI */}
          {/* ======================================================== */}
          {activeTab === 'payment' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Konfigurasi Payment Gateway QRIS & Mesin EDC
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Pengaturan interkoneksi QRIS Dinamis nasional (Midtrans, Xendit, Tripay, Simulator) dan Terminal Kartu EDC (Standalone / ECR Direct Link).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveAllSettings}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                </button>
              </div>

              {/* Section 1: QRIS Dinamis & Payment Gateway */}
              <div className="p-5 rounded-2xl bg-card border border-border-subtle space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" /> 1. Pengaturan QRIS Dinamis & Gateway Provider
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    Standar Bank Indonesia (EMVCo MPM)
                  </span>
                </div>

                {/* Provider Selector Cards */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-2">
                    Pilih Gateway / Provider QRIS:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    {[
                      {
                        id: 'SIMULATOR',
                        name: 'Simulator / Offline',
                        desc: 'Uji coba lokal instan tanpa internet atau API Key',
                        badge: 'Bawaan Sistem'
                      },
                      {
                        id: 'MIDTRANS',
                        name: 'Midtrans QRIS',
                        desc: 'Verifikasi otomatis via Webhook & Snap API',
                        badge: 'Populer ID'
                      },
                      {
                        id: 'XENDIT',
                        name: 'Xendit QRIS',
                        desc: 'National QRIS interkoneksi langsung',
                        badge: 'Real-time API'
                      },
                      {
                        id: 'TRIPAY',
                        name: 'Tripay Aggregator',
                        desc: 'Payment aggregator UMKM tarif rendah',
                        badge: 'UMKM Friendly'
                      }
                    ].map((prov) => (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setQrisProvider(prov.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                          qrisProvider === prov.id
                            ? 'bg-primary/10 border-primary shadow-xs'
                            : 'bg-subtle border-border-subtle hover:bg-card-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-text-primary">{prov.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-card border border-border-subtle text-text-muted font-semibold">
                            {prov.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary">{prov.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Merchant Identity Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      NMID (National Merchant ID):
                    </label>
                    <input
                      type="text"
                      value={qrisNmid}
                      onChange={(e) => setQrisNmid(e.target.value)}
                      placeholder="ID1020023456789"
                      className="w-full text-xs font-mono font-bold px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                    />
                    <span className="text-[10px] text-text-muted mt-0.5 block">13-digit NMID dari BI/Acquirer</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Nama Merchant QRIS:
                    </label>
                    <input
                      type="text"
                      value={qrisMerchantName}
                      onChange={(e) => setQrisMerchantName(e.target.value)}
                      placeholder="OmniPOS Retail Store"
                      className="w-full text-xs font-bold px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary uppercase"
                    />
                    <span className="text-[10px] text-text-muted mt-0.5 block">Tampil di layar m-Banking nasabah</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Kota Merchant:
                    </label>
                    <input
                      type="text"
                      value={qrisMerchantCity}
                      onChange={(e) => setQrisMerchantCity(e.target.value)}
                      placeholder="JAKARTA"
                      className="w-full text-xs font-bold px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary uppercase"
                    />
                    <span className="text-[10px] text-text-muted mt-0.5 block">Tag 60 EMVCo MPM</span>
                  </div>
                </div>

                {/* API Keys for Cloud Gateway */}
                {qrisProvider !== 'SIMULATOR' && (
                  <div className="p-3.5 rounded-xl bg-subtle border border-border-subtle space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Kredensial API Gateway ({qrisProvider}):</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                          Server Key / Secret API Key:
                        </label>
                        <input
                          type="password"
                          value={qrisServerKey}
                          onChange={(e) => setQrisServerKey(e.target.value)}
                          placeholder="Mid-server-xxxx / xnd_development_xxxx"
                          className="w-full text-xs font-mono px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                          Client Key / Merchant ID:
                        </label>
                        <input
                          type="text"
                          value={qrisClientKey}
                          onChange={(e) => setQrisClientKey(e.target.value)}
                          placeholder="Mid-client-xxxx / merchant-id"
                          className="w-full text-xs font-mono px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Webhook Endpoint Info */}
                    <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                      <div>
                        <span className="text-text-muted block text-[10px]">URL Webhook Notifikasi Transaksi (Callback URL):</span>
                        <code className="font-mono text-primary text-[11px]">
                          {window.location.origin}/api/v1/payments/qris/webhook
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/v1/payments/qris/webhook`);
                          useToastStore.getState().showToast('URL Webhook berhasil disalin!', 'success');
                        }}
                        className="px-2.5 py-1 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold text-text-secondary cursor-pointer"
                      >
                        Salin URL
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Terminal Kartu EDC */}
              <div className="p-5 rounded-2xl bg-card border border-border-subtle space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> 2. Integrasi Terminal Mesin EDC (Debit & Kredit)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    BCA • Mandiri • BRI • BNI • CIMB
                  </span>
                </div>

                {/* Mode Integrasi EDC */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-2">
                    Pilih Arsitektur Mesin EDC:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEdcIntegrationMode('STANDALONE')}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        edcIntegrationMode === 'STANDALONE'
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'bg-subtle border-border-subtle hover:bg-card-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-text-primary">Mode Standalone (Manual Slip)</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-card border border-border-subtle text-text-muted">
                          Paling Praktis
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        Mesin EDC berdiri sendiri tanpa kabel fisik ke POS. Kasir mengetik nominal di mesin EDC, lalu mencatat nomor Approval Code dari struk kertas ke sistem.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEdcIntegrationMode('ECR_DIRECT_LINK')}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        edcIntegrationMode === 'ECR_DIRECT_LINK'
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'bg-subtle border-border-subtle hover:bg-card-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-text-primary">ECR Direct Link (Otomatis)</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                          Integrasi Kabel / LAN
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        POS terhubung langsung ke mesin EDC (Ingenico/Pax/Verifone) via kabel USB-to-Serial atau LAN Ethernet. Tagihan dikirim otomatis tanpa kasir mengetik ulang.
                      </p>
                    </button>
                  </div>
                </div>

                {/* ECR Connection Details */}
                {edcIntegrationMode === 'ECR_DIRECT_LINK' && (
                  <div className="p-4 rounded-xl bg-subtle border border-border-subtle space-y-3.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-primary" /> Pengaturan Port Komunikasi ECR:
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">Protocol: ISO 8583 / ECR Link v2</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                          Bank Default EDC:
                        </label>
                        <select
                          value={edcDefaultBank}
                          onChange={(e) => setEdcDefaultBank(e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                        >
                          <option value="BCA">BCA</option>
                          <option value="Mandiri">Mandiri</option>
                          <option value="BRI">BRI</option>
                          <option value="BNI">BNI</option>
                          <option value="CIMB Niaga">CIMB Niaga</option>
                          <option value="Permata">Permata</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                          Port Serial COM (RS-232):
                        </label>
                        <input
                          type="text"
                          value={edcEcrComPort}
                          onChange={(e) => setEdcEcrComPort(e.target.value)}
                          placeholder="COM3 / /dev/ttyUSB1"
                          className="w-full text-xs font-mono font-bold px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                          IP Address EDC (LAN):
                        </label>
                        <input
                          type="text"
                          value={edcEcrIp}
                          onChange={(e) => setEdcEcrIp(e.target.value)}
                          placeholder="192.168.1.150"
                          className="w-full text-xs font-mono font-bold px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                          Port TCP (ECR):
                        </label>
                        <input
                          type="number"
                          value={edcEcrPort}
                          onChange={(e) => setEdcEcrPort(parseInt(e.target.value) || 8888)}
                          placeholder="8888"
                          className="w-full text-xs font-mono font-bold px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Test Button & Result */}
                    <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-text-secondary">
                        {edcTestResult && (
                          <span className={`font-semibold flex items-center gap-1.5 ${edcTestResult.success ? 'text-status-success' : 'text-status-danger'}`}>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{edcTestResult.message} (Appr: {edcTestResult.approvalCode})</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleTestEdcConnection}
                        disabled={isTestingEdc}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{isTestingEdc ? 'Menguji ECR...' : 'Uji Koneksi & Kirim Tagihan Rp 10.000'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
};
