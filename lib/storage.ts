import type { BubbleNode, LearningDocument } from "@/lib/types";

export interface LearningSession {
  id: string;
  document: LearningDocument;
  nodes: BubbleNode[];
  focusId: string | null;
  updatedAt: number;
}

export interface SessionMetadata {
  id: string;
  title: string;
  updatedAt: number;
}

const DB_NAME = "LatentLearnDB";
const STORE_NAME = "sessions";
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
  });
}

export async function saveSession(session: LearningSession): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSession(id: string): Promise<LearningSession | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllSessions(): Promise<SessionMetadata[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("updatedAt");
    const request = index.openCursor(null, "prev"); // descending order
    const sessions: SessionMetadata[] = [];
    
    request.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const value = cursor.value as LearningSession;
        sessions.push({
          id: value.id,
          title: value.document.title,
          updatedAt: value.updatedAt
        });
        cursor.continue();
      } else {
        resolve(sessions);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getLatestSession(): Promise<LearningSession | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("updatedAt");
    const request = index.openCursor(null, "prev");
    
    request.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        resolve(cursor.value as LearningSession);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
