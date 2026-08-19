import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  genererPdfDocument,
  type TypeDocumentPdf,
} from "@/lib/documents/genererPdfDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TypeDocumentDemande = "devis" | "facture" | "avoir";
type ModePdf = "download" | "inline";

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

function encoderNomFichier(nomFichier: string) {
  return encodeURIComponent(nomFichier)
    .replaceAll("'", "%27")
    .replaceAll("(", "%28")
    .replaceAll(")", "%29");
}

function headerContentDisposition(nomFichier: string, mode: ModePdf) {
  const disposition = mode === "inline" ? "inline" : "attachment";
  const nomSimple = nomFichier.replace(/[^\w.\- ]+/g, "-");

  return `${disposition}; filename="${nomSimple}"; filename*=UTF-8''${encoderNomFichier(
    nomFichier
  )}`;
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
      .select("id, role, statut, entreprise_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profilError || !profil) {
      console.error(
        "Profil utilisateur introuvable pour génération PDF :",
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
          error: "Accès refusé. Seul le chef actif peut accéder au PDF.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      typeDocument?: TypeDocumentDemande | string;
      type_document?: TypeDocumentDemande | string;
      documentId?: string;
      document_id?: string;
      mode?: ModePdf | string;
    };

    const typeDemande = String(
      body.typeDocument || body.type_document || ""
    ).trim() as TypeDocumentDemande;

    const documentId = String(body.documentId || body.document_id || "").trim();

    const mode: ModePdf = body.mode === "inline" ? "inline" : "download";

    if (!["devis", "facture", "avoir"].includes(typeDemande)) {
      return NextResponse.json(
        {
          success: false,
          error: "Type de document invalide.",
        },
        { status: 400 }
      );
    }

    if (!documentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Identifiant du document manquant.",
        },
        { status: 400 }
      );
    }

    const entrepriseId = profil.entreprise_id as string;

    const { data: entreprise, error: entrepriseError } = await supabaseAdmin
      .from("entreprises_abonnees")
      .select(
        [
          "id",
          "nom_entreprise",
          "forme_juridique",
          "adresse",
          "code_postal",
          "ville",
          "telephone",
          "email_contact",
          "siret",
          "numero_tva",
        ].join(", ")
      )
      .eq("id", entrepriseId)
      .maybeSingle();

    if (entrepriseError) {
      console.error(
        "Erreur lecture entreprise pour génération PDF :",
        entrepriseError
      );

      throw new Error("Impossible de charger les informations de l’entreprise.");
    }

    if (!entreprise) {
      return NextResponse.json(
        {
          success: false,
          error: "Entreprise introuvable.",
        },
        { status: 404 }
      );
    }

    let document: Record<string, any> | null = null;
    let lignes: Array<Record<string, any>> = [];
    let typeDocumentFinal: TypeDocumentPdf = typeDemande as TypeDocumentPdf;
    let factureOrigine: Record<string, any> | null = null;

    if (typeDemande === "devis") {
      const { data, error } = await supabaseAdmin
        .from("devis")
        .select(
          [
            "id",
            "entreprise_id",
            "client_id",
            "numero",
            "client_nom",
            "objet",
            "description",
            "date_devis",
            "date_validite",
            "statut",
            "adresse_chantier",
            "code_postal_chantier",
            "ville_chantier",
            "notes_chantier",
            "conditions",
            "total_ht",
            "total_tva",
            "total_ttc",
          ].join(", ")
        )
        .eq("id", documentId)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (error) {
        console.error("Erreur lecture devis pour génération PDF :", error);
        throw new Error("Impossible de charger le devis.");
      }

      if (!data) {
        return NextResponse.json(
          {
            success: false,
            error: "Devis introuvable.",
          },
          { status: 404 }
        );
      }

      document = data;
      typeDocumentFinal = "devis";

      const { data: lignesData, error: lignesError } = await supabaseAdmin
        .from("devis_lignes")
        .select(
          [
            "id",
            "designation",
            "description",
            "quantite",
            "unite",
            "prix_unitaire_ht",
            "tva",
            "total_ht",
            "total_ttc",
            "ordre",
          ].join(", ")
        )
        .eq("devis_id", documentId)
        .eq("entreprise_id", entrepriseId)
        .order("ordre", { ascending: true });

      if (lignesError) {
        console.error(
          "Erreur lecture lignes devis pour génération PDF :",
          lignesError
        );

        throw new Error("Impossible de charger les lignes du devis.");
      }

      lignes = lignesData || [];
    } else {
      const { data, error } = await supabaseAdmin
        .from("factures")
        .select(
          [
            "id",
            "entreprise_id",
            "client_id",
            "numero",
            "client_nom",
            "objet",
            "description",
            "date_facture",
            "date_echeance",
            "statut",
            "type_facture",
            "est_avoir",
            "facture_origine_id",
            "motif_avoir",
            "adresse_chantier",
            "code_postal_chantier",
            "ville_chantier",
            "notes_chantier",
            "conditions",
            "total_ht",
            "total_tva",
            "total_ttc",
            "montant_paye",
            "reste_a_payer",
          ].join(", ")
        )
        .eq("id", documentId)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (error) {
        console.error("Erreur lecture facture pour génération PDF :", error);
        throw new Error("Impossible de charger la facture.");
      }

      if (!data) {
        return NextResponse.json(
          {
            success: false,
            error: "Facture introuvable.",
          },
          { status: 404 }
        );
      }

      document = data;

      const estAvoir =
        Boolean(document.est_avoir) ||
        String(document.type_facture || "") === "avoir";

      typeDocumentFinal = estAvoir ? "avoir" : "facture";

      if (typeDemande === "avoir" && !estAvoir) {
        return NextResponse.json(
          {
            success: false,
            error: "Ce document n’est pas un avoir.",
          },
          { status: 400 }
        );
      }

      if (typeDemande === "facture" && estAvoir) {
        typeDocumentFinal = "avoir";
      }

      const { data: lignesData, error: lignesError } = await supabaseAdmin
        .from("factures_lignes")
        .select(
          [
            "id",
            "designation",
            "description",
            "quantite",
            "unite",
            "prix_unitaire_ht",
            "tva",
            "total_ht",
            "total_ttc",
            "ordre",
          ].join(", ")
        )
        .eq("facture_id", documentId)
        .eq("entreprise_id", entrepriseId)
        .order("ordre", { ascending: true });

      if (lignesError) {
        console.error(
          "Erreur lecture lignes facture pour génération PDF :",
          lignesError
        );

        throw new Error("Impossible de charger les lignes de la facture.");
      }

      lignes = lignesData || [];

      if (estAvoir && document.facture_origine_id) {
        const { data: origineData, error: origineError } = await supabaseAdmin
          .from("factures")
          .select("id, numero, date_facture, total_ttc")
          .eq("id", document.facture_origine_id)
          .eq("entreprise_id", entrepriseId)
          .maybeSingle();

        if (origineError) {
          console.error(
            "Erreur lecture facture d’origine pour génération PDF :",
            origineError
          );

          throw new Error("Impossible de charger la facture d’origine.");
        }

        factureOrigine = origineData || null;
      }
    }

    let client: Record<string, any> | null = null;

    if (document.client_id) {
      const { data: clientData, error: clientError } = await supabaseAdmin
        .from("clients")
        .select(
          [
            "id",
            "type_client",
            "prenom",
            "nom",
            "entreprise",
            "adresse",
            "code_postal",
            "ville",
            "email",
            "telephone",
          ].join(", ")
        )
        .eq("id", document.client_id)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (clientError) {
        console.error("Erreur lecture client pour génération PDF :", clientError);
        throw new Error("Impossible de charger les informations du client.");
      }

      client = clientData || null;
    }

    const pieceJointePdf = await genererPdfDocument({
      typeDocument: typeDocumentFinal,
      entreprise,
      document,
      client,
      lignes,
      factureOrigine,
    });

    const corpsPdf = new Uint8Array(pieceJointePdf.buffer);

    return new NextResponse(corpsPdf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": headerContentDisposition(
          pieceJointePdf.filename,
          mode
        ),
        "Content-Length": String(pieceJointePdf.buffer.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF document :", error);

    return NextResponse.json(
      {
        success: false,
        error: "Une erreur est survenue pendant la génération du PDF.",
      },
      { status: 500 }
    );
  }
}