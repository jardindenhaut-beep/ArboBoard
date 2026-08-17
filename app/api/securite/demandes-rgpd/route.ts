import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TYPES_DEMANDE = [
  "acces",
  "rectification",
  "effacement",
  "limitation",
  "opposition",
  "portabilite",
] as const;

type TypeDemande = (typeof TYPES_DEMANDE)[number];

type ProfilRgpd = {
  id: string;
  entreprise_id?: string | null;
  statut?: string | null;
};

type CorpsCreation = {
  type_demande?: unknown;
  commentaire?: unknown;
};

type CorpsAnnulation = {
  demande_id?: unknown;
};

function creerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Configuration Supabase serveur incomplète.");
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

function normaliser(valeur: string | null | undefined) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function estTypeDemande(valeur: unknown): valeur is TypeDemande {
  return (
    typeof valeur === "string" &&
    TYPES_DEMANDE.includes(valeur as TypeDemande)
  );
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
      user: null,
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
      user: null,
    };
  }

  const { data: profil, error: profilError } = await supabaseAdmin
    .from("profils_utilisateurs")
    .select("id, entreprise_id, statut")
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
      user: null,
    };
  }

  const profilType = profil as ProfilRgpd;

  if (
    profilType.statut &&
    normaliser(profilType.statut) !== "actif"
  ) {
    return {
      erreur: NextResponse.json(
        { erreur: "Compte utilisateur inactif." },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
      user: null,
    };
  }

  return {
    erreur: null,
    supabaseAdmin,
    profil: profilType,
    user,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authentification = await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const { supabaseAdmin, profil } = authentification;

    const { data, error } = await supabaseAdmin
      .from("demandes_rgpd")
      .select(
        "id, type_demande, statut, commentaire_utilisateur, reponse_interne, source, recue_at, echeance_reponse, prolongee_jusqu_au, motif_prolongation, prise_en_charge_at, terminee_at, annulee_at, created_at, updated_at"
      )
      .eq("utilisateur_id", profil.id)
      .eq("entreprise_id", profil.entreprise_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      demandes: data || [],
    });
  } catch (error) {
    console.error("Erreur lecture demandes RGPD :", error);

    return NextResponse.json(
      {
        erreur: "Impossible de charger les demandes.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authentification = await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const { supabaseAdmin, profil } = authentification;
    const corps = (await request.json()) as CorpsCreation;

    if (!estTypeDemande(corps.type_demande)) {
      return NextResponse.json(
        { erreur: "Type de demande invalide." },
        { status: 400 }
      );
    }

    const commentaire =
      typeof corps.commentaire === "string"
        ? corps.commentaire.trim().slice(0, 2000)
        : "";

    const { data, error } = await supabaseAdmin.rpc(
      "arboboard_creer_demande_rgpd",
      {
        p_entreprise_id: profil.entreprise_id,
        p_utilisateur_id: profil.id,
        p_type_demande: corps.type_demande,
        p_commentaire_utilisateur: commentaire || null,
        p_source: "espace_compte",
      }
    );

    if (error) throw error;

    return NextResponse.json(
      {
        succes: true,
        demande: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur création demande RGPD :", error);

    const dejaEnCours =
      error instanceof Error &&
      error.message.includes("déjà en cours");

    return NextResponse.json(
      {
        erreur: dejaEnCours
          ? "Une demande de ce type est déjà en cours."
          : "Impossible de créer la demande.",
      },
      { status: dejaEnCours ? 409 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authentification = await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const { supabaseAdmin, profil } = authentification;
    const corps = (await request.json()) as CorpsAnnulation;

    if (
      typeof corps.demande_id !== "string" ||
      !corps.demande_id.trim()
    ) {
      return NextResponse.json(
        { erreur: "Identifiant de demande invalide." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "arboboard_annuler_demande_rgpd",
      {
        p_demande_id: corps.demande_id.trim(),
        p_utilisateur_id: profil.id,
      }
    );

    if (error) throw error;

    return NextResponse.json({
      succes: true,
      demande: data,
    });
  } catch (error) {
    console.error(
      "Erreur annulation demande RGPD :",
      error
    );

    return NextResponse.json(
      {
        erreur: "Impossible d’annuler la demande.",
      },
      { status: 500 }
    );
  }
}