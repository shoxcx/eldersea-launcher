const API_URL = import.meta.env.VITE_API_URL || 'https://eldersea.tekao.fr/api';

export async function hashPassword(pwd) {
  const msgUint8 = new TextEncoder().encode(pwd);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const firebaseService = {
  // Check if a user exists by pseudo
  async checkUserExists(pseudo) {
    if (!pseudo) return false;
    try {
      const response = await fetch(`${API_URL}/api/auth/check-exists?pseudo=${encodeURIComponent(pseudo)}`);
      const data = await response.json();
      return data.exists;
    } catch (e) {
      console.error("Auth check failed:", e);
      return false;
    }
  },

  // Register a new user
  async register(userData) {
    try {
      const hashedPwd = await hashPassword(userData.password);
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pseudo: userData.pseudo,
          email: userData.email,
          password: hashedPwd,
          twoFaSecret: userData.twoFaSecret || null
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur d'inscription.");
      }
      return await response.json();
    } catch (e) {
      console.error("Register error:", e);
      throw e;
    }
  },

  // Login user
  async login(pseudo, password) {
    if (!pseudo || !password) throw new Error("Pseudo et mot de passe requis");
    try {
      const hashedPwd = await hashPassword(password);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, password: hashedPwd })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur de connexion.");
      }
      return await response.json();
    } catch (e) {
      console.error("Login error:", e);
      throw e;
    }
  },

  // Update password
  async updatePassword(pseudo, newPassword) {
    try {
      // 1. Get user to retrieve their ID
      const userRes = await fetch(`${API_URL}/api/users`);
      if (!userRes.ok) return false;
      const allUsers = await userRes.json();
      const user = allUsers.find(u => u.pseudo.toLowerCase() === pseudo.toLowerCase());
      if (!user) return false;

      // 2. Hash new password
      const hashedNew = await hashPassword(newPassword);

      // 3. Patch user
      const response = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: hashedNew })
      });
      return response.ok;
    } catch (e) {
      console.error("Password update error:", e);
      throw e;
    }
  }
};

