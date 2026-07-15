import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createClient,
} from "@supabase/supabase-js";
import {
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  creerAttestationFiscaleSapPdf,
  type AttestationFiscaleSapPdf,
} from "@/lib/server/attestationFiscaleSapPdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ROLES_AUTORISES = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

function normaliser(
  valeur: string | null | undefined
) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function creerSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Configuration Supabase serveur manquante."
    );
  }

  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function nomFichier(
  valeur: string
) {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-"
    )
    .replace(/-+/g, "-")
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(0, 100);
}

export async function GET(
  request: NextRequest,
  contexte: {
    params: Promise<{
      attestationId: string;
    }>;
  }
) {
  try {
    const supabaseAdmin =
      creerSupabaseAdmin();

    const autorisation =
      request.headers.get(
        "authorization"
      ) || "";

    const token =
      autorisation.startsWith(
        "Bearer "
      )
        ? autorisation.slice(7).trim()
        : "";

    if (!token) {
      return NextResponse.json(
        {
          erreur:
            "Token d’authentification manquant.",
        },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: utilisateurError,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (
      utilisateurError ||
      !user?.id
    ) {
      return NextResponse.json(
        {
          erreur:
            "Utilisateur non connecté.",
        },
        { status: 401 }
      );
    }

    const {
      data: profil,
      error: profilError,
    } = await supabaseAdmin
      .from(
        "profils_utilisateurs"
      )
      .select(
        "entreprise_id, role, statut"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (
      profilError ||
      !profil?.entreprise_id ||
      normaliser(profil.statut) !==
        "actif" ||
      !ROLES_AUTORISES.has(
        normaliser(profil.role)
      )
    ) {
      return NextResponse.json(
        {
          erreur:
            "Accès refusé.",
        },
        { status: 403 }
      );
    }

    const {
      attestationId,
    } = await contexte.params;

    const {
      data: attestation,
      error,
    } = await supabaseAdmin
      .from(
        "attestations_fiscales_sap"
      )
      .select("*")
      .eq(
        "id",
        attestationId
      )
      .eq(
        "entreprise_id",
        profil.entreprise_id
      )
      .maybeSingle();

    if (
      error ||
      !attestation
    ) {
      return NextResponse.json(
        {
          erreur:
            "Attestation fiscale introuvable.",
        },
        { status: 404 }
      );
    }

    if (
      attestation.statut !==
        "validee" &&
      attestation.statut !==
        "envoyee"
    ) {
      return NextResponse.json(
        {
          erreur:
            "L’attestation doit être validée avant de générer le PDF.",
        },
        { status: 400 }
      );
    }

    const donnees: AttestationFiscaleSapPdf =
      {
        numero:
          attestation.numero,
        annee:
          attestation.annee,
        organisme:
          attestation
            .organisme_snapshot,
        beneficiaire:
          attestation
            .beneficiaire_snapshot,
        factures:
          attestation
            .factures_snapshot ||
          [],
        interventions:
          attestation
            .interventions_snapshot ||
          [],
        nature_services:
          attestation
            .nature_services,
        compte_debite_masque:
          attestation
            .compte_debite_masque ||
          "",
        montant_factures_ttc:
          Number(
            attestation
              .montant_factures_ttc ||
              0
          ),
        montant_acquitte_client:
          Number(
            attestation
              .montant_acquitte_client ||
              0
          ),
        montant_cesu_prefinance:
          Number(
            attestation
              .montant_cesu_prefinance ||
              0
          ),
        numero_declaration_sap:
          attestation
            .numero_declaration_sap,
        date_enregistrement_sap:
          attestation
            .date_enregistrement_sap ||
          "",
        signataire_nom:
          attestation
            .signataire_nom,
        signataire_qualite:
          attestation
            .signataire_qualite,
        date_emission:
          attestation
            .date_emission ||
          "",
        notes:
          attestation.notes ||
          "",
      };

    const documentPdf =
      creerAttestationFiscaleSapPdf(
        donnees
      );

    const buffer =
      await renderToBuffer(
        documentPdf
      );

    const nom =
      nomFichier(
        `attestation-fiscale-${donnees.annee}-${donnees.beneficiaire.nom}`
      ) ||
      `attestation-fiscale-${donnees.annee}`;

    return new Response(
      new Uint8Array(buffer),
      {
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition":
            `inline; filename="${nom}.pdf"`,
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Erreur génération PDF attestation fiscale :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de générer le PDF.",
      },
      { status: 500 }
    );
  }
}