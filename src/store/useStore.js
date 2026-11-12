import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      accounts: [],
      login: (pseudo, email = 'player@eldersea.io', createdAt = null) => {
        const currentAccounts = get().accounts || [];
        const accountObj = { 
          pseudo, 
          email: email || 'player@eldersea.io', 
          createdAt: createdAt || new Date().toLocaleDateString(),
          isPremium: true,
          lastUsed: Date.now()
        };
        const filtered = currentAccounts.filter(
          a => (a.pseudo || '').toLowerCase() !== (pseudo || '').toLowerCase()
        );
        const newAccounts = [accountObj, ...filtered];
        set({ 
          user: accountObj, 
          isLoggedIn: true,
          accounts: newAccounts
        });
      },
      switchAccount: (pseudo) => {
        const accounts = get().accounts || [];
        const target = accounts.find(a => (a.pseudo || '').toLowerCase() === (pseudo || '').toLowerCase());
        if (target) {
          const updated = accounts.map(a => 
            (a.pseudo || '').toLowerCase() === (pseudo || '').toLowerCase()
              ? { ...a, lastUsed: Date.now() }
              : a
          );
          set({
            user: { ...target, lastUsed: Date.now() },
            isLoggedIn: true,
            accounts: updated
          });
          return true;
        }
        return false;
      },
      removeAccount: (pseudo) => {
        const accounts = get().accounts || [];
        const filtered = accounts.filter(a => (a.pseudo || '').toLowerCase() !== (pseudo || '').toLowerCase());
        const currentUser = get().user;
        if (currentUser && (currentUser.pseudo || '').toLowerCase() === (pseudo || '').toLowerCase()) {
          if (filtered.length > 0) {
            set({ user: filtered[0], isLoggedIn: true, accounts: filtered });
          } else {
            set({ user: null, isLoggedIn: false, accounts: [] });
          }
        } else {
          set({ accounts: filtered });
        }
      },
      logout: () => {
        const accounts = get().accounts || [];
        const currentUser = get().user;
        const filtered = accounts.filter(a => (a.pseudo || '').toLowerCase() !== (currentUser?.pseudo || '').toLowerCase());
        if (filtered.length > 0) {
          set({ user: filtered[0], isLoggedIn: true, accounts: filtered });
        } else {
          set({ user: null, isLoggedIn: false, accounts: [] });
        }
      },
      logoutAll: () => set({ user: null, isLoggedIn: false, accounts: [] }),
      updateUser: (newData) => set((state) => {
        const updatedUser = { ...state.user, ...newData };
        const updatedAccounts = (state.accounts || []).map(a => 
          (a.pseudo || '').toLowerCase() === (updatedUser.pseudo || '').toLowerCase() ? updatedUser : a
        );
        return { user: updatedUser, accounts: updatedAccounts };
      }),
      rememberedDevices: {},
      rememberDevice: (pseudo) => set((state) => ({
        rememberedDevices: {
          ...state.rememberedDevices,
          [pseudo.toLowerCase()]: Date.now() + 30 * 24 * 60 * 60 * 1000
        }
      })),
    }),
    { 
      name: 'eldersea-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          const accs = Array.isArray(state.accounts) ? state.accounts : [];
          const exists = accs.some(a => (a.pseudo || '').toLowerCase() === (state.user.pseudo || '').toLowerCase());
          if (!exists) {
            state.accounts = [state.user, ...accs];
          }
        }
      }
    }
  )
);

export const useSettingsStore = create(
  persist(
    (set) => ({
      ram: 6,
      resolution: '1280x720',
      language: 'fr',
      launchOnStartup: false,
      backgroundMode: true,
      showConsole: false,
      installPath: 'C:\\Users\\User\\AppData\\Roaming\\.eldersea',
      setRam: (ram) => set({ ram }),
      setResolution: (resolution) => set({ resolution }),
      setLanguage: (language) => set({ language }),
      setLaunchOnStartup: (launchOnStartup) => set({ launchOnStartup }),
      setBackgroundMode: (backgroundMode) => set({ backgroundMode }),
      setShowConsole: (showConsole) => set({ showConsole }),
      setInstallPath: (installPath) => set({ installPath }),
    }),
    { 
      name: 'eldersea-settings',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
