// src/utils/session.js
// Centralised helpers for managing auth sessions per browser tab.

const SESSIONS_KEY = "timesheet.sessions";
const TAB_ID_KEY = "timesheet.tabId";
const LEGACY_TOKEN_KEY = "token";
const LEGACY_USER_KEY = "user";
const TAB_SESSION_PREFIX = "timesheet.tab.session.";

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function safeParseJSON(value, fallback = null) {
  if (!value || typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn("Session parse failed:", err);
    return fallback;
  }
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getTabSessionKey(tabId) {
  return `${TAB_SESSION_PREFIX}${tabId}`;
}

export function ensureTabId() {
  if (!isBrowser) return "server";
  try {
    const { sessionStorage } = window;
    let tabId = sessionStorage.getItem(TAB_ID_KEY);
    if (tabId) return tabId;
    tabId = generateId();
    sessionStorage.setItem(TAB_ID_KEY, tabId);
    return tabId;
  } catch (err) {
    console.warn("Unable to persist tab id; falling back.", err);
    return generateId();
  }
}

function readTabSession(tabId) {
  if (!isBrowser) return null;
  try {
    const raw = window.sessionStorage.getItem(getTabSessionKey(tabId));
    const val = safeParseJSON(raw, null);
    if (val && typeof val === "object" && val.token) return val;
    return null;
  } catch (err) {
    console.warn("Session parse (tab) failed:", err);
    return null;
  }
}

function writeTabSession(tabId, session) {
  if (!isBrowser) return;
  try {
    const key = getTabSessionKey(tabId);
    if (!session || !session.token) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(key, JSON.stringify(session));
  } catch (err) {
    console.warn("Failed to write tab session:", err);
  }
}

function readSessions() {
  if (!isBrowser) return [];
  const raw = window.localStorage.getItem(SESSIONS_KEY);
  const parsed = safeParseJSON(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeSessions(list) {
  if (!isBrowser) return;
  const pruned = Array.isArray(list) ? list.filter((item) => item && item.id) : [];
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(pruned));
  } catch (err) {
    console.warn("Failed to write sessions; clearing stale data.", err);
    try {
      window.localStorage.removeItem(SESSIONS_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function getSessionForTab(tabId) {
  if (!tabId) return null;
  const sessions = readSessions();
  return sessions.find((entry) => entry.id === tabId) || null;
}

function upsertSession(tabId, session) {
  if (!isBrowser) return;
  const sessions = readSessions().filter((entry) => entry.id !== tabId);
  if (session && session.token) {
    sessions.push({
      id: tabId,
      token: session.token,
      user: session.user || null,
      updatedAt: Date.now(),
    });
  }
  writeSessions(sessions);
}

function migrateLegacySession(tabId) {
  if (!isBrowser) return null;
  const legacyToken = window.localStorage.getItem(LEGACY_TOKEN_KEY);
  if (!legacyToken) return null;
  const legacyUserRaw = window.localStorage.getItem(LEGACY_USER_KEY);
  const legacyUser = safeParseJSON(legacyUserRaw, null);
  const session = { token: legacyToken, user: legacyUser };
  upsertSession(tabId, session);
  try {
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    /* ignore cleanup issues */
  }
  return session;
}

export function getCurrentSession() {
  const tabId = ensureTabId();
  let session = getSessionForTab(tabId);
  if (!session) {
    const fromTab = readTabSession(tabId);
    if (fromTab && fromTab.token) {
      session = fromTab;
      upsertSession(tabId, fromTab);
    }
  }
  if (!session) {
    session = migrateLegacySession(tabId);
  }
  if (!session) {
    session = readTabSession(tabId);
  }
  if (session) {
    writeTabSession(tabId, session);
  }
  return { tabId, session };
}

export function setCurrentSession(token, user) {
  const tabId = ensureTabId();
  const session = { token, user };
  upsertSession(tabId, session);
  writeTabSession(tabId, session);
  return { tabId, session };
}

export function clearCurrentSession() {
  const tabId = ensureTabId();
  upsertSession(tabId, null);
  writeTabSession(tabId, null);
  return tabId;
}

export function getToken() {
  const { session } = getCurrentSession();
  return session?.token || "";
}

export function getUser() {
  const { session } = getCurrentSession();
  return session?.user || null;
}

export function subscribeToSessionChanges(callback) {
  if (!isBrowser || typeof callback !== "function") return () => {};
  const handler = (event) => {
    if (event.key !== SESSIONS_KEY) return;
    const { tabId, session } = getCurrentSession();
    callback(session, tabId);
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export { SESSIONS_KEY };
