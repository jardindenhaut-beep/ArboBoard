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
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type ClientBase = {
  id: string;
  type_client?: string | null;
  nom?: string | null;
  prenom?: string | null;
  entreprise?: string | null;
  email?: string | null;
};

type DossierClientUrssaf = {
  id: string;
  client_id: string;
  urssaf_id_client?: string | null;
  statut_inscription: string;
  dernier_message?: string | null;
  derniere_verification_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DemandePaiementUrssaf = {
  id: string;
  facture_id: string;
  client_id: string;
  urssaf_id_demande_paiement?: string | null;
  numero_facture: string;
  date_facture: string;
  date_debut_emploi: string;
  date_fin_emploi: string;
  montant_facture_ht: number | string;
  montant_facture_tva: number | string;
  montant_facture_ttc: number | string;
  montant_acompte: number | string;
  statut_local: string;
  statut_urssaf_code?: string | null;
  statut_urssaf_libelle?: string | null;
  info_rejet?: Record<string, unknown> | null;
  info_virement?: Record<string, unknown> | null;
  transmis_at?: string | null;
  derniere_verification_at?: string | null;
  dernier_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PaiementRapproche = {
  demande_paiement_urssaf_id: string | null;
  montant?: number | string | null;
  date_paiement?: string | null;
};

type LigneHistorique = {
  id: string;
  type: "client" | "demande";
  client_id: string;
  client_nom: string;
  client_email: string | null;
  statut: string;
  reference_urssaf: string | null;
  message: string | null;
  date_creation: string | null;
  date_mise_a_jour: string | null;
  derniere_verification: string | null;
  facture_id: string | null;
  numero_facture: string | null;
  date_facture: string | null;
  date_debut_emploi: string | null;
  date_fin_emploi: string | null;
  montant_ht: number | null;
  montant_tva: number | null;
  montant_ttc: number | null;
  montant_acompte: number | null;
  rapproche: boolean;
  montant_rapproche: number | null;
  date_rapprochement: string | null;
  info_rejet: Record<string, unknown> | null;
  info_virement: Record<string, unknown> | null;
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
  )
    .replace(/\s+/g, " ")
    .trim();

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
    ? resultat
    : 0;
}

function nomClient(
  client: ClientBase | undefined
) {
  if (!client) {
    return "Client introuvable";
  }

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
      )}`.trim() ||
      "Client professionnel"
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
      entrepriseId: null,
    };
  }

  const {
    data: profil,
    error: profilError,
  } = await supabaseAdmin
    .from("profils_utilisateurs")
    .select(
      "id, role, statut, entreprise_id"
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
      entrepriseId: null,
    };
  }

  const profilUtilisateur =
    profil as Profil;

  if (
    !ROLES_AUTORISES.has(
      normaliser(
        profilUtilisateur.role
      )
    ) ||
    (
      profilUtilisateur.statut &&
      normaliser(
        profilUtilisateur.statut
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
      entrepriseId: null,
    };
  }

  return {
    erreur: null,
    entrepriseId:
      profilUtilisateur.entreprise_id,
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

    const entrepriseId =
      authentification.entrepriseId;

    const url = new URL(request.url);
    const typeDemande =
      url.searchParams.get("type") ||
      "tous";
    const statutDemande =
      normaliser(
        url.searchParams.get("statut")
      );
    const recherche =
      normaliser(
        url.searchParams.get(
          "recherche"
        )
      );
    const limite = Math.min(
      1000,
      Math.max(
        1,
        Number.parseInt(
          url.searchParams.get(
            "limite"
          ) || "500",
          10
        ) || 500
      )
    );

    const [
      dossiersResultat,
      demandesResultat,
      paiementsResultat,
    ] = await Promise.all([
      supabaseAdmin
        .from("clients_urssaf_tp")
        .select(
          "id, client_id, urssaf_id_client, statut_inscription, dernier_message, derniere_verification_at, created_at, updated_at"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .order("updated_at", {
          ascending: false,
        })
        .limit(1000),

      supabaseAdmin
        .from(
          "demandes_paiement_urssaf"
        )
        .select(
          "id, facture_id, client_id, urssaf_id_demande_paiement, numero_facture, date_facture, date_debut_emploi, date_fin_emploi, montant_facture_ht, montant_facture_tva, montant_facture_ttc, montant_acompte, statut_local, statut_urssaf_code, statut_urssaf_libelle, info_rejet, info_virement, transmis_at, derniere_verification_at, dernier_message, created_at, updated_at"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .order("updated_at", {
          ascending: false,
        })
        .limit(1000),

      supabaseAdmin
        .from("factures_paiements")
        .select(
          "demande_paiement_urssaf_id, montant, date_paiement"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .not(
          "demande_paiement_urssaf_id",
          "is",
          null
        ),
    ]);

    if (dossiersResultat.error) {
      throw dossiersResultat.error;
    }

    if (demandesResultat.error) {
      throw demandesResultat.error;
    }

    if (paiementsResultat.error) {
      throw paiementsResultat.error;
    }

    const dossiers =
      (dossiersResultat.data ||
        []) as DossierClientUrssaf[];

    const demandes =
      (demandesResultat.data ||
        []) as DemandePaiementUrssaf[];

    const paiements =
      (paiementsResultat.data ||
        []) as PaiementRapproche[];

    const clientIds = [
      ...new Set([
        ...dossiers.map(
          (dossier) =>
            dossier.client_id
        ),
        ...demandes.map(
          (demande) =>
            demande.client_id
        ),
      ]),
    ];

    let clients:
      ClientBase[] = [];

    if (clientIds.length > 0) {
      const {
        data: clientsData,
        error: clientsError,
      } = await supabaseAdmin
        .from("clients")
        .select(
          "id, type_client, nom, prenom, entreprise, email"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .in("id", clientIds);

      if (clientsError) {
        throw clientsError;
      }

      clients =
        (clientsData ||
          []) as ClientBase[];
    }

    const clientsParId = new Map(
      clients.map((client) => [
        client.id,
        client,
      ])
    );

    const paiementsParDemande =
      new Map(
        paiements
          .filter(
            (
              paiement
            ): paiement is PaiementRapproche & {
              demande_paiement_urssaf_id: string;
            } =>
              Boolean(
                paiement
                  .demande_paiement_urssaf_id
              )
          )
          .map((paiement) => [
            paiement
              .demande_paiement_urssaf_id,
            paiement,
          ])
      );

    const lignesClients:
      LigneHistorique[] =
      dossiers.map((dossier) => {
        const client =
          clientsParId.get(
            dossier.client_id
          );

        return {
          id: dossier.id,
          type: "client",
          client_id:
            dossier.client_id,
          client_nom:
            nomClient(client),
          client_email:
            texte(
              client?.email,
              300
            ) || null,
          statut:
            dossier
              .statut_inscription,
          reference_urssaf:
            texte(
              dossier
                .urssaf_id_client,
              500
            ) || null,
          message:
            texte(
              dossier.dernier_message
            ) || null,
          date_creation:
            dossier.created_at ||
            null,
          date_mise_a_jour:
            dossier.updated_at ||
            null,
          derniere_verification:
            dossier
              .derniere_verification_at ||
            null,
          facture_id: null,
          numero_facture: null,
          date_facture: null,
          date_debut_emploi: null,
          date_fin_emploi: null,
          montant_ht: null,
          montant_tva: null,
          montant_ttc: null,
          montant_acompte: null,
          rapproche: false,
          montant_rapproche: null,
          date_rapprochement: null,
          info_rejet: null,
          info_virement: null,
        };
      });

    const lignesDemandes:
      LigneHistorique[] =
      demandes.map((demande) => {
        const client =
          clientsParId.get(
            demande.client_id
          );

        const paiement =
          paiementsParDemande.get(
            demande.id
          );

        return {
          id: demande.id,
          type: "demande",
          client_id:
            demande.client_id,
          client_nom:
            nomClient(client),
          client_email:
            texte(
              client?.email,
              300
            ) || null,
          statut:
            demande.statut_local,
          reference_urssaf:
            texte(
              demande
                .urssaf_id_demande_paiement,
              500
            ) || null,
          message:
            texte(
              demande.dernier_message
            ) ||
            texte(
              demande
                .statut_urssaf_libelle
            ) ||
            null,
          date_creation:
            demande.created_at ||
            null,
          date_mise_a_jour:
            demande.updated_at ||
            null,
          derniere_verification:
            demande
              .derniere_verification_at ||
            null,
          facture_id:
            demande.facture_id,
          numero_facture:
            demande.numero_facture,
          date_facture:
            demande.date_facture,
          date_debut_emploi:
            demande
              .date_debut_emploi,
          date_fin_emploi:
            demande
              .date_fin_emploi,
          montant_ht: nombre(
            demande
              .montant_facture_ht
          ),
          montant_tva: nombre(
            demande
              .montant_facture_tva
          ),
          montant_ttc: nombre(
            demande
              .montant_facture_ttc
          ),
          montant_acompte: nombre(
            demande.montant_acompte
          ),
          rapproche:
            Boolean(paiement),
          montant_rapproche:
            paiement
              ? nombre(
                  paiement.montant
                )
              : null,
          date_rapprochement:
            paiement
              ?.date_paiement ||
            null,
          info_rejet:
            demande.info_rejet ||
            null,
          info_virement:
            demande.info_virement ||
            null,
        };
      });

    let lignes = [
      ...lignesClients,
      ...lignesDemandes,
    ];

    if (
      typeDemande === "client" ||
      typeDemande === "demande"
    ) {
      lignes = lignes.filter(
        (ligne) =>
          ligne.type === typeDemande
      );
    }

    if (statutDemande) {
      lignes = lignes.filter(
        (ligne) =>
          normaliser(ligne.statut) ===
          statutDemande
      );
    }

    if (recherche) {
      lignes = lignes.filter(
        (ligne) => {
          const zone = normaliser(
            [
              ligne.client_nom,
              ligne.client_email,
              ligne.numero_facture,
              ligne.reference_urssaf,
              ligne.message,
              ligne.statut,
            ].join(" ")
          );

          return zone.includes(
            recherche
          );
        }
      );
    }

    lignes.sort(
      (a, b) =>
        new Date(
          b.date_mise_a_jour ||
            b.date_creation ||
            0
        ).getTime() -
        new Date(
          a.date_mise_a_jour ||
            a.date_creation ||
            0
        ).getTime()
    );

    const totalAvantLimite =
      lignes.length;

    lignes = lignes.slice(
      0,
      limite
    );

    return NextResponse.json({
      succes: true,
      historique: lignes,
      pagination: {
        total:
          totalAvantLimite,
        limite,
        tronque:
          totalAvantLimite >
          limite,
      },
      statistiques: {
        dossiers_clients:
          dossiers.length,
        demandes_paiement:
          demandes.length,
        demandes_payees:
          demandes.filter(
            (demande) =>
              demande.statut_local ===
              "payee"
          ).length,
        demandes_impayees:
          demandes.filter(
            (demande) =>
              demande.statut_local ===
              "impayee"
          ).length,
        virements_rapproches:
          paiementsParDemande.size,
      },
    });
  } catch (error) {
    console.error(
      "Erreur historique URSSAF :",
      error
    );

    return NextResponse.json(
      {
        succes: false,
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger l’historique Avance immédiate.",
      },
      { status: 500 }
    );
  }
}