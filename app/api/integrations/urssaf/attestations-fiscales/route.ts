import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Profil = {
  id: string;
  prenom?: string | null;
  nom?: string | null;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type Client = {
  id: string;
  type_client?: string | null;
  nom?: string | null;
  prenom?: string | null;
  entreprise?: string | null;
  email?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
};

type DemandePaiement = {
  id: string;
  facture_id: string;
  client_id: string;
  numero_facture: string;
  date_facture: string;
  montant_facture_ttc:
    | number
    | string
    | null;
  statut_local: string;
};

type FicheIntervention = {
  id: string;
  client_id?: string | null;
  titre?: string | null;
  type_intervention?: string | null;
  statut?: string | null;
  date_intervention?: string | null;
  date_prevue?: string | null;
  heure_debut_reelle?: string | null;
  heure_fin_reelle?: string | null;
  heure_debut?: string | null;
  heure_fin?: string | null;
  salarie_id?: string | null;
  salarie_nom?: string | null;
};

type FicheSalarie = {
  fiche_id: string;
  salarie_id?: string | null;
  salarie_nom?: string | null;
  heure_arrivee_reelle?: string | null;
  heure_depart_reelle?: string | null;
  heure_arrivee_prevue?: string | null;
  heure_depart_prevue?: string | null;
};

type CorpsAttestation = {
  action?: "enregistrer" | "valider";
  clientId?: unknown;
  annee?: unknown;
  natureServices?: unknown;
  compteDebiteMasque?: unknown;
  montantAcquitteClient?: unknown;
  montantCesuPrefinance?: unknown;
  numeroDeclarationSap?: unknown;
  dateEnregistrementSap?: unknown;
  signataireNom?: unknown;
  signataireQualite?: unknown;
  dateEmission?: unknown;
  notes?: unknown;
};

const ROLES_AUTORISES = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

function creerSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Configuration Supabase serveur manquante."
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

function normaliser(
  valeur: string | null | undefined
) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function texte(
  valeur: unknown,
  longueur = 1500
) {
  const resultat = String(
    valeur ?? ""
  ).trim();

  return resultat
    ? resultat.slice(0, longueur)
    : "";
}

function nombre(
  valeur: unknown
) {
  if (typeof valeur === "number") {
    return Number.isFinite(valeur)
      ? valeur
      : 0;
  }

  const resultat = Number.parseFloat(
    String(valeur ?? "")
      .replace(",", ".")
      .replace(/\s/g, "")
  );

  return Number.isFinite(resultat)
    ? Math.round(
        (resultat + Number.EPSILON) *
          100
      ) / 100
    : 0;
}

function dateValide(
  valeur: string
) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(
      valeur
    ) &&
    !Number.isNaN(
      new Date(
        `${valeur}T00:00:00Z`
      ).getTime()
    )
  );
}

function nomClient(client: Client) {
  if (
    client.type_client ===
      "professionnel" ||
    client.entreprise
  ) {
    return (
      texte(client.entreprise, 200) ||
      `${texte(client.prenom, 100)} ${texte(
        client.nom,
        100
      )}`.trim()
    );
  }

  return (
    `${texte(client.prenom, 100)} ${texte(
      client.nom,
      100
    )}`.trim() ||
    texte(client.entreprise, 200) ||
    "Client particulier"
  );
}

function premiereValeur(
  ...valeurs: unknown[]
) {
  for (const valeur of valeurs) {
    const resultat =
      texte(valeur, 1000);

    if (resultat) {
      return resultat;
    }
  }

  return "";
}

function minutesEntre(
  debut?: string | null,
  fin?: string | null
) {
  if (!debut || !fin) {
    return 0;
  }

  const convertir = (heure: string) => {
    const morceaux =
      heure.slice(0, 5).split(":");

    if (morceaux.length !== 2) {
      return 0;
    }

    return (
      Number(morceaux[0]) * 60 +
      Number(morceaux[1])
    );
  };

  const debutMinutes =
    convertir(debut);
  const finMinutes =
    convertir(fin);

  return Math.max(
    0,
    finMinutes - debutMinutes
  );
}

function moisDepuisDate(date: string) {
  return date.slice(0, 7);
}

function identifiantIntervenant(
  valeur: string | null | undefined
) {
  const id = texte(valeur, 100);

  return id
    ? `ARB-${id.replace(
        /-/g,
        ""
      ).slice(0, 8).toUpperCase()}`
    : "ARB-NON-AFFECTE";
}

async function authentifier(
  request: NextRequest,
  supabaseAdmin: SupabaseClient
) {
  const autorisation =
    request.headers.get(
      "authorization"
    ) || "";

  const token =
    autorisation.startsWith(
      "Bearer "
    )
      ? autorisation.slice(7).trim()
      : "";

  if (!token) {
    return {
      erreur: NextResponse.json(
        {
          succes: false,
          erreur:
            "Token d’authentification manquant.",
        },
        { status: 401 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  const {
    data: { user },
    error: utilisateurError,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (
    utilisateurError ||
    !user?.id
  ) {
    return {
      erreur: NextResponse.json(
        {
          succes: false,
          erreur:
            "Utilisateur non connecté.",
        },
        { status: 401 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  const {
    data: profil,
    error: profilError,
  } = await supabaseAdmin
    .from("profils_utilisateurs")
    .select(
      "id, prenom, nom, role, statut, entreprise_id"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profilError ||
    !profil?.entreprise_id
  ) {
    return {
      erreur: NextResponse.json(
        {
          succes: false,
          erreur:
            "Profil utilisateur introuvable.",
        },
        { status: 403 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  const donnees =
    profil as Profil;

  if (
    !ROLES_AUTORISES.has(
      normaliser(donnees.role)
    ) ||
    (
      donnees.statut &&
      normaliser(
        donnees.statut
      ) !== "actif"
    )
  ) {
    return {
      erreur: NextResponse.json(
        {
          succes: false,
          erreur:
            "Accès refusé.",
        },
        { status: 403 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  return {
    erreur: null,
    profil: donnees,
    entrepriseId:
      donnees.entreprise_id,
  };
}

async function preparerDonnees({
  supabaseAdmin,
  entrepriseId,
  clientId,
  annee,
}: {
  supabaseAdmin: SupabaseClient;
  entrepriseId: string;
  clientId: string;
  annee: number;
}) {
  const debut =
    `${annee}-01-01`;
  const fin =
    `${annee}-12-31`;

  const [
    clientResultat,
    entrepriseResultat,
    parametresResultat,
    integrationResultat,
    demandesResultat,
    fichesResultat,
  ] = await Promise.all([
    supabaseAdmin
      .from("clients")
      .select(
        "id, type_client, nom, prenom, entreprise, email, adresse, code_postal, ville"
      )
      .eq("id", clientId)
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .maybeSingle(),

    supabaseAdmin
      .from(
        "entreprises_abonnees"
      )
      .select("id, nom_entreprise, adresse, code_postal, ville, telephone, email_contact, siret")
      .eq("id", entrepriseId)
      .maybeSingle(),

    supabaseAdmin
      .from(
        "entreprise_parametres"
      )
      .select("entreprise_id, nom_entreprise, adresse, code_postal, ville, telephone, email, siret")
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .maybeSingle(),

    supabaseAdmin
      .from(
        "integrations_urssaf_tp"
      )
      .select(
        "numero_sap"
      )
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .maybeSingle(),

    supabaseAdmin
      .from(
        "demandes_paiement_urssaf"
      )
      .select(
        "id, facture_id, client_id, numero_facture, date_facture, montant_facture_ttc, statut_local"
      )
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .eq("client_id", clientId)
      .eq("statut_local", "payee")
      .gte(
        "date_facture",
        debut
      )
      .lte("date_facture", fin)
      .order("date_facture", {
        ascending: true,
      }),

    supabaseAdmin
      .from(
        "fiches_intervention"
      )
      .select(
        "id, client_id, titre, type_intervention, statut, date_intervention, date_prevue, heure_debut_reelle, heure_fin_reelle, heure_debut, heure_fin, salarie_id, salarie_nom"
      )
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .eq("client_id", clientId)
      .eq("statut", "terminee")
      .or(
        `and(date_intervention.gte.${debut},date_intervention.lte.${fin}),and(date_intervention.is.null,date_prevue.gte.${debut},date_prevue.lte.${fin})`
      )
      .order(
        "date_intervention",
        {
          ascending: true,
        }
      ),
  ]);

  if (
    clientResultat.error ||
    !clientResultat.data
  ) {
    throw new Error(
      "Client introuvable."
    );
  }

  if (
    entrepriseResultat.error ||
    !entrepriseResultat.data
  ) {
    throw new Error(
      "Entreprise introuvable."
    );
  }

  if (parametresResultat.error) {
    throw parametresResultat.error;
  }

  if (integrationResultat.error) {
    throw integrationResultat.error;
  }

  if (demandesResultat.error) {
    throw demandesResultat.error;
  }

  if (fichesResultat.error) {
    throw fichesResultat.error;
  }

  const client =
    clientResultat.data as Client;

  const entreprise =
    entrepriseResultat.data as Record<
      string,
      unknown
    >;

  const parametres =
    (parametresResultat.data ||
      {}) as Record<
      string,
      unknown
    >;

  const integration =
    (integrationResultat.data ||
      {}) as Record<
      string,
      unknown
    >;

  const demandes =
    (demandesResultat.data ||
      []) as DemandePaiement[];

  const fiches =
    (fichesResultat.data ||
      []) as FicheIntervention[];

  const ficheIds =
    fiches.map(
      (fiche) => fiche.id
    );

  let affectations:
    FicheSalarie[] = [];

  if (ficheIds.length > 0) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "fiches_intervention_salaries"
      )
      .select(
        "fiche_id, salarie_id, salarie_nom, heure_arrivee_reelle, heure_depart_reelle, heure_arrivee_prevue, heure_depart_prevue"
      )
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .in("fiche_id", ficheIds);

    if (error) {
      throw error;
    }

    affectations =
      (data ||
        []) as FicheSalarie[];
  }

  const affectationsParFiche =
    new Map<string, FicheSalarie[]>();

  for (const affectation of affectations) {
    const liste =
      affectationsParFiche.get(
        affectation.fiche_id
      ) || [];

    liste.push(affectation);
    affectationsParFiche.set(
      affectation.fiche_id,
      liste
    );
  }

  const regroupement =
    new Map<
      string,
      {
        mois: string;
        intervenant_id: string;
        intervenant_nom: string;
        duree_minutes: number;
        nombre_interventions: number;
        natures: Set<string>;
      }
    >();

  for (const fiche of fiches) {
    const date =
      fiche.date_intervention ||
      fiche.date_prevue ||
      "";

    if (!date) {
      continue;
    }

    const natures = [
      texte(
        fiche.type_intervention,
        300
      ),
      texte(fiche.titre, 300),
    ].filter(Boolean);

    const affectationsFiche =
      affectationsParFiche.get(
        fiche.id
      ) || [];

    const intervenants =
      affectationsFiche.length > 0
        ? affectationsFiche
        : [
            {
              fiche_id: fiche.id,
              salarie_id:
                fiche.salarie_id,
              salarie_nom:
                fiche.salarie_nom,
              heure_arrivee_reelle:
                fiche
                  .heure_debut_reelle,
              heure_depart_reelle:
                fiche.heure_fin_reelle,
              heure_arrivee_prevue:
                fiche.heure_debut,
              heure_depart_prevue:
                fiche.heure_fin,
            },
          ];

    for (const intervenant of intervenants) {
      const salarieId =
        texte(
          intervenant.salarie_id,
          100
        ) || "non-affecte";

      const nom =
        texte(
          intervenant.salarie_nom,
          200
        ) || "Intervenant non renseigné";

      const mois =
        moisDepuisDate(date);

      const cle =
        `${mois}:${salarieId}`;

      const duree =
        minutesEntre(
          intervenant
            .heure_arrivee_reelle ||
            intervenant
              .heure_arrivee_prevue ||
            fiche
              .heure_debut_reelle ||
            fiche.heure_debut,
          intervenant
            .heure_depart_reelle ||
            intervenant
              .heure_depart_prevue ||
            fiche.heure_fin_reelle ||
            fiche.heure_fin
        );

      const existant =
        regroupement.get(cle) || {
          mois,
          intervenant_id:
            identifiantIntervenant(
              salarieId
            ),
          intervenant_nom: nom,
          duree_minutes: 0,
          nombre_interventions: 0,
          natures: new Set<string>(),
        };

      existant.duree_minutes +=
        duree;
      existant.nombre_interventions +=
        1;

      for (const nature of natures) {
        existant.natures.add(
          nature
        );
      }

      regroupement.set(
        cle,
        existant
      );
    }
  }

  const interventions = [
    ...regroupement.values(),
  ]
    .map((ligne) => ({
      mois: ligne.mois,
      intervenant_id:
        ligne.intervenant_id,
      intervenant_nom:
        ligne.intervenant_nom,
      duree_minutes:
        ligne.duree_minutes,
      nombre_interventions:
        ligne.nombre_interventions,
      nature_services: [
        ...ligne.natures,
      ].join(", "),
    }))
    .sort((a, b) =>
      `${a.mois}:${a.intervenant_nom}`.localeCompare(
        `${b.mois}:${b.intervenant_nom}`
      )
    );

  const factures =
    demandes.map((demande) => ({
      id: demande.facture_id,
      numero:
        demande.numero_facture,
      date: demande.date_facture,
      montant_ttc: nombre(
        demande
          .montant_facture_ttc
      ),
    }));

  const montantFacturesTtc =
    Math.round(
      (
        factures.reduce(
          (total, facture) =>
            total +
            facture.montant_ttc,
          0
        ) +
        Number.EPSILON
      ) * 100
    ) / 100;

  const naturesAutomatiques = [
    ...new Set(
      fiches
        .flatMap((fiche) => [
          texte(
            fiche.type_intervention,
            300
          ),
          texte(fiche.titre, 300),
        ])
        .filter(Boolean)
    ),
  ].join(", ");

  return {
    organisme: {
      nom: premiereValeur(
        entreprise.nom_entreprise,
        parametres.nom_entreprise
      ),
      adresse: premiereValeur(
        entreprise.adresse,
        parametres.adresse
      ),
      code_postal:
        premiereValeur(
          entreprise.code_postal,
          parametres.code_postal
        ),
      ville: premiereValeur(
        entreprise.ville,
        parametres.ville
      ),
      siret: premiereValeur(
        entreprise.siret,
        parametres.siret
      ),
      email: premiereValeur(
        entreprise.email_contact,
        parametres.email
      ),
      telephone:
        premiereValeur(
          entreprise.telephone,
          parametres.telephone
        ),
    },
    beneficiaire: {
      nom: nomClient(client),
      adresse:
        texte(client.adresse, 500),
      code_postal:
        texte(
          client.code_postal,
          30
        ),
      ville: texte(
        client.ville,
        200
      ),
    },
    numero_declaration_sap:
      premiereValeur(
        integration.numero_sap
      ),
    factures,
    interventions,
    montant_factures_ttc:
      montantFacturesTtc,
    nature_services:
      naturesAutomatiques,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const supabaseAdmin =
      creerSupabaseAdmin();

    const authentification =
      await authentifier(
        request,
        supabaseAdmin
      );

    if (
      authentification.erreur ||
      !authentification.entrepriseId
    ) {
      return (
        authentification.erreur ??
        NextResponse.json(
          {
            succes: false,
            erreur:
              "Impossible de vérifier l’accès.",
          },
          { status: 500 }
        )
      );
    }

    const url =
      new URL(request.url);

    const annee = Number.parseInt(
      url.searchParams.get(
        "annee"
      ) ||
        String(
          new Date().getFullYear() -
            1
        ),
      10
    );

    const clientId =
      texte(
        url.searchParams.get(
          "clientId"
        ),
        100
      );

    if (
      annee < 2000 ||
      annee > 2100
    ) {
      return NextResponse.json(
        {
          succes: false,
          erreur:
            "Année invalide.",
        },
        { status: 400 }
      );
    }

    const entrepriseId =
      authentification.entrepriseId;

    const {
      data: demandes,
      error: demandesError,
    } = await supabaseAdmin
      .from(
        "demandes_paiement_urssaf"
      )
      .select(
        "client_id"
      )
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .eq("statut_local", "payee")
      .gte(
        "date_facture",
        `${annee}-01-01`
      )
      .lte(
        "date_facture",
        `${annee}-12-31`
      );

    if (demandesError) {
      throw demandesError;
    }

    const clientIds = [
      ...new Set(
        (demandes || [])
          .map(
            (demande) =>
              demande.client_id as
                | string
                | null
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      ),
    ];

    let clients: Client[] = [];

    if (clientIds.length > 0) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("clients")
        .select(
          "id, type_client, nom, prenom, entreprise, email, adresse, code_postal, ville"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .in("id", clientIds)
        .order("nom", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      clients =
        (data || []) as Client[];
    }

    const {
      data: attestations,
      error: attestationsError,
    } = await supabaseAdmin
      .from(
        "attestations_fiscales_sap"
      )
      .select(
        "id, client_id, annee, numero, statut, beneficiaire_snapshot, montant_factures_ttc, montant_acquitte_client, date_emission, updated_at"
      )
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .eq("annee", annee)
      .order("updated_at", {
        ascending: false,
      });

    if (attestationsError) {
      throw attestationsError;
    }

    let preparation = null;
    let existante = null;

    if (clientId) {
      preparation =
        await preparerDonnees({
          supabaseAdmin,
          entrepriseId,
          clientId,
          annee,
        });

      const {
        data,
        error,
      } = await supabaseAdmin
        .from(
          "attestations_fiscales_sap"
        )
        .select("id, entreprise_id, client_id, annee, numero, statut, organisme_snapshot, beneficiaire_snapshot, factures_snapshot, interventions_snapshot, nature_services, compte_debite_masque, montant_factures_ttc, montant_acquitte_client, montant_cesu_prefinance, numero_declaration_sap, date_enregistrement_sap, signataire_nom, signataire_qualite, date_emission, notes, generee_at, creee_par, created_at, updated_at")
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .eq(
          "client_id",
          clientId
        )
        .eq("annee", annee)
        .maybeSingle();

      if (error) {
        throw error;
      }

      existante = data;
    }

    return NextResponse.json({
      succes: true,
      annee,
      clients: clients.map(
        (client) => ({
          id: client.id,
          nom: nomClient(client),
          email:
            client.email || null,
        })
      ),
      attestations:
        attestations || [],
      preparation,
      existante,
      signataire_defaut:
        authentification.profil
          ? `${texte(
              authentification.profil
                .prenom,
              100
            )} ${texte(
              authentification.profil
                .nom,
              100
            )}`.trim()
          : "",
    });
  } catch (error) {
    console.error(
      "Erreur attestations fiscales SAP :",
      error
    );

    return NextResponse.json(
      {
        succes: false,
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger les attestations fiscales.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const supabaseAdmin =
      creerSupabaseAdmin();

    const authentification =
      await authentifier(
        request,
        supabaseAdmin
      );

    if (
      authentification.erreur ||
      !authentification.profil ||
      !authentification.entrepriseId
    ) {
      return (
        authentification.erreur ??
        NextResponse.json(
          {
            succes: false,
            erreur:
              "Impossible de vérifier l’accès.",
          },
          { status: 500 }
        )
      );
    }

    const body =
      (await request
        .json()
        .catch(
          () => null
        )) as CorpsAttestation | null;

    const action =
      body?.action === "valider"
        ? "valider"
        : "enregistrer";

    const clientId =
      texte(body?.clientId, 100);

    const annee = Number.parseInt(
      String(body?.annee || ""),
      10
    );

    if (!clientId) {
      return NextResponse.json(
        {
          succes: false,
          erreur:
            "Sélectionnez un client.",
        },
        { status: 400 }
      );
    }

    if (
      annee < 2000 ||
      annee > 2100
    ) {
      return NextResponse.json(
        {
          succes: false,
          erreur:
            "Année invalide.",
        },
        { status: 400 }
      );
    }

    const preparation =
      await preparerDonnees({
        supabaseAdmin,
        entrepriseId:
          authentification
            .entrepriseId,
        clientId,
        annee,
      });

    const natureServices =
      texte(
        body?.natureServices,
        3000
      ) ||
      preparation.nature_services;

    const compteDebiteMasque =
      texte(
        body?.compteDebiteMasque,
        100
      );

    const montantAcquitteRenseigne =
      body?.montantAcquitteClient !==
        null &&
      body?.montantAcquitteClient !==
        undefined &&
      String(
        body.montantAcquitteClient
      ).trim() !== "";

    const montantAcquitteClient =
      nombre(
        body
          ?.montantAcquitteClient
      );

    const montantCesuPrefinance =
      nombre(
        body
          ?.montantCesuPrefinance
      );

    const numeroDeclarationSap =
      texte(
        body
          ?.numeroDeclarationSap,
        200
      ) ||
      preparation
        .numero_declaration_sap;

    const dateEnregistrementSap =
      texte(
        body
          ?.dateEnregistrementSap,
        10
      );

    const signataireNom =
      texte(
        body?.signataireNom,
        300
      );

    const signataireQualite =
      texte(
        body
          ?.signataireQualite,
        300
      );

    const dateEmission =
      texte(
        body?.dateEmission,
        10
      ) ||
      new Date()
        .toISOString()
        .slice(0, 10);

    const notes =
      texte(body?.notes, 3000);

    if (
      montantAcquitteClient >
      preparation
        .montant_factures_ttc +
        0.01
    ) {
      return NextResponse.json(
        {
          succes: false,
          erreur:
            "Le montant acquitté par le client ne peut pas dépasser le total des factures recensées.",
        },
        { status: 400 }
      );
    }

    if (
      montantCesuPrefinance >
      montantAcquitteClient +
        0.01
    ) {
      return NextResponse.json(
        {
          succes: false,
          erreur:
            "Le montant CESU préfinancé ne peut pas dépasser le montant acquitté par le client.",
        },
        { status: 400 }
      );
    }

    if (action === "valider") {
      const erreurs: string[] = [];

      if (!natureServices) {
        erreurs.push(
          "La nature des services est obligatoire."
        );
      }

      if (!montantAcquitteRenseigne) {
        erreurs.push(
          "Le montant effectivement acquitté par le client doit être renseigné et contrôlé."
        );
      }

      if (!numeroDeclarationSap) {
        erreurs.push(
          "Le numéro de déclaration SAP est obligatoire."
        );
      }

      if (
        !dateEnregistrementSap ||
        !dateValide(
          dateEnregistrementSap
        )
      ) {
        erreurs.push(
          "La date d’enregistrement SAP est obligatoire."
        );
      }

      if (!signataireNom) {
        erreurs.push(
          "Le nom du signataire est obligatoire."
        );
      }

      if (!signataireQualite) {
        erreurs.push(
          "La qualité du signataire est obligatoire."
        );
      }

      if (
        !dateValide(dateEmission)
      ) {
        erreurs.push(
          "La date d’émission est invalide."
        );
      }

      if (
        preparation.factures
          .length === 0
      ) {
        erreurs.push(
          "Aucune demande de paiement URSSAF payée n’a été trouvée pour ce client et cette année."
        );
      }

      if (
        erreurs.length > 0
      ) {
        return NextResponse.json(
          {
            succes: false,
            erreur: erreurs[0],
            erreurs,
          },
          { status: 400 }
        );
      }
    }

    const numero =
      `AF-${annee}-${clientId
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase()}`;

    const maintenant =
      new Date().toISOString();

    const {
      data: attestation,
      error,
    } = await supabaseAdmin
      .from(
        "attestations_fiscales_sap"
      )
      .upsert(
        {
          entreprise_id:
            authentification
              .entrepriseId,
          client_id: clientId,
          annee,
          numero,
          statut:
            action === "valider"
              ? "validee"
              : "brouillon",
          organisme_snapshot:
            preparation.organisme,
          beneficiaire_snapshot:
            preparation.beneficiaire,
          factures_snapshot:
            preparation.factures,
          interventions_snapshot:
            preparation.interventions,
          nature_services:
            natureServices,
          compte_debite_masque:
            compteDebiteMasque ||
            null,
          montant_factures_ttc:
            preparation
              .montant_factures_ttc,
          montant_acquitte_client:
            montantAcquitteClient,
          montant_cesu_prefinance:
            montantCesuPrefinance,
          numero_declaration_sap:
            numeroDeclarationSap,
          date_enregistrement_sap:
            dateEnregistrementSap ||
            null,
          signataire_nom:
            signataireNom,
          signataire_qualite:
            signataireQualite,
          date_emission:
            dateEmission,
          notes: notes || null,
          generee_at:
            action === "valider"
              ? maintenant
              : null,
          creee_par:
            authentification
              .profil.id,
        },
        {
          onConflict:
            "entreprise_id,client_id,annee",
        }
      )
      .select("id, entreprise_id, client_id, annee, numero, statut, organisme_snapshot, beneficiaire_snapshot, factures_snapshot, interventions_snapshot, nature_services, compte_debite_masque, montant_factures_ttc, montant_acquitte_client, montant_cesu_prefinance, numero_declaration_sap, date_enregistrement_sap, signataire_nom, signataire_qualite, date_emission, notes, generee_at, creee_par, created_at, updated_at")
      .single();

    if (error) {
      throw error;
    }

    const { error: journalError } =
      await supabaseAdmin.rpc(
        "arboboard_ecrire_journal",
        {
          p_entreprise_id:
            authentification
              .entrepriseId,
          p_action:
            action === "valider"
              ? "attestation_fiscale_sap_validee"
              : "attestation_fiscale_sap_enregistree",
          p_categorie:
            "conformite",
          p_ressource_type:
            "attestation_fiscale_sap",
          p_ressource_id:
            attestation.id,
          p_resultat: "succes",
          p_description:
            action === "valider"
              ? "Une attestation fiscale annuelle SAP a été validée."
              : "Un brouillon d’attestation fiscale annuelle SAP a été enregistré.",
          p_details: {
            client_id: clientId,
            annee,
            numero,
            montant_factures_ttc:
              preparation
                .montant_factures_ttc,
            montant_acquitte_client:
              montantAcquitteClient,
          },
        }
      );

    if (journalError) {
      console.warn(
        "Journalisation attestation fiscale impossible :",
        journalError
      );
    }

    return NextResponse.json({
      succes: true,
      message:
        action === "valider"
          ? "Attestation fiscale validée. Le PDF est disponible."
          : "Brouillon de l’attestation fiscale enregistré.",
      attestation,
    });
  } catch (error) {
    console.error(
      "Erreur enregistrement attestation fiscale :",
      error
    );

    return NextResponse.json(
      {
        succes: false,
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer l’attestation fiscale.",
      },
      { status: 500 }
    );
  }
}