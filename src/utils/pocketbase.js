// src/utils/pocketbase.js
import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);

// Optional: Auto-refresh token
pb.autoCancellation(false);