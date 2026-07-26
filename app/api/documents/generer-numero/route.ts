import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TypeDocument = "devis" | "facture" | "avoir";

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
      .select("id, entreprise_id, role, statut")
      .eq("id", user.id)
      .maybeSingle();

    if (profilError || !profil) {
      console.error(
        "Erreur lecture profil pour génération de numéro :",
        profilError
      );

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
            "Accès refusé. Seul le chef actif peut générer un numéro de document.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      typeDocument?: TypeDocument | string;
      type_document?: TypeDocument | string;
    };

    const typeDocument = String(
      body.typeDocument || body.type_document || ""
    ).trim() as TypeDocument;

    if (!["devis", "facture", "avoir"].includes(typeDocument)) {
      return NextResponse.json(
        {
          success: false,
          error: "Type de document invalide.",
        },
        { status: 400 }
      );
    }

    const { data: numero, error: rpcError } = await supabaseAdmin.rpc(
      "generer_numero_document",
      {
        p_entreprise_id: profil.entreprise_id,
        p_type_document: typeDocument,
      }
    );

    if (rpcError) {
      console.error(
        "Erreur RPC génération numéro document :",
        rpcError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Impossible de générer le numéro du document.",
        },
        { status: 500 }
      );
    }

    if (!numero) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de générer le numéro du document.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      typeDocument,
      numero,
    });
  } catch (error) {
    console.error("Erreur génération numéro document :", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Une erreur est survenue pendant la génération du numéro.",
      },
      { status: 500 }
    );
  }
}