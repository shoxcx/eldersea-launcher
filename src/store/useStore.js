import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      login: (pseudo, email = 'player@eldersea.io', createdAt = null) => set({ 
        user: { 
          pseudo, 
          email, 
          createdAt: createdAt || new Date().toLocaleDateString(),
          isPremium: true 
        }, 
        isLoggedIn: true 
      }),
      logout: () => set({ user: null, isLoggedIn: false }),
      updateUser: (newData) => set((state) => ({ user: { ...state.user, ...newData } })),
    }),
    { 
      name: 'eldersea-auth',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export const useSettingsStore = create(
  persist(
    (set) => ({
      ram: 6,
      language: 'fr',
      launchOnStartup: false,
      backgroundMode: true,
      installPath: 'C:\\Users\\User\\AppData\\Roaming\\.eldersea',
      setRam: (ram) => set({ ram }),
      setLanguage: (language) => set({ language }),
      setLaunchOnStartup: (launchOnStartup) => set({ launchOnStartup }),
      setBackgroundMode: (backgroundMode) => set({ backgroundMode }),
      setInstallPath: (installPath) => set({ installPath }),
    }),
    { 
      name: 'eldersea-settings',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
