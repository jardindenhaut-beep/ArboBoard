import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  ErreurApiUrssaf,
  obtenirJetonUrssaf,
} from "@/lib/server/urssafTp";
import { dechiffrerIdentifiant } from "@/lib/server/chiffrementIdentifiants";
import { rechercherDemandePaiementUrssaf } from "@/lib/server/urssafDemandesPaiement";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Profil = {
  id: string;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type IntegrationUrssaf = {
  entreprise_id: string;
  client_id_chiffre: string;
  client_secret_chiffre: string;
  actif: boolean;
  statut: string;
};

type StatutLocal =
  | "brouillon"
  | "prete"
  | "transmise"
  | "payee"
  | "impayee"
  | "annulee"
  | "erreur";

type DemandePaiement = {
  id: string;
  entreprise_id: string;
  facture_id: string;
  numero_facture: string;
  urssaf_id_demande_paiement: string;
  statut_local: StatutLocal;
  statut_urssaf_code?: string | null;
  statut_urssaf_libelle?: string | null;
};

type ErreurSynchronisation = {
  demande_id: string;
  facture_id: string;
  message: string;
  code_http?: number;
};

const ROLES_AUTORISES = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

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

function normaliser(
  valeur: string | null | undefined
) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function texte(
  valeur: unknown,
  longueur = 1000
) {
  return typeof valeur === "string"
    ? valeur
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, longueur)
    : "";
}

function statutLocalDepuisCode(
  code: string
): StatutLocal {
  if (
    code === "70" ||
    code === "120"
  ) {
    return "payee";
  }

  if (code === "60") {
    return "impayee";
  }

  if (
    ["110", "111", "112"].includes(
      code
    )
  ) {
    return "annulee";
  }

  return "transmise";
}

async function authentifierChef(
  request: NextRequest,
  supabaseAdmin: SupabaseClient
) {
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
    return {
      erreur: NextResponse.json(
        {
          succes: false,
          erreur:
            "Token d’authentification manquant.",
        },
        { status: 401 }
      ),
      profil: null,
      entrepriseId: null,
    };
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
    return {
      erreur: NextResponse.json(
        {
          succes: false,
          erreur:
            "Utilisateur non connecté.",
        },
        { status: 401 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  const {
    data: profil,
    error: profilError,
  } = await supabaseAdmin
    .from("profils_utilisateurs")
    .select(
      "id, role, statut, entreprise_id"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profilError ||
    !profil?.entreprise_id
  ) {
    return {
      erreur: NextResponse.json(
        {
          succes: false,
          erreur:
            "Profil utilisateur introuvable.",
        },
        { status: 403 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  const profilUtilisateur =
    profil as Profil;

  if (
    !ROLES_AUTORISES.has(
      normaliser(
        profilUtilisateur.role
      )
    ) ||
    (
      profilUtilisateur.statut &&
      normaliser(
        profilUtilisateur.statut
      ) !== "actif"
    )
  ) {
    return {
      erreur: NextResponse.json(
        {
          succes: false,
          erreur:
            "Accès refusé.",
        },
        { status: 403 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  return {
    erreur: null,
    profil: profilUtilisateur,
    entrepriseId:
      profilUtilisateur.entreprise_id,
  };
}

async function journaliserChangement({
  supabaseAdmin,
  demande,
  ancienStatut,
  ancienCode,
  nouveauStatut,
  nouveauCode,
  nouveauLibelle,
}: {
  supabaseAdmin: SupabaseClient;
  demande: DemandePaiement;
  ancienStatut: StatutLocal;
  ancienCode: string | null;
  nouveauStatut: StatutLocal;
  nouveauCode: string | null;
  nouveauLibelle: string | null;
}) {
  const { error } =
    await supabaseAdmin.rpc(
      "arboboard_ecrire_journal",
      {
        p_entreprise_id:
          demande.entreprise_id,
        p_action:
          "statut_demande_paiement_urssaf_synchronise_manuellement",
        p_categorie: "facturation",
        p_ressource_type:
          "demande_paiement_urssaf",
        p_ressource_id: demande.id,
        p_resultat: "succes",
        p_description:
          nouveauStatut === "payee"
            ? "Le statut URSSAF indique que la demande de paiement est payée."
            : "Le statut d’une demande de paiement URSSAF a été synchronisé manuellement.",
        p_details: {
          facture_id:
            demande.facture_id,
          ancien_statut_local:
            ancienStatut,
          nouveau_statut_local:
            nouveauStatut,
          ancien_code_urssaf:
            ancienCode,
          nouveau_code_urssaf:
            nouveauCode,
          nouveau_libelle_urssaf:
            nouveauLibelle,
        },
      }
    );

  if (error) {
    console.warn(
      "Journalisation synchronisation URSSAF impossible :",
      error
    );
  }
}

export async function POST(
  request: NextRequest
) {
  const supabaseAdmin =
    creerSupabaseAdmin();

  let verrouAcquis = false;
  let cleVerrou = "";

  try {
    const authentification =
      await authentifierChef(
        request,
        supabaseAdmin
      );

    if (
      authentification.erreur ||
      !authentification.entrepriseId
    ) {
      return (
        authentification.erreur ??
        NextResponse.json(
          {
            succes: false,
            erreur:
              "Impossible de vérifier l’accès.",
          },
          { status: 500 }
        )
      );
    }

    const entrepriseId =
      authentification.entrepriseId;

    cleVerrou =
      `synchronisation_urssaf_${entrepriseId}`;

    const {
      data: verrou,
      error: verrouError,
    } = await supabaseAdmin.rpc(
      "arboboard_acquerir_verrou_tache",
      {
        p_cle: cleVerrou,
        p_duree_secondes: 300,
      }
    );

    if (verrouError) {
      throw verrouError;
    }

    verrouAcquis = verrou === true;

    if (!verrouAcquis) {
      return NextResponse.json(
        {
          succes: false,
          erreur:
            "Une synchronisation URSSAF est déjà en cours pour cette entreprise.",
        },
        { status: 409 }
      );
    }

    const {
      data: integration,
      error: integrationError,
    } = await supabaseAdmin
      .from("integrations_urssaf_tp")
      .select(
        "entreprise_id, client_id_chiffre, client_secret_chiffre, actif, statut"
      )
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .maybeSingle();

    if (integrationError) {
      throw integrationError;
    }

    const configuration =
      integration as
        | IntegrationUrssaf
        | null;

    if (
      !configuration ||
      !configuration.actif ||
      configuration.statut !==
        "connectee"
    ) {
      return NextResponse.json(
        {
          succes: false,
          erreur:
            "La connexion API URSSAF doit être configurée et validée avant la synchronisation.",
        },
        { status: 400 }
      );
    }

    const {
      data: demandesData,
      error: demandesError,
    } = await supabaseAdmin
      .from(
        "demandes_paiement_urssaf"
      )
      .select(
        "id, entreprise_id, facture_id, numero_facture, urssaf_id_demande_paiement, statut_local, statut_urssaf_code, statut_urssaf_libelle"
      )
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .not(
        "urssaf_id_demande_paiement",
        "is",
        null
      )
      .in("statut_local", [
        "transmise",
        "erreur",
        "impayee",
      ])
      .order(
        "derniere_verification_at",
        {
          ascending: true,
          nullsFirst: true,
        }
      )
      .limit(100);

    if (demandesError) {
      throw demandesError;
    }

    const demandes =
      (demandesData ||
        []) as DemandePaiement[];

    if (demandes.length === 0) {
      return NextResponse.json({
        succes: true,
        message:
          "Aucune demande URSSAF ne nécessite une synchronisation.",
        demandes: 0,
        actualisees: 0,
        changees: 0,
        erreurs: 0,
      });
    }

    const jeton =
      await obtenirJetonUrssaf({
        clientId:
          dechiffrerIdentifiant(
            configuration
              .client_id_chiffre
          ),
        clientSecret:
          dechiffrerIdentifiant(
            configuration
              .client_secret_chiffre
          ),
      });

    const erreurs:
      ErreurSynchronisation[] = [];

    let nombreActualisees = 0;
    let nombreChangees = 0;

    for (const demande of demandes) {
      try {
        const resultat =
          await rechercherDemandePaiementUrssaf({
            jeton,
            idDemandePaiement:
              demande
                .urssaf_id_demande_paiement,
            numeroFacture:
              demande.numero_facture,
          });

        const code = texte(
          resultat.demande.statut
            ?.code,
          30
        );

        const libelle = texte(
          resultat.demande.statut
            ?.libelle,
          300
        );

        const nouveauStatut =
          statutLocalDepuisCode(code);

        const ancienCode =
          demande
            .statut_urssaf_code ||
          null;

        const changement =
          nouveauStatut !==
            demande.statut_local ||
          code !==
            (ancienCode || "") ||
          libelle !==
            (
              demande
                .statut_urssaf_libelle ||
              ""
            );

        const maintenant =
          new Date().toISOString();

        const {
          error: miseAJourError,
        } = await supabaseAdmin
          .from(
            "demandes_paiement_urssaf"
          )
          .update({
            statut_local:
              nouveauStatut,
            statut_urssaf_code:
              code || null,
            statut_urssaf_libelle:
              libelle || null,
            info_rejet:
              resultat.demande
                .infoRejet || null,
            info_virement:
              resultat.demande
                .infoVirement || null,
            derniere_verification_at:
              maintenant,
            dernier_code_http:
              resultat.codeHttp,
            dernier_message:
              libelle ||
              "Statut URSSAF synchronisé.",
            updated_at: maintenant,
          })
          .eq("id", demande.id)
          .eq(
            "entreprise_id",
            entrepriseId
          );

        if (miseAJourError) {
          throw miseAJourError;
        }

        nombreActualisees += 1;

        if (changement) {
          nombreChangees += 1;

          await journaliserChangement({
            supabaseAdmin,
            demande,
            ancienStatut:
              demande.statut_local,
            ancienCode,
            nouveauStatut,
            nouveauCode:
              code || null,
            nouveauLibelle:
              libelle || null,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erreur de synchronisation inconnue.";

        const codeHttp =
          error instanceof
          ErreurApiUrssaf
            ? error.codeHttp
            : undefined;

        erreurs.push({
          demande_id: demande.id,
          facture_id:
            demande.facture_id,
          message:
            message.slice(0, 1000),
          code_http: codeHttp,
        });

        await supabaseAdmin
          .from(
            "demandes_paiement_urssaf"
          )
          .update({
            derniere_verification_at:
              new Date().toISOString(),
            dernier_code_http:
              codeHttp &&
              codeHttp >= 100 &&
              codeHttp <= 599
                ? codeHttp
                : 500,
            dernier_message:
              message.slice(0, 1500),
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", demande.id)
          .eq(
            "entreprise_id",
            entrepriseId
          );
      }
    }

    const message =
      erreurs.length > 0
        ? `Synchronisation terminée : ${nombreActualisees} demande(s) actualisée(s), ${erreurs.length} erreur(s).`
        : `Synchronisation terminée : ${nombreActualisees} demande(s) actualisée(s), ${nombreChangees} changement(s) détecté(s).`;

    return NextResponse.json({
      succes: true,
      avec_erreurs:
        erreurs.length > 0,
      message,
      demandes:
        demandes.length,
      actualisees:
        nombreActualisees,
      changees:
        nombreChangees,
      erreurs:
        erreurs.length,
      details_erreurs:
        erreurs.slice(0, 20),
    });
  } catch (error) {
    console.error(
      "Erreur synchronisation manuelle URSSAF :",
      error
    );

    return NextResponse.json(
      {
        succes: false,
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de synchroniser les demandes URSSAF.",
      },
      { status: 500 }
    );
  } finally {
    if (
      verrouAcquis &&
      cleVerrou
    ) {
      const { error } =
        await supabaseAdmin.rpc(
          "arboboard_liberer_verrou_tache",
          {
            p_cle: cleVerrou,
          }
        );

      if (error) {
        console.warn(
          "Libération du verrou URSSAF impossible :",
          error
        );
      }
    }
  }
}