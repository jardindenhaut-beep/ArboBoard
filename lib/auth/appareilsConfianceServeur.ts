import "server-only";

import {
  createHash,
  randomBytes,
} from "node:crypto";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import {
  type NextRequest,
  type NextResponse,
} from "next/server";

export const NOM_COOKIE_APPAREIL_CONFIANCE =
  "arboboard_appareil_confiance";

export const DUREE_CONFIANCE_JOURS = 90;

const DUREE_CONFIANCE_SECONDES =
  DUREE_CONFIANCE_JOURS * 24 * 60 * 60;

type ProfilUtilisateurServeur = {
  id: string;
  entreprise_id: string | null;
  role: string | null;
  statut: string | null;
};

export class ErreurAppareilConfiance extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ErreurAppareilConfiance";
    this.status = status;
  }
}

function creerSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new ErreurAppareilConfiance(
      "Configuration Supabase serveur incomplète.",
      500
    );
  }

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function normaliser(valeur: string | null | undefined) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function obtenirJeton(request: NextRequest) {
  const autorisation =
    request.headers.get("authorization");

  if (!autorisation?.startsWith("Bearer ")) {
    return null;
  }

  return autorisation.slice(7).trim() || null;
}

export async function authentifierRequeteAppareil(
  request: NextRequest
): Promise<{
  supabaseAdmin: SupabaseClient;
  user: User;
  profil: ProfilUtilisateurServeur;
  jeton: string;
}> {
  const jeton = obtenirJeton(request);

  if (!jeton) {
    throw new ErreurAppareilConfiance(
      "Authentification requise.",
      401
    );
  }

  const supabaseAdmin = creerSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(jeton);

  if (userError || !user) {
    throw new ErreurAppareilConfiance(
      "Session invalide ou expirée.",
      401
    );
  }

  const { data: profil, error: profilError } =
    await supabaseAdmin
      .from("profils_utilisateurs")
      .select("id, entreprise_id, role, statut")
      .eq("id", user.id)
      .maybeSingle();

  if (profilError || !profil?.entreprise_id) {
    throw new ErreurAppareilConfiance(
      "Profil ou entreprise introuvable.",
      403
    );
  }

  const profilType =
    profil as ProfilUtilisateurServeur;

  if (
    profilType.statut &&
    normaliser(profilType.statut) !== "actif"
  ) {
    throw new ErreurAppareilConfiance(
      "Compte utilisateur inactif.",
      403
    );
  }

  return {
    supabaseAdmin,
    user,
    profil: profilType,
    jeton,
  };
}

export async function verifierSessionAal2(
  supabaseAdmin: SupabaseClient,
  jeton: string
) {
  const { data, error } =
    await supabaseAdmin.auth.mfa.getAuthenticatorAssuranceLevel(
      jeton
    );

  if (error) {
    throw new ErreurAppareilConfiance(
      error.message ||
        "Impossible de vérifier le niveau de sécurité.",
      401
    );
  }

  return data.currentLevel === "aal2";
}

export function creerJetonAppareil() {
  return randomBytes(32).toString("base64url");
}

export function calculerEmpreinteJeton(
  jeton: string
) {
  return createHash("sha256")
    .update(jeton)
    .digest("hex");
}

export function lireJetonAppareil(
  request: NextRequest
) {
  return (
    request.cookies.get(
      NOM_COOKIE_APPAREIL_CONFIANCE
    )?.value || null
  );
}

export function definirCookieAppareil(
  response: NextResponse,
  jeton: string,
  expireAt: Date
) {
  response.cookies.set({
    name: NOM_COOKIE_APPAREIL_CONFIANCE,
    value: jeton,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DUREE_CONFIANCE_SECONDES,
    expires: expireAt,
    priority: "high",
  });
}

export function supprimerCookieAppareil(
  response: NextResponse
) {
  response.cookies.set({
    name: NOM_COOKIE_APPAREIL_CONFIANCE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    priority: "high",
  });
}

export function dateExpirationAppareil() {
  return new Date(
    Date.now() +
      DUREE_CONFIANCE_SECONDES * 1000
  );
}

export function decrireAppareil(
  userAgentBrut: string | null
) {
  const userAgent = String(userAgentBrut || "")
    .slice(0, 500);

  let systeme = "Appareil inconnu";

  if (/iphone/i.test(userAgent)) {
    systeme = "iPhone";
  } else if (/ipad/i.test(userAgent)) {
    systeme = "iPad";
  } else if (/android/i.test(userAgent)) {
    systeme = "Android";
  } else if (/windows/i.test(userAgent)) {
    systeme = "Windows";
  } else if (/macintosh|mac os/i.test(userAgent)) {
    systeme = "macOS";
  } else if (/linux/i.test(userAgent)) {
    systeme = "Linux";
  }

  let navigateur = "Navigateur inconnu";

  if (/edg\//i.test(userAgent)) {
    navigateur = "Microsoft Edge";
  } else if (/firefox\//i.test(userAgent)) {
    navigateur = "Firefox";
  } else if (
    /chrome\//i.test(userAgent) &&
    !/edg\//i.test(userAgent)
  ) {
    navigateur = "Google Chrome";
  } else if (
    /safari\//i.test(userAgent) &&
    !/chrome\//i.test(userAgent)
  ) {
    navigateur = "Safari";
  }

  return {
    userAgent,
    navigateur,
    systeme,
    nomAppareil: `${navigateur} sur ${systeme}`,
  };
}

export function statutErreurAppareil(
  error: unknown
) {
  return error instanceof ErreurAppareilConfiance
    ? error.status
    : 500;
}

export function messageErreurAppareil(
  error: unknown
) {
  return error instanceof Error
    ? error.message
    : "Une erreur serveur est survenue.";
}