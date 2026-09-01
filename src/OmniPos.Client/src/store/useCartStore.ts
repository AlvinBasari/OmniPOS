import { create } from 'zustand';
import { CartItem, CartItemModifier, Customer, DiningTable, Product, ProductVariant, PromotionRule } from '../types';

// ==========================================
// 1. WEB AUDIO SYNTHESIZER FOR SCANNER BEEPS
// ==========================================
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

export const playScanBeep = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime); // High-pitch retail beep
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch {}
};

export const playErrorBeep = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
};

export const playCashBeep = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const playTone = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    };

    playTone(987.77, 0, 0.1);    // B5
    playTone(1318.51, 0.08, 0.2); // E6
  } catch {}
};

// ==========================================
// 2. PROMO ENGINE EVALUATOR
// ==========================================
const applyPromoRules = (items: CartItem[], rules: PromotionRule[]): CartItem[] => {
  // First, strip existing auto-generated promo reward items
  const nonPromoItems = items.filter(i => !i.isPromoReward);
  const rewardItems: CartItem[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;

    // A. Buy X Get Y (e.g. Beli 2 Minyak Tropical Gratis 1 Gula Gulaku)
    if (rule.promoType === 'BuyXGetY' || (rule.promoType as any) === 0) {
      const qualifyingItem = nonPromoItems.find(i => 
        (rule.buyProductId && i.productId === rule.buyProductId) ||
        (rule.buyProductName && i.name.toLowerCase().includes(rule.buyProductName.toLowerCase()))
      );

      if (qualifyingItem && qualifyingItem.quantity >= (rule.buyQuantityRequired || 1)) {
        const setsEarned = Math.floor(qualifyingItem.quantity / rule.buyQuantityRequired);
        const freeQty = setsEarned * (rule.getFreeQuantity || 1);

        if (freeQty > 0) {
          rewardItems.push({
            productId: rule.getFreeProductId || `promo_${rule.id}`,
            name: rule.getFreeProductName || `Hadiah Promo: ${rule.name}`,
            unit: 'PCS',
            quantity: freeQty,
            regularPrice: 0,
            unitPrice: 0,
            discountAmount: 0,
            totalPrice: 0,
            modifiers: [],
            isPromoReward: true,
            promoRuleName: rule.name || 'Promo Beli X Gratis Y'
          });
        }
      }
    }
  }

  return [...nonPromoItems, ...rewardItems];
};

// ==========================================
// 3. TYPES & CART STORE INTERFACE
// ==========================================
export interface ParkedOrder {
  id: string;
  holdNumber: string;
  tableName?: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  parkedAt: Date;
}

import { TradeInData } from '../components/modals/TradeInModal';
import { DeviceServiceTicket } from '../types';

export interface LastCompletedOrder {
  invoiceNumber: string;
  orderDate: string;
  cashierName: string;
  customerName?: string;
  totalAmount: number;
  totalPaid: number;
  changeAmount: number;
  paymentMethod: string;
  items: CartItem[];
  tradeIn?: TradeInData | null;
}

interface CartStore {
  items: CartItem[];
  selectedCustomer: Customer | null;
  selectedTable: DiningTable | null;
  discountAmount: number;
  discountReason: string;
  taxPercentage: number;
  serviceChargePercentage: number;
  roundingAmount: number;
  tradeIn: TradeInData | null;
  parkedOrders: ParkedOrder[];
  activePromotionRules: PromotionRule[];
  lastCompletedOrder: LastCompletedOrder | null;

  // Actions
  loadPromotionRules: () => Promise<void>;
  addItem: (product: Product, variant?: ProductVariant, modifiers?: CartItemModifier[], qty?: number, serialNumber?: string) => void;
  addServiceTicketSettlement: (ticket: DeviceServiceTicket) => void;
  updateQty: (index: number, newQty: number) => void;
  removeItem: (index: number) => void;
  incrementLatestItem: () => void;
  decrementLatestItem: () => void;
  removeLatestItem: () => void;
  setCustomer: (customer: Customer | null) => void;
  setTable: (table: DiningTable | null) => void;
  setDiscount: (amount: number, reason?: string) => void;
  setTradeIn: (tradeIn: TradeInData | null) => void;
  setTaxPercentage: (percentage: number) => void;
  clearCart: () => void;
  parkCurrentOrder: (holdLabel?: string) => void;
  restoreParkedOrder: (parkedId: string) => void;
  deleteParkedOrder: (parkedId: string) => void;
  setLastCompletedOrder: (order: LastCompletedOrder) => void;

  // Scanner & Weighing Scale
  handleScanBarcode: (barcode: string, products: Product[]) => boolean;

  // Computed Getters
  getSubtotal: () => number;
  getTradeInAmount: () => number;
  getTaxAmount: () => number;
  getServiceChargeAmount: () => number;
  getTotalAmount: () => number;
  getWholesaleSavings: () => number;
  getTotalItemCount: () => number;
  getQuickCashSuggestions: () => number[];
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  selectedCustomer: null,
  selectedTable: null,
  discountAmount: 0,
  discountReason: '',
  taxPercentage: 0,
  serviceChargePercentage: 0,
  roundingAmount: 0,
  tradeIn: null,
  parkedOrders: [],
  activePromotionRules: [],
  lastCompletedOrder: null,

  loadPromotionRules: async () => {
    try {
      const res = await fetch('/api/v1/promotions');
      if (res.ok) {
        const rules: PromotionRule[] = await res.json();
        set({ activePromotionRules: rules.filter(r => r.isActive) });
      }
    } catch {}
  },

  addItem: (product, variant, modifiers = [], qty = 1, serialNumber) => {
    playScanBeep();

    set((state) => {
      const baseUnitPrice = variant ? (product.sellPrice + variant.additionalPrice) : product.sellPrice;
      const modTotal = modifiers.reduce((acc, m) => acc + m.price, 0);
      const regularPrice = baseUnitPrice + modTotal;

      let updatedList: CartItem[];

      // If item has a unique IMEI / Serial Number, don't aggregate quantity - create unique line
      if (serialNumber) {
        const newItem: CartItem = {
          productId: product.id,
          variantId: variant?.id,
          name: product.name,
          variantName: variant?.name,
          sku: variant?.sku || product.sku,
          unit: product.unit || 'UNIT',
          quantity: 1,
          regularPrice,
          unitPrice: regularPrice,
          discountAmount: 0,
          totalPrice: regularPrice,
          modifiers,
          serialNumber: serialNumber,
          kitchenStation: product.kitchenStation || 'BAR',
        };
        updatedList = [...state.items, newItem];
      } else {
        const existingIdx = state.items.findIndex(
          (i) =>
            !i.isPromoReward &&
            !i.serialNumber &&
            i.productId === product.id &&
            i.variantId === variant?.id &&
            JSON.stringify(i.modifiers) === JSON.stringify(modifiers)
        );

        if (existingIdx >= 0) {
          const updated = [...state.items];
          const newQty = updated[existingIdx].quantity + qty;
          updated[existingIdx].quantity = newQty;

          const hasWholesale = product.wholesalePrice && product.wholesaleMinQty && newQty >= product.wholesaleMinQty;
          const activeUnitPrice = hasWholesale ? (product.wholesalePrice! + modTotal) : regularPrice;

          updated[existingIdx].unitPrice = activeUnitPrice;
          updated[existingIdx].isWholesaleApplied = !!hasWholesale;
          updated[existingIdx].totalPrice = newQty * activeUnitPrice;
          updatedList = updated;
        } else {
          const hasWholesale = product.wholesalePrice && product.wholesaleMinQty && qty >= product.wholesaleMinQty;
          const activeUnitPrice = hasWholesale ? (product.wholesalePrice! + modTotal) : regularPrice;

          const newItem: CartItem = {
            productId: product.id,
            variantId: variant?.id,
            name: product.name,
            variantName: variant?.name,
            sku: variant?.sku || product.sku,
            unit: product.unit || 'PCS',
            quantity: qty,
            regularPrice,
            wholesalePrice: product.wholesalePrice,
            wholesaleMinQty: product.wholesaleMinQty,
            isWholesaleApplied: !!hasWholesale,
            unitPrice: activeUnitPrice,
            discountAmount: 0,
            totalPrice: qty * activeUnitPrice,
            modifiers,
            kitchenStation: product.kitchenStation || 'BAR',
          };
          updatedList = [...state.items, newItem];
        }
      }

      // Automatically evaluate promotion rules
      const withPromos = applyPromoRules(updatedList, state.activePromotionRules);
      return { items: withPromos };
    });
  },

  addServiceTicketSettlement: (ticket) => {
    playScanBeep();
    set((state) => {
      const remaining = ticket.remainingBalance > 0 ? ticket.remainingBalance : ticket.finalCost;
      const serviceItem: CartItem = {
        productId: ticket.id,
        name: `Pelunasan Servis [${ticket.ticketNumber}] - ${ticket.brandAndModel}`,
        unit: 'JASA',
        quantity: 1,
        regularPrice: remaining,
        unitPrice: remaining,
        discountAmount: 0,
        totalPrice: remaining,
        modifiers: [],
        serviceTicketId: ticket.id,
        isServiceSettlement: true,
        notes: `Keluhan: ${ticket.problemDescription} (DP Awal: Rp ${ticket.downPayment.toLocaleString('id-ID')})`,
      };
      return { 
        items: [...state.items, serviceItem],
        selectedCustomer: state.selectedCustomer || {
          id: `cust_${ticket.id}`,
          name: ticket.customerName,
          phoneNumber: ticket.customerPhone,
          customerGroup: 'Umum',
          loyaltyPoints: 0,
          depositBalance: 0,
          totalReceivable: 0,
          creditLimit: 0
        }
      };
    });
  },

  updateQty: (index, newQty) => {
    set((state) => {
      if (newQty <= 0) {
        const filtered = state.items.filter((_, i) => i !== index);
        const withPromos = applyPromoRules(filtered, state.activePromotionRules);
        return { items: withPromos };
      }

      const updated = [...state.items];
      const item = updated[index];
      if (item.isPromoReward) return { items: state.items }; // Promo rewards are auto-managed

      const hasWholesale = item.wholesalePrice && item.wholesaleMinQty && newQty >= item.wholesaleMinQty;
      const activeUnitPrice = hasWholesale ? item.wholesalePrice! : item.regularPrice;

      item.quantity = newQty;
      item.unitPrice = activeUnitPrice;
      item.isWholesaleApplied = !!hasWholesale;
      item.totalPrice = newQty * activeUnitPrice;

      const withPromos = applyPromoRules(updated, state.activePromotionRules);
      return { items: withPromos };
    });
  },

  removeItem: (index) => {
    set((state) => {
      const filtered = state.items.filter((_, i) => i !== index);
      const withPromos = applyPromoRules(filtered, state.activePromotionRules);
      return { items: withPromos };
    });
  },

  incrementLatestItem: () => {
    const state = get();
    for (let i = state.items.length - 1; i >= 0; i--) {
      if (!state.items[i].isPromoReward) {
        state.updateQty(i, state.items[i].quantity + 1);
        break;
      }
    }
  },

  decrementLatestItem: () => {
    const state = get();
    for (let i = state.items.length - 1; i >= 0; i--) {
      if (!state.items[i].isPromoReward) {
        state.updateQty(i, state.items[i].quantity - 1);
        break;
      }
    }
  },

  removeLatestItem: () => {
    const state = get();
    for (let i = state.items.length - 1; i >= 0; i--) {
      if (!state.items[i].isPromoReward) {
        state.removeItem(i);
        break;
      }
    }
  },

  setCustomer: (customer) => set({ selectedCustomer: customer }),
  setTable: (table) => set({ selectedTable: table }),
  setDiscount: (amount, reason = 'Diskon Khusus') => set({ discountAmount: amount, discountReason: reason }),
  setTradeIn: (tradeIn) => set({ tradeIn }),
  setTaxPercentage: (percentage) => set({ taxPercentage: percentage }),
  setLastCompletedOrder: (order) => set({ lastCompletedOrder: order }),

  clearCart: () =>
    set({
      items: [],
      selectedCustomer: null,
      selectedTable: null,
      discountAmount: 0,
      discountReason: '',
      tradeIn: null,
      roundingAmount: 0,
    }),

  parkCurrentOrder: (holdLabel) => {
    const state = get();
    const activeItems = state.items.filter(i => !i.isPromoReward);
    if (activeItems.length === 0) return;

    const parked: ParkedOrder = {
      id: `hold_${Date.now()}`,
      holdNumber: holdLabel || `PENDING #${state.parkedOrders.length + 1}`,
      tableName: state.selectedTable?.tableNumber,
      customerName: state.selectedCustomer?.name,
      items: [...state.items],
      subtotal: state.getSubtotal(),
      parkedAt: new Date(),
    };

    set((s) => ({
      parkedOrders: [parked, ...s.parkedOrders],
      items: [],
      selectedCustomer: null,
      selectedTable: null,
      discountAmount: 0,
      tradeIn: null,
    }));
  },

  restoreParkedOrder: (parkedId) => {
    const state = get();
    const target = state.parkedOrders.find((p) => p.id === parkedId);
    if (!target) return;

    const withPromos = applyPromoRules(target.items, state.activePromotionRules);
    set((s) => ({
      items: withPromos,
      parkedOrders: s.parkedOrders.filter((p) => p.id !== parkedId),
    }));
  },

  deleteParkedOrder: (parkedId) => {
    set((s) => ({
      parkedOrders: s.parkedOrders.filter((p) => p.id !== parkedId),
    }));
  },

  handleScanBarcode: (code, products) => {
    const cleanCode = code.trim();
    if (!cleanCode) return false;

    // 1. Weighing Scale Barcode
    if ((cleanCode.startsWith('20') || cleanCode.startsWith('21')) && (cleanCode.length === 12 || cleanCode.length === 13)) {
      const pluCode = cleanCode.substring(2, 7);
      const weightGrams = parseInt(cleanCode.substring(7, 12), 10);
      const weightKg = weightGrams / 1000.0;

      const product = products.find(p => p.sku === pluCode || p.barcode === pluCode);
      if (product) {
        get().addItem(product, undefined, [], weightKg);
        return true;
      }
    }

    // 2. Standard Barcode or SKU lookup
    const product = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === cleanCode.toLowerCase()) ||
        p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (product) {
      get().addItem(product, undefined, [], 1);
      return true;
    }

    playErrorBeep();
    return false;
  },

  getSubtotal: () => {
    return get().items.reduce((acc, item) => acc + item.totalPrice, 0);
  },

  getTradeInAmount: () => {
    return get().tradeIn?.valuationAmount || 0;
  },

  getWholesaleSavings: () => {
    return get().items.reduce((acc, item) => {
      if (item.isWholesaleApplied && item.regularPrice > item.unitPrice) {
        return acc + ((item.regularPrice - item.unitPrice) * item.quantity);
      }
      return acc;
    }, 0);
  },

  getTaxAmount: () => {
    const subtotal = get().getSubtotal() - get().discountAmount - get().getTradeInAmount();
    if (subtotal <= 0) return 0;
    return Math.round((subtotal * get().taxPercentage) / 100);
  },

  getServiceChargeAmount: () => {
    const subtotal = get().getSubtotal() - get().discountAmount - get().getTradeInAmount();
    if (subtotal <= 0) return 0;
    return Math.round((subtotal * get().serviceChargePercentage) / 100);
  },

  getTotalAmount: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discountAmount;
    const tradeInVal = get().getTradeInAmount();
    const tax = get().getTaxAmount();
    const service = get().getServiceChargeAmount();
    const total = Math.max(0, subtotal - discount - tradeInVal + tax + service);

    // Rounding to nearest Rp 100
    const rounded = Math.round(total / 100) * 100;
    return rounded;
  },

  getTotalItemCount: () => {
    return get().items.reduce((acc, item) => acc + item.quantity, 0);
  },

  getQuickCashSuggestions: () => {
    const total = get().getTotalAmount();
    if (total <= 0) return [];

    const suggestions: Set<number> = new Set();
    suggestions.add(total); // Uang pas

    const denominations = [10000, 20000, 50000, 100000, 200000, 500000];
    for (const d of denominations) {
      if (d > total) {
        suggestions.add(d);
      } else {
        const nextMultiple = Math.ceil(total / d) * d;
        if (nextMultiple > total && nextMultiple <= total + 100000) {
          suggestions.add(nextMultiple);
        }
      }
    }

    return Array.from(suggestions).sort((a, b) => a - b).slice(0, 5);
  },
}));
export default useCartStore;
