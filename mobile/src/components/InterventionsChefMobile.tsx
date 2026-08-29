import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./InterventionsChefMobile.css";

type Props = {
  entrepriseId: string;
  onFermer: () => void;

  ficheIdInitiale?:
    string | null;

  devisIdInitial?:
    string | null;

  onFicheCree?:
    (
      ficheId: string
    ) => void;
};

type StatutFiche =
  | "brouillon"
  | "planifiee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "archivee";

type FiltreStatut =
  | "tous"
  | StatutFiche;

type EtapeCreation =
  | 1
  | 2
  | 3;

type OngletElements =
  | "travaux"
  | "materiel"
  | "materiaux"
  | "consignes";

type CategorieArticle =
  | "type_intervention"
  | "travaux"
  | "materiel"
  | "materiaux"
  | "consigne_securite"
  | "consigne_chantier";

type Client = {
  id: string;

  type_client?:
    string | null;

  nom?:
    string | null;

  prenom?:
    string | null;

  entreprise?:
    string | null;

  email?:
    string | null;

  telephone?:
    string | null;

  adresse?:
    string | null;

  code_postal?:
    string | null;

  ville?:
    string | null;

  adresse_chantier?:
    string | null;

  code_postal_chantier?:
    string | null;

  ville_chantier?:
    string | null;

  notes_chantier?:
    string | null;

  statut?:
    string | null;
};

type Salarie = {
  id: string;

  nom?:
    string | null;

  prenom?:
    string | null;

  email?:
    string | null;

  telephone?:
    string | null;

  statut?:
    string | null;
};

type Devis = {
  id: string;

  entreprise_id: string;

  client_id:
    string | null;

  client_nom:
    string | null;

  numero:
    string | null;

  objet:
    string | null;

  description:
    string | null;

  statut:
    string | null;

  date_devis:
    string | null;

  total_ht:
    number | null;

  total_tva:
    number | null;

  total_ttc:
    number | null;

  adresse_chantier?:
    string | null;

  code_postal_chantier?:
    string | null;

  ville_chantier?:
    string | null;

  notes_chantier?:
    string | null;
};

type DevisLigne = {
  id: string;

  devis_id: string;

  designation:
    string | null;

  description:
    string | null;

  quantite:
    number | null;

  unite:
    string | null;

  ordre:
    number | null;

  prestation_code?:
    string | null;

  prestation_categorie_nom?:
    string | null;
};

type ArticleIntervention = {
  id: string;

  entreprise_id: string;

  nom: string;

  categorie:
    | CategorieArticle
    | string;

  unite:
    string | null;

  description:
    string | null;

  icone:
    string | null;

  couleur:
    string | null;

  actif:
    boolean | null;

  ordre:
    number | null;
};

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

  date_fin_prevue:
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

  fiche_id: string;

  article_id:
    string | null;

  nom:
    string;

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

  entreprise_id?:
    string;

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

type FormulaireCreation = {
  devis_id: string;

  type_intervention_id:
    string;

  titre:
    string;

  date_prevue:
    string;

  date_fin_prevue:
    string;

  heure_debut_prevue:
    string;

  heure_fin_prevue:
    string;

  adresse_chantier:
    string;

  code_postal_chantier:
    string;

  ville_chantier:
    string;

  notes_chantier:
    string;

  notes_internes:
    string;
};

type Affectation = {
  role_chantier:
    string;

  heure_arrivee_prevue:
    string;

  heure_depart_prevue:
    string;
};

function dateLocaleIso(
  date = new Date()
) {
  const annee =
    date.getFullYear();

  const mois =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const jour =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${annee}-${mois}-${jour}`;
}

function FORMULAIRE_VIDE():
  FormulaireCreation {
  const aujourdHui =
    dateLocaleIso();

  return {
    devis_id:
      "",

    type_intervention_id:
      "",

    titre:
      "",

    date_prevue:
      aujourdHui,

    date_fin_prevue:
      aujourdHui,

    heure_debut_prevue:
      "08:00",

    heure_fin_prevue:
      "17:00",

    adresse_chantier:
      "",

    code_postal_chantier:
      "",

    ville_chantier:
      "",

    notes_chantier:
      "",

    notes_internes:
      "",
  };
}

function nettoyerTexte(
  valeur: string
) {
  const texte =
    valeur.trim();

  return texte ||
    null;
}

function nomClient(
  client:
    Client | null
) {
  if (
    !client
  ) {
    return "Client";
  }

  if (
    client.type_client ===
    "entreprise" ||
    client.type_client ===
    "collectivite"
  ) {
    return (
      client.entreprise ||
      client.nom ||
      "Client"
    );
  }

  const nom =
    `${client.prenom || ""} ${
      client.nom || ""
    }`.trim();

  return (
    nom ||
    "Client"
  );
}

function nomSalarie(
  salarie:
    Salarie | null
) {
  if (
    !salarie
  ) {
    return "Salarié";
  }

  const nom =
    `${salarie.prenom || ""} ${
      salarie.nom || ""
    }`.trim();

  return (
    nom ||
    salarie.email ||
    "Salarié"
  );
}

function titreFiche(
  fiche:
    FicheIntervention
) {
  return (
    fiche.titre ||
    fiche.type_intervention ||
    "Intervention"
  );
}

function adresseFiche(
  fiche:
    FicheIntervention
) {
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

  const ligneVille =
    [
      cp,
      ville,
    ]
      .filter(Boolean)
      .join(" ");

  return [
    adresse,
    ligneVille,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatDate(
  valeur:
    | string
    | null
    | undefined
) {
  if (
    !valeur
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
        `${valeur}T12:00:00`
      )
    );
  } catch {
    return valeur;
  }
}

function formatMontant(
  valeur:
    | number
    | null
    | undefined
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style:
        "currency",

      currency:
        "EUR",
    }
  ).format(
    Number(
      valeur ||
        0
    )
  );
}

function formatHeure(
  valeur:
    | string
    | null
    | undefined
) {
  if (
    !valeur
  ) {
    return "—";
  }

  return valeur.slice(
    0,
    5
  );
}

function statutNormalise(
  statut:
    | string
    | null
    | undefined
): StatutFiche {
  if (
    statut ===
      "planifiee" ||
    statut ===
      "en_cours" ||
    statut ===
      "terminee" ||
    statut ===
      "annulee" ||
    statut ===
      "archivee"
  ) {
    return statut;
  }

  return "brouillon";
}

function libelleStatut(
  statut:
    | string
    | null
    | undefined
) {
  const valeur =
    statutNormalise(
      statut
    );

  if (
    valeur ===
    "planifiee"
  ) {
    return "Planifiée";
  }

  if (
    valeur ===
    "en_cours"
  ) {
    return "En cours";
  }

  if (
    valeur ===
    "terminee"
  ) {
    return "Terminée";
  }

  if (
    valeur ===
    "annulee"
  ) {
    return "Annulée";
  }

  if (
    valeur ===
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
  return `interventions-mobile-status interventions-mobile-status-${statutNormalise(
    statut
  )}`;
}

function libelleEtape(
  statut:
    | string
    | null
    | undefined
) {
  if (
    statut ===
    "valide"
  ) {
    return "Validée";
  }

  if (
    statut ===
    "en_cours"
  ) {
    return "En cours";
  }

  if (
    statut ===
    "probleme"
  ) {
    return "Problème";
  }

  if (
    statut ===
    "a_preparer"
  ) {
    return "À préparer";
  }

  return "En attente";
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
    return "✓";
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
      "consigne_securite" ||
    categorie ===
      "consigne_chantier"
  ) {
    return "🦺";
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
    return "Travaux";
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

export default function InterventionsChefMobile({
  entrepriseId,
  onFermer,
  ficheIdInitiale = null,
  devisIdInitial = null,
  onFicheCree,
}: Props) {
  const [
    clients,
    setClients,
  ] =
    useState<
      Client[]
    >([]);

  const [
    salaries,
    setSalaries,
  ] =
    useState<
      Salarie[]
    >([]);

  const [
    devis,
    setDevis,
  ] =
    useState<
      Devis[]
    >([]);

  const [
    lignesDevis,
    setLignesDevis,
  ] =
    useState<
      DevisLigne[]
    >([]);

  const [
    articles,
    setArticles,
  ] =
    useState<
      ArticleIntervention[]
    >([]);

  const [
    fiches,
    setFiches,
  ] =
    useState<
      FicheIntervention[]
    >([]);

  const [
    elementsFiches,
    setElementsFiches,
  ] =
    useState<
      FicheElement[]
    >([]);

  const [
    salariesFiches,
    setSalariesFiches,
  ] =
    useState<
      FicheSalarie[]
    >([]);

  const [
    ficheOuverte,
    setFicheOuverte,
  ] =
    useState<
      FicheIntervention | null
    >(
      null
    );

  const [
    creationOuverte,
    setCreationOuverte,
  ] =
    useState(
      false
    );

  const [
    etapeCreation,
    setEtapeCreation,
  ] =
    useState<EtapeCreation>(
      1
    );

  const [
    ongletElements,
    setOngletElements,
  ] =
    useState<OngletElements>(
      "travaux"
    );

  const [
    formulaire,
    setFormulaire,
  ] =
    useState<FormulaireCreation>(
      FORMULAIRE_VIDE()
    );

  const [
    elementsSelectionnes,
    setElementsSelectionnes,
  ] =
    useState<
      string[]
    >([]);

  const [
    salariesSelectionnes,
    setSalariesSelectionnes,
  ] =
    useState<
      string[]
    >([]);

  const [
    affectations,
    setAffectations,
  ] =
    useState<
      Record<
        string,
        Affectation
      >
    >({});

  const [
    recherche,
    setRecherche,
  ] =
    useState(
      ""
    );

  const [
    filtreStatut,
    setFiltreStatut,
  ] =
    useState<FiltreStatut>(
      "tous"
    );

  const [
    chargement,
    setChargement,
  ] =
    useState(
      true
    );

  const [
    chargementLignes,
    setChargementLignes,
  ] =
    useState(
      false
    );

  const [
    enregistrement,
    setEnregistrement,
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
    message,
    setMessage,
  ] =
    useState(
      ""
    );

  useEffect(() => {
    void initialiser();
  }, [
    entrepriseId,
  ]);

  async function initialiser() {
    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      const [
        clientsResult,
        salariesResult,
        devisResult,
        articlesResult,
        fichesResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "clients"
            )
            .select(
              "*"
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .neq(
              "statut",
              "archive"
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            ),

          supabase
            .from(
              "salaries"
            )
            .select(
              "*"
            )
            .eq(
              "entreprise_id",
              entrepriseId
            ),

          supabase
            .from(
              "devis"
            )
            .select(
              "*"
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .in(
              "statut",
              [
                "accepte",
                "envoye",
                "brouillon",
                "facture",
              ]
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            ),

          supabase
            .from(
              "articles_intervention"
            )
            .select(
              "*"
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .eq(
              "actif",
              true
            )
            .order(
              "categorie",
              {
                ascending:
                  true,
              }
            )
            .order(
              "ordre",
              {
                ascending:
                  true,
              }
            )
            .order(
              "nom",
              {
                ascending:
                  true,
              }
            ),

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
            .order(
              "date_prevue",
              {
                ascending:
                  true,
              }
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            ),
        ]);

      if (
        clientsResult.error
      ) {
        throw clientsResult.error;
      }

      if (
        salariesResult.error
      ) {
        throw salariesResult.error;
      }

      if (
        devisResult.error
      ) {
        throw devisResult.error;
      }

      if (
        articlesResult.error
      ) {
        throw articlesResult.error;
      }

      if (
        fichesResult.error
      ) {
        throw fichesResult.error;
      }

      const clientsCharges =
        (
          clientsResult.data ||
          []
        ) as Client[];

      const salariesCharges =
        (
          salariesResult.data ||
          []
        ) as Salarie[];

      const devisCharges =
        (
          devisResult.data ||
          []
        ) as Devis[];

      const articlesCharges =
        (
          articlesResult.data ||
          []
        ) as ArticleIntervention[];

      const fichesChargees =
        (
          fichesResult.data ||
          []
        ) as FicheIntervention[];

      setClients(
        clientsCharges
      );

      setSalaries(
        salariesCharges.filter(
          (
            salarie
          ) =>
            salarie.statut !==
              "archive" &&
            salarie.statut !==
              "inactif"
        )
      );

      setDevis(
        devisCharges
      );

      setArticles(
        articlesCharges
      );

      setFiches(
        fichesChargees
      );

      await chargerRelationsFiches(
        fichesChargees
      );

      if (
        ficheIdInitiale
      ) {
        const fiche =
          fichesChargees.find(
            (
              item
            ) =>
              item.id ===
              ficheIdInitiale
          );

        if (
          fiche
        ) {
          setFicheOuverte(
            fiche
          );
        }
      }

      if (
        devisIdInitial
      ) {
        const devisExiste =
          devisCharges.some(
            (
              item
            ) =>
              item.id ===
              devisIdInitial
          );

        if (
          devisExiste
        ) {
          ouvrirCreation();

          window.setTimeout(
            () => {
              void selectionnerDevis(
                devisIdInitial
              );
            },
            0
          );
        }
      }
    } catch (error) {
      console.error(
        "Initialisation interventions mobile :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger les interventions."
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  async function rechargerFiches() {
    const {
      data,
      error,
    } =
      await supabase
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
        .order(
          "date_prevue",
          {
            ascending:
              true,
          }
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    if (
      error
    ) {
      throw error;
    }

    const liste =
      (
        data ||
        []
      ) as FicheIntervention[];

    setFiches(
      liste
    );

    await chargerRelationsFiches(
      liste
    );

    return liste;
  }

  async function chargerRelationsFiches(
    liste:
      FicheIntervention[]
  ) {
    const ids =
      liste.map(
        (
          fiche
        ) =>
          fiche.id
      );

    if (
      ids.length ===
      0
    ) {
      setElementsFiches(
        []
      );

      setSalariesFiches(
        []
      );

      return;
    }

    const [
      elementsResult,
      salariesResult,
    ] =
      await Promise.all([
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
          .in(
            "fiche_id",
            ids
          )
          .order(
            "ordre",
            {
              ascending:
                true,
            }
          ),

        supabase
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
          .in(
            "fiche_id",
            ids
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            }
          ),
      ]);

    if (
      elementsResult.error
    ) {
      throw elementsResult.error;
    }

    if (
      salariesResult.error
    ) {
      throw salariesResult.error;
    }

    setElementsFiches(
      (
        elementsResult.data ||
        []
      ) as FicheElement[]
    );

    setSalariesFiches(
      (
        salariesResult.data ||
        []
      ) as FicheSalarie[]
    );
  }

  function trouverClient(
    clientId:
      | string
      | null
      | undefined
  ) {
    if (
      !clientId
    ) {
      return null;
    }

    return (
      clients.find(
        (
          client
        ) =>
          client.id ===
          clientId
      ) ||
      null
    );
  }

  function trouverSalarie(
    salarieId:
      | string
      | null
      | undefined
  ) {
    if (
      !salarieId
    ) {
      return null;
    }

    return (
      salaries.find(
        (
          salarie
        ) =>
          salarie.id ===
          salarieId
      ) ||
      null
    );
  }

  function elementsDeFiche(
    ficheId:
      string
  ) {
    return elementsFiches.filter(
      (
        element
      ) =>
        element.fiche_id ===
        ficheId
    );
  }

  function salariesDeFiche(
    fiche:
      FicheIntervention
  ) {
    const liste =
      salariesFiches.filter(
        (
          item
        ) =>
          item.fiche_id ===
          fiche.id
      );

    if (
      liste.length >
      0
    ) {
      return liste;
    }

    if (
      fiche.salarie_id ||
      fiche.salarie_nom
    ) {
      return [
        {
          id:
            `legacy-${fiche.id}`,

          fiche_id:
            fiche.id,

          salarie_id:
            fiche.salarie_id,

          salarie_nom:
            fiche.salarie_nom,

          role_chantier:
            "Intervenant",

          heure_arrivee_prevue:
            fiche.heure_debut_prevue,

          heure_depart_prevue:
            fiche.heure_fin_prevue,

          heure_arrivee_reelle:
            fiche.heure_debut_reelle,

          heure_depart_reelle:
            fiche.heure_fin_reelle,
        },
      ] as FicheSalarie[];
    }

    return [];
  }

  const typesIntervention =
    useMemo(
      () =>
        articles.filter(
          (
            article
          ) =>
            article.categorie ===
            "type_intervention"
        ),
      [
        articles,
      ]
    );

  const articlesParCategorie =
    useMemo(() => {
      const resultat:
        Record<
          string,
          ArticleIntervention[]
        > = {};

      articles.forEach(
        (
          article
        ) => {
          if (
            !resultat[
              article.categorie
            ]
          ) {
            resultat[
              article.categorie
            ] = [];
          }

          resultat[
            article.categorie
          ].push(
            article
          );
        }
      );

      return resultat;
    }, [
      articles,
    ]);

  const devisSelectionne =
    useMemo(
      () =>
        devis.find(
          (
            item
          ) =>
            item.id ===
            formulaire.devis_id
        ) ||
        null,
      [
        devis,
        formulaire.devis_id,
      ]
    );

  const typeSelectionne =
    useMemo(
      () =>
        articles.find(
          (
            article
          ) =>
            article.id ===
            formulaire.type_intervention_id
        ) ||
        null,
      [
        articles,
        formulaire.type_intervention_id,
      ]
    );

  const statistiques =
    useMemo(() => {
      const nonArchivees =
        fiches.filter(
          (
            fiche
          ) =>
            fiche.statut !==
            "archivee"
        );

      return {
        total:
          nonArchivees.length,

        planifiees:
          nonArchivees.filter(
            (
              fiche
            ) =>
              fiche.statut ===
              "planifiee"
          ).length,

        enCours:
          nonArchivees.filter(
            (
              fiche
            ) =>
              fiche.statut ===
              "en_cours"
          ).length,

        terminees:
          nonArchivees.filter(
            (
              fiche
            ) =>
              fiche.statut ===
              "terminee"
          ).length,

        problemes:
          nonArchivees.filter(
            (
              fiche
            ) =>
              fiche.probleme_signale ===
              true
          ).length,
      };
    }, [
      fiches,
    ]);

  const fichesFiltrees =
    useMemo(() => {
      const texte =
        recherche
          .trim()
          .toLowerCase();

      return fiches.filter(
        (
          fiche
        ) => {
          const statut =
            statutNormalise(
              fiche.statut
            );

          if (
            filtreStatut ===
            "tous"
          ) {
            if (
              statut ===
              "archivee"
            ) {
              return false;
            }
          } else if (
            statut !==
            filtreStatut
          ) {
            return false;
          }

          if (
            !texte
          ) {
            return true;
          }

          const equipe =
            salariesDeFiche(
              fiche
            )
              .map(
                (
                  item
                ) =>
                  item.salarie_nom ||
                  ""
              )
              .join(
                " "
              );

          const elements =
            elementsDeFiche(
              fiche.id
            )
              .map(
                (
                  element
                ) =>
                  element.nom
              )
              .join(
                " "
              );

          const zone = [
            fiche.numero,
            fiche.titre,
            fiche.client_nom,
            fiche.type_intervention,
            fiche.adresse_chantier,
            fiche.code_postal_chantier,
            fiche.ville_chantier,
            fiche.notes_chantier,
            fiche.travaux_prevus,
            fiche.materiel_prevu,
            equipe,
            elements,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return zone.includes(
            texte
          );
        }
      );
    }, [
      fiches,
      recherche,
      filtreStatut,
      elementsFiches,
      salariesFiches,
    ]);

  function ouvrirCreation() {
    setCreationOuverte(
      true
    );

    setEtapeCreation(
      1
    );

    setOngletElements(
      "travaux"
    );

    setFormulaire(
      FORMULAIRE_VIDE()
    );

    setLignesDevis(
      []
    );

    setElementsSelectionnes(
      []
    );

    setSalariesSelectionnes(
      []
    );

    setAffectations(
      {}
    );

    setErreur(
      ""
    );

    setMessage(
      ""
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  function fermerCreation() {
    if (
      enregistrement
    ) {
      return;
    }

    setCreationOuverte(
      false
    );

    setEtapeCreation(
      1
    );

    setFormulaire(
      FORMULAIRE_VIDE()
    );

    setLignesDevis(
      []
    );

    setElementsSelectionnes(
      []
    );

    setSalariesSelectionnes(
      []
    );

    setAffectations(
      {}
    );

    setErreur(
      ""
    );
  }

  function modifierChamp<
    K extends keyof FormulaireCreation
  >(
    champ: K,
    valeur:
      FormulaireCreation[K]
  ) {
    setFormulaire(
      (
        ancien
      ) => ({
        ...ancien,

        [champ]:
          valeur,
      })
    );
  }

  function modifierDateDebut(
    valeur: string
  ) {
    setFormulaire(
      (
        ancien
      ) => ({
        ...ancien,

        date_prevue:
          valeur,

        date_fin_prevue:
          !ancien.date_fin_prevue ||
          ancien.date_fin_prevue <
            valeur
            ? valeur
            : ancien.date_fin_prevue,
      })
    );
  }

  async function selectionnerDevis(
    devisId: string
  ) {
    setChargementLignes(
      true
    );

    setErreur(
      ""
    );

    try {
      const item =
        devis.find(
          (
            devisItem
          ) =>
            devisItem.id ===
            devisId
        );

      if (
        !item
      ) {
        setFormulaire(
          (
            ancien
          ) => ({
            ...ancien,

            devis_id:
              devisId,
          })
        );

        setLignesDevis(
          []
        );

        return;
      }

      const client =
        trouverClient(
          item.client_id
        );

      const adresse =
        item.adresse_chantier ||
        client?.adresse_chantier ||
        client?.adresse ||
        "";

      const cp =
        item.code_postal_chantier ||
        client?.code_postal_chantier ||
        client?.code_postal ||
        "";

      const ville =
        item.ville_chantier ||
        client?.ville_chantier ||
        client?.ville ||
        "";

      const notes =
        item.notes_chantier ||
        client?.notes_chantier ||
        "";

      setFormulaire(
        (
          ancien
        ) => ({
          ...ancien,

          devis_id:
            item.id,

          titre:
            item.objet ||
            `Intervention ${
              item.numero ||
              ""
            }`.trim(),

          adresse_chantier:
            adresse,

          code_postal_chantier:
            cp,

          ville_chantier:
            ville,

          notes_chantier:
            notes,
        })
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "devis_lignes"
          )
          .select(
            "*"
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "devis_id",
            item.id
          )
          .order(
            "ordre",
            {
              ascending:
                true,
            }
          );

      if (
        error
      ) {
        throw error;
      }

      const lignes =
        (
          data ||
          []
        ) as DevisLigne[];

      setLignesDevis(
        lignes
      );

      setElementsSelectionnes(
        lignes.map(
          (
            ligne
          ) =>
            `ligne-devis-${ligne.id}`
        )
      );
    } catch (error) {
      console.error(
        "Sélection devis intervention mobile :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger le devis."
      );
    } finally {
      setChargementLignes(
        false
      );
    }
  }

  function basculerElement(
    id: string
  ) {
    setElementsSelectionnes(
      (
        anciens
      ) =>
        anciens.includes(
          id
        )
          ? anciens.filter(
              (
                item
              ) =>
                item !==
                id
            )
          : [
              ...anciens,
              id,
            ]
    );
  }

  function basculerSalarie(
    salarieId:
      string
  ) {
    setSalariesSelectionnes(
      (
        anciens
      ) => {
        if (
          anciens.includes(
            salarieId
          )
        ) {
          setAffectations(
            (
              anciennes
            ) => {
              const copie =
                {
                  ...anciennes,
                };

              delete copie[
                salarieId
              ];

              return copie;
            }
          );

          return anciens.filter(
            (
              id
            ) =>
              id !==
              salarieId
          );
        }

        setAffectations(
          (
            anciennes
          ) => ({
            ...anciennes,

            [salarieId]: {
              role_chantier:
                "Intervenant",

              heure_arrivee_prevue:
                formulaire.heure_debut_prevue ||
                "08:00",

              heure_depart_prevue:
                formulaire.heure_fin_prevue ||
                "17:00",
            },
          })
        );

        return [
          ...anciens,
          salarieId,
        ];
      }
    );
  }

  function modifierAffectation(
    salarieId: string,
    champ:
      keyof Affectation,
    valeur: string
  ) {
    setAffectations(
      (
        anciennes
      ) => ({
        ...anciennes,

        [salarieId]: {
          role_chantier:
            anciennes[
              salarieId
            ]?.role_chantier ||
            "Intervenant",

          heure_arrivee_prevue:
            anciennes[
              salarieId
            ]?.heure_arrivee_prevue ||
            formulaire.heure_debut_prevue,

          heure_depart_prevue:
            anciennes[
              salarieId
            ]?.heure_depart_prevue ||
            formulaire.heure_fin_prevue,

          [champ]:
            valeur,
        },
      })
    );
  }

  function validerEtape1() {
    if (
      !formulaire.devis_id
    ) {
      setErreur(
        "Sélectionnez le devis correspondant au chantier."
      );

      return false;
    }

    if (
      !formulaire.type_intervention_id
    ) {
      setErreur(
        "Sélectionnez le type d’intervention."
      );

      return false;
    }

    if (
      !formulaire.titre.trim()
    ) {
      setErreur(
        "Renseignez le titre de l’intervention."
      );

      return false;
    }

    if (
      !formulaire.date_prevue ||
      !formulaire.date_fin_prevue
    ) {
      setErreur(
        "Renseignez les dates prévues."
      );

      return false;
    }

    if (
      formulaire.date_fin_prevue <
      formulaire.date_prevue
    ) {
      setErreur(
        "La date de fin doit être égale ou postérieure à la date de début."
      );

      return false;
    }

    if (
      !formulaire.heure_debut_prevue ||
      !formulaire.heure_fin_prevue
    ) {
      setErreur(
        "Renseignez les horaires prévus."
      );

      return false;
    }

    if (
      formulaire.heure_fin_prevue <=
      formulaire.heure_debut_prevue
    ) {
      setErreur(
        "L’heure de fin doit être après l’heure de début."
      );

      return false;
    }

    if (
      !formulaire.adresse_chantier.trim() ||
      !formulaire.code_postal_chantier.trim() ||
      !formulaire.ville_chantier.trim()
    ) {
      setErreur(
        "Renseignez l’adresse complète du chantier."
      );

      return false;
    }

    setErreur(
      ""
    );

    return true;
  }

  function validerEtape2() {
    if (
      salariesSelectionnes.length ===
      0
    ) {
      setErreur(
        "Sélectionnez au moins un salarié."
      );

      return false;
    }

    for (
      const salarieId of
      salariesSelectionnes
    ) {
      const affectation =
        affectations[
          salarieId
        ];

      const arrivee =
        affectation?.heure_arrivee_prevue ||
        formulaire.heure_debut_prevue;

      const depart =
        affectation?.heure_depart_prevue ||
        formulaire.heure_fin_prevue;

      if (
        !arrivee ||
        !depart
      ) {
        setErreur(
          "Renseignez les horaires de l’équipe."
        );

        return false;
      }

      if (
        depart <=
        arrivee
      ) {
        setErreur(
          `Les horaires de ${nomSalarie(
            trouverSalarie(
              salarieId
            )
          )} sont invalides.`
        );

        return false;
      }
    }

    setErreur(
      ""
    );

    return true;
  }

  function continuerCreation() {
    if (
      etapeCreation ===
        1 &&
      !validerEtape1()
    ) {
      return;
    }

    if (
      etapeCreation ===
        2 &&
      !validerEtape2()
    ) {
      return;
    }

    setErreur(
      ""
    );

    setEtapeCreation(
      (
        ancienne
      ) =>
        Math.min(
          3,
          ancienne +
            1
        ) as EtapeCreation
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  function revenirCreation() {
    setErreur(
      ""
    );

    setEtapeCreation(
      (
        ancienne
      ) =>
        Math.max(
          1,
          ancienne -
            1
        ) as EtapeCreation
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  async function enregistrerFiche() {
    if (
      !validerEtape1() ||
      !validerEtape2()
    ) {
      return;
    }

    if (
      !devisSelectionne
    ) {
      setErreur(
        "Le devis sélectionné est introuvable."
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

      setMessage(
        ""
      );

      const {
        data:
          salariesDb,
        error:
          salariesError,
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
          .in(
            "id",
            salariesSelectionnes
          );

      if (
        salariesError
      ) {
        throw salariesError;
      }

      const salariesAssocies =
        (
          salariesDb ||
          []
        ) as Salarie[];

      if (
        salariesAssocies.length !==
        salariesSelectionnes.length
      ) {
        throw new Error(
          "Un salarié sélectionné est introuvable."
        );
      }

      const salariesParId =
        new Map(
          salariesAssocies.map(
            (
              salarie
            ) => [
              salarie.id,
              salarie,
            ]
          )
        );

      const salariesOrdonnes =
        salariesSelectionnes
          .map(
            (
              id
            ) =>
              salariesParId.get(
                id
              )
          )
          .filter(
            Boolean
          ) as Salarie[];

      const premierSalarie =
        salariesOrdonnes[
          0
        ] ||
        null;

      const client =
        trouverClient(
          devisSelectionne.client_id
        );

      const articlesSelectionnes =
        articles.filter(
          (
            article
          ) =>
            elementsSelectionnes.includes(
              article.id
            )
        );

      const lignesSelectionnees =
        lignesDevis.filter(
          (
            ligne
          ) =>
            elementsSelectionnes.includes(
              `ligne-devis-${ligne.id}`
            )
        );

      const travauxTexte =
        [
          ...lignesSelectionnees.map(
            (
              ligne
            ) =>
              ligne.designation ||
              ""
          ),

          ...articlesSelectionnes
            .filter(
              (
                article
              ) =>
                article.categorie ===
                "travaux"
            )
            .map(
              (
                article
              ) =>
                article.nom
            ),
        ]
          .filter(Boolean)
          .join(
            "\n"
          );

      const materielTexte =
        articlesSelectionnes
          .filter(
            (
              article
            ) =>
              article.categorie ===
              "materiel"
          )
          .map(
            (
              article
            ) =>
              article.nom
          )
          .join(
            "\n"
          );

      const materiauxTexte =
        articlesSelectionnes
          .filter(
            (
              article
            ) =>
              article.categorie ===
              "materiaux"
          )
          .map(
            (
              article
            ) =>
              article.nom
          )
          .join(
            "\n"
          );

      const consignesTexte =
        articlesSelectionnes
          .filter(
            (
              article
            ) =>
              article.categorie ===
                "consigne_securite" ||
              article.categorie ===
                "consigne_chantier"
          )
          .map(
            (
              article
            ) =>
              article.nom
          )
          .join(
            "\n"
          );

      const payload = {
        entreprise_id:
          entrepriseId,

        devis_id:
          devisSelectionne.id,

        facture_id:
          null,

        client_id:
          devisSelectionne.client_id,

        client_nom:
          devisSelectionne.client_nom ||
          nomClient(
            client
          ),

        salarie_id:
          premierSalarie?.id ||
          null,

        salarie_nom:
          premierSalarie
            ? nomSalarie(
                premierSalarie
              )
            : null,

        titre:
          nettoyerTexte(
            formulaire.titre
          ),

        type_intervention:
          typeSelectionne?.nom ||
          "Intervention",

        statut:
          "planifiee",

        date_intervention:
          formulaire.date_prevue,

        heure_debut:
          formulaire.heure_debut_prevue,

        heure_fin:
          formulaire.heure_fin_prevue,

        date_prevue:
          formulaire.date_prevue,

        date_fin_prevue:
          formulaire.date_fin_prevue,

        heure_debut_prevue:
          formulaire.heure_debut_prevue,

        heure_fin_prevue:
          formulaire.heure_fin_prevue,

        adresse:
          nettoyerTexte(
            formulaire.adresse_chantier
          ),

        code_postal:
          nettoyerTexte(
            formulaire.code_postal_chantier
          ),

        ville:
          nettoyerTexte(
            formulaire.ville_chantier
          ),

        adresse_chantier:
          nettoyerTexte(
            formulaire.adresse_chantier
          ),

        code_postal_chantier:
          nettoyerTexte(
            formulaire.code_postal_chantier
          ),

        ville_chantier:
          nettoyerTexte(
            formulaire.ville_chantier
          ),

        notes_chantier:
          nettoyerTexte(
            formulaire.notes_chantier
          ),

        travaux_prevus:
          nettoyerTexte(
            travauxTexte
          ) ||
          nettoyerTexte(
            devisSelectionne.description ||
            ""
          ),

        materiel_prevu:
          nettoyerTexte(
            [
              materielTexte,
              materiauxTexte,
            ]
              .filter(Boolean)
              .join(
                "\n"
              )
          ),

        consignes_securite:
          nettoyerTexte(
            consignesTexte
          ),

        notes_internes:
          nettoyerTexte(
            formulaire.notes_internes
          ),

        etape_materiel_statut:
          "a_preparer",

        etape_arrivee_statut:
          "en_attente",

        etape_fin_statut:
          "en_attente",

        probleme_signale:
          false,
      };

      const {
        data:
          ficheData,
        error:
          ficheError,
      } =
        await supabase
          .from(
            "fiches_intervention"
          )
          .insert(
            payload
          )
          .select(
            "*"
          )
          .single();

      if (
        ficheError ||
        !ficheData?.id
      ) {
        throw (
          ficheError ||
          new Error(
            "Impossible de créer la fiche."
          )
        );
      }

      const fiche =
        ficheData as FicheIntervention;

      const elementsAInserer = [
        ...lignesSelectionnees.map(
          (
            ligne,
            index
          ) => ({
            entreprise_id:
              entrepriseId,

            fiche_id:
              fiche.id,

            article_id:
              null,

            devis_ligne_id:
              ligne.id,

            nom:
              ligne.designation ||
              "Ligne du devis",

            categorie:
              "travaux",

            icone:
              "📄",

            couleur:
              "blue",

            quantite_prevue:
              Number(
                ligne.quantite ||
                  1
              ),

            unite:
              ligne.unite ||
              "u",

            obligatoire:
              true,

            coche_prepare:
              false,

            commentaire_chef:
              ligne.description ||
              null,

            ordre:
              index +
              1,
          })
        ),

        ...articlesSelectionnes.map(
          (
            article,
            index
          ) => ({
            entreprise_id:
              entrepriseId,

            fiche_id:
              fiche.id,

            article_id:
              article.id,

            devis_ligne_id:
              null,

            nom:
              article.nom,

            categorie:
              article.categorie,

            icone:
              article.icone,

            couleur:
              article.couleur,

            quantite_prevue:
              1,

            unite:
              article.unite ||
              "u",

            obligatoire:
              true,

            coche_prepare:
              false,

            commentaire_chef:
              article.description,

            ordre:
              index +
              100,
          })
        ),
      ];

      if (
        elementsAInserer.length >
        0
      ) {
        const {
          error,
        } =
          await supabase
            .from(
              "fiches_intervention_elements"
            )
            .insert(
              elementsAInserer
            );

        if (
          error
        ) {
          throw error;
        }
      }

      const salariesAInserer =
        salariesOrdonnes.map(
          (
            salarie
          ) => {
            const affectation =
              affectations[
                salarie.id
              ];

            return {
              entreprise_id:
                entrepriseId,

              fiche_id:
                fiche.id,

              salarie_id:
                salarie.id,

              salarie_nom:
                nomSalarie(
                  salarie
                ),

              role_chantier:
                affectation?.role_chantier ||
                "Intervenant",

              heure_arrivee_prevue:
                affectation?.heure_arrivee_prevue ||
                formulaire.heure_debut_prevue,

              heure_depart_prevue:
                affectation?.heure_depart_prevue ||
                formulaire.heure_fin_prevue,
            };
          }
        );

      const {
        data:
          affectationsCreees,
        error:
          affectationsError,
      } =
        await supabase
          .from(
            "fiches_intervention_salaries"
          )
          .upsert(
            salariesAInserer,
            {
              onConflict:
                "fiche_id,salarie_id",
            }
          )
          .select(
            "id, fiche_id, salarie_id"
          );

      if (
        affectationsError
      ) {
        throw affectationsError;
      }

      if (
        !affectationsCreees ||
        affectationsCreees.length !==
          salariesAInserer.length
      ) {
        throw new Error(
          "L’équipe n’a pas été enregistrée correctement."
        );
      }

      const liste =
        await rechargerFiches();

      const ficheRechargee =
        liste.find(
          (
            item
          ) =>
            item.id ===
            fiche.id
        ) ||
        fiche;

      setCreationOuverte(
        false
      );

      setFicheOuverte(
        ficheRechargee
      );

      setMessage(
        `Fiche ${
          fiche.numero ||
          ""
        } créée et planifiée.`
      );

      if (
        onFicheCree
      ) {
        onFicheCree(
          fiche.id
        );
      }

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });
    } catch (error) {
      console.error(
        "Création intervention mobile :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de créer la fiche d’intervention."
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  function categoriesOnglet() {
    if (
      ongletElements ===
      "travaux"
    ) {
      return [
        "travaux",
      ];
    }

    if (
      ongletElements ===
      "materiel"
    ) {
      return [
        "materiel",
      ];
    }

    if (
      ongletElements ===
      "materiaux"
    ) {
      return [
        "materiaux",
      ];
    }

    return [
      "consigne_securite",
      "consigne_chantier",
    ];
  }

  const articlesOnglet =
    useMemo(() => {
      const categories =
        categoriesOnglet();

      return articles.filter(
        (
          article
        ) =>
          categories.includes(
            article.categorie
          )
      );
    }, [
      articles,
      ongletElements,
    ]);

  /*
   * ======================================================
   * CREATION
   * ======================================================
   */

  if (
    creationOuverte
  ) {
    return (
      <main className="interventions-mobile">
        <header className="interventions-mobile-header">
          <button
            type="button"
            className="interventions-mobile-back"
            onClick={
              fermerCreation
            }
          >
            ‹
          </button>

          <div>
            <h1>
              Nouvelle intervention
            </h1>

            <span>
              Étape{" "}
              {etapeCreation}
              /3
            </span>
          </div>

          <div className="interventions-mobile-header-space" />
        </header>

        <div className="interventions-mobile-creation-content">
          <div className="interventions-mobile-progress">
            {[1, 2, 3].map(
              (
                numero
              ) => (
                <div
                  key={
                    numero
                  }
                  className={
                    numero <=
                    etapeCreation
                      ? "active"
                      : ""
                  }
                >
                  <span>
                    {numero <
                    etapeCreation
                      ? "✓"
                      : numero}
                  </span>

                  <small>
                    {numero ===
                    1
                      ? "Chantier"
                      : numero ===
                          2
                        ? "Équipe"
                        : "Validation"}
                  </small>
                </div>
              )
            )}
          </div>

          {erreur ? (
            <div className="interventions-mobile-error">
              {erreur}
            </div>
          ) : null}

          {/*
           * ===============================================
           * ETAPE 1
           * ===============================================
           */}

          {etapeCreation ===
          1 ? (
            <>
              <section className="interventions-mobile-form-card">
                <span className="interventions-mobile-eyebrow">
                  1 • DEVIS
                </span>

                <h2>
                  Quel chantier ?
                </h2>

                <p className="interventions-mobile-helper">
                  Une intervention Arboboard part toujours d’un devis.
                </p>

                <label className="interventions-mobile-field">
                  <span>
                    Devis *
                  </span>

                  <select
                    value={
                      formulaire.devis_id
                    }
                    onChange={(
                      event
                    ) =>
                      void selectionnerDevis(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Sélectionner un devis
                    </option>

                    {devis.map(
                      (
                        item
                      ) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {item.numero ||
                            "Devis"}{" "}
                          —{" "}
                          {item.client_nom ||
                            "Client"}{" "}
                          —{" "}
                          {formatMontant(
                            item.total_ttc
                          )}
                        </option>
                      )
                    )}
                  </select>
                </label>

                {chargementLignes ? (
                  <div className="interventions-mobile-inline-loading">
                    Chargement du devis…
                  </div>
                ) : null}

                {devisSelectionne ? (
                  <div className="interventions-mobile-selected-quote">
                    <div>
                      <small>
                        {
                          devisSelectionne.numero
                        }
                      </small>

                      <strong>
                        {devisSelectionne.client_nom ||
                          "Client"}
                      </strong>

                      <span>
                        {devisSelectionne.objet ||
                          "Sans objet"}
                      </span>
                    </div>

                    <b>
                      {formatMontant(
                        devisSelectionne.total_ttc
                      )}
                    </b>
                  </div>
                ) : null}
              </section>

              <section className="interventions-mobile-form-card">
                <span className="interventions-mobile-eyebrow">
                  2 • INTERVENTION
                </span>

                <label className="interventions-mobile-field">
                  <span>
                    Type d’intervention *
                  </span>

                  <select
                    value={
                      formulaire.type_intervention_id
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "type_intervention_id",
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Choisir un type
                    </option>

                    {typesIntervention.map(
                      (
                        type
                      ) => (
                        <option
                          key={
                            type.id
                          }
                          value={
                            type.id
                          }
                        >
                          {type.icone ||
                            "🛠"}{" "}
                          {type.nom}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="interventions-mobile-field">
                  <span>
                    Titre *
                  </span>

                  <input
                    type="text"
                    value={
                      formulaire.titre
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "titre",
                        event.target.value
                      )
                    }
                    placeholder="Ex : Taille de haie"
                  />
                </label>
              </section>

              <section className="interventions-mobile-form-card">
                <span className="interventions-mobile-eyebrow">
                  3 • DATE
                </span>

                <div className="interventions-mobile-form-grid">
                  <label className="interventions-mobile-field">
                    <span>
                      Début *
                    </span>

                    <input
                      type="date"
                      value={
                        formulaire.date_prevue
                      }
                      onChange={(
                        event
                      ) =>
                        modifierDateDebut(
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="interventions-mobile-field">
                    <span>
                      Fin *
                    </span>

                    <input
                      type="date"
                      value={
                        formulaire.date_fin_prevue
                      }
                      min={
                        formulaire.date_prevue
                      }
                      onChange={(
                        event
                      ) =>
                        modifierChamp(
                          "date_fin_prevue",
                          event.target.value
                        )
                      }
                    />
                  </label>
                </div>

                <div className="interventions-mobile-form-grid">
                  <label className="interventions-mobile-field">
                    <span>
                      Heure début *
                    </span>

                    <input
                      type="time"
                      value={
                        formulaire.heure_debut_prevue
                      }
                      onChange={(
                        event
                      ) =>
                        modifierChamp(
                          "heure_debut_prevue",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="interventions-mobile-field">
                    <span>
                      Heure fin *
                    </span>

                    <input
                      type="time"
                      value={
                        formulaire.heure_fin_prevue
                      }
                      onChange={(
                        event
                      ) =>
                        modifierChamp(
                          "heure_fin_prevue",
                          event.target.value
                        )
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="interventions-mobile-form-card">
                <span className="interventions-mobile-eyebrow">
                  4 • CHANTIER
                </span>

                <label className="interventions-mobile-field">
                  <span>
                    Adresse *
                  </span>

                  <input
                    type="text"
                    value={
                      formulaire.adresse_chantier
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "adresse_chantier",
                        event.target.value
                      )
                    }
                    placeholder="Adresse du chantier"
                  />
                </label>

                <div className="interventions-mobile-form-grid">
                  <label className="interventions-mobile-field">
                    <span>
                      Code postal *
                    </span>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        formulaire.code_postal_chantier
                      }
                      onChange={(
                        event
                      ) =>
                        modifierChamp(
                          "code_postal_chantier",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="interventions-mobile-field">
                    <span>
                      Ville *
                    </span>

                    <input
                      type="text"
                      value={
                        formulaire.ville_chantier
                      }
                      onChange={(
                        event
                      ) =>
                        modifierChamp(
                          "ville_chantier",
                          event.target.value
                        )
                      }
                    />
                  </label>
                </div>

                <label className="interventions-mobile-field">
                  <span>
                    Notes chantier
                  </span>

                  <textarea
                    rows={
                      4
                    }
                    value={
                      formulaire.notes_chantier
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "notes_chantier",
                        event.target.value
                      )
                    }
                    placeholder="Accès, portail, contraintes..."
                  />
                </label>
              </section>
            </>
          ) : null}

          {/*
           * ===============================================
           * ETAPE 2
           * ===============================================
           */}

          {etapeCreation ===
          2 ? (
            <>
              <section className="interventions-mobile-form-card">
                <div className="interventions-mobile-section-heading">
                  <div>
                    <span className="interventions-mobile-eyebrow">
                      ÉQUIPE
                    </span>

                    <h2>
                      Qui intervient ?
                    </h2>
                  </div>

                  <span className="interventions-mobile-count">
                    {
                      salariesSelectionnes.length
                    }
                  </span>
                </div>

                {salaries.length ===
                0 ? (
                  <div className="interventions-mobile-no-data">
                    Aucun salarié actif.
                  </div>
                ) : (
                  <div className="interventions-mobile-employees">
                    {salaries.map(
                      (
                        salarie
                      ) => {
                        const selectionne =
                          salariesSelectionnes.includes(
                            salarie.id
                          );

                        const affectation =
                          affectations[
                            salarie.id
                          ];

                        return (
                          <div
                            key={
                              salarie.id
                            }
                            className={
                              selectionne
                                ? "active"
                                : ""
                            }
                          >
                            <button
                              type="button"
                              className="interventions-mobile-employee-select"
                              onClick={() =>
                                basculerSalarie(
                                  salarie.id
                                )
                              }
                            >
                              <span>
                                👤
                              </span>

                              <strong>
                                {nomSalarie(
                                  salarie
                                )}
                              </strong>

                              <b>
                                {selectionne
                                  ? "✓"
                                  : ""}
                              </b>
                            </button>

                            {selectionne ? (
                              <div className="interventions-mobile-assignment">
                                <label>
                                  <span>
                                    Rôle
                                  </span>

                                  <input
                                    type="text"
                                    value={
                                      affectation?.role_chantier ||
                                      "Intervenant"
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      modifierAffectation(
                                        salarie.id,
                                        "role_chantier",
                                        event.target.value
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  <span>
                                    Arrivée
                                  </span>

                                  <input
                                    type="time"
                                    value={
                                      affectation?.heure_arrivee_prevue ||
                                      formulaire.heure_debut_prevue
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      modifierAffectation(
                                        salarie.id,
                                        "heure_arrivee_prevue",
                                        event.target.value
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  <span>
                                    Départ
                                  </span>

                                  <input
                                    type="time"
                                    value={
                                      affectation?.heure_depart_prevue ||
                                      formulaire.heure_fin_prevue
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      modifierAffectation(
                                        salarie.id,
                                        "heure_depart_prevue",
                                        event.target.value
                                      )
                                    }
                                  />
                                </label>
                              </div>
                            ) : null}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </section>

              <section className="interventions-mobile-form-card">
                <div className="interventions-mobile-section-heading">
                  <div>
                    <span className="interventions-mobile-eyebrow">
                      PRÉPARATION
                    </span>

                    <h2>
                      Que faut-il prévoir ?
                    </h2>
                  </div>

                  <span className="interventions-mobile-count">
                    {
                      elementsSelectionnes.length
                    }
                  </span>
                </div>

                <div className="interventions-mobile-element-tabs">
                  <button
                    type="button"
                    className={
                      ongletElements ===
                      "travaux"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setOngletElements(
                        "travaux"
                      )
                    }
                  >
                    ✓ Travaux
                  </button>

                  <button
                    type="button"
                    className={
                      ongletElements ===
                      "materiel"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setOngletElements(
                        "materiel"
                      )
                    }
                  >
                    🧰 Matériel
                  </button>

                  <button
                    type="button"
                    className={
                      ongletElements ===
                      "materiaux"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setOngletElements(
                        "materiaux"
                      )
                    }
                  >
                    🪨 Matériaux
                  </button>

                  <button
                    type="button"
                    className={
                      ongletElements ===
                      "consignes"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setOngletElements(
                        "consignes"
                      )
                    }
                  >
                    🦺 Consignes
                  </button>
                </div>

                {ongletElements ===
                  "travaux" &&
                lignesDevis.length >
                  0 ? (
                  <div className="interventions-mobile-quote-lines">
                    <span className="interventions-mobile-small-title">
                      LIGNES DU DEVIS
                    </span>

                    {lignesDevis.map(
                      (
                        ligne
                      ) => {
                        const id =
                          `ligne-devis-${ligne.id}`;

                        const actif =
                          elementsSelectionnes.includes(
                            id
                          );

                        return (
                          <button
                            type="button"
                            key={
                              ligne.id
                            }
                            className={
                              actif
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              basculerElement(
                                id
                              )
                            }
                          >
                            <span className="interventions-mobile-element-check">
                              {actif
                                ? "✓"
                                : ""}
                            </span>

                            <div>
                              <strong>
                                {ligne.designation ||
                                  "Prestation"}
                              </strong>

                              <small>
                                {Number(
                                  ligne.quantite ||
                                    1
                                )}{" "}
                                {ligne.unite ||
                                  "u"}
                              </small>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                ) : null}

                <div className="interventions-mobile-library">
                  {articlesOnglet.length ===
                  0 ? (
                    <div className="interventions-mobile-no-data">
                      Aucun élément dans cette catégorie.
                    </div>
                  ) : (
                    articlesOnglet.map(
                      (
                        article
                      ) => {
                        const actif =
                          elementsSelectionnes.includes(
                            article.id
                          );

                        return (
                          <button
                            type="button"
                            key={
                              article.id
                            }
                            className={
                              actif
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              basculerElement(
                                article.id
                              )
                            }
                          >
                            <span className="interventions-mobile-library-icon">
                              {article.icone ||
                                iconeCategorie(
                                  article.categorie
                                )}
                            </span>

                            <div>
                              <strong>
                                {
                                  article.nom
                                }
                              </strong>

                              {article.description ? (
                                <small>
                                  {
                                    article.description
                                  }
                                </small>
                              ) : null}
                            </div>

                            <span className="interventions-mobile-element-check">
                              {actif
                                ? "✓"
                                : ""}
                            </span>
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              </section>

              <section className="interventions-mobile-form-card">
                <span className="interventions-mobile-eyebrow">
                  NOTES INTERNES
                </span>

                <label className="interventions-mobile-field">
                  <textarea
                    rows={
                      4
                    }
                    value={
                      formulaire.notes_internes
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "notes_internes",
                        event.target.value
                      )
                    }
                    placeholder="Informations internes pour l’équipe..."
                  />
                </label>
              </section>
            </>
          ) : null}

          {/*
           * ===============================================
           * ETAPE 3
           * ===============================================
           */}

          {etapeCreation ===
          3 ? (
            <>
              <section className="interventions-mobile-recap-hero">
                <span>
                  ✓
                </span>

                <div>
                  <small>
                    PRÊTE À PLANIFIER
                  </small>

                  <h2>
                    {
                      formulaire.titre
                    }
                  </h2>

                  <p>
                    {devisSelectionne?.client_nom ||
                      "Client"}
                  </p>
                </div>
              </section>

              <section className="interventions-mobile-form-card">
                <h2>
                  Chantier
                </h2>

                <div className="interventions-mobile-recap-row">
                  <span>
                    Devis
                  </span>

                  <strong>
                    {devisSelectionne?.numero ||
                      "—"}
                  </strong>
                </div>

                <div className="interventions-mobile-recap-row">
                  <span>
                    Type
                  </span>

                  <strong>
                    {typeSelectionne?.nom ||
                      "—"}
                  </strong>
                </div>

                <div className="interventions-mobile-recap-row">
                  <span>
                    Du
                  </span>

                  <strong>
                    {formatDate(
                      formulaire.date_prevue
                    )}
                  </strong>
                </div>

                <div className="interventions-mobile-recap-row">
                  <span>
                    Au
                  </span>

                  <strong>
                    {formatDate(
                      formulaire.date_fin_prevue
                    )}
                  </strong>
                </div>

                <div className="interventions-mobile-recap-row">
                  <span>
                    Horaires
                  </span>

                  <strong>
                    {
                      formulaire.heure_debut_prevue
                    }{" "}
                    –{" "}
                    {
                      formulaire.heure_fin_prevue
                    }
                  </strong>
                </div>

                <div className="interventions-mobile-recap-row">
                  <span>
                    Adresse
                  </span>

                  <strong>
                    {
                      formulaire.adresse_chantier
                    }
                    <br />
                    {
                      formulaire.code_postal_chantier
                    }{" "}
                    {
                      formulaire.ville_chantier
                    }
                  </strong>
                </div>
              </section>

              <section className="interventions-mobile-form-card">
                <div className="interventions-mobile-section-heading">
                  <h2>
                    Équipe
                  </h2>

                  <span className="interventions-mobile-count">
                    {
                      salariesSelectionnes.length
                    }
                  </span>
                </div>

                <div className="interventions-mobile-recap-team">
                  {salariesSelectionnes.map(
                    (
                      salarieId
                    ) => {
                      const salarie =
                        trouverSalarie(
                          salarieId
                        );

                      const affectation =
                        affectations[
                          salarieId
                        ];

                      return (
                        <div
                          key={
                            salarieId
                          }
                        >
                          <span>
                            👤
                          </span>

                          <div>
                            <strong>
                              {nomSalarie(
                                salarie
                              )}
                            </strong>

                            <small>
                              {affectation?.role_chantier ||
                                "Intervenant"}{" "}
                              •{" "}
                              {affectation?.heure_arrivee_prevue ||
                                formulaire.heure_debut_prevue}{" "}
                              –{" "}
                              {affectation?.heure_depart_prevue ||
                                formulaire.heure_fin_prevue}
                            </small>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>

              <section className="interventions-mobile-form-card">
                <div className="interventions-mobile-section-heading">
                  <h2>
                    Préparation
                  </h2>

                  <span className="interventions-mobile-count">
                    {
                      elementsSelectionnes.length
                    }
                  </span>
                </div>

                <p className="interventions-mobile-helper">
                  Les éléments sélectionnés seront visibles par l’équipe sur le terrain.
                </p>
              </section>
            </>
          ) : null}

          <div className="interventions-mobile-creation-actions">
            {etapeCreation >
            1 ? (
              <button
                type="button"
                className="interventions-mobile-secondary"
                disabled={
                  enregistrement
                }
                onClick={
                  revenirCreation
                }
              >
                ← Retour
              </button>
            ) : null}

            {etapeCreation <
            3 ? (
              <button
                type="button"
                className="interventions-mobile-primary"
                onClick={
                  continuerCreation
                }
              >
                Continuer →
              </button>
            ) : (
              <button
                type="button"
                className="interventions-mobile-primary"
                disabled={
                  enregistrement
                }
                onClick={() =>
                  void enregistrerFiche()
                }
              >
                {enregistrement
                  ? "Création…"
                  : "✓ Créer et planifier"}
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  /*
   * ======================================================
   * DETAIL FICHE
   * ======================================================
   */

  if (
    ficheOuverte
  ) {
    const equipe =
      salariesDeFiche(
        ficheOuverte
      );

    const elements =
      elementsDeFiche(
        ficheOuverte.id
      );

    const categories =
      Array.from(
        new Set(
          elements.map(
            (
              element
            ) =>
              element.categorie
          )
        )
      );

    const etapesValidees =
      [
        ficheOuverte.etape_materiel_statut,
        ficheOuverte.etape_arrivee_statut,
        ficheOuverte.etape_fin_statut,
      ].filter(
        etapeValidee
      ).length;

    const progression =
      Math.round(
        (
          etapesValidees /
          3
        ) *
          100
      );

    return (
      <main className="interventions-mobile">
        <header className="interventions-mobile-header">
          <button
            type="button"
            className="interventions-mobile-back"
            onClick={() =>
              setFicheOuverte(
                null
              )
            }
          >
            ‹
          </button>

          <div>
            <h1>
              Fiche intervention
            </h1>

            <span>
              {ficheOuverte.numero ||
                "Chantier"}
            </span>
          </div>

          <div className="interventions-mobile-header-space" />
        </header>

        <div className="interventions-mobile-detail-content">
          {message ? (
            <div className="interventions-mobile-success">
              {message}
            </div>
          ) : null}

          {erreur ? (
            <div className="interventions-mobile-error">
              {erreur}
            </div>
          ) : null}

          <section className="interventions-mobile-detail-hero">
            <div className="interventions-mobile-detail-hero-top">
              <span
                className={classeStatut(
                  ficheOuverte.statut
                )}
              >
                {libelleStatut(
                  ficheOuverte.statut
                )}
              </span>

              {ficheOuverte.probleme_signale ? (
                <b>
                  ⚠ Problème
                </b>
              ) : null}
            </div>

            <h2>
              {titreFiche(
                ficheOuverte
              )}
            </h2>

            <p>
              {ficheOuverte.client_nom ||
                "Client non renseigné"}
            </p>

            <div className="interventions-mobile-detail-date">
              <span>
                📅
              </span>

              <strong>
                {formatDate(
                  ficheOuverte.date_prevue
                )}

                {ficheOuverte.date_fin_prevue &&
                ficheOuverte.date_fin_prevue !==
                  ficheOuverte.date_prevue
                  ? ` → ${formatDate(
                      ficheOuverte.date_fin_prevue
                    )}`
                  : ""}
              </strong>

              <small>
                {formatHeure(
                  ficheOuverte.heure_debut_prevue ||
                    ficheOuverte.heure_debut
                )}{" "}
                –{" "}
                {formatHeure(
                  ficheOuverte.heure_fin_prevue ||
                    ficheOuverte.heure_fin
                )}
              </small>
            </div>
          </section>

          <section className="interventions-mobile-progress-card">
            <div className="interventions-mobile-progress-title">
              <div>
                <span>
                  PROGRESSION TERRAIN
                </span>

                <strong>
                  {
                    etapesValidees
                  }
                  /3 étapes
                </strong>
              </div>

              <b>
                {
                  progression
                }
                %
              </b>
            </div>

            <div className="interventions-mobile-progress-bar">
              <span
                style={{
                  width:
                    `${progression}%`,
                }}
              />
            </div>

            <div className="interventions-mobile-terrain-steps">
              <div
                className={
                  etapeValidee(
                    ficheOuverte.etape_materiel_statut
                  )
                    ? "done"
                    : ""
                }
              >
                <span>
                  {etapeValidee(
                    ficheOuverte.etape_materiel_statut
                  )
                    ? "✓"
                    : "1"}
                </span>

                <strong>
                  Matériel
                </strong>

                <small>
                  {libelleEtape(
                    ficheOuverte.etape_materiel_statut
                  )}
                </small>
              </div>

              <div
                className={
                  etapeValidee(
                    ficheOuverte.etape_arrivee_statut
                  )
                    ? "done"
                    : ""
                }
              >
                <span>
                  {etapeValidee(
                    ficheOuverte.etape_arrivee_statut
                  )
                    ? "✓"
                    : "2"}
                </span>

                <strong>
                  Arrivée
                </strong>

                <small>
                  {libelleEtape(
                    ficheOuverte.etape_arrivee_statut
                  )}
                </small>
              </div>

              <div
                className={
                  etapeValidee(
                    ficheOuverte.etape_fin_statut
                  )
                    ? "done"
                    : ""
                }
              >
                <span>
                  {etapeValidee(
                    ficheOuverte.etape_fin_statut
                  )
                    ? "✓"
                    : "3"}
                </span>

                <strong>
                  Fin / PV
                </strong>

                <small>
                  {libelleEtape(
                    ficheOuverte.etape_fin_statut
                  )}
                </small>
              </div>
            </div>
          </section>

          <section className="interventions-mobile-detail-card">
            <h3>
              Chantier
            </h3>

            <div className="interventions-mobile-info-row">
              <span>
                Type
              </span>

              <strong>
                {ficheOuverte.type_intervention ||
                  "Intervention"}
              </strong>
            </div>

            <div className="interventions-mobile-info-row">
              <span>
                Adresse
              </span>

              <strong>
                {adresseFiche(
                  ficheOuverte
                ) ||
                  "Non renseignée"}
              </strong>
            </div>
          </section>

          <section className="interventions-mobile-detail-card">
            <div className="interventions-mobile-section-heading">
              <h3>
                Équipe
              </h3>

              <span className="interventions-mobile-count">
                {
                  equipe.length
                }
              </span>
            </div>

            {equipe.length ===
            0 ? (
              <div className="interventions-mobile-no-data">
                Aucun salarié affecté.
              </div>
            ) : (
              <div className="interventions-mobile-detail-team">
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
                            "Intervenant"}{" "}
                          •{" "}
                          {formatHeure(
                            membre.heure_arrivee_prevue
                          )}{" "}
                          –{" "}
                          {formatHeure(
                            membre.heure_depart_prevue
                          )}
                        </small>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {categories.map(
            (
              categorie
            ) => {
              const liste =
                elements.filter(
                  (
                    element
                  ) =>
                    element.categorie ===
                    categorie
                );

              return (
                <section
                  className="interventions-mobile-detail-card"
                  key={
                    categorie
                  }
                >
                  <div className="interventions-mobile-section-heading">
                    <h3>
                      {iconeCategorie(
                        categorie
                      )}{" "}
                      {titreCategorie(
                        categorie
                      )}
                    </h3>

                    <span className="interventions-mobile-count">
                      {
                        liste.length
                      }
                    </span>
                  </div>

                  <div className="interventions-mobile-detail-elements">
                    {liste.map(
                      (
                        element
                      ) => (
                        <div
                          key={
                            element.id
                          }
                          className={
                            element.coche_prepare
                              ? "done"
                              : ""
                          }
                        >
                          <span>
                            {element.coche_prepare
                              ? "✓"
                              : element.icone ||
                                "•"}
                          </span>

                          <div>
                            <strong>
                              {
                                element.nom
                              }
                            </strong>

                            {element.quantite_prevue ? (
                              <small>
                                {
                                  element.quantite_prevue
                                }{" "}
                                {element.unite ||
                                  "u"}
                              </small>
                            ) : null}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              );
            }
          )}

          {ficheOuverte.notes_chantier ? (
            <section className="interventions-mobile-detail-card">
              <h3>
                Notes chantier
              </h3>

              <p className="interventions-mobile-detail-text">
                {
                  ficheOuverte.notes_chantier
                }
              </p>
            </section>
          ) : null}

          {ficheOuverte.consignes_securite ? (
            <section className="interventions-mobile-detail-card">
              <h3>
                Consignes
              </h3>

              <p className="interventions-mobile-detail-text">
                {
                  ficheOuverte.consignes_securite
                }
              </p>
            </section>
          ) : null}

          {ficheOuverte.probleme_signale ? (
            <section className="interventions-mobile-problem-card">
              <strong>
                ⚠ Problème signalé
              </strong>

              <p>
                {ficheOuverte.description_probleme ||
                  "Un problème a été signalé par l’équipe."}
              </p>
            </section>
          ) : null}

          <div className="interventions-mobile-detail-note">
            Le Chef consulte ici l’avancement terrain. Les validations Matériel → Arrivée → Photos → Fin → PV seront effectuées dans le parcours salarié mobile.
          </div>
        </div>
      </main>
    );
  }

  /*
   * ======================================================
   * LISTE
   * ======================================================
   */

  return (
    <main className="interventions-mobile">
      <header className="interventions-mobile-header">
        <button
          type="button"
          className="interventions-mobile-back"
          onClick={
            onFermer
          }
        >
          ‹
        </button>

        <div>
          <h1>
            Interventions
          </h1>

          <span>
            Fiches chantier
          </span>
        </div>

        <button
          type="button"
          className="interventions-mobile-add-header"
          onClick={
            ouvrirCreation
          }
        >
          ＋
        </button>
      </header>

      <div className="interventions-mobile-content">
        {erreur ? (
          <div className="interventions-mobile-error">
            {erreur}

            <button
              type="button"
              onClick={() =>
                void initialiser()
              }
            >
              Réessayer
            </button>
          </div>
        ) : null}

        {message ? (
          <div className="interventions-mobile-success">
            {message}
          </div>
        ) : null}

        <section className="interventions-mobile-summary">
          <div className="interventions-mobile-summary-main">
            <span>
              Interventions actives
            </span>

            <strong>
              {
                statistiques.total
              }
            </strong>
          </div>

          <div>
            <strong>
              {
                statistiques.planifiees
              }
            </strong>

            <span>
              Planifiées
            </span>
          </div>

          <div>
            <strong>
              {
                statistiques.enCours
              }
            </strong>

            <span>
              En cours
            </span>
          </div>

          <div>
            <strong>
              {
                statistiques.terminees
              }
            </strong>

            <span>
              Terminées
            </span>
          </div>
        </section>

        {statistiques.problemes >
        0 ? (
          <div className="interventions-mobile-alert">
            ⚠{" "}
            {
              statistiques.problemes
            }{" "}
            intervention
            {statistiques.problemes >
            1
              ? "s"
              : ""}{" "}
            avec un problème signalé
          </div>
        ) : null}

        <label className="interventions-mobile-search">
          <span>
            🔎
          </span>

          <input
            type="search"
            value={
              recherche
            }
            onChange={(
              event
            ) =>
              setRecherche(
                event.target.value
              )
            }
            placeholder="Client, chantier, salarié..."
          />
        </label>

        <div className="interventions-mobile-filters">
          <button
            type="button"
            className={
              filtreStatut ===
              "tous"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreStatut(
                "tous"
              )
            }
          >
            Toutes
          </button>

          <button
            type="button"
            className={
              filtreStatut ===
              "planifiee"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreStatut(
                "planifiee"
              )
            }
          >
            Planifiées
          </button>

          <button
            type="button"
            className={
              filtreStatut ===
              "en_cours"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreStatut(
                "en_cours"
              )
            }
          >
            En cours
          </button>

          <button
            type="button"
            className={
              filtreStatut ===
              "terminee"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreStatut(
                "terminee"
              )
            }
          >
            Terminées
          </button>

          <button
            type="button"
            className={
              filtreStatut ===
              "archivee"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreStatut(
                "archivee"
              )
            }
          >
            Archivées
          </button>
        </div>

        <div className="interventions-mobile-list-heading">
          <h2>
            {fichesFiltrees.length}{" "}
            intervention
            {fichesFiltrees.length >
            1
              ? "s"
              : ""}
          </h2>

          <button
            type="button"
            onClick={() =>
              void rechargerFiches()
            }
          >
            ↻
          </button>
        </div>

        {chargement ? (
          <div className="interventions-mobile-loading">
            <div className="interventions-mobile-spinner" />

            <span>
              Chargement des interventions…
            </span>
          </div>
        ) : fichesFiltrees.length ===
          0 ? (
          <div className="interventions-mobile-empty">
            <div>
              🌳
            </div>

            <strong>
              Aucune intervention
            </strong>

            <span>
              Aucun chantier ne correspond au filtre sélectionné.
            </span>

            <button
              type="button"
              onClick={
                ouvrirCreation
              }
            >
              ＋ Créer une intervention
            </button>
          </div>
        ) : (
          <div className="interventions-mobile-list">
            {fichesFiltrees.map(
              (
                fiche
              ) => {
                const equipe =
                  salariesDeFiche(
                    fiche
                  );

                const elements =
                  elementsDeFiche(
                    fiche.id
                  );

                const etapes =
                  [
                    fiche.etape_materiel_statut,
                    fiche.etape_arrivee_statut,
                    fiche.etape_fin_statut,
                  ].filter(
                    etapeValidee
                  ).length;

                return (
                  <button
                    type="button"
                    className={`interventions-mobile-card ${
                      fiche.probleme_signale
                        ? "interventions-mobile-card-problem"
                        : ""
                    }`}
                    key={
                      fiche.id
                    }
                    onClick={() => {
                      setFicheOuverte(
                        fiche
                      );

                      setMessage(
                        ""
                      );

                      setErreur(
                        ""
                      );

                      window.scrollTo({
                        top:
                          0,

                        behavior:
                          "smooth",
                      });
                    }}
                  >
                    <div className="interventions-mobile-card-top">
                      <span
                        className={classeStatut(
                          fiche.statut
                        )}
                      >
                        {libelleStatut(
                          fiche.statut
                        )}
                      </span>

                      {fiche.probleme_signale ? (
                        <b>
                          ⚠
                        </b>
                      ) : null}

                      <small>
                        {fiche.numero ||
                          ""}
                      </small>
                    </div>

                    <h3>
                      {titreFiche(
                        fiche
                      )}
                    </h3>

                    <p>
                      {fiche.client_nom ||
                        "Client non renseigné"}
                    </p>

                    <div className="interventions-mobile-card-info">
                      <span>
                        📅{" "}
                        {formatDate(
                          fiche.date_prevue
                        )}

                        {fiche.date_fin_prevue &&
                        fiche.date_fin_prevue !==
                          fiche.date_prevue
                          ? ` → ${formatDate(
                              fiche.date_fin_prevue
                            )}`
                          : ""}
                      </span>

                      <span>
                        🕘{" "}
                        {formatHeure(
                          fiche.heure_debut_prevue
                        )}{" "}
                        –{" "}
                        {formatHeure(
                          fiche.heure_fin_prevue
                        )}
                      </span>

                      {adresseFiche(
                        fiche
                      ) ? (
                        <span>
                          📍{" "}
                          {adresseFiche(
                            fiche
                          )}
                        </span>
                      ) : null}
                    </div>

                    <div className="interventions-mobile-card-bottom">
                      <div>
                        <span>
                          👤
                        </span>

                        <small>
                          {equipe.length >
                          0
                            ? equipe
                                .map(
                                  (
                                    item
                                  ) =>
                                    item.salarie_nom
                                )
                                .filter(Boolean)
                                .join(
                                  ", "
                                )
                            : "Aucune équipe"}
                        </small>
                      </div>

                      <div>
                        <span>
                          ✓
                        </span>

                        <small>
                          {etapes}
                          /3 terrain
                        </small>
                      </div>

                      <div>
                        <span>
                          🧰
                        </span>

                        <small>
                          {
                            elements.length
                          }{" "}
                          élément
                          {elements.length >
                          1
                            ? "s"
                            : ""}
                        </small>
                      </div>
                    </div>

                    <span className="interventions-mobile-card-arrow">
                      ›
                    </span>
                  </button>
                );
              }
            )}
          </div>
        )}

        <button
          type="button"
          className="interventions-mobile-floating-add"
          onClick={
            ouvrirCreation
          }
        >
          ＋ Nouvelle intervention
        </button>
      </div>
    </main>
  );
}