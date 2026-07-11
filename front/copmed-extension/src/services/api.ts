export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TOKEN_KEY = "copmed_extension_token";
const USER_KEY = "copmed_extension_user";
const PROFILE_KEY = "copmed_extension_profile";

export type ExtensionSession = {
  token: string | null;
  user: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
};

type ApiRequestOptions = RequestInit & {
  token?: string | null;
  auth?: boolean;
};

function storageGet(keys: string[]): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });
}

function storageSet(values: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}

function storageRemove(keys: string[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, () => resolve());
  });
}

function safeJsonParse(value: unknown) {
  if (typeof value !== "string") return value || null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function getStoredSession(): Promise<ExtensionSession> {
  const stored = await storageGet([TOKEN_KEY, USER_KEY, PROFILE_KEY]);
  return {
    token: typeof stored[TOKEN_KEY] === "string" ? stored[TOKEN_KEY] : null,
    user: safeJsonParse(stored[USER_KEY]) as Record<string, unknown> | null,
    profile: safeJsonParse(stored[PROFILE_KEY]) as Record<string, unknown> | null,
  };
}

export async function storeSession(session: ExtensionSession): Promise<void> {
  await storageSet({
    [TOKEN_KEY]: session.token,
    [USER_KEY]: JSON.stringify(session.user),
    [PROFILE_KEY]: JSON.stringify(session.profile),
  });
}

export async function clearSession(): Promise<void> {
  await storageRemove([TOKEN_KEY, USER_KEY, PROFILE_KEY]);
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { status: "error", message: text };
  }
}

export async function apiRequest(path: string, { token, auth = true, headers, ...options }: ApiRequestOptions = {}) {
  const session = auth && token === undefined ? await getStoredSession() : null;
  const authToken = token === undefined ? session?.token : token;
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(auth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
  });

  const data = await parseJson(response);
  if (!response.ok) {
    const message = data.message || data.error || "Erro na comunicação com a API.";
    throw new Error(message);
  }
  return data;
}

export function login(payload: { email: string; password: string; profile: string }) {
  return apiRequest("/api/auth/login", {
    auth: false,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAuthenticatedUser() {
  return apiRequest("/api/auth/me");
}

export function getPatients() {
  return apiRequest("/api/all-patients");
}

export function createPatient(payload: { name: string }) {
  return apiRequest("/api/patients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPatientConsultations(patientId: string) {
  return apiRequest(`/api/patients/${encodeURIComponent(patientId)}/consultations`);
}

export function createConsultation(patientId: string, payload: Record<string, unknown>) {
  return apiRequest(`/api/patients/${encodeURIComponent(patientId)}/consultations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getConsultationHistory(patientId: string, consultationId: string) {
  return apiRequest(
    `/api/patients/${encodeURIComponent(patientId)}/consultations/${encodeURIComponent(consultationId)}/history`
  );
}

export function sendChatMessage(payload: Record<string, unknown>) {
  return apiRequest("/api/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function uploadPdf(formData: FormData) {
  return apiRequest("/api/upload-pdf", {
    method: "POST",
    body: formData,
  });
}

export function sendAudio(formData: FormData) {
  return apiRequest("/api/transcribe_audio", {
    method: "POST",
    body: formData,
  });
}

export function sendExtractedData(payload: Record<string, unknown>) {
  return apiRequest("/api/extension/extracted-data", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTranscriptionLog(patientId: string) {
  return apiRequest(`/api/patients/${encodeURIComponent(patientId)}/transcription-log`);
}
