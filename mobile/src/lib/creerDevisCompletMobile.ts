import {
  supabase,
} from "./supabase";

export type DevisMobilePayload = {
  entreprise_id: string;

  client_id:
    string | null;

  client_nom:
    string | null;

  objet:
    string | null;

  description:
    string | null;

  adresse_chantier:
    string | null;

  code_postal_chantier:
    string | null;

  ville_chantier:
    string | null;

  notes_chantier:
    string | null;

  date_devis:
    string;

  date_validite:
    string;

  statut:
    "brouillon";

  total_ht:
    number;

  total_tva:
    number;

  total_ttc:
    number;

  remise_globale_pourcent:
    number;

  remise_globale_montant:
    number;

  conditions:
    string | null;
};

export type LigneDevisMobilePayload = {
  entreprise_id:
    string;

  type_ligne:
    "prestation" |
    "section";

  prestation_tarif_id:
    string | null;

  prestation_code:
    string | null;

  prestation_categorie_id:
    string | null;

  prestation_categorie_nom:
    string | null;

  designation:
    string;

  description:
    string | null;

  quantite:
    number;

  unite:
    string;

  prix_unitaire_ht:
    number;

  remise_pourcent:
    number;

  total_brut_ht:
    number;

  tva:
    number;

  total_ht:
    number;

  total_tva:
    number;

  total_ttc:
    number;

  ordre:
    number;
};

export type DevisMobileCree = {
  id:
    string;

  numero:
    string;
};

function messageErreur(
  erreur:
    unknown,
  fallback:
    string
) {
  if (
    erreur instanceof
      Error &&
    erreur.message
  ) {
    return erreur.message;
  }

  if (
    erreur &&
    typeof erreur ===
      "object" &&
    "message" in erreur &&
    typeof (
      erreur as {
        message?:
          unknown;
      }
    ).message ===
      "string"
  ) {
    return (
      erreur as {
        message:
          string;
      }
    ).message;
  }

  return fallback;
}

async function supprimerLignesDevis(
  entrepriseId:
    string,
  devisId:
    string
) {
  try {
    const {
      error,
    } =
      await supabase
        .from(
          "devis_lignes"
        )
        .delete()
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .eq(
          "devis_id",
          devisId
        );

    if (
      error
    ) {
      console.warn(
        "Impossible de nettoyer les lignes du devis :",
        error
      );
    }
  } catch (
    error
  ) {
    console.warn(
      "Erreur pendant le nettoyage des lignes du devis :",
      error
    );
  }
}

async function supprimerDevisIncomplet(
  entrepriseId:
    string,
  devisId:
    string
) {
  try {
    const {
      error,
    } =
      await supabase
        .from(
          "devis"
        )
        .delete()
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .eq(
          "id",
          devisId
        )
        .eq(
          "statut",
          "brouillon"
        );

    if (
      error
    ) {
      console.warn(
        "Impossible de nettoyer le devis incomplet :",
        error
      );
    }
  } catch (
    error
  ) {
    console.warn(
      "Erreur pendant le nettoyage du devis incomplet :",
      error
    );
  }
}

export async function creerDevisCompletMobile(
  devis:
    DevisMobilePayload,
  lignes:
    LigneDevisMobilePayload[]
): Promise<DevisMobileCree> {
  if (
    !devis.entreprise_id
  ) {
    throw new Error(
      "Entreprise Arboboard introuvable."
    );
  }

  if (
    !devis.client_id
  ) {
    throw new Error(
      "Le client du devis est obligatoire."
    );
  }

  if (
    lignes.length ===
    0
  ) {
    throw new Error(
      "Le devis doit contenir au moins une prestation."
    );
  }

  let devisId =
    "";

  let numero =
    "";

  try {
    /*
     * IMPORTANT :
     *
     * On envoie numero = null.
     *
     * Le trigger Supabase Arboboard
     * génère lui-même le prochain numéro
     * sécurisé du type :
     *
     * DEV-2026-0001
     *
     * On ne génère donc JAMAIS le numéro
     * localement dans l'application.
     */
    const {
      data:
        devisCree,
      error:
        devisError,
    } =
      await supabase
        .from(
          "devis"
        )
        .insert({
          ...devis,

          numero:
            null,
        })
        .select(
          "id, numero"
        )
        .single();

    if (
      devisError
    ) {
      throw devisError;
    }

    if (
      !devisCree?.id
    ) {
      throw new Error(
        "Le devis a été créé sans identifiant."
      );
    }

    devisId =
      String(
        devisCree.id
      );

    numero =
      String(
        devisCree.numero ||
          ""
      ).trim();

    if (
      !numero
    ) {
      throw new Error(
        "Supabase n’a pas généré le numéro du devis."
      );
    }

    /*
     * Le numéro est maintenant déjà
     * officiel et verrouillé.
     *
     * On ajoute ensuite toutes les lignes
     * du devis.
     */
    const lignesAvecDevis =
      lignes.map(
        (
          ligne
        ) => ({
          ...ligne,

          devis_id:
            devisId,
        })
      );

    const {
      error:
        lignesError,
    } =
      await supabase
        .from(
          "devis_lignes"
        )
        .insert(
          lignesAvecDevis
        );

    if (
      lignesError
    ) {
      throw lignesError;
    }

    /*
     * Vérification finale :
     * on s'assure que toutes les lignes
     * ont bien été écrites.
     */
    const {
      count,
      error:
        countError,
    } =
      await supabase
        .from(
          "devis_lignes"
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "entreprise_id",
          devis.entreprise_id
        )
        .eq(
          "devis_id",
          devisId
        );

    if (
      countError
    ) {
      throw countError;
    }

    if (
      Number(
        count ||
          0
      ) !==
      lignesAvecDevis.length
    ) {
      throw new Error(
        "Toutes les prestations du devis n’ont pas été enregistrées."
      );
    }

    return {
      id:
        devisId,

      numero,
    };
  } catch (
    error
  ) {
    /*
     * Si une erreur arrive après
     * l'insertion du devis, on évite
     * de laisser un devis vide ou partiel.
     */
    if (
      devisId
    ) {
      await supprimerLignesDevis(
        devis.entreprise_id,
        devisId
      );

      await supprimerDevisIncomplet(
        devis.entreprise_id,
        devisId
      );
    }

    throw new Error(
      messageErreur(
        error,
        "Impossible de créer complètement le devis."
      )
    );
  }
}