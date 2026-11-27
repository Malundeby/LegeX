"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildIndex, type Phrase, type PhraseCategory, type PhraseIndex, type UserPhrase } from "@/app/utils/fraser";

export interface SuggestionInput {
  phraseId?: string | null;
  categoryId?: string | null;
  title: string;
  body: string;
  comment?: string;
  website?: string;
}

export interface FraserStore {
  loading: boolean;
  error: string | null;
  index: PhraseIndex;
  userId: string | null;
  isAdmin: boolean;
  pending: number;
  favorites: Set<string>;
  userPhrases: UserPhrase[];
  reload: () => Promise<void>;
  toggleFavorite: (phraseId: string) => Promise<void>;
  saveUserPhrase: (p: { id?: string; title: string; body: string }) => Promise<string | null>;
  deleteUserPhrase: (id: string) => Promise<string | null>;
  suggest: (s: SuggestionInput) => Promise<string | null>;
  adminAction: (body: Record<string, unknown>) => Promise<string | null>;
  reorderLocal: (table: "categories" | "phrases", order: { id: string; sort_order: number }[]) => void;
}

/** Loads the shared catalog (public) plus the signed-in user's favorites and own phrases. */
export function useFraser(): FraserStore {
  const supabase = useMemo(() => createClient(), []);
  const [categories, setCategories] = useState<PhraseCategory[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userPhrases, setUserPhrases] = useState<UserPhrase[]>([]);

  const loadCatalog = useCallback(async () => {
    const [c, p] = await Promise.all([
      supabase.from("phrase_categories").select("id, parent_id, name, sort_order"),
      supabase.from("phrases").select("id, category_id, title, body, sort_order"),
    ]);
    if (c.error || p.error) {
      setError("Frasekatalogen kunne ikke lastes. Prøv å laste siden på nytt.");
      return;
    }
    setError(null);
    setCategories(c.data ?? []);
    setPhrases(p.data ?? []);
  }, [supabase]);

  const loadUser = useCallback(
    async (uid: string | null) => {
      setUserId(uid);
      if (!uid) {
        setFavorites(new Set());
        setUserPhrases([]);
        setIsAdmin(false);
        setPending(0);
        return;
      }
      const [f, u, me] = await Promise.all([
        supabase.from("user_phrase_favorites").select("phrase_id"),
        supabase.from("user_phrases").select("id, title, body").order("title"),
        fetch("/api/fraser/me", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ admin: false, pending: 0 })),
      ]);
      setFavorites(new Set((f.data ?? []).map((r: { phrase_id: string }) => r.phrase_id)));
      setUserPhrases(u.data ?? []);
      setIsAdmin(Boolean(me.admin));
      setPending(Number(me.pending) || 0);
    },
    [supabase]
  );

  useEffect(() => {
    let active = true;
    loadCatalog().finally(() => active && setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      // Defer: calling Supabase inside the auth callback can deadlock.
      setTimeout(() => active && loadUser(session?.user?.id ?? null), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase, loadCatalog, loadUser]);

  const index = useMemo(() => buildIndex(categories, phrases), [categories, phrases]);

  const reload = useCallback(async () => {
    await loadCatalog();
    if (userId) await loadUser(userId);
  }, [loadCatalog, loadUser, userId]);

  const toggleFavorite = useCallback(
    async (phraseId: string) => {
      if (!userId) return;
      const has = favorites.has(phraseId);
      const next = new Set(favorites);
      if (has) next.delete(phraseId);
      else next.add(phraseId);
      setFavorites(next);
      const res = has
        ? await supabase.from("user_phrase_favorites").delete().eq("phrase_id", phraseId).eq("user_id", userId)
        : await supabase.from("user_phrase_favorites").insert({ phrase_id: phraseId, user_id: userId });
      if (res.error) setFavorites(favorites);
    },
    [favorites, supabase, userId]
  );

  const saveUserPhrase = useCallback(
    async (p: { id?: string; title: string; body: string }) => {
      if (!userId) return "Du må være logget inn";
      const title = p.title.trim();
      const body = p.body.trim();
      if (!title || !body) return "Tittel og tekst må fylles ut";
      const res = p.id
        ? await supabase
            .from("user_phrases")
            .update({ title, body, updated_at: new Date().toISOString() })
            .eq("id", p.id)
        : await supabase.from("user_phrases").insert({ title, body, user_id: userId });
      if (res.error) return "Kunne ikke lagre frasen";
      await loadUser(userId);
      return null;
    },
    [loadUser, supabase, userId]
  );

  const deleteUserPhrase = useCallback(
    async (id: string) => {
      const res = await supabase.from("user_phrases").delete().eq("id", id);
      if (res.error) return "Kunne ikke slette frasen";
      setUserPhrases((list) => list.filter((p) => p.id !== id));
      return null;
    },
    [supabase]
  );

  const suggest = useCallback(async (s: SuggestionInput) => {
    try {
      const res = await fetch("/api/fraser/forslag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!res.ok) return (await res.json().catch(() => ({}))).error ?? "Forslaget kunne ikke sendes";
      return null;
    } catch {
      return "Forslaget kunne ikke sendes. Sjekk nettverket.";
    }
  }, []);

  const adminAction = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const res = await fetch("/api/fraser/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))).error ?? "Endringen kunne ikke lagres";
          await loadCatalog(); // undo optimistic changes
          return err;
        }
        await loadCatalog();
        return null;
      } catch {
        await loadCatalog().catch(() => undefined);
        return "Endringen kunne ikke lagres. Sjekk nettverket.";
      }
    },
    [loadCatalog]
  );

  const reorderLocal = useCallback((table: "categories" | "phrases", order: { id: string; sort_order: number }[]) => {
    const map = new Map(order.map((o) => [o.id, o.sort_order]));
    if (table === "categories") {
      setCategories((list) => list.map((c) => (map.has(c.id) ? { ...c, sort_order: map.get(c.id)! } : c)));
    } else {
      setPhrases((list) => list.map((p) => (map.has(p.id) ? { ...p, sort_order: map.get(p.id)! } : p)));
    }
  }, []);

  return {
    loading,
    error,
    index,
    userId,
    isAdmin,
    pending,
    favorites,
    userPhrases,
    reload,
    toggleFavorite,
    saveUserPhrase,
    deleteUserPhrase,
    suggest,
    adminAction,
    reorderLocal,
  };
}
