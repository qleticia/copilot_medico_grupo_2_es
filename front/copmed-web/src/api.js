export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'copmed_web_token';
const USER_KEY = 'copmed_web_user';
const PROFILE_KEY = 'copmed_web_profile';

export function getStoredSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  const rawProfile = localStorage.getItem(PROFILE_KEY);

  let user = null;
  let profile = null;
  try {
    user = rawUser ? JSON.parse(rawUser) : null;
    profile = rawProfile ? JSON.parse(rawProfile) : null;
  } catch {
    clearSession();
  }

  return { token, user, profile };
}

export function storeSession({ token, user, profile }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { status: 'error', message: text };
  }
}

export async function apiRequest(path, { token, headers, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const data = await parseJson(response);
  if (!response.ok) {
    const message = data.message || data.error || 'Erro na comunicação com a API.';
    throw new Error(message);
  }
  return data;
}

export function login({ email, password, profile }) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, profile }),
  });
}

export function getPatients(token) {
  return apiRequest('/api/all-patients', { token });
}

export function createPatient(token, payload) {
  return apiRequest('/api/patients', {
    token,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPatientConsultations(token, patientId) {
  return apiRequest(`/api/patients/${encodeURIComponent(patientId)}/consultations`, { token });
}

export function getPatientExtensionData(token, patientId) {
  return apiRequest(`/api/patients/${encodeURIComponent(patientId)}/extension-data`, { token });
}
