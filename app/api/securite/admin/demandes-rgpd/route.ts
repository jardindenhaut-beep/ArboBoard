import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const STATUTS_AUTORISES = [
  "recue",
  "verification_identite",
  "en_cours",
  "terminee",
  "refusee",
  "annulee",
] as const;

type StatutDemande =
  (typeof STATUTS_AUTORISES)[number];

type ProfilAdministrateur = {
  id: string;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type EntrepriseAdministrateur = {
  id: string;
  plan_abonnement?: string | null;
};

type DemandeBrute = {
  id: string;
  entreprise_id: string;
  utilisateur_id: string;
  type_demande: string;
  statut: string;
  commentaire_utilisateur?: string | null;
  reponse_interne?: string | null;
  source: string;
  recue_at: string;
  echeance_reponse: string;
  prolongee_jusqu_au?: string | null;
  motif_prolongation?: string | null;
  prise_en_charge_at?: string | null;
  terminee_at?: string | null;
  annulee_at?: string | null;
  traitee_par?: string | null;
  created_at: string;
  updated_at: string;
};

type ProfilDemande = {
  id: string;
  email?: string | null;
  nom?: string | null;
  prenom?: string | null;
};

type EntrepriseDemande = {
  id: string;
  nom_entreprise?: string | null;
};

type CorpsModification = {
  demande_id?: unknown;
  statut?: unknown;
  reponse_interne?: unknown;
  prolonger?: unknown;
  motif_prolongation?: unknown;
};

const ROLES_AUTORISES = new Set([
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
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Configuration Supabase serveur incomplète."
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

function obtenirJeton(request: NextRequest) {
  const autorisation = request.headers.get("authorization");

  if (!autorisation?.startsWith("Bearer ")) {
    return null;
  }

  return autorisation.slice(7).trim() || null;
}

function estStatutDemande(
  valeur: unknown
): valeur is StatutDemande {
  return (
    typeof valeur === "string" &&
    STATUTS_AUTORISES.includes(
      valeur as StatutDemande
    )
  );
}

async function authentifierAdministrateur(
  request: NextRequest
) {
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
        { erreur: "Profil ou entreprise introuvable." },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  const profilType = profil as ProfilAdministrateur;

  if (
    !ROLES_AUTORISES.has(normaliser(profilType.role)) ||
    (
      profilType.statut &&
      normaliser(profilType.statut) !== "actif"
    )
  ) {
    return {
      erreur: NextResponse.json(
        { erreur: "Accès administrateur refusé." },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  const { data: entreprise, error: entrepriseError } =
    await supabaseAdmin
      .from("entreprises_abonnees")
      .select("id, plan_abonnement")
      .eq("id", profilType.entreprise_id)
      .single();

  if (entrepriseError || !entreprise) {
    return {
      erreur: NextResponse.json(
        { erreur: "Entreprise administrateur introuvable." },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  const entrepriseType =
    entreprise as EntrepriseAdministrateur;

  if (normaliser(entrepriseType.plan_abonnement) !== "dev") {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Cette administration est réservée au compte développeur Arboboard.",
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

export async function GET(request: NextRequest) {
  try {
    const authentification =
      await authentifierAdministrateur(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin
    ) {
      return authentification.erreur;
    }

    const { supabaseAdmin } = authentification;
    const { searchParams } = new URL(request.url);

    const statut = searchParams.get("statut");
    const typeDemande = searchParams.get("type_demande");

    let requete = supabaseAdmin
      .from("demandes_rgpd")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (
      statut &&
      statut !== "tous" &&
      estStatutDemande(statut)
    ) {
      requete = requete.eq("statut", statut);
    }

    if (
      typeDemande &&
      typeDemande !== "tous"
    ) {
      requete = requete.eq(
        "type_demande",
        typeDemande.slice(0, 50)
      );
    }

    const { data, error } = await requete;

    if (error) throw error;

    const demandes = (data || []) as DemandeBrute[];

    const utilisateurIds = [
      ...new Set(
        demandes.map(
          (demande) => demande.utilisateur_id
        )
      ),
    ];

    const entrepriseIds = [
      ...new Set(
        demandes.map(
          (demande) => demande.entreprise_id
        )
      ),
    ];

    const [
      profilsResultat,
      entreprisesResultat,
    ] = await Promise.all([
      utilisateurIds.length > 0
        ? supabaseAdmin
            .from("profils_utilisateurs")
            .select("id, email, nom, prenom")
            .in("id", utilisateurIds)
        : Promise.resolve({
            data: [] as ProfilDemande[],
            error: null,
          }),
      entrepriseIds.length > 0
        ? supabaseAdmin
            .from("entreprises_abonnees")
            .select("id, nom_entreprise")
            .in("id", entrepriseIds)
        : Promise.resolve({
            data: [] as EntrepriseDemande[],
            error: null,
          }),
    ]);

    if (profilsResultat.error) {
      throw profilsResultat.error;
    }

    if (entreprisesResultat.error) {
      throw entreprisesResultat.error;
    }

    const profils = new Map(
      ((profilsResultat.data || []) as ProfilDemande[])
        .map((profil) => [profil.id, profil])
    );

    const entreprises = new Map(
      (
        (entreprisesResultat.data || []) as
          EntrepriseDemande[]
      ).map((entreprise) => [
        entreprise.id,
        entreprise,
      ])
    );

    return NextResponse.json({
      demandes: demandes.map((demande) => {
        const profil = profils.get(
          demande.utilisateur_id
        );
        const entreprise = entreprises.get(
          demande.entreprise_id
        );

        return {
          ...demande,
          utilisateur: {
            id: demande.utilisateur_id,
            email: profil?.email || null,
            nom: profil?.nom || null,
            prenom: profil?.prenom || null,
          },
          entreprise: {
            id: demande.entreprise_id,
            nom_entreprise:
              entreprise?.nom_entreprise || null,
          },
        };
      }),
    });
  } catch (error) {
    console.error(
      "Erreur administration demandes RGPD :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger les demandes RGPD.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authentification =
      await authentifierAdministrateur(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const { supabaseAdmin, profil } = authentification;
    const corps =
      (await request.json()) as CorpsModification;

    if (
      typeof corps.demande_id !== "string" ||
      !corps.demande_id.trim()
    ) {
      return NextResponse.json(
        { erreur: "Identifiant de demande invalide." },
        { status: 400 }
      );
    }

    if (!estStatutDemande(corps.statut)) {
      return NextResponse.json(
        { erreur: "Statut de demande invalide." },
        { status: 400 }
      );
    }

    const reponse =
      typeof corps.reponse_interne === "string"
        ? corps.reponse_interne.trim().slice(0, 10000)
        : "";

    const prolonger = corps.prolonger === true;

    const motif =
      typeof corps.motif_prolongation === "string"
        ? corps.motif_prolongation.trim().slice(0, 2000)
        : "";

    if (prolonger && !motif) {
      return NextResponse.json(
        {
          erreur:
            "Un motif est obligatoire pour enregistrer la prolongation.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "arboboard_traiter_demande_rgpd",
      {
        p_demande_id: corps.demande_id.trim(),
        p_utilisateur_admin_id: profil.id,
        p_statut: corps.statut,
        p_reponse_interne: reponse || null,
        p_prolonger: prolonger,
        p_motif_prolongation: motif || null,
      }
    );

    if (error) throw error;

    return NextResponse.json({
      succes: true,
      demande: data,
    });
  } catch (error) {
    console.error(
      "Erreur traitement demande RGPD :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour la demande.",
      },
      { status: 500 }
    );
  }
}