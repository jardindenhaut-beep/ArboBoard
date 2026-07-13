import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
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
  email?: string | null;
  nom?: string | null;
  prenom?: string | null;
};

type PhotoBase = PhotoPv & {
  url?: string | null;
  storage_path?: string | null;
};

type HistoriqueEmailParams = {
  supabaseAdmin: SupabaseAdminClient;
  entrepriseId: string;
  ficheId: string;
  pvId: string | null;
  destinataireEmail: string;
  sujet: string;
  message: string;
  statut: "envoye" | "erreur";
  resendEmailId?: string | null;
  erreur?: string | null;
  envoyePar?: string | null;
};

function reponseJson(
  contenu: Record<string, unknown>,
  statut = 200
) {
  return NextResponse.json(contenu, {
    status: statut,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function reponseErreur(message: string, statut = 400) {
  return reponseJson(
    {
      error: message,
      erreur: message,
    },
    statut
  );
}

function nettoyerEmail(email: unknown) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

function emailValide(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normaliserRole(role: string | null | undefined) {
  return String(role || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function roleAutorise(role: string | null | undefined) {
  return [
    "chef",
    "admin",
    "administrateur",
    "gerant",
    "dirigeant",
    "patron",
  ].includes(normaliserRole(role));
}

function echapperHtml(texte: string) {
  return texte
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function texteVersHtml(texte: string) {
  return echapperHtml(texte).replaceAll("\n", "<br />");
}

function nomProfil(
  profil: ProfilUtilisateur | null,
  emailUtilisateur?: string | null
) {
  if (!profil) return emailUtilisateur || "Arboboard";

  const complet = `${profil.prenom || ""} ${profil.nom || ""}`.trim();

  return (
    complet ||
    profil.email ||
    emailUtilisateur ||
    "Arboboard"
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

function estUrlExterne(valeur: string | null | undefined) {
  return /^(https?:\/\/|data:)/i.test(String(valeur || ""));
}

function nettoyerCheminStorage(valeur: string | null | undefined) {
  return String(valeur || "")
    .trim()
    .replace(/^\/+/, "");
}

async function lireCorpsJson(request: NextRequest) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function enregistrerHistoriqueEmail({
  supabaseAdmin,
  entrepriseId,
  ficheId,
  pvId,
  destinataireEmail,
  sujet,
  message,
  statut,
  resendEmailId = null,
  erreur = null,
  envoyePar = null,
}: HistoriqueEmailParams) {
  const { error } = await supabaseAdmin
    .from("pv_fin_chantier_emails")
    .insert({
      entreprise_id: entrepriseId,
      fiche_id: ficheId,
      pv_id: pvId,
      destinataire_email: destinataireEmail,
      sujet,
      message,
      statut,
      resend_email_id: resendEmailId,
      erreur,
      envoye_par: envoyePar,
    });

  if (error) {
    console.error(
      "Erreur insertion historique email PV :",
      error
    );
  }
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
    console.error("Erreur URL signée logo email PV :", error);
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
    console.error("Erreur URL signée photo email PV :", {
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

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail =
    process.env.RESEND_FROM_EMAIL ||
    "Arboboard <contact@arboboard.fr>";

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseServiceRoleKey
  ) {
    return reponseErreur(
      "Configuration Supabase serveur manquante.",
      500
    );
  }

  if (!resendApiKey) {
    return reponseErreur(
      "Configuration Resend manquante. Ajoutez RESEND_API_KEY dans les variables d’environnement.",
      500
    );
  }

  const authorization =
    request.headers.get("authorization") || "";

  const token = authorization
    .toLowerCase()
    .startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) {
    return reponseErreur(
      "Session absente. Veuillez vous reconnecter.",
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

  const supabaseAdmin: SupabaseAdminClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
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
      "Session invalide. Veuillez vous reconnecter.",
      401
    );
  }

  /*
   * select("*") évite de provoquer une erreur d’exécution si certaines
   * anciennes bases ne possèdent pas encore les colonnes nom, prénom ou email.
   */
  const { data: profilDataBrute, error: erreurProfil } =
    await supabaseAdmin
      .from("profils_utilisateurs")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

  const profil =
    (profilDataBrute || null) as ProfilUtilisateur | null;

  if (erreurProfil || !profil?.entreprise_id) {
    return reponseErreur(
      "Profil utilisateur introuvable. Impossible de vérifier les droits.",
      403
    );
  }

  if (!roleAutorise(profil.role)) {
    return reponseErreur(
      "Action refusée. Seul un chef, administrateur ou gérant peut envoyer le PV au client.",
      403
    );
  }

  const entrepriseId = String(profil.entreprise_id);
  const corps = await lireCorpsJson(request);

  if (!corps) {
    return reponseErreur("Requête invalide.", 400);
  }

  const ficheId =
    typeof corps.ficheId === "string"
      ? corps.ficheId.trim()
      : typeof corps.fiche_id === "string"
        ? corps.fiche_id.trim()
        : "";

  const pvId =
    typeof corps.pvId === "string"
      ? corps.pvId.trim()
      : typeof corps.pv_id === "string"
        ? corps.pv_id.trim()
        : "";

  const destinataireEmail =
    nettoyerEmail(corps.destinataireEmail) ||
    nettoyerEmail(corps.emailDestinataire) ||
    nettoyerEmail(corps.clientEmail) ||
    nettoyerEmail(corps.email) ||
    nettoyerEmail(corps.destinataire_email);

  const messagePersonnalise =
    typeof corps.message === "string"
      ? corps.message.trim()
      : "";

  if (!ficheId || ficheId.length > 200) {
    return reponseErreur(
      "Fiche intervention manquante ou invalide.",
      400
    );
  }

  if (!destinataireEmail) {
    return reponseErreur(
      "Email destinataire manquant.",
      400
    );
  }

  if (!emailValide(destinataireEmail)) {
    return reponseErreur(
      "L’adresse email du destinataire n’est pas valide.",
      400
    );
  }

  const { data: ficheDataBrute, error: erreurFiche } =
    await supabaseAdmin
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("id", ficheId)
      .maybeSingle();

  const ficheData =
    (ficheDataBrute || null) as FichePvPdf | null;

  if (erreurFiche) {
    console.error(
      "Erreur chargement fiche pour email PV :",
      erreurFiche
    );

    return reponseErreur(
      "Impossible de vérifier la fiche intervention.",
      500
    );
  }

  if (!ficheData) {
    return reponseErreur(
      "Fiche intervention introuvable ou non rattachée à votre entreprise.",
      404
    );
  }

  let requetePv = supabaseAdmin
    .from("pv_fin_chantier")
    .select("*")
    .eq("entreprise_id", entrepriseId)
    .eq("fiche_id", ficheId);

  if (pvId) {
    requetePv = requetePv.eq("id", pvId);
  }

  const { data: pvDataBrute, error: erreurPv } =
    await requetePv
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  const pvData =
    (pvDataBrute || null) as PvFinChantierPdf | null;

  if (erreurPv) {
    console.error(
      "Erreur chargement PV pour email :",
      erreurPv
    );

    return reponseErreur(
      "Impossible de charger le PV de fin de chantier.",
      500
    );
  }

  if (!pvData) {
    return reponseErreur(
      "PV de fin de chantier introuvable. Enregistrez le PV avant de l’envoyer.",
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
    return reponseErreur(
      elementsResult.error.message ||
        "Impossible de charger les éléments de la fiche.",
      500
    );
  }

  if (photosResult.error) {
    return reponseErreur(
      photosResult.error.message ||
        "Impossible de charger les photos du chantier.",
      500
    );
  }

  if (equipeResult.error) {
    return reponseErreur(
      equipeResult.error.message ||
        "Impossible de charger l’équipe du chantier.",
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

  const nomEntreprise =
    entreprise?.nom_entreprise || "Arboboard";

  const sujet = `PV de fin de chantier${
    ficheData.numero ? ` - ${ficheData.numero}` : ""
  }`;

  const message =
    messagePersonnalise ||
    `Bonjour,

Veuillez trouver en pièce jointe le procès-verbal de fin de chantier concernant l’intervention ${
      ficheData.titre ||
      ficheData.type_intervention ||
      ""
    }.

Cordialement,
${nomEntreprise}`;

  try {
    const documentPdf = React.createElement(
      PvFinChantierDocument as React.ComponentType<any>,
      {
        entreprise,
        fiche: ficheData,
        pv: pvData,
        elements:
          (elementsResult.data || []) as ElementFichePv[],
        photos: photosAvecUrls as PhotoPv[],
        equipe:
          (equipeResult.data || []) as SalariePv[],
      }
    );

    const pdfBuffer = await renderToBuffer(
      documentPdf as any
    );

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error(
        "Le fichier PDF généré est vide."
      );
    }

    const nomBase = nettoyerNomFichier(
      `pv-fin-chantier-${
        ficheData.numero || ficheData.id
      }`
    );

    const resend = new Resend(resendApiKey);

    const resultatEmail = await resend.emails.send({
      from: resendFromEmail,
      to: [destinataireEmail],
      subject: sujet,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <p>${texteVersHtml(message)}</p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

          <p style="font-size: 12px; color: #64748b;">
            Ce message et sa pièce jointe ont été envoyés depuis Arboboard.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `${nomBase}.pdf`,
          content: Buffer.from(pdfBuffer).toString("base64"),
        },
      ],
    });

    if (resultatEmail.error) {
      await enregistrerHistoriqueEmail({
        supabaseAdmin,
        entrepriseId,
        ficheId,
        pvId: pvData.id || null,
        destinataireEmail,
        sujet,
        message,
        statut: "erreur",
        resendEmailId: null,
        erreur:
          resultatEmail.error.message ||
          "Resend a refusé l’envoi.",
        envoyePar: profil.id,
      });

      return reponseErreur(
        resultatEmail.error.message ||
          "Resend a refusé l’envoi de l’email.",
        500
      );
    }

    const dateEnvoi = new Date().toISOString();

    const { error: erreurMiseAJourPv } =
      await supabaseAdmin
        .from("pv_fin_chantier")
        .update({
          envoye_client_at: dateEnvoi,
          envoye_client_email: destinataireEmail,
          client_email:
            pvData.client_email || destinataireEmail,
          updated_at: dateEnvoi,
        })
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .eq("id", pvData.id);

    if (erreurMiseAJourPv) {
      console.error(
        "Email envoyé, mais mise à jour du PV impossible :",
        erreurMiseAJourPv
      );
    }

    await enregistrerHistoriqueEmail({
      supabaseAdmin,
      entrepriseId,
      ficheId,
      pvId: pvData.id || null,
      destinataireEmail,
      sujet,
      message,
      statut: "envoye",
      resendEmailId:
        resultatEmail.data?.id || null,
      erreur: null,
      envoyePar: profil.id,
    });

    return reponseJson({
      succes: true,
      message: `PV envoyé avec succès à ${destinataireEmail}.`,
      emailId: resultatEmail.data?.id || null,
      destinataireEmail,
      envoyePar: nomProfil(profil, user.email),
    });
  } catch (error: unknown) {
    console.error(
      "Erreur envoi email PV fin chantier :",
      error
    );

    const messageErreur =
      error instanceof Error
        ? error.message
        : "Erreur inconnue pendant l’envoi.";

    await enregistrerHistoriqueEmail({
      supabaseAdmin,
      entrepriseId,
      ficheId,
      pvId: pvData.id || null,
      destinataireEmail,
      sujet,
      message,
      statut: "erreur",
      resendEmailId: null,
      erreur: messageErreur,
      envoyePar: profil.id,
    });

    return reponseErreur(
      messageErreur ||
        "Impossible de générer ou d’envoyer le PV de fin de chantier.",
      500
    );
  }
}