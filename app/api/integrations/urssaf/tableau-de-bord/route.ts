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

type ClientUrssaf = {
  id: string;
  client_id: string;
  statut_inscription: string;
  dernier_message?: string | null;
  updated_at?: string | null;
};

type DemandePaiement = {
  id: string;
  facture_id: string;
  numero_facture: string;
  statut_local: string;
  info_virement?: Record<string, unknown> | null;
  dernier_message?: string | null;
  derniere_verification_at?: string | null;
  updated_at?: string | null;
};

type PaiementUrssaf = {
  demande_paiement_urssaf_id: string | null;
};

type AlerteUrssaf = {
  id: string;
  type: "client" | "demande";
  statut: string;
  titre: string;
  message: string;
  date: string | null;
  lien: string;
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

function nettoyerMessage(
  valeur: unknown,
  longueur = 1000
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

function compter(
  valeurs: string[],
  valeur: string
) {
  return valeurs.filter(
    (statut) => statut === valeur
  ).length;
}

async function authentifierChef(
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
      await authentifierChef(
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

    const [
      clientsResultat,
      demandesResultat,
      paiementsResultat,
    ] = await Promise.all([
      supabaseAdmin
        .from("clients_urssaf_tp")
        .select(
          "id, client_id, statut_inscription, dernier_message, updated_at"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .order("updated_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from(
          "demandes_paiement_urssaf"
        )
        .select(
          "id, facture_id, numero_facture, statut_local, info_virement, dernier_message, derniere_verification_at, updated_at"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .order("updated_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("factures_paiements")
        .select(
          "demande_paiement_urssaf_id"
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

    if (clientsResultat.error) {
      throw clientsResultat.error;
    }

    if (demandesResultat.error) {
      throw demandesResultat.error;
    }

    if (paiementsResultat.error) {
      throw paiementsResultat.error;
    }

    const clients =
      (clientsResultat.data ||
        []) as ClientUrssaf[];

    const demandes =
      (demandesResultat.data ||
        []) as DemandePaiement[];

    const paiements =
      (paiementsResultat.data ||
        []) as PaiementUrssaf[];

    const statutsClients =
      clients.map(
        (client) =>
          client.statut_inscription
      );

    const statutsDemandes =
      demandes.map(
        (demande) =>
          demande.statut_local
      );

    const demandesRapprochees =
      new Set(
        paiements
          .map(
            (paiement) =>
              paiement
                .demande_paiement_urssaf_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      );

    const virementsARapprocher =
      demandes.filter(
        (demande) =>
          demande.statut_local ===
            "payee" &&
          Boolean(
            demande.info_virement
          ) &&
          !demandesRapprochees.has(
            demande.id
          )
      ).length;

    const alertesClients: AlerteUrssaf[] =
      clients
        .filter((client) =>
          [
            "refuse",
            "erreur",
          ].includes(
            client.statut_inscription
          )
        )
        .slice(0, 5)
        .map((client) => ({
          id: client.id,
          type: "client",
          statut:
            client.statut_inscription,
          titre:
            "Dossier client Avance immédiate",
          message:
            nettoyerMessage(
              client.dernier_message
            ) ||
            "Le dossier client nécessite une vérification.",
          date:
            client.updated_at ||
            null,
          lien: "/chef/clients",
        }));

    const alertesDemandes: AlerteUrssaf[] =
      demandes
        .filter((demande) =>
          [
            "impayee",
            "annulee",
            "erreur",
          ].includes(
            demande.statut_local
          )
        )
        .slice(0, 5)
        .map((demande) => ({
          id: demande.id,
          type: "demande",
          statut:
            demande.statut_local,
          titre:
            `Facture ${
              demande.numero_facture ||
              "sans numéro"
            }`,
          message:
            nettoyerMessage(
              demande.dernier_message
            ) ||
            "La demande de paiement nécessite une vérification.",
          date:
            demande.updated_at ||
            null,
          lien: "/chef/factures",
        }));

    const alertes = [
      ...alertesClients,
      ...alertesDemandes,
    ]
      .sort(
        (a, b) =>
          new Date(
            b.date || 0
          ).getTime() -
          new Date(
            a.date || 0
          ).getTime()
      )
      .slice(0, 8);

    const derniereVerification =
      demandes
        .map(
          (demande) =>
            demande
              .derniere_verification_at
        )
        .filter(
          (
            valeur
          ): valeur is string =>
            Boolean(valeur)
        )
        .sort(
          (a, b) =>
            new Date(b).getTime() -
            new Date(a).getTime()
        )[0] || null;

    return NextResponse.json({
      succes: true,
      tableau: {
        clients: {
          total: clients.length,
          brouillon: compter(
            statutsClients,
            "brouillon"
          ),
          pret: compter(
            statutsClients,
            "pret"
          ),
          appareillage_en_cours:
            compter(
              statutsClients,
              "appareillage_en_cours"
            ),
          actif: compter(
            statutsClients,
            "actif"
          ),
          refuse: compter(
            statutsClients,
            "refuse"
          ),
          erreur: compter(
            statutsClients,
            "erreur"
          ),
        },
        demandes: {
          total: demandes.length,
          brouillon: compter(
            statutsDemandes,
            "brouillon"
          ),
          prete: compter(
            statutsDemandes,
            "prete"
          ),
          transmise: compter(
            statutsDemandes,
            "transmise"
          ),
          payee: compter(
            statutsDemandes,
            "payee"
          ),
          impayee: compter(
            statutsDemandes,
            "impayee"
          ),
          annulee: compter(
            statutsDemandes,
            "annulee"
          ),
          erreur: compter(
            statutsDemandes,
            "erreur"
          ),
        },
        virements: {
          rapproches:
            demandesRapprochees.size,
          a_rapprocher:
            virementsARapprocher,
        },
        derniere_verification:
          derniereVerification,
        alertes,
      },
    });
  } catch (error) {
    console.error(
      "Erreur tableau de bord URSSAF :",
      error
    );

    return NextResponse.json(
      {
        succes: false,
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger le suivi Avance immédiate.",
      },
      { status: 500 }
    );
  }
}