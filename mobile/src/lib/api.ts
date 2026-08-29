import { supabase } from "./supabase";

const WEB = (import.meta.env.VITE_ARBOBOARD_WEB_URL || "https://arboboard.fr").replace(/\/+$/, "");

async function jeton() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function apiJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await jeton();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${WEB}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.erreur || data?.error || `Erreur serveur ${response.status}`);
  }
  return response.json();
}

export async function apiBlob(path: string, body: unknown): Promise<Blob> {
  const token = await jeton();
  const response = await fetch(`${WEB}${path.startsWith("/") ? path : `/${path}`}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.erreur || data?.error || `Erreur serveur ${response.status}`);
  }
  return response.blob();
}
