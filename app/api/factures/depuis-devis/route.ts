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

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

function dateDansJours(jours: number) {
  const date = new Date();
  date.setDate(date.getDate() + jours);
  return date.toISOString().slice(0, 10);
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

function calculerLigne(ligne: any) {
  const quantite = nombreDepuisValeur(ligne.quantite);
  const prixUnitaire = nombreDepuisValeur(ligne.prix_unitaire_ht);
  const tauxTva = nombreDepuisValeur(ligne.tva);

  const totalHt =
    ligne.total_ht !== null && ligne.total_ht !== undefined
      ? nombreDepuisValeur(ligne.total_ht)
      : arrondir2(quantite * prixUnitaire);

  const totalTva =
    ligne.total_tva !== null && ligne.total_tva !== undefined
      ? nombreDepuisValeur(ligne.total_tva)
      : arrondir2(totalHt * (tauxTva / 100));

  const totalTtc =
    ligne.total_ttc !== null && ligne.total_ttc !== undefined
      ? nombreDepuisValeur(ligne.total_ttc)
      : arrondir2(totalHt + totalTva);

  return {
    quantite,
    prixUnitaire,
    tauxTva,
    totalHt,
    totalTva,
    totalTtc,
  };
}

function calculerTotauxDepuisLignes(lignes: any[]) {
  return lignes.reduce(
    (acc, ligne) => {
      const calcul = calculerLigne(ligne);

      return {
        totalHt: arrondir2(acc.totalHt + calcul.totalHt),
        totalTva: arrondir2(acc.totalTva + calcul.totalTva),
        totalTtc: arrondir2(acc.totalTtc + calcul.totalTtc),
      };
    },
    {
      totalHt: 0,
      totalTva: 0,
      totalTtc: 0,
    }
  );
}

function echapperRegex(valeur: string) {
  return valeur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function genererNumeroFacture(params: {
  supabaseAdmin: any;
  entrepriseId: string;
  prefixeFacture?: string | null;
}) {
  const { supabaseAdmin, entrepriseId, prefixeFacture } = params;

  const prefixe = String(prefixeFacture || "FAC").trim() || "FAC";
  const annee = new Date().getFullYear();

  const { data, error } = await supabaseAdmin
    .from("factures")
    .select("numero")
    .eq("entreprise_id", entrepriseId)
    .ilike("numero", `${prefixe}-${annee}-%`);

  if (error) {
    throw new Error(error.message || "Impossible de lire les factures existantes.");
  }

  const regex = new RegExp(`^${echapperRegex(prefixe)}-${annee}-(\\d+)$`);
  let max = 0;

  for (const facture of data || []) {
    const numero = String(facture.numero || "");
    const match = numero.match(regex);

    if (match?.[1]) {
      const valeur = Number.parseInt(match[1], 10);
      if (Number.isFinite(valeur) && valeur > max) {
        max = valeur;
      }
    }
  }

  const prochainNumero = String(max + 1).padStart(4, "0");

  return `${prefixe}-${annee}-${prochainNumero}`;
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
    const devisId = String(body?.devisId || "").trim();

    if (!devisId) {
      return NextResponse.json(
        {
          success: false,
          error: "Identifiant du devis manquant.",
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
          error: "Accès refusé. Seul le chef actif peut facturer un devis.",
        },
        { status: 403 }
      );
    }

    const entrepriseId = profil.entreprise_id;

    const { data: entreprise, error: entrepriseError } = await supabaseAdmin
      .from("entreprises_abonnees")
      .select("*")
      .eq("id", entrepriseId)
      .maybeSingle();

    if (entrepriseError || !entreprise) {
      return NextResponse.json(
        {
          success: false,
          error: "Entreprise introuvable.",
        },
        { status: 404 }
      );
    }

    const { data: devis, error: devisError } = await supabaseAdmin
      .from("devis")
      .select("*")
      .eq("id", devisId)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (devisError || !devis) {
      return NextResponse.json(
        {
          success: false,
          error: "Devis introuvable.",
        },
        { status: 404 }
      );
    }

    if (devis.statut !== "accepte") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ce devis doit être au statut Accepté avant de pouvoir être facturé.",
        },
        { status: 400 }
      );
    }

    const { data: factureExistante, error: factureExistanteError } =
      await supabaseAdmin
        .from("factures")
        .select("id, numero, statut")
        .eq("entreprise_id", entrepriseId)
        .eq("devis_id", devisId)
        .neq("statut", "annulee")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (factureExistanteError) {
      throw factureExistanteError;
    }

    if (factureExistante?.id) {
      return NextResponse.json({
        success: true,
        dejaExistante: true,
        factureId: factureExistante.id,
        numero: factureExistante.numero,
        message: "Une facture existe déjà pour ce devis.",
      });
    }

    const { data: lignesDevis, error: lignesError } = await supabaseAdmin
      .from("devis_lignes")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("devis_id", devisId)
      .order("ordre", { ascending: true });

    if (lignesError) {
      throw lignesError;
    }

    const lignes = lignesDevis || [];

    if (lignes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de facturer un devis sans ligne.",
        },
        { status: 400 }
      );
    }

    const { data: parametres } = await supabaseAdmin
      .from("entreprise_parametres")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    const delaiPaiement = Number(parametres?.delai_paiement_jours || 30);

    const totauxLignes = calculerTotauxDepuisLignes(lignes);

    const totalHt =
      devis.total_ht !== null && devis.total_ht !== undefined
        ? nombreDepuisValeur(devis.total_ht)
        : totauxLignes.totalHt;

    const totalTva =
      devis.total_tva !== null && devis.total_tva !== undefined
        ? nombreDepuisValeur(devis.total_tva)
        : totauxLignes.totalTva;

    const totalTtc =
      devis.total_ttc !== null && devis.total_ttc !== undefined
        ? nombreDepuisValeur(devis.total_ttc)
        : totauxLignes.totalTtc;

    const numeroFacture = await genererNumeroFacture({
      supabaseAdmin,
      entrepriseId,
      prefixeFacture: parametres?.prefixe_facture || "FAC",
    });

    const payloadFacture = {
      entreprise_id: entrepriseId,
      client_id: devis.client_id || null,
      client_nom: devis.client_nom || null,
      devis_id: devis.id,
      numero: numeroFacture,
      objet: nettoyerTexte(
        devis.objet
          ? `Facture - ${devis.objet}`
          : "Facture suite devis accepté"
      ),
      description: nettoyerTexte(devis.description),
      type_facture: "simple",
      statut: "brouillon",
      date_facture: dateDuJour(),
      date_echeance: dateDansJours(delaiPaiement),
      total_ht: totalHt,
      total_tva: totalTva,
      total_ttc: totalTtc,
      montant_paye: 0,
      reste_a_payer: totalTtc,
      notes_internes: null,
      conditions: nettoyerTexte(
        parametres?.conditions_factures ||
          devis.conditions ||
          "Paiement à réception de facture sauf indication contraire."
      ),
    };

    const { data: factureCreee, error: factureError } = await supabaseAdmin
      .from("factures")
      .insert(payloadFacture)
      .select("*")
      .single();

    if (factureError || !factureCreee?.id) {
      throw factureError || new Error("Impossible de créer la facture.");
    }

    const payloadLignesFacture = lignes.map((ligne: any, index: number) => {
      const calcul = calculerLigne(ligne);

      return {
        facture_id: factureCreee.id,
        entreprise_id: entrepriseId,
        ordre: ligne.ordre || index + 1,
        designation: nettoyerTexte(ligne.designation),
        description: nettoyerTexte(ligne.description),
        quantite: calcul.quantite,
        unite: nettoyerTexte(ligne.unite) || "u",
        prix_unitaire_ht: calcul.prixUnitaire,
        tva: calcul.tauxTva,
        total_ht: calcul.totalHt,
        total_tva: calcul.totalTva,
        total_ttc: calcul.totalTtc,
      };
    });

    const { error: lignesFactureError } = await supabaseAdmin
      .from("factures_lignes")
      .insert(payloadLignesFacture);

    if (lignesFactureError) {
      await supabaseAdmin
        .from("factures")
        .delete()
        .eq("id", factureCreee.id)
        .eq("entreprise_id", entrepriseId);

      throw lignesFactureError;
    }

    return NextResponse.json({
      success: true,
      dejaExistante: false,
      factureId: factureCreee.id,
      numero: factureCreee.numero,
      message: "Facture créée depuis le devis avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur création facture depuis devis :", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur est survenue pendant la création de la facture.",
      },
      { status: 500 }
    );
  }
}