import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const fs = window.require ? window.require('fs') : null;
const path = window.require ? window.require('path') : null;

const getCustomStorage = () => {
  if (!fs || !path) return localStorage;
  
  const rootDir = "C:\\ElderSea";
  try {
    if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });
  } catch(e) { return localStorage; }

  return {
    getItem: (name) => {
      const p = path.join(rootDir, `${name}.json`);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
    },
    setItem: (name, value) => {
      fs.writeFileSync(path.join(rootDir, `${name}.json`), value, 'utf-8');
    },
    removeItem: (name) => {
      const p = path.join(rootDir, `${name}.json`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  };
};

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
      storage: createJSONStorage(() => getCustomStorage())
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
      storage: createJSONStorage(() => getCustomStorage())
    }
  )
);
