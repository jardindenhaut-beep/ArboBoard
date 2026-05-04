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

function nombreDepuisValeur(valeur: unknown) {
  if (typeof valeur === "number") {
    return Number.isFinite(valeur) ? valeur : 0;
  }

  const nombre = Number.parseFloat(
    String(valeur || "")
      .replace(",", ".")
      .replace(/\s/g, "")
      .trim()
  );

  return Number.isFinite(nombre) ? nombre : 0;
}

function arrondir2(nombre: number) {
  return Math.round((nombre + Number.EPSILON) * 100) / 100;
}

async function recalculerPaiementsFacture(params: {
  supabaseAdmin: any;
  entrepriseId: string;
  factureId: string;
  totalTtc: number;
}) {
  const { supabaseAdmin, entrepriseId, factureId, totalTtc } = params;

  const { data: paiements, error: paiementsError } = await supabaseAdmin
    .from("factures_paiements")
    .select("montant")
    .eq("entreprise_id", entrepriseId)
    .eq("facture_id", factureId);

  if (paiementsError) {
    throw new Error(
      paiementsError.message || "Impossible de recalculer les paiements."
    );
  }

  const montantPaye = arrondir2(
    (paiements || []).reduce(
      (total: number, paiement: any) =>
        total + nombreDepuisValeur(paiement.montant),
      0
    )
  );

  const resteAPayer = arrondir2(Math.max(totalTtc - montantPaye, 0));

  return {
    montantPaye,
    resteAPayer,
    statut: resteAPayer <= 0 && totalTtc > 0 ? "payee" : "envoyee",
  };
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

    const body = await request.json().catch(() => null);
    const paiementId = String(body?.paiementId || "").trim();

    if (!paiementId) {
      return NextResponse.json(
        {
          success: false,
          error: "Identifiant du paiement manquant.",
        },
        { status: 400 }
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
          error: "Accès refusé. Seul le chef actif peut supprimer un paiement.",
        },
        { status: 403 }
      );
    }

    const entrepriseId = profil.entreprise_id;

    const { data: paiement, error: paiementError } = await supabaseAdmin
      .from("factures_paiements")
      .select("*")
      .eq("id", paiementId)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (paiementError || !paiement) {
      return NextResponse.json(
        {
          success: false,
          error: "Paiement introuvable.",
        },
        { status: 404 }
      );
    }

    const factureId = paiement.facture_id;

    if (!factureId) {
      return NextResponse.json(
        {
          success: false,
          error: "Facture liée au paiement introuvable.",
        },
        { status: 400 }
      );
    }

    const { data: facture, error: factureError } = await supabaseAdmin
      .from("factures")
      .select("*")
      .eq("id", factureId)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (factureError || !facture) {
      return NextResponse.json(
        {
          success: false,
          error: "Facture introuvable.",
        },
        { status: 404 }
      );
    }

    const { error: suppressionError } = await supabaseAdmin
      .from("factures_paiements")
      .delete()
      .eq("id", paiementId)
      .eq("entreprise_id", entrepriseId);

    if (suppressionError) {
      throw new Error(
        suppressionError.message || "Impossible de supprimer le paiement."
      );
    }

    const totalTtc = arrondir2(nombreDepuisValeur(facture.total_ttc));

    const recalcul = await recalculerPaiementsFacture({
      supabaseAdmin,
      entrepriseId,
      factureId,
      totalTtc,
    });

    const statutFinal =
      facture.statut === "annulee" || facture.statut === "archive"
        ? facture.statut
        : recalcul.statut;

    const { data: factureMaj, error: updateError } = await supabaseAdmin
      .from("factures")
      .update({
        montant_paye: recalcul.montantPaye,
        reste_a_payer: recalcul.resteAPayer,
        statut: statutFinal,
      })
      .eq("id", factureId)
      .eq("entreprise_id", entrepriseId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(
        updateError.message ||
          "Paiement supprimé, mais impossible de mettre à jour la facture."
      );
    }

    return NextResponse.json({
      success: true,
      message: "Paiement supprimé et facture recalculée.",
      facture: factureMaj,
      montantPaye: recalcul.montantPaye,
      resteAPayer: recalcul.resteAPayer,
      statut: statutFinal,
    });
  } catch (error: any) {
    console.error("Erreur suppression paiement facture :", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur est survenue pendant la suppression du paiement.",
      },
      { status: 500 }
    );
  }
}