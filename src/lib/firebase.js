const DB_URL = 'https://eldersea-53660-default-rtdb.firebaseio.com';

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

    const userData = {
      pseudo,
      email,
      password, // In a real app, this should be hashed
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
    if (!user || user.password !== password) {
      throw new Error('Invalid pseudo or password');
    }
    return user;
  },

  async updatePassword(pseudo, newPassword) {
    const response = await fetch(`${DB_URL}/users/${pseudo.toLowerCase()}/password.json`, {
      method: 'PUT',
      body: JSON.stringify(newPassword),
    });

    if (!response.ok) {
      throw new Error('Failed to update password');
    }
    return true;
  }
};
