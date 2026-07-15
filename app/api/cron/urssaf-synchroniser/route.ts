import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dechiffrerIdentifiant } from "@/lib/server/chiffrementIdentifiants";
import {
  ErreurApiUrssaf,
  obtenirJetonUrssaf,
} from "@/lib/server/urssafTp";
import { rechercherDemandePaiementUrssaf } from "@/lib/server/urssafDemandesPaiement";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const CLE_VERROU =
  "synchronisation_demandes_paiement_urssaf";

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

type IntegrationUrssaf = {
  entreprise_id: string;
  client_id_chiffre: string;
  client_secret_chiffre: string;
  actif: boolean;
  statut: string;
};

type ErreurSynchronisation = {
  demande_id?: string;
  entreprise_id?: string;
  facture_id?: string;
  message: string;
  code_http?: number;
};

function creerSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Configuration Supabase serveur incomplète."
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

function autoriserCron(request: NextRequest) {
  const secret =
    process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  return (
    request.headers.get("authorization") ===
    `Bearer ${secret}`
  );
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
    ["110", "111", "112"].includes(code)
  ) {
    return "annulee";
  }

  return "transmise";
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
  supabaseAdmin: ReturnType<
    typeof creerSupabaseAdmin
  >;
  demande: DemandePaiement;
  ancienStatut: StatutLocal;
  ancienCode: string | null;
  nouveauStatut: StatutLocal;
  nouveauCode: string | null;
  nouveauLibelle: string | null;
}) {
  const { error } = await supabaseAdmin.rpc(
    "arboboard_ecrire_journal",
    {
      p_entreprise_id:
        demande.entreprise_id,
      p_action:
        "statut_demande_paiement_urssaf_synchronise",
      p_categorie: "facturation",
      p_ressource_type:
        "demande_paiement_urssaf",
      p_ressource_id: demande.id,
      p_resultat: "succes",
      p_description:
        nouveauStatut === "payee"
          ? "L’Urssaf indique que le virement de la demande de paiement est effectué."
          : "Le statut d’une demande de paiement Urssaf a été actualisé automatiquement.",
      p_details: {
        facture_id: demande.facture_id,
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
      "Journalisation automatique URSSAF impossible :",
      error
    );
  }
}

export async function GET(
  request: NextRequest
) {
  if (!autoriserCron(request)) {
    return NextResponse.json(
      { erreur: "Accès refusé." },
      { status: 401 }
    );
  }

  const supabaseAdmin =
    creerSupabaseAdmin();

  let executionId: string | null = null;
  let verrouAcquis = false;

  const erreurs: ErreurSynchronisation[] = [];
  let nombreDemandes = 0;
  let nombreActualisees = 0;
  let nombreChangees = 0;

  try {
    const {
      data: verrou,
      error: verrouError,
    } = await supabaseAdmin.rpc(
      "arboboard_acquerir_verrou_tache",
      {
        p_cle: CLE_VERROU,
        p_duree_secondes: 300,
      }
    );

    if (verrouError) {
      throw verrouError;
    }

    verrouAcquis = verrou === true;

    if (!verrouAcquis) {
      return NextResponse.json({
        succes: true,
        ignoree: true,
        message:
          "Une synchronisation URSSAF est déjà en cours.",
      });
    }

    const {
      data: execution,
      error: executionError,
    } = await supabaseAdmin
      .from("synchronisations_urssaf")
      .insert({
        type_synchronisation:
          "demandes_paiement",
        statut: "en_cours",
      })
      .select("id")
      .single();

    if (executionError) {
      throw executionError;
    }

    executionId = execution.id;

    const {
      data: demandesData,
      error: demandesError,
    } = await supabaseAdmin
      .from("demandes_paiement_urssaf")
      .select(
        "id, entreprise_id, facture_id, numero_facture, urssaf_id_demande_paiement, statut_local, statut_urssaf_code, statut_urssaf_libelle"
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
      .order("derniere_verification_at", {
        ascending: true,
        nullsFirst: true,
      })
      .limit(100);

    if (demandesError) {
      throw demandesError;
    }

    const demandes =
      (demandesData ||
        []) as DemandePaiement[];

    nombreDemandes = demandes.length;

    if (demandes.length === 0) {
      await supabaseAdmin
        .from("synchronisations_urssaf")
        .update({
          statut: "terminee",
          fin_at: new Date().toISOString(),
          nombre_demandes: 0,
          nombre_actualisees: 0,
          nombre_changees: 0,
          nombre_erreurs: 0,
        })
        .eq("id", executionId);

      return NextResponse.json({
        succes: true,
        demandes: 0,
        actualisees: 0,
        changees: 0,
        erreurs: 0,
      });
    }

    const entrepriseIds = [
      ...new Set(
        demandes.map(
          (demande) =>
            demande.entreprise_id
        )
      ),
    ];

    const {
      data: integrationsData,
      error: integrationsError,
    } = await supabaseAdmin
      .from("integrations_urssaf_tp")
      .select(
        "entreprise_id, client_id_chiffre, client_secret_chiffre, actif, statut"
      )
      .in(
        "entreprise_id",
        entrepriseIds
      );

    if (integrationsError) {
      throw integrationsError;
    }

    const integrations = new Map(
      (
        (integrationsData ||
          []) as IntegrationUrssaf[]
      ).map((integration) => [
        integration.entreprise_id,
        integration,
      ])
    );

    const jetons = new Map<
      string,
      string
    >();

    for (const demande of demandes) {
      try {
        const integration =
          integrations.get(
            demande.entreprise_id
          );

        if (
          !integration?.actif ||
          integration.statut !==
            "connectee"
        ) {
          throw new Error(
            "La connexion API Urssaf de l’entreprise n’est pas active."
          );
        }

        let jeton = jetons.get(
          demande.entreprise_id
        );

        if (!jeton) {
          jeton =
            await obtenirJetonUrssaf({
              clientId:
                dechiffrerIdentifiant(
                  integration
                    .client_id_chiffre
                ),
              clientSecret:
                dechiffrerIdentifiant(
                  integration
                    .client_secret_chiffre
                ),
            });

          jetons.set(
            demande.entreprise_id,
            jeton
          );
        }

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
          resultat.demande.statut?.code,
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
          demande.statut_urssaf_code ||
          null;

        const statutChange =
          nouveauStatut !==
            demande.statut_local ||
          code !== (ancienCode || "") ||
          libelle !==
            (
              demande
                .statut_urssaf_libelle ||
              ""
            );

        const maintenant =
          new Date().toISOString();

        const { error: majError } =
          await supabaseAdmin
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
                "Statut URSSAF actualisé automatiquement.",
              updated_at: maintenant,
            })
            .eq("id", demande.id)
            .eq(
              "entreprise_id",
              demande.entreprise_id
            );

        if (majError) {
          throw majError;
        }

        nombreActualisees += 1;

        if (statutChange) {
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
        const codeHttp =
          error instanceof
          ErreurApiUrssaf
            ? error.codeHttp
            : undefined;

        const message =
          error instanceof Error
            ? error.message
            : "Erreur de synchronisation inconnue.";

        erreurs.push({
          demande_id: demande.id,
          entreprise_id:
            demande.entreprise_id,
          facture_id:
            demande.facture_id,
          message: message.slice(
            0,
            1000
          ),
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
            demande.entreprise_id
          );
      }
    }

    const statutExecution =
      erreurs.length > 0
        ? "terminee_avec_erreurs"
        : "terminee";

    const { error: finError } =
      await supabaseAdmin
        .from(
          "synchronisations_urssaf"
        )
        .update({
          statut: statutExecution,
          fin_at:
            new Date().toISOString(),
          nombre_demandes:
            nombreDemandes,
          nombre_actualisees:
            nombreActualisees,
          nombre_changees:
            nombreChangees,
          nombre_erreurs:
            erreurs.length,
          details_erreurs:
            erreurs.slice(0, 100),
        })
        .eq("id", executionId);

    if (finError) {
      throw finError;
    }

    return NextResponse.json({
      succes: true,
      demandes: nombreDemandes,
      actualisees:
        nombreActualisees,
      changees: nombreChangees,
      erreurs: erreurs.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Synchronisation URSSAF impossible.";

    console.error(
      "Erreur synchronisation automatique URSSAF :",
      error
    );

    if (executionId) {
      await supabaseAdmin
        .from("synchronisations_urssaf")
        .update({
          statut: "echec",
          fin_at:
            new Date().toISOString(),
          nombre_demandes:
            nombreDemandes,
          nombre_actualisees:
            nombreActualisees,
          nombre_changees:
            nombreChangees,
          nombre_erreurs:
            Math.max(1, erreurs.length),
          details_erreurs: [
            ...erreurs,
            {
              message:
                message.slice(0, 1000),
            },
          ].slice(0, 100),
        })
        .eq("id", executionId);
    }

    return NextResponse.json(
      { erreur: message },
      { status: 500 }
    );
  } finally {
    if (verrouAcquis) {
      const { error } =
        await supabaseAdmin.rpc(
          "arboboard_liberer_verrou_tache",
          {
            p_cle: CLE_VERROU,
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