/**
 * FinCalc ZA — Firestore data hooks
 * All data is scoped to the authenticated user: users/{uid}/...
 */

import { useEffect, useState, useCallback } from 'react';
import {
  collection, doc, getDocs, setDoc, deleteDoc,
  addDoc, query, orderBy, limit, serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PropertyInputs } from '../types';

// ── Saved Properties ──────────────────────────────────────────────────────────

export interface SavedProperty {
  id: string;
  name: string;
  inputs: PropertyInputs;
  savedAt: Date;
}

export function useSavedProperties(uid: string | null) {
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading]       = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'properties'), orderBy('savedAt', 'desc'))
      );
      setProperties(
        snap.docs.map((d) => ({
          id:      d.id,
          name:    d.data().name,
          inputs:  d.data().inputs as PropertyInputs,
          savedAt: d.data().savedAt?.toDate() ?? new Date(),
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const save = async (name: string, inputs: PropertyInputs, existingId?: string) => {
    if (!uid) return;
    const data = { name, inputs, savedAt: serverTimestamp() };
    if (existingId) {
      await setDoc(doc(db, 'users', uid, 'properties', existingId), data);
    } else {
      await addDoc(collection(db, 'users', uid, 'properties'), data);
    }
    await load();
  };

  const remove = async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'properties', id));
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  return { properties, loading, save, remove, reload: load };
}

// ── Calculation History ───────────────────────────────────────────────────────

export type CalcType = 'mortgage' | 'property' | 'car' | 'investing' | 'strategy' | 'tax';

export interface HistoryEntry {
  id: string;
  type: CalcType;
  title: string;         // e.g. "Mortgage — R1.2M at 11.25%"
  summary: string;       // one-line key result
  inputs: DocumentData;
  savedAt: Date;
}

export function useHistory(uid: string | null) {
  const [entries, setEntries]   = useState<HistoryEntry[]>([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'history'), orderBy('savedAt', 'desc'), limit(50))
      );
      setEntries(
        snap.docs.map((d) => ({
          id:      d.id,
          type:    d.data().type as CalcType,
          title:   d.data().title,
          summary: d.data().summary,
          inputs:  d.data().inputs,
          savedAt: d.data().savedAt?.toDate() ?? new Date(),
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const push = async (entry: Omit<HistoryEntry, 'id' | 'savedAt'>) => {
    if (!uid) return;
    await addDoc(collection(db, 'users', uid, 'history'), {
      ...entry,
      savedAt: serverTimestamp(),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'history', id));
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const clear = async () => {
    if (!uid) return;
    const snap = await getDocs(collection(db, 'users', uid, 'history'));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    setEntries([]);
  };

  /** Returns only entries matching the given calc type — filtered client-side */
  const byType = (type: CalcType) => entries.filter((e) => e.type === type);

  return { entries, loading, push, remove, clear, byType, reload: load };
}
