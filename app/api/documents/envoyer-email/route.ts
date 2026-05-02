import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TypeDocument = "devis" | "facture";

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

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return "—";
  }
}

function nettoyerTexte(valeur: unknown) {
  return String(valeur || "").trim();
}

function emailValide(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function nomClient(client: any, document: any) {
  if (client) {
    if (client.type_client === "particulier") {
      const complet = `${client.prenom || ""} ${client.nom || ""}`.trim();
      return complet || "Client particulier";
    }

    return (
      client.entreprise ||
      client.nom ||
      `${client.prenom || ""} ${client.nom || ""}`.trim() ||
      "Client professionnel"
    );
  }

  return document?.client_nom || "Client";
}

function adresseEntreprise(entreprise: any) {
  return [entreprise?.adresse, entreprise?.code_postal, entreprise?.ville]
    .filter(Boolean)
    .join(", ");
}

function infosLegalesEntreprise(entreprise: any) {
  const infos: string[] = [];

  if (entreprise?.forme_juridique) infos.push(entreprise.forme_juridique);
  if (entreprise?.siret) infos.push(`SIRET : ${entreprise.siret}`);

  if (entreprise?.numero_tva) {
    infos.push(`TVA intracommunautaire : ${entreprise.numero_tva}`);
  }

  return infos.join(" — ");
}

function echapperHtml(valeur: unknown) {
  return String(valeur || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function texteAvecRetours(valeur: unknown) {
  return echapperHtml(valeur).replaceAll("\n", "<br />");
}

function construireLignesHtml(lignes: any[]) {
  if (!lignes || lignes.length === 0) {
    return `
      <tr>
        <td colspan="5" style="padding:12px;border-bottom:1px solid #e5e7eb;color:#64748b;text-align:center;">
          Aucune ligne renseignée
        </td>
      </tr>
    `;
  }

  return lignes
    .map((ligne) => {
      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
            <strong>${echapperHtml(ligne.designation || "Ligne")}</strong>
            ${
              ligne.description
                ? `<br /><span style="font-size:12px;color:#64748b;">${texteAvecRetours(
                    ligne.description
                  )}</span>`
                : ""
            }
          </td>

          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">
            ${echapperHtml(ligne.quantite ?? 0)} ${echapperHtml(
        ligne.unite || ""
      )}
          </td>

          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">
            ${formatMontant(ligne.prix_unitaire_ht)}
          </td>

          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">
            ${echapperHtml(ligne.tva ?? 0)} %
          </td>

          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;font-weight:700;">
            ${formatMontant(ligne.total_ttc)}
          </td>
        </tr>
      `;
    })
    .join("");
}

function construireEmailHtml(params: {
  typeDocument: TypeDocument;
  entreprise: any;
  client: any;
  document: any;
  lignes: any[];
  message?: string;
}) {
  const { typeDocument, entreprise, client, document, lignes, message } = params;

  const estDevis = typeDocument === "devis";
  const titreDocument = estDevis ? "Devis" : "Facture";
  const numero = document.numero || "sans numéro";

  const nomEntreprise =
    entreprise?.nom_entreprise || entreprise?.slug || "Votre entreprise";

  const nomDuClient = nomClient(client, document);
  const adressePro = adresseEntreprise(entreprise);
  const infosLegales = infosLegalesEntreprise(entreprise);

  const dateDocument = estDevis
    ? formatDate(document.date_devis)
    : formatDate(document.date_facture);

  const dateSecondaire = estDevis
    ? formatDate(document.date_validite)
    : formatDate(document.date_echeance);

  const libelleDateSecondaire = estDevis
    ? "Valable jusqu’au"
    : "Date d’échéance";

  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="max-width:760px;margin:0 auto;padding:24px;">
          <div style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="padding:28px;border-bottom:1px solid #e5e7eb;">
              <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;">
                <div>
                  <h1 style="margin:0;font-size:22px;color:#064e3b;">
                    ${echapperHtml(nomEntreprise)}
                  </h1>

                  ${
                    adressePro
                      ? `<p style="margin:6px 0 0;color:#64748b;font-size:13px;">${echapperHtml(
                          adressePro
                        )}</p>`
                      : ""
                  }

                  ${
                    entreprise?.email_contact
                      ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${echapperHtml(
                          entreprise.email_contact
                        )}</p>`
                      : ""
                  }

                  ${
                    entreprise?.telephone
                      ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${echapperHtml(
                          entreprise.telephone
                        )}</p>`
                      : ""
                  }

                  ${
                    infosLegales
                      ? `<p style="margin:8px 0 0;color:#64748b;font-size:12px;">${echapperHtml(
                          infosLegales
                        )}</p>`
                      : ""
                  }
                </div>

                <div style="text-align:right;">
                  <p style="margin:0;color:#059669;font-size:13px;font-weight:700;text-transform:uppercase;">
                    ${titreDocument}
                  </p>
                  <h2 style="margin:6px 0 0;font-size:24px;color:#0f172a;">
                    ${echapperHtml(numero)}
                  </h2>
                </div>
              </div>
            </div>

            <div style="padding:28px;">
              <p style="margin:0 0 12px;font-size:15px;">
                Bonjour ${echapperHtml(nomDuClient)},
              </p>

              ${
                message
                  ? `<p style="margin:0 0 18px;line-height:1.6;font-size:14px;color:#334155;">${texteAvecRetours(
                      message
                    )}</p>`
                  : `<p style="margin:0 0 18px;line-height:1.6;font-size:14px;color:#334155;">
                      Veuillez trouver ci-dessous votre ${titreDocument.toLowerCase()}.
                    </p>`
              }

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0;">
                <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px;">
                  <p style="margin:0;color:#64748b;font-size:12px;">Objet</p>
                  <p style="margin:4px 0 0;font-weight:700;">
                    ${echapperHtml(document.objet || "Objet non renseigné")}
                  </p>
                </div>

                <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px;">
                  <p style="margin:0;color:#64748b;font-size:12px;">Date</p>
                  <p style="margin:4px 0 0;font-weight:700;">
                    ${dateDocument}
                  </p>
                  <p style="margin:4px 0 0;color:#64748b;font-size:12px;">
                    ${libelleDateSecondaire} : ${dateSecondaire}
                  </p>
                </div>
              </div>

              ${
                document.description
                  ? `<div style="margin:18px 0;padding:14px;border-radius:14px;background:#f8fafc;border:1px solid #e5e7eb;">
                      <p style="margin:0;line-height:1.6;font-size:13px;color:#334155;">${texteAvecRetours(
                        document.description
                      )}</p>
                    </div>`
                  : ""
              }

              <table style="width:100%;border-collapse:collapse;margin-top:18px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:12px;text-align:left;font-size:12px;color:#64748b;border-bottom:1px solid #e5e7eb;">Désignation</th>
                    <th style="padding:12px;text-align:right;font-size:12px;color:#64748b;border-bottom:1px solid #e5e7eb;">Qté</th>
                    <th style="padding:12px;text-align:right;font-size:12px;color:#64748b;border-bottom:1px solid #e5e7eb;">PU HT</th>
                    <th style="padding:12px;text-align:right;font-size:12px;color:#64748b;border-bottom:1px solid #e5e7eb;">TVA</th>
                    <th style="padding:12px;text-align:right;font-size:12px;color:#64748b;border-bottom:1px solid #e5e7eb;">TTC</th>
                  </tr>
                </thead>
                <tbody>
                  ${construireLignesHtml(lignes)}
                </tbody>
              </table>

              <div style="margin-top:22px;display:flex;justify-content:flex-end;">
                <table style="width:320px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px;color:#64748b;">Total HT</td>
                    <td style="padding:8px;text-align:right;font-weight:700;">${formatMontant(
                      document.total_ht
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px;color:#64748b;">Total TVA</td>
                    <td style="padding:8px;text-align:right;font-weight:700;">${formatMontant(
                      document.total_tva
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 8px;border-top:1px solid #e5e7eb;font-size:18px;font-weight:700;">Total TTC</td>
                    <td style="padding:10px 8px;border-top:1px solid #e5e7eb;text-align:right;font-size:18px;font-weight:700;">${formatMontant(
                      document.total_ttc
                    )}</td>
                  </tr>

                  ${
                    !estDevis
                      ? `
                        <tr>
                          <td style="padding:8px;color:#64748b;">Déjà payé</td>
                          <td style="padding:8px;text-align:right;font-weight:700;">${formatMontant(
                            document.montant_paye
                          )}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px;color:#64748b;">Reste à payer</td>
                          <td style="padding:8px;text-align:right;font-weight:700;">${formatMontant(
                            document.reste_a_payer
                          )}</td>
                        </tr>
                      `
                      : ""
                  }
                </table>
              </div>

              ${
                document.conditions
                  ? `<div style="margin-top:24px;padding:14px;border:1px solid #e5e7eb;border-radius:14px;">
                      <p style="margin:0 0 6px;font-weight:700;font-size:13px;">Conditions</p>
                      <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">${texteAvecRetours(
                        document.conditions
                      )}</p>
                    </div>`
                  : ""
              }
            </div>

            <div style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">
                Email envoyé depuis Arboboard.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function construireEmailTexte(params: {
  typeDocument: TypeDocument;
  entreprise: any;
  client: any;
  document: any;
  message?: string;
}) {
  const { typeDocument, entreprise, client, document, message } = params;
  const titre = typeDocument === "devis" ? "Devis" : "Facture";

  return `
${titre} ${document.numero || ""}
${entreprise?.nom_entreprise || entreprise?.slug || ""}

Bonjour ${nomClient(client, document)},

${message || `Veuillez trouver ci-dessous votre ${titre.toLowerCase()}.`}

Objet : ${document.objet || ""}
Total TTC : ${formatMontant(document.total_ttc)}

Cordialement,
${entreprise?.nom_entreprise || ""}
  `.trim();
}

async function enregistrerHistoriqueEmail(params: {
  supabaseAdmin: any;
  entrepriseId: string;
  typeDocument: TypeDocument;
  documentId: string;
  emailDestinataire: string;
  sujet: string;
  message: string;
  statut: "envoye" | "erreur";
  resendId?: string | null;
  erreur?: string | null;
  envoyePar: string;
}) {
  const {
    supabaseAdmin,
    entrepriseId,
    typeDocument,
    documentId,
    emailDestinataire,
    sujet,
    message,
    statut,
    resendId,
    erreur,
    envoyePar,
  } = params;

  const { error } = await supabaseAdmin
    .from("documents_emails_envoyes")
    .insert({
      entreprise_id: entrepriseId,
      type_document: typeDocument,
      document_id: documentId,
      email_destinataire: emailDestinataire,
      sujet,
      message,
      statut,
      resend_id: resendId || null,
      erreur: erreur || null,
      envoye_par: envoyePar,
      envoye_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Erreur historique email :", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = creerSupabaseAdmin();

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!resendApiKey || !fromEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Configuration Resend manquante. Ajoutez RESEND_API_KEY et RESEND_FROM_EMAIL.",
        },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token d’authentification manquant." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user?.id) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non connecté." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const typeDocument = nettoyerTexte(body.typeDocument) as TypeDocument;
    const documentId = nettoyerTexte(body.documentId);
    const emailDestinataireManuel = nettoyerTexte(body.emailDestinataire);
    const message = nettoyerTexte(body.message);

    if (typeDocument !== "devis" && typeDocument !== "facture") {
      return NextResponse.json(
        { success: false, error: "Type de document invalide." },
        { status: 400 }
      );
    }

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "Document introuvable." },
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
        { success: false, error: "Profil utilisateur introuvable." },
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
          error: "Accès refusé. Seul le chef actif peut envoyer un document.",
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
        { success: false, error: "Entreprise introuvable." },
        { status: 404 }
      );
    }

    const tableDocument = typeDocument === "devis" ? "devis" : "factures";
    const tableLignes =
      typeDocument === "devis" ? "devis_lignes" : "factures_lignes";
    const colonneLigneDocument =
      typeDocument === "devis" ? "devis_id" : "facture_id";

    const { data: document, error: documentError } = await supabaseAdmin
      .from(tableDocument)
      .select("*")
      .eq("id", documentId)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    if (documentError || !document) {
      return NextResponse.json(
        { success: false, error: "Document introuvable." },
        { status: 404 }
      );
    }

    let client: any = null;

    if (document.client_id) {
      const { data: clientData } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("id", document.client_id)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      client = clientData || null;
    }

    const emailDestinataire =
      emailDestinataireManuel || nettoyerTexte(client?.email);

    if (!emailDestinataire || !emailValide(emailDestinataire)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email destinataire invalide ou manquant. Ajoutez un email au client ou renseignez un email manuel.",
        },
        { status: 400 }
      );
    }

    const { data: lignes, error: lignesError } = await supabaseAdmin
      .from(tableLignes)
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq(colonneLigneDocument, documentId)
      .order("ordre", { ascending: true });

    if (lignesError) {
      return NextResponse.json(
        { success: false, error: "Impossible de charger les lignes." },
        { status: 500 }
      );
    }

    const sujet =
      typeDocument === "devis"
        ? `Votre devis ${document.numero || ""} - ${
            entreprise.nom_entreprise || "Arboboard"
          }`
        : `Votre facture ${document.numero || ""} - ${
            entreprise.nom_entreprise || "Arboboard"
          }`;

    const html = construireEmailHtml({
      typeDocument,
      entreprise,
      client,
      document,
      lignes: lignes || [],
      message,
    });

    const text = construireEmailTexte({
      typeDocument,
      entreprise,
      client,
      document,
      message,
    });

    const reponseResend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [emailDestinataire],
        subject: sujet,
        html,
        text,
      }),
    });

    const resultatResend = await reponseResend.json().catch(() => null);

    if (!reponseResend.ok) {
      const erreurResend =
        resultatResend?.message || "Resend a refusé l’envoi de l’email.";

      console.error("Erreur Resend :", resultatResend);

      await enregistrerHistoriqueEmail({
        supabaseAdmin,
        entrepriseId,
        typeDocument,
        documentId,
        emailDestinataire,
        sujet,
        message,
        statut: "erreur",
        resendId: resultatResend?.id || null,
        erreur: erreurResend,
        envoyePar: user.id,
      });

      return NextResponse.json(
        {
          success: false,
          error: erreurResend,
        },
        { status: 500 }
      );
    }

    await enregistrerHistoriqueEmail({
      supabaseAdmin,
      entrepriseId,
      typeDocument,
      documentId,
      emailDestinataire,
      sujet,
      message,
      statut: "envoye",
      resendId: resultatResend?.id || null,
      erreur: null,
      envoyePar: user.id,
    });

    if (typeDocument === "devis") {
      await supabaseAdmin
        .from("devis")
        .update({ statut: "envoye" })
        .eq("id", documentId)
        .eq("entreprise_id", entrepriseId);
    } else if (
      document.statut !== "payee" &&
      document.statut !== "annulee" &&
      document.statut !== "archive"
    ) {
      await supabaseAdmin
        .from("factures")
        .update({ statut: "envoyee" })
        .eq("id", documentId)
        .eq("entreprise_id", entrepriseId);
    }

    return NextResponse.json({
      success: true,
      message: "Email envoyé avec succès.",
      resendId: resultatResend?.id || null,
      destinataire: emailDestinataire,
    });
  } catch (error: any) {
    console.error("Erreur route envoyer-email :", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur est survenue pendant l’envoi de l’email.",
      },
      { status: 500 }
    );
  }
}