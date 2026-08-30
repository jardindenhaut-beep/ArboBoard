import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import PhotosChantierMobile, {
  type PhotoChantierMobile,
} from "./PhotosChantierMobile";

import PvFinChantierMobile, {
  type PvFinChantierMobileData,
} from "./PvFinChantierMobile";

import "./InterventionSalarieMobile.css";

type Props = {
  entrepriseId: string;

  ficheId: string;

  onFermer: () => void;
};

type EtapeMobile =
  | 1
  | 2
  | 3
  | 4
  | 5;

type FicheIntervention = {
  id: string;

  entreprise_id: string;

  numero:
    string | null;

  devis_id:
    string | null;

  facture_id:
    string | null;

  client_id:
    string | null;

  client_nom:
    string | null;

  salarie_id:
    string | null;

  salarie_nom:
    string | null;

  titre:
    string | null;

  type_intervention:
    string | null;

  statut:
    string | null;

  date_intervention:
    string | null;

  heure_debut:
    string | null;

  heure_fin:
    string | null;

  date_prevue:
    string | null;

  heure_debut_prevue:
    string | null;

  heure_fin_prevue:
    string | null;

  heure_debut_reelle:
    string | null;

  heure_fin_reelle:
    string | null;

  adresse:
    string | null;

  code_postal:
    string | null;

  ville:
    string | null;

  adresse_chantier:
    string | null;

  code_postal_chantier:
    string | null;

  ville_chantier:
    string | null;

  notes_chantier:
    string | null;

  travaux_prevus:
    string | null;

  materiel_prevu:
    string | null;

  consignes_securite:
    string | null;

  notes_internes:
    string | null;

  etape_materiel_statut:
    string | null;

  etape_arrivee_statut:
    string | null;

  etape_fin_statut:
    string | null;

  materiel_valide_at:
    string | null;

  arrivee_validee_at:
    string | null;

  fin_validee_at:
    string | null;

  commentaire_preparation:
    string | null;

  commentaire_arrivee:
    string | null;

  commentaire_fin:
    string | null;

  probleme_signale:
    boolean | null;

  description_probleme:
    string | null;

  pv_fin_chantier_id:
    string | null;

  created_at:
    string | null;

  updated_at:
    string | null;
};

type FicheElement = {
  id: string;

  entreprise_id: string;

  fiche_id: string;

  article_id:
    string | null;

  nom: string;

  categorie:
    string;

  icone:
    string | null;

  couleur:
    string | null;

  quantite_prevue:
    number | null;

  quantite_reelle:
    number | null;

  unite:
    string | null;

  obligatoire:
    boolean | null;

  coche_prepare:
    boolean | null;

  commentaire_chef:
    string | null;

  commentaire_salarie:
    string | null;

  ordre:
    number | null;
};

type FicheSalarie = {
  id: string;

  entreprise_id: string;

  fiche_id: string;

  salarie_id:
    string | null;

  salarie_nom:
    string | null;

  role_chantier:
    string | null;

  heure_arrivee_prevue:
    string | null;

  heure_depart_prevue:
    string | null;

  heure_arrivee_reelle:
    string | null;

  heure_depart_reelle:
    string | null;
};

type Salarie = {
  id: string;

  entreprise_id: string;

  nom:
    string | null;

  prenom:
    string | null;

  email:
    string | null;

  telephone:
    string | null;

  user_id?:
    string | null;

  profil_id?:
    string | null;

  statut?:
    string | null;
};

type FicheAcces = {
  id: string;

  entreprise_id:
    string | null;

  salarie_id:
    string | null;

  statut:
    string | null;
};

function messageErreur(
  error: unknown,
  fallback: string
) {
  if (
    error instanceof
      Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

function nettoyerTexte(
  valeur: string
) {
  const texte =
    valeur.trim();

  return texte.length >
    0
    ? texte
    : null;
}

function heureMaintenant() {
  const maintenant =
    new Date();

  const heures =
    String(
      maintenant.getHours()
    ).padStart(
      2,
      "0"
    );

  const minutes =
    String(
      maintenant.getMinutes()
    ).padStart(
      2,
      "0"
    );

  return `${heures}:${minutes}`;
}

function formatDate(
  date:
    | string
    | null
    | undefined
) {
  if (
    !date
  ) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",
      }
    ).format(
      new Date(
        `${date}T12:00:00`
      )
    );
  } catch {
    return date;
  }
}

function formatDateHeure(
  date:
    | string
    | null
    | undefined
) {
  if (
    !date
  ) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      new Date(
        date
      )
    );
  } catch {
    return date;
  }
}

function formatHeure(
  heure:
    | string
    | null
    | undefined
) {
  if (
    !heure
  ) {
    return "—";
  }

  return heure.slice(
    0,
    5
  );
}

function titreFiche(
  fiche:
    FicheIntervention | null
) {
  if (
    !fiche
  ) {
    return "Intervention";
  }

  return (
    fiche.titre ||
    fiche.type_intervention ||
    "Intervention"
  );
}

function adresseFiche(
  fiche:
    FicheIntervention | null
) {
  if (
    !fiche
  ) {
    return "Adresse non renseignée";
  }

  const adresse =
    fiche.adresse_chantier ||
    fiche.adresse ||
    "";

  const cp =
    fiche.code_postal_chantier ||
    fiche.code_postal ||
    "";

  const ville =
    fiche.ville_chantier ||
    fiche.ville ||
    "";

  const villeComplete =
    [
      cp,
      ville,
    ]
      .filter(Boolean)
      .join(
        " "
      );

  return (
    [
      adresse,
      villeComplete,
    ]
      .filter(Boolean)
      .join(
        ", "
      ) ||
    "Adresse non renseignée"
  );
}

function nomSalarie(
  salarie:
    Salarie | null
) {
  if (
    !salarie
  ) {
    return "";
  }

  const nom =
    `${salarie.prenom || ""} ${
      salarie.nom || ""
    }`.trim();

  return (
    nom ||
    salarie.email ||
    ""
  );
}

function libelleStatut(
  statut:
    | string
    | null
    | undefined
) {
  if (
    statut ===
    "planifiee"
  ) {
    return "Planifiée";
  }

  if (
    statut ===
    "en_cours"
  ) {
    return "En cours";
  }

  if (
    statut ===
    "terminee"
  ) {
    return "Terminée";
  }

  if (
    statut ===
    "annulee"
  ) {
    return "Annulée";
  }

  if (
    statut ===
    "archivee"
  ) {
    return "Archivée";
  }

  return "Brouillon";
}

function classeStatut(
  statut:
    | string
    | null
    | undefined
) {
  return `intervention-salarie-status intervention-salarie-status-${
    statut ||
    "brouillon"
  }`;
}

function etapeValidee(
  statut:
    | string
    | null
    | undefined
) {
  return statut ===
    "valide";
}

function iconeCategorie(
  categorie:
    string
) {
  if (
    categorie ===
    "travaux"
  ) {
    return "✅";
  }

  if (
    categorie ===
    "materiel"
  ) {
    return "🧰";
  }

  if (
    categorie ===
    "materiaux"
  ) {
    return "🪨";
  }

  if (
    categorie ===
    "consigne_securite"
  ) {
    return "🦺";
  }

  if (
    categorie ===
    "consigne_chantier"
  ) {
    return "🏠";
  }

  return "•";
}

function titreCategorie(
  categorie:
    string
) {
  if (
    categorie ===
    "travaux"
  ) {
    return "Travaux à réaliser";
  }

  if (
    categorie ===
    "materiel"
  ) {
    return "Matériel";
  }

  if (
    categorie ===
    "materiaux"
  ) {
    return "Matériaux";
  }

  if (
    categorie ===
    "consigne_securite"
  ) {
    return "Sécurité";
  }

  if (
    categorie ===
    "consigne_chantier"
  ) {
    return "Consignes chantier";
  }

  return "Autres";
}

export default function InterventionSalarieMobile({
  entrepriseId,
  ficheId,
  onFermer,
}: Props) {
  const [
    fiche,
    setFiche,
  ] =
    useState<FicheIntervention | null>(
      null
    );

  const [
    elements,
    setElements,
  ] =
    useState<
      FicheElement[]
    >([]);

  const [
    equipe,
    setEquipe,
  ] =
    useState<
      FicheSalarie[]
    >([]);

  const [
    affectation,
    setAffectation,
  ] =
    useState<FicheSalarie | null>(
      null
    );

  const [
    salarie,
    setSalarie,
  ] =
    useState<Salarie | null>(
      null
    );

  const [
    authUserId,
    setAuthUserId,
  ] =
    useState(
      ""
    );

  const [
    clientEmail,
    setClientEmail,
  ] =
    useState(
      ""
    );

  const [
    etape,
    setEtape,
  ] =
    useState<EtapeMobile>(
      1
    );

  const [
    commentairePreparation,
    setCommentairePreparation,
  ] =
    useState(
      ""
    );

  const [
    commentaireArrivee,
    setCommentaireArrivee,
  ] =
    useState(
      ""
    );

  const [
    commentaireFin,
    setCommentaireFin,
  ] =
    useState(
      ""
    );

  const [
    signalerProbleme,
    setSignalerProbleme,
  ] =
    useState(
      false
    );

  const [
    descriptionProbleme,
    setDescriptionProbleme,
  ] =
    useState(
      ""
    );

  const [
    photos,
    setPhotos,
  ] =
    useState<
      PhotoChantierMobile[]
    >([]);

  const [
    chargement,
    setChargement,
  ] =
    useState(
      true
    );

  const [
    enregistrement,
    setEnregistrement,
  ] =
    useState(
      false
    );

  const [
    accesRefuse,
    setAccesRefuse,
  ] =
    useState(
      false
    );

  const [
    erreur,
    setErreur,
  ] =
    useState(
      ""
    );

  const [
    succes,
    setSucces,
  ] =
    useState(
      ""
    );

  useEffect(() => {
    void initialiser();
  }, [
    entrepriseId,
    ficheId,
  ]);

  async function trouverSalarieConnecte(
    userId:
      string,
    email:
      string
  ) {
    let trouve:
      Salarie | null =
      null;

    const {
      data:
        parUtilisateur,
      error:
        erreurUtilisateur,
    } =
      await supabase
        .from(
          "salaries"
        )
        .select(
          "*"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .or(
          `user_id.eq.${userId},profil_id.eq.${userId}`
        )
        .limit(
          1
        )
        .maybeSingle();

    if (
      !erreurUtilisateur &&
      parUtilisateur
    ) {
      trouve =
        parUtilisateur as Salarie;
    }

    if (
      !trouve &&
      email
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "salaries"
          )
          .select(
            "*"
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .ilike(
            "email",
            email
          )
          .limit(
            1
          )
          .maybeSingle();

      if (
        !error &&
        data
      ) {
        trouve =
          data as Salarie;
      }
    }

    return trouve;
  }

  async function initialiser() {
    if (
      !entrepriseId ||
      !ficheId
    ) {
      setErreur(
        "Intervention introuvable."
      );

      setChargement(
        false
      );

      return;
    }

    try {
      setChargement(
        true
      );

      setAccesRefuse(
        false
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        throw new Error(
          "Votre session a expiré. Reconnectez-vous."
        );
      }

      setAuthUserId(
        user.id
      );

      const salarieTrouve =
        await trouverSalarieConnecte(
          user.id,
          user.email ||
            ""
        );

      if (
        !salarieTrouve?.id
      ) {
        setAccesRefuse(
          true
        );

        setSalarie(
          null
        );

        return;
      }

      setSalarie(
        salarieTrouve
      );

      await chargerFiche(
        salarieTrouve,
        true
      );
    } catch (
      error
    ) {
      console.error(
        "Initialisation intervention salarié mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger l’intervention."
        )
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  async function chargerFiche(
    salarieConnecte:
      Salarie,
    choisirEtape:
      boolean
  ) {
    setAccesRefuse(
      false
    );

    const {
      data:
        ficheAccesData,
      error:
        ficheAccesError,
    } =
      await supabase
        .from(
          "fiches_intervention"
        )
        .select(
          "id, entreprise_id, salarie_id, statut"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .eq(
          "id",
          ficheId
        )
        .maybeSingle();

    if (
      ficheAccesError
    ) {
      throw ficheAccesError;
    }

    if (
      !ficheAccesData
    ) {
      throw new Error(
        "Cette intervention n’existe plus."
      );
    }

    const ficheAcces =
      ficheAccesData as FicheAcces;

    const {
      data:
        equipeData,
      error:
        equipeError,
    } =
      await supabase
        .from(
          "fiches_intervention_salaries"
        )
        .select(
          "*"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .eq(
          "fiche_id",
          ficheId
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );

    if (
      equipeError
    ) {
      throw equipeError;
    }

    const equipeChargee =
      (
        equipeData ||
        []
      ) as FicheSalarie[];

    const affectationTrouvee =
      equipeChargee.find(
        (
          item
        ) =>
          item.salarie_id ===
          salarieConnecte.id
      ) ||
      null;

    const legacy =
      !affectationTrouvee &&
      ficheAcces.salarie_id ===
        salarieConnecte.id;

    if (
      !affectationTrouvee &&
      !legacy
    ) {
      setAccesRefuse(
        true
      );

      setFiche(
        null
      );

      setElements(
        []
      );

      setEquipe(
        []
      );

      setAffectation(
        null
      );

      return;
    }

    const [
      ficheResult,
      elementsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "fiches_intervention"
          )
          .select(
            "*"
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "id",
            ficheId
          )
          .maybeSingle(),

        supabase
          .from(
            "fiches_intervention_elements"
          )
          .select(
            "*"
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "fiche_id",
            ficheId
          )
          .order(
            "ordre",
            {
              ascending:
                true,
            }
          ),
      ]);

    if (
      ficheResult.error
    ) {
      throw ficheResult.error;
    }

    if (
      elementsResult.error
    ) {
      throw elementsResult.error;
    }

    if (
      !ficheResult.data
    ) {
      throw new Error(
        "Fiche intervention introuvable."
      );
    }

    const ficheChargee =
      ficheResult.data as FicheIntervention;

    const affectationLegacy =
      legacy
        ? ({
            id:
              "legacy",

            entreprise_id:
              entrepriseId,

            fiche_id:
              ficheId,

            salarie_id:
              salarieConnecte.id,

            salarie_nom:
              ficheChargee.salarie_nom ||
              nomSalarie(
                salarieConnecte
              ),

            role_chantier:
              "Intervenant",

            heure_arrivee_prevue:
              ficheChargee.heure_debut_prevue ||
              ficheChargee.heure_debut,

            heure_depart_prevue:
              ficheChargee.heure_fin_prevue ||
              ficheChargee.heure_fin,

            heure_arrivee_reelle:
              ficheChargee.heure_debut_reelle,

            heure_depart_reelle:
              ficheChargee.heure_fin_reelle,
          } as FicheSalarie)
        : null;

    const affectationFinale =
      affectationTrouvee ||
      affectationLegacy;

    if (
      !affectationFinale
    ) {
      setAccesRefuse(
        true
      );

      return;
    }

    setFiche(
      ficheChargee
    );

    setElements(
      (
        elementsResult.data ||
        []
      ) as FicheElement[]
    );

    setEquipe(
      equipeChargee.length >
        0
        ? equipeChargee
        : [
            affectationFinale,
          ]
    );

    setAffectation(
      affectationFinale
    );

    setCommentairePreparation(
      ficheChargee.commentaire_preparation ||
        ""
    );

    setCommentaireArrivee(
      ficheChargee.commentaire_arrivee ||
        ""
    );

    setCommentaireFin(
      ficheChargee.commentaire_fin ||
        ""
    );

    setSignalerProbleme(
      ficheChargee.probleme_signale ===
        true
    );

    setDescriptionProbleme(
      ficheChargee.description_probleme ||
        ""
    );

    if (
      ficheChargee.client_id
    ) {
      const {
        data:
          clientData,
      } =
        await supabase
          .from(
            "clients"
          )
          .select(
            "email"
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "id",
            ficheChargee.client_id
          )
          .maybeSingle();

      setClientEmail(
        clientData?.email ||
        ""
      );
    } else {
      setClientEmail(
        ""
      );
    }

    if (
      choisirEtape
    ) {
      if (
        ficheChargee.etape_materiel_statut !==
        "valide"
      ) {
        setEtape(
          1
        );
      } else if (
        ficheChargee.etape_arrivee_statut !==
        "valide"
      ) {
        setEtape(
          2
        );
      } else if (
        ficheChargee.etape_fin_statut ===
          "valide" ||
        ficheChargee.etape_fin_statut ===
          "probleme" ||
        ficheChargee.statut ===
          "terminee"
      ) {
        setEtape(
          5
        );
      } else {
        setEtape(
          3
        );
      }
    }
  }

  async function rafraichir(
    choisirEtape =
      false
  ) {
    if (
      !salarie
    ) {
      return;
    }

    await chargerFiche(
      salarie,
      choisirEtape
    );
  }

  const elementsParCategorie =
    useMemo(() => {
      const resultat:
        Record<
          string,
          FicheElement[]
        > = {};

      elements.forEach(
        (
          element
        ) => {
          if (
            !resultat[
              element.categorie
            ]
          ) {
            resultat[
              element.categorie
            ] = [];
          }

          resultat[
            element.categorie
          ].push(
            element
          );
        }
      );

      return resultat;
    }, [
      elements,
    ]);

  const materielEtMateriaux =
    useMemo(
      () =>
        elements.filter(
          (
            element
          ) =>
            element.categorie ===
              "materiel" ||
            element.categorie ===
              "materiaux"
        ),
      [
        elements,
      ]
    );

  const nombrePreparables =
    materielEtMateriaux.length;

  const nombrePrepares =
    materielEtMateriaux.filter(
      (
        element
      ) =>
        element.coche_prepare ===
        true
    ).length;

  const toutEstPrepare =
    nombrePreparables ===
      0 ||
    nombrePreparables ===
      nombrePrepares;

  const materielValide =
    fiche?.etape_materiel_statut ===
    "valide";

  const arriveeValidee =
    fiche?.etape_arrivee_statut ===
    "valide";

  const finEnregistree =
    fiche?.etape_fin_statut ===
      "valide" ||
    fiche?.etape_fin_statut ===
      "probleme" ||
    fiche?.statut ===
      "terminee";

  const ficheAnnuleeOuArchivee =
    fiche?.statut ===
      "annulee" ||
    fiche?.statut ===
      "archivee";

  const interventionTerminee =
    fiche?.statut ===
    "terminee";

  const nomSignataireEntreprise =
    nomSalarie(
      salarie
    ) ||
    affectation?.salarie_nom ||
    "";

  const progression =
    useMemo(() => {
      let total =
        0;

      if (
        materielValide
      ) {
        total +=
          20;
      }

      if (
        arriveeValidee
      ) {
        total +=
          20;
      }

      if (
        arriveeValidee
      ) {
        total +=
          20;
      }

      if (
        finEnregistree
      ) {
        total +=
          20;
      }

      if (
        fiche?.pv_fin_chantier_id
      ) {
        total +=
          20;
      }

      return Math.min(
        100,
        total
      );
    }, [
      materielValide,
      arriveeValidee,
      finEnregistree,
      fiche?.pv_fin_chantier_id,
    ]);

  async function verifierAccesMutation() {
    if (
      !salarie?.id
    ) {
      setErreur(
        "Votre compte salarié n’est pas reconnu."
      );

      return false;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "fiches_intervention"
        )
        .select(
          "id, entreprise_id, salarie_id, statut"
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .eq(
          "id",
          ficheId
        )
        .maybeSingle();

    if (
      error ||
      !data
    ) {
      setErreur(
        "Cette intervention n’est plus accessible."
      );

      return false;
    }

    const ficheAcces =
      data as FicheAcces;

    if (
      ficheAcces.statut ===
        "annulee" ||
      ficheAcces.statut ===
        "archivee" ||
      ficheAcces.statut ===
        "terminee"
    ) {
      setErreur(
        "Cette intervention est maintenant en lecture seule."
      );

      await rafraichir();

      return false;
    }

    if (
      ficheAcces.salarie_id ===
      salarie.id
    ) {
      return true;
    }

    const {
      data:
        affectationData,
      error:
        affectationError,
    } =
      await supabase
        .from(
          "fiches_intervention_salaries"
        )
        .select(
          "id"
        )
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
          salarie.id
        )
        .limit(
          1
        )
        .maybeSingle();

    if (
      affectationError ||
      !affectationData?.id
    ) {
      setErreur(
        "Vous n’êtes plus affecté à cette intervention."
      );

      setAccesRefuse(
        true
      );

      return false;
    }

    return true;
  }

  async function basculerPreparation(
    element:
      FicheElement
  ) {
    if (
      enregistrement ||
      materielValide ||
      ficheAnnuleeOuArchivee ||
      interventionTerminee
    ) {
      return;
    }

    const positionScroll =
      window.scrollY;

    const restaurerPosition =
      () => {
        requestAnimationFrame(
          () => {
            window.scrollTo({
              top:
                positionScroll,

              behavior:
                "auto",
            });
          }
        );
      };

    const elementActif =
      document.activeElement;

    if (
      elementActif instanceof
      HTMLElement
    ) {
      elementActif.blur();
    }

    try {
      setEnregistrement(
        true
      );

      restaurerPosition();

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const acces =
        await verifierAccesMutation();

      if (
        !acces
      ) {
        restaurerPosition();

        return;
      }

      const nouvelleValeur =
        !element.coche_prepare;

      const {
        error,
      } =
        await supabase
          .from(
            "fiches_intervention_elements"
          )
          .update({
            coche_prepare:
              nouvelleValeur,
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
            element.id
          );

      if (
        error
      ) {
        throw error;
      }

      setElements(
        (
          anciens
        ) =>
          anciens.map(
            (
              item
            ) =>
              item.id ===
              element.id
                ? {
                    ...item,

                    coche_prepare:
                      nouvelleValeur,
                  }
                : item
          )
      );

      restaurerPosition();
    } catch (
      error
    ) {
      console.error(
        "Préparation matériel mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de modifier cet élément."
        )
      );

      restaurerPosition();
    } finally {
      setEnregistrement(
        false
      );

      restaurerPosition();

      setTimeout(
        restaurerPosition,
        40
      );
    }
  }

  async function validerMateriel() {
    if (
      !fiche ||
      !salarie ||
      enregistrement
    ) {
      return;
    }

    if (
      !toutEstPrepare
    ) {
      setErreur(
        "Cochez tout le matériel et tous les matériaux avant de continuer."
      );

      return;
    }

    try {
      setEnregistrement(
        true
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const acces =
        await verifierAccesMutation();

      if (
        !acces
      ) {
        return;
      }

      const maintenant =
        new Date().toISOString();

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
              maintenant,

            commentaire_preparation:
              nettoyerTexte(
                commentairePreparation
              ),

            updated_at:
              maintenant,
          })
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "id",
            fiche.id
          );

      if (
        error
      ) {
        throw error;
      }

      await rafraichir();

      setSucces(
        "Matériel validé. Vous pouvez partir sur le chantier."
      );

      setEtape(
        2
      );

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });
    } catch (
      error
    ) {
      console.error(
        "Validation matériel mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de valider le matériel."
        )
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  async function validerArrivee() {
    if (
      !fiche ||
      !affectation ||
      enregistrement
    ) {
      return;
    }

    if (
      !materielValide
    ) {
      setErreur(
        "Validez d’abord le matériel."
      );

      return;
    }

    try {
      setEnregistrement(
        true
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const acces =
        await verifierAccesMutation();

      if (
        !acces
      ) {
        return;
      }

      const maintenant =
        new Date().toISOString();

      const heure =
        heureMaintenant();

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
              maintenant,

            heure_debut_reelle:
              fiche.heure_debut_reelle ||
              heure,

            commentaire_arrivee:
              nettoyerTexte(
                commentaireArrivee
              ),

            updated_at:
              maintenant,
          })
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "id",
            fiche.id
          );

      if (
        error
      ) {
        throw error;
      }

      if (
        affectation.id !==
        "legacy"
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
                affectation.heure_arrivee_reelle ||
                heure,
            })
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .eq(
              "fiche_id",
              fiche.id
            )
            .eq(
              "salarie_id",
              salarie?.id ||
              ""
            )
            .eq(
              "id",
              affectation.id
            );

        if (
          affectationError
        ) {
          throw affectationError;
        }
      }

      await rafraichir();

      setSucces(
        "Arrivée enregistrée. Bon chantier !"
      );

      setEtape(
        3
      );

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });
    } catch (
      error
    ) {
      console.error(
        "Validation arrivée mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de valider votre arrivée."
        )
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  async function validerFin() {
    if (
      !fiche ||
      !affectation ||
      enregistrement
    ) {
      return;
    }

    if (
      !arriveeValidee
    ) {
      setErreur(
        "Validez d’abord votre arrivée sur le chantier."
      );

      return;
    }

    if (
      signalerProbleme &&
      !descriptionProbleme.trim()
    ) {
      setErreur(
        "Décrivez le problème rencontré avant de continuer."
      );

      return;
    }

    try {
      setEnregistrement(
        true
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const acces =
        await verifierAccesMutation();

      if (
        !acces
      ) {
        return;
      }

      const maintenant =
        new Date().toISOString();

      const heure =
        heureMaintenant();

      const statutFin =
        signalerProbleme
          ? "probleme"
          : "valide";

      const {
        error,
      } =
        await supabase
          .from(
            "fiches_intervention"
          )
          .update({
            statut:
              signalerProbleme
                ? "en_cours"
                : "terminee",

            etape_fin_statut:
              statutFin,

            fin_validee_at:
              maintenant,

            heure_fin_reelle:
              fiche.heure_fin_reelle ||
              heure,

            commentaire_fin:
              nettoyerTexte(
                commentaireFin
              ),

            probleme_signale:
              signalerProbleme,

            description_probleme:
              signalerProbleme
                ? nettoyerTexte(
                    descriptionProbleme
                  )
                : null,

            updated_at:
              maintenant,
          })
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "id",
            fiche.id
          );

      if (
        error
      ) {
        throw error;
      }

      if (
        affectation.id !==
        "legacy"
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
                affectation.heure_depart_reelle ||
                heure,
            })
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .eq(
              "fiche_id",
              fiche.id
            )
            .eq(
              "salarie_id",
              salarie?.id ||
              ""
            )
            .eq(
              "id",
              affectation.id
            );

        if (
          affectationError
        ) {
          throw affectationError;
        }
      }

      await rafraichir();

      setSucces(
        signalerProbleme
          ? "Fin enregistrée avec problème signalé."
          : "Fin de chantier enregistrée."
      );

      setEtape(
        5
      );

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });
    } catch (
      error
    ) {
      console.error(
        "Fin chantier mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible d’enregistrer la fin du chantier."
        )
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  function ouvrirEtape(
    nouvelleEtape:
      EtapeMobile
  ) {
    if (
      nouvelleEtape ===
        2 &&
      !materielValide
    ) {
      setErreur(
        "Validez d’abord le matériel."
      );

      return;
    }

    if (
      nouvelleEtape >=
        3 &&
      !arriveeValidee
    ) {
      setErreur(
        "Validez d’abord votre arrivée sur le chantier."
      );

      return;
    }

    if (
      nouvelleEtape ===
        5 &&
      !finEnregistree
    ) {
      setErreur(
        "Enregistrez d’abord la fin du chantier."
      );

      return;
    }

    setErreur(
      ""
    );

    setSucces(
      ""
    );

    setEtape(
      nouvelleEtape
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  function renduElement(
    element:
      FicheElement,
    preparation:
      boolean
  ) {
    const peutCocher =
      preparation &&
      !materielValide &&
      !ficheAnnuleeOuArchivee &&
      !interventionTerminee;

    return (
      <button
        type="button"
        key={
          element.id
        }
        disabled={
          !peutCocher ||
          enregistrement
        }
        className={`intervention-salarie-element ${
          preparation
            ? "preparation"
            : ""
        } ${
          element.coche_prepare
            ? "done"
            : ""
        }`}
        onClick={() =>
          void basculerPreparation(
            element
          )
        }
      >
        <span className="intervention-salarie-element-icon">
          {preparation &&
          element.coche_prepare
            ? "✓"
            : element.icone ||
              iconeCategorie(
                element.categorie
              )}
        </span>

        <div>
          <strong>
            {
              element.nom
            }
          </strong>

          <small>
            Prévu :{" "}
            {Number(
              element.quantite_prevue ||
                1
            )}{" "}
            {element.unite ||
              "u"}
          </small>

          {element.commentaire_chef ? (
            <p>
              Chef :{" "}
              {
                element.commentaire_chef
              }
            </p>
          ) : null}

          {element.commentaire_salarie ? (
            <p className="employee">
              Retour :{" "}
              {
                element.commentaire_salarie
              }
            </p>
          ) : null}
        </div>

        {preparation ? (
          <span className="intervention-salarie-element-state">
            {element.coche_prepare
              ? "Préparé"
              : "À préparer"}
          </span>
        ) : null}
      </button>
    );
  }

  if (
    chargement
  ) {
    return (
      <main className="intervention-salarie-mobile">
        <div className="intervention-salarie-loading">
          <div className="intervention-salarie-spinner" />

          <strong>
            Chargement du chantier…
          </strong>
        </div>
      </main>
    );
  }

  if (
    accesRefuse
  ) {
    return (
      <main className="intervention-salarie-mobile">
        <header className="intervention-salarie-header">
          <button
            type="button"
            onClick={
              onFermer
            }
          >
            ‹
          </button>

          <div>
            <h1>
              Intervention
            </h1>

            <span>
              Accès refusé
            </span>
          </div>

          <div />
        </header>

        <div className="intervention-salarie-content">
          <div className="intervention-salarie-access-denied">
            <span>
              🔒
            </span>

            <strong>
              Intervention non affectée
            </strong>

            <p>
              Cette fiche ne fait pas partie de vos interventions. Le Chef doit vous ajouter à l’équipe du chantier.
            </p>

            <button
              type="button"
              onClick={
                onFermer
              }
            >
              Retour
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (
    !fiche
  ) {
    return (
      <main className="intervention-salarie-mobile">
        <header className="intervention-salarie-header">
          <button
            type="button"
            onClick={
              onFermer
            }
          >
            ‹
          </button>

          <div>
            <h1>
              Intervention
            </h1>

            <span>
              Introuvable
            </span>
          </div>

          <div />
        </header>

        <div className="intervention-salarie-content">
          <div className="intervention-salarie-access-denied">
            <span>
              ⚠
            </span>

            <strong>
              Fiche introuvable
            </strong>

            <p>
              Cette intervention n’existe plus ou n’est pas accessible.
            </p>

            <button
              type="button"
              onClick={
                onFermer
              }
            >
              Retour
            </button>
          </div>
        </div>
      </main>
    );
  }

  const photosAvant =
    photos.filter(
      (
        photo
      ) =>
        photo.categorie ===
        "avant"
    ).length;

  const photosPendant =
    photos.filter(
      (
        photo
      ) =>
        photo.categorie ===
        "pendant"
    ).length;

  const photosApres =
    photos.filter(
      (
        photo
      ) =>
        photo.categorie ===
        "apres"
    ).length;

  return (
    <main className="intervention-salarie-mobile">
      <header className="intervention-salarie-header">
        <button
          type="button"
          className="intervention-salarie-back"
          onClick={
            onFermer
          }
        >
          ‹
        </button>

        <div>
          <h1>
            {titreFiche(
              fiche
            )}
          </h1>

          <span>
            {fiche.numero ||
              "Intervention"}
          </span>
        </div>

        <button
          type="button"
          className="intervention-salarie-refresh"
          disabled={
            enregistrement
          }
          onClick={() =>
            void rafraichir()
          }
        >
          ↻
        </button>
      </header>

      <div className="intervention-salarie-content">
        <section className="intervention-salarie-hero">
          <div className="intervention-salarie-hero-top">
            <span
              className={classeStatut(
                fiche.statut
              )}
            >
              {libelleStatut(
                fiche.statut
              )}
            </span>

            <small>
              {
                progression
              }
              %
            </small>
          </div>

          <h2>
            {fiche.client_nom ||
              "Client"}
          </h2>

          <p>
            📍{" "}
            {adresseFiche(
              fiche
            )}
          </p>

          <div className="intervention-salarie-hero-info">
            <span>
              📅{" "}
              {formatDate(
                fiche.date_prevue ||
                  fiche.date_intervention
              )}
            </span>

            <span>
              🕘{" "}
              {formatHeure(
                fiche.heure_debut_prevue ||
                  fiche.heure_debut
              )}{" "}
              –{" "}
              {formatHeure(
                fiche.heure_fin_prevue ||
                  fiche.heure_fin
              )}
            </span>
          </div>

          <div className="intervention-salarie-progress">
            <span
              style={{
                width:
                  `${progression}%`,
              }}
            />
          </div>
        </section>

        {erreur ? (
          <div className="intervention-salarie-error">
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div className="intervention-salarie-success">
            {succes}
          </div>
        ) : null}

        {ficheAnnuleeOuArchivee ? (
          <div className="intervention-salarie-readonly">
            Cette intervention est {libelleStatut(
              fiche.statut
            ).toLowerCase()} et ne peut plus être modifiée.
          </div>
        ) : null}

        <nav className="intervention-salarie-steps">
          <button
            type="button"
            className={`${etape ===
            1
              ? "active"
              : ""} ${
              materielValide
                ? "done"
                : ""
            }`}
            onClick={() =>
              ouvrirEtape(
                1
              )
            }
          >
            <span>
              {materielValide
                ? "✓"
                : "1"}
            </span>

            <small>
              Matériel
            </small>
          </button>

          <button
            type="button"
            className={`${etape ===
            2
              ? "active"
              : ""} ${
              arriveeValidee
                ? "done"
                : ""
            }`}
            onClick={() =>
              ouvrirEtape(
                2
              )
            }
          >
            <span>
              {arriveeValidee
                ? "✓"
                : "2"}
            </span>

            <small>
              Arrivée
            </small>
          </button>

          <button
            type="button"
            className={
              etape ===
              3
                ? "active"
                : ""
            }
            onClick={() =>
              ouvrirEtape(
                3
              )
            }
          >
            <span>
              3
            </span>

            <small>
              Chantier
            </small>
          </button>

          <button
            type="button"
            className={`${etape ===
            4
              ? "active"
              : ""} ${
              finEnregistree
                ? "done"
                : ""
            }`}
            onClick={() =>
              ouvrirEtape(
                4
              )
            }
          >
            <span>
              {finEnregistree
                ? "✓"
                : "4"}
            </span>

            <small>
              Fin
            </small>
          </button>

          <button
            type="button"
            className={`${etape ===
            5
              ? "active"
              : ""} ${
              fiche.pv_fin_chantier_id
                ? "done"
                : ""
            }`}
            onClick={() =>
              ouvrirEtape(
                5
              )
            }
          >
            <span>
              {fiche.pv_fin_chantier_id
                ? "✓"
                : "5"}
            </span>

            <small>
              PV
            </small>
          </button>
        </nav>

        {/*
         * =================================================
         * ETAPE 1 — MATERIEL
         * =================================================
         */}

        {etape ===
        1 ? (
          <>
            <section className="intervention-salarie-step-heading">
              <span>
                🧰
              </span>

              <div>
                <small>
                  ÉTAPE 1
                </small>

                <h2>
                  Préparer le matériel
                </h2>

                <p>
                  Cochez chaque élément avant le départ.
                </p>
              </div>
            </section>

            <section className="intervention-salarie-counter-card">
              <div>
                <span>
                  Matériel prêt
                </span>

                <strong>
                  {
                    nombrePrepares
                  }
                  /
                  {
                    nombrePreparables
                  }
                </strong>
              </div>

              <div className="intervention-salarie-counter-progress">
                <span
                  style={{
                    width:
                      `${nombrePreparables ===
                      0
                        ? 100
                        : Math.round(
                            (
                              nombrePrepares /
                              nombrePreparables
                            ) *
                              100
                          )}%`,
                  }}
                />
              </div>
            </section>

            {[
              "materiel",
              "materiaux",
            ].map(
              (
                categorie
              ) => {
                const liste =
                  elementsParCategorie[
                    categorie
                  ] ||
                  [];

                return (
                  <section
                    key={
                      categorie
                    }
                    className="intervention-salarie-card"
                  >
                    <div className="intervention-salarie-card-title">
                      <span>
                        {iconeCategorie(
                          categorie
                        )}
                      </span>

                      <div>
                        <h3>
                          {titreCategorie(
                            categorie
                          )}
                        </h3>

                        <p>
                          {categorie ===
                          "materiel"
                            ? "Machines, véhicules, outils et EPI."
                            : "Fournitures et matériaux à emporter."}
                        </p>
                      </div>
                    </div>

                    {liste.length ===
                    0 ? (
                      <div className="intervention-salarie-empty-small">
                        Aucun élément prévu.
                      </div>
                    ) : (
                      <div className="intervention-salarie-elements">
                        {liste.map(
                          (
                            element
                          ) =>
                            renduElement(
                              element,
                              true
                            )
                        )}
                      </div>
                    )}
                  </section>
                );
              }
            )}

            <section className="intervention-salarie-card">
              <label className="intervention-salarie-field">
                <span>
                  Commentaire préparation
                </span>

                <textarea
                  rows={
                    3
                  }
                  disabled={
                    materielValide ||
                    ficheAnnuleeOuArchivee ||
                    interventionTerminee
                  }
                  value={
                    commentairePreparation
                  }
                  onChange={(
                    event
                  ) =>
                    setCommentairePreparation(
                      event.target.value
                    )
                  }
                  placeholder="Ex : matériel complémentaire chargé..."
                />
              </label>
            </section>

            {materielValide ? (
              <div className="intervention-salarie-complete">
                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    Matériel validé
                  </strong>

                  <small>
                    {formatDateHeure(
                      fiche.materiel_valide_at
                    )}
                  </small>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    ouvrirEtape(
                      2
                    )
                  }
                >
                  Continuer →
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="intervention-salarie-main-action"
                disabled={
                  enregistrement ||
                  !toutEstPrepare ||
                  ficheAnnuleeOuArchivee
                }
                onClick={() =>
                  void validerMateriel()
                }
              >
                {enregistrement
                  ? "Validation…"
                  : toutEstPrepare
                    ? "✓ Tout est chargé — Valider"
                    : `Encore ${
                        nombrePreparables -
                        nombrePrepares
                      } élément${
                        nombrePreparables -
                          nombrePrepares >
                        1
                          ? "s"
                          : ""
                      }`}
              </button>
            )}
          </>
        ) : null}

        {/*
         * =================================================
         * ETAPE 2 — ARRIVEE
         * =================================================
         */}

        {etape ===
        2 ? (
          <>
            <section className="intervention-salarie-step-heading">
              <span>
                📍
              </span>

              <div>
                <small>
                  ÉTAPE 2
                </small>

                <h2>
                  Arrivée chantier
                </h2>

                <p>
                  Validez uniquement une fois arrivé sur place.
                </p>
              </div>
            </section>

            <section className="intervention-salarie-card">
              <div className="intervention-salarie-address">
                <span>
                  📍
                </span>

                <div>
                  <small>
                    ADRESSE DU CHANTIER
                  </small>

                  <strong>
                    {adresseFiche(
                      fiche
                    )}
                  </strong>
                </div>
              </div>

              {fiche.notes_chantier ? (
                <div className="intervention-salarie-note">
                  <strong>
                    Notes chantier
                  </strong>

                  <p>
                    {
                      fiche.notes_chantier
                    }
                  </p>
                </div>
              ) : null}
            </section>

            <section className="intervention-salarie-card">
              <h3>
                Votre horaire
              </h3>

              <div className="intervention-salarie-time-grid">
                <div>
                  <span>
                    Prévu
                  </span>

                  <strong>
                    {formatHeure(
                      affectation?.heure_arrivee_prevue ||
                        fiche.heure_debut_prevue ||
                        fiche.heure_debut
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Arrivée réelle
                  </span>

                  <strong>
                    {formatHeure(
                      affectation?.heure_arrivee_reelle ||
                        fiche.heure_debut_reelle
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <section className="intervention-salarie-card">
              <label className="intervention-salarie-field">
                <span>
                  Commentaire d’arrivée
                </span>

                <textarea
                  rows={
                    3
                  }
                  disabled={
                    arriveeValidee ||
                    ficheAnnuleeOuArchivee ||
                    interventionTerminee
                  }
                  value={
                    commentaireArrivee
                  }
                  onChange={(
                    event
                  ) =>
                    setCommentaireArrivee(
                      event.target.value
                    )
                  }
                  placeholder="Ex : accès ouvert, client présent..."
                />
              </label>
            </section>

            {arriveeValidee ? (
              <div className="intervention-salarie-complete">
                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    Arrivée validée
                  </strong>

                  <small>
                    {formatDateHeure(
                      fiche.arrivee_validee_at
                    )}
                  </small>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    ouvrirEtape(
                      3
                    )
                  }
                >
                  Ouvrir le chantier →
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="intervention-salarie-main-action"
                disabled={
                  enregistrement ||
                  !materielValide ||
                  ficheAnnuleeOuArchivee
                }
                onClick={() =>
                  void validerArrivee()
                }
              >
                {enregistrement
                  ? "Validation…"
                  : `📍 Je suis arrivé — ${heureMaintenant()}`}
              </button>
            )}
          </>
        ) : null}

        {/*
         * =================================================
         * ETAPE 3 — CHANTIER
         * =================================================
         */}

        {etape ===
        3 ? (
          <>
            <section className="intervention-salarie-step-heading">
              <span>
                🌳
              </span>

              <div>
                <small>
                  ÉTAPE 3
                </small>

                <h2>
                  Chantier
                </h2>

                <p>
                  Retrouvez les tâches, consignes et photos.
                </p>
              </div>
            </section>

            {[
              "travaux",
              "consigne_securite",
              "consigne_chantier",
            ].map(
              (
                categorie
              ) => {
                const liste =
                  elementsParCategorie[
                    categorie
                  ] ||
                  [];

                if (
                  liste.length ===
                  0
                ) {
                  return null;
                }

                return (
                  <section
                    key={
                      categorie
                    }
                    className="intervention-salarie-card"
                  >
                    <div className="intervention-salarie-card-title">
                      <span>
                        {iconeCategorie(
                          categorie
                        )}
                      </span>

                      <div>
                        <h3>
                          {titreCategorie(
                            categorie
                          )}
                        </h3>
                      </div>
                    </div>

                    <div className="intervention-salarie-elements">
                      {liste.map(
                        (
                          element
                        ) =>
                          renduElement(
                            element,
                            false
                          )
                      )}
                    </div>
                  </section>
                );
              }
            )}

            {fiche.travaux_prevus &&
            !elementsParCategorie.travaux?.length ? (
              <section className="intervention-salarie-card">
                <h3>
                  ✅ Travaux prévus
                </h3>

                <p className="intervention-salarie-text">
                  {
                    fiche.travaux_prevus
                  }
                </p>
              </section>
            ) : null}

            {fiche.consignes_securite &&
            !elementsParCategorie.consignes_securite?.length ? (
              <section className="intervention-salarie-card intervention-salarie-security">
                <h3>
                  🦺 Sécurité
                </h3>

                <p className="intervention-salarie-text">
                  {
                    fiche.consignes_securite
                  }
                </p>
              </section>
            ) : null}

            <section className="intervention-salarie-photo-summary">
              <div>
                <strong>
                  {
                    photosAvant
                  }
                </strong>

                <span>
                  Avant
                </span>
              </div>

              <div>
                <strong>
                  {
                    photosPendant
                  }
                </strong>

                <span>
                  Pendant
                </span>
              </div>

              <div>
                <strong>
                  {
                    photosApres
                  }
                </strong>

                <span>
                  Après
                </span>
              </div>
            </section>

            <PhotosChantierMobile
              entrepriseId={
                entrepriseId
              }
              ficheId={
                fiche.id
              }
              userId={
                authUserId
              }
              lectureSeule={
                ficheAnnuleeOuArchivee ||
                interventionTerminee
              }
              categorieInitiale="pendant"
              onPhotosChange={
                setPhotos
              }
            />

            {!finEnregistree ? (
              <button
                type="button"
                className="intervention-salarie-main-action"
                disabled={
                  !arriveeValidee ||
                  ficheAnnuleeOuArchivee
                }
                onClick={() =>
                  ouvrirEtape(
                    4
                  )
                }
              >
                Continuer vers la fin du chantier →
              </button>
            ) : (
              <button
                type="button"
                className="intervention-salarie-main-action"
                onClick={() =>
                  ouvrirEtape(
                    5
                  )
                }
              >
                Ouvrir le PV →
              </button>
            )}
          </>
        ) : null}

        {/*
         * =================================================
         * ETAPE 4 — FIN
         * =================================================
         */}

        {etape ===
        4 ? (
          <>
            <section className="intervention-salarie-step-heading">
              <span>
                🏁
              </span>

              <div>
                <small>
                  ÉTAPE 4
                </small>

                <h2>
                  Fin du chantier
                </h2>

                <p>
                  Enregistrez votre départ et signalez un éventuel problème.
                </p>
              </div>
            </section>

            <section className="intervention-salarie-card">
              <h3>
                Horaires
              </h3>

              <div className="intervention-salarie-time-grid">
                <div>
                  <span>
                    Arrivée
                  </span>

                  <strong>
                    {formatHeure(
                      affectation?.heure_arrivee_reelle ||
                        fiche.heure_debut_reelle
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Départ
                  </span>

                  <strong>
                    {formatHeure(
                      affectation?.heure_depart_reelle ||
                        fiche.heure_fin_reelle
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <section className="intervention-salarie-card">
              <label className="intervention-salarie-problem-toggle">
                <input
                  type="checkbox"
                  checked={
                    signalerProbleme
                  }
                  disabled={
                    finEnregistree ||
                    ficheAnnuleeOuArchivee
                  }
                  onChange={(
                    event
                  ) =>
                    setSignalerProbleme(
                      event.target.checked
                    )
                  }
                />

                <span>
                  <strong>
                    ⚠ Signaler un problème
                  </strong>

                  <small>
                    Cochez uniquement si le chantier ne peut pas être considéré comme terminé normalement.
                  </small>
                </span>
              </label>

              {signalerProbleme ? (
                <label className="intervention-salarie-field intervention-salarie-problem-field">
                  <span>
                    Description du problème *
                  </span>

                  <textarea
                    rows={
                      5
                    }
                    disabled={
                      finEnregistree ||
                      ficheAnnuleeOuArchivee
                    }
                    value={
                      descriptionProbleme
                    }
                    onChange={(
                      event
                    ) =>
                      setDescriptionProbleme(
                        event.target.value
                      )
                    }
                    placeholder="Décrivez précisément ce qui s’est passé..."
                  />
                </label>
              ) : null}
            </section>

            <section className="intervention-salarie-card">
              <label className="intervention-salarie-field">
                <span>
                  Commentaire de fin
                </span>

                <textarea
                  rows={
                    4
                  }
                  disabled={
                    finEnregistree ||
                    ficheAnnuleeOuArchivee
                  }
                  value={
                    commentaireFin
                  }
                  onChange={(
                    event
                  ) =>
                    setCommentaireFin(
                      event.target.value
                    )
                  }
                  placeholder="Ex : chantier terminé, déchets évacués..."
                />
              </label>
            </section>

            <div className="intervention-salarie-photo-reminder">
              <span>
                📸
              </span>

              <div>
                <strong>
                  Photos du chantier
                </strong>

                <small>
                  {photos.length} photo
                  {photos.length >
                  1
                    ? "s"
                    : ""}{" "}
                  enregistrée
                  {photos.length >
                  1
                    ? "s"
                    : ""}
                  .
                </small>
              </div>

              <button
                type="button"
                onClick={() =>
                  ouvrirEtape(
                    3
                  )
                }
              >
                Voir
              </button>
            </div>

            {finEnregistree ? (
              <div className="intervention-salarie-complete">
                <span>
                  {fiche.etape_fin_statut ===
                  "probleme"
                    ? "⚠"
                    : "✓"}
                </span>

                <div>
                  <strong>
                    {fiche.etape_fin_statut ===
                    "probleme"
                      ? "Fin enregistrée avec problème"
                      : "Fin de chantier enregistrée"}
                  </strong>

                  <small>
                    {formatDateHeure(
                      fiche.fin_validee_at
                    )}
                  </small>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    ouvrirEtape(
                      5
                    )
                  }
                >
                  PV →
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`intervention-salarie-main-action ${
                  signalerProbleme
                    ? "problem"
                    : ""
                }`}
                disabled={
                  enregistrement ||
                  ficheAnnuleeOuArchivee
                }
                onClick={() =>
                  void validerFin()
                }
              >
                {enregistrement
                  ? "Enregistrement…"
                  : signalerProbleme
                    ? "⚠ Enregistrer la fin avec problème"
                    : `✓ Terminer le chantier — ${heureMaintenant()}`}
              </button>
            )}
          </>
        ) : null}

        {/*
         * =================================================
         * ETAPE 5 — PV
         * =================================================
         */}

        {etape ===
        5 ? (
          <>
            <section className="intervention-salarie-step-heading">
              <span>
                ✍️
              </span>

              <div>
                <small>
                  ÉTAPE 5
                </small>

                <h2>
                  PV et signature
                </h2>

                <p>
                  Faites signer le client directement sur le téléphone.
                </p>
              </div>
            </section>

            {fiche.probleme_signale ? (
              <div className="intervention-salarie-problem-banner">
                <strong>
                  ⚠ Problème signalé
                </strong>

                <p>
                  {fiche.description_probleme ||
                    "Un problème a été enregistré sur cette intervention."}
                </p>
              </div>
            ) : null}

            <PvFinChantierMobile
              entrepriseId={
                entrepriseId
              }
              ficheId={
                fiche.id
              }
              clientId={
                fiche.client_id
              }
              clientNom={
                fiche.client_nom
              }
              clientEmail={
                clientEmail
              }
              signataireEntrepriseNom={
                nomSignataireEntreprise
              }
              lectureSeule={
                ficheAnnuleeOuArchivee
              }
              onPvEnregistre={(
                pv:
                  PvFinChantierMobileData
              ) => {
                setFiche(
                  (
                    ancienne
                  ) =>
                    ancienne
                      ? {
                          ...ancienne,

                          pv_fin_chantier_id:
                            pv.id,

                          etape_fin_statut:
                            pv.chantier_termine ===
                            false
                              ? "probleme"
                              : "valide",
                        }
                      : ancienne
                );

                setSucces(
                  "PV enregistré. Intervention complète."
                );

                void rafraichir();
              }}
            />

            {fiche.pv_fin_chantier_id ? (
              <div className="intervention-salarie-final-complete">
                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    Intervention complète
                  </strong>

                  <small>
                    Le retour terrain et le PV sont enregistrés dans Arboboard.
                  </small>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        <section className="intervention-salarie-summary-card">
          <div className="intervention-salarie-summary-heading">
            <h3>
              Équipe
            </h3>

            <span>
              {
                equipe.length
              }
            </span>
          </div>

          <div className="intervention-salarie-team">
            {equipe.map(
              (
                membre
              ) => (
                <div
                  key={
                    membre.id
                  }
                >
                  <span>
                    👤
                  </span>

                  <div>
                    <strong>
                      {membre.salarie_nom ||
                        "Salarié"}
                    </strong>

                    <small>
                      {membre.role_chantier ||
                        "Intervenant"}
                    </small>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}