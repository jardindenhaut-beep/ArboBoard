import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { chargerParametresEntrepriseDocument } from "@/lib/documents/chargerParametresEntreprise";
import {
  PvFinChantierDocument,
  type ElementFichePv,
  type FichePvPdf,
  type ParametresEntreprisePv,
  type PhotoPv,
  type PvFinChantierPdf,
  type SalariePv,
} from "../../../../../lib/interventions/genererPdfPvFinChantier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupabaseAdminClient = any;

type ProfilUtilisateur = {
  id: string;
  entreprise_id: string | null;
  role: string | null;
};

type SalarieUtilisateur = {
  id: string;
};

type FicheAcces = FichePvPdf & {
  salarie_id?: string | null;
};

type PhotoBase = PhotoPv & {
  url?: string | null;
  storage_path?: string | null;
};

function reponseErreur(message: string, statut = 400) {
  return Response.json(
    {
      error: message,
      erreur: message,
    },
    {
      status: statut,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function nettoyerNomFichier(valeur: string) {
  const nom = valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return nom || "pv-fin-chantier";
}

function normaliserRole(role: string | null | undefined) {
  return String(role || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function roleDirection(role: string | null | undefined) {
  const roleNormalise = normaliserRole(role);

  return [
    "admin",
    "administrateur",
    "chef",
    "gerant",
    "dirigeant",
    "patron",
  ].includes(roleNormalise);
}

function estUrlExterne(valeur: string | null | undefined) {
  return /^(https?:\/\/|data:)/i.test(String(valeur || ""));
}

function nettoyerCheminStorage(valeur: string | null | undefined) {
  return String(valeur || "")
    .trim()
    .replace(/^\/+/, "");
}

async function lireCorpsJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function trouverSalarieConnecte({
  supabaseAdmin,
  entrepriseId,
  userId,
  email,
}: {
  supabaseAdmin: SupabaseAdminClient;
  entrepriseId: string;
  userId: string;
  email: string | null | undefined;
}): Promise<SalarieUtilisateur | null> {
  const { data: salarieParIdentifiantsData, error: erreurIdentifiants } =
    await supabaseAdmin
      .from("salaries")
      .select("id")
      .eq("entreprise_id", entrepriseId)
      .or(`user_id.eq.${userId},profil_id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

  const salarieParIdentifiants =
    (salarieParIdentifiantsData || null) as SalarieUtilisateur | null;

  if (!erreurIdentifiants && salarieParIdentifiants?.id) {
    return salarieParIdentifiants;
  }

  if (!email) {
    return null;
  }

  const { data: salarieParEmailData, error: erreurEmail } =
    await supabaseAdmin
      .from("salaries")
      .select("id")
      .eq("entreprise_id", entrepriseId)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

  const salarieParEmail =
    (salarieParEmailData || null) as SalarieUtilisateur | null;

  if (erreurEmail || !salarieParEmail?.id) {
    return null;
  }

  return salarieParEmail;
}

async function verifierAccesSalarie({
  supabaseAdmin,
  entrepriseId,
  ficheId,
  ficheSalarieId,
  userId,
  email,
}: {
  supabaseAdmin: SupabaseAdminClient;
  entrepriseId: string;
  ficheId: string;
  ficheSalarieId: string | null | undefined;
  userId: string;
  email: string | null | undefined;
}) {
  const salarie = await trouverSalarieConnecte({
    supabaseAdmin,
    entrepriseId,
    userId,
    email,
  });

  if (!salarie?.id) {
    return false;
  }

  if (ficheSalarieId === salarie.id) {
    return true;
  }

  const { data: affectationData, error: erreurAffectation } =
    await supabaseAdmin
      .from("fiches_intervention_salaries")
      .select("id")
      .eq("entreprise_id", entrepriseId)
      .eq("fiche_id", ficheId)
      .eq("salarie_id", salarie.id)
      .limit(1)
      .maybeSingle();

  const affectation =
    (affectationData || null) as { id: string } | null;

  return !erreurAffectation && Boolean(affectation?.id);
}

async function rendreLogoAccessible({
  supabaseAdmin,
  entreprise,
}: {
  supabaseAdmin: SupabaseAdminClient;
  entreprise: ParametresEntreprisePv | null;
}) {
  if (!entreprise?.logo_url || estUrlExterne(entreprise.logo_url)) {
    return entreprise;
  }

  const chemin = nettoyerCheminStorage(entreprise.logo_url);

  if (!chemin) {
    return entreprise;
  }

  const { data, error } = await supabaseAdmin.storage
    .from("logos-entreprises")
    .createSignedUrl(chemin, 60 * 30);

  if (error || !data?.signedUrl) {
    console.error("Erreur URL signée logo PV :", error);
    return entreprise;
  }

  return {
    ...entreprise,
    logo_url: data.signedUrl,
  };
}

async function ajouterUrlSigneePhoto({
  supabaseAdmin,
  photo,
}: {
  supabaseAdmin: SupabaseAdminClient;
  photo: PhotoBase;
}) {
  const valeurUrl = photo.url || null;

  if (!photo.storage_path && estUrlExterne(valeurUrl)) {
    return {
      ...photo,
      signed_url: valeurUrl,
    };
  }

  const chemin = nettoyerCheminStorage(photo.storage_path || valeurUrl);

  if (!chemin) {
    return {
      ...photo,
      signed_url: null,
    };
  }

  const { data, error } = await supabaseAdmin.storage
    .from("interventions-photos")
    .createSignedUrl(chemin, 60 * 30);

  if (error || !data?.signedUrl) {
    console.error("Erreur URL signée photo PV :", {
      photoId: photo.id,
      chemin,
      erreur: error,
    });

    return {
      ...photo,
      signed_url: null,
    };
  }

  return {
    ...photo,
    signed_url: data.signedUrl,
  };
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return reponseErreur(
        "Configuration Supabase serveur manquante.",
        500
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return reponseErreur("Utilisateur non authentifié.", 401);
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
      error: erreurUser,
    } = await supabaseAuth.auth.getUser(token);

    if (erreurUser || !user) {
      return reponseErreur("Session utilisateur invalide.", 401);
    }

    const corps = await lireCorpsJson(request);

    if (!corps) {
      return reponseErreur("Corps de requête invalide.", 400);
    }

    const ficheId =
      typeof corps.ficheId === "string" ? corps.ficheId.trim() : "";

    if (!ficheId || ficheId.length > 200) {
      return reponseErreur(
        "Identifiant de fiche manquant ou invalide.",
        400
      );
    }

    const supabaseAdmin: SupabaseAdminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data: profilData, error: erreurProfil } =
      await supabaseAdmin
        .from("profils_utilisateurs")
        .select("id, entreprise_id, role")
        .eq("id", user.id)
        .maybeSingle();

    const profil =
      (profilData || null) as ProfilUtilisateur | null;

    if (erreurProfil || !profil?.entreprise_id) {
      return reponseErreur("Profil utilisateur introuvable.", 403);
    }

    const entrepriseId = profil.entreprise_id;

    const { data: ficheDataBrute, error: erreurFiche } =
      await supabaseAdmin
        .from("fiches_intervention")
        .select("*")
        .eq("id", ficheId)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

    const ficheData =
      (ficheDataBrute || null) as FicheAcces | null;

    if (erreurFiche) {
      console.error("Erreur chargement fiche PDF PV :", erreurFiche);

      return reponseErreur(
        "Impossible de vérifier la fiche d’intervention.",
        500
      );
    }

    if (!ficheData) {
      return reponseErreur(
        "Fiche d’intervention introuvable.",
        404
      );
    }

    if (!roleDirection(profil.role)) {
      const accesAutorise = await verifierAccesSalarie({
        supabaseAdmin,
        entrepriseId,
        ficheId,
        ficheSalarieId: ficheData.salarie_id,
        userId: user.id,
        email: user.email,
      });

      if (!accesAutorise) {
        return reponseErreur(
          "Vous n’êtes pas affecté à cette intervention.",
          403
        );
      }
    }

    const { data: pvDataBrute, error: erreurPv } =
      await supabaseAdmin
        .from("pv_fin_chantier")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const pvData =
      (pvDataBrute || null) as PvFinChantierPdf | null;

    if (erreurPv) {
      console.error("Erreur chargement PV pour PDF :", erreurPv);

      return reponseErreur(
        "Impossible de charger le PV de fin de chantier.",
        500
      );
    }

    if (!pvData) {
      return reponseErreur(
        "PV de fin de chantier introuvable.",
        404
      );
    }

    const [
      parametresEntrepriseBruts,
      elementsResult,
      photosResult,
      equipeResult,
    ] = await Promise.all([
      chargerParametresEntrepriseDocument(entrepriseId),

      supabaseAdmin
        .from("fiches_intervention_elements")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .order("ordre", { ascending: true }),

      supabaseAdmin
        .from("fiches_intervention_photos")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .order("created_at", { ascending: true }),

      supabaseAdmin
        .from("fiches_intervention_salaries")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .order("created_at", { ascending: true }),
    ]);

    if (elementsResult.error) {
      console.error(
        "Erreur chargement éléments PDF PV :",
        elementsResult.error
      );

      return reponseErreur(
        elementsResult.error.message ||
          "Impossible de charger les éléments de la fiche.",
        500
      );
    }

    if (photosResult.error) {
      console.error(
        "Erreur chargement photos PDF PV :",
        photosResult.error
      );

      return reponseErreur(
        photosResult.error.message ||
          "Impossible de charger les photos.",
        500
      );
    }

    if (equipeResult.error) {
      console.error(
        "Erreur chargement équipe PDF PV :",
        equipeResult.error
      );

      return reponseErreur(
        equipeResult.error.message ||
          "Impossible de charger l’équipe.",
        500
      );
    }

    const entreprise = await rendreLogoAccessible({
      supabaseAdmin,
      entreprise:
        (parametresEntrepriseBruts as ParametresEntreprisePv | null) ||
        null,
    });

    const photosAvecUrls = await Promise.all(
      ((photosResult.data || []) as PhotoBase[]).map((photo) =>
        ajouterUrlSigneePhoto({
          supabaseAdmin,
          photo,
        })
      )
    );

    const propsDocument = {
      entreprise,
      fiche: ficheData as FichePvPdf,
      pv: pvData,
      elements: (elementsResult.data || []) as ElementFichePv[],
      photos: photosAvecUrls as PhotoPv[],
      equipe: (equipeResult.data || []) as SalariePv[],
    };

    const documentPdf = React.createElement(
      PvFinChantierDocument as React.ComponentType<any>,
      propsDocument
    );

    const buffer = await renderToBuffer(documentPdf as any);

    if (!buffer || buffer.length === 0) {
      return reponseErreur(
        "Le fichier PDF généré est vide.",
        500
      );
    }

    const nomBase = nettoyerNomFichier(
      `pv-fin-chantier-${ficheData.numero || ficheData.id}`
    );

    const nomEncode = encodeURIComponent(`${nomBase}.pdf`);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="${nomBase}.pdf"; ` +
          `filename*=UTF-8''${nomEncode}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error(
      "Erreur génération PDF PV fin chantier :",
      error
    );

    return reponseErreur(
      error instanceof Error
        ? error.message
        : "Impossible de générer le PDF du PV.",
      500
    );
  }
}