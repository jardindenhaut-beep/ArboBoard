import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  genererPdfDocument,
  type TypeDocumentPdf,
} from "@/lib/documents/genererPdfDocument";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type TypeDocumentDemande =
  | "devis"
  | "facture"
  | "avoir";

type ModePdf =
  | "download"
  | "inline";

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
  origine:
    string | null
) {
  if (
    !origine
  ) {
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
  request:
    NextRequest,
  response:
    NextResponse
) {
  const origine =
    origineAutorisee(
      request.headers.get(
        "origin"
      )
    );

  if (
    origine
  ) {
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
      "Content-Disposition",
      "Content-Length",
      "Content-Type",
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
  request:
    NextRequest,
  donnees:
    Record<
      string,
      unknown
    >,
  status =
    200
) {
  return appliquerCors(
    request,
    NextResponse.json(
      donnees,
      {
        status,
      }
    )
  );
}

function reponseErreur(
  request:
    NextRequest,
  message:
    string,
  status =
    400
) {
  return reponseJson(
    request,
    {
      success:
        false,

      error:
        message,
    },
    status
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
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    }
  );
}

function encoderNomFichier(
  nomFichier:
    string
) {
  return encodeURIComponent(
    nomFichier
  )
    .replaceAll(
      "'",
      "%27"
    )
    .replaceAll(
      "(",
      "%28"
    )
    .replaceAll(
      ")",
      "%29"
    );
}

function headerContentDisposition(
  nomFichier:
    string,
  mode:
    ModePdf
) {
  const disposition =
    mode ===
    "inline"
      ? "inline"
      : "attachment";

  const nomSimple =
    nomFichier.replace(
      /[^\w.\- ]+/g,
      "-"
    );

  return `${disposition}; filename="${nomSimple}"; filename*=UTF-8''${encoderNomFichier(
    nomFichier
  )}`;
}

export async function OPTIONS(
  request:
    NextRequest
) {
  return appliquerCors(
    request,
    new NextResponse(
      null,
      {
        status:
          204,
      }
    )
  );
}

export async function POST(
  request:
    NextRequest
) {
  try {
    const supabaseAdmin =
      creerSupabaseAdmin();

    const authorization =
      request.headers.get(
        "authorization"
      ) ||
      "";

    const token =
      authorization.startsWith(
        "Bearer "
      )
        ? authorization
            .slice(7)
            .trim()
        : "";

    if (
      !token
    ) {
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
      await supabaseAdmin.auth.getUser(
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
          "id, role, statut, entreprise_id"
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
      console.error(
        "Profil utilisateur introuvable pour génération PDF :",
        profilError
      );

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
        "Accès refusé. Seul le chef actif peut accéder au PDF.",
        403
      );
    }

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

        mode?:
          ModePdf |
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

    const mode:
      ModePdf =
        body.mode ===
        "inline"
          ? "inline"
          : "download";

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

    if (
      !documentId
    ) {
      return reponseErreur(
        request,
        "Identifiant du document manquant.",
        400
      );
    }

    const entrepriseId =
      profil.entreprise_id as
        string;

    const {
      data:
        entreprise,
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
      console.error(
        "Erreur lecture entreprise pour génération PDF :",
        entrepriseError
      );

      throw new Error(
        "Impossible de charger les informations de l’entreprise."
      );
    }

    if (
      !entreprise
    ) {
      return reponseErreur(
        request,
        "Entreprise introuvable.",
        404
      );
    }

    let document:
      Record<
        string,
        any
      > |
      null =
        null;

    let lignes:
      Array<
        Record<
          string,
          any
        >
      > =
        [];

    let typeDocumentFinal:
      TypeDocumentPdf =
        typeDemande as
          TypeDocumentPdf;

    let factureOrigine:
      Record<
        string,
        any
      > |
      null =
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

      if (
        error
      ) {
        console.error(
          "Erreur lecture devis pour génération PDF :",
          error
        );

        throw new Error(
          "Impossible de charger le devis."
        );
      }

      if (
        !data
      ) {
        return reponseErreur(
          request,
          "Devis introuvable.",
          404
        );
      }

      document =
        data;

      typeDocumentFinal =
        "devis";

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
              ascending:
                true,
            }
          );

      if (
        lignesError
      ) {
        console.error(
          "Erreur lecture lignes devis pour génération PDF :",
          lignesError
        );

        throw new Error(
          "Impossible de charger les lignes du devis."
        );
      }

      lignes =
        lignesData ||
        [];
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

      if (
        error
      ) {
        console.error(
          "Erreur lecture facture pour génération PDF :",
          error
        );

        throw new Error(
          "Impossible de charger la facture."
        );
      }

      if (
        !data
      ) {
        return reponseErreur(
          request,
          "Facture introuvable.",
          404
        );
      }

      document =
        data;

      const estAvoir =
        Boolean(
          document.est_avoir
        ) ||
        String(
          document.type_facture ||
            ""
        ) ===
          "avoir";

      typeDocumentFinal =
        estAvoir
          ? "avoir"
          : "facture";

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

      if (
        typeDemande ===
          "facture" &&
        estAvoir
      ) {
        typeDocumentFinal =
          "avoir";
      }

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
              ascending:
                true,
            }
          );

      if (
        lignesError
      ) {
        console.error(
          "Erreur lecture lignes facture pour génération PDF :",
          lignesError
        );

        throw new Error(
          "Impossible de charger les lignes de la facture."
        );
      }

      lignes =
        lignesData ||
        [];

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
          console.error(
            "Erreur lecture facture d’origine pour génération PDF :",
            origineError
          );

          throw new Error(
            "Impossible de charger la facture d’origine."
          );
        }

        factureOrigine =
          origineData ||
          null;
      }
    }

    let client:
      Record<
        string,
        any
      > |
      null =
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
        console.error(
          "Erreur lecture client pour génération PDF :",
          clientError
        );

        throw new Error(
          "Impossible de charger les informations du client."
        );
      }

      client =
        clientData ||
        null;
    }

    const pieceJointePdf =
      await genererPdfDocument({
        typeDocument:
          typeDocumentFinal,

        entreprise,

        document,

        client,

        lignes,

        factureOrigine,
      });

    const corpsPdf =
      new Uint8Array(
        pieceJointePdf.buffer
      );

    const response =
      new NextResponse(
        corpsPdf as any,
        {
          status:
            200,

          headers: {
            "Content-Type":
              "application/pdf",

            "Content-Disposition":
              headerContentDisposition(
                pieceJointePdf.filename,
                mode
              ),

            "Content-Length":
              String(
                pieceJointePdf
                  .buffer
                  .byteLength
              ),

            "Cache-Control":
              "no-store",

            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );

    return appliquerCors(
      request,
      response
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur génération PDF document :",
      error
    );

    return reponseErreur(
      request,
      "Une erreur est survenue pendant la génération du PDF.",
      500
    );
  }
}