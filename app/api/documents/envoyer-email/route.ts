import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  genererPdfDocument,
  type TypeDocumentPdf,
} from "@/lib/documents/genererPdfDocument";

export const runtime = "nodejs";

type TypeDocumentDemande = "devis" | "facture" | "avoir";

type ParametresEmail = {
  email_objet_devis?: string | null;
  email_message_devis?: string | null;
  email_objet_facture?: string | null;
  email_message_facture?: string | null;
  email_copie_entreprise?: boolean | null;
  email_copie_adresse?: string | null;
};

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

function texteOuVide(valeur: unknown) {
  return String(valeur || "").trim();
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

function remplacerVariables(texte: string, variables: Record<string, string>) {
  let resultat = texte;

  Object.entries(variables).forEach(([cle, valeur]) => {
    resultat = resultat.replaceAll(`{${cle}}`, valeur);
  });

  return resultat;
}

function nomClient(client: any, document: any) {
  if (document?.client_nom) return String(document.client_nom);

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

function objetParDefaut(typeDocument: TypeDocumentDemande, numero: string) {
  if (typeDocument === "devis") {
    return `Votre devis ${numero}`;
  }

  if (typeDocument === "avoir") {
    return `Votre avoir ${numero}`;
  }

  return `Votre facture ${numero}`;
}

function messageParDefaut(typeDocument: TypeDocumentDemande, numero: string) {
  if (typeDocument === "devis") {
    return `Bonjour,

Veuillez trouver ci-joint votre devis ${numero} au format PDF.

Cordialement.`;
  }

  if (typeDocument === "avoir") {
    return `Bonjour,

Veuillez trouver ci-joint votre avoir ${numero} au format PDF.

Cet avoir vient rectifier ou annuler une facture précédemment émise.

Cordialement.`;
  }

  return `Bonjour,

Veuillez trouver ci-joint votre facture ${numero} au format PDF.

Cordialement.`;
}

function titreDocument(typeDocument: TypeDocumentDemande) {
  if (typeDocument === "devis") return "DEVIS";
  if (typeDocument === "avoir") return "AVOIR";
  return "FACTURE";
}

function libelleDocument(typeDocument: TypeDocumentDemande) {
  if (typeDocument === "devis") return "devis";
  if (typeDocument === "avoir") return "avoir";
  return "facture";
}

function construireHtmlEmail(params: {
  typeDocument: TypeDocumentDemande;
  entreprise: any;
  document: any;
  client: any;
  lignes: any[];
  sujet: string;
  message: string;
  nomPieceJointe: string;
}) {
  const {
    typeDocument,
    entreprise,
    document,
    client,
    lignes,
    message,
    nomPieceJointe,
  } = params;

  const estAvoir = typeDocument === "avoir";
  const nomEntreprise =
    entreprise?.nom_entreprise || entreprise?.nom || "Votre entreprise";
  const numero = document?.numero || "sans numéro";
  const clientNom = nomClient(client, document);
  const titre = titreDocument(typeDocument);
  const libelle = libelleDocument(typeDocument);

  const couleur = estAvoir ? "#7e22ce" : "#059669";
  const fond = estAvoir ? "#faf5ff" : "#ecfdf5";
  const bordure = estAvoir ? "#e9d5ff" : "#a7f3d0";

  const lignesHtml =
    lignes.length > 0
      ? lignes
          .map((ligne) => {
            return `
              <tr>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
                  <strong>${echapperHtml(ligne.designation || "Ligne")}</strong>
                  ${
                    ligne.description
                      ? `<br><span style="font-size:12px;color:#64748b;">${nl2br(
                          ligne.description
                        )}</span>`
                      : ""
                  }
                </td>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">
                  ${echapperHtml(ligne.quantite ?? "—")}
                </td>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">
                  ${echapperHtml(ligne.unite || "u")}
                </td>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">
                  ${formatMontant(ligne.total_ttc)}
                </td>
              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="4" style="padding:14px;text-align:center;color:#64748b;border-bottom:1px solid #e5e7eb;">
            Aucune ligne renseignée.
          </td>
        </tr>
      `;

  const blocAvoir = estAvoir
    ? `
        <div style="margin:20px 0;padding:16px;border:1px solid #e9d5ff;background:#faf5ff;border-radius:16px;color:#581c87;">
          <p style="margin:0;font-weight:700;">Information avoir</p>
          <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;">
            Cet avoir est établi en référence à une facture précédemment émise.
          </p>
          ${
            document?.motif_avoir
              ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;"><strong>Motif :</strong> ${nl2br(
                  document.motif_avoir
                )}</p>`
              : ""
          }
        </div>
      `
    : "";

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${echapperHtml(params.sujet)}</title>
  </head>

  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:760px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="padding:28px;background:${fond};border-bottom:1px solid ${bordure};">
          <p style="margin:0;font-size:13px;font-weight:700;color:${couleur};text-transform:uppercase;letter-spacing:.08em;">
            ${echapperHtml(nomEntreprise)}
          </p>
          <h1 style="margin:8px 0 0 0;font-size:28px;line-height:1.2;color:#0f172a;">
            ${titre} ${echapperHtml(numero)}
          </h1>
          <p style="margin:8px 0 0 0;color:#475569;font-size:14px;">
            Document adressé à ${echapperHtml(clientNom)}
          </p>
        </div>

        <div style="padding:28px;">
          <div style="font-size:15px;line-height:1.7;color:#334155;">
            ${nl2br(message)}
          </div>

          <div style="margin-top:20px;padding:14px 16px;border:1px solid #dbeafe;background:#eff6ff;border-radius:16px;color:#1e40af;">
            <p style="margin:0;font-size:14px;font-weight:700;">Pièce jointe</p>
            <p style="margin:6px 0 0 0;font-size:14px;">
              Le PDF est joint à cet email : <strong>${echapperHtml(
                nomPieceJointe
              )}</strong>
            </p>
          </div>

          ${blocAvoir}

          <div style="margin-top:24px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <div style="padding:16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <strong>Récapitulatif du ${libelle}</strong>
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
                    <td style="padding:6px 0;color:#64748b;">Date</td>
                    <td style="padding:6px 0;text-align:right;">${formatDate(
                      document.date_devis || document.date_facture
                    )}</td>
                  </tr>
                  ${
                    typeDocument === "devis"
                      ? `
                        <tr>
                          <td style="padding:6px 0;color:#64748b;">Validité</td>
                          <td style="padding:6px 0;text-align:right;">${formatDate(
                            document.date_validite
                          )}</td>
                        </tr>
                      `
                      : !estAvoir
                      ? `
                        <tr>
                          <td style="padding:6px 0;color:#64748b;">Échéance</td>
                          <td style="padding:6px 0;text-align:right;">${formatDate(
                            document.date_echeance
                          )}</td>
                        </tr>
                      `
                      : ""
                  }
                  <tr>
                    <td style="padding:6px 0;color:#64748b;">Objet</td>
                    <td style="padding:6px 0;text-align:right;font-weight:700;">${echapperHtml(
                      document.objet || "—"
                    )}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style="margin-top:24px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:#f8fafc;color:#475569;">
                  <th style="padding:10px;text-align:left;">Désignation</th>
                  <th style="padding:10px;text-align:right;">Qté</th>
                  <th style="padding:10px;text-align:right;">Unité</th>
                  <th style="padding:10px;text-align:right;">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                ${lignesHtml}
              </tbody>
            </table>
          </div>

          <div style="margin-top:24px;margin-left:auto;max-width:320px;border:1px solid #e2e8f0;border-radius:18px;padding:16px;background:#f8fafc;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tbody>
                <tr>
                  <td style="padding:6px 0;color:#64748b;">Total HT</td>
                  <td style="padding:6px 0;text-align:right;font-weight:700;">${formatMontant(
                    document.total_ht
                  )}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;">TVA</td>
                  <td style="padding:6px 0;text-align:right;font-weight:700;">${formatMontant(
                    document.total_tva
                  )}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0 6px 0;border-top:1px solid #e2e8f0;font-size:16px;font-weight:800;">Total TTC</td>
                  <td style="padding:10px 0 6px 0;border-top:1px solid #e2e8f0;text-align:right;font-size:16px;font-weight:900;color:${couleur};">
                    ${formatMontant(document.total_ttc)}
                  </td>
                </tr>
                ${
                  typeDocument === "facture"
                    ? `
                      <tr>
                        <td style="padding:6px 0;color:#64748b;">Déjà payé</td>
                        <td style="padding:6px 0;text-align:right;font-weight:700;">${formatMontant(
                          document.montant_paye
                        )}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748b;">Reste à payer</td>
                        <td style="padding:6px 0;text-align:right;font-weight:900;color:#dc2626;">${formatMontant(
                          document.reste_a_payer
                        )}</td>
                      </tr>
                    `
                    : ""
                }
              </tbody>
            </table>
          </div>

          <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#64748b;text-align:center;">
            Email envoyé depuis Arboboard.
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
  attachments?: {
    filename: string;
    content: string;
  }[];
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

  if (params.attachments && params.attachments.length > 0) {
    payload.attachments = params.attachments;
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

  let historiqueBase: {
    entreprise_id?: string;
    type_document?: string;
    document_id?: string;
    email_destinataire?: string;
    sujet?: string;
    message?: string;
    envoye_par?: string;
  } = {};

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
          error: "Accès refusé. Seul le chef actif peut envoyer un document.",
        },
        { status: 403 }
      );
    }

    const entrepriseId = profil.entreprise_id as string;

    const body = (await request.json().catch(() => ({}))) as {
      typeDocument?: TypeDocumentDemande | string;
      type_document?: TypeDocumentDemande | string;
      documentId?: string;
      document_id?: string;
      email?: string;
      emailDestinataire?: string;
      message?: string;
      sujet?: string;
    };

    const typeDemande = String(
      body.typeDocument || body.type_document || ""
    ).trim() as TypeDocumentDemande;

    const documentId = String(body.documentId || body.document_id || "").trim();

    const emailDestinataire = nettoyerEmail(
      body.email || body.emailDestinataire
    );

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

    if (!emailDestinataire || !emailValide(emailDestinataire)) {
      return NextResponse.json(
        {
          success: false,
          error: "Adresse email destinataire invalide.",
        },
        { status: 400 }
      );
    }

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

    const { data: parametresData } = await supabaseAdmin
      .from("entreprise_parametres")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    const parametres = (parametresData || {}) as ParametresEmail;

    let document: any = null;
    let lignes: any[] = [];
    let typeDocumentFinal: TypeDocumentDemande = typeDemande;
    let factureOrigine: any = null;

    if (typeDemande === "devis") {
      const { data, error } = await supabaseAdmin
        .from("devis")
        .select("*")
        .eq("id", documentId)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (error) throw error;

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

      const { data: lignesData, error: lignesError } = await supabaseAdmin
        .from("devis_lignes")
        .select("*")
        .eq("devis_id", documentId)
        .eq("entreprise_id", entrepriseId)
        .order("ordre", { ascending: true });

      if (lignesError) throw lignesError;

      lignes = lignesData || [];
      typeDocumentFinal = "devis";
    } else {
      const { data, error } = await supabaseAdmin
        .from("factures")
        .select("*")
        .eq("id", documentId)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (error) throw error;

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
        !!document.est_avoir || String(document.type_facture || "") === "avoir";

      typeDocumentFinal = estAvoir ? "avoir" : "facture";

      const { data: lignesData, error: lignesError } = await supabaseAdmin
        .from("factures_lignes")
        .select("*")
        .eq("facture_id", documentId)
        .eq("entreprise_id", entrepriseId)
        .order("ordre", { ascending: true });

      if (lignesError) throw lignesError;

      lignes = lignesData || [];

      if (estAvoir && document.facture_origine_id) {
        const { data: origineData, error: origineError } = await supabaseAdmin
          .from("factures")
          .select("id, numero, date_facture, total_ttc")
          .eq("id", document.facture_origine_id)
          .eq("entreprise_id", entrepriseId)
          .maybeSingle();

        if (origineError) throw origineError;

        factureOrigine = origineData || null;
      }
    }

    let client: any = null;

    if (document.client_id) {
      const { data: clientData, error: clientError } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("id", document.client_id)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (clientError) throw clientError;

      client = clientData || null;
    }

    const numero = document.numero || "sans numéro";
    const clientNom = nomClient(client, document);
    const entrepriseNom = entreprise.nom_entreprise || "Votre entreprise";

    const variables = {
      numero: String(numero),
      entreprise: String(entrepriseNom),
      client: String(clientNom),
      objet: String(document.objet || ""),
      total_ttc: formatMontant(document.total_ttc),
      date: formatDate(document.date_devis || document.date_facture),
      echeance: formatDate(document.date_echeance),
      validite: formatDate(document.date_validite),
    };

    let sujetModele = "";
    let messageModele = "";

    if (typeDocumentFinal === "devis") {
      sujetModele =
        texteOuVide(parametres.email_objet_devis) ||
        objetParDefaut("devis", String(numero));

      messageModele =
        texteOuVide(parametres.email_message_devis) ||
        messageParDefaut("devis", String(numero));
    } else if (typeDocumentFinal === "avoir") {
      sujetModele = objetParDefaut("avoir", String(numero));
      messageModele = messageParDefaut("avoir", String(numero));
    } else {
      sujetModele =
        texteOuVide(parametres.email_objet_facture) ||
        objetParDefaut("facture", String(numero));

      messageModele =
        texteOuVide(parametres.email_message_facture) ||
        messageParDefaut("facture", String(numero));
    }

    const sujetFinal = remplacerVariables(
      texteOuVide(body.sujet) || sujetModele,
      variables
    );

    const messageFinal = remplacerVariables(
      texteOuVide(body.message) || messageModele,
      variables
    );

    historiqueBase = {
      entreprise_id: entrepriseId,
      type_document: typeDocumentFinal,
      document_id: documentId,
      email_destinataire: emailDestinataire,
      sujet: sujetFinal,
      message: messageFinal,
      envoye_par: user.id,
    };

    const pieceJointePdf = await genererPdfDocument({
      typeDocument: typeDocumentFinal as TypeDocumentPdf,
      entreprise,
      document,
      client,
      lignes,
      factureOrigine,
    });

    const html = construireHtmlEmail({
      typeDocument: typeDocumentFinal,
      entreprise,
      document,
      client,
      lignes,
      sujet: sujetFinal,
      message: messageFinal,
      nomPieceJointe: pieceJointePdf.filename,
    });

    const cc: string[] = [];

    if (parametres.email_copie_entreprise) {
      const emailCopie =
        nettoyerEmail(parametres.email_copie_adresse) ||
        nettoyerEmail(entreprise.email_contact);

      if (
        emailCopie &&
        emailValide(emailCopie) &&
        emailCopie !== emailDestinataire
      ) {
        cc.push(emailCopie);
      }
    }

    const resultatResend = await envoyerAvecResend({
      to: emailDestinataire,
      cc,
      subject: sujetFinal,
      html,
      attachments: [
        {
          filename: pieceJointePdf.filename,
          content: pieceJointePdf.content,
        },
      ],
    });

    if (typeDocumentFinal === "devis") {
      await supabaseAdmin
        .from("devis")
        .update({
          statut: "envoye",
        })
        .eq("id", documentId)
        .eq("entreprise_id", entrepriseId)
        .neq("statut", "accepte")
        .neq("statut", "refuse")
        .neq("statut", "archive");
    }

    if (typeDocumentFinal === "facture" && document.statut === "brouillon") {
      await supabaseAdmin
        .from("factures")
        .update({
          statut: "envoyee",
        })
        .eq("id", documentId)
        .eq("entreprise_id", entrepriseId)
        .eq("statut", "brouillon");
    }

    await supabaseAdmin.from("documents_emails_envoyes").insert({
      ...historiqueBase,
      statut: "envoye",
      resend_id: resultatResend?.id || null,
      erreur: null,
      envoye_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      typeDocument: typeDocumentFinal,
      resendId: resultatResend?.id || null,
      pieceJointe: pieceJointePdf.filename,
      message:
        typeDocumentFinal === "avoir"
          ? "Avoir envoyé par email avec PDF en pièce jointe."
          : typeDocumentFinal === "devis"
          ? "Devis envoyé par email avec PDF en pièce jointe."
          : "Facture envoyée par email avec PDF en pièce jointe.",
    });
  } catch (error: any) {
    console.error("Erreur envoi email document :", error);

    if (
      historiqueBase.entreprise_id &&
      historiqueBase.type_document &&
      historiqueBase.document_id &&
      historiqueBase.email_destinataire
    ) {
      await supabaseAdmin.from("documents_emails_envoyes").insert({
        ...historiqueBase,
        statut: "erreur",
        resend_id: null,
        erreur: error?.message || "Erreur inconnue pendant l’envoi.",
        envoye_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur est survenue pendant l’envoi du document par email.",
      },
      { status: 500 }
    );
  }
}