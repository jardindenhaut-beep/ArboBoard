import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  chiffrerIdentifiant,
  dechiffrerIdentifiant,
} from "@/lib/server/chiffrementIdentifiants";

const TOKEN_URL =
  "https://api.urssaf.fr/api/oauth/v1/token";

const SCOPE =
  "homeplus.tiersprestations";

type ProfilIntegration = {
  id: string;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type ConfigurationUrssaf = {
  id: string;
  entreprise_id: string;
  numero_sap: string;
  client_id_chiffre: string;
  client_secret_chiffre: string;
  client_id_suffixe?: string | null;
  scope_oauth: string;
  actif: boolean;
  statut: string;
  derniere_verification_at?: string | null;
  dernier_code_http?: number | null;
  dernier_message?: string | null;
  created_at: string;
  updated_at: string;
};

type CorpsConfiguration = {
  numero_sap?: unknown;
  client_id?: unknown;
  client_secret?: unknown;
};

type ResultatToken = {
  ok: boolean;
  codeHttp: number;
  message: string;
  expirationSecondes?: number | null;
};

const ROLES_CHEF = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

function normaliser(valeur: string | null | undefined) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function creerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Configuration Supabase serveur incomplète."
    );
  }

  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function obtenirJeton(request: NextRequest) {
  const autorisation =
    request.headers.get("authorization");

  if (!autorisation?.startsWith("Bearer ")) {
    return null;
  }

  return autorisation.slice(7).trim() || null;
}

function nettoyerMessage(valeur: unknown) {
  if (typeof valeur !== "string") {
    return "";
  }

  return valeur
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000);
}

function masquerClientId(
  suffixe: string | null | undefined
) {
  if (!suffixe) return null;
  return `••••••••••${suffixe}`;
}

async function authentifier(request: NextRequest) {
  const jeton = obtenirJeton(request);

  if (!jeton) {
    return {
      erreur: NextResponse.json(
        { erreur: "Authentification requise." },
        { status: 401 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  const supabaseAdmin = creerSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(jeton);

  if (userError || !user) {
    return {
      erreur: NextResponse.json(
        { erreur: "Session invalide ou expirée." },
        { status: 401 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  const { data: profil, error: profilError } =
    await supabaseAdmin
      .from("profils_utilisateurs")
      .select("id, role, statut, entreprise_id")
      .eq("id", user.id)
      .single();

  if (profilError || !profil?.entreprise_id) {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Profil ou entreprise introuvable.",
        },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  const profilType = profil as ProfilIntegration;

  if (
    !ROLES_CHEF.has(normaliser(profilType.role)) ||
    (
      profilType.statut &&
      normaliser(profilType.statut) !== "actif"
    )
  ) {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Accès réservé au chef d’entreprise.",
        },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  return {
    erreur: null,
    supabaseAdmin,
    profil: profilType,
  };
}

async function testerIdentifiants(
  clientId: string,
  clientSecret: string
): Promise<ResultatToken> {
  const controleur = new AbortController();
  const temporisation = setTimeout(
    () => controleur.abort(),
    15_000
  );

  try {
    const corps = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: SCOPE,
    });

    const reponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: corps.toString(),
      signal: controleur.signal,
      cache: "no-store",
    });

    const texte = await reponse.text();

    let donnees: Record<string, unknown> = {};

    try {
      donnees = texte
        ? (JSON.parse(texte) as Record<
            string,
            unknown
          >)
        : {};
    } catch {
      donnees = {};
    }

    const accessToken =
      typeof donnees.access_token === "string"
        ? donnees.access_token
        : "";

    if (reponse.ok && accessToken) {
      return {
        ok: true,
        codeHttp: reponse.status,
        message:
          "Connexion OAuth2 réussie. Les identifiants Urssaf sont valides.",
        expirationSecondes:
          typeof donnees.expires_in === "number"
            ? donnees.expires_in
            : null,
      };
    }

    const messageApi =
      nettoyerMessage(donnees.error_description) ||
      nettoyerMessage(donnees.message) ||
      nettoyerMessage(donnees.error);

    return {
      ok: false,
      codeHttp: reponse.status,
      message:
        messageApi ||
        `Connexion refusée par l’Urssaf avec le code HTTP ${reponse.status}.`,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return {
        ok: false,
        codeHttp: 504,
        message:
          "Le service Urssaf n’a pas répondu dans le délai prévu.",
      };
    }

    return {
      ok: false,
      codeHttp: 503,
      message:
        error instanceof Error
          ? nettoyerMessage(error.message)
          : "Impossible de joindre le service Urssaf.",
    };
  } finally {
    clearTimeout(temporisation);
  }
}

async function journaliser(
  supabaseAdmin: ReturnType<
    typeof creerSupabaseAdmin
  >,
  entrepriseId: string,
  action: string,
  ressourceId: string | null,
  resultat: "succes" | "echec",
  description: string,
  details: Record<string, unknown>
) {
  const { error } = await supabaseAdmin.rpc(
    "arboboard_ecrire_journal",
    {
      p_entreprise_id: entrepriseId,
      p_action: action,
      p_categorie: "securite",
      p_ressource_type: "integration_urssaf_tp",
      p_ressource_id: ressourceId,
      p_resultat: resultat,
      p_description: description,
      p_details: details,
    }
  );

  if (error) {
    console.warn(
      "Journalisation Urssaf impossible :",
      error
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authentification =
      await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const { supabaseAdmin, profil } =
      authentification;

    const entrepriseId = profil.entreprise_id;

    if (!entrepriseId) {
      return NextResponse.json(
        { erreur: "Entreprise introuvable." },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("integrations_urssaf_tp")
      .select(
        "id, numero_sap, client_id_suffixe, scope_oauth, actif, statut, derniere_verification_at, dernier_code_http, dernier_message, created_at, updated_at"
      )
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({
        configuration: null,
      });
    }

    return NextResponse.json({
      configuration: {
        ...data,
        client_id_masque: masquerClientId(
          data.client_id_suffixe
        ),
      },
    });
  } catch (error) {
    console.error(
      "Erreur lecture intégration Urssaf :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger la configuration Urssaf.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authentification =
      await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const { supabaseAdmin, profil } =
      authentification;

    const entrepriseId = profil.entreprise_id;

    if (!entrepriseId) {
      return NextResponse.json(
        { erreur: "Entreprise introuvable." },
        { status: 403 }
      );
    }

    const corps =
      (await request.json()) as CorpsConfiguration;

    const numeroSap =
      typeof corps.numero_sap === "string"
        ? corps.numero_sap
            .replace(/\s+/g, "")
            .toUpperCase()
        : "";

    if (!/^SAP\d{9}$/.test(numeroSap)) {
      return NextResponse.json(
        {
          erreur:
            "Le numéro SAP doit être composé de SAP suivi des 9 chiffres du SIREN.",
        },
        { status: 400 }
      );
    }

    const clientIdSaisi =
      typeof corps.client_id === "string"
        ? corps.client_id.trim()
        : "";

    const clientSecretSaisi =
      typeof corps.client_secret === "string"
        ? corps.client_secret.trim()
        : "";

    const {
      data: configurationExistante,
      error: configurationError,
    } = await supabaseAdmin
      .from("integrations_urssaf_tp")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (configurationError) {
      throw configurationError;
    }

    const existante =
      configurationExistante as
        | ConfigurationUrssaf
        | null;

    let clientId = clientIdSaisi;
    let clientSecret = clientSecretSaisi;

    if (!clientId && existante) {
      clientId = dechiffrerIdentifiant(
        existante.client_id_chiffre
      );
    }

    if (!clientSecret && existante) {
      clientSecret = dechiffrerIdentifiant(
        existante.client_secret_chiffre
      );
    }

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          erreur:
            "Le Client ID et le Client Secret remis par l’Urssaf sont obligatoires.",
        },
        { status: 400 }
      );
    }

    if (
      clientId.length > 300 ||
      clientSecret.length > 500
    ) {
      return NextResponse.json(
        {
          erreur:
            "Les identifiants Urssaf dépassent la taille autorisée.",
        },
        { status: 400 }
      );
    }

    const resultatTest =
      await testerIdentifiants(
        clientId,
        clientSecret
      );

    const maintenant = new Date().toISOString();

    const payload = {
      entreprise_id: entrepriseId,
      numero_sap: numeroSap,
      client_id_chiffre:
        chiffrerIdentifiant(clientId),
      client_secret_chiffre:
        chiffrerIdentifiant(clientSecret),
      client_id_suffixe:
        clientId.slice(-6) || null,
      scope_oauth: SCOPE,
      actif: true,
      statut: resultatTest.ok
        ? "connectee"
        : "erreur",
      derniere_verification_at: maintenant,
      dernier_code_http:
        resultatTest.codeHttp,
      dernier_message:
        resultatTest.message.slice(0, 1000),
      updated_by: profil.id,
      updated_at: maintenant,
      ...(existante
        ? {}
        : {
            created_by: profil.id,
            created_at: maintenant,
          }),
    };

    const { data, error } = await supabaseAdmin
      .from("integrations_urssaf_tp")
      .upsert(payload, {
        onConflict: "entreprise_id",
      })
      .select(
        "id, numero_sap, client_id_suffixe, scope_oauth, actif, statut, derniere_verification_at, dernier_code_http, dernier_message, created_at, updated_at"
      )
      .single();

    if (error) throw error;

    await journaliser(
      supabaseAdmin,
      entrepriseId,
      resultatTest.ok
        ? "integration_urssaf_connectee"
        : "integration_urssaf_connexion_echec",
      data.id,
      resultatTest.ok ? "succes" : "echec",
      resultatTest.ok
        ? "Configuration et test réussis de l’API Tiers de prestation Urssaf."
        : "Configuration enregistrée mais test de connexion Urssaf en échec.",
      {
        numero_sap: numeroSap,
        code_http: resultatTest.codeHttp,
        scope: SCOPE,
      }
    );

    return NextResponse.json({
      succes: true,
      connexion_ok: resultatTest.ok,
      configuration: {
        ...data,
        client_id_masque: masquerClientId(
          data.client_id_suffixe
        ),
      },
      message: resultatTest.message,
    });
  } catch (error) {
    console.error(
      "Erreur configuration Urssaf :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer la configuration Urssaf.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authentification =
      await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const { supabaseAdmin, profil } =
      authentification;

    const entrepriseId = profil.entreprise_id;

    if (!entrepriseId) {
      return NextResponse.json(
        { erreur: "Entreprise introuvable." },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("integrations_urssaf_tp")
      .delete()
      .eq("entreprise_id", entrepriseId)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    await journaliser(
      supabaseAdmin,
      entrepriseId,
      "integration_urssaf_supprimee",
      data?.id || null,
      "succes",
      "Suppression de la configuration de l’API Tiers de prestation Urssaf.",
      {}
    );

    return NextResponse.json({
      succes: true,
    });
  } catch (error) {
    console.error(
      "Erreur suppression intégration Urssaf :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer la configuration Urssaf.",
      },
      { status: 500 }
    );
  }
}