import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
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

function texteHtml(valeur: string) {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ligneAdresse(fiche: any) {
  const adresse = fiche?.adresse_chantier || fiche?.adresse || "";
  const codePostal = fiche?.code_postal_chantier || fiche?.code_postal || "";
  const ville = fiche?.ville_chantier || fiche?.ville || "";

  const villeComplete = [codePostal, ville].filter(Boolean).join(" ");

  return [adresse, villeComplete].filter(Boolean).join(", ");
}

function formatDate(date: string | null | undefined) {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

async function genererPdfPv({
  supabaseAdmin,
  entrepriseId,
  fiche,
  pv,
  parametresEntreprise,
}: {
  supabaseAdmin: any;
  entrepriseId: string;
  fiche: any;
  pv: any;
  parametresEntreprise: any;
}) {
  const [elementsResult, photosResult, equipeResult] = await Promise.all([
    supabaseAdmin
      .from("fiches_intervention_elements")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("fiche_id", fiche.id)
      .order("ordre", { ascending: true }),

    supabaseAdmin
      .from("fiches_intervention_photos")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("fiche_id", fiche.id)
      .order("created_at", { ascending: true }),

    supabaseAdmin
      .from("fiches_intervention_salaries")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("fiche_id", fiche.id)
      .order("created_at", { ascending: true }),
  ]);

  if (elementsResult.error) {
    throw new Error(
      elementsResult.error.message ||
        "Impossible de charger les éléments de la fiche."
    );
  }

  if (photosResult.error) {
    throw new Error(
      photosResult.error.message || "Impossible de charger les photos."
    );
  }

  if (equipeResult.error) {
    throw new Error(
      equipeResult.error.message || "Impossible de charger l’équipe."
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
        console.error("Erreur URL signée photo PV email :", error);

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

  return Buffer.from(buffer);
}

async function enregistrerHistoriqueEmail({
  supabaseAdmin,
  entrepriseId,
  ficheId,
  pvId,
  destinataireEmail,
  sujet,
  message,
  statut,
  resendEmailId,
  erreur,
  envoyePar,
}: {
  supabaseAdmin: any;
  entrepriseId: string;
  ficheId: string;
  pvId: string | null;
  destinataireEmail: string;
  sujet: string;
  message: string;
  statut: "envoye" | "erreur";
  resendEmailId?: string | null;
  erreur?: string | null;
  envoyePar?: string | null;
}) {
  const { error } = await supabaseAdmin
    .from("pv_fin_chantier_emails")
    .insert({
      entreprise_id: entrepriseId,
      fiche_id: ficheId,
      pv_id: pvId,
      destinataire_email: destinataireEmail,
      sujet,
      message,
      statut,
      resend_email_id: resendEmailId || null,
      erreur: erreur || null,
      envoye_par: envoyePar || null,
    });

  if (error) {
    console.error("Erreur insertion historique email PV :", error);
  }
}

export async function POST(request: Request) {
  let supabaseAdmin: any = null;
  let contexteErreur:
    | {
        entrepriseId: string;
        ficheId: string;
        pvId: string | null;
        destinataireEmail: string;
        sujet: string;
        message: string;
        envoyePar: string | null;
      }
    | null = null;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail =
      process.env.RESEND_FROM_EMAIL || "Arboboard <contact@arboboard.fr>";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return reponseErreur("Configuration Supabase serveur manquante.", 500);
    }

    if (!resendApiKey) {
      return reponseErreur("Configuration Resend manquante.", 500);
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

    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const body = await request.json();

    const ficheId = body?.ficheId as string | undefined;
    const emailDestinataire = String(body?.emailDestinataire || "").trim();
    const messagePersonnalise = String(body?.message || "").trim();

    if (!ficheId) {
      return reponseErreur("Identifiant de fiche manquant.", 400);
    }

    if (!emailDestinataire) {
      return reponseErreur("Adresse email destinataire manquante.", 400);
    }

    const { data: profil, error: erreurProfil } = await supabaseAdmin
      .from("profils_utilisateurs")
      .select("id, entreprise_id, role, email")
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

    const parametresEntreprise =
      await chargerParametresEntrepriseDocument(entrepriseId);

    const nomEntreprise =
      parametresEntreprise?.nom_entreprise || "Votre entreprise";
    const emailEntreprise = parametresEntreprise?.email || "";
    const telephoneEntreprise = parametresEntreprise?.telephone || "";
    const adresseChantier = ligneAdresse(fiche);
    const dateChantier = formatDate(
      fiche.date_prevue || fiche.date_intervention
    );

    const numeroFiche = fiche.numero || fiche.id;
    const nomBase = nettoyerNomFichier(`pv-fin-chantier-${numeroFiche}`);

    const sujet = `PV de fin de chantier - ${
      fiche.titre || fiche.type_intervention || "Intervention"
    }`;

    const messageFinal = messagePersonnalise
      ? messagePersonnalise
      : `Bonjour,

Veuillez trouver ci-joint le procès-verbal de fin de chantier concernant notre intervention${
          dateChantier ? ` du ${dateChantier}` : ""
        }.

Cordialement.`;

    contexteErreur = {
      entrepriseId,
      ficheId,
      pvId: pv.id,
      destinataireEmail: emailDestinataire,
      sujet,
      message: messageFinal,
      envoyePar: user.id,
    };

    const pdfBuffer = await genererPdfPv({
      supabaseAdmin,
      entrepriseId,
      fiche,
      pv,
      parametresEntreprise,
    });

    const messageHtml = texteHtml(messageFinal).replace(/\n/g, "<br />");

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <p>${messageHtml}</p>

        <div style="margin-top: 24px; padding: 16px; border: 1px solid #d1fae5; border-radius: 16px; background: #ecfdf5;">
          <p style="margin: 0 0 8px 0; font-weight: 700; color: #064e3b;">Récapitulatif chantier</p>
          <p style="margin: 0;"><strong>Client :</strong> ${texteHtml(
            fiche.client_nom || "Client"
          )}</p>
          <p style="margin: 0;"><strong>Intervention :</strong> ${texteHtml(
            fiche.titre || fiche.type_intervention || "Intervention"
          )}</p>
          ${
            dateChantier
              ? `<p style="margin: 0;"><strong>Date :</strong> ${texteHtml(
                  dateChantier
                )}</p>`
              : ""
          }
          ${
            adresseChantier
              ? `<p style="margin: 0;"><strong>Adresse :</strong> ${texteHtml(
                  adresseChantier
                )}</p>`
              : ""
          }
        </div>

        <div style="margin-top: 24px; color: #475569; font-size: 13px;">
          <p style="margin: 0; font-weight: 700;">${texteHtml(nomEntreprise)}</p>
          ${
            emailEntreprise
              ? `<p style="margin: 0;">Email : ${texteHtml(emailEntreprise)}</p>`
              : ""
          }
          ${
            telephoneEntreprise
              ? `<p style="margin: 0;">Téléphone : ${texteHtml(
                  telephoneEntreprise
                )}</p>`
              : ""
          }
        </div>
      </div>
    `;

    const resend = new Resend(resendApiKey);

    const resultatEmail = await resend.emails.send({
      from: resendFromEmail,
      to: emailDestinataire,
      subject: sujet,
      html,
      attachments: [
        {
          filename: `${nomBase}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (resultatEmail.error) {
      console.error("Erreur Resend envoi PV :", resultatEmail.error);

      await enregistrerHistoriqueEmail({
        supabaseAdmin,
        entrepriseId,
        ficheId,
        pvId: pv.id,
        destinataireEmail: emailDestinataire,
        sujet,
        message: messageFinal,
        statut: "erreur",
        resendEmailId: null,
        erreur: resultatEmail.error.message || "Erreur Resend",
        envoyePar: user.id,
      });

      return reponseErreur(
        resultatEmail.error.message || "Impossible d’envoyer l’email.",
        500
      );
    }

    await supabaseAdmin
      .from("pv_fin_chantier")
      .update({
        envoye_client_at: new Date().toISOString(),
        envoye_client_email: emailDestinataire,
      })
      .eq("id", pv.id)
      .eq("entreprise_id", entrepriseId);

    await enregistrerHistoriqueEmail({
      supabaseAdmin,
      entrepriseId,
      ficheId,
      pvId: pv.id,
      destinataireEmail: emailDestinataire,
      sujet,
      message: messageFinal,
      statut: "envoye",
      resendEmailId: resultatEmail.data?.id || null,
      erreur: null,
      envoyePar: user.id,
    });

    return Response.json({
      success: true,
      message: "PV envoyé au client.",
      emailId: resultatEmail.data?.id || null,
    });
  } catch (error: any) {
    console.error("Erreur envoi email PV fin chantier :", error);

    if (supabaseAdmin && contexteErreur) {
      await enregistrerHistoriqueEmail({
        supabaseAdmin,
        entrepriseId: contexteErreur.entrepriseId,
        ficheId: contexteErreur.ficheId,
        pvId: contexteErreur.pvId,
        destinataireEmail: contexteErreur.destinataireEmail,
        sujet: contexteErreur.sujet,
        message: contexteErreur.message,
        statut: "erreur",
        resendEmailId: null,
        erreur: error?.message || "Erreur inconnue",
        envoyePar: contexteErreur.envoyePar,
      });
    }

    return reponseErreur(
      error?.message || "Impossible d’envoyer le PV par email.",
      500
    );
  }
}