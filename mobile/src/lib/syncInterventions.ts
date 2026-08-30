import {
  Directory,
  Filesystem,
} from "@capacitor/filesystem";

import {
  supabase,
} from "./supabase";

import {
  ACTION_PHOTO_AJOUTER,
  type PayloadPhotoHorsLigne,
} from "./offlinePhotos";

import {
  ACTION_PV_ENREGISTRER,
  type PayloadPvHorsLigne,
} from "./offlinePv";

import {
  ecouterEtatHorsLigne,
  estEnLigne,
  listerActionsEnAttente,
  marquerEchecActionHorsLigne,
  supprimerActionHorsLigne,
  type ActionHorsLigne,
} from "./offline";

export const ACTION_PREPARATION_ELEMENT =
  "intervention.element.preparation";

export const ACTION_VALIDER_MATERIEL =
  "intervention.materiel.valider";

export const ACTION_VALIDER_ARRIVEE =
  "intervention.arrivee.valider";

export const ACTION_VALIDER_FIN =
  "intervention.fin.valider";

export type PayloadPreparationElement = {
  entrepriseId: string;
  ficheId: string;
  elementId: string;
  cochePrepare: boolean;
};

export type PayloadValiderMateriel = {
  entrepriseId: string;
  ficheId: string;
  commentairePreparation:
    string | null;
  materielValideAt: string;
};

export type PayloadValiderArrivee = {
  entrepriseId: string;
  ficheId: string;
  salarieId: string;
  affectationId:
    string | null;
  heureArriveeReelle: string;
  commentaireArrivee:
    string | null;
  arriveeValideeAt: string;
};

export type PayloadValiderFin = {
  entrepriseId: string;
  ficheId: string;
  salarieId: string;
  affectationId:
    string | null;
  heureDepartReelle: string;
  commentaireFin:
    string | null;
  problemeSignale: boolean;
  descriptionProbleme:
    string | null;
  finValideeAt: string;
};

let synchronisationEnCours =
  false;

let synchronisationInitialisee =
  false;

let arreterEcoute:
  (() => void) | null =
  null;

function exigerTexte(
  valeur: unknown,
  nom: string
) {
  if (
    typeof valeur !==
      "string" ||
    !valeur.trim()
  ) {
    throw new Error(
      `Action hors ligne invalide : ${nom}.`
    );
  }

  return valeur;
}

function payloadObjet(
  action:
    ActionHorsLigne
) {
  if (
    !action.payload ||
    typeof action.payload !==
      "object"
  ) {
    throw new Error(
      "Action hors ligne sans payload valide."
    );
  }

  return action.payload as Record<
    string,
    unknown
  >;
}

async function synchroniserPreparationElement(
  action:
    ActionHorsLigne
) {
  const brut =
    payloadObjet(
      action
    );

  const entrepriseId =
    exigerTexte(
      brut.entrepriseId,
      "entrepriseId"
    );

  const ficheId =
    exigerTexte(
      brut.ficheId,
      "ficheId"
    );

  const elementId =
    exigerTexte(
      brut.elementId,
      "elementId"
    );

  if (
    typeof brut.cochePrepare !==
    "boolean"
  ) {
    throw new Error(
      "Action hors ligne invalide : cochePrepare."
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "fiches_intervention_elements"
      )
      .update({
        coche_prepare:
          brut.cochePrepare,
      })
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .eq(
        "fiche_id",
        ficheId
      )
      .eq(
        "id",
        elementId
      );

  if (
    error
  ) {
    throw error;
  }
}

async function synchroniserMateriel(
  action:
    ActionHorsLigne
) {
  const brut =
    payloadObjet(
      action
    );

  const entrepriseId =
    exigerTexte(
      brut.entrepriseId,
      "entrepriseId"
    );

  const ficheId =
    exigerTexte(
      brut.ficheId,
      "ficheId"
    );

  const materielValideAt =
    exigerTexte(
      brut.materielValideAt,
      "materielValideAt"
    );

  const commentairePreparation =
    typeof brut.commentairePreparation ===
      "string"
      ? brut.commentairePreparation
      : null;

  const {
    error,
  } =
    await supabase
      .from(
        "fiches_intervention"
      )
      .update({
        etape_materiel_statut:
          "valide",
        materiel_valide_at:
          materielValideAt,
        commentaire_preparation:
          commentairePreparation,
        updated_at:
          materielValideAt,
      })
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .eq(
        "id",
        ficheId
      );

  if (
    error
  ) {
    throw error;
  }
}

async function synchroniserArrivee(
  action:
    ActionHorsLigne
) {
  const brut =
    payloadObjet(
      action
    );

  const entrepriseId =
    exigerTexte(
      brut.entrepriseId,
      "entrepriseId"
    );

  const ficheId =
    exigerTexte(
      brut.ficheId,
      "ficheId"
    );

  const salarieId =
    exigerTexte(
      brut.salarieId,
      "salarieId"
    );

  const arriveeValideeAt =
    exigerTexte(
      brut.arriveeValideeAt,
      "arriveeValideeAt"
    );

  const heureArriveeReelle =
    exigerTexte(
      brut.heureArriveeReelle,
      "heureArriveeReelle"
    );

  const commentaireArrivee =
    typeof brut.commentaireArrivee ===
      "string"
      ? brut.commentaireArrivee
      : null;

  const affectationId =
    typeof brut.affectationId ===
      "string" &&
    brut.affectationId !==
      "legacy"
      ? brut.affectationId
      : null;

  const {
    error,
  } =
    await supabase
      .from(
        "fiches_intervention"
      )
      .update({
        statut:
          "en_cours",
        etape_arrivee_statut:
          "valide",
        arrivee_validee_at:
          arriveeValideeAt,
        heure_debut_reelle:
          heureArriveeReelle,
        commentaire_arrivee:
          commentaireArrivee,
        updated_at:
          arriveeValideeAt,
      })
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .eq(
        "id",
        ficheId
      );

  if (
    error
  ) {
    throw error;
  }

  if (
    affectationId
  ) {
    const {
      error:
        affectationError,
    } =
      await supabase
        .from(
          "fiches_intervention_salaries"
        )
        .update({
          heure_arrivee_reelle:
            heureArriveeReelle,
        })
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .eq(
          "fiche_id",
          ficheId
        )
        .eq(
          "salarie_id",
          salarieId
        )
        .eq(
          "id",
          affectationId
        );

    if (
      affectationError
    ) {
      throw affectationError;
    }
  }
}

async function synchroniserFin(
  action:
    ActionHorsLigne
) {
  const brut =
    payloadObjet(
      action
    );

  const entrepriseId =
    exigerTexte(
      brut.entrepriseId,
      "entrepriseId"
    );

  const ficheId =
    exigerTexte(
      brut.ficheId,
      "ficheId"
    );

  const salarieId =
    exigerTexte(
      brut.salarieId,
      "salarieId"
    );

  const finValideeAt =
    exigerTexte(
      brut.finValideeAt,
      "finValideeAt"
    );

  const heureDepartReelle =
    exigerTexte(
      brut.heureDepartReelle,
      "heureDepartReelle"
    );

  const problemeSignale =
    brut.problemeSignale ===
    true;

  const commentaireFin =
    typeof brut.commentaireFin ===
      "string"
      ? brut.commentaireFin
      : null;

  const descriptionProbleme =
    problemeSignale &&
    typeof brut.descriptionProbleme ===
      "string"
      ? brut.descriptionProbleme
      : null;

  const affectationId =
    typeof brut.affectationId ===
      "string" &&
    brut.affectationId !==
      "legacy"
      ? brut.affectationId
      : null;

  const {
    error,
  } =
    await supabase
      .from(
        "fiches_intervention"
      )
      .update({
        statut:
          problemeSignale
            ? "en_cours"
            : "terminee",
        etape_fin_statut:
          problemeSignale
            ? "probleme"
            : "valide",
        fin_validee_at:
          finValideeAt,
        heure_fin_reelle:
          heureDepartReelle,
        commentaire_fin:
          commentaireFin,
        probleme_signale:
          problemeSignale,
        description_probleme:
          descriptionProbleme,
        updated_at:
          finValideeAt,
      })
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .eq(
        "id",
        ficheId
      );

  if (
    error
  ) {
    throw error;
  }

  if (
    affectationId
  ) {
    const {
      error:
        affectationError,
    } =
      await supabase
        .from(
          "fiches_intervention_salaries"
        )
        .update({
          heure_depart_reelle:
            heureDepartReelle,
        })
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .eq(
          "fiche_id",
          ficheId
        )
        .eq(
          "salarie_id",
          salarieId
        )
        .eq(
          "id",
          affectationId
        );

    if (
      affectationError
    ) {
      throw affectationError;
    }
  }
}

function base64VersBlob(
  base64:
    string,
  mimeType:
    string
) {
  const binaire =
    atob(
      base64
    );

  const octets =
    new Uint8Array(
      binaire.length
    );

  for (
    let index = 0;
    index <
    binaire.length;
    index +=
      1
  ) {
    octets[
      index
    ] =
      binaire.charCodeAt(
        index
      );
  }

  return new Blob(
    [
      octets,
    ],
    {
      type:
        mimeType,
    }
  );
}

function payloadPhotoValide(
  valeur:
    unknown
): valeur is PayloadPhotoHorsLigne {
  if (
    !valeur ||
    typeof valeur !==
      "object"
  ) {
    return false;
  }

  const payload =
    valeur as Record<
      string,
      unknown
    >;

  return (
    typeof payload.localPhotoId ===
      "string" &&
    typeof payload.entrepriseId ===
      "string" &&
    typeof payload.ficheId ===
      "string" &&
    typeof payload.categorie ===
      "string" &&
    typeof payload.localPath ===
      "string" &&
    typeof payload.nomFichier ===
      "string" &&
    typeof payload.mimeType ===
      "string"
  );
}

async function synchroniserPhoto(
  action:
    ActionHorsLigne
) {
  if (
    !payloadPhotoValide(
      action.payload
    )
  ) {
    throw new Error(
      "Photo hors ligne invalide."
    );
  }

  const payload =
    action.payload;

  const chemin =
    `${payload.entrepriseId}/${payload.ficheId}/${payload.categorie}/${payload.localPhotoId}-${payload.nomFichier}`;

  const fichierLocal =
    await Filesystem.readFile({
      path:
        payload.localPath,
      directory:
        Directory.Data,
    });

  const blob =
    typeof fichierLocal.data ===
      "string"
      ? base64VersBlob(
          fichierLocal.data,
          payload.mimeType
        )
      : fichierLocal.data;

  const {
    error:
      uploadError,
  } =
    await supabase.storage
      .from(
        "interventions-photos"
      )
      .upload(
        chemin,
        blob,
        {
          cacheControl:
            "3600",

          contentType:
            payload.mimeType,

          /*
           * Le chemin distant est basé
           * sur localPhotoId : réessayer
           * la même action ne crée pas
           * un second fichier.
           */
          upsert:
            true,
        }
      );

  if (
    uploadError
  ) {
    throw uploadError;
  }

  const {
    data:
      ligneExistante,
    error:
      verificationError,
  } =
    await supabase
      .from(
        "fiches_intervention_photos"
      )
      .select(
        "id"
      )
      .eq(
        "entreprise_id",
        payload.entrepriseId
      )
      .eq(
        "fiche_id",
        payload.ficheId
      )
      .eq(
        "storage_path",
        chemin
      )
      .maybeSingle();

  if (
    verificationError
  ) {
    throw verificationError;
  }

  if (
    !ligneExistante
  ) {
    const {
      error:
        insertError,
    } =
      await supabase
        .from(
          "fiches_intervention_photos"
        )
        .insert({
          entreprise_id:
            payload.entrepriseId,

          fiche_id:
            payload.ficheId,

          categorie:
            payload.categorie,

          url:
            chemin,

          storage_path:
            chemin,

          commentaire:
            payload.commentaire,

          uploaded_by:
            payload.userId,
        });

    if (
      insertError
    ) {
      throw insertError;
    }
  }

  try {
    await Filesystem.deleteFile({
      path:
        payload.localPath,
      directory:
        Directory.Data,
    });
  } catch (
    error
  ) {
    console.warn(
      "Photo synchronisée mais fichier local non supprimé :",
      error
    );
  }
}

function payloadPvValide(
  valeur:
    unknown
): valeur is PayloadPvHorsLigne {
  if (
    !valeur ||
    typeof valeur !==
      "object"
  ) {
    return false;
  }

  const payload =
    valeur as Record<
      string,
      unknown
    >;

  return (
    typeof payload.localPvId ===
      "string" &&
    typeof payload.entrepriseId ===
      "string" &&
    typeof payload.ficheId ===
      "string" &&
    typeof payload.clientPresent ===
      "boolean" &&
    typeof payload.chantierTermine ===
      "boolean" &&
    typeof payload.signataireEntrepriseNom ===
      "string" &&
    typeof payload.signatureEntreprise ===
      "string" &&
    typeof payload.createdAt ===
      "string" &&
    typeof payload.updatedAt ===
      "string"
  );
}

async function synchroniserPv(
  action:
    ActionHorsLigne
) {
  if (
    !payloadPvValide(
      action.payload
    )
  ) {
    throw new Error(
      "PV hors ligne invalide."
    );
  }

  const payload =
    action.payload;

  const {
    data:
      pvExistant,
    error:
      rechercheError,
  } =
    await supabase
      .from(
        "pv_fin_chantier"
      )
      .select(
        "id"
      )
      .eq(
        "entreprise_id",
        payload.entrepriseId
      )
      .eq(
        "fiche_id",
        payload.ficheId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      )
      .maybeSingle();

  if (
    rechercheError
  ) {
    throw rechercheError;
  }

  const donneesPv = {
    entreprise_id:
      payload.entrepriseId,

    fiche_id:
      payload.ficheId,

    client_id:
      payload.clientId,

    client_nom:
      payload.clientNom,

    client_email:
      payload.clientEmail,

    client_present:
      payload.clientPresent,

    chantier_termine:
      payload.chantierTermine,

    reserves:
      payload.reserves,

    commentaire_client:
      payload.commentaireClient,

    commentaire_entreprise:
      payload.commentaireEntreprise,

    signataire_client_nom:
      payload.clientPresent
        ? payload.signataireClientNom
        : null,

    signature_client:
      payload.clientPresent
        ? payload.signatureClient
        : null,

    signataire_entreprise_nom:
      payload.signataireEntrepriseNom,

    signature_entreprise:
      payload.signatureEntreprise,

    updated_at:
      payload.updatedAt,
  };

  let pvId =
    typeof pvExistant?.id ===
      "string"
      ? pvExistant.id
      : "";

  if (
    pvId
  ) {
    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "pv_fin_chantier"
        )
        .update(
          donneesPv
        )
        .eq(
          "entreprise_id",
          payload.entrepriseId
        )
        .eq(
          "id",
          pvId
        );

    if (
      updateError
    ) {
      throw updateError;
    }
  } else {
    const {
      data:
        pvCree,
      error:
        insertError,
    } =
      await supabase
        .from(
          "pv_fin_chantier"
        )
        .insert({
          ...donneesPv,

          created_at:
            payload.createdAt,
        })
        .select(
          "id"
        )
        .single();

    if (
      insertError
    ) {
      throw insertError;
    }

    pvId =
      String(
        pvCree?.id ||
          ""
      );

    if (
      !pvId
    ) {
      throw new Error(
        "Le PV a été synchronisé mais son identifiant est introuvable."
      );
    }
  }

  const {
    error:
      ficheUpdateError,
  } =
    await supabase
      .from(
        "fiches_intervention"
      )
      .update({
        pv_fin_chantier_id:
          pvId,

        etape_fin_statut:
          payload.chantierTermine
            ? "valide"
            : "probleme",

        updated_at:
          payload.updatedAt,
      })
      .eq(
        "entreprise_id",
        payload.entrepriseId
      )
      .eq(
        "id",
        payload.ficheId
      );

  if (
    ficheUpdateError
  ) {
    throw ficheUpdateError;
  }
}

async function executerAction(
  action:
    ActionHorsLigne
) {
  switch (
    action.type
  ) {
    case ACTION_PREPARATION_ELEMENT:
      await synchroniserPreparationElement(
        action
      );
      return;

    case ACTION_VALIDER_MATERIEL:
      await synchroniserMateriel(
        action
      );
      return;

    case ACTION_VALIDER_ARRIVEE:
      await synchroniserArrivee(
        action
      );
      return;

    case ACTION_VALIDER_FIN:
      await synchroniserFin(
        action
      );
      return;

    case ACTION_PHOTO_AJOUTER:
      await synchroniserPhoto(
        action
      );
      return;

    case ACTION_PV_ENREGISTRER:
      await synchroniserPv(
        action
      );
      return;

    default:
      throw new Error(
        `Type d’action hors ligne inconnu : ${action.type}`
      );
  }
}

export async function synchroniserActionsTerrain() {
  if (
    synchronisationEnCours ||
    !estEnLigne()
  ) {
    return;
  }

  synchronisationEnCours =
    true;

  try {
    const actions =
      await listerActionsEnAttente();

    for (
      const action
      of actions
    ) {
      if (
        !estEnLigne()
      ) {
        break;
      }

      try {
        await executerAction(
          action
        );

        await supprimerActionHorsLigne(
          action.id
        );
      } catch (
        error
      ) {
        console.error(
          "Synchronisation action terrain Arboboard :",
          action.type,
          error
        );

        await marquerEchecActionHorsLigne(
          action.id,
          error
        );

        /*
         * Une photo est indépendante des
         * validations métier : si son upload
         * échoue, on continue les autres
         * actions afin de ne pas bloquer
         * une arrivée ou une fin de chantier.
         */
        if (
          action.type ===
            ACTION_PHOTO_AJOUTER ||
          action.type ===
            ACTION_PV_ENREGISTRER
        ) {
          continue;
        }

        /*
         * Pour Matériel / Arrivée / Fin,
         * on conserve strictement l'ordre.
         */
        break;
      }
    }
  } finally {
    synchronisationEnCours =
      false;
  }
}

export function initialiserSynchronisationTerrain() {
  if (
    synchronisationInitialisee
  ) {
    return;
  }

  synchronisationInitialisee =
    true;

  arreterEcoute =
    ecouterEtatHorsLigne(
      (
        etat
      ) => {
        if (
          etat.enLigne &&
          etat.aSynchroniser >
            0
        ) {
          void synchroniserActionsTerrain();
        }
      }
    );

  if (
    estEnLigne()
  ) {
    void synchroniserActionsTerrain();
  }
}

export function arreterSynchronisationTerrain() {
  if (
    arreterEcoute
  ) {
    arreterEcoute();
    arreterEcoute =
      null;
  }

  synchronisationInitialisee =
    false;
}
