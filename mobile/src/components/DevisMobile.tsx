import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Capacitor,
} from "@capacitor/core";

import {
  Directory,
  Filesystem,
} from "@capacitor/filesystem";

import {
  FileViewer,
} from "@capacitor/file-viewer";

import {
  Share,
} from "@capacitor/share";

import {
  supabase,
} from "../lib/supabase";

import {
  creerDevisCompletMobile,
} from "../lib/creerDevisCompletMobile";

import "./DevisMobile.css";

type Props = {
  entrepriseId: string;

  onFermer: () => void;

  onDevisCree?: () => void;
};

type Etape =
  | 1
  | 2
  | 3
  | 4
  | 5;

type Client = {
  id: string;

  entreprise_id: string;

  type_client?: string | null;

  nom?: string | null;

  prenom?: string | null;

  entreprise?: string | null;

  email?: string | null;

  telephone?: string | null;

  adresse?: string | null;

  code_postal?: string | null;

  ville?: string | null;

  adresse_chantier?: string | null;

  code_postal_chantier?: string | null;

  ville_chantier?: string | null;

  notes_chantier?: string | null;
};

type CategoriePrestation = {
  id: string;

  entreprise_id: string;

  nom: string;

  prefixe_code?: string | null;

  actif?: boolean | null;
};

type Prestation = {
  id: string;

  entreprise_id: string;

  categorie_id: string;

  code: string;

  designation: string;

  description: string | null;

  unite_reference: string;

  prix_vente_ht: number;

  taux_tva: number;

  actif: boolean;

  ordre?: number | null;

  categorie_nom?: string | null;
};

type LigneDevis = {
  id_local: string;

  prestation_tarif_id: string | null;

  prestation_code: string | null;

  prestation_categorie_id: string | null;

  prestation_categorie_nom: string | null;

  designation: string;

  description: string;

  quantite: number;

  unite: string;

  prix_unitaire_ht: number;

  remise_pourcent: number;

  tva: number;
};

type FormulaireDevis = {
  objet: string;

  description: string;

  date_devis: string;

  date_validite: string;

  adresse_chantier: string;

  code_postal_chantier: string;

  ville_chantier: string;

  notes_chantier: string;

  conditions: string;
};

type NouveauClient = {
  type_client:
    | "particulier"
    | "professionnel";

  prenom: string;

  nom: string;

  entreprise: string;

  telephone: string;

  email: string;

  adresse: string;

  code_postal: string;

  ville: string;
};

type ResultatCreation = {
  devisId: string;

  numero: string;

  totalHt: number;

  totalTva: number;

  totalTtc: number;

  clientNom: string;

  clientEmail: string;
};

type BrouillonLocal = {
  version: number;

  etape: number;

  clientId: string | null;

  lignes: LigneDevis[];

  formulaire: FormulaireDevis;

  sauvegardeAt: string;
};

function aujourdHui() {
  const date =
    new Date();

  const annee =
    date.getFullYear();

  const mois =
    String(
      date.getMonth() + 1
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

function ajouterJours(
  dateIso: string,
  jours: number
) {
  const date =
    new Date(
      `${dateIso}T12:00:00`
    );

  date.setDate(
    date.getDate() + jours
  );

  const annee =
    date.getFullYear();

  const mois =
    String(
      date.getMonth() + 1
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

function formulaireVide():
  FormulaireDevis {
  const date =
    aujourdHui();

  return {
    objet: "",

    description: "",

    date_devis: date,

    date_validite:
      ajouterJours(
        date,
        30
      ),

    adresse_chantier: "",

    code_postal_chantier: "",

    ville_chantier: "",

    notes_chantier: "",

    conditions: "",
  };
}

function nouveauClientVide():
  NouveauClient {
  return {
    type_client:
      "particulier",

    prenom: "",

    nom: "",

    entreprise: "",

    telephone: "",

    email: "",

    adresse: "",

    code_postal: "",

    ville: "",
  };
}

function nouvelIdLocal() {
  if (
    typeof crypto !==
      "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function ligneLibre():
  LigneDevis {
  return {
    id_local:
      nouvelIdLocal(),

    prestation_tarif_id:
      null,

    prestation_code:
      null,

    prestation_categorie_id:
      null,

    prestation_categorie_nom:
      null,

    designation:
      "",

    description:
      "",

    quantite:
      1,

    unite:
      "u",

    prix_unitaire_ht:
      0,

    remise_pourcent:
      0,

    tva:
      20,
  };
}

function nombre(
  valeur: unknown
) {
  const resultat =
    Number(
      valeur
    );

  return Number.isFinite(
    resultat
  )
    ? resultat
    : 0;
}

function arrondir2(
  valeur: number
) {
  return Number(
    valeur.toFixed(2)
  );
}

function bornerPourcentage(
  valeur: unknown
) {
  return Math.min(
    100,
    Math.max(
      0,
      nombre(valeur)
    )
  );
}

function calculLigne(
  ligne: LigneDevis
) {
  const quantite =
    Math.max(
      0,
      nombre(
        ligne.quantite
      )
    );

  const prix =
    Math.max(
      0,
      nombre(
        ligne.prix_unitaire_ht
      )
    );

  const remise =
    bornerPourcentage(
      ligne.remise_pourcent
    );

  const tauxTva =
    Math.max(
      0,
      nombre(
        ligne.tva
      )
    );

  const totalBrutHt =
    quantite * prix;

  const totalHt =
    totalBrutHt *
    (
      1 -
      remise / 100
    );

  const totalTva =
    totalHt *
    (
      tauxTva / 100
    );

  return {
    totalBrutHt:
      arrondir2(
        totalBrutHt
      ),

    totalHt:
      arrondir2(
        totalHt
      ),

    totalTva:
      arrondir2(
        totalTva
      ),

    totalTtc:
      arrondir2(
        totalHt +
          totalTva
      ),
  };
}

function calculTotaux(
  lignes: LigneDevis[]
) {
  const totaux =
    lignes.reduce(
      (
        total,
        ligne
      ) => {
        const calcul =
          calculLigne(
            ligne
          );

        total.ht +=
          calcul.totalHt;

        total.tva +=
          calcul.totalTva;

        total.ttc +=
          calcul.totalTtc;

        return total;
      },
      {
        ht: 0,
        tva: 0,
        ttc: 0,
      }
    );

  return {
    totalHt:
      arrondir2(
        totaux.ht
      ),

    totalTva:
      arrondir2(
        totaux.tva
      ),

    totalTtc:
      arrondir2(
        totaux.ttc
      ),
  };
}

function formatMontant(
  montant: number
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
    nombre(montant)
  );
}

function normaliser(
  valeur: string
) {
  return valeur
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLowerCase();
}

function nomClient(
  client: Client | null
) {
  if (
    !client
  ) {
    return "Client";
  }

  if (
    client.type_client ===
      "professionnel" ||
    client.entreprise
  ) {
    return (
      client.entreprise?.trim() ||
      `${client.prenom || ""} ${
        client.nom || ""
      }`.trim() ||
      "Client professionnel"
    );
  }

  return (
    `${client.prenom || ""} ${
      client.nom || ""
    }`.trim() ||
    client.nom ||
    "Client particulier"
  );
}

function adresseClient(
  client: Client | null
) {
  if (
    !client
  ) {
    return "";
  }

  return [
    client.adresse,
    [
      client.code_postal,
      client.ville,
    ]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function uniteDepuisReference(
  reference:
    | string
    | null
    | undefined
) {
  const valeur =
    normaliser(
      reference || ""
    );

  if (
    [
      "heure",
      "heures",
      "h",
    ].includes(valeur)
  ) {
    return "h";
  }

  if (
    [
      "jour",
      "jours",
      "j",
    ].includes(valeur)
  ) {
    return "jour";
  }

  if (
    [
      "metre lineaire",
      "metres lineaires",
      "ml",
    ].includes(valeur)
  ) {
    return "ml";
  }

  if (
    [
      "m2",
      "m²",
      "metre carre",
      "metres carres",
    ].includes(valeur)
  ) {
    return "m²";
  }

  if (
    [
      "m3",
      "m³",
      "metre cube",
      "metres cubes",
    ].includes(valeur)
  ) {
    return "m³";
  }

  if (
    [
      "forfait",
      "forfaits",
    ].includes(valeur)
  ) {
    return "forfait";
  }

  if (
    [
      "passage",
      "passages",
    ].includes(valeur)
  ) {
    return "passage";
  }

  return (
    reference?.trim() ||
    "u"
  );
}

function messageErreur(
  erreur: unknown,
  fallback: string
) {
  if (
    erreur instanceof Error &&
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
        message?: unknown;
      }
    ).message ===
      "string"
  ) {
    return (
      erreur as {
        message: string;
      }
    ).message;
  }

  return fallback;
}

async function blobVersBase64(
  blob: Blob
) {
  return new Promise<string>(
    (
      resolve,
      reject
    ) => {
      const lecteur =
        new FileReader();

      lecteur.onloadend =
        () => {
          const resultat =
            String(
              lecteur.result ||
                ""
            );

          const virgule =
            resultat.indexOf(
              ","
            );

          if (
            virgule === -1
          ) {
            reject(
              new Error(
                "Impossible de convertir le PDF."
              )
            );

            return;
          }

          resolve(
            resultat.slice(
              virgule + 1
            )
          );
        };

      lecteur.onerror =
        () => {
          reject(
            lecteur.error ||
              new Error(
                "Impossible de lire le PDF."
              )
          );
        };

      lecteur.readAsDataURL(
        blob
      );
    }
  );
}

async function enregistrerPdfNatif(
  blob: Blob,
  nomFichier: string
) {
  const nomSecurise =
    nomFichier
      .replace(
        /[\/\:*?"<>|]/g,
        "-"
      )
      .trim() ||
    "devis.pdf";

  const base64 =
    await blobVersBase64(
      blob
    );

  return Filesystem.writeFile({
    path:
      `arboboard-documents/${nomSecurise}`,

    data:
      base64,

    directory:
      Directory.Cache,

    recursive:
      true,
  });
}

export default function DevisMobile({
  entrepriseId,
  onFermer,
  onDevisCree,
}: Props) {
  const [
    etape,
    setEtape,
  ] =
    useState<Etape>(1);

  const [
    clients,
    setClients,
  ] =
    useState<Client[]>([]);

  const [
    clientId,
    setClientId,
  ] =
    useState<string | null>(
      null
    );

  const [
    categories,
    setCategories,
  ] =
    useState<
      CategoriePrestation[]
    >([]);

  const [
    prestations,
    setPrestations,
  ] =
    useState<
      Prestation[]
    >([]);

  const [
    lignes,
    setLignes,
  ] =
    useState<
      LigneDevis[]
    >([]);

  const [
    formulaire,
    setFormulaire,
  ] =
    useState<FormulaireDevis>(
      formulaireVide()
    );

  const [
    rechercheClient,
    setRechercheClient,
  ] =
    useState("");

  const [
    recherchePrestation,
    setRecherchePrestation,
  ] =
    useState("");

  const [
    creationClientOuverte,
    setCreationClientOuverte,
  ] =
    useState(false);

  const [
    nouveauClient,
    setNouveauClient,
  ] =
    useState<NouveauClient>(
      nouveauClientVide()
    );

  const [
    chargement,
    setChargement,
  ] =
    useState(true);

  const [
    enregistrement,
    setEnregistrement,
  ] =
    useState(false);

  const [
    actionFinale,
    setActionFinale,
  ] =
    useState<
      string | null
    >(null);

  const [
    erreur,
    setErreur,
  ] =
    useState("");

  const [
    succes,
    setSucces,
  ] =
    useState("");

  const [
    resultat,
    setResultat,
  ] =
    useState<ResultatCreation | null>(
      null
    );

  const [
    emailEnvoi,
    setEmailEnvoi,
  ] =
    useState("");

  const cleBrouillon =
    `arboboard-mobile-devis-brouillon-${entrepriseId}`;

  useEffect(() => {
    void initialiser();
  }, [
    entrepriseId,
  ]);

  useEffect(() => {
    if (
      chargement ||
      resultat ||
      !entrepriseId
    ) {
      return;
    }

    const brouillon:
      BrouillonLocal = {
      version:
        1,

      etape,

      clientId,

      lignes,

      formulaire,

      sauvegardeAt:
        new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        cleBrouillon,
        JSON.stringify(
          brouillon
        )
      );
    } catch (
      error
    ) {
      console.warn(
        "Sauvegarde locale du devis impossible :",
        error
      );
    }
  }, [
    etape,
    clientId,
    lignes,
    formulaire,
    chargement,
    resultat,
    entrepriseId,
    cleBrouillon,
  ]);

  async function initialiser() {
    try {
      setChargement(true);

      setErreur("");

      const [
        clientsResultat,
        categoriesResultat,
        prestationsResultat,
      ] =
        await Promise.all([
          supabase
            .from(
              "clients"
            )
            .select("*")
            .eq(
              "entreprise_id",
              entrepriseId
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
              "prestations_categories"
            )
            .select("*")
            .eq(
              "entreprise_id",
              entrepriseId
            ),

          supabase
            .from(
              "prestations_tarifs"
            )
            .select("*")
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .eq(
              "actif",
              true
            ),
        ]);

      if (
        clientsResultat.error
      ) {
        throw clientsResultat.error;
      }

      if (
        categoriesResultat.error
      ) {
        throw categoriesResultat.error;
      }

      if (
        prestationsResultat.error
      ) {
        throw prestationsResultat.error;
      }

      const listeCategories =
        (
          categoriesResultat.data ||
          []
        ) as CategoriePrestation[];

      const mapCategories =
        new Map(
          listeCategories.map(
            (
              categorie
            ) => [
              categorie.id,
              categorie.nom,
            ]
          )
        );

      const listePrestations =
        (
          prestationsResultat.data ||
          []
        ).map(
          (
            prestation: any
          ) => ({
            ...prestation,

            categorie_nom:
              mapCategories.get(
                prestation.categorie_id
              ) ||
              null,
          })
        ) as Prestation[];

      listePrestations.sort(
        (
          a,
          b
        ) => {
          const ordreA =
            nombre(
              a.ordre
            );

          const ordreB =
            nombre(
              b.ordre
            );

          if (
            ordreA !==
            ordreB
          ) {
            return ordreA -
              ordreB;
          }

          return a.designation.localeCompare(
            b.designation,
            "fr"
          );
        }
      );

      setClients(
        (
          clientsResultat.data ||
          []
        ) as Client[]
      );

      setCategories(
        listeCategories
      );

      setPrestations(
        listePrestations
      );

      restaurerBrouillon();
    } catch (
      error
    ) {
      console.error(
        "Initialisation devis mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger la création du devis."
        )
      );
    } finally {
      setChargement(false);
    }
  }

  function restaurerBrouillon() {
    try {
      const brut =
        localStorage.getItem(
          cleBrouillon
        );

      if (
        !brut
      ) {
        return;
      }

      const sauvegarde =
        JSON.parse(
          brut
        ) as BrouillonLocal;

      if (
        sauvegarde.version !==
        1
      ) {
        return;
      }

      if (
        sauvegarde.clientId
      ) {
        setClientId(
          sauvegarde.clientId
        );
      }

      if (
        Array.isArray(
          sauvegarde.lignes
        )
      ) {
        setLignes(
          sauvegarde.lignes
        );
      }

      if (
        sauvegarde.formulaire
      ) {
        setFormulaire({
          ...formulaireVide(),

          ...sauvegarde.formulaire,
        });
      }

      if (
        sauvegarde.etape >= 1 &&
        sauvegarde.etape <= 4
      ) {
        setEtape(
          sauvegarde.etape as Etape
        );
      }
    } catch (
      error
    ) {
      console.warn(
        "Restauration brouillon devis impossible :",
        error
      );
    }
  }

  function supprimerBrouillonLocal() {
    try {
      localStorage.removeItem(
        cleBrouillon
      );
    } catch (
      error
    ) {
      console.warn(
        "Suppression brouillon local impossible :",
        error
      );
    }
  }

  const clientSelectionne =
    useMemo(
      () =>
        clients.find(
          (
            client
          ) =>
            client.id ===
            clientId
        ) ||
        null,
      [
        clients,
        clientId,
      ]
    );

  const clientsFiltres =
    useMemo(
      () => {
        const recherche =
          normaliser(
            rechercheClient
          );

        if (
          !recherche
        ) {
          return clients.slice(
            0,
            20
          );
        }

        return clients
          .filter(
            (
              client
            ) =>
              normaliser(
                [
                  client.prenom,
                  client.nom,
                  client.entreprise,
                  client.email,
                  client.telephone,
                  client.ville,
                  client.code_postal,
                ]
                  .filter(Boolean)
                  .join(" ")
              ).includes(
                recherche
              )
          )
          .slice(
            0,
            30
          );
      },
      [
        clients,
        rechercheClient,
      ]
    );

  const prestationsFiltrees =
    useMemo(
      () => {
        const recherche =
          normaliser(
            recherchePrestation
          );

        if (
          !recherche
        ) {
          return prestations.slice(
            0,
            12
          );
        }

        return prestations
          .filter(
            (
              prestation
            ) =>
              normaliser(
                [
                  prestation.code,
                  prestation.designation,
                  prestation.description,
                  prestation.categorie_nom,
                ]
                  .filter(Boolean)
                  .join(" ")
              ).includes(
                recherche
              )
          )
          .sort(
            (
              a,
              b
            ) => {
              const codeA =
                normaliser(
                  a.code
                );

              const codeB =
                normaliser(
                  b.code
                );

              if (
                codeA ===
                recherche
              ) {
                return -1;
              }

              if (
                codeB ===
                recherche
              ) {
                return 1;
              }

              if (
                codeA.startsWith(
                  recherche
                ) &&
                !codeB.startsWith(
                  recherche
                )
              ) {
                return -1;
              }

              if (
                codeB.startsWith(
                  recherche
                ) &&
                !codeA.startsWith(
                  recherche
                )
              ) {
                return 1;
              }

              return a.designation.localeCompare(
                b.designation,
                "fr"
              );
            }
          )
          .slice(
            0,
            20
          );
      },
      [
        prestations,
        recherchePrestation,
      ]
    );

  const totaux =
    useMemo(
      () =>
        calculTotaux(
          lignes
        ),
      [
        lignes,
      ]
    );

  function selectionnerClient(
    client: Client
  ) {
    setClientId(
      client.id
    );

    const adresse =
      client.adresse_chantier ||
      client.adresse ||
      "";

    const codePostal =
      client.code_postal_chantier ||
      client.code_postal ||
      "";

    const ville =
      client.ville_chantier ||
      client.ville ||
      "";

    setFormulaire(
      (
        ancien
      ) => ({
        ...ancien,

        adresse_chantier:
          ancien.adresse_chantier ||
          adresse,

        code_postal_chantier:
          ancien.code_postal_chantier ||
          codePostal,

        ville_chantier:
          ancien.ville_chantier ||
          ville,

        notes_chantier:
          ancien.notes_chantier ||
          client.notes_chantier ||
          "",
      })
    );

    setRechercheClient("");

    setErreur("");
  }

  async function creerClientRapide() {
    if (
      enregistrement
    ) {
      return;
    }

    const professionnel =
      nouveauClient.type_client ===
      "professionnel";

    if (
      professionnel &&
      !nouveauClient.entreprise.trim()
    ) {
      setErreur(
        "Renseignez le nom de l’entreprise."
      );

      return;
    }

    if (
      !professionnel &&
      !nouveauClient.nom.trim()
    ) {
      setErreur(
        "Renseignez au minimum le nom du client."
      );

      return;
    }

    try {
      setEnregistrement(true);

      setErreur("");

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "clients"
          )
          .insert({
            entreprise_id:
              entrepriseId,

            type_client:
              nouveauClient.type_client,

            prenom:
              nouveauClient.prenom.trim() ||
              null,

            nom:
              nouveauClient.nom.trim() ||
              null,

            entreprise:
              nouveauClient.entreprise.trim() ||
              null,

            telephone:
              nouveauClient.telephone.trim() ||
              null,

            email:
              nouveauClient.email
                .trim()
                .toLowerCase() ||
              null,

            adresse:
              nouveauClient.adresse.trim() ||
              null,

            code_postal:
              nouveauClient.code_postal.trim() ||
              null,

            ville:
              nouveauClient.ville.trim() ||
              null,
          })
          .select("*")
          .single();

      if (
        error
      ) {
        throw error;
      }

      const client =
        data as Client;

      setClients(
        (
          anciens
        ) => [
          client,
          ...anciens,
        ]
      );

      selectionnerClient(
        client
      );

      setNouveauClient(
        nouveauClientVide()
      );

      setCreationClientOuverte(
        false
      );

      setSucces(
        "Client créé et sélectionné."
      );
    } catch (
      error
    ) {
      console.error(
        "Création client rapide :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de créer ce client."
        )
      );
    } finally {
      setEnregistrement(false);
    }
  }

  function ajouterPrestation(
    prestation: Prestation
  ) {
    const ligne:
      LigneDevis = {
      id_local:
        nouvelIdLocal(),

      prestation_tarif_id:
        prestation.id,

      prestation_code:
        prestation.code,

      prestation_categorie_id:
        prestation.categorie_id,

      prestation_categorie_nom:
        prestation.categorie_nom ||
        null,

      designation:
        prestation.designation,

      description:
        prestation.description ||
        "",

      quantite:
        1,

      unite:
        uniteDepuisReference(
          prestation.unite_reference
        ),

      prix_unitaire_ht:
        nombre(
          prestation.prix_vente_ht
        ),

      remise_pourcent:
        0,

      tva:
        nombre(
          prestation.taux_tva
        ),
    };

    setLignes(
      (
        anciennes
      ) => [
        ...anciennes,
        ligne,
      ]
    );

    setRecherchePrestation("");

    setSucces(
      `${prestation.designation} ajouté au devis.`
    );
  }

  function ajouterLigneLibre() {
    setLignes(
      (
        anciennes
      ) => [
        ...anciennes,
        ligneLibre(),
      ]
    );

    setEtape(3);

    setSucces("");

    setErreur("");
  }

  function modifierLigne(
    id: string,
    champ:
      keyof LigneDevis,
    valeur:
      | string
      | number
      | null
  ) {
    setLignes(
      (
        anciennes
      ) =>
        anciennes.map(
          (
            ligne
          ) =>
            ligne.id_local ===
            id
              ? {
                  ...ligne,

                  [champ]:
                    valeur,
                }
              : ligne
        )
    );
  }

  function supprimerLigne(
    id: string
  ) {
    setLignes(
      (
        anciennes
      ) =>
        anciennes.filter(
          (
            ligne
          ) =>
            ligne.id_local !==
            id
        )
    );
  }

  function modifierFormulaire(
    champ:
      keyof FormulaireDevis,
    valeur: string
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

  function allerEtape(
    nouvelle: Etape
  ) {
    setErreur("");

    setSucces("");

    if (
      nouvelle > etape
    ) {
      if (
        etape === 1 &&
        !clientSelectionne
      ) {
        setErreur(
          "Sélectionnez un client avant de continuer."
        );

        return;
      }

      if (
        etape === 2 &&
        lignes.length === 0
      ) {
        setErreur(
          "Ajoutez au moins une prestation au devis."
        );

        return;
      }

      if (
        etape === 3
      ) {
        const lignesInvalides =
          lignes.some(
            (
              ligne
            ) =>
              !ligne.designation.trim() ||
              nombre(
                ligne.quantite
              ) <= 0
          );

        if (
          lignesInvalides
        ) {
          setErreur(
            "Vérifiez les prestations : chaque ligne doit avoir une désignation et une quantité supérieure à zéro."
          );

          return;
        }
      }
    }

    setEtape(
      nouvelle
    );

    window.scrollTo({
      top: 0,

      behavior:
        "smooth",
    });
  }

  async function creerDevis() {
    if (
      enregistrement
    ) {
      return;
    }

    if (
      !clientSelectionne
    ) {
      setErreur(
        "Le client du devis est obligatoire."
      );

      setEtape(1);

      return;
    }

    if (
      lignes.length === 0
    ) {
      setErreur(
        "Ajoutez au moins une prestation."
      );

      setEtape(2);

      return;
    }

    const lignesValides =
      lignes.filter(
        (
          ligne
        ) =>
          ligne.designation.trim() &&
          nombre(
            ligne.quantite
          ) > 0
      );

    if (
      lignesValides.length === 0
    ) {
      setErreur(
        "Aucune prestation valide n’a été ajoutée."
      );

      setEtape(3);

      return;
    }

    try {
      setEnregistrement(true);

      setErreur("");

      setSucces("");

      const calcul =
        calculTotaux(
          lignesValides
        );

      const payloadDevis = {
        entreprise_id:
          entrepriseId,

        client_id:
          clientSelectionne.id,

        client_nom:
          nomClient(
            clientSelectionne
          ),

        objet:
          formulaire.objet.trim() ||
          null,

        description:
          formulaire.description.trim() ||
          null,

        adresse_chantier:
          formulaire.adresse_chantier.trim() ||
          null,

        code_postal_chantier:
          formulaire.code_postal_chantier.trim() ||
          null,

        ville_chantier:
          formulaire.ville_chantier.trim() ||
          null,

        notes_chantier:
          formulaire.notes_chantier.trim() ||
          null,

        date_devis:
          formulaire.date_devis,

        date_validite:
          formulaire.date_validite,

        statut:
          "brouillon" as const,

        total_ht:
          calcul.totalHt,

        total_tva:
          calcul.totalTva,

        total_ttc:
          calcul.totalTtc,

        remise_globale_pourcent:
          0,

        remise_globale_montant:
          0,

        conditions:
          formulaire.conditions.trim() ||
          null,
      };

      const lignesPayload =
        lignesValides.map(
          (
            ligne,
            index
          ) => {
            const total =
              calculLigne(
                ligne
              );

            return {
              entreprise_id:
                entrepriseId,

              type_ligne:
                "prestation" as const,

              prestation_tarif_id:
                ligne.prestation_tarif_id,

              prestation_code:
                ligne.prestation_code,

              prestation_categorie_id:
                ligne.prestation_categorie_id,

              prestation_categorie_nom:
                ligne.prestation_categorie_nom,

              designation:
                ligne.designation.trim(),

              description:
                ligne.description.trim() ||
                null,

              quantite:
                nombre(
                  ligne.quantite
                ),

              unite:
                ligne.unite.trim() ||
                "u",

              prix_unitaire_ht:
                nombre(
                  ligne.prix_unitaire_ht
                ),

              remise_pourcent:
                bornerPourcentage(
                  ligne.remise_pourcent
                ),

              total_brut_ht:
                total.totalBrutHt,

              tva:
                nombre(
                  ligne.tva
                ),

              total_ht:
                total.totalHt,

              total_tva:
                total.totalTva,

              total_ttc:
                total.totalTtc,

              ordre:
                index + 1,
            };
          }
        );

      /*
       * Création sécurisée :
       *
       * 1. brouillon sans numéro
       * 2. lignes
       * 3. génération serveur
       * 4. attribution numéro
       *
       * En cas d'échec avant la
       * numérotation, le helper nettoie
       * le devis incomplet.
       */
      const devisCree =
        await creerDevisCompletMobile(
          payloadDevis,
          lignesPayload
        );

      const nouveauResultat:
        ResultatCreation = {
        devisId:
          devisCree.id,

        numero:
          devisCree.numero,

        totalHt:
          calcul.totalHt,

        totalTva:
          calcul.totalTva,

        totalTtc:
          calcul.totalTtc,

        clientNom:
          nomClient(
            clientSelectionne
          ),

        clientEmail:
          clientSelectionne.email ||
          "",
      };

      setResultat(
        nouveauResultat
      );

      setEmailEnvoi(
        clientSelectionne.email ||
        ""
      );

      supprimerBrouillonLocal();

      setEtape(5);

      setSucces(
        "Devis créé avec succès."
      );

      onDevisCree?.();

      window.scrollTo({
        top: 0,

        behavior:
          "smooth",
      });
    } catch (
      error
    ) {
      console.error(
        "Création devis mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de créer le devis."
        )
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function recupererPdf() {
    if (
      !resultat
    ) {
      throw new Error(
        "Devis introuvable."
      );
    }

    const {
      data: {
        session,
      },
      error:
        sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError
    ) {
      throw sessionError;
    }

    if (
      !session?.access_token
    ) {
      throw new Error(
        "Session Arboboard introuvable."
      );
    }

    const baseApi =
      String(
        import.meta.env
          .VITE_ARBOBOARD_API_URL ||
          "https://arboboard.fr"
      )
        .trim()
        .replace(
          /\/+$/,
          ""
        );

    const response =
      await fetch(
        `${baseApi}/api/documents/pdf`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${session.access_token}`,

            "Content-Type":
              "application/json",

            "X-Arboboard-Client":
              "mobile",
          },

          body:
            JSON.stringify({
              typeDocument:
                "devis",

              documentId:
                resultat.devisId,

              mode:
                "inline",
            }),
        }
      );

    if (
      !response.ok
    ) {
      const donnees =
        await response
          .json()
          .catch(
            () => null
          );

      throw new Error(
        donnees?.error ||
        donnees?.erreur ||
        "Impossible de générer le PDF."
      );
    }

    return response.blob();
  }

  async function voirPdf() {
    if (
      !resultat
    ) {
      return;
    }

    try {
      setActionFinale(
        "pdf"
      );

      setErreur("");

      const blob =
        await recupererPdf();

      const nomFichier =
        `${resultat.numero}.pdf`;

      if (
        Capacitor.isNativePlatform()
      ) {
        const fichier =
          await enregistrerPdfNatif(
            blob,
            nomFichier
          );

        const cheminLocal =
          decodeURIComponent(
            new URL(
              fichier.uri
            ).pathname
          );

        try {
          await FileViewer.openDocumentFromLocalPath({
            path:
              cheminLocal,
          });
        } catch (
          erreurOuverture
        ) {
          console.warn(
            "Ouverture native PDF devis impossible, utilisation du partage :",
            erreurOuverture
          );

          await Share.share({
            title:
              `Devis ${resultat.numero}`,

            text:
              `Devis ${resultat.numero}`,

            files: [
              fichier.uri,
            ],

            dialogTitle:
              "Ouvrir ou enregistrer le PDF",
          });
        }

        return;
      }

      const url =
        URL.createObjectURL(
          blob
        );

      const fenetre =
        window.open(
          url,
          "_blank"
        );

      if (
        !fenetre
      ) {
        const lien =
          document.createElement(
            "a"
          );

        lien.href =
          url;

        lien.target =
          "_blank";

        lien.rel =
          "noopener";

        document.body.appendChild(
          lien
        );

        lien.click();

        lien.remove();
      }

      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            url
          );
        },
        60000
      );
    } catch (
      error
    ) {
      setErreur(
        messageErreur(
          error,
          "Impossible d’ouvrir le PDF."
        )
      );
    } finally {
      setActionFinale(
        null
      );
    }
  }

  async function envoyerEmail() {
    if (
      !resultat
    ) {
      return;
    }

    const email =
      emailEnvoi
        .trim()
        .toLowerCase();

    if (
      !email
    ) {
      setErreur(
        "Renseignez l’adresse e-mail du client."
      );

      return;
    }

    try {
      setActionFinale(
        "email"
      );

      setErreur("");

      setSucces("");

      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError
      ) {
        throw sessionError;
      }

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Session Arboboard introuvable."
        );
      }

      const baseApi =
        String(
          import.meta.env
            .VITE_ARBOBOARD_API_URL ||
            "https://arboboard.fr"
        )
          .trim()
          .replace(
            /\/+$/,
            ""
          );

      const response =
        await fetch(
          `${baseApi}/api/documents/envoyer-email`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              "Content-Type":
                "application/json",

              "X-Arboboard-Client":
                "mobile",
            },

            body:
              JSON.stringify({
                typeDocument:
                  "devis",

                documentId:
                  resultat.devisId,

                email,

                sujet:
                  `Votre devis ${resultat.numero}`,

                message:
                  `Bonjour,\n\nVeuillez trouver ci-joint votre devis ${resultat.numero}.\n\nCordialement.`,
              }),
          }
        );

      const donnees =
        await response
          .json()
          .catch(
            () => null
          );

      if (
        !response.ok
      ) {
        throw new Error(
          donnees?.error ||
          donnees?.erreur ||
          "Impossible d’envoyer le devis."
        );
      }

      setSucces(
        `Devis envoyé à ${email}.`
      );
    } catch (
      error
    ) {
      setErreur(
        messageErreur(
          error,
          "Impossible d’envoyer le devis."
        )
      );
    } finally {
      setActionFinale(
        null
      );
    }
  }

  async function partagerPdf() {
    if (
      !resultat
    ) {
      return;
    }

    try {
      setActionFinale(
        "partage"
      );

      setErreur("");

      const blob =
        await recupererPdf();

      const nomFichier =
        `${resultat.numero}.pdf`;

      if (
        Capacitor.isNativePlatform()
      ) {
        const fichierNatif =
          await enregistrerPdfNatif(
            blob,
            nomFichier
          );

        await Share.share({
          title:
            `Devis ${resultat.numero}`,

          text:
            `Devis ${resultat.numero}`,

          files: [
            fichierNatif.uri,
          ],

          dialogTitle:
            "Partager le devis",
        });

        return;
      }

      const fichier =
        new File(
          [
            blob,
          ],
          nomFichier,
          {
            type:
              "application/pdf",
          }
        );

      if (
        navigator.share &&
        (
          !navigator.canShare ||
          navigator.canShare({
            files: [
              fichier,
            ],
          })
        )
      ) {
        await navigator.share({
          title:
            resultat.numero,

          text:
            `Devis ${resultat.numero}`,

          files: [
            fichier,
          ],
        });

        return;
      }

      const url =
        URL.createObjectURL(
          blob
        );

      const lien =
        document.createElement(
          "a"
        );

      lien.href =
        url;

      lien.download =
        nomFichier;

      document.body.appendChild(
        lien
      );

      lien.click();

      lien.remove();

      window.setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        30000
      );
    } catch (
      error
    ) {
      if (
        error instanceof
          DOMException &&
        error.name ===
          "AbortError"
      ) {
        return;
      }

      setErreur(
        messageErreur(
          error,
          "Impossible de partager le devis."
        )
      );
    } finally {
      setActionFinale(
        null
      );
    }
  }

  function nouveauDevis() {
    supprimerBrouillonLocal();

    setEtape(1);

    setClientId(null);

    setLignes([]);

    setFormulaire(
      formulaireVide()
    );

    setResultat(null);

    setEmailEnvoi("");

    setErreur("");

    setSucces("");

    setRechercheClient("");

    setRecherchePrestation("");
  }

  function fermer() {
    if (
      enregistrement ||
      actionFinale
    ) {
      return;
    }

    onFermer();
  }

  function renduProgression() {
    const titres = [
      "Client",
      "Prestations",
      "Détails",
      "Récap",
      "Final",
    ];

    return (
      <div className="devis-mobile-progress">
        {titres.map(
          (
            titre,
            index
          ) => {
            const numero =
              index + 1;

            const actif =
              numero === etape;

            const termine =
              numero < etape;

            return (
              <div
                key={
                  titre
                }
                className={[
                  "devis-mobile-progress-item",
                  actif
                    ? "active"
                    : "",
                  termine
                    ? "done"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span>
                  {termine
                    ? "✓"
                    : numero}
                </span>

                <small>
                  {titre}
                </small>
              </div>
            );
          }
        )}
      </div>
    );
  }

  if (
    chargement
  ) {
    return (
      <main className="devis-mobile">
        <div className="devis-mobile-loading">
          <div className="devis-mobile-spinner" />

          <strong>
            Préparation du devis…
          </strong>
        </div>
      </main>
    );
  }

  return (
    <main className="devis-mobile">
      <header className="devis-mobile-header">
        <button
          type="button"
          className="devis-mobile-back"
          onClick={
            etape === 1
              ? fermer
              : etape === 5
                ? fermer
                : () =>
                    allerEtape(
                      Math.max(
                        1,
                        etape - 1
                      ) as Etape
                    )
          }
        >
          ‹
        </button>

        <div>
          <h1>
            {etape === 5
              ? resultat?.numero ||
                "Devis créé"
              : "Nouveau devis"}
          </h1>

          <span>
            {etape === 5
              ? "Création terminée"
              : `Étape ${etape} sur 5`}
          </span>
        </div>

        <button
          type="button"
          className="devis-mobile-close"
          onClick={
            fermer
          }
        >
          ×
        </button>
      </header>

      {renduProgression()}

      <div className="devis-mobile-content">
        {erreur ? (
          <div className="devis-mobile-error">
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div className="devis-mobile-success">
            {succes}
          </div>
        ) : null}

        {etape === 1 ? (
          <>
            <section className="devis-mobile-intro">
              <small>
                ÉTAPE 1
              </small>

              <h2>
                Pour qui est ce devis ?
              </h2>

              <p>
                Recherchez un client existant ou créez-le directement.
              </p>
            </section>

            {clientSelectionne ? (
              <section className="devis-mobile-selected">
                <div className="devis-mobile-client-avatar">
                  ✓
                </div>

                <div>
                  <small>
                    CLIENT SÉLECTIONNÉ
                  </small>

                  <strong>
                    {nomClient(
                      clientSelectionne
                    )}
                  </strong>

                  <span>
                    {adresseClient(
                      clientSelectionne
                    ) ||
                      clientSelectionne.telephone ||
                      clientSelectionne.email ||
                      ""}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setClientId(
                      null
                    )
                  }
                >
                  Changer
                </button>
              </section>
            ) : null}

            <label className="devis-mobile-search">
              <span>
                🔎
              </span>

              <input
                type="search"
                value={
                  rechercheClient
                }
                onChange={(
                  event
                ) =>
                  setRechercheClient(
                    event.target.value
                  )
                }
                placeholder="Rechercher un client"
              />
            </label>

            <div className="devis-mobile-client-list">
              {clientsFiltres.map(
                (
                  client
                ) => (
                  <button
                    type="button"
                    key={
                      client.id
                    }
                    className={
                      client.id ===
                      clientId
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      selectionnerClient(
                        client
                      )
                    }
                  >
                    <span className="devis-mobile-list-icon">
                      👤
                    </span>

                    <span className="devis-mobile-list-main">
                      <strong>
                        {nomClient(
                          client
                        )}
                      </strong>

                      <small>
                        {[
                          client.telephone,
                          [
                            client.code_postal,
                            client.ville,
                          ]
                            .filter(Boolean)
                            .join(" "),
                        ]
                          .filter(Boolean)
                          .join(" • ") ||
                          client.email ||
                          "Client Arboboard"}
                      </small>
                    </span>

                    <span>
                      ›
                    </span>
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              className="devis-mobile-secondary-action"
              onClick={() =>
                setCreationClientOuverte(
                  !creationClientOuverte
                )
              }
            >
              ＋ Nouveau client
            </button>

            {creationClientOuverte ? (
              <section className="devis-mobile-card">
                <h3>
                  Nouveau client
                </h3>

                <div className="devis-mobile-choice">
                  <button
                    type="button"
                    className={
                      nouveauClient.type_client ===
                      "particulier"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setNouveauClient(
                        (
                          ancien
                        ) => ({
                          ...ancien,

                          type_client:
                            "particulier",
                        })
                      )
                    }
                  >
                    Particulier
                  </button>

                  <button
                    type="button"
                    className={
                      nouveauClient.type_client ===
                      "professionnel"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setNouveauClient(
                        (
                          ancien
                        ) => ({
                          ...ancien,

                          type_client:
                            "professionnel",
                        })
                      )
                    }
                  >
                    Professionnel
                  </button>
                </div>

                {nouveauClient.type_client ===
                "professionnel" ? (
                  <label className="devis-mobile-field">
                    <span>
                      Entreprise *
                    </span>

                    <input
                      value={
                        nouveauClient.entreprise
                      }
                      onChange={(
                        event
                      ) =>
                        setNouveauClient(
                          (
                            ancien
                          ) => ({
                            ...ancien,

                            entreprise:
                              event.target.value,
                          })
                        )
                      }
                    />
                  </label>
                ) : null}

                <div className="devis-mobile-two">
                  <label className="devis-mobile-field">
                    <span>
                      Prénom
                    </span>

                    <input
                      value={
                        nouveauClient.prenom
                      }
                      onChange={(
                        event
                      ) =>
                        setNouveauClient(
                          (
                            ancien
                          ) => ({
                            ...ancien,

                            prenom:
                              event.target.value,
                          })
                        )
                      }
                    />
                  </label>

                  <label className="devis-mobile-field">
                    <span>
                      Nom *
                    </span>

                    <input
                      value={
                        nouveauClient.nom
                      }
                      onChange={(
                        event
                      ) =>
                        setNouveauClient(
                          (
                            ancien
                          ) => ({
                            ...ancien,

                            nom:
                              event.target.value,
                          })
                        )
                      }
                    />
                  </label>
                </div>

                <label className="devis-mobile-field">
                  <span>
                    Téléphone
                  </span>

                  <input
                    type="tel"
                    value={
                      nouveauClient.telephone
                    }
                    onChange={(
                      event
                    ) =>
                      setNouveauClient(
                        (
                          ancien
                        ) => ({
                          ...ancien,

                          telephone:
                            event.target.value,
                        })
                      )
                    }
                  />
                </label>

                <label className="devis-mobile-field">
                  <span>
                    Email
                  </span>

                  <input
                    type="email"
                    value={
                      nouveauClient.email
                    }
                    onChange={(
                      event
                    ) =>
                      setNouveauClient(
                        (
                          ancien
                        ) => ({
                          ...ancien,

                          email:
                            event.target.value,
                        })
                      )
                    }
                  />
                </label>

                <label className="devis-mobile-field">
                  <span>
                    Adresse
                  </span>

                  <input
                    value={
                      nouveauClient.adresse
                    }
                    onChange={(
                      event
                    ) =>
                      setNouveauClient(
                        (
                          ancien
                        ) => ({
                          ...ancien,

                          adresse:
                            event.target.value,
                        })
                      )
                    }
                  />
                </label>

                <div className="devis-mobile-two">
                  <label className="devis-mobile-field">
                    <span>
                      Code postal
                    </span>

                    <input
                      inputMode="numeric"
                      value={
                        nouveauClient.code_postal
                      }
                      onChange={(
                        event
                      ) =>
                        setNouveauClient(
                          (
                            ancien
                          ) => ({
                            ...ancien,

                            code_postal:
                              event.target.value,
                          })
                        )
                      }
                    />
                  </label>

                  <label className="devis-mobile-field">
                    <span>
                      Ville
                    </span>

                    <input
                      value={
                        nouveauClient.ville
                      }
                      onChange={(
                        event
                      ) =>
                        setNouveauClient(
                          (
                            ancien
                          ) => ({
                            ...ancien,

                            ville:
                              event.target.value,
                          })
                        )
                      }
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="devis-mobile-primary"
                  disabled={
                    enregistrement
                  }
                  onClick={() =>
                    void creerClientRapide()
                  }
                >
                  {enregistrement
                    ? "Création…"
                    : "Créer et sélectionner"}
                </button>
              </section>
            ) : null}

            <button
              type="button"
              className="devis-mobile-primary"
              disabled={
                !clientSelectionne
              }
              onClick={() =>
                allerEtape(2)
              }
            >
              Continuer vers les prestations

              <span>
                →
              </span>
            </button>
          </>
        ) : null}

        {etape === 2 ? (
          <>
            <section className="devis-mobile-intro">
              <small>
                ÉTAPE 2
              </small>

              <h2>
                Que faut-il faire ?
              </h2>

              <p>
                Recherchez une prestation par nom ou par code.
              </p>
            </section>

            <label className="devis-mobile-search">
              <span>
                🔎
              </span>

              <input
                type="search"
                value={
                  recherchePrestation
                }
                onChange={(
                  event
                ) =>
                  setRecherchePrestation(
                    event.target.value
                  )
                }
                placeholder="Ex : taille haie, ELAG..."
              />
            </label>

            {categories.length > 0 ? (
              <div className="devis-mobile-catalog-info">
                {prestations.length} prestation
                {prestations.length > 1
                  ? "s"
                  : ""}{" "}
                disponible
                {prestations.length > 1
                  ? "s"
                  : ""}
              </div>
            ) : null}

            <div className="devis-mobile-prestation-list">
              {prestationsFiltrees.map(
                (
                  prestation
                ) => (
                  <article
                    key={
                      prestation.id
                    }
                    className="devis-mobile-prestation"
                  >
                    <div>
                      <small>
                        {prestation.code}

                        {prestation.categorie_nom
                          ? ` • ${prestation.categorie_nom}`
                          : ""}
                      </small>

                      <strong>
                        {prestation.designation}
                      </strong>

                      {prestation.description ? (
                        <p>
                          {prestation.description}
                        </p>
                      ) : null}

                      <span>
                        {formatMontant(
                          prestation.prix_vente_ht
                        )}{" "}
                        HT /{" "}
                        {uniteDepuisReference(
                          prestation.unite_reference
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        ajouterPrestation(
                          prestation
                        )
                      }
                    >
                      ＋
                    </button>
                  </article>
                )
              )}
            </div>

            <button
              type="button"
              className="devis-mobile-secondary-action"
              onClick={
                ajouterLigneLibre
              }
            >
              ＋ Ajouter une ligne libre
            </button>

            {lignes.length > 0 ? (
              <section className="devis-mobile-selection-summary">
                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    {lignes.length} prestation
                    {lignes.length > 1
                      ? "s"
                      : ""}{" "}
                    ajoutée
                    {lignes.length > 1
                      ? "s"
                      : ""}
                  </strong>

                  <small>
                    {formatMontant(
                      totaux.totalTtc
                    )}{" "}
                    TTC actuellement
                  </small>
                </div>
              </section>
            ) : null}

            <button
              type="button"
              className="devis-mobile-primary"
              disabled={
                lignes.length === 0
              }
              onClick={() =>
                allerEtape(3)
              }
            >
              Régler les détails

              <span>
                →
              </span>
            </button>
          </>
        ) : null}

        {etape === 3 ? (
          <>
            <section className="devis-mobile-intro">
              <small>
                ÉTAPE 3
              </small>

              <h2>
                Détails du devis
              </h2>

              <p>
                Ajustez les quantités, prix et informations du chantier.
              </p>
            </section>

            <div className="devis-mobile-lines">
              {lignes.map(
                (
                  ligne,
                  index
                ) => {
                  const total =
                    calculLigne(
                      ligne
                    );

                  return (
                    <section
                      className="devis-mobile-line-card"
                      key={
                        ligne.id_local
                      }
                    >
                      <div className="devis-mobile-line-head">
                        <span>
                          {index + 1}
                        </span>

                        <div>
                          <small>
                            {ligne.prestation_code ||
                              "LIGNE LIBRE"}
                          </small>

                          <strong>
                            {ligne.designation ||
                              "Nouvelle prestation"}
                          </strong>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            supprimerLigne(
                              ligne.id_local
                            )
                          }
                        >
                          ×
                        </button>
                      </div>

                      <label className="devis-mobile-field">
                        <span>
                          Désignation *
                        </span>

                        <input
                          value={
                            ligne.designation
                          }
                          onChange={(
                            event
                          ) =>
                            modifierLigne(
                              ligne.id_local,
                              "designation",
                              event.target.value
                            )
                          }
                        />
                      </label>

                      <label className="devis-mobile-field">
                        <span>
                          Description
                        </span>

                        <textarea
                          rows={3}
                          value={
                            ligne.description
                          }
                          onChange={(
                            event
                          ) =>
                            modifierLigne(
                              ligne.id_local,
                              "description",
                              event.target.value
                            )
                          }
                        />
                      </label>

                      <div className="devis-mobile-three">
                        <label className="devis-mobile-field">
                          <span>
                            Quantité
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              ligne.quantite
                            }
                            onChange={(
                              event
                            ) =>
                              modifierLigne(
                                ligne.id_local,
                                "quantite",
                                nombre(
                                  event.target.value
                                )
                              )
                            }
                          />
                        </label>

                        <label className="devis-mobile-field">
                          <span>
                            Unité
                          </span>

                          <input
                            value={
                              ligne.unite
                            }
                            onChange={(
                              event
                            ) =>
                              modifierLigne(
                                ligne.id_local,
                                "unite",
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <label className="devis-mobile-field">
                          <span>
                            TVA %
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={
                              ligne.tva
                            }
                            onChange={(
                              event
                            ) =>
                              modifierLigne(
                                ligne.id_local,
                                "tva",
                                nombre(
                                  event.target.value
                                )
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="devis-mobile-two">
                        <label className="devis-mobile-field">
                          <span>
                            Prix unitaire HT
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              ligne.prix_unitaire_ht
                            }
                            onChange={(
                              event
                            ) =>
                              modifierLigne(
                                ligne.id_local,
                                "prix_unitaire_ht",
                                nombre(
                                  event.target.value
                                )
                              )
                            }
                          />
                        </label>

                        <label className="devis-mobile-field">
                          <span>
                            Remise %
                          </span>

                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={
                              ligne.remise_pourcent
                            }
                            onChange={(
                              event
                            ) =>
                              modifierLigne(
                                ligne.id_local,
                                "remise_pourcent",
                                nombre(
                                  event.target.value
                                )
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="devis-mobile-line-total">
                        <span>
                          Total HT
                        </span>

                        <strong>
                          {formatMontant(
                            total.totalHt
                          )}
                        </strong>
                      </div>
                    </section>
                  );
                }
              )}
            </div>

            <button
              type="button"
              className="devis-mobile-secondary-action"
              onClick={() =>
                setLignes(
                  (
                    anciennes
                  ) => [
                    ...anciennes,
                    ligneLibre(),
                  ]
                )
              }
            >
              ＋ Ligne supplémentaire
            </button>

            <section className="devis-mobile-card">
              <h3>
                Informations du devis
              </h3>

              <label className="devis-mobile-field">
                <span>
                  Objet
                </span>

                <input
                  value={
                    formulaire.objet
                  }
                  onChange={(
                    event
                  ) =>
                    modifierFormulaire(
                      "objet",
                      event.target.value
                    )
                  }
                  placeholder="Ex : Taille et entretien du jardin"
                />
              </label>

              <label className="devis-mobile-field">
                <span>
                  Description
                </span>

                <textarea
                  rows={3}
                  value={
                    formulaire.description
                  }
                  onChange={(
                    event
                  ) =>
                    modifierFormulaire(
                      "description",
                      event.target.value
                    )
                  }
                />
              </label>

              <div className="devis-mobile-two">
                <label className="devis-mobile-field">
                  <span>
                    Date du devis
                  </span>

                  <input
                    type="date"
                    value={
                      formulaire.date_devis
                    }
                    onChange={(
                      event
                    ) =>
                      modifierFormulaire(
                        "date_devis",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="devis-mobile-field">
                  <span>
                    Valable jusqu’au
                  </span>

                  <input
                    type="date"
                    min={
                      formulaire.date_devis
                    }
                    value={
                      formulaire.date_validite
                    }
                    onChange={(
                      event
                    ) =>
                      modifierFormulaire(
                        "date_validite",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>
            </section>

            <section className="devis-mobile-card">
              <h3>
                Adresse du chantier
              </h3>

              <label className="devis-mobile-field">
                <span>
                  Adresse
                </span>

                <input
                  value={
                    formulaire.adresse_chantier
                  }
                  onChange={(
                    event
                  ) =>
                    modifierFormulaire(
                      "adresse_chantier",
                      event.target.value
                    )
                  }
                />
              </label>

              <div className="devis-mobile-two">
                <label className="devis-mobile-field">
                  <span>
                    Code postal
                  </span>

                  <input
                    value={
                      formulaire.code_postal_chantier
                    }
                    onChange={(
                      event
                    ) =>
                      modifierFormulaire(
                        "code_postal_chantier",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="devis-mobile-field">
                  <span>
                    Ville
                  </span>

                  <input
                    value={
                      formulaire.ville_chantier
                    }
                    onChange={(
                      event
                    ) =>
                      modifierFormulaire(
                        "ville_chantier",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <label className="devis-mobile-field">
                <span>
                  Notes chantier
                </span>

                <textarea
                  rows={3}
                  value={
                    formulaire.notes_chantier
                  }
                  onChange={(
                    event
                  ) =>
                    modifierFormulaire(
                      "notes_chantier",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="devis-mobile-field">
                <span>
                  Conditions
                </span>

                <textarea
                  rows={4}
                  value={
                    formulaire.conditions
                  }
                  onChange={(
                    event
                  ) =>
                    modifierFormulaire(
                      "conditions",
                      event.target.value
                    )
                  }
                />
              </label>
            </section>

            <button
              type="button"
              className="devis-mobile-primary"
              onClick={() =>
                allerEtape(4)
              }
            >
              Voir le récapitulatif

              <span>
                →
              </span>
            </button>
          </>
        ) : null}

        {etape === 4 ? (
          <>
            <section className="devis-mobile-intro">
              <small>
                ÉTAPE 4
              </small>

              <h2>
                Récapitulatif
              </h2>

              <p>
                Vérifiez une dernière fois avant de créer le devis.
              </p>
            </section>

            <section className="devis-mobile-recap-card">
              <small>
                CLIENT
              </small>

              <h3>
                {nomClient(
                  clientSelectionne
                )}
              </h3>

              <p>
                {adresseClient(
                  clientSelectionne
                ) ||
                  "Adresse non renseignée"}
              </p>
            </section>

            <section className="devis-mobile-recap-card">
              <div className="devis-mobile-recap-title">
                <small>
                  PRESTATIONS
                </small>

                <button
                  type="button"
                  onClick={() =>
                    allerEtape(3)
                  }
                >
                  Modifier
                </button>
              </div>

              <div className="devis-mobile-recap-lines">
                {lignes.map(
                  (
                    ligne
                  ) => {
                    const total =
                      calculLigne(
                        ligne
                      );

                    return (
                      <div
                        key={
                          ligne.id_local
                        }
                      >
                        <span>
                          <strong>
                            {ligne.designation}
                          </strong>

                          <small>
                            {ligne.quantite}{" "}
                            {ligne.unite}

                            {ligne.remise_pourcent > 0
                              ? ` • remise ${ligne.remise_pourcent}%`
                              : ""}
                          </small>
                        </span>

                        <strong>
                          {formatMontant(
                            total.totalHt
                          )}
                        </strong>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            <section className="devis-mobile-totals">
              <div>
                <span>
                  Total HT
                </span>

                <strong>
                  {formatMontant(
                    totaux.totalHt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  TVA
                </span>

                <strong>
                  {formatMontant(
                    totaux.totalTva
                  )}
                </strong>
              </div>

              <div className="total">
                <span>
                  TOTAL TTC
                </span>

                <strong>
                  {formatMontant(
                    totaux.totalTtc
                  )}
                </strong>
              </div>
            </section>

            <section className="devis-mobile-recap-card">
              <small>
                CHANTIER
              </small>

              <h3>
                {formulaire.objet ||
                  "Devis sans objet"}
              </h3>

              <p>
                {[
                  formulaire.adresse_chantier,
                  [
                    formulaire.code_postal_chantier,
                    formulaire.ville_chantier,
                  ]
                    .filter(Boolean)
                    .join(" "),
                ]
                  .filter(Boolean)
                  .join(", ") ||
                  "Adresse non renseignée"}
              </p>
            </section>

            <div className="devis-mobile-number-info">
              <span>
                🔒
              </span>

              <p>
                Le numéro officiel est généré par Arboboard uniquement après l’enregistrement correct du devis et de ses prestations.
              </p>
            </div>

            <button
              type="button"
              className="devis-mobile-primary devis-mobile-create"
              disabled={
                enregistrement
              }
              onClick={() =>
                void creerDevis()
              }
            >
              {enregistrement
                ? "Création du devis…"
                : "✓ CRÉER LE DEVIS"}
            </button>
          </>
        ) : null}

        {etape === 5 &&
        resultat ? (
          <>
            <section className="devis-mobile-final">
              <div className="devis-mobile-final-check">
                ✓
              </div>

              <small>
                DEVIS CRÉÉ
              </small>

              <h2>
                {resultat.numero}
              </h2>

              <p>
                Devis créé avec succès pour{" "}
                <strong>
                  {resultat.clientNom}
                </strong>
              </p>

              <div className="devis-mobile-final-total">
                <span>
                  TOTAL TTC
                </span>

                <strong>
                  {formatMontant(
                    resultat.totalTtc
                  )}
                </strong>
              </div>
            </section>

            <section className="devis-mobile-final-actions">
              <button
                type="button"
                disabled={
                  actionFinale !== null
                }
                onClick={() =>
                  void voirPdf()
                }
              >
                <span>
                  📄
                </span>

                <div>
                  <strong>
                    Voir le PDF
                  </strong>

                  <small>
                    Aperçu officiel du devis
                  </small>
                </div>

                <b>
                  ›
                </b>
              </button>

              <label className="devis-mobile-field">
                <span>
                  Email du client
                </span>

                <input
                  type="email"
                  value={
                    emailEnvoi
                  }
                  onChange={(
                    event
                  ) =>
                    setEmailEnvoi(
                      event.target.value
                    )
                  }
                  placeholder="client@email.fr"
                />
              </label>

              <button
                type="button"
                disabled={
                  actionFinale !== null ||
                  !emailEnvoi.trim()
                }
                onClick={() =>
                  void envoyerEmail()
                }
              >
                <span>
                  ✉️
                </span>

                <div>
                  <strong>
                    Envoyer au client
                  </strong>

                  <small>
                    PDF joint automatiquement
                  </small>
                </div>

                <b>
                  ›
                </b>
              </button>

              <button
                type="button"
                disabled={
                  actionFinale !== null
                }
                onClick={() =>
                  void partagerPdf()
                }
              >
                <span>
                  ↗
                </span>

                <div>
                  <strong>
                    Partager
                  </strong>

                  <small>
                    WhatsApp, mail ou autre application
                  </small>
                </div>

                <b>
                  ›
                </b>
              </button>
            </section>

            {actionFinale ? (
              <div className="devis-mobile-action-loading">
                Traitement en cours…
              </div>
            ) : null}

            <button
              type="button"
              className="devis-mobile-primary"
              onClick={
                fermer
              }
            >
              Retour aux devis

              <span>
                →
              </span>
            </button>

            <button
              type="button"
              className="devis-mobile-secondary-action"
              onClick={
                nouveauDevis
              }
            >
              ＋ Créer un autre devis
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}