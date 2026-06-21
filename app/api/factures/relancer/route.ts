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

function nettoyerEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

function emailValide(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatMontant(montant: unknown) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function formatDate(date: unknown) {
  const valeur = String(date || "").trim();

  if (!valeur) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${valeur.slice(0, 10)}T00:00:00`));
  } catch {
    return "—";
  }
}

function echapperHtml(valeur: unknown) {
  return String(valeur || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nl2br(valeur: unknown) {
  return echapperHtml(valeur).replace(/\n/g, "<br />");
}

function nomClient(client: any, facture: any) {
  if (facture?.client_nom) return String(facture.client_nom);

  if (!client) return "Client";

  if (client.type_client === "particulier") {
    const nom = `${client.prenom || ""} ${client.nom || ""}`.trim();
    return nom || "Client particulier";
  }

  return (
    client.entreprise ||
    client.nom ||
    `${client.prenom || ""} ${client.nom || ""}`.trim() ||
    "Client professionnel"
  );
}

function htmlRelance(params: {
  entreprise: any;
  facture: any;
  client: any;
  message: string;
}) {
  const { entreprise, facture, client, message } = params;

  const nomEntreprise =
    entreprise?.nom_entreprise || entreprise?.nom || "Votre entreprise";
  const numero = facture.numero || "sans numéro";
  const clientNom = nomClient(client, facture);

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Relance facture ${echapperHtml(numero)}</title>
  </head>

  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:720px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="padding:28px;background:#fff7ed;border-bottom:1px solid #fed7aa;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#ea580c;text-transform:uppercase;letter-spacing:.08em;">
            ${echapperHtml(nomEntreprise)}
          </p>
          <h1 style="margin:8px 0 0 0;font-size:28px;line-height:1.2;color:#0f172a;">
            Relance facture ${echapperHtml(numero)}
          </h1>
          <p style="margin:8px 0 0 0;color:#475569;font-size:14px;">
            Document adressé à ${echapperHtml(clientNom)}
          </p>
        </div>

        <div style="padding:28px;">
          <div style="font-size:15px;line-height:1.7;color:#334155;">
            ${nl2br(message)}
          </div>

          <div style="margin-top:24px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <div style="padding:16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <strong>Récapitulatif de la facture</strong>
            </div>

            <div style="padding:16px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tbody>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;">Numéro</td>
                    <td style="padding:6px 0;text-align:right;font-weight:700;">${echapperHtml(
                      numero
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;">Date facture</td>
                    <td style="padding:6px 0;text-align:right;">${formatDate(
                      facture.date_facture
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;">Échéance</td>
                    <td style="padding:6px 0;text-align:right;">${formatDate(
                      facture.date_echeance
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;">Total TTC</td>
                    <td style="padding:6px 0;text-align:right;font-weight:700;">${formatMontant(
                      facture.total_ttc
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;">Montant payé</td>
                    <td style="padding:6px 0;text-align:right;font-weight:700;">${formatMontant(
                      facture.montant_paye
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0 6px 0;border-top:1px solid #e2e8f0;font-weight:800;">Reste à payer</td>
                    <td style="padding:10px 0 6px 0;border-top:1px solid #e2e8f0;text-align:right;font-weight:900;color:#dc2626;">${formatMontant(
                      facture.reste_a_payer
                    )}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#64748b;text-align:center;">
            Email de relance envoyé depuis Arboboard.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

async function envoyerAvecResend(params: {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL || "Arboboard <contact@arboboard.fr>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquant.");
  }

  const payload: any = {
    from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  };

  if (params.cc && params.cc.length > 0) {
    payload.cc = params.cc;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const resultat = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      resultat?.message ||
        resultat?.error ||
        "Erreur lors de l’envoi de l’email avec Resend."
    );
  }

  return resultat;
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
          error: "Accès refusé. Seul le chef actif peut relancer une facture.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      factureId?: string;
      facture_id?: string;
      email?: string;
      message?: string;
    };

    const factureId = String(body.factureId || body.facture_id || "").trim();
    const emailDestinataire = nettoyerEmail(body.email);

    if (!factureId) {
      return NextResponse.json(
        {
          success: false,
          error: "Identifiant de facture manquant.",
        },
        { status: 400 }
      );
    }

    if (!emailDestinataire || !emailValide(emailDestinataire)) {
      return NextResponse.json(
        {
          success: false,
          error: "Adresse email destinataire invalide.",
        },
        { status: 400 }
      );
    }

    const entrepriseId = profil.entreprise_id as string;

    const { data: entreprise, error: entrepriseError } = await supabaseAdmin
      .from("entreprises_abonnees")
      .select("*")
      .eq("id", entrepriseId)
      .maybeSingle();

    if (entrepriseError) throw entrepriseError;

    if (!entreprise) {
      return NextResponse.json(
        {
          success: false,
          error: "Entreprise introuvable.",
        },
        { status: 404 }
      );
    }

    const { data: facture, error: factureError } = await supabaseAdmin
      .from("factures")
      .select("*")
      .eq("id", factureId)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (factureError) throw factureError;

    if (!facture) {
      return NextResponse.json(
        {
          success: false,
          error: "Facture introuvable.",
        },
        { status: 404 }
      );
    }

    const estAvoir =
      !!facture.est_avoir || String(facture.type_facture || "") === "avoir";

    if (estAvoir) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de relancer un avoir.",
        },
        { status: 400 }
      );
    }

    if (!["envoyee", "en_retard"].includes(String(facture.statut || ""))) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Seules les factures envoyées ou en retard peuvent être relancées.",
        },
        { status: 400 }
      );
    }

    if (Number(facture.reste_a_payer || 0) <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette facture ne présente aucun reste à payer.",
        },
        { status: 400 }
      );
    }

    let client: any = null;

    if (facture.client_id) {
      const { data: clientData, error: clientError } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("id", facture.client_id)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (clientError) throw clientError;

      client = clientData || null;
    }

    const message =
      String(body.message || "").trim() ||
      `Bonjour,

Sauf erreur de notre part, la facture ${
        facture.numero || ""
      } arrivée à échéance le ${formatDate(
        facture.date_echeance
      )} présente encore un solde restant dû de ${formatMontant(
        facture.reste_a_payer
      )}.

Nous vous remercions de bien vouloir procéder au règlement dès que possible.

Cordialement.`;

    const sujet = `Relance facture ${facture.numero || ""}`;

    const cc: string[] = [];
    const emailCopie = nettoyerEmail(entreprise.email_contact);

    if (
      emailCopie &&
      emailValide(emailCopie) &&
      emailCopie !== emailDestinataire
    ) {
      cc.push(emailCopie);
    }

    const resultatResend = await envoyerAvecResend({
      to: emailDestinataire,
      cc,
      subject: sujet,
      html: htmlRelance({
        entreprise,
        facture,
        client,
        message,
      }),
    });

    await supabaseAdmin.from("documents_emails_envoyes").insert({
      entreprise_id: entrepriseId,
      type_document: "facture",
      document_id: factureId,
      email_destinataire: emailDestinataire,
      sujet,
      message,
      statut: "envoye",
      resend_id: resultatResend?.id || null,
      erreur: null,
      envoye_par: user.id,
      envoye_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      resendId: resultatResend?.id || null,
      message: "Relance envoyée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur relance facture :", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur est survenue pendant l’envoi de la relance.",
      },
      { status: 500 }
    );
  }
}