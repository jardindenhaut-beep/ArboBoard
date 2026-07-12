import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { chargerParametresEntrepriseDocument } from "@/lib/documents/chargerParametresEntreprise";
import { PvFinChantierDocument } from "../../../../../lib/interventions/genererPdfPvFinChantier";

export const runtime = "nodejs";

function reponseErreur(message: string, statut = 400) {
  return Response.json({ error: message }, { status: statut });
}

function nettoyerNomFichier(valeur: string) {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return reponseErreur("Configuration Supabase serveur manquante.", 500);
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    if (!token) {
      return reponseErreur("Utilisateur non authentifié.", 401);
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: erreurUser,
    } = await supabaseAuth.auth.getUser(token);

    if (erreurUser || !user) {
      return reponseErreur("Session utilisateur invalide.", 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const body = await request.json();
    const ficheId = body?.ficheId as string | undefined;

    if (!ficheId) {
      return reponseErreur("Identifiant de fiche manquant.", 400);
    }

    const { data: profil, error: erreurProfil } = await supabaseAdmin
      .from("profils_utilisateurs")
      .select("id, entreprise_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (erreurProfil || !profil?.entreprise_id) {
      return reponseErreur("Profil utilisateur introuvable.", 403);
    }

    const entrepriseId = profil.entreprise_id as string;

    const { data: fiche, error: erreurFiche } = await supabaseAdmin
      .from("fiches_intervention")
      .select("*")
      .eq("id", ficheId)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (erreurFiche || !fiche) {
      return reponseErreur("Fiche d’intervention introuvable.", 404);
    }

    const { data: pv, error: erreurPv } = await supabaseAdmin
      .from("pv_fin_chantier")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("fiche_id", ficheId)
      .maybeSingle();

    if (erreurPv || !pv) {
      return reponseErreur("PV de fin de chantier introuvable.", 404);
    }

    const [
      parametresEntreprise,
      elementsResult,
      photosResult,
      equipeResult,
    ] = await Promise.all([
      chargerParametresEntrepriseDocument(entrepriseId),

      supabaseAdmin
        .from("fiches_intervention_elements")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .order("ordre", { ascending: true }),

      supabaseAdmin
        .from("fiches_intervention_photos")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .order("created_at", { ascending: true }),

      supabaseAdmin
        .from("fiches_intervention_salaries")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .order("created_at", { ascending: true }),
    ]);

    if (elementsResult.error) {
      return reponseErreur(
        elementsResult.error.message ||
          "Impossible de charger les éléments de la fiche.",
        500
      );
    }

    if (photosResult.error) {
      return reponseErreur(
        photosResult.error.message || "Impossible de charger les photos.",
        500
      );
    }

    if (equipeResult.error) {
      return reponseErreur(
        equipeResult.error.message || "Impossible de charger l’équipe.",
        500
      );
    }

    const photosAvecUrls = await Promise.all(
      ((photosResult.data || []) as any[]).map(async (photo) => {
        const chemin = photo.storage_path || photo.url;

        if (!chemin) {
          return {
            ...photo,
            signed_url: null,
          };
        }

        const { data, error } = await supabaseAdmin.storage
          .from("interventions-photos")
          .createSignedUrl(chemin, 60 * 60);

        if (error) {
          console.error("Erreur URL signée photo PV :", error);

          return {
            ...photo,
            signed_url: null,
          };
        }

        return {
          ...photo,
          signed_url: data?.signedUrl || null,
        };
      })
    );

    const documentPdf = React.createElement(PvFinChantierDocument, {
      entreprise: parametresEntreprise,
      fiche,
      pv,
      elements: elementsResult.data || [],
      photos: photosAvecUrls,
      equipe: equipeResult.data || [],
    });

    const buffer = await renderToBuffer(documentPdf as any);

    const nomBase = nettoyerNomFichier(
      `pv-fin-chantier-${fiche.numero || fiche.id}`
    );

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomBase}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Erreur génération PDF PV fin chantier :", error);

    return reponseErreur(
      error?.message || "Impossible de générer le PDF du PV.",
      500
    );
  }
}