import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function creerSupabaseAdmin(): any {
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
  }) as any;
}

function dateJourIso() {
  return new Date().toISOString().slice(0, 10);
}

function maintenantIso() {
  return new Date().toISOString();
}

function nombre(valeur: unknown) {
  const resultat = Number(valeur || 0);
  return Number.isFinite(resultat) ? resultat : 0;
}

function texte(valeur: unknown, defaut = "") {
  const resultat = String(valeur ?? "").trim();
  return resultat.length > 0 ? resultat : defaut;
}

function lireBooleen(valeur: unknown, defaut: boolean) {
  if (typeof valeur === "boolean") return valeur;

  if (typeof valeur === "string") {
    const normalise = valeur.trim().toLowerCase();

    if (["true", "1", "oui", "yes"].includes(normalise)) return true;
    if (["false", "0", "non", "no"].includes(normalise)) return false;
  }

  return defaut;
}

function factureEstAvoir(facture: any) {
  return !!facture?.est_avoir || String(facture?.type_facture || "") === "avoir";
}

function construireLignesAvoir({
  lignesOrigine,
  factureOrigine,
  avoirId,
  entrepriseId,
}: {
  lignesOrigine: any[];
  factureOrigine: any;
  avoirId: string;
  entrepriseId: string;
}) {
  const maintenant = maintenantIso();

  if (Array.isArray(lignesOrigine) && lignesOrigine.length > 0) {
    return lignesOrigine.map((ligne, index) => ({
      entreprise_id: entrepriseId,
      facture_id: avoirId,
      designation: texte(ligne.designation, "Avoir"),
      description: ligne.description || null,
      quantite: nombre(ligne.quantite) || 1,
      unite: texte(ligne.unite, "u"),
      prix_unitaire_ht: nombre(ligne.prix_unitaire_ht),
      tva: nombre(ligne.tva),
      total_ht: nombre(ligne.total_ht),
      ordre: ligne.ordre ?? index + 1,
      created_at: maintenant,
      updated_at: maintenant,
    }));
  }

  return [
    {
      entreprise_id: entrepriseId,
      facture_id: avoirId,
      designation: `Avoir sur facture ${texte(
        factureOrigine.numero,
        "sans numéro"
      )}`,
      description: factureOrigine.objet || null,
      quantite: 1,
      unite: "u",
      prix_unitaire_ht: nombre(factureOrigine.total_ht),
      tva: nombre(factureOrigine.total_tva) > 0 ? 20 : 0,
      total_ht: nombre(factureOrigine.total_ht),
      ordre: 1,
      created_at: maintenant,
      updated_at: maintenant,
    },
  ];
}

async function enregistrerHistoriqueAvoir({
  supabaseAdmin,
  entrepriseId,
  factureOrigine,
  avoir,
  motifAvoir,
}: {
  supabaseAdmin: any;
  entrepriseId: string;
  factureOrigine: any;
  avoir: any;
  motifAvoir: string;
}) {
  const maintenant = maintenantIso();

  const essais: any[] = [
    {
      entreprise_id: entrepriseId,
      facture_origine_id: factureOrigine.id,
      avoir_id: avoir.id,
      montant_ht: nombre(avoir.total_ht),
      montant_tva: nombre(avoir.total_tva),
      montant_ttc: nombre(avoir.total_ttc),
      motif: motifAvoir,
      created_at: maintenant,
    },
    {
      entreprise_id: entrepriseId,
      facture_id: factureOrigine.id,
      avoir_id: avoir.id,
      montant_ht: nombre(avoir.total_ht),
      montant_tva: nombre(avoir.total_tva),
      montant_ttc: nombre(avoir.total_ttc),
      motif: motifAvoir,
      created_at: maintenant,
    },
    {
      entreprise_id: entrepriseId,
      facture_id: factureOrigine.id,
      avoir_facture_id: avoir.id,
      montant_avoir: nombre(avoir.total_ttc),
      motif: motifAvoir,
      created_at: maintenant,
    },
  ];

  for (const payload of essais) {
    const { error } = await (supabaseAdmin as any)
      .from("factures_avoirs")
      .insert(payload as any);

    if (!error) {
      return;
    }
  }

  console.warn(
    "Historique factures_avoirs non enregistré. L’avoir reste bien créé dans la table factures."
  );
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = creerSupabaseAdmin();

  try {
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
          error: "Accès refusé. Seul le chef actif peut créer un avoir.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      factureId?: string;
      facture_id?: string;
      motif?: string;
      motifAvoir?: string;
      motif_avoir?: string;
      avoirAnnuleFacture?: boolean | string;
      avoir_annule_facture?: boolean | string;
    };

    const entrepriseId = profil.entreprise_id as string;
    const factureId = texte(body.factureId || body.facture_id);

    const motifAvoir =
      texte(body.motifAvoir) ||
      texte(body.motif_avoir) ||
      texte(body.motif) ||
      "Avoir établi suite à l’annulation de la facture.";

    const avoirAnnuleFacture = lireBooleen(
      body.avoirAnnuleFacture ?? body.avoir_annule_facture,
      true
    );

    if (!factureId) {
      return NextResponse.json(
        {
          success: false,
          error: "Identifiant de la facture manquant.",
        },
        { status: 400 }
      );
    }

    const { data: factureOrigine, error: factureError } = await supabaseAdmin
      .from("factures")
      .select("*")
      .eq("id", factureId)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (factureError) throw factureError;

    if (!factureOrigine) {
      return NextResponse.json(
        {
          success: false,
          error: "Facture introuvable.",
        },
        { status: 404 }
      );
    }

    if (factureEstAvoir(factureOrigine)) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de créer un avoir à partir d’un avoir.",
        },
        { status: 400 }
      );
    }

    if (
      factureOrigine.avoir_annule_facture ||
      factureOrigine.statut === "annulee"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette facture est déjà annulée par un avoir.",
        },
        { status: 409 }
      );
    }

    const { data: avoirsExistants, error: avoirsExistantsError } =
      await supabaseAdmin
        .from("factures")
        .select("id, numero")
        .eq("entreprise_id", entrepriseId)
        .eq("facture_origine_id", factureId)
        .or("est_avoir.eq.true,type_facture.eq.avoir")
        .limit(1);

    if (avoirsExistantsError) throw avoirsExistantsError;

    if (avoirsExistants && avoirsExistants.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Un avoir existe déjà pour cette facture : ${avoirsExistants[0].numero}.`,
        },
        { status: 409 }
      );
    }

    const { data: lignesOrigine, error: lignesError } = await supabaseAdmin
      .from("factures_lignes")
      .select("*")
      .eq("facture_id", factureId)
      .eq("entreprise_id", entrepriseId)
      .order("ordre", { ascending: true });

    if (lignesError) throw lignesError;

    const { data: numeroAvoir, error: numeroError } = await supabaseAdmin.rpc(
      "generer_numero_document",
      {
        p_entreprise_id: entrepriseId,
        p_type_document: "avoir",
      }
    );

    if (numeroError) throw numeroError;

    if (!numeroAvoir) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de générer le numéro de l’avoir.",
        },
        { status: 500 }
      );
    }

    const dateJour = dateJourIso();
    const maintenant = maintenantIso();

    const payloadAvoir: any = {
      entreprise_id: entrepriseId,
      client_id: factureOrigine.client_id || null,
      devis_id: factureOrigine.devis_id || null,

      numero: numeroAvoir,
      statut: "brouillon",
      type_facture: "avoir",

      est_avoir: true,
      facture_origine_id: factureOrigine.id,
      motif_avoir: motifAvoir,
      avoir_annule_facture: avoirAnnuleFacture,
      date_creation_avoir: maintenant,

      date_facture: dateJour,
      date_echeance: dateJour,

      objet: `Avoir sur facture ${texte(
        factureOrigine.numero,
        "sans numéro"
      )}`,
      description: `Avoir établi en référence à la facture ${texte(
        factureOrigine.numero,
        "sans numéro"
      )}. ${motifAvoir}`,

      total_ht: nombre(factureOrigine.total_ht),
      total_tva: nombre(factureOrigine.total_tva),
      total_ttc: nombre(factureOrigine.total_ttc),

      montant_paye: nombre(factureOrigine.total_ttc),
      reste_a_payer: 0,

      conditions: factureOrigine.conditions || null,

      created_at: maintenant,
      updated_at: maintenant,
    };

    const { data: avoirCree, error: creationAvoirError } = await supabaseAdmin
      .from("factures")
      .insert(payloadAvoir as any)
      .select("*")
      .single();

    if (creationAvoirError) throw creationAvoirError;

    const lignesAvoir = construireLignesAvoir({
      lignesOrigine: lignesOrigine || [],
      factureOrigine,
      avoirId: avoirCree.id,
      entrepriseId,
    });

    if (lignesAvoir.length > 0) {
      const { error: insertionLignesError } = await supabaseAdmin
        .from("factures_lignes")
        .insert(lignesAvoir as any);

      if (insertionLignesError) throw insertionLignesError;
    }

    const { error: updateAvoirError } = await supabaseAdmin
      .from("factures")
      .update({
        statut: "payee",
        updated_at: maintenantIso(),
      } as any)
      .eq("id", avoirCree.id)
      .eq("entreprise_id", entrepriseId);

    if (updateAvoirError) throw updateAvoirError;

    const { data: avoirFinal, error: relectureAvoirError } = await supabaseAdmin
      .from("factures")
      .select("*")
      .eq("id", avoirCree.id)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (relectureAvoirError) throw relectureAvoirError;

    const avoirRetour = avoirFinal || avoirCree;

    if (avoirAnnuleFacture) {
      const { error: updateFactureOrigineError } = await supabaseAdmin
        .from("factures")
        .update({
          statut: "annulee",
          avoir_annule_facture: true,
          date_creation_avoir: maintenantIso(),
          reste_a_payer: 0,
          updated_at: maintenantIso(),
        } as any)
        .eq("id", factureOrigine.id)
        .eq("entreprise_id", entrepriseId);

      if (updateFactureOrigineError) throw updateFactureOrigineError;
    } else {
      const { error: updateFactureOrigineError } = await supabaseAdmin
        .from("factures")
        .update({
          avoir_annule_facture: false,
          date_creation_avoir: maintenantIso(),
          updated_at: maintenantIso(),
        } as any)
        .eq("id", factureOrigine.id)
        .eq("entreprise_id", entrepriseId);

      if (updateFactureOrigineError) throw updateFactureOrigineError;
    }

    await enregistrerHistoriqueAvoir({
      supabaseAdmin: supabaseAdmin as any,
      entrepriseId,
      factureOrigine,
      avoir: avoirRetour,
      motifAvoir,
    });

    return NextResponse.json({
      success: true,
      message: `Avoir ${numeroAvoir} créé avec succès.`,
      avoir: avoirRetour,
      data: avoirRetour,
      avoirId: avoirRetour.id,
      avoir_id: avoirRetour.id,
      numero: numeroAvoir,
      factureOrigineId: factureOrigine.id,
      facture_origine_id: factureOrigine.id,
    });
  } catch (error: any) {
    console.error("Erreur création avoir :", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur est survenue pendant la création de l’avoir.",
      },
      { status: 500 }
    );
  }
}