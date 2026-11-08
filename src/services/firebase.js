const rawApiUrl = import.meta.env.VITE_API_URL || 'https://eldersea.tekao.fr';
const API_BASE = rawApiUrl.replace(/\/+api\/?$/, '').replace(/\/+$/, '');

export async function hashPassword(pwd) {
  const msgUint8 = new TextEncoder().encode(pwd);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function parseApiResponse(response, fallbackMsg = "Une erreur est survenue") {
  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (e) {
      data = null;
    }
  }

  if (!response.ok) {
    if (data && data.error) {
      let friendlyError = data.error;
      if (friendlyError.includes('non trouvé') || friendlyError.includes('not found')) {
        friendlyError = "Ce compte n'existe pas. Vérifiez le pseudo ou créez un nouveau compte.";
      } else if (friendlyError.toLowerCase().includes('mot de passe incorrect')) {
        friendlyError = "Mot de passe incorrect. Vérifiez vos identifiants.";
      } else if (friendlyError.toLowerCase().includes('déjà utilisé')) {
        friendlyError = "Ce pseudo est déjà utilisé par un autre joueur.";
      }
      throw new Error(friendlyError);
    }

    if (response.status === 404) {
      throw new Error("Service d'authentification introuvable (Erreur 404). Vérifiez la configuration du serveur.");
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error("Le serveur d'authentification ElderSea est actuellement inaccessible ou en maintenance. Veuillez réessayer dans quelques instants.");
    }
    if (response.status === 500) {
      throw new Error("Erreur interne du serveur ElderSea. Veuillez réessayer plus tard.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Identifiants incorrects ou accès refusé.");
    }

    throw new Error(`${fallbackMsg} (Code ${response.status})`);
  }

  return data;
}

function handleFetchError(e, actionMsg) {
  console.error(`${actionMsg} failed:`, e);
  const errStr = (e.message || '').toLowerCase();
  if (
    errStr.includes('failed to fetch') ||
    errStr.includes('networkerror') ||
    errStr.includes('econnrefused') ||
    errStr.includes('load failed') ||
    errStr.includes('the network connection was lost')
  ) {
    throw new Error("Impossible de contacter le serveur ElderSea. Vérifiez votre connexion Internet.");
  }
  if (errStr.includes('<!doctype') || errStr.includes('unexpected token') || errStr.includes('is not valid json')) {
    throw new Error("Le serveur d'authentification a renvoyé une réponse invalide. Veuillez réessayer plus tard.");
  }
  throw e;
}

export const firebaseService = {
  // Check if a user exists by pseudo
  async checkUserExists(pseudo) {
    if (!pseudo) return false;
    try {
      const response = await fetch(`${API_BASE}/api/auth/check-exists?pseudo=${encodeURIComponent(pseudo.trim())}`);
      const data = await parseApiResponse(response, "Vérification du pseudo impossible");
      return data?.exists || false;
    } catch (e) {
      return handleFetchError(e, "Auth check");
    }
  },

  // Register a new user
  async register(userData) {
    try {
      const hashedPwd = await hashPassword(userData.password);
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pseudo: userData.pseudo.trim(),
          email: userData.email.trim(),
          password: hashedPwd,
          twoFaSecret: userData.twoFaSecret || null
        })
      });
      return await parseApiResponse(response, "Erreur lors de la création du compte");
    } catch (e) {
      return handleFetchError(e, "Register");
    }
  },

  // Login user
  async login(pseudo, password) {
    if (!pseudo || !password) throw new Error("Veuillez renseigner votre pseudo et votre mot de passe.");
    try {
      const hashedPwd = await hashPassword(password);
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: pseudo.trim(), password: hashedPwd })
      });
      return await parseApiResponse(response, "Erreur de connexion");
    } catch (e) {
      return handleFetchError(e, "Login");
    }
  },

  // Update password
  async updatePassword(pseudo, newPassword) {
    try {
      const userRes = await fetch(`${API_BASE}/api/users`);
      const allUsers = await parseApiResponse(userRes, "Impossible de récupérer les utilisateurs");
      const user = Array.isArray(allUsers) ? allUsers.find(u => u.pseudo && u.pseudo.toLowerCase() === pseudo.toLowerCase().trim()) : null;
      if (!user) throw new Error("Compte introuvable.");

      const hashedNew = await hashPassword(newPassword);

      const response = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: hashedNew })
      });
      return response.ok;
    } catch (e) {
      return handleFetchError(e, "Password update");
    }
  }
};
