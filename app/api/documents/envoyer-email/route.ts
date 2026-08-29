import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  entetesLimiteRequetes,
  obtenirAdresseIp,
  verifierLimiteRequetes,
} from "@/lib/securite/limiteurRequetes";

import {
  genererPdfDocument,
  type TypeDocumentPdf,
} from "@/lib/documents/genererPdfDocument";

import {
  normaliserDesignDocuments,
  type DesignDocuments,
} from "@/lib/documents/designDocuments";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type TypeDocumentDemande =
  | "devis"
  | "facture"
  | "avoir";

type ParametresEmail = {
  email_objet_devis?: string | null;

  email_message_devis?: string | null;

  email_objet_facture?: string | null;

  email_message_facture?: string | null;

  email_copie_entreprise?: boolean | null;

  email_copie_adresse?: string | null;

  [cle: string]: unknown;
};

type EntrepriseDocument = {
  id: string;

  nom_entreprise?: string | null;

  nom?: string | null;

  forme_juridique?: string | null;

  adresse?: string | null;

  code_postal?: string | null;

  ville?: string | null;

  telephone?: string | null;

  email_contact?: string | null;

  siret?: string | null;

  numero_tva?: string | null;

  [cle: string]: unknown;
};

const ORIGINES_AUTORISEES =
  new Set([
    "https://arboboard.fr",
    "https://www.arboboard.fr",
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    "https://localhost",
  ]);

function origineAutorisee(
  origine: string | null
) {
  if (!origine) {
    return null;
  }

  if (
    ORIGINES_AUTORISEES.has(
      origine
    )
  ) {
    return origine;
  }

  if (
    /^https?:\/\/localhost(?::\d+)?$/i.test(
      origine
    )
  ) {
    return origine;
  }

  if (
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(
      origine
    )
  ) {
    return origine;
  }

  return null;
}

function appliquerCors(
  request: NextRequest,
  response: NextResponse
) {
  const origine =
    origineAutorisee(
      request.headers.get(
        "origin"
      )
    );

  if (origine) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      origine
    );
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  response.headers.set(
    "Access-Control-Allow-Headers",
    [
      "Authorization",
      "Content-Type",
      "X-Arboboard-Client",
    ].join(", ")
  );

  response.headers.set(
    "Access-Control-Expose-Headers",
    [
      "Content-Type",
      "Retry-After",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ].join(", ")
  );

  response.headers.set(
    "Access-Control-Max-Age",
    "86400"
  );

  response.headers.set(
    "Vary",
    "Origin"
  );

  return response;
}

function reponseJson(
  request: NextRequest,
  donnees: Record<
    string,
    unknown
  >,
  status = 200,
  headers?: HeadersInit
) {
  return appliquerCors(
    request,
    NextResponse.json(
      donnees,
      {
        status,
        headers,
      }
    )
  );
}

function reponseErreur(
  request: NextRequest,
  message: string,
  status = 400,
  headers?: HeadersInit
) {
  return reponseJson(
    request,
    {
      success: false,
      error: message,
    },
    status,
    headers
  );
}

function creerSupabaseAdmin() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Configuration Supabase serveur manquante."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function nettoyerEmail(
  email: unknown
) {
  return String(
    email || ""
  )
    .trim()
    .toLowerCase();
}

function emailValide(
  email: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function texteOuVide(
  valeur: unknown
) {
  return String(
    valeur || ""
  ).trim();
}

function formatMontant(
  montant: unknown
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(
    Number(
      montant || 0
    )
  );
}

function formatDate(
  date: unknown
) {
  const valeur =
    String(
      date || ""
    ).trim();

  if (!valeur) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(
      new Date(
        `${valeur.slice(
          0,
          10
        )}T00:00:00`
      )
    );
  } catch {
    return "—";
  }
}

function echapperHtml(
  valeur: unknown
) {
  return String(
    valeur || ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function nl2br(
  valeur: unknown
) {
  return echapperHtml(
    valeur
  ).replace(
    /\n/g,
    "<br />"
  );
}

function remplacerVariables(
  texte: string,
  variables: Record<
    string,
    string
  >
) {
  let resultat =
    texte;

  Object.entries(
    variables
  ).forEach(
    ([
      cle,
      valeur,
    ]) => {
      resultat =
        resultat.replaceAll(
          `{${cle}}`,
          valeur
        );
    }
  );

  return resultat;
}

function nomClient(
  client: any,
  document: any
) {
  if (
    document?.client_nom
  ) {
    return String(
      document.client_nom
    );
  }

  if (!client) {
    return "Client";
  }

  if (
    client.type_client ===
    "particulier"
  ) {
    const nom =
      `${client.prenom || ""} ${
        client.nom || ""
      }`.trim();

    return (
      nom ||
      "Client particulier"
    );
  }

  return (
    client.entreprise ||
    client.nom ||
    `${client.prenom || ""} ${
      client.nom || ""
    }`.trim() ||
    "Client professionnel"
  );
}

function objetParDefaut(
  typeDocument:
    TypeDocumentDemande,
  numero: string
) {
  if (
    typeDocument ===
    "devis"
  ) {
    return `Votre devis ${numero}`;
  }

  if (
    typeDocument ===
    "avoir"
  ) {
    return `Votre avoir ${numero}`;
  }

  return `Votre facture ${numero}`;
}

function messageParDefaut(
  typeDocument:
    TypeDocumentDemande,
  numero: string
) {
  if (
    typeDocument ===
    "devis"
  ) {
    return `Bonjour,

Veuillez trouver ci-joint votre devis ${numero} au format PDF.

Cordialement.`;
  }

  if (
    typeDocument ===
    "avoir"
  ) {
    return `Bonjour,

Veuillez trouver ci-joint votre avoir ${numero} au format PDF.

Cet avoir vient rectifier ou annuler une facture précédemment émise.

Cordialement.`;
  }

  return `Bonjour,

Veuillez trouver ci-joint votre facture ${numero} au format PDF.

Cordialement.`;
}

function titreDocument(
  typeDocument:
    TypeDocumentDemande
) {
  if (
    typeDocument ===
    "devis"
  ) {
    return "DEVIS";
  }

  if (
    typeDocument ===
    "avoir"
  ) {
    return "AVOIR";
  }

  return "FACTURE";
}

function libelleDocument(
  typeDocument:
    TypeDocumentDemande
) {
  if (
    typeDocument ===
    "devis"
  ) {
    return "devis";
  }

  if (
    typeDocument ===
    "avoir"
  ) {
    return "avoir";
  }

  return "facture";
}

function construireHtmlEmail(
  params: {
    typeDocument:
      TypeDocumentDemande;

    entreprise:
      EntrepriseDocument;

    document:
      any;

    client:
      any;

    lignes:
      any[];

    sujet:
      string;

    message:
      string;

    nomPieceJointe:
      string;

    design:
      DesignDocuments;
  }
) {
  const {
    typeDocument,
    entreprise,
    document,
    client,
    lignes,
    message,
    nomPieceJointe,
    design,
  } =
    params;

  const estAvoir =
    typeDocument ===
    "avoir";

  const nomEntreprise =
    entreprise
      ?.nom_entreprise ||
    entreprise?.nom ||
    "Votre entreprise";

  const numero =
    document?.numero ||
    "sans numéro";

  const clientNom =
    nomClient(
      client,
      document
    );

  const titre =
    titreDocument(
      typeDocument
    );

  const libelle =
    libelleDocument(
      typeDocument
    );

  const couleur =
    design
      .design_couleur_principale;

  const fond =
    design
      .design_couleur_secondaire;

  const bordure =
    design
      .design_couleur_principale;

  const lignesHtml =
    lignes.length > 0
      ? lignes
          .map(
            (
              ligne
            ) => {
              if (
                ligne.type_ligne ===
                "section"
              ) {
                return `
                  <tr>
                    <td
                      colspan="4"
                      style="
                        padding:12px 10px;
                        background:#f8fafc;
                        border-bottom:1px solid #e5e7eb;
                        color:${couleur};
                        font-size:13px;
                        font-weight:800;
                      "
                    >
                      ${echapperHtml(
                        ligne.designation ||
                          "Section"
                      )}

                      ${
                        ligne.description
                          ? `<br><span style="font-size:11px;font-weight:400;color:#64748b;">${nl2br(
                              ligne.description
                            )}</span>`
                          : ""
                      }
                    </td>
                  </tr>
                `;
              }

              return `
                <tr>
                  <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
                    <strong>
                      ${echapperHtml(
                        ligne.designation ||
                          "Ligne"
                      )}
                    </strong>

                    ${
                      ligne.description
                        ? `<br><span style="font-size:12px;color:#64748b;">${nl2br(
                            ligne.description
                          )}</span>`
                        : ""
                    }

                    ${
                      Number(
                        ligne.remise_pourcent ||
                          0
                      ) > 0
                        ? `<br><span style="font-size:11px;color:#059669;">Remise : ${echapperHtml(
                            ligne.remise_pourcent
                          )} %</span>`
                        : ""
                    }
                  </td>

                  <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">
                    ${echapperHtml(
                      ligne.quantite ??
                        "—"
                    )}
                  </td>

                  <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">
                    ${echapperHtml(
                      ligne.unite ||
                        "u"
                    )}
                  </td>

                  <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">
                    ${formatMontant(
                      ligne.total_ttc
                    )}
                  </td>
                </tr>
              `;
            }
          )
          .join("")
      : `
        <tr>
          <td
            colspan="4"
            style="
              padding:14px;
              text-align:center;
              color:#64748b;
              border-bottom:1px solid #e5e7eb;
            "
          >
            Aucune ligne renseignée.
          </td>
        </tr>
      `;

  const blocAvoir =
    estAvoir
      ? `
        <div
          style="
            margin:20px 0;
            padding:16px;
            border:1px solid #e9d5ff;
            background:#faf5ff;
            border-radius:16px;
            color:#581c87;
          "
        >
          <p style="margin:0;font-weight:700;">
            Information avoir
          </p>

          <p
            style="
              margin:8px 0 0 0;
              font-size:14px;
              line-height:1.6;
            "
          >
            Cet avoir est établi en référence à une facture précédemment émise.
          </p>

          ${
            document
              ?.motif_avoir
              ? `
                <p
                  style="
                    margin:8px 0 0 0;
                    font-size:14px;
                    line-height:1.6;
                  "
                >
                  <strong>
                    Motif :
                  </strong>

                  ${nl2br(
                    document.motif_avoir
                  )}
                </p>
              `
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
    <title>${echapperHtml(
      params.sujet
    )}</title>
  </head>

  <body
    style="
      margin:0;
      padding:0;
      background:#f1f5f9;
      font-family:Arial,Helvetica,sans-serif;
      color:#0f172a;
    "
  >
    <div
      style="
        max-width:760px;
        margin:0 auto;
        padding:24px;
      "
    >
      <div
        style="
          background:#ffffff;
          border-radius:24px;
          overflow:hidden;
          border:1px solid #e2e8f0;
        "
      >
        <div
          style="
            padding:28px;
            background:${fond};
            border-bottom:1px solid ${bordure};
          "
        >
          <p
            style="
              margin:0;
              font-size:13px;
              font-weight:700;
              color:${couleur};
              text-transform:uppercase;
              letter-spacing:.08em;
            "
          >
            ${echapperHtml(
              nomEntreprise
            )}
          </p>

          <h1
            style="
              margin:8px 0 0 0;
              font-size:28px;
              line-height:1.2;
              color:#0f172a;
            "
          >
            ${titre}
            ${echapperHtml(
              numero
            )}
          </h1>

          <p
            style="
              margin:8px 0 0 0;
              color:#475569;
              font-size:14px;
            "
          >
            Document adressé à
            ${echapperHtml(
              clientNom
            )}
          </p>
        </div>

        <div style="padding:28px;">
          <div
            style="
              font-size:15px;
              line-height:1.7;
              color:#334155;
            "
          >
            ${nl2br(
              message
            )}
          </div>

          <div
            style="
              margin-top:20px;
              padding:14px 16px;
              border:1px solid #dbeafe;
              background:#eff6ff;
              border-radius:16px;
              color:#1e40af;
            "
          >
            <p
              style="
                margin:0;
                font-size:14px;
                font-weight:700;
              "
            >
              Pièce jointe
            </p>

            <p
              style="
                margin:6px 0 0 0;
                font-size:14px;
              "
            >
              Le PDF est joint à cet email :

              <strong>
                ${echapperHtml(
                  nomPieceJointe
                )}
              </strong>
            </p>
          </div>

          ${blocAvoir}

          <div
            style="
              margin-top:24px;
              border:1px solid #e2e8f0;
              border-radius:18px;
              overflow:hidden;
            "
          >
            <div
              style="
                padding:16px;
                background:#f8fafc;
                border-bottom:1px solid #e2e8f0;
              "
            >
              <strong>
                Récapitulatif du
                ${libelle}
              </strong>
            </div>

            <div style="padding:16px;">
              <table
                style="
                  width:100%;
                  border-collapse:collapse;
                  font-size:14px;
                "
              >
                <tbody>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;">
                      Numéro
                    </td>

                    <td style="padding:6px 0;text-align:right;font-weight:700;">
                      ${echapperHtml(
                        numero
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:6px 0;color:#64748b;">
                      Date
                    </td>

                    <td style="padding:6px 0;text-align:right;">
                      ${formatDate(
                        document.date_devis ||
                          document.date_facture
                      )}
                    </td>
                  </tr>

                  ${
                    typeDocument ===
                    "devis"
                      ? `
                        <tr>
                          <td style="padding:6px 0;color:#64748b;">
                            Validité
                          </td>

                          <td style="padding:6px 0;text-align:right;">
                            ${formatDate(
                              document.date_validite
                            )}
                          </td>
                        </tr>
                      `
                      : !estAvoir
                        ? `
                          <tr>
                            <td style="padding:6px 0;color:#64748b;">
                              Échéance
                            </td>

                            <td style="padding:6px 0;text-align:right;">
                              ${formatDate(
                                document.date_echeance
                              )}
                            </td>
                          </tr>
                        `
                        : ""
                  }

                  <tr>
                    <td style="padding:6px 0;color:#64748b;">
                      Objet
                    </td>

                    <td style="padding:6px 0;text-align:right;font-weight:700;">
                      ${echapperHtml(
                        document.objet ||
                          "—"
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div
            style="
              margin-top:24px;
              border:1px solid #e2e8f0;
              border-radius:18px;
              overflow:hidden;
            "
          >
            <table
              style="
                width:100%;
                border-collapse:collapse;
                font-size:13px;
              "
            >
              <thead>
                <tr
                  style="
                    background:#f8fafc;
                    color:#475569;
                  "
                >
                  <th style="padding:10px;text-align:left;">
                    Désignation
                  </th>

                  <th style="padding:10px;text-align:right;">
                    Qté
                  </th>

                  <th style="padding:10px;text-align:right;">
                    Unité
                  </th>

                  <th style="padding:10px;text-align:right;">
                    Total TTC
                  </th>
                </tr>
              </thead>

              <tbody>
                ${lignesHtml}
              </tbody>
            </table>
          </div>

          <div
            style="
              margin-top:24px;
              margin-left:auto;
              max-width:320px;
              border:1px solid #e2e8f0;
              border-radius:18px;
              padding:16px;
              background:#f8fafc;
            "
          >
            <table
              style="
                width:100%;
                border-collapse:collapse;
                font-size:14px;
              "
            >
              <tbody>
                <tr>
                  <td style="padding:6px 0;color:#64748b;">
                    Total HT
                  </td>

                  <td style="padding:6px 0;text-align:right;font-weight:700;">
                    ${formatMontant(
                      document.total_ht
                    )}
                  </td>
                </tr>

                <tr>
                  <td style="padding:6px 0;color:#64748b;">
                    TVA
                  </td>

                  <td style="padding:6px 0;text-align:right;font-weight:700;">
                    ${formatMontant(
                      document.total_tva
                    )}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:10px 0 6px 0;
                      border-top:1px solid #e2e8f0;
                      font-size:16px;
                      font-weight:800;
                    "
                  >
                    Total TTC
                  </td>

                  <td
                    style="
                      padding:10px 0 6px 0;
                      border-top:1px solid #e2e8f0;
                      text-align:right;
                      font-size:16px;
                      font-weight:900;
                      color:${couleur};
                    "
                  >
                    ${formatMontant(
                      document.total_ttc
                    )}
                  </td>
                </tr>

                ${
                  typeDocument ===
                  "facture"
                    ? `
                      <tr>
                        <td style="padding:6px 0;color:#64748b;">
                          Déjà payé
                        </td>

                        <td style="padding:6px 0;text-align:right;font-weight:700;">
                          ${formatMontant(
                            document.montant_paye
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:6px 0;color:#64748b;">
                          Reste à payer
                        </td>

                        <td style="padding:6px 0;text-align:right;font-weight:900;color:#dc2626;">
                          ${formatMontant(
                            document.reste_a_payer
                          )}
                        </td>
                      </tr>
                    `
                    : ""
                }
              </tbody>
            </table>
          </div>

          <p
            style="
              margin:24px 0 0 0;
              font-size:12px;
              line-height:1.6;
              color:#64748b;
              text-align:center;
            "
          >
            Email envoyé depuis Arboboard.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

async function envoyerAvecResend(
  params: {
    to: string;

    cc?: string[];

    subject: string;

    html: string;

    attachments?: {
      filename: string;

      content: string;
    }[];
  }
) {
  const apiKey =
    process.env
      .RESEND_API_KEY;

  const from =
    process.env
      .RESEND_FROM_EMAIL ||
    "Arboboard <contact@arboboard.fr>";

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY manquant."
    );
  }

  const payload: any = {
    from,

    to: [
      params.to,
    ],

    subject:
      params.subject,

    html:
      params.html,
  };

  if (
    params.cc &&
    params.cc.length > 0
  ) {
    payload.cc =
      params.cc;
  }

  if (
    params.attachments &&
    params.attachments.length >
      0
  ) {
    payload.attachments =
      params.attachments;
  }

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );

  const resultat =
    await response
      .json()
      .catch(
        () => null
      );

  if (!response.ok) {
    throw new Error(
      resultat?.message ||
        resultat?.error ||
        "Erreur lors de l’envoi de l’email avec Resend."
    );
  }

  return resultat;
}

export async function OPTIONS(
  request: NextRequest
) {
  return appliquerCors(
    request,
    new NextResponse(
      null,
      {
        status: 204,
      }
    )
  );
}

export async function POST(
  request: NextRequest
) {
  const ip =
    obtenirAdresseIp(
      request
    );

  const limiteIp =
    verifierLimiteRequetes({
      cle:
        `email-document:ip:${ip}`,

      limite: 40,

      fenetreMs:
        15 *
        60 *
        1000,
    });

  if (!limiteIp.autorise) {
    return reponseErreur(
      request,
      "Trop de tentatives d’envoi de documents. Réessaie dans quelques minutes.",
      429,
      entetesLimiteRequetes(
        limiteIp
      )
    );
  }

  let supabaseAdmin:
    ReturnType<
      typeof creerSupabaseAdmin
    >;

  try {
    supabaseAdmin =
      creerSupabaseAdmin();
  } catch (
    error
  ) {
    console.error(
      "Erreur configuration serveur email :",
      error
    );

    return reponseErreur(
      request,
      "Configuration serveur indisponible.",
      500
    );
  }

  let historiqueBase: {
    entreprise_id?:
      string;

    type_document?:
      string;

    document_id?:
      string;

    email_destinataire?:
      string;

    sujet?:
      string;

    message?:
      string;

    envoye_par?:
      string;
  } = {};

  try {
    const authorization =
      request.headers.get(
        "authorization"
      ) || "";

    const token =
      authorization.startsWith(
        "Bearer "
      )
        ? authorization
            .slice(7)
            .trim()
        : "";

    if (!token) {
      return reponseErreur(
        request,
        "Token d’authentification manquant.",
        401
      );
    }

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabaseAdmin
        .auth
        .getUser(
          token
        );

    if (
      userError ||
      !user?.id
    ) {
      return reponseErreur(
        request,
        "Utilisateur non connecté.",
        401
      );
    }

    const limiteUtilisateur =
      verifierLimiteRequetes({
        cle:
          `email-document:user:${user.id}`,

        limite: 25,

        fenetreMs:
          60 *
          60 *
          1000,
      });

    if (
      !limiteUtilisateur.autorise
    ) {
      return reponseErreur(
        request,
        "La limite horaire d’envoi de documents est atteinte. Réessaie plus tard.",
        429,
        entetesLimiteRequetes(
          limiteUtilisateur
        )
      );
    }

    const {
      data:
        profil,
      error:
        profilError,
    } =
      await supabaseAdmin
        .from(
          "profils_utilisateurs"
        )
        .select(
          "id, role, statut, entreprise_id, email, nom, prenom"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      profilError ||
      !profil
    ) {
      return reponseErreur(
        request,
        "Profil utilisateur introuvable.",
        403
      );
    }

    if (
      profil.role !==
        "chef" ||
      profil.statut !==
        "actif" ||
      !profil.entreprise_id
    ) {
      return reponseErreur(
        request,
        "Accès refusé. Seul le chef actif peut envoyer un document.",
        403
      );
    }

    const entrepriseId =
      profil.entreprise_id as
        string;

    const body =
      (
        await request
          .json()
          .catch(
            () => ({})
          )
      ) as {
        typeDocument?:
          TypeDocumentDemande |
          string;

        type_document?:
          TypeDocumentDemande |
          string;

        documentId?:
          string;

        document_id?:
          string;

        email?:
          string;

        emailDestinataire?:
          string;

        message?:
          string;

        sujet?:
          string;
      };

    const typeDemande =
      String(
        body.typeDocument ||
          body.type_document ||
          ""
      ).trim() as
        TypeDocumentDemande;

    const documentId =
      String(
        body.documentId ||
          body.document_id ||
          ""
      ).trim();

    const emailDestinataire =
      nettoyerEmail(
        body.email ||
          body.emailDestinataire
      );

    if (
      ![
        "devis",
        "facture",
        "avoir",
      ].includes(
        typeDemande
      )
    ) {
      return reponseErreur(
        request,
        "Type de document invalide.",
        400
      );
    }

    if (!documentId) {
      return reponseErreur(
        request,
        "Identifiant du document manquant.",
        400
      );
    }

    if (
      !emailDestinataire ||
      !emailValide(
        emailDestinataire
      )
    ) {
      return reponseErreur(
        request,
        "Adresse email destinataire invalide.",
        400
      );
    }

    /*
     * IMPORTANT :
     *
     * Le cast explicite ci-dessous
     * empêche Supabase/TypeScript de
     * transformer le résultat du select
     * dynamique en GenericStringError.
     */
    const {
      data:
        entrepriseData,
      error:
        entrepriseError,
    } =
      await supabaseAdmin
        .from(
          "entreprises_abonnees"
        )
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
        .eq(
          "id",
          entrepriseId
        )
        .maybeSingle();

    if (
      entrepriseError
    ) {
      throw entrepriseError;
    }

    const entreprise =
      entrepriseData as unknown as
        EntrepriseDocument |
        null;

    if (!entreprise) {
      return reponseErreur(
        request,
        "Entreprise introuvable.",
        404
      );
    }

    const {
      data:
        parametresData,
      error:
        parametresError,
    } =
      await supabaseAdmin
        .from(
          "entreprise_parametres"
        )
        .select(
          [
            "email_objet_devis",
            "email_message_devis",
            "email_objet_facture",
            "email_message_facture",
            "email_copie_entreprise",
            "email_copie_adresse",
            "design_couleur_principale",
            "design_couleur_secondaire",
            "design_modele_document",
            "design_lignes_compactes",
            "design_disposition_entete",
            "design_style_tableau",
            "design_taille_logo",
            "design_position_logo",
            "design_afficher_adresse",
            "design_afficher_contact",
            "design_afficher_siret",
            "design_afficher_tva",
            "design_afficher_assurance",
            "design_position_totaux",
            "design_pied_page",
          ].join(", ")
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .maybeSingle();

    if (
      parametresError
    ) {
      console.error(
        "Erreur lecture paramètres email :",
        parametresError
      );
    }

    const parametres =
      (
        parametresData ||
        {}
      ) as unknown as
        ParametresEmail;

    let document: any =
      null;

    let lignes: any[] =
      [];

    let typeDocumentFinal:
      TypeDocumentDemande =
        typeDemande;

    let factureOrigine: any =
      null;

    if (
      typeDemande ===
      "devis"
    ) {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            "devis"
          )
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
              "remise_globale_pourcent",
              "remise_globale_montant",
            ].join(", ")
          )
          .eq(
            "id",
            documentId
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return reponseErreur(
          request,
          "Devis introuvable.",
          404
        );
      }

      document =
        data as any;

      const {
        data:
          lignesData,
        error:
          lignesError,
      } =
        await supabaseAdmin
          .from(
            "devis_lignes"
          )
          .select(
            [
              "id",
              "type_ligne",
              "designation",
              "description",
              "quantite",
              "unite",
              "prix_unitaire_ht",
              "remise_pourcent",
              "total_brut_ht",
              "tva",
              "total_ht",
              "total_tva",
              "total_ttc",
              "ordre",
            ].join(", ")
          )
          .eq(
            "devis_id",
            documentId
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .order(
            "ordre",
            {
              ascending: true,
            }
          );

      if (
        lignesError
      ) {
        throw lignesError;
      }

      lignes =
        (
          lignesData ||
          []
        ) as any[];

      typeDocumentFinal =
        "devis";
    } else {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            "factures"
          )
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
              "remise_globale_pourcent",
              "remise_globale_montant",
              "montant_paye",
              "reste_a_payer",
            ].join(", ")
          )
          .eq(
            "id",
            documentId
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return reponseErreur(
          request,
          "Facture introuvable.",
          404
        );
      }

      document =
        data as any;

      const estAvoir =
        Boolean(
          document.est_avoir
        ) ||
        String(
          document.type_facture ||
            ""
        ) ===
          "avoir";

      if (
        typeDemande ===
          "avoir" &&
        !estAvoir
      ) {
        return reponseErreur(
          request,
          "Ce document n’est pas un avoir.",
          400
        );
      }

      typeDocumentFinal =
        estAvoir
          ? "avoir"
          : "facture";

      const {
        data:
          lignesData,
        error:
          lignesError,
      } =
        await supabaseAdmin
          .from(
            "factures_lignes"
          )
          .select(
            [
              "id",
              "type_ligne",
              "designation",
              "description",
              "quantite",
              "unite",
              "prix_unitaire_ht",
              "remise_pourcent",
              "total_brut_ht",
              "tva",
              "total_ht",
              "total_tva",
              "total_ttc",
              "ordre",
            ].join(", ")
          )
          .eq(
            "facture_id",
            documentId
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .order(
            "ordre",
            {
              ascending: true,
            }
          );

      if (
        lignesError
      ) {
        throw lignesError;
      }

      lignes =
        (
          lignesData ||
          []
        ) as any[];

      if (
        estAvoir &&
        document.facture_origine_id
      ) {
        const {
          data:
            origineData,
          error:
            origineError,
        } =
          await supabaseAdmin
            .from(
              "factures"
            )
            .select(
              "id, numero, date_facture, total_ttc"
            )
            .eq(
              "id",
              document.facture_origine_id
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .maybeSingle();

        if (
          origineError
        ) {
          throw origineError;
        }

        factureOrigine =
          origineData as any;
      }
    }

    let client: any =
      null;

    if (
      document.client_id
    ) {
      const {
        data:
          clientData,
        error:
          clientError,
      } =
        await supabaseAdmin
          .from(
            "clients"
          )
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
          .eq(
            "id",
            document.client_id
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .maybeSingle();

      if (
        clientError
      ) {
        throw clientError;
      }

      client =
        clientData as any;
    }

    const numero =
      document.numero ||
      "sans numéro";

    const clientNom =
      nomClient(
        client,
        document
      );

    const entrepriseNom =
      entreprise.nom_entreprise ||
      "Votre entreprise";

    const variables = {
      numero:
        String(
          numero
        ),

      entreprise:
        String(
          entrepriseNom
        ),

      client:
        String(
          clientNom
        ),

      objet:
        String(
          document.objet ||
            ""
        ),

      total_ttc:
        formatMontant(
          document.total_ttc
        ),

      date:
        formatDate(
          document.date_devis ||
            document.date_facture
        ),

      echeance:
        formatDate(
          document.date_echeance
        ),

      validite:
        formatDate(
          document.date_validite
        ),
    };

    let sujetModele =
      "";

    let messageModele =
      "";

    if (
      typeDocumentFinal ===
      "devis"
    ) {
      sujetModele =
        texteOuVide(
          parametres.email_objet_devis
        ) ||
        objetParDefaut(
          "devis",
          String(
            numero
          )
        );

      messageModele =
        texteOuVide(
          parametres.email_message_devis
        ) ||
        messageParDefaut(
          "devis",
          String(
            numero
          )
        );
    } else if (
      typeDocumentFinal ===
      "avoir"
    ) {
      sujetModele =
        objetParDefaut(
          "avoir",
          String(
            numero
          )
        );

      messageModele =
        messageParDefaut(
          "avoir",
          String(
            numero
          )
        );
    } else {
      sujetModele =
        texteOuVide(
          parametres.email_objet_facture
        ) ||
        objetParDefaut(
          "facture",
          String(
            numero
          )
        );

      messageModele =
        texteOuVide(
          parametres.email_message_facture
        ) ||
        messageParDefaut(
          "facture",
          String(
            numero
          )
        );
    }

    const sujetFinal =
      remplacerVariables(
        texteOuVide(
          body.sujet
        ) ||
          sujetModele,
        variables
      );

    const messageFinal =
      remplacerVariables(
        texteOuVide(
          body.message
        ) ||
          messageModele,
        variables
      );

    historiqueBase = {
      entreprise_id:
        entrepriseId,

      type_document:
        typeDocumentFinal,

      document_id:
        documentId,

      email_destinataire:
        emailDestinataire,

      sujet:
        sujetFinal,

      message:
        messageFinal,

      envoye_par:
        user.id,
    };

    const pieceJointePdf =
      await genererPdfDocument({
        typeDocument:
          typeDocumentFinal as
            TypeDocumentPdf,

        entreprise,

        document,

        client,

        lignes,

        factureOrigine,
      });

    const html =
      construireHtmlEmail({
        typeDocument:
          typeDocumentFinal,

        entreprise,

        document,

        client,

        lignes,

        sujet:
          sujetFinal,

        message:
          messageFinal,

        nomPieceJointe:
          pieceJointePdf.filename,

        design:
          normaliserDesignDocuments(
            parametres
          ),
      });

    const cc:
      string[] =
        [];

    if (
      parametres
        .email_copie_entreprise
    ) {
      const emailCopie =
        nettoyerEmail(
          parametres
            .email_copie_adresse
        ) ||
        nettoyerEmail(
          entreprise.email_contact
        );

      if (
        emailCopie &&
        emailValide(
          emailCopie
        ) &&
        emailCopie !==
          emailDestinataire
      ) {
        cc.push(
          emailCopie
        );
      }
    }

    const resultatResend =
      await envoyerAvecResend({
        to:
          emailDestinataire,

        cc,

        subject:
          sujetFinal,

        html,

        attachments: [
          {
            filename:
              pieceJointePdf.filename,

            content:
              pieceJointePdf.content,
          },
        ],
      });

    if (
      typeDocumentFinal ===
      "devis"
    ) {
      const {
        error:
          updateDevisError,
      } =
        await supabaseAdmin
          .from(
            "devis"
          )
          .update({
            statut:
              "envoye",
          })
          .eq(
            "id",
            documentId
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .neq(
            "statut",
            "accepte"
          )
          .neq(
            "statut",
            "refuse"
          )
          .neq(
            "statut",
            "archive"
          )
          .neq(
            "statut",
            "facture"
          );

      if (
        updateDevisError
      ) {
        console.error(
          "Erreur mise à jour statut devis après envoi :",
          updateDevisError
        );
      }
    }

    if (
      typeDocumentFinal ===
        "facture" &&
      document.statut ===
        "brouillon"
    ) {
      const {
        error:
          updateFactureError,
      } =
        await supabaseAdmin
          .from(
            "factures"
          )
          .update({
            statut:
              "envoyee",
          })
          .eq(
            "id",
            documentId
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "statut",
            "brouillon"
          );

      if (
        updateFactureError
      ) {
        console.error(
          "Erreur mise à jour statut facture après envoi :",
          updateFactureError
        );
      }
    }

    const {
      error:
        historiqueError,
    } =
      await supabaseAdmin
        .from(
          "documents_emails_envoyes"
        )
        .insert({
          ...historiqueBase,

          statut:
            "envoye",

          resend_id:
            resultatResend?.id ||
            null,

          erreur:
            null,

          envoye_at:
            new Date()
              .toISOString(),
        });

    if (
      historiqueError
    ) {
      console.error(
        "Erreur historique email document :",
        historiqueError
      );
    }

    return reponseJson(
      request,
      {
        success:
          true,

        typeDocument:
          typeDocumentFinal,

        resendId:
          resultatResend?.id ||
          null,

        pieceJointe:
          pieceJointePdf.filename,

        message:
          typeDocumentFinal ===
          "avoir"
            ? "Avoir envoyé par email avec PDF en pièce jointe."
            : typeDocumentFinal ===
                "devis"
              ? "Devis envoyé par email avec PDF en pièce jointe."
              : "Facture envoyée par email avec PDF en pièce jointe.",
      },
      200
    );
  } catch (
    error: any
  ) {
    console.error(
      "Erreur envoi email document :",
      error
    );

    if (
      historiqueBase
        .entreprise_id &&
      historiqueBase
        .type_document &&
      historiqueBase
        .document_id &&
      historiqueBase
        .email_destinataire
    ) {
      try {
        await supabaseAdmin
          .from(
            "documents_emails_envoyes"
          )
          .insert({
            ...historiqueBase,

            statut:
              "erreur",

            resend_id:
              null,

            erreur:
              error?.message ||
              "Erreur inconnue pendant l’envoi.",

            envoye_at:
              new Date()
                .toISOString(),
          });
      } catch (
        historiqueError
      ) {
        console.error(
          "Impossible d’enregistrer l’erreur dans l’historique email :",
          historiqueError
        );
      }
    }

    return reponseErreur(
      request,
      "Une erreur est survenue pendant l’envoi du document par email.",
      500
    );
  }
}