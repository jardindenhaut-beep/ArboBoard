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

function nettoyerTexte(valeur: unknown) {
  const texte = String(valeur || "").trim();
  return texte.length > 0 ? texte : null;
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

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
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
    statut: resteAPayer <= 0 ? "payee" : "envoyee",
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

    const factureId = String(body?.factureId || "").trim();
    const montant = arrondir2(nombreDepuisValeur(body?.montant));
    const modePaiement = nettoyerTexte(body?.modePaiement);
    const referencePaiement = nettoyerTexte(body?.referencePaiement);
    const note = nettoyerTexte(body?.note);
    const datePaiement =
      nettoyerTexte(body?.datePaiement) || dateDuJour();

    if (!factureId) {
      return NextResponse.json(
        {
          success: false,
          error: "Identifiant de facture manquant.",
        },
        { status: 400 }
      );
    }

    if (montant <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Le montant du paiement doit être supérieur à 0.",
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
          error: "Accès refusé. Seul le chef actif peut enregistrer un paiement.",
        },
        { status: 403 }
      );
    }

    const entrepriseId = profil.entreprise_id;

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

    if (facture.statut === "annulee" || facture.statut === "archive") {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible d’encaisser une facture annulée ou archivée.",
        },
        { status: 400 }
      );
    }

    const totalTtc = arrondir2(nombreDepuisValeur(facture.total_ttc));
    const montantDejaPaye = arrondir2(nombreDepuisValeur(facture.montant_paye));
    const resteActuel = arrondir2(Math.max(totalTtc - montantDejaPaye, 0));

    if (resteActuel <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette facture est déjà entièrement payée.",
        },
        { status: 400 }
      );
    }

    if (montant > resteActuel + 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: `Le paiement dépasse le reste à payer. Reste actuel : ${resteActuel.toFixed(
            2
          )} €`,
        },
        { status: 400 }
      );
    }

    const { data: paiementCree, error: paiementError } = await supabaseAdmin
      .from("factures_paiements")
      .insert({
        entreprise_id: entrepriseId,
        facture_id: factureId,
        montant,
        mode_paiement: modePaiement,
        reference_paiement: referencePaiement,
        note,
        date_paiement: datePaiement,
        enregistre_par: user.id,
      })
      .select("*")
      .single();

    if (paiementError || !paiementCree?.id) {
      throw paiementError || new Error("Impossible d’enregistrer le paiement.");
    }

    const recalcul = await recalculerPaiementsFacture({
      supabaseAdmin,
      entrepriseId,
      factureId,
      totalTtc,
    });

    const { data: factureMaj, error: updateError } = await supabaseAdmin
      .from("factures")
      .update({
        montant_paye: recalcul.montantPaye,
        reste_a_payer: recalcul.resteAPayer,
        statut: recalcul.statut,
      })
      .eq("id", factureId)
      .eq("entreprise_id", entrepriseId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(
        updateError.message ||
          "Paiement enregistré, mais impossible de mettre à jour la facture."
      );
    }

    return NextResponse.json({
      success: true,
      message:
        recalcul.resteAPayer <= 0
          ? "Paiement enregistré. La facture est maintenant payée."
          : "Paiement enregistré avec succès.",
      paiement: paiementCree,
      facture: factureMaj,
      montantPaye: recalcul.montantPaye,
      resteAPayer: recalcul.resteAPayer,
      statut: recalcul.statut,
    });
  } catch (error: any) {
    console.error("Erreur enregistrement paiement facture :", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur est survenue pendant l’enregistrement du paiement.",
      },
      { status: 500 }
    );
  }
}