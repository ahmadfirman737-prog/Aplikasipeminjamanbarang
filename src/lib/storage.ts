import { DatabaseState } from '../types';
import { defaultInitialData } from './firebase';

const STORAGE_KEY = 'lab_komputer_db_v1';

export const initialData: DatabaseState = defaultInitialData;

export function loadDatabase(): DatabaseState {
  try {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (!dataStr) {
      saveDatabase(initialData);
      return initialData;
    }
    const parsed = JSON.parse(dataStr);
    let users = parsed.users || initialData.users;

    // Ensure all required default users are populated
    defaultInitialData.users.forEach((defUser) => {
      const exists = users.some(
        (u: any) => u.username.toLowerCase() === defUser.username.toLowerCase()
      );
      if (!exists) {
        users.push(defUser);
      } else {
        // Update credentials if needed
        users = users.map((u: any) =>
          u.username.toLowerCase() === defUser.username.toLowerCase()
            ? { ...u, password: defUser.password, role: defUser.role, name: defUser.name }
            : u
        );
      }
    });

    const state: DatabaseState = {
      users,
      gurus: parsed.gurus || initialData.gurus,
      barangs: parsed.barangs || initialData.barangs,
      transaksis: parsed.transaksis || initialData.transaksis
    };
    saveDatabase(state);
    return state;
  } catch (err) {
    console.error('Failed to load database from localStorage', err);
    return initialData;
  }
}

export function saveDatabase(data: DatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save database to localStorage', err);
  }
}

export function resetDatabase(): DatabaseState {
  saveDatabase(initialData);
  return initialData;
}
