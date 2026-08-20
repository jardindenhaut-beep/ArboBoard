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

function attendre(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/**
 * Après une validation MFA, Supabase renouvelle la session avec un JWT AAL2.
 * Selon le navigateur / timing, getSession() peut encore rendre brièvement
 * l'ancien JWT AAL1. On attend donc explicitement la session AAL2 avant
 * d'appeler la route serveur qui enregistre l'appareil.
 */
async function obtenirJetonAal2(
  jetonFourni?: string
) {
  if (jetonFourni) return jetonFourni;

  for (let tentative = 0; tentative < 8; tentative += 1) {
    const [
      sessionResult,
      niveauResult,
    ] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    const session =
      sessionResult.data.session;

    if (
      !sessionResult.error &&
      !niveauResult.error &&
      session?.access_token &&
      niveauResult.data.currentLevel === "aal2"
    ) {
      return session.access_token;
    }

    // Une courte attente suffit normalement le temps que la session
    // issue de mfa.verify soit persistée dans le client Supabase.
    await attendre(100);
  }

  // Dernier essai avec une actualisation explicite de la session.
  const {
    data: refreshData,
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (
    !refreshError &&
    refreshData.session?.access_token
  ) {
    const { data: niveau, error: niveauError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      !niveauError &&
      niveau.currentLevel === "aal2"
    ) {
      return refreshData.session.access_token;
    }
  }

  return null;
}

async function lireErreur(response: Response) {
  const texte = await response.text().catch(() => "");

  if (texte) {
    try {
      const donnees = JSON.parse(texte);

      const message =
        donnees?.erreur ||
        donnees?.error ||
        donnees?.message;

      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
    } catch {
      // La réponse n'est pas du JSON. On conserve un extrait utile
      // plutôt que de masquer l'erreur derrière un message générique.
      const extrait = texte
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);

      if (extrait) {
        return `Erreur HTTP ${response.status} : ${extrait}`;
      }
    }
  }

  return `La gestion de l’appareil de confiance a échoué (HTTP ${response.status}).`;
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
  const jeton = await obtenirJetonAal2(jetonFourni);

  if (!jeton) {
    throw new Error(
      "La session AAL2 n’est pas encore disponible après la validation du code MFA."
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