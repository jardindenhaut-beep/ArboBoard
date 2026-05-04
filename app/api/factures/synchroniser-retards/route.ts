import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function creerSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configuration Supabase serveur manquante.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = creerSupabaseAdmin();

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Token d’authentification manquant.",
        },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Utilisateur non connecté.",
        },
        { status: 401 }
      );
    }

    const { data: profil, error: profilError } = await supabaseAdmin
      .from("profils_utilisateurs")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profilError || !profil) {
      return NextResponse.json(
        {
          success: false,
          error: "Profil utilisateur introuvable.",
        },
        { status: 403 }
      );
    }

    if (
      profil.role !== "chef" ||
      profil.statut !== "actif" ||
      !profil.entreprise_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Accès refusé. Seul le chef actif peut synchroniser les retards.",
        },
        { status: 403 }
      );
    }

    const entrepriseId = profil.entreprise_id;
    const aujourdHui = dateDuJour();

    const { data: facturesEnRetard, error: rechercheError } =
      await supabaseAdmin
        .from("factures")
        .select("id, numero, date_echeance, reste_a_payer, statut")
        .eq("entreprise_id", entrepriseId)
        .eq("statut", "envoyee")
        .gt("reste_a_payer", 0)
        .lt("date_echeance", aujourdHui);

    if (rechercheError) {
      throw rechercheError;
    }

    const factures = facturesEnRetard || [];

    if (factures.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        message: "Aucune facture à passer en retard.",
      });
    }

    const ids = factures.map((facture: any) => facture.id);

    const { error: updateError } = await supabaseAdmin
      .from("factures")
      .update({
        statut: "en_retard",
      })
      .eq("entreprise_id", entrepriseId)
      .in("id", ids);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      total: factures.length,
      factures,
      message:
        factures.length === 1
          ? "1 facture passée en retard."
          : `${factures.length} factures passées en retard.`,
    });
  } catch (error: any) {
    console.error("Erreur synchronisation retards factures :", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur est survenue pendant la synchronisation des retards.",
      },
      { status: 500 }
    );
  }
}