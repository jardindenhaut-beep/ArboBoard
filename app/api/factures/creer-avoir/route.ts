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

function arrondir2(nombre: number) {
  return Math.round((nombre + Number.EPSILON) * 100) / 100;
}

function nombre(valeur: unknown) {
  const n = Number(valeur || 0);
  return Number.isFinite(n) ? n : 0;
}

function texteOuNull(valeur: unknown) {
  const texte = String(valeur || "").trim();
  return texte.length > 0 ? texte : null;
}

async function genererNumeroAvoir(
  supabaseAdmin: ReturnType<typeof creerSupabaseAdmin>,
  entrepriseId: string
) {
  const annee = new Date().getFullYear();
  const prefixe = `AV-${annee}`;

  const { data, error } = await supabaseAdmin
    .from("factures")
    .select("numero")
    .eq("entreprise_id", entrepriseId)
    .eq("est_avoir", true)
    .like("numero", `${prefixe}-%`);

  if (error) {
    throw error;
  }

  const regex = new RegExp(`^${prefixe}-(\\d+)$`);

  const maxNumero = (data || []).reduce((max: number, item: any) => {
    const numero = String(item.numero || "");
    const match = numero.match(regex);

    if (!match) return max;

    const valeur = Number.parseInt(match[1], 10);

    if (!Number.isFinite(valeur)) return max;

    return Math.max(max, valeur);
  }, 0);

  const prochainNumero = String(maxNumero + 1).padStart(4, "0");

  return `${prefixe}-${prochainNumero}`;
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
          error: "Accès refusé. Seul le chef actif peut créer un avoir.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      factureId?: string;
      facture_id?: string;
      motif?: string;
    };

    const factureId = String(body.factureId || body.facture_id || "").trim();
    const motif =
      String(body.motif || "").trim() ||
      "Avoir établi suite à une erreur ou une annulation de facture.";

    if (!factureId) {
      return NextResponse.json(
        {
          success: false,
          error: "Identifiant de facture manquant.",
        },
        { status: 400 }
      );
    }

    const entrepriseId = profil.entreprise_id as string;

    const { data: factureOrigine, error: factureError } = await supabaseAdmin
      .from("factures")
      .select("*")
      .eq("id", factureId)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (factureError) {
      throw factureError;
    }

    if (!factureOrigine) {
      return NextResponse.json(
        {
          success: false,
          error: "Facture d’origine introuvable.",
        },
        { status: 404 }
      );
    }

    if (factureOrigine.est_avoir || factureOrigine.type_facture === "avoir") {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de créer un avoir depuis un autre avoir.",
        },
        { status: 400 }
      );
    }

    if (factureOrigine.avoir_annule_facture) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette facture possède déjà un avoir d’annulation.",
        },
        { status: 400 }
      );
    }

    const { data: avoirExistant, error: avoirExistantError } =
      await supabaseAdmin
        .from("factures_avoirs")
        .select("id, numero_avoir")
        .eq("entreprise_id", entrepriseId)
        .eq("facture_origine_id", factureId)
        .maybeSingle();

    if (avoirExistantError) {
      throw avoirExistantError;
    }

    if (avoirExistant) {
      return NextResponse.json(
        {
          success: false,
          error: `Un avoir existe déjà pour cette facture : ${
            avoirExistant.numero_avoir || "avoir sans numéro"
          }.`,
        },
        { status: 400 }
      );
    }

    const { data: lignesOrigine, error: lignesError } = await supabaseAdmin
      .from("factures_lignes")
      .select("*")
      .eq("facture_id", factureId)
      .eq("entreprise_id", entrepriseId)
      .order("ordre", { ascending: true });

    if (lignesError) {
      throw lignesError;
    }

    const lignes = lignesOrigine || [];

    const totalHtOrigine = arrondir2(
      Math.abs(
        nombre(factureOrigine.total_ht) ||
          lignes.reduce(
            (total: number, ligne: any) => total + Math.abs(nombre(ligne.total_ht)),
            0
          )
      )
    );

    const totalTvaOrigine = arrondir2(
      Math.abs(
        nombre(factureOrigine.total_tva) ||
          lignes.reduce(
            (total: number, ligne: any) =>
              total + Math.abs(nombre(ligne.total_tva)),
            0
          )
      )
    );

    const totalTtcOrigine = arrondir2(
      Math.abs(
        nombre(factureOrigine.total_ttc) ||
          lignes.reduce(
            (total: number, ligne: any) =>
              total + Math.abs(nombre(ligne.total_ttc)),
            0
          )
      )
    );

    if (totalTtcOrigine <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de créer un avoir sur une facture à 0 €.",
        },
        { status: 400 }
      );
    }

    const numeroAvoir = await genererNumeroAvoir(supabaseAdmin, entrepriseId);
    const aujourdHui = dateDuJour();
    const maintenant = new Date().toISOString();
    const numeroOrigine = factureOrigine.numero || "facture sans numéro";

    const payloadFactureAvoir = {
      entreprise_id: entrepriseId,
      client_id: factureOrigine.client_id || null,
      client_nom: factureOrigine.client_nom || null,
      devis_id: factureOrigine.devis_id || null,

      numero: numeroAvoir,
      objet: `Avoir sur facture ${numeroOrigine}`,
      description: `Avoir établi en référence à la facture ${numeroOrigine}.\n\nMotif : ${motif}`,

      type_facture: "avoir",
      statut: "payee",

      date_facture: aujourdHui,
      date_echeance: aujourdHui,

      total_ht: -totalHtOrigine,
      total_tva: -totalTvaOrigine,
      total_ttc: -totalTtcOrigine,

      montant_paye: 0,
      reste_a_payer: 0,

      notes_internes: `Avoir généré automatiquement depuis la facture ${numeroOrigine}.`,
      conditions: `Avoir établi en référence à la facture ${numeroOrigine}.`,

      est_avoir: true,
      facture_origine_id: factureOrigine.id,
      motif_avoir: motif,
      avoir_annule_facture: true,
      date_creation_avoir: maintenant,
    };

    const { data: factureAvoir, error: insertAvoirError } = await supabaseAdmin
      .from("factures")
      .insert(payloadFactureAvoir)
      .select("id, numero")
      .single();

    if (insertAvoirError) {
      throw insertAvoirError;
    }

    if (!factureAvoir?.id) {
      throw new Error("Impossible de récupérer l’identifiant de l’avoir créé.");
    }

    const factureAvoirId = factureAvoir.id as string;

    let lignesAvoirPayload: any[] = [];

    if (lignes.length > 0) {
      lignesAvoirPayload = lignes.map((ligne: any, index: number) => {
        const quantite = Math.abs(nombre(ligne.quantite)) || 1;
        const prixUnitaireHt = -Math.abs(nombre(ligne.prix_unitaire_ht));
        const totalHt = -Math.abs(nombre(ligne.total_ht));
        const totalTva = -Math.abs(nombre(ligne.total_tva));
        const totalTtc = -Math.abs(nombre(ligne.total_ttc));

        return {
          facture_id: factureAvoirId,
          entreprise_id: entrepriseId,
          ordre: index + 1,
          designation: ligne.designation
            ? `Avoir - ${ligne.designation}`
            : `Avoir - ligne ${index + 1}`,
          description:
            ligne.description ||
            `Annulation de la ligne issue de la facture ${numeroOrigine}.`,
          quantite,
          unite: ligne.unite || "u",
          prix_unitaire_ht: prixUnitaireHt,
          tva: nombre(ligne.tva),
          total_ht: totalHt,
          total_tva: totalTva,
          total_ttc: totalTtc,
        };
      });
    } else {
      const tauxTva =
        totalHtOrigine > 0
          ? arrondir2((totalTvaOrigine / totalHtOrigine) * 100)
          : 0;

      lignesAvoirPayload = [
        {
          facture_id: factureAvoirId,
          entreprise_id: entrepriseId,
          ordre: 1,
          designation: `Avoir total sur facture ${numeroOrigine}`,
          description: motif,
          quantite: 1,
          unite: "forfait",
          prix_unitaire_ht: -totalHtOrigine,
          tva: tauxTva,
          total_ht: -totalHtOrigine,
          total_tva: -totalTvaOrigine,
          total_ttc: -totalTtcOrigine,
        },
      ];
    }

    const { error: insertLignesError } = await supabaseAdmin
      .from("factures_lignes")
      .insert(lignesAvoirPayload);

    if (insertLignesError) {
      throw insertLignesError;
    }

    const { error: updateOrigineError } = await supabaseAdmin
      .from("factures")
      .update({
        statut: "annulee",
        reste_a_payer: 0,
        avoir_annule_facture: true,
        date_creation_avoir: maintenant,
      })
      .eq("id", factureOrigine.id)
      .eq("entreprise_id", entrepriseId);

    if (updateOrigineError) {
      throw updateOrigineError;
    }

    const { error: historiqueError } = await supabaseAdmin
      .from("factures_avoirs")
      .insert({
        entreprise_id: entrepriseId,
        facture_origine_id: factureOrigine.id,
        facture_avoir_id: factureAvoirId,
        numero_facture_origine: factureOrigine.numero || null,
        numero_avoir: numeroAvoir,
        motif,
        montant_ht: totalHtOrigine,
        montant_tva: totalTvaOrigine,
        montant_ttc: totalTtcOrigine,
        avoir_total: true,
        cree_par: user.id,
      });

    if (historiqueError) {
      throw historiqueError;
    }

    return NextResponse.json({
      success: true,
      factureOrigineId: factureOrigine.id,
      factureAvoirId,
      numeroAvoir,
      message: `Avoir ${numeroAvoir} créé avec succès depuis la facture ${numeroOrigine}.`,
    });
  } catch (error: any) {
    console.error("Erreur création avoir facture :", error);

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