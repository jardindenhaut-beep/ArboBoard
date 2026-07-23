"use client";

import { supabase } from "@/lib/supabaseClient";

export type AppareilConfiance = {
  id: string;
  nom_appareil: string;
  navigateur: string | null;
  systeme: string | null;
  created_at: string;
  derniere_utilisation_at: string;
  expire_at: string;
  appareil_actuel: boolean;
};

async function obtenirJeton(
  jetonFourni?: string
) {
  if (jetonFourni) return jetonFourni;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    return null;
  }

  return session.access_token;
}

async function lireErreur(response: Response) {
  const donnees = await response
    .json()
    .catch(() => null);

  return (
    donnees?.erreur ||
    donnees?.error ||
    "La gestion de l’appareil de confiance a échoué."
  );
}

export async function verifierAppareilConfiance(
  jetonFourni?: string
) {
  try {
    const jeton = await obtenirJeton(jetonFourni);

    if (!jeton) return false;

    const response = await fetch(
      "/api/auth/appareils-confiance/verifier",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jeton}`,
        },
        credentials: "include",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return false;
    }

    const donnees = await response
      .json()
      .catch(() => null);

    return donnees?.confiance === true;
  } catch {
    return false;
  }
}

export async function enregistrerAppareilConfiance(
  jetonFourni?: string
) {
  const jeton = await obtenirJeton(jetonFourni);

  if (!jeton) {
    throw new Error(
      "Session introuvable pour enregistrer cet appareil."
    );
  }

  const response = await fetch(
    "/api/auth/appareils-confiance",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jeton}`,
      },
      credentials: "include",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(await lireErreur(response));
  }

  return response.json();
}

export async function listerAppareilsConfiance() {
  const jeton = await obtenirJeton();

  if (!jeton) {
    throw new Error(
      "Session introuvable pour consulter les appareils."
    );
  }

  const response = await fetch(
    "/api/auth/appareils-confiance",
    {
      headers: {
        Authorization: `Bearer ${jeton}`,
      },
      credentials: "include",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(await lireErreur(response));
  }

  const donnees = await response.json();

  return (donnees?.appareils ||
    []) as AppareilConfiance[];
}

export async function revoquerAppareilConfiance(
  appareilId: string
) {
  const jeton = await obtenirJeton();

  if (!jeton) {
    throw new Error(
      "Session introuvable pour révoquer cet appareil."
    );
  }

  const response = await fetch(
    "/api/auth/appareils-confiance",
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jeton}`,
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        appareilId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await lireErreur(response));
  }

  return response.json();
}