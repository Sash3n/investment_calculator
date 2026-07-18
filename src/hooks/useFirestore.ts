/**
 * FinCalc ZA — Firestore data hooks
 * All data is scoped to the authenticated user: users/{uid}/...
 */

import { useEffect, useState, useCallback } from 'react';
import {
  collection, doc, getDocs, setDoc, deleteDoc,
  addDoc, updateDoc, query, orderBy, limit, serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  PropertyInputs, ExpenseDoc, MaintenanceDoc, IncomeDoc, PropertyRecordDoc,
} from '../types';

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

export type CalcType = 'mortgage' | 'property' | 'car' | 'investing' | 'strategy' | 'tax' | 'assessment';

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

  const rename = async (id: string, newTitle: string) => {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid, 'history', id), { title: newTitle });
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, title: newTitle } : e));
  };

  const update = async (id: string, entry: Omit<HistoryEntry, 'id' | 'savedAt'>) => {
    if (!uid) return;
    await setDoc(doc(db, 'users', uid, 'history', id), {
      ...entry,
      savedAt: serverTimestamp(),
    });
    await load();
  };

  const clear = async () => {
    if (!uid) return;
    const snap = await getDocs(collection(db, 'users', uid, 'history'));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    setEntries([]);
  };

  /** Returns only entries matching the given calc type — filtered client-side */
  const byType = (type: CalcType) => entries.filter((e) => e.type === type);

  return { entries, loading, push, update, remove, rename, clear, byType, reload: load };
}

// ── Property Manager tracker collections ──────────────────────────────────────
// Generic per-user subcollection hook. Docs carry a propertyId and are filtered
// client-side (like byType above) so no composite Firestore index is needed.

function useUserDocs<T extends { id: string; propertyId: string; savedAt: Date }>(
  uid: string | null,
  sub: 'expenses' | 'maintenance' | 'income' | 'records',
) {
  const [docs, setDocs]     = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!uid) { setDocs([]); return; }
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, sub), orderBy('savedAt', 'desc'))
      );
      setDocs(snap.docs.map((d) => ({
        ...(d.data() as Omit<T, 'id' | 'savedAt'>),
        id: d.id,
        savedAt: d.data().savedAt?.toDate() ?? new Date(),
      } as T)));
    } finally {
      setLoading(false);
    }
  }, [uid, sub]);

  useEffect(() => { load(); }, [load]);

  const add = async (data: Omit<T, 'id' | 'savedAt'>) => {
    if (!uid) return;
    await addDoc(collection(db, 'users', uid, sub), { ...data, savedAt: serverTimestamp() });
    await load();
  };

  const update = async (id: string, data: Partial<Omit<T, 'id' | 'savedAt'>>) => {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid, sub, id), data as DocumentData);
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
  };

  const remove = async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, sub, id));
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  /** Docs for one property — filtered client-side */
  const byProperty = (propertyId: string) => docs.filter((d) => d.propertyId === propertyId);

  return { docs, loading, add, update, remove, byProperty, reload: load };
}

/** users/{uid}/expenses — property running costs */
export function useExpenses(uid: string | null) {
  return useUserDocs<ExpenseDoc>(uid, 'expenses');
}

/** users/{uid}/maintenance — jobs, contractors and their status */
export function useMaintenance(uid: string | null) {
  return useUserDocs<MaintenanceDoc>(uid, 'maintenance');
}

/** users/{uid}/income — rent and other money received */
export function useIncome(uid: string | null) {
  return useUserDocs<IncomeDoc>(uid, 'income');
}

/** users/{uid}/records — leases, inspections, policies, renewals */
export function usePropertyRecords(uid: string | null) {
  return useUserDocs<PropertyRecordDoc>(uid, 'records');
}
