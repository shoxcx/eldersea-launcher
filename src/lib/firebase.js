const DB_URL = 'https://eldersea-53660-default-rtdb.firebaseio.com';

async function hashPassword(pwd) {
  const msgUint8 = new TextEncoder().encode(pwd);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const firebaseService = {
  async getUserByPseudo(pseudo) {
    try {
      const response = await fetch(`${DB_URL}/users/${pseudo.toLowerCase()}.json`);
      return await response.json();
    } catch (error) {
      console.error('Firebase Error:', error);
      return null;
    }
  },

  async registerUser(pseudo, email, password) {
    const existing = await this.getUserByPseudo(pseudo);
    if (existing) {
      throw new Error('Pseudo already exists');
    }

    const hashedPwd = await hashPassword(password);
    const userData = {
      pseudo,
      email,
      password: hashedPwd,
      createdAt: new Date().toISOString(),
      isPremium: false,
    };

    const response = await fetch(`${DB_URL}/users/${pseudo.toLowerCase()}.json`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Failed to register user');
    }

    return userData;
  },

  async loginUser(pseudo, password) {
    const user = await this.getUserByPseudo(pseudo);
    const hashedInput = await hashPassword(password);
    if (!user || user.password !== hashedInput) {
      throw new Error('Invalid pseudo or password');
    }
    return user;
  },

  async updatePassword(pseudo, newPassword) {
    const hashedNew = await hashPassword(newPassword);
    const response = await fetch(`${DB_URL}/users/${pseudo.toLowerCase()}/password.json`, {
      method: 'PUT',
      body: JSON.stringify(hashedNew),
    });

    if (!response.ok) {
      throw new Error('Failed to update password');
    }
    return true;
  }
};
