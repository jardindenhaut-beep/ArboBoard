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
} from "@/lib/interventions/genererPdfPvFinChantier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOMBRE_MAX_PHOTOS_A_SIGNER = 12;

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
  pv_fin_chantier_id?: string | null;
};

type PhotoBase = PhotoPv & {
  url?: string | null;
  storage_path?: string | null;
};

function reponseErreur(message: string, statut = 400) {
  return Response.json(
    {
      succes: false,
      error: message,
      erreur: message,
    },
    {
      status: statut,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
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
  return [
    "admin",
    "administrateur",
    "chef",
    "gerant",
    "dirigeant",
    "patron",
  ].includes(normaliserRole(role));
}

function estUrlExterne(valeur: string | null | undefined) {
  return /^(https?:\/\/|data:)/i.test(String(valeur || ""));
}

function nettoyerCheminStorage(valeur: string | null | undefined) {
  return String(valeur || "")
    .trim()
    .replace(/^\/+/, "");
}

function extraireJeton(request: Request) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
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
  /*
   * Certaines anciennes bases peuvent ne pas encore posséder user_id
   * ou profil_id. Une erreur sur cette première recherche ne doit donc
   * pas empêcher la tentative de correspondance par email.
   */
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

  const emailNettoye = String(email || "").trim();

  if (!emailNettoye) {
    return null;
  }

  const { data: salarieParEmailData, error: erreurEmail } =
    await supabaseAdmin
      .from("salaries")
      .select("id")
      .eq("entreprise_id", entrepriseId)
      .ilike("email", emailNettoye)
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

  const chemin = nettoyerCheminStorage(
    photo.storage_path || valeurUrl
  );

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

async function preparerPhotos({
  supabaseAdmin,
  photos,
}: {
  supabaseAdmin: SupabaseAdminClient;
  photos: PhotoBase[];
}) {
  return Promise.all(
    photos.map((photo, index) => {
      if (index >= NOMBRE_MAX_PHOTOS_A_SIGNER) {
        return Promise.resolve({
          ...photo,
          signed_url: null,
        });
      }

      return ajouterUrlSigneePhoto({
        supabaseAdmin,
        photo,
      });
    })
  );
}

function bufferEstPdf(buffer: Buffer) {
  if (!buffer || buffer.length < 5) {
    return false;
  }

  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

async function chargerPv({
  supabaseAdmin,
  entrepriseId,
  ficheId,
  pvIdDemande,
  pvIdFiche,
}: {
  supabaseAdmin: SupabaseAdminClient;
  entrepriseId: string;
  ficheId: string;
  pvIdDemande: string;
  pvIdFiche: string | null | undefined;
}) {
  const pvIdCible = pvIdDemande || String(pvIdFiche || "").trim();

  if (pvIdCible) {
    return supabaseAdmin
      .from("pv_fin_chantier")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("fiche_id", ficheId)
      .eq("id", pvIdCible)
      .maybeSingle();
  }

  return supabaseAdmin
    .from("pv_fin_chantier")
    .select("*")
    .eq("entreprise_id", entrepriseId)
    .eq("fiche_id", ficheId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
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

    const token = extraireJeton(request);

    if (!token) {
      return reponseErreur(
        "Utilisateur non authentifié. Veuillez vous reconnecter.",
        401
      );
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const {
      data: { user },
      error: erreurUtilisateur,
    } = await supabaseAuth.auth.getUser(token);

    if (erreurUtilisateur || !user) {
      return reponseErreur(
        "Session utilisateur invalide. Veuillez vous reconnecter.",
        401
      );
    }

    const corps = await lireCorpsJson(request);

    if (!corps) {
      return reponseErreur("Corps de requête invalide.", 400);
    }

    const ficheId =
      typeof corps.ficheId === "string"
        ? corps.ficheId.trim()
        : typeof corps.fiche_id === "string"
          ? corps.fiche_id.trim()
          : "";

    const pvIdDemande =
      typeof corps.pvId === "string"
        ? corps.pvId.trim()
        : typeof corps.pv_id === "string"
          ? corps.pv_id.trim()
          : "";

    if (!ficheId || ficheId.length > 200) {
      return reponseErreur(
        "Identifiant de fiche manquant ou invalide.",
        400
      );
    }

    if (pvIdDemande.length > 200) {
      return reponseErreur(
        "Identifiant de PV invalide.",
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
      return reponseErreur(
        "Profil utilisateur introuvable. Impossible de vérifier vos droits.",
        403
      );
    }

    const entrepriseId = String(profil.entreprise_id);

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
        "Fiche d’intervention introuvable ou non rattachée à votre entreprise.",
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

    const { data: pvDataBrute, error: erreurPv } = await chargerPv({
      supabaseAdmin,
      entrepriseId,
      ficheId,
      pvIdDemande,
      pvIdFiche: ficheData.pv_fin_chantier_id,
    });

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
        "PV de fin de chantier introuvable. Enregistrez le PV avant de le télécharger.",
        404
      );
    }

    let parametresEntrepriseBruts: ParametresEntreprisePv | null = null;
    let elementsResult: any;
    let photosResult: any;
    let equipeResult: any;

    try {
      [
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
    } catch (error) {
      console.error("Erreur préparation données PDF PV :", error);

      return reponseErreur(
        "Impossible de préparer les données du procès-verbal.",
        500
      );
    }

    if (elementsResult.error) {
      console.error(
        "Erreur chargement éléments PDF PV :",
        elementsResult.error
      );

      return reponseErreur(
        "Impossible de charger les travaux et le matériel de la fiche.",
        500
      );
    }

    if (photosResult.error) {
      console.error(
        "Erreur chargement photos PDF PV :",
        photosResult.error
      );

      return reponseErreur(
        "Impossible de charger les photos du chantier.",
        500
      );
    }

    if (equipeResult.error) {
      console.error(
        "Erreur chargement équipe PDF PV :",
        equipeResult.error
      );

      return reponseErreur(
        "Impossible de charger l’équipe affectée au chantier.",
        500
      );
    }

    const entreprise = await rendreLogoAccessible({
      supabaseAdmin,
      entreprise: parametresEntrepriseBruts || null,
    });

    const photosAvecUrls = await preparerPhotos({
      supabaseAdmin,
      photos: (photosResult.data || []) as PhotoBase[],
    });

    const documentPdf = React.createElement(
      PvFinChantierDocument as React.ComponentType<any>,
      {
        entreprise,
        fiche: ficheData as FichePvPdf,
        pv: pvData,
        elements: (elementsResult.data || []) as ElementFichePv[],
        photos: photosAvecUrls as PhotoPv[],
        equipe: (equipeResult.data || []) as SalariePv[],
      }
    );

    let bufferRendu: Buffer;

    try {
      const resultatRendu = await renderToBuffer(documentPdf as any);
      bufferRendu = Buffer.from(resultatRendu);
    } catch (error) {
      console.error("Erreur rendu React PDF du PV :", error);

      return reponseErreur(
        "Le procès-verbal n’a pas pu être mis en page.",
        500
      );
    }

    if (!bufferRendu.length) {
      return reponseErreur(
        "Le fichier PDF généré est vide.",
        500
      );
    }

    if (!bufferEstPdf(bufferRendu)) {
      console.error(
        "Le contenu généré ne possède pas la signature d’un fichier PDF."
      );

      return reponseErreur(
        "Le document généré n’est pas un PDF valide.",
        500
      );
    }

    const nomBase = nettoyerNomFichier(
      `pv-fin-chantier-${ficheData.numero || ficheData.id}`
    );

    const nomFichier = `${nomBase}.pdf`;
    const nomEncode = encodeURIComponent(nomFichier);

    return new Response(new Uint8Array(bufferRendu), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="${nomFichier}"; ` +
          `filename*=UTF-8''${nomEncode}`,
        "Content-Length": String(bufferRendu.length),
        "Cache-Control": "private, no-store, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (error: unknown) {
    console.error(
      "Erreur génération PDF PV fin chantier :",
      error
    );

    return reponseErreur(
      "Impossible de générer le PDF du PV de fin de chantier.",
      500
    );
  }
}