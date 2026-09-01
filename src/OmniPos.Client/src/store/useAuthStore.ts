import { create } from 'zustand';
import { User, UserRole } from '../types';
import { useToastStore } from './useToastStore';

interface AuthState {
  currentUser: User | null;
  isSetupRequired: boolean;
  isCheckingAuth: boolean;
  storeInfo: {
    storeName: string;
    storePhone: string;
    storeAddress: string;
    edition: string;
  };
  checkSetupStatus: () => Promise<boolean>;
  setupInitialAdmin: (data: {
    fullName: string;
    username: string;
    password: string;
    pinCode: string;
    storeName?: string;
    storePhone?: string;
    storeAddress?: string;
  }) => Promise<boolean>;
  loginWithPassword: (username: string, password: string) => Promise<boolean>;
  loginWithPin: (pinCode: string, usernameOrId?: string) => Promise<{ success: boolean; isAmbiguous?: boolean; candidateUsers?: any[]; user?: User; message?: string }>;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: (() => {
    try {
      const saved = localStorage.getItem('omnipos_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  isSetupRequired: false,
  isCheckingAuth: true,
  storeInfo: {
    storeName: 'OmniPOS Store',
    storePhone: '',
    storeAddress: '',
    edition: 'Retail'
  },

  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem('omnipos_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('omnipos_user');
    }
    set({ currentUser: user });
  },

  checkSetupStatus: async () => {
    try {
      set({ isCheckingAuth: true });
      const res = await fetch('/api/v1/auth/setup-status');
      if (res.ok) {
        const data = await res.json();
        set({
          isSetupRequired: data.isSetupRequired,
          storeInfo: {
            storeName: data.storeName,
            storePhone: data.storePhone,
            storeAddress: data.storeAddress,
            edition: data.edition
          }
        });
        return data.isSetupRequired;
      }
      return false;
    } catch (e) {
      console.warn('Failed to check setup status', e);
      return false;
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  setupInitialAdmin: async (payload) => {
    try {
      const res = await fetch('/api/v1/auth/setup-initial-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.user) {
        get().setCurrentUser(data.user);
        set({ isSetupRequired: false });
        useToastStore.getState().showToast(`Selamat datang, ${data.user.fullName}! Akun Administrator berhasil dibuat.`, 'success');
        return true;
      } else {
        useToastStore.getState().showToast(data.message || 'Gagal mendaftarkan akun admin.', 'error');
        return false;
      }
    } catch (e: any) {
      useToastStore.getState().showToast('Terjadi kesalahan jaringan.', 'error');
      return false;
    }
  },

  loginWithPassword: async (username, password) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        get().setCurrentUser(data.user);
        useToastStore.getState().showToast(`Login berhasil sebagai ${data.user.fullName} (${data.user.role})`, 'success');
        return true;
      } else {
        useToastStore.getState().showToast(data.message || 'Username atau password salah.', 'error');
        return false;
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi server kasir.', 'error');
      return false;
    }
  },

  loginWithPin: async (pinCode, usernameOrId) => {
    try {
      const payload: any = { pinCode };
      if (usernameOrId) {
        payload.username = usernameOrId;
      }

      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.user) {
        get().setCurrentUser(data.user);
        useToastStore.getState().showToast(`Selamat bertugas, ${data.user.fullName} (${data.user.role})!`, 'success');
        return { success: true, user: data.user };
      } else if (data.isAmbiguous) {
        return { success: false, isAmbiguous: true, candidateUsers: data.candidateUsers, message: data.message };
      } else {
        useToastStore.getState().showToast(data.message || 'PIN yang dimasukkan salah.', 'error');
        return { success: false, message: data.message };
      }
    } catch {
      useToastStore.getState().showToast('Gagal memverifikasi PIN.', 'error');
      return { success: false };
    }
  },

  logout: () => {
    get().setCurrentUser(null);
    useToastStore.getState().showToast('Anda telah keluar dari akun.', 'info');
  }
}));
