const DB_URL = "https://eldersea-53660-default-rtdb.firebaseio.com";

export const firebaseService = {
  // Check if a user exists by pseudo
  async checkUserExists(pseudo) {
    try {
      const response = await fetch(`${DB_URL}/users.json?orderBy="pseudo"&equalTo="${pseudo}"`);
      const data = await response.json();
      
      // If Firebase returns an error (like missing index), we handle it
      if (data && data.error) {
        console.warn("Firebase Index Error:", data.error);
        // Fallback: manually check (less efficient but works without index for small DB)
        const allRes = await fetch(`${DB_URL}/users.json`);
        const allData = await allRes.json();
        if (!allData) return false;
        return Object.values(allData).some(u => u.pseudo.toLowerCase() === pseudo.toLowerCase());
      }

      return data && Object.keys(data).length > 0;
    } catch (e) {
      console.error("Firebase Error:", e);
      return false;
    }
  },

  // Register a new user
  async register(userData) {
    try {
      const response = await fetch(`${DB_URL}/users.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          createdAt: new Date().toLocaleDateString(),
          isPremium: true
        })
      });
      return await response.json();
    } catch (e) {
      console.error("Firebase Register Error:", e);
      throw e;
    }
  },

  // Login user
  async login(pseudo, password) {
    try {
      const response = await fetch(`${DB_URL}/users.json`);
      const allData = await response.json();
      
      if (!allData) throw new Error("Utilisateur non trouvé");
      
      const userEntry = Object.entries(allData).find(([id, u]) => u.pseudo === pseudo);
      
      if (userEntry) {
        const [id, user] = userEntry;
        if (user.password === password) {
          return { ...user, id };
        } else {
          throw new Error("Mot de passe incorrect");
        }
      } else {
        throw new Error("Utilisateur non trouvé");
      }
    } catch (e) {
      console.error("Firebase Login Error:", e);
      throw e;
    }
  },

  // Update password
  async updatePassword(pseudo, newPassword) {
    try {
      const response = await fetch(`${DB_URL}/users.json`);
      const allData = await response.json();
      if (!allData) return false;

      const userEntry = Object.entries(allData).find(([id, u]) => u.pseudo === pseudo);
      if (userEntry) {
        const [id] = userEntry;
        await fetch(`${DB_URL}/users/${id}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword })
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Firebase Update Error:", e);
      throw e;
    }
  }
};
