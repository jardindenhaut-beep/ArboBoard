import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  chiffrerIdentifiant,
  dechiffrerIdentifiant,
} from "@/lib/server/chiffrementIdentifiants";
import {
  ErreurApiUrssaf,
  obtenirJetonUrssaf,
  inscrireParticulierUrssaf,
  obtenirStatutParticulierUrssaf,
  type ParticulierUrssafPayload,
} from "@/lib/server/urssafTp";

type ContexteRoute = {
  params: Promise<{
    clientId: string;
  }>;
};

type ProfilChef = {
  id: string;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type ClientArboboard = {
  id: string;
  entreprise_id: string;
  type_client?: string | null;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
};

type IntegrationUrssaf = {
  id: string;
  entreprise_id: string;
  client_id_chiffre: string;
  client_secret_chiffre: string;
  statut: string;
  actif: boolean;
};

type DossierStocke = {
  id: string;
  entreprise_id: string;
  client_id: string;
  donnees_chiffrees: string;
  iban_suffixe?: string | null;
  bic_suffixe?: string | null;
  urssaf_id_client?: string | null;
  statut_inscription: StatutInscription;
  statut_transmission_code?: string | null;
  statut_transmission_etat?: string | null;
  statut_transmission_description?: string | null;
  consentement_transmission_at?: string | null;
  consentement_version?: string | null;
  derniere_tentative_at?: string | null;
  derniere_verification_at?: string | null;
  dernier_code_http?: number | null;
  dernier_message?: string | null;
  created_at: string;
  updated_at: string;
};

type ActionDossier =
  | "enregistrer"
  | "inscrire"
  | "actualiser";

type StatutInscription =
  | "brouillon"
  | "pret"
  | "appareillage_en_cours"
  | "actif"
  | "refuse"
  | "erreur";

type FormulaireUrssaf = {
  civilite: "1" | "2" | "";
  nom_naissance: string;
  nom_usage: string;
  prenoms: string;
  date_naissance: string;

  code_pays_naissance: string;
  departement_naissance: string;
  code_commune_naissance: string;
  libelle_commune_naissance: string;

  numero_telephone_portable: string;
  adresse_mail: string;

  numero_voie: string;
  lettre_voie: string;
  code_type_voie: string;
  libelle_voie: string;
  complement_adresse: string;
  lieu_dit: string;
  libelle_commune: string;
  code_commune: string;
  code_postal: string;
  code_pays: string;

  iban: string;
  bic: string;
  titulaire_compte: string;

  consentement_transmission: boolean;
};

type CorpsRequete = {
  action?: unknown;
  formulaire?: unknown;
};

const ROLES_CHEF = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

const VERSION_CONSENTEMENT =
  "avance-immediate-urssaf-v1";

function normaliser(valeur: string | null | undefined) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function texte(
  valeur: unknown,
  longueurMax = 500
) {
  return typeof valeur === "string"
    ? valeur.trim().slice(0, longueurMax)
    : "";
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

function obtenirJetonSession(request: NextRequest) {
  const autorisation =
    request.headers.get("authorization");

  if (!autorisation?.startsWith("Bearer ")) {
    return null;
  }

  return autorisation.slice(7).trim() || null;
}

async function authentifier(request: NextRequest) {
  const jeton = obtenirJetonSession(request);

  if (!jeton) {
    return {
      erreur: NextResponse.json(
        { erreur: "Authentification requise." },
        { status: 401 }
      ),
      supabaseAdmin: null,
      profil: null,
      entrepriseId: null,
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
      entrepriseId: null,
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
        { erreur: "Profil ou entreprise introuvable." },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
      entrepriseId: null,
    };
  }

  const profilType = profil as ProfilChef;

  if (
    !ROLES_CHEF.has(normaliser(profilType.role)) ||
    (
      profilType.statut &&
      normaliser(profilType.statut) !== "actif"
    )
  ) {
    return {
      erreur: NextResponse.json(
        { erreur: "Accès réservé au chef d’entreprise." },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
      entrepriseId: null,
    };
  }

  return {
    erreur: null,
    supabaseAdmin,
    profil: profilType,
    entrepriseId: profilType.entreprise_id,
  };
}

function lireFormulaire(
  valeur: unknown
): FormulaireUrssaf {
  const objet =
    valeur && typeof valeur === "object"
      ? (valeur as Record<string, unknown>)
      : {};

  const civiliteBrute = texte(objet.civilite, 1);

  return {
    civilite:
      civiliteBrute === "1" ||
      civiliteBrute === "2"
        ? civiliteBrute
        : "",

    nom_naissance: texte(
      objet.nom_naissance,
      80
    ),
    nom_usage: texte(objet.nom_usage, 80),
    prenoms: texte(objet.prenoms, 80),
    date_naissance: texte(
      objet.date_naissance,
      10
    ),

    code_pays_naissance: texte(
      objet.code_pays_naissance,
      5
    ).toUpperCase(),
    departement_naissance: texte(
      objet.departement_naissance,
      3
    ).toUpperCase(),
    code_commune_naissance: texte(
      objet.code_commune_naissance,
      3
    ).toUpperCase(),
    libelle_commune_naissance: texte(
      objet.libelle_commune_naissance,
      50
    ),

    numero_telephone_portable: texte(
      objet.numero_telephone_portable,
      12
    ).replace(/\s+/g, ""),
    adresse_mail: texte(
      objet.adresse_mail,
      254
    ).toLowerCase(),

    numero_voie: texte(objet.numero_voie, 20),
    lettre_voie: texte(
      objet.lettre_voie,
      1
    ).toUpperCase(),
    code_type_voie: texte(
      objet.code_type_voie,
      4
    ).toUpperCase(),
    libelle_voie: texte(
      objet.libelle_voie,
      28
    ),
    complement_adresse: texte(
      objet.complement_adresse,
      38
    ),
    lieu_dit: texte(objet.lieu_dit, 38),
    libelle_commune: texte(
      objet.libelle_commune,
      50
    ),
    code_commune: texte(
      objet.code_commune,
      5
    ).toUpperCase(),
    code_postal: texte(
      objet.code_postal,
      5
    ),
    code_pays:
      texte(objet.code_pays, 5) || "99100",

    iban: texte(objet.iban, 38)
      .replace(/\s+/g, "")
      .toUpperCase(),
    bic: texte(objet.bic, 11)
      .replace(/\s+/g, "")
      .toUpperCase(),
    titulaire_compte: texte(
      objet.titulaire_compte,
      100
    ),

    consentement_transmission:
      objet.consentement_transmission === true,
  };
}

function formulaireInitial(
  client: ClientArboboard
): FormulaireUrssaf {
  const telephone = String(
    client.telephone || ""
  ).replace(/\s+/g, "");

  return {
    civilite: "",
    nom_naissance: client.nom || "",
    nom_usage: "",
    prenoms: client.prenom || "",
    date_naissance: "",

    code_pays_naissance: "99100",
    departement_naissance: "",
    code_commune_naissance: "",
    libelle_commune_naissance: "",

    numero_telephone_portable: telephone,
    adresse_mail: client.email || "",

    numero_voie: "",
    lettre_voie: "",
    code_type_voie: "",
    libelle_voie: "",
    complement_adresse: "",
    lieu_dit: "",
    libelle_commune: client.ville || "",
    code_commune: "",
    code_postal: client.code_postal || "",
    code_pays: "99100",

    iban: "",
    bic: "",
    titulaire_compte:
      `${client.prenom || ""} ${client.nom || ""}`.trim(),

    consentement_transmission: false,
  };
}

function dechiffrerFormulaire(
  dossier: DossierStocke
) {
  const contenu = dechiffrerIdentifiant(
    dossier.donnees_chiffrees
  );

  return lireFormulaire(
    JSON.parse(contenu) as unknown
  );
}

function validerNom(
  valeur: string,
  libelle: string,
  obligatoire = true
) {
  if (!valeur) {
    return obligatoire
      ? `${libelle} est obligatoire.`
      : null;
  }

  if (
    !/^[\p{L}]+(?:[' -][\p{L}]+)*$/u.test(
      valeur
    )
  ) {
    return `${libelle} contient un caractère non autorisé.`;
  }

  return null;
}

function validerFormulaire(
  formulaire: FormulaireUrssaf,
  {
    ibanDejaEnregistre,
    bicDejaEnregistre,
  }: {
    ibanDejaEnregistre: boolean;
    bicDejaEnregistre: boolean;
  }
) {
  const erreurs: string[] = [];

  if (
    formulaire.civilite !== "1" &&
    formulaire.civilite !== "2"
  ) {
    erreurs.push(
      "La civilité Monsieur ou Madame est obligatoire."
    );
  }

  const erreurNomNaissance = validerNom(
    formulaire.nom_naissance,
    "Le nom de naissance"
  );
  if (erreurNomNaissance) {
    erreurs.push(erreurNomNaissance);
  }

  const erreurNomUsage = validerNom(
    formulaire.nom_usage,
    "Le nom d’usage",
    false
  );
  if (erreurNomUsage) {
    erreurs.push(erreurNomUsage);
  }

  const erreurPrenoms = validerNom(
    formulaire.prenoms,
    "Le prénom"
  );
  if (erreurPrenoms) {
    erreurs.push(erreurPrenoms);
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      formulaire.date_naissance
    )
  ) {
    erreurs.push(
      "La date de naissance est obligatoire."
    );
  } else {
    const date = new Date(
      `${formulaire.date_naissance}T00:00:00.000Z`
    );

    if (
      Number.isNaN(date.getTime()) ||
      date.getTime() >= Date.now()
    ) {
      erreurs.push(
        "La date de naissance doit être valide et située dans le passé."
      );
    }
  }

  if (
    !/^\d{5}$/.test(
      formulaire.code_pays_naissance
    )
  ) {
    erreurs.push(
      "Le code INSEE du pays de naissance doit contenir 5 chiffres."
    );
  }

  if (
    formulaire.code_pays_naissance === "99100"
  ) {
    if (
      !/^[0-9A-Z]{3}$/.test(
        formulaire.departement_naissance
      )
    ) {
      erreurs.push(
        "Le département de naissance français doit contenir 3 caractères."
      );
    }

    if (
      !/^\d{3}$/.test(
        formulaire.code_commune_naissance
      )
    ) {
      erreurs.push(
        "Le code commune de naissance doit contenir 3 chiffres."
      );
    }

    if (
      !formulaire.libelle_commune_naissance
    ) {
      erreurs.push(
        "La commune de naissance est obligatoire pour une naissance en France."
      );
    }
  }

  if (
    !/^(0|\+33)[67](\d{2}){4}$/.test(
      formulaire.numero_telephone_portable
    )
  ) {
    erreurs.push(
      "Le téléphone portable doit commencer par 06, 07, +336 ou +337, sans espace."
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      formulaire.adresse_mail
    )
  ) {
    erreurs.push(
      "L’adresse email du particulier est invalide."
    );
  }

  if (
    !formulaire.libelle_voie &&
    !formulaire.complement_adresse &&
    !formulaire.lieu_dit
  ) {
    erreurs.push(
      "Renseignez au moins la voie, le complément ou le lieu-dit de l’adresse."
    );
  }

  if (
    formulaire.libelle_voie &&
    !formulaire.code_type_voie
  ) {
    erreurs.push(
      "Le code du type de voie est obligatoire lorsque la voie est renseignée."
    );
  }

  if (
    formulaire.numero_voie &&
    !formulaire.libelle_voie
  ) {
    erreurs.push(
      "Le libellé de la voie est obligatoire lorsque le numéro est renseigné."
    );
  }

  if (
    formulaire.lettre_voie &&
    !formulaire.numero_voie
  ) {
    erreurs.push(
      "Le numéro de voie est obligatoire lorsque la lettre de voie est renseignée."
    );
  }

  if (
    ["0", "00", "000", "0000"].includes(
      formulaire.numero_voie
    )
  ) {
    erreurs.push(
      "Le numéro de voie ne peut pas être égal à zéro."
    );
  }

  if (!formulaire.libelle_commune) {
    erreurs.push(
      "La commune de résidence est obligatoire."
    );
  }

  if (
    !/^[0-9A-Z]{5}$/.test(
      formulaire.code_commune
    )
  ) {
    erreurs.push(
      "Le code INSEE de la commune de résidence doit contenir 5 caractères."
    );
  }

  if (
    !/^\d{5}$/.test(
      formulaire.code_postal
    )
  ) {
    erreurs.push(
      "Le code postal doit contenir 5 chiffres."
    );
  }

  if (!/^\d{5}$/.test(formulaire.code_pays)) {
    erreurs.push(
      "Le code INSEE du pays de résidence doit contenir 5 chiffres."
    );
  }

  if (
    !formulaire.iban &&
    !ibanDejaEnregistre
  ) {
    erreurs.push("L’IBAN est obligatoire.");
  } else if (
    formulaire.iban &&
    !/^[A-Z]{2}\d{2}[A-Z0-9]{14,34}$/.test(
      formulaire.iban
    )
  ) {
    erreurs.push("Le format de l’IBAN est invalide.");
  }

  if (
    !formulaire.bic &&
    !bicDejaEnregistre
  ) {
    erreurs.push("Le BIC est obligatoire.");
  } else if (
    formulaire.bic &&
    !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(
      formulaire.bic
    )
  ) {
    erreurs.push("Le format du BIC est invalide.");
  }

  if (!formulaire.titulaire_compte) {
    erreurs.push(
      "Le titulaire du compte bancaire est obligatoire."
    );
  }

  return erreurs;
}

function creerPayload(
  formulaire: FormulaireUrssaf
): ParticulierUrssafPayload {
  const payload: ParticulierUrssafPayload = {
    civilite:
      formulaire.civilite === "2" ? "2" : "1",
    nomNaissance:
      formulaire.nom_naissance,
    prenoms: formulaire.prenoms,
    dateNaissance: new Date(
      `${formulaire.date_naissance}T00:00:00.000Z`
    ).toISOString(),
    lieuNaissance: {
      codePaysNaissance:
        formulaire.code_pays_naissance,
    },
    numeroTelephonePortable:
      formulaire.numero_telephone_portable,
    adresseMail: formulaire.adresse_mail,
    adressePostale: {
      libelleCommune:
        formulaire.libelle_commune,
      codeCommune: formulaire.code_commune,
      codePostal: formulaire.code_postal,
      codePays: formulaire.code_pays,
    },
    coordonneeBancaire: {
      bic: formulaire.bic,
      iban: formulaire.iban,
      titulaire:
        formulaire.titulaire_compte,
    },
  };

  if (formulaire.nom_usage) {
    payload.nomUsage = formulaire.nom_usage;
  }

  if (
    formulaire.code_pays_naissance === "99100"
  ) {
    payload.lieuNaissance.departementNaissance =
      formulaire.departement_naissance;

    payload.lieuNaissance.communeNaissance = {
      codeCommune:
        formulaire.code_commune_naissance,
      libelleCommune:
        formulaire.libelle_commune_naissance,
    };
  }

  const adresse = payload.adressePostale;

  if (formulaire.numero_voie) {
    adresse.numeroVoie = formulaire.numero_voie;
  }
  if (formulaire.lettre_voie) {
    adresse.lettreVoie = formulaire.lettre_voie;
  }
  if (formulaire.code_type_voie) {
    adresse.codeTypeVoie =
      formulaire.code_type_voie;
  }
  if (formulaire.libelle_voie) {
    adresse.libelleVoie =
      formulaire.libelle_voie;
  }
  if (formulaire.complement_adresse) {
    adresse.complement =
      formulaire.complement_adresse;
  }
  if (formulaire.lieu_dit) {
    adresse.lieuDit = formulaire.lieu_dit;
  }

  return payload;
}

function masquerDossier({
  dossier,
  formulaire,
  integration,
}: {
  dossier: DossierStocke | null;
  formulaire: FormulaireUrssaf;
  integration: IntegrationUrssaf | null;
}) {
  return {
    id: dossier?.id || null,
    formulaire: {
      ...formulaire,
      iban: "",
      bic: "",
      consentement_transmission: false,
    },
    iban_enregistre:
      Boolean(dossier?.iban_suffixe),
    bic_enregistre:
      Boolean(dossier?.bic_suffixe),
    iban_suffixe:
      dossier?.iban_suffixe || null,
    bic_suffixe:
      dossier?.bic_suffixe || null,
    urssaf_id_client:
      dossier?.urssaf_id_client || null,
    statut_inscription:
      dossier?.statut_inscription ||
      "brouillon",
    statut_transmission_code:
      dossier?.statut_transmission_code ||
      null,
    statut_transmission_etat:
      dossier?.statut_transmission_etat ||
      null,
    statut_transmission_description:
      dossier?.statut_transmission_description ||
      null,
    consentement_transmission_at:
      dossier?.consentement_transmission_at ||
      null,
    derniere_tentative_at:
      dossier?.derniere_tentative_at || null,
    derniere_verification_at:
      dossier?.derniere_verification_at ||
      null,
    dernier_code_http:
      dossier?.dernier_code_http || null,
    dernier_message:
      dossier?.dernier_message || null,
    integration: {
      configuree: Boolean(integration),
      active: Boolean(integration?.actif),
      statut: integration?.statut || null,
    },
  };
}

async function chargerClient({
  supabaseAdmin,
  entrepriseId,
  clientId,
}: {
  supabaseAdmin: ReturnType<
    typeof creerSupabaseAdmin
  >;
  entrepriseId: string;
  clientId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select(
      "id, entreprise_id, type_client, nom, prenom, email, telephone, adresse, code_postal, ville"
    )
    .eq("id", clientId)
    .eq("entreprise_id", entrepriseId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Client introuvable pour cette entreprise."
    );
  }

  const client = data as ClientArboboard;

  if (normaliser(client.type_client) !== "particulier") {
    throw new Error(
      "L’Avance immédiate peut uniquement être configurée pour un client particulier."
    );
  }

  return client;
}

async function chargerDossierEtIntegration({
  supabaseAdmin,
  entrepriseId,
  clientId,
}: {
  supabaseAdmin: ReturnType<
    typeof creerSupabaseAdmin
  >;
  entrepriseId: string;
  clientId: string;
}) {
  const [
    dossierResultat,
    integrationResultat,
  ] = await Promise.all([
    supabaseAdmin
      .from("clients_urssaf_tp")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("client_id", clientId)
      .maybeSingle(),

    supabaseAdmin
      .from("integrations_urssaf_tp")
      .select(
        "id, entreprise_id, client_id_chiffre, client_secret_chiffre, statut, actif"
      )
      .eq("entreprise_id", entrepriseId)
      .maybeSingle(),
  ]);

  if (dossierResultat.error) {
    throw dossierResultat.error;
  }

  if (integrationResultat.error) {
    throw integrationResultat.error;
  }

  return {
    dossier:
      (dossierResultat.data as
        | DossierStocke
        | null) || null,
    integration:
      (integrationResultat.data as
        | IntegrationUrssaf
        | null) || null,
  };
}

async function journaliser({
  supabaseAdmin,
  entrepriseId,
  action,
  ressourceId,
  resultat,
  description,
  details,
}: {
  supabaseAdmin: ReturnType<
    typeof creerSupabaseAdmin
  >;
  entrepriseId: string;
  action: string;
  ressourceId: string | null;
  resultat: "succes" | "echec";
  description: string;
  details: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.rpc(
    "arboboard_ecrire_journal",
    {
      p_entreprise_id: entrepriseId,
      p_action: action,
      p_categorie: "securite",
      p_ressource_type: "client_urssaf_tp",
      p_ressource_id: ressourceId,
      p_resultat: resultat,
      p_description: description,
      p_details: details,
    }
  );

  if (error) {
    console.warn(
      "Journalisation client Urssaf impossible :",
      error
    );
  }
}

function statutDepuisTransmission({
  code,
  etat,
}: {
  code: string;
  etat: string;
}): StatutInscription {
  if (normaliser(etat) === "ok") {
    return "actif";
  }

  const codeNormalise = normaliser(code);

  if (
    codeNormalise.includes("refus") ||
    codeNormalise.includes("rejete")
  ) {
    return "refuse";
  }

  return "appareillage_en_cours";
}

export async function GET(
  request: NextRequest,
  contexte: ContexteRoute
) {
  try {
    const authentification =
      await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil ||
      !authentification.entrepriseId
    ) {
      return (
        authentification.erreur ??
        NextResponse.json(
          {
            erreur:
              "Impossible de vérifier l’accès à cette route.",
          },
          { status: 500 }
        )
      );
    }

    const { clientId } = await contexte.params;
    const { supabaseAdmin, entrepriseId } =
      authentification;

    const client = await chargerClient({
      supabaseAdmin,
      entrepriseId,
      clientId,
    });

    const { dossier, integration } =
      await chargerDossierEtIntegration({
        supabaseAdmin,
        entrepriseId,
        clientId,
      });

    const formulaire = dossier
      ? dechiffrerFormulaire(dossier)
      : formulaireInitial(client);

    return NextResponse.json({
      dossier: masquerDossier({
        dossier,
        formulaire,
        integration,
      }),
      adresse_client_actuelle:
        client.adresse || null,
    });
  } catch (error) {
    console.error(
      "Erreur lecture dossier client Urssaf :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger le dossier Avance immédiate.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  contexte: ContexteRoute
) {
  let dossierId: string | null = null;

  try {
    const authentification =
      await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil ||
      !authentification.entrepriseId
    ) {
      return (
        authentification.erreur ??
        NextResponse.json(
          {
            erreur:
              "Impossible de vérifier l’accès à cette route.",
          },
          { status: 500 }
        )
      );
    }

    const { clientId } = await contexte.params;
    const {
      supabaseAdmin,
      profil,
      entrepriseId,
    } = authentification;

    const corps =
      (await request.json()) as CorpsRequete;

    const action =
      corps.action === "inscrire" ||
      corps.action === "actualiser"
        ? corps.action
        : "enregistrer";

    const client = await chargerClient({
      supabaseAdmin,
      entrepriseId,
      clientId,
    });

    const { dossier, integration } =
      await chargerDossierEtIntegration({
        supabaseAdmin,
        entrepriseId,
        clientId,
      });

    dossierId = dossier?.id || null;

    if (action === "actualiser") {
      if (!dossier?.urssaf_id_client) {
        return NextResponse.json(
          {
            erreur:
              "Ce client ne possède pas encore d’identifiant Urssaf.",
          },
          { status: 400 }
        );
      }

      if (!integration?.actif) {
        return NextResponse.json(
          {
            erreur:
              "Configurez et activez d’abord la connexion API Urssaf.",
          },
          { status: 400 }
        );
      }

      const formulaire =
        dechiffrerFormulaire(dossier);

      const jeton = await obtenirJetonUrssaf({
        clientId: dechiffrerIdentifiant(
          integration.client_id_chiffre
        ),
        clientSecret: dechiffrerIdentifiant(
          integration.client_secret_chiffre
        ),
      });

      const resultat =
        await obtenirStatutParticulierUrssaf({
          jeton,
          idClient:
            dossier.urssaf_id_client,
          adresseMail:
            formulaire.adresse_mail,
        });

      const statut = resultat.donnees.statut;
      const code = texte(statut?.code, 100);
      const etat = texte(statut?.etat, 20);
      const description = texte(
        statut?.description,
        1000
      );

      const nouveauStatut =
        statutDepuisTransmission({
          code,
          etat,
        });

      const maintenant =
        new Date().toISOString();

      const { data: dossierMaj, error } =
        await supabaseAdmin
          .from("clients_urssaf_tp")
          .update({
            statut_inscription:
              nouveauStatut,
            statut_transmission_code:
              code || null,
            statut_transmission_etat:
              etat || null,
            statut_transmission_description:
              description || null,
            derniere_verification_at:
              maintenant,
            dernier_code_http:
              resultat.codeHttp,
            dernier_message:
              description ||
              "Statut Urssaf actualisé.",
            updated_by: profil.id,
            updated_at: maintenant,
          })
          .eq("id", dossier.id)
          .eq("entreprise_id", entrepriseId)
          .select("*")
          .single();

      if (error) throw error;

      await journaliser({
        supabaseAdmin,
        entrepriseId,
        action:
          "statut_client_urssaf_actualise",
        ressourceId: dossier.id,
        resultat: "succes",
        description:
          "Actualisation du statut Avance immédiate d’un particulier.",
        details: {
          client_id: clientId,
          statut_inscription:
            nouveauStatut,
          statut_transmission_code:
            code || null,
          statut_transmission_etat:
            etat || null,
        },
      });

      return NextResponse.json({
        succes: true,
        message:
          description ||
          "Le statut Urssaf a été actualisé.",
        dossier: masquerDossier({
          dossier:
            dossierMaj as DossierStocke,
          formulaire,
          integration,
        }),
      });
    }

    const formulaireSaisi =
      lireFormulaire(corps.formulaire);

    let formulaireExistant =
      dossier
        ? dechiffrerFormulaire(dossier)
        : formulaireInitial(client);

    const iban =
      formulaireSaisi.iban ||
      formulaireExistant.iban;

    const bic =
      formulaireSaisi.bic ||
      formulaireExistant.bic;

    const formulaire: FormulaireUrssaf = {
      ...formulaireSaisi,
      iban,
      bic,
      consentement_transmission:
        formulaireSaisi
          .consentement_transmission,
    };

    const erreurs = validerFormulaire(
      formulaire,
      {
        ibanDejaEnregistre:
          Boolean(dossier?.iban_suffixe),
        bicDejaEnregistre:
          Boolean(dossier?.bic_suffixe),
      }
    );

    if (erreurs.length > 0) {
      return NextResponse.json(
        {
          erreur: erreurs[0],
          erreurs,
        },
        { status: 400 }
      );
    }

    if (
      action === "inscrire" &&
      !formulaire.consentement_transmission
    ) {
      return NextResponse.json(
        {
          erreur:
            "Confirmez que le particulier a été informé et autorise la transmission de ses données à l’Urssaf.",
        },
        { status: 400 }
      );
    }

    const payload = creerPayload(formulaire);
    const payloadJson =
      JSON.stringify(payload);
    const payloadHash = createHash("sha256")
      .update(payloadJson, "utf8")
      .digest("hex");

    const maintenant =
      new Date().toISOString();

    const baseEnregistrement = {
      entreprise_id: entrepriseId,
      client_id: clientId,
      donnees_chiffrees:
        chiffrerIdentifiant(
          JSON.stringify({
            ...formulaire,
            consentement_transmission:
              false,
          })
        ),
      iban_suffixe:
        formulaire.iban.slice(-6) || null,
      bic_suffixe:
        formulaire.bic.slice(-4) || null,
      statut_inscription:
        action === "inscrire"
          ? "pret"
          : dossier?.statut_inscription ===
                "actif" ||
              dossier?.statut_inscription ===
                "appareillage_en_cours"
            ? dossier.statut_inscription
            : "pret",
      dernier_payload_sha256:
        payloadHash,
      updated_by: profil.id,
      updated_at: maintenant,
      ...(dossier
        ? {}
        : {
            created_by: profil.id,
            created_at: maintenant,
          }),
    };

    const { data: dossierEnregistre, error } =
      await supabaseAdmin
        .from("clients_urssaf_tp")
        .upsert(baseEnregistrement, {
          onConflict: "client_id",
        })
        .select("*")
        .single();

    if (error) throw error;

    dossierId = dossierEnregistre.id;

    if (action === "enregistrer") {
      await journaliser({
        supabaseAdmin,
        entrepriseId,
        action:
          "dossier_client_urssaf_enregistre",
        ressourceId:
          dossierEnregistre.id,
        resultat: "succes",
        description:
          "Enregistrement du dossier Avance immédiate d’un particulier.",
        details: {
          client_id: clientId,
          payload_sha256: payloadHash,
        },
      });

      return NextResponse.json({
        succes: true,
        message:
          "Le dossier Avance immédiate a été enregistré.",
        dossier: masquerDossier({
          dossier:
            dossierEnregistre as DossierStocke,
          formulaire,
          integration,
        }),
      });
    }

    if (!integration?.actif) {
      return NextResponse.json(
        {
          erreur:
            "La connexion API Urssaf n’est pas configurée ou n’est pas active. Le dossier a été enregistré sans être transmis.",
          dossier: masquerDossier({
            dossier:
              dossierEnregistre as DossierStocke,
            formulaire,
            integration,
          }),
        },
        { status: 400 }
      );
    }

    const jeton = await obtenirJetonUrssaf({
      clientId: dechiffrerIdentifiant(
        integration.client_id_chiffre
      ),
      clientSecret: dechiffrerIdentifiant(
        integration.client_secret_chiffre
      ),
    });

    const resultatInscription =
      await inscrireParticulierUrssaf({
        jeton,
        particulier: payload,
      });

    const { data: dossierInscrit, error: majError } =
      await supabaseAdmin
        .from("clients_urssaf_tp")
        .update({
          urssaf_id_client:
            resultatInscription.idClient,
          statut_inscription:
            "appareillage_en_cours",
          consentement_transmission_at:
            maintenant,
          consentement_version:
            VERSION_CONSENTEMENT,
          derniere_tentative_at:
            maintenant,
          dernier_code_http:
            resultatInscription.codeHttp,
          dernier_message:
            "Inscription transmise. Le particulier doit accepter l’appareillage dans son compte Urssaf.",
          updated_by: profil.id,
          updated_at: maintenant,
        })
        .eq("id", dossierEnregistre.id)
        .eq("entreprise_id", entrepriseId)
        .select("*")
        .single();

    if (majError) throw majError;

    await journaliser({
      supabaseAdmin,
      entrepriseId,
      action:
        "client_inscrit_api_urssaf",
      ressourceId: dossierEnregistre.id,
      resultat: "succes",
      description:
        "Transmission réussie de l’inscription d’un particulier à l’API Tiers de prestation.",
      details: {
        client_id: clientId,
        urssaf_id_client:
          resultatInscription.idClient,
        payload_sha256: payloadHash,
      },
    });

    return NextResponse.json({
      succes: true,
      message:
        "L’inscription a été transmise à l’Urssaf. Le particulier doit maintenant accepter l’appareillage depuis son compte en ligne.",
      dossier: masquerDossier({
        dossier:
          dossierInscrit as DossierStocke,
        formulaire,
        integration,
      }),
    });
  } catch (error) {
    console.error(
      "Erreur dossier client Urssaf :",
      error
    );

    const codeHttp =
      error instanceof ErreurApiUrssaf
        ? error.codeHttp
        : 500;

    const message =
      error instanceof Error
        ? error.message
        : "Impossible de traiter le dossier Avance immédiate.";

    try {
      const authentification =
        await authentifier(request);

      if (
        dossierId &&
        authentification.supabaseAdmin &&
        authentification.entrepriseId
      ) {
        await authentification.supabaseAdmin
          .from("clients_urssaf_tp")
          .update({
            statut_inscription: "erreur",
            derniere_tentative_at:
              new Date().toISOString(),
            dernier_code_http:
              codeHttp >= 100 &&
              codeHttp <= 599
                ? codeHttp
                : 500,
            dernier_message:
              message.slice(0, 1500),
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", dossierId)
          .eq(
            "entreprise_id",
            authentification.entrepriseId
          );

        await journaliser({
          supabaseAdmin:
            authentification.supabaseAdmin,
          entrepriseId:
            authentification.entrepriseId,
          action:
            "inscription_client_urssaf_echec",
          ressourceId: dossierId,
          resultat: "echec",
          description:
            "Échec du traitement d’un dossier client auprès de l’API Tiers de prestation.",
          details: {
            code_http: codeHttp,
            erreur: message,
          },
        });
      }
    } catch (journalError) {
      console.warn(
        "Impossible d’enregistrer l’échec Urssaf :",
        journalError
      );
    }

    return NextResponse.json(
      {
        erreur: message,
      },
      {
        status:
          codeHttp >= 400 &&
          codeHttp <= 599
            ? codeHttp
            : 500,
      }
    );
  }
}