import React from "react";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  createClient,
} from "@supabase/supabase-js";
import {
  Resend,
} from "resend";
import {
  entetesLimiteRequetes,
  obtenirAdresseIp,
  verifierLimiteRequetes,
} from "@/lib/securite/limiteurRequetes";

import {
  chargerParametresEntrepriseDocument,
} from "@/lib/documents/chargerParametresEntreprise";
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

type PvFinChantierComplet =
  PvFinChantierPdf & {
    id: string;
    client_present?:
      | boolean
      | null;
    chantier_termine?:
      | boolean
      | null;
    reserves?:
      | string
      | null;
    signature_client?:
      | string
      | null;
    signature_entreprise?:
      | string
      | null;
    signataire_client_nom?:
      | string
      | null;
    signataire_entreprise_nom?:
      | string
      | null;
  };

type HistoriqueEmailParams = {
  supabaseAdmin:
    SupabaseAdminClient;
  entrepriseId: string;
  ficheId: string;
  pvId: string;
  destinataireEmail: string;
  sujet: string;
  message: string;
  statut:
    | "envoye"
    | "erreur";
  resendEmailId?:
    | string
    | null;
  erreur?:
    | string
    | null;
  envoyePar?:
    | string
    | null;
};

type ResultatHistorique = {
  succes: boolean;
  erreur:
    | string
    | null;
};

function reponseJson(
  contenu: Record<
    string,
    unknown
  >,
  statut = 200
) {
  return NextResponse.json(
    contenu,
    {
      status: statut,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

function reponseErreur(
  message: string,
  statut = 400
) {
  return reponseJson(
    {
      succes: false,
      error: message,
      erreur: message,
    },
    statut
  );
}

function nettoyerEmail(
  email: unknown
) {
  if (
    typeof email !==
    "string"
  ) {
    return "";
  }

  return email
    .trim()
    .toLowerCase();
}

function emailValide(
  email: string
) {
  if (
    !email ||
    email.length > 254
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function normaliserRole(
  role:
    | string
    | null
    | undefined
) {
  return String(role || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLowerCase();
}

function roleAutorise(
  role:
    | string
    | null
    | undefined
) {
  return [
    "chef",
    "admin",
    "administrateur",
    "gerant",
    "dirigeant",
    "patron",
  ].includes(
    normaliserRole(role)
  );
}

function echapperHtml(
  texte: string
) {
  return texte
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function texteVersHtml(
  texte: string
) {
  return echapperHtml(
    texte
  ).replaceAll(
    "\n",
    "<br />"
  );
}

function nomProfil(
  profil:
    | ProfilUtilisateur
    | null,
  emailUtilisateur?:
    | string
    | null
) {
  if (!profil) {
    return (
      emailUtilisateur ||
      "Arboboard"
    );
  }

  const complet =
    `${profil.prenom || ""} ${
      profil.nom || ""
    }`.trim();

  return (
    complet ||
    profil.email ||
    emailUtilisateur ||
    "Arboboard"
  );
}

function nettoyerNomFichier(
  valeur: string
) {
  const nom = valeur
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^-|-$/g,
      ""
    )
    .toLowerCase();

  return (
    nom ||
    "pv-fin-chantier"
  );
}

function estUrlExterne(
  valeur:
    | string
    | null
    | undefined
) {
  return /^(https?:\/\/|data:)/i.test(
    String(valeur || "")
  );
}

function nettoyerCheminStorage(
  valeur:
    | string
    | null
    | undefined
) {
  return String(
    valeur || ""
  )
    .trim()
    .replace(
      /^\/+/,
      ""
    );
}

function verifierPvComplet(
  pv: PvFinChantierComplet
) {
  if (
    !pv.id
  ) {
    return "Identifiant du PV introuvable.";
  }

  if (
    !String(
      pv.signataire_entreprise_nom ||
        ""
    ).trim()
  ) {
    return "Le nom du signataire de l’entreprise est manquant.";
  }

  if (
    !String(
      pv.signature_entreprise ||
        ""
    ).trim()
  ) {
    return "La signature de l’entreprise est manquante.";
  }

  const clientPresent =
    pv.client_present !==
    false;

  if (
    clientPresent &&
    !String(
      pv.signataire_client_nom ||
        ""
    ).trim()
  ) {
    return "Le nom du signataire client est manquant.";
  }

  if (
    clientPresent &&
    !String(
      pv.signature_client ||
        ""
    ).trim()
  ) {
    return "La signature du client est manquante.";
  }

  const chantierTermine =
    pv.chantier_termine !==
    false;

  if (
    !chantierTermine &&
    !String(
      pv.reserves || ""
    ).trim()
  ) {
    return "Un chantier non terminé doit comporter des réserves.";
  }

  return null;
}

async function lireCorpsJson(
  request: NextRequest
) {
  try {
    return (
      await request.json()
    ) as Record<
      string,
      unknown
    >;
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
}: HistoriqueEmailParams): Promise<ResultatHistorique> {
  const {
    error,
  } = await supabaseAdmin
    .from(
      "pv_fin_chantier_emails"
    )
    .insert({
      entreprise_id:
        entrepriseId,
      fiche_id: ficheId,
      pv_id: pvId,
      destinataire_email:
        destinataireEmail,
      sujet,
      message,
      statut,
      resend_email_id:
        resendEmailId,
      erreur,
      envoye_par:
        envoyePar,
    });

  if (error) {
    console.error(
      "Erreur insertion historique email PV :",
      error
    );

    return {
      succes: false,
      erreur:
        error.message ||
        "Impossible d’enregistrer l’historique de l’envoi.",
    };
  }

  return {
    succes: true,
    erreur: null,
  };
}

async function envoiRecentExiste({
  supabaseAdmin,
  entrepriseId,
  ficheId,
  pvId,
  destinataireEmail,
}: {
  supabaseAdmin:
    SupabaseAdminClient;
  entrepriseId: string;
  ficheId: string;
  pvId: string;
  destinataireEmail: string;
}) {
  const dateLimite =
    new Date(
      Date.now() -
        30_000
    ).toISOString();

  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "pv_fin_chantier_emails"
    )
    .select("id")
    .eq(
      "entreprise_id",
      entrepriseId
    )
    .eq(
      "fiche_id",
      ficheId
    )
    .eq(
      "pv_id",
      pvId
    )
    .eq(
      "destinataire_email",
      destinataireEmail
    )
    .eq(
      "statut",
      "envoye"
    )
    .gte(
      "created_at",
      dateLimite
    )
    .limit(1);

  if (error) {
    console.error(
      "Erreur vérification double envoi PV :",
      error
    );

    return false;
  }

  return Boolean(
    data &&
      data.length > 0
  );
}

async function rendreLogoAccessible({
  supabaseAdmin,
  entreprise,
}: {
  supabaseAdmin:
    SupabaseAdminClient;
  entreprise:
    | ParametresEntreprisePv
    | null;
}) {
  if (
    !entreprise?.logo_url ||
    estUrlExterne(
      entreprise.logo_url
    )
  ) {
    return entreprise;
  }

  const chemin =
    nettoyerCheminStorage(
      entreprise.logo_url
    );

  if (!chemin) {
    return entreprise;
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .storage
      .from(
        "logos-entreprises"
      )
      .createSignedUrl(
        chemin,
        60 * 30
      );

  if (
    error ||
    !data?.signedUrl
  ) {
    console.error(
      "Erreur URL signée logo email PV :",
      error
    );

    return entreprise;
  }

  return {
    ...entreprise,
    logo_url:
      data.signedUrl,
  };
}

async function ajouterUrlSigneePhoto({
  supabaseAdmin,
  photo,
}: {
  supabaseAdmin:
    SupabaseAdminClient;
  photo: PhotoBase;
}) {
  const valeurUrl =
    photo.url || null;

  if (
    !photo.storage_path &&
    estUrlExterne(valeurUrl)
  ) {
    return {
      ...photo,
      signed_url:
        valeurUrl,
    };
  }

  const chemin =
    nettoyerCheminStorage(
      photo.storage_path ||
        valeurUrl
    );

  if (!chemin) {
    return {
      ...photo,
      signed_url: null,
    };
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .storage
      .from(
        "interventions-photos"
      )
      .createSignedUrl(
        chemin,
        60 * 30
      );

  if (
    error ||
    !data?.signedUrl
  ) {
    console.error(
      "Erreur URL signée photo email PV :",
      {
        photoId:
          photo.id,
        chemin,
        erreur: error,
      }
    );

    return {
      ...photo,
      signed_url: null,
    };
  }

  return {
    ...photo,
    signed_url:
      data.signedUrl,
  };
}

export async function POST(
  request: NextRequest
) {
  const ip =
    obtenirAdresseIp(request);

  const limiteIp =
    verifierLimiteRequetes({
      cle: `email-pv:ip:${ip}`,
      limite: 30,
      fenetreMs:
        15 * 60 * 1000,
    });

  if (!limiteIp.autorise) {
    return NextResponse.json(
      {
        succes: false,
        error:
          "Trop de tentatives d’envoi de PV. Réessaie dans quelques minutes.",
        erreur:
          "Trop de tentatives d’envoi de PV. Réessaie dans quelques minutes.",
      },
      {
        status: 429,
        headers:
          entetesLimiteRequetes(
            limiteIp
          ),
      }
    );
  }

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseServiceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  const resendApiKey =
    process.env
      .RESEND_API_KEY;

  const resendFromEmail =
    process.env
      .RESEND_FROM_EMAIL ||
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
    request.headers.get(
      "authorization"
    ) || "";

  const token =
    authorization
      .toLowerCase()
      .startsWith(
        "bearer "
      )
      ? authorization
          .slice(7)
          .trim()
      : "";

  if (!token) {
    return reponseErreur(
      "Session absente. Veuillez vous reconnecter.",
      401
    );
  }

  const supabaseAuth =
    createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession:
            false,
          autoRefreshToken:
            false,
          detectSessionInUrl:
            false,
        },
      }
    );

  const supabaseAdmin:
    SupabaseAdminClient =
    createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession:
            false,
          autoRefreshToken:
            false,
          detectSessionInUrl:
            false,
        },
      }
    );

  const {
    data: {
      user,
    },
    error:
      erreurUtilisateur,
  } =
    await supabaseAuth
      .auth
      .getUser(token);

  if (
    erreurUtilisateur ||
    !user
  ) {
    return reponseErreur(
      "Session invalide. Veuillez vous reconnecter.",
      401
    );
  }

  const limiteUtilisateur =
    verifierLimiteRequetes({
      cle: `email-pv:user:${user.id}`,
      limite: 15,
      fenetreMs:
        60 * 60 * 1000,
    });

  if (
    !limiteUtilisateur.autorise
  ) {
    return NextResponse.json(
      {
        succes: false,
        error:
          "La limite horaire d’envoi de PV est atteinte. Réessaie plus tard.",
        erreur:
          "La limite horaire d’envoi de PV est atteinte. Réessaie plus tard.",
      },
      {
        status: 429,
        headers:
          entetesLimiteRequetes(
            limiteUtilisateur
          ),
      }
    );
  }

  const {
    data:
      profilDataBrute,
    error:
      erreurProfil,
  } =
    await supabaseAdmin
      .from(
        "profils_utilisateurs"
      )
      .select("id, role, statut, entreprise_id, email, nom, prenom")
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  const profil =
    (profilDataBrute ||
      null) as
      | ProfilUtilisateur
      | null;

  if (
    erreurProfil ||
    !profil?.entreprise_id
  ) {
    return reponseErreur(
      "Profil utilisateur introuvable. Impossible de vérifier les droits.",
      403
    );
  }

  if (
    !roleAutorise(
      profil.role
    )
  ) {
    return reponseErreur(
      "Action refusée. Seul un chef, administrateur ou gérant peut envoyer le PV au client.",
      403
    );
  }

  const entrepriseId =
    String(
      profil.entreprise_id
    );

  const corps =
    await lireCorpsJson(
      request
    );

  if (!corps) {
    return reponseErreur(
      "Requête invalide.",
      400
    );
  }

  const ficheId =
    typeof corps.ficheId ===
    "string"
      ? corps.ficheId.trim()
      : typeof corps.fiche_id ===
          "string"
        ? corps.fiche_id.trim()
        : "";

  const pvId =
    typeof corps.pvId ===
    "string"
      ? corps.pvId.trim()
      : typeof corps.pv_id ===
          "string"
        ? corps.pv_id.trim()
        : "";

  const destinataireEmail =
    nettoyerEmail(
      corps.destinataireEmail
    ) ||
    nettoyerEmail(
      corps.emailDestinataire
    ) ||
    nettoyerEmail(
      corps.clientEmail
    ) ||
    nettoyerEmail(
      corps.email
    ) ||
    nettoyerEmail(
      corps.destinataire_email
    );

  const messagePersonnalise =
    typeof corps.message ===
    "string"
      ? corps.message.trim()
      : "";

  if (
    !ficheId ||
    ficheId.length > 200
  ) {
    return reponseErreur(
      "Fiche intervention manquante ou invalide.",
      400
    );
  }

  if (
    !pvId ||
    pvId.length > 200
  ) {
    return reponseErreur(
      "PV de fin de chantier manquant ou invalide.",
      400
    );
  }

  if (
    !destinataireEmail
  ) {
    return reponseErreur(
      "Email destinataire manquant.",
      400
    );
  }

  if (
    !emailValide(
      destinataireEmail
    )
  ) {
    return reponseErreur(
      "L’adresse email du destinataire n’est pas valide.",
      400
    );
  }

  if (
    messagePersonnalise.length >
    5000
  ) {
    return reponseErreur(
      "Le message de l’email ne doit pas dépasser 5 000 caractères.",
      400
    );
  }

  const {
    data:
      ficheDataBrute,
    error:
      erreurFiche,
  } =
    await supabaseAdmin
      .from(
        "fiches_intervention"
      )
      .select("id, numero, client_id, client_nom, titre, type_intervention, date_prevue, date_intervention, heure_debut_prevue, heure_fin_prevue, heure_debut_reelle, heure_fin_reelle, adresse_chantier, code_postal_chantier, ville_chantier, adresse, code_postal, ville, notes_chantier, travaux_prevus, materiel_prevu, consignes_securite, salarie_id, pv_fin_chantier_id")
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .eq(
        "id",
        ficheId
      )
      .maybeSingle();

  const ficheData =
    (ficheDataBrute ||
      null) as
      | FichePvPdf
      | null;

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

  const {
    data:
      pvDataBrute,
    error:
      erreurPv,
  } =
    await supabaseAdmin
      .from(
        "pv_fin_chantier"
      )
      .select("id, entreprise_id, fiche_id, client_email, client_present, chantier_termine, reserves, commentaire_client, commentaire_entreprise, signataire_client_nom, signature_client, signataire_entreprise_nom, signature_entreprise, reserves_client, nom_signataire_client, signature_client_data_url, signe_client_at, nom_signataire_entreprise, signature_entreprise_data_url, signe_entreprise_at, envoye_client_at, envoye_client_email, created_at, updated_at")
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .eq(
        "fiche_id",
        ficheId
      )
      .eq(
        "id",
        pvId
      )
      .maybeSingle();

  const pvData =
    (pvDataBrute ||
      null) as
      | PvFinChantierComplet
      | null;

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

  const erreurPvIncomplet =
    verifierPvComplet(
      pvData
    );

  if (
    erreurPvIncomplet
  ) {
    return reponseErreur(
      `Le PV ne peut pas être envoyé : ${erreurPvIncomplet}`,
      400
    );
  }

  const doubleEnvoi =
    await envoiRecentExiste({
      supabaseAdmin,
      entrepriseId,
      ficheId,
      pvId:
        pvData.id,
      destinataireEmail,
    });

  if (doubleEnvoi) {
    return reponseErreur(
      "Un envoi identique vient déjà d’être effectué. Patientez quelques secondes avant de renvoyer le PV.",
      409
    );
  }

  let parametresEntrepriseBruts:
    | ParametresEntreprisePv
    | null = null;

  let elementsResult:
    any;

  let photosResult:
    any;

  let equipeResult:
    any;

  try {
    [
      parametresEntrepriseBruts,
      elementsResult,
      photosResult,
      equipeResult,
    ] =
      await Promise.all([
        chargerParametresEntrepriseDocument(
          entrepriseId
        ),

        supabaseAdmin
          .from(
            "fiches_intervention_elements"
          )
          .select("id, nom, categorie, icone, quantite_prevue, quantite_reelle, unite, commentaire_chef, commentaire_salarie, ordre")
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "fiche_id",
            ficheId
          )
          .order(
            "ordre",
            {
              ascending:
                true,
            }
          ),

        supabaseAdmin
          .from(
            "fiches_intervention_photos"
          )
          .select("id, categorie, commentaire, created_at, url, storage_path")
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "fiche_id",
            ficheId
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            }
          ),

        supabaseAdmin
          .from(
            "fiches_intervention_salaries"
          )
          .select("id, salarie_id, salarie_nom, role_chantier, heure_arrivee_prevue, heure_depart_prevue, heure_arrivee_reelle, heure_depart_reelle, created_at")
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "fiche_id",
            ficheId
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            }
          ),
      ]);
  } catch (error) {
    console.error(
      "Erreur préparation des données du PDF :",
      error
    );

    return reponseErreur(
      "Impossible de préparer les données nécessaires au PDF.",
      500
    );
  }

  if (
    elementsResult.error
  ) {
    return reponseErreur(
      elementsResult.error
        .message ||
        "Impossible de charger les éléments de la fiche.",
      500
    );
  }

  if (
    photosResult.error
  ) {
    return reponseErreur(
      photosResult.error
        .message ||
        "Impossible de charger les photos du chantier.",
      500
    );
  }

  if (
    equipeResult.error
  ) {
    return reponseErreur(
      equipeResult.error
        .message ||
        "Impossible de charger l’équipe du chantier.",
      500
    );
  }

  const entreprise =
    await rendreLogoAccessible({
      supabaseAdmin,
      entreprise:
        parametresEntrepriseBruts ||
        null,
    });

  const photosAvecUrls =
    await Promise.all(
      (
        (
          photosResult.data ||
          []
        ) as PhotoBase[]
      ).map((photo) =>
        ajouterUrlSigneePhoto({
          supabaseAdmin,
          photo,
        })
      )
    );

  const nomEntreprise =
    entreprise
      ?.nom_entreprise ||
    "Arboboard";

  const sujet =
    `PV de fin de chantier${
      ficheData.numero
        ? ` - ${ficheData.numero}`
        : ""
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
    const documentPdf =
      React.createElement(
        PvFinChantierDocument as React.ComponentType<any>,
        {
          entreprise,
          fiche:
            ficheData,
          pv:
            pvData,
          elements:
            (
              elementsResult.data ||
              []
            ) as ElementFichePv[],
          photos:
            photosAvecUrls as PhotoPv[],
          equipe:
            (
              equipeResult.data ||
              []
            ) as SalariePv[],
        }
      );

    const pdfBuffer =
      await renderToBuffer(
        documentPdf as any
      );

    if (
      !pdfBuffer ||
      pdfBuffer.length ===
        0
    ) {
      throw new Error(
        "Le fichier PDF généré est vide."
      );
    }

    const nomBase =
      nettoyerNomFichier(
        `pv-fin-chantier-${
          ficheData.numero ||
          ficheData.id
        }`
      );

    const resend =
      new Resend(
        resendApiKey
      );

    const resultatEmail =
      await resend.emails.send(
        {
          from:
            resendFromEmail,
          to: [
            destinataireEmail,
          ],
          subject: sujet,
          text: message,
          html: `
            <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
              <p>${texteVersHtml(
                message
              )}</p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

              <p style="font-size: 12px; color: #64748b;">
                Ce message et sa pièce jointe ont été envoyés depuis Arboboard.
              </p>
            </div>
          `,
          attachments: [
            {
              filename:
                `${nomBase}.pdf`,
              content:
                Buffer.from(
                  pdfBuffer
                ).toString(
                  "base64"
                ),
            },
          ],
        }
      );

    if (
      resultatEmail.error
    ) {
      const messageResend =
        resultatEmail.error
          .message ||
        "Resend a refusé l’envoi.";

      await enregistrerHistoriqueEmail({
        supabaseAdmin,
        entrepriseId,
        ficheId,
        pvId:
          pvData.id,
        destinataireEmail,
        sujet,
        message,
        statut:
          "erreur",
        resendEmailId:
          null,
        erreur:
          messageResend,
        envoyePar:
          profil.id,
      });

      return reponseErreur(
        messageResend,
        502
      );
    }

    const dateEnvoi =
      new Date().toISOString();

    const {
      error:
        erreurMiseAJourPv,
    } =
      await supabaseAdmin
        .from(
          "pv_fin_chantier"
        )
        .update({
          envoye_client_at:
            dateEnvoi,
          envoye_client_email:
            destinataireEmail,
          client_email:
            destinataireEmail,
          updated_at:
            dateEnvoi,
        })
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .eq(
          "fiche_id",
          ficheId
        )
        .eq(
          "id",
          pvData.id
        );

    const resultatHistorique =
      await enregistrerHistoriqueEmail({
        supabaseAdmin,
        entrepriseId,
        ficheId,
        pvId:
          pvData.id,
        destinataireEmail,
        sujet,
        message,
        statut:
          "envoye",
        resendEmailId:
          resultatEmail.data
            ?.id ||
          null,
        erreur: null,
        envoyePar:
          profil.id,
      });

    const avertissements:
      string[] = [];

    if (
      erreurMiseAJourPv
    ) {
      console.error(
        "Email envoyé, mais mise à jour du PV impossible :",
        erreurMiseAJourPv
      );

      avertissements.push(
        "L’email a été envoyé, mais la date d’envoi n’a pas pu être enregistrée sur le PV."
      );
    }

    if (
      !resultatHistorique.succes
    ) {
      avertissements.push(
        "L’email a été envoyé, mais son historique n’a pas pu être enregistré."
      );
    }

    return reponseJson({
      succes: true,
      message:
        `PV envoyé avec succès à ${destinataireEmail}.`,
      emailId:
        resultatEmail.data
          ?.id ||
        null,
      destinataireEmail,
      envoyeClientAt:
        dateEnvoi,
      envoyePar:
        nomProfil(
          profil,
          user.email
        ),
      avertissement:
        avertissements.length >
        0
          ? avertissements.join(
              " "
            )
          : null,
    });
  } catch (error) {
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
      pvId:
        pvData.id,
      destinataireEmail,
      sujet,
      message,
      statut:
        "erreur",
      resendEmailId:
        null,
      erreur:
        messageErreur,
      envoyePar:
        profil.id,
    });

    return reponseErreur(
      "Impossible de générer ou d’envoyer le PV de fin de chantier.",
      500
    );
  }
}