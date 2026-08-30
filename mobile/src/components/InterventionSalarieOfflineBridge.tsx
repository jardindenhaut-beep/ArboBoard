import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  PointerEvent as ReactPointerEvent,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import {
  ajouterActionHorsLigne,
  ecouterEtatHorsLigne,
  estEnLigne,
  lireCache,
  mettreEnCache,
} from "../lib/offline";

import {
  enregistrerPhotoHorsLigne,
  listerPhotosHorsLigne,
  obtenirApercuPhotoHorsLigne,
  supprimerPhotoHorsLigne,
  type CategoriePhotoHorsLigne,
  type PhotoHorsLigneEnAttente,
} from "../lib/offlinePhotos";

import {
  enregistrerPvHorsLigne,
  lirePvHorsLigne,
  type PayloadPvHorsLigne,
} from "../lib/offlinePv";

import {
  ACTION_PREPARATION_ELEMENT,
  ACTION_VALIDER_ARRIVEE,
  ACTION_VALIDER_FIN,
  ACTION_VALIDER_MATERIEL,
} from "../lib/syncInterventions";

import InterventionSalarieMobile from "./InterventionSalarieMobile";

import "./InterventionSalarieOfflineBridge.css";

type Props = {
  entrepriseId: string;
  ficheId: string;

  salarieId?:
    string | null;

  profilId?:
    string | null;

  email?:
    string | null;

  onFermer:
    () => void;

  onActualiser?:
    () => void;

  onModification?:
    () => void;

  onOuvrirPv?:
    () => void;
};

type FicheIntervention = {
  id: string;
  entreprise_id: string;

  salarie_id?:
    string | null;

  numero?:
    string | null;

  titre?:
    string | null;

  type_intervention?:
    string | null;

  client_id?:
    string | null;

  client_nom?:
    string | null;

  salarie_nom?:
    string | null;

  adresse?:
    string | null;

  adresse_chantier?:
    string | null;

  code_postal?:
    string | null;

  code_postal_chantier?:
    string | null;

  ville?:
    string | null;

  ville_chantier?:
    string | null;

  notes_chantier?:
    string | null;

  travaux_prevus?:
    string | null;

  materiel_prevu?:
    string | null;

  consignes_securite?:
    string | null;

  notes_internes?:
    string | null;

  statut?:
    string | null;

  heure_debut?:
    string | null;

  heure_fin?:
    string | null;

  heure_debut_prevue?:
    string | null;

  heure_fin_prevue?:
    string | null;

  heure_debut_reelle?:
    string | null;

  heure_fin_reelle?:
    string | null;

  etape_materiel_statut?:
    string | null;

  etape_arrivee_statut?:
    string | null;

  etape_fin_statut?:
    string | null;

  materiel_valide_at?:
    string | null;

  arrivee_validee_at?:
    string | null;

  fin_validee_at?:
    string | null;

  commentaire_preparation?:
    string | null;

  commentaire_arrivee?:
    string | null;

  commentaire_fin?:
    string | null;

  probleme_signale?:
    boolean | null;

  description_probleme?:
    string | null;

  pv_fin_chantier_id?:
    string | null;

  updated_at?:
    string | null;
};

type FicheElement = {
  id: string;
  entreprise_id: string;
  fiche_id: string;

  nom: string;
  categorie: string;

  icone?:
    string | null;

  quantite_prevue?:
    number | null;

  unite?:
    string | null;

  obligatoire?:
    boolean | null;

  coche_prepare?:
    boolean | null;

  commentaire_chef?:
    string | null;

  commentaire_salarie?:
    string | null;

  ordre?:
    number | null;
};

type FicheSalarie = {
  id: string;
  entreprise_id: string;
  fiche_id: string;

  salarie_id?:
    string | null;

  salarie_nom?:
    string | null;

  role_chantier?:
    string | null;

  heure_arrivee_prevue?:
    string | null;

  heure_depart_prevue?:
    string | null;

  heure_arrivee_reelle?:
    string | null;

  heure_depart_reelle?:
    string | null;
};

type CacheIntervention = {
  fiche:
    FicheIntervention;

  elements:
    FicheElement[];

  equipe:
    FicheSalarie[];

  affectation:
    FicheSalarie | null;

  enregistreLe:
    string;
};

type Etape =
  | 1
  | 2
  | 3
  | 4
  | 5;

function cleCache(
  entrepriseId:
    string,
  ficheId:
    string
) {
  return `salarie:intervention:${entrepriseId}:${ficheId}`;
}

function maintenantIso() {
  return new Date().toISOString();
}

function heureMaintenant() {
  const date =
    new Date();

  return `${String(
    date.getHours()
  ).padStart(
    2,
    "0"
  )}:${String(
    date.getMinutes()
  ).padStart(
    2,
    "0"
  )}`;
}

function nettoyerTexte(
  valeur:
    string
) {
  const texte =
    valeur.trim();

  return texte
    ? texte
    : null;
}

function titreFiche(
  fiche:
    FicheIntervention
) {
  return (
    fiche.titre ||
    fiche.type_intervention ||
    fiche.numero ||
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

  return (
    [
      adresse,
      [
        cp,
        ville,
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        ),
    ]
      .filter(
        Boolean
      )
      .join(
        ", "
      ) ||
    "Adresse non renseignée"
  );
}

function formatDateHeure(
  valeur:
    string | null | undefined
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
        hour:
          "2-digit",
        minute:
          "2-digit",
      }
    ).format(
      new Date(
        valeur
      )
    );
  } catch {
    return valeur;
  }
}

function iconeCategorie(
  categorie:
    string
) {
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
    "travaux"
  ) {
    return "✅";
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


const CATEGORIES_PHOTOS: {
  value: CategoriePhotoHorsLigne;
  label: string;
  icone: string;
}[] = [
  {
    value: "avant",
    label: "Avant",
    icone: "📸",
  },
  {
    value: "pendant",
    label: "Pendant",
    icone: "🛠️",
  },
  {
    value: "apres",
    label: "Après",
    icone: "✅",
  },
  {
    value: "probleme",
    label: "Problème",
    icone: "⚠️",
  },
];

function libelleCategoriePhoto(
  categorie:
    CategoriePhotoHorsLigne
) {
  return (
    CATEGORIES_PHOTOS.find(
      (
        item
      ) =>
        item.value ===
        categorie
    )?.label ||
    categorie
  );
}


function interventionTermineePourPv(
  fiche:
    FicheIntervention
) {
  const statut =
    String(
      fiche.statut ||
        ""
    )
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .trim()
      .toLowerCase();

  return (
    statut ===
      "terminee" ||
    statut.includes(
      "termine"
    )
  );
}

type SignatureOfflineProps = {
  titre: string;
  sousTitre: string;

  valeur: string;

  onChange:
    (
      valeur:
        string
    ) => void;

  disabled?:
    boolean;
};

function SignatureOffline({
  titre,
  sousTitre,
  valeur,
  onChange,
  disabled = false,
}: SignatureOfflineProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const dessinEnCours =
    useRef(
      false
    );

  const dernierPoint =
    useRef<{
      x: number;
      y: number;
    } | null>(
      null
    );

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (
      !canvas
    ) {
      return;
    }

    function preparer() {
      const canvasActuel =
        canvasRef.current;

      if (
        !canvasActuel
      ) {
        return;
      }

      const rect =
        canvasActuel.getBoundingClientRect();

      const ratio =
        Math.max(
          1,
          Math.min(
            window.devicePixelRatio ||
              1,
            3
          )
        );

      const largeur =
        Math.max(
          1,
          Math.floor(
            rect.width *
              ratio
          )
        );

      const hauteur =
        Math.max(
          1,
          Math.floor(
            rect.height *
              ratio
          )
        );

      if (
        canvasActuel.width !==
          largeur ||
        canvasActuel.height !==
          hauteur
      ) {
        canvasActuel.width =
          largeur;

        canvasActuel.height =
          hauteur;
      }

      const contexte =
        canvasActuel.getContext(
          "2d"
        );

      if (
        !contexte
      ) {
        return;
      }

      contexte.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
      );

      contexte.clearRect(
        0,
        0,
        rect.width,
        rect.height
      );

      contexte.fillStyle =
        "#ffffff";

      contexte.fillRect(
        0,
        0,
        rect.width,
        rect.height
      );

      contexte.lineCap =
        "round";

      contexte.lineJoin =
        "round";

      contexte.lineWidth =
        2.5;

      contexte.strokeStyle =
        "#173b31";

      if (
        valeur
      ) {
        const image =
          new Image();

        image.onload =
          () => {
            const contexteActuel =
              canvasActuel.getContext(
                "2d"
              );

            if (
              !contexteActuel
            ) {
              return;
            }

            contexteActuel.drawImage(
              image,
              0,
              0,
              rect.width,
              rect.height
            );
          };

        image.src =
          valeur;
      }
    }

    preparer();

    window.addEventListener(
      "resize",
      preparer
    );

    return () => {
      window.removeEventListener(
        "resize",
        preparer
      );
    };
  }, [
    valeur,
  ]);

  function point(
    evenement:
      ReactPointerEvent<HTMLCanvasElement>
  ) {
    const canvas =
      canvasRef.current;

    if (
      !canvas
    ) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        evenement.clientX -
        rect.left,

      y:
        evenement.clientY -
        rect.top,
    };
  }

  function commencer(
    evenement:
      ReactPointerEvent<HTMLCanvasElement>
  ) {
    if (
      disabled
    ) {
      return;
    }

    evenement.preventDefault();

    evenement.currentTarget.setPointerCapture(
      evenement.pointerId
    );

    dessinEnCours.current =
      true;

    const premier =
      point(
        evenement
      );

    dernierPoint.current =
      premier;

    const canvas =
      canvasRef.current;

    const contexte =
      canvas?.getContext(
        "2d"
      );

    if (
      contexte
    ) {
      contexte.beginPath();

      contexte.arc(
        premier.x,
        premier.y,
        1.25,
        0,
        Math.PI *
          2
      );

      contexte.fillStyle =
        "#173b31";

      contexte.fill();
    }
  }

  function dessiner(
    evenement:
      ReactPointerEvent<HTMLCanvasElement>
  ) {
    if (
      disabled ||
      !dessinEnCours.current
    ) {
      return;
    }

    evenement.preventDefault();

    const canvas =
      canvasRef.current;

    const precedent =
      dernierPoint.current;

    if (
      !canvas ||
      !precedent
    ) {
      return;
    }

    const contexte =
      canvas.getContext(
        "2d"
      );

    if (
      !contexte
    ) {
      return;
    }

    const courant =
      point(
        evenement
      );

    contexte.beginPath();

    contexte.moveTo(
      precedent.x,
      precedent.y
    );

    contexte.lineTo(
      courant.x,
      courant.y
    );

    contexte.stroke();

    dernierPoint.current =
      courant;
  }

  function terminer(
    evenement:
      ReactPointerEvent<HTMLCanvasElement>
  ) {
    if (
      disabled ||
      !dessinEnCours.current
    ) {
      return;
    }

    evenement.preventDefault();

    dessinEnCours.current =
      false;

    dernierPoint.current =
      null;

    const canvas =
      canvasRef.current;

    if (
      !canvas
    ) {
      return;
    }

    onChange(
      canvas.toDataURL(
        "image/png"
      )
    );
  }

  function effacer() {
    if (
      disabled
    ) {
      return;
    }

    onChange(
      ""
    );
  }

  return (
    <section className="offline-pv-signature">
      <div className="offline-pv-signature-heading">
        <div>
          <strong>
            {titre}
          </strong>

          <small>
            {sousTitre}
          </small>
        </div>

        <span
          className={
            valeur
              ? "done"
              : ""
          }
        >
          {valeur
            ? "✓ Signée"
            : "À signer"}
        </span>
      </div>

      <div className="offline-pv-canvas-wrap">
        <canvas
          ref={
            canvasRef
          }
          className="offline-pv-canvas"
          onPointerDown={
            commencer
          }
          onPointerMove={
            dessiner
          }
          onPointerUp={
            terminer
          }
          onPointerCancel={
            terminer
          }
          onPointerLeave={
            (
              evenement
            ) => {
              if (
                dessinEnCours.current
              ) {
                terminer(
                  evenement
                );
              }
            }
          }
        />

        {!valeur ? (
          <span className="offline-pv-sign-hint">
            Signez ici avec le doigt
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className="offline-pv-clear"
        disabled={
          disabled ||
          !valeur
        }
        onClick={
          effacer
        }
      >
        Effacer la signature
      </button>
    </section>
  );
}

export default function InterventionSalarieOfflineBridge({
  entrepriseId,
  ficheId,
  salarieId,
  profilId,
  email,
  onFermer,
  onActualiser,
  onModification,
  onOuvrirPv,
}: Props) {
  const [
    modeHorsLigne,
    setModeHorsLigne,
  ] =
    useState(
      !estEnLigne()
    );

  const [
    cache,
    setCache,
  ] =
    useState<CacheIntervention | null>(
      null
    );

  const [
    chargement,
    setChargement,
  ] =
    useState(
      !estEnLigne()
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

  const [
    etape,
    setEtape,
  ] =
    useState<Etape>(
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
    categoriePhoto,
    setCategoriePhoto,
  ] =
    useState<CategoriePhotoHorsLigne>(
      "pendant"
    );

  const [
    commentairePhoto,
    setCommentairePhoto,
  ] =
    useState(
      ""
    );

  const [
    photosEnAttente,
    setPhotosEnAttente,
  ] =
    useState<
      PhotoHorsLigneEnAttente[]
    >(
      []
    );

  const [
    apercusPhotos,
    setApercusPhotos,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    photoEnCours,
    setPhotoEnCours,
  ] =
    useState(
      false
    );

  const inputCameraRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const inputGalerieRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const [
    pvClientPresent,
    setPvClientPresent,
  ] =
    useState(
      true
    );

  const [
    pvChantierTermine,
    setPvChantierTermine,
  ] =
    useState(
      true
    );

  const [
    pvReserves,
    setPvReserves,
  ] =
    useState(
      ""
    );

  const [
    pvCommentaireClient,
    setPvCommentaireClient,
  ] =
    useState(
      ""
    );

  const [
    pvCommentaireEntreprise,
    setPvCommentaireEntreprise,
  ] =
    useState(
      ""
    );

  const [
    pvClientEmail,
    setPvClientEmail,
  ] =
    useState(
      ""
    );

  const [
    pvSignataireClient,
    setPvSignataireClient,
  ] =
    useState(
      ""
    );

  const [
    pvSignataireEntreprise,
    setPvSignataireEntreprise,
  ] =
    useState(
      ""
    );

  const [
    pvSignatureClient,
    setPvSignatureClient,
  ] =
    useState(
      ""
    );

  const [
    pvSignatureEntreprise,
    setPvSignatureEntreprise,
  ] =
    useState(
      ""
    );

  const [
    pvEnregistreLocalement,
    setPvEnregistreLocalement,
  ] =
    useState(
      false
    );

  const [
    pvEnregistrement,
    setPvEnregistrement,
  ] =
    useState(
      false
    );

  useEffect(() => {
    let actif =
      true;

    async function appliquerEtatInitial() {
      if (
        estEnLigne()
      ) {
        setModeHorsLigne(
          false
        );

        await mettreAJourCacheEnLigne();

        return;
      }

      setModeHorsLigne(
        true
      );

      await chargerCacheHorsLigne();

      await chargerPhotosLocales();
    }

    void appliquerEtatInitial();

    const arreter =
      ecouterEtatHorsLigne(
        (
          etatReseau
        ) => {
          if (
            !actif
          ) {
            return;
          }

          if (
            etatReseau.enLigne
          ) {
            setModeHorsLigne(
              false
            );

            void mettreAJourCacheEnLigne();

            return;
          }

          setModeHorsLigne(
            true
          );

          void chargerCacheHorsLigne();

          void chargerPhotosLocales();
        }
      );

    return () => {
      actif =
        false;

      arreter();
    };
  }, [
    entrepriseId,
    ficheId,
    salarieId,
  ]);

  useEffect(() => {
    return () => {
      Object.values(
        apercusPhotos
      ).forEach(
        (
          url
        ) => {
          if (
            url.startsWith(
              "blob:"
            )
          ) {
            URL.revokeObjectURL(
              url
            );
          }
        }
      );
    };
  }, [
    apercusPhotos,
  ]);

  async function sauvegarderCache(
    valeur:
      CacheIntervention
  ) {
    setCache(
      valeur
    );

    await mettreEnCache(
      cleCache(
        entrepriseId,
        ficheId
      ),
      valeur
    );
  }

  function appliquerFormulaire(
    valeur:
      CacheIntervention
  ) {
    setCommentairePreparation(
      valeur.fiche.commentaire_preparation ||
        ""
    );

    setCommentaireArrivee(
      valeur.fiche.commentaire_arrivee ||
        ""
    );

    setCommentaireFin(
      valeur.fiche.commentaire_fin ||
        ""
    );

    setSignalerProbleme(
      valeur.fiche.probleme_signale ===
        true
    );

    setDescriptionProbleme(
      valeur.fiche.description_probleme ||
        ""
    );

    if (
      valeur.fiche.etape_materiel_statut !==
      "valide"
    ) {
      setEtape(
        1
      );
    } else if (
      valeur.fiche.etape_arrivee_statut !==
      "valide"
    ) {
      setEtape(
        2
      );
    } else if (
      valeur.fiche.etape_fin_statut ===
        "valide" ||
      valeur.fiche.etape_fin_statut ===
        "probleme" ||
      valeur.fiche.statut ===
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

  async function mettreAJourCacheEnLigne() {
    try {
      const [
        ficheResult,
        elementsResult,
        equipeResult,
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
            .eq(
              "fiche_id",
              ficheId
            ),
        ]);

      if (
        ficheResult.error ||
        !ficheResult.data
      ) {
        return;
      }

      if (
        elementsResult.error
      ) {
        return;
      }

      const equipe =
        equipeResult.error
          ? []
          : (
              equipeResult.data ||
              []
            ) as FicheSalarie[];

      const fiche =
        ficheResult.data as FicheIntervention;

      const affectation =
        equipe.find(
          (
            ligne
          ) =>
            ligne.salarie_id ===
            salarieId
        ) ||
        (
          fiche.salarie_id ===
            salarieId
            ? {
                id:
                  "legacy",
                entreprise_id:
                  entrepriseId,
                fiche_id:
                  ficheId,
                salarie_id:
                  salarieId ||
                  null,
                salarie_nom:
                  null,
                role_chantier:
                  "Intervenant",
                heure_arrivee_prevue:
                  fiche.heure_debut_prevue ||
                  fiche.heure_debut ||
                  null,
                heure_depart_prevue:
                  fiche.heure_fin_prevue ||
                  fiche.heure_fin ||
                  null,
                heure_arrivee_reelle:
                  fiche.heure_debut_reelle ||
                  null,
                heure_depart_reelle:
                  fiche.heure_fin_reelle ||
                  null,
              } satisfies FicheSalarie
            : null
        );

      await mettreEnCache(
        cleCache(
          entrepriseId,
          ficheId
        ),
        {
          fiche,
          elements:
            (
              elementsResult.data ||
              []
            ) as FicheElement[],
          equipe,
          affectation,
          enregistreLe:
            maintenantIso(),
        } satisfies CacheIntervention
      );
    } catch (
      error
    ) {
      console.warn(
        "Cache intervention mobile :",
        error
      );
    }
  }

  function appliquerPvLocal(
    pv:
      PayloadPvHorsLigne,
    donnees:
      CacheIntervention
  ) {
    setPvClientPresent(
      pv.clientPresent
    );

    setPvChantierTermine(
      pv.chantierTermine
    );

    setPvReserves(
      pv.reserves ||
        ""
    );

    setPvCommentaireClient(
      pv.commentaireClient ||
        ""
    );

    setPvCommentaireEntreprise(
      pv.commentaireEntreprise ||
        ""
    );

    setPvClientEmail(
      pv.clientEmail ||
        ""
    );

    setPvSignataireClient(
      pv.signataireClientNom ||
        donnees.fiche.client_nom ||
        ""
    );

    setPvSignataireEntreprise(
      pv.signataireEntrepriseNom ||
        donnees.affectation?.salarie_nom ||
        donnees.fiche.salarie_nom ||
        email ||
        ""
    );

    setPvSignatureClient(
      pv.signatureClient ||
        ""
    );

    setPvSignatureEntreprise(
      pv.signatureEntreprise ||
        ""
    );

    setPvEnregistreLocalement(
      true
    );
  }

  async function chargerPvLocal(
    donnees:
      CacheIntervention
  ) {
    const pv =
      await lirePvHorsLigne(
        entrepriseId,
        ficheId
      );

    if (
      pv
    ) {
      appliquerPvLocal(
        pv,
        donnees
      );

      return;
    }

    setPvClientPresent(
      true
    );

    setPvChantierTermine(
      true
    );

    setPvReserves(
      ""
    );

    setPvCommentaireClient(
      ""
    );

    setPvCommentaireEntreprise(
      ""
    );

    setPvClientEmail(
      ""
    );

    setPvSignataireClient(
      donnees.fiche.client_nom ||
        ""
    );

    setPvSignataireEntreprise(
      donnees.affectation?.salarie_nom ||
        donnees.fiche.salarie_nom ||
        email ||
        ""
    );

    setPvSignatureClient(
      ""
    );

    setPvSignatureEntreprise(
      ""
    );

    setPvEnregistreLocalement(
      false
    );
  }

  async function chargerCacheHorsLigne() {
    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      const donnees =
        await lireCache<CacheIntervention>(
          cleCache(
            entrepriseId,
            ficheId
          )
        );

      if (
        !donnees?.fiche
      ) {
        throw new Error(
          "Cette intervention n’a pas encore été téléchargée sur cet appareil. Ouvrez-la une fois avec Internet avant le départ."
        );
      }

      setCache(
        donnees
      );

      appliquerFormulaire(
        donnees
      );

      await chargerPvLocal(
        donnees
      );
    } catch (
      error
    ) {
      setErreur(
        error instanceof
          Error
          ? error.message
          : "Intervention hors ligne indisponible."
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  const fiche =
    cache?.fiche ||
    null;

  const elements =
    cache?.elements ||
    [];

  const affectation =
    cache?.affectation ||
    null;

  const materiel =
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

  const tousPrepares =
    materiel.length ===
      0 ||
    materiel.every(
      (
        element
      ) =>
        element.coche_prepare ===
        true
    );

  const materielValide =
    fiche?.etape_materiel_statut ===
    "valide";

  const arriveeValidee =
    fiche?.etape_arrivee_statut ===
    "valide";

  const finValidee =
    fiche?.etape_fin_statut ===
      "valide" ||
    fiche?.etape_fin_statut ===
      "probleme" ||
    fiche?.statut ===
      "terminee";

  async function basculerPreparation(
    element:
      FicheElement
  ) {
    if (
      !cache ||
      materielValide
    ) {
      return;
    }

    const nouvelleValeur =
      !element.coche_prepare;

    const nouveauCache:
      CacheIntervention = {
        ...cache,
        elements:
          cache.elements.map(
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
          ),
        enregistreLe:
          maintenantIso(),
      };

    await sauvegarderCache(
      nouveauCache
    );

    await ajouterActionHorsLigne(
      ACTION_PREPARATION_ELEMENT,
      {
        entrepriseId,
        ficheId,
        elementId:
          element.id,
        cochePrepare:
          nouvelleValeur,
      },
      {
        cleDeduplication:
          `element:${ficheId}:${element.id}`,
      }
    );

    setSucces(
      "Modification enregistrée hors ligne."
    );

    onModification?.();
  }

  async function validerMateriel() {
    if (
      !cache ||
      !fiche ||
      !tousPrepares
    ) {
      setErreur(
        "Cochez tout le matériel et tous les matériaux avant de continuer."
      );

      return;
    }

    const date =
      maintenantIso();

    const commentaire =
      nettoyerTexte(
        commentairePreparation
      );

    const nouveauCache:
      CacheIntervention = {
        ...cache,
        fiche: {
          ...cache.fiche,
          etape_materiel_statut:
            "valide",
          materiel_valide_at:
            date,
          commentaire_preparation:
            commentaire,
          updated_at:
            date,
        },
        enregistreLe:
          date,
      };

    await sauvegarderCache(
      nouveauCache
    );

    await ajouterActionHorsLigne(
      ACTION_VALIDER_MATERIEL,
      {
        entrepriseId,
        ficheId,
        commentairePreparation:
          commentaire,
        materielValideAt:
          date,
      },
      {
        cleDeduplication:
          `materiel:${ficheId}`,
      }
    );

    setErreur(
      ""
    );

    setSucces(
      "Matériel validé hors ligne. Synchronisation automatique dès le retour du réseau."
    );

    setEtape(
      2
    );

    onModification?.();
  }

  async function validerArrivee() {
    if (
      !cache ||
      !fiche ||
      !affectation ||
      !salarieId
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

    const date =
      maintenantIso();

    const heure =
      fiche.heure_debut_reelle ||
      affectation.heure_arrivee_reelle ||
      heureMaintenant();

    const commentaire =
      nettoyerTexte(
        commentaireArrivee
      );

    const nouveauCache:
      CacheIntervention = {
        ...cache,
        fiche: {
          ...cache.fiche,
          statut:
            "en_cours",
          etape_arrivee_statut:
            "valide",
          arrivee_validee_at:
            date,
          heure_debut_reelle:
            heure,
          commentaire_arrivee:
            commentaire,
          updated_at:
            date,
        },
        affectation: {
          ...affectation,
          heure_arrivee_reelle:
            heure,
        },
        equipe:
          cache.equipe.map(
            (
              ligne
            ) =>
              ligne.id ===
              affectation.id
                ? {
                    ...ligne,
                    heure_arrivee_reelle:
                      heure,
                  }
                : ligne
          ),
        enregistreLe:
          date,
      };

    await sauvegarderCache(
      nouveauCache
    );

    await ajouterActionHorsLigne(
      ACTION_VALIDER_ARRIVEE,
      {
        entrepriseId,
        ficheId,
        salarieId,
        affectationId:
          affectation.id,
        heureArriveeReelle:
          heure,
        commentaireArrivee:
          commentaire,
        arriveeValideeAt:
          date,
      },
      {
        cleDeduplication:
          `arrivee:${ficheId}:${salarieId}`,
      }
    );

    setErreur(
      ""
    );

    setSucces(
      `Arrivée enregistrée hors ligne à ${heure}.`
    );

    setEtape(
      3
    );

    onModification?.();
  }

  async function validerFin() {
    if (
      !cache ||
      !fiche ||
      !affectation ||
      !salarieId
    ) {
      return;
    }

    if (
      !arriveeValidee
    ) {
      setErreur(
        "Validez d’abord votre arrivée."
      );

      return;
    }

    if (
      signalerProbleme &&
      !descriptionProbleme.trim()
    ) {
      setErreur(
        "Décrivez le problème avant de continuer."
      );

      return;
    }

    const date =
      maintenantIso();

    const heure =
      fiche.heure_fin_reelle ||
      affectation.heure_depart_reelle ||
      heureMaintenant();

    const commentaire =
      nettoyerTexte(
        commentaireFin
      );

    const description =
      signalerProbleme
        ? nettoyerTexte(
            descriptionProbleme
          )
        : null;

    const nouveauCache:
      CacheIntervention = {
        ...cache,
        fiche: {
          ...cache.fiche,
          statut:
            signalerProbleme
              ? "en_cours"
              : "terminee",
          etape_fin_statut:
            signalerProbleme
              ? "probleme"
              : "valide",
          fin_validee_at:
            date,
          heure_fin_reelle:
            heure,
          commentaire_fin:
            commentaire,
          probleme_signale:
            signalerProbleme,
          description_probleme:
            description,
          updated_at:
            date,
        },
        affectation: {
          ...affectation,
          heure_depart_reelle:
            heure,
        },
        equipe:
          cache.equipe.map(
            (
              ligne
            ) =>
              ligne.id ===
              affectation.id
                ? {
                    ...ligne,
                    heure_depart_reelle:
                      heure,
                  }
                : ligne
          ),
        enregistreLe:
          date,
      };

    await sauvegarderCache(
      nouveauCache
    );

    await ajouterActionHorsLigne(
      ACTION_VALIDER_FIN,
      {
        entrepriseId,
        ficheId,
        salarieId,
        affectationId:
          affectation.id,
        heureDepartReelle:
          heure,
        commentaireFin:
          commentaire,
        problemeSignale:
          signalerProbleme,
        descriptionProbleme:
          description,
        finValideeAt:
          date,
      },
      {
        cleDeduplication:
          `fin:${ficheId}:${salarieId}`,
      }
    );

    setErreur(
      ""
    );

    setSucces(
      signalerProbleme
        ? "Fin enregistrée hors ligne avec problème signalé."
        : `Fin de chantier enregistrée hors ligne à ${heure}.`
    );

    setEtape(
      5
    );

    onModification?.();
  }

  async function chargerPhotosLocales() {
    try {
      const liste =
        await listerPhotosHorsLigne(
          ficheId
        );

      const entrees =
        await Promise.all(
          liste.map(
            async (
              photo
            ) => {
              try {
                const apercu =
                  await obtenirApercuPhotoHorsLigne(
                    photo
                  );

                return [
                  photo.localPhotoId,
                  apercu,
                ] as const;
              } catch (
                error
              ) {
                console.warn(
                  "Aperçu photo hors ligne :",
                  error
                );

                return [
                  photo.localPhotoId,
                  "",
                ] as const;
              }
            }
          )
        );

      setPhotosEnAttente(
        liste
      );

      setApercusPhotos(
        Object.fromEntries(
          entrees
        )
      );
    } catch (
      error
    ) {
      console.warn(
        "Chargement photos hors ligne :",
        error
      );
    }
  }

  async function ajouterPhotosLocales(
    fichiers:
      File[]
  ) {
    if (
      fichiers.length ===
      0
    ) {
      return;
    }

    if (
      !arriveeValidee
    ) {
      setErreur(
        "Validez d’abord votre arrivée avant d’ajouter des photos chantier."
      );

      return;
    }

    try {
      setPhotoEnCours(
        true
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      let ajoutees =
        0;

      const erreursPhotos:
        string[] =
        [];

      for (
        const fichier
        of fichiers
      ) {
        try {
          await enregistrerPhotoHorsLigne({
            entrepriseId,
            ficheId,

            userId:
              profilId ||
              null,

            categorie:
              categoriePhoto,

            commentaire:
              commentairePhoto,

            fichier,
          });

          ajoutees +=
            1;
        } catch (
          error
        ) {
          erreursPhotos.push(
            error instanceof
              Error
              ? `${fichier.name} : ${error.message}`
              : `${fichier.name} : enregistrement impossible`
          );
        }
      }

      await chargerPhotosLocales();

      if (
        ajoutees >
        0
      ) {
        setCommentairePhoto(
          ""
        );

        setSucces(
          `${ajoutees} photo${ajoutees > 1 ? "s" : ""} enregistrée${ajoutees > 1 ? "s" : ""} sur l’appareil. Envoi automatique dès le retour du réseau.`
        );
      }

      if (
        erreursPhotos.length >
        0
      ) {
        setErreur(
          erreursPhotos.join(
            "\n"
          )
        );
      }

      onModification?.();
    } finally {
      setPhotoEnCours(
        false
      );
    }
  }

  async function supprimerPhotoLocale(
    photo:
      PhotoHorsLigneEnAttente
  ) {
    try {
      setPhotoEnCours(
        true
      );

      setErreur(
        ""
      );

      await supprimerPhotoHorsLigne(
        photo
      );

      await chargerPhotosLocales();

      setSucces(
        "Photo supprimée de l’appareil avant synchronisation."
      );
    } catch (
      error
    ) {
      setErreur(
        error instanceof
          Error
          ? error.message
          : "Impossible de supprimer cette photo."
      );
    } finally {
      setPhotoEnCours(
        false
      );
    }
  }

  async function enregistrerPvLocal() {
    if (
      !cache ||
      !fiche
    ) {
      return;
    }

    if (
      !interventionTermineePourPv(
        fiche
      )
    ) {
      setErreur(
        "Terminez d’abord l’intervention avant de faire signer le PV."
      );

      return;
    }

    if (
      !pvSignataireEntreprise.trim()
    ) {
      setErreur(
        "Renseignez le nom du représentant de l’entreprise."
      );

      return;
    }

    if (
      !pvSignatureEntreprise
    ) {
      setErreur(
        "La signature du représentant de l’entreprise est obligatoire."
      );

      return;
    }

    if (
      pvClientPresent &&
      !pvSignataireClient.trim()
    ) {
      setErreur(
        "Renseignez le nom du client ou du signataire."
      );

      return;
    }

    if (
      pvClientPresent &&
      !pvSignatureClient
    ) {
      setErreur(
        "La signature du client est obligatoire lorsqu’il est présent."
      );

      return;
    }

    if (
      !pvChantierTermine &&
      !pvReserves.trim()
    ) {
      setErreur(
        "Indiquez les réserves ou travaux restant à réaliser."
      );

      return;
    }

    try {
      setPvEnregistrement(
        true
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const pv =
        await enregistrerPvHorsLigne({
          entrepriseId,
          ficheId,

          clientId:
            fiche.client_id ||
            null,

          clientNom:
            fiche.client_nom ||
            null,

          clientEmail:
            pvClientEmail,

          clientPresent:
            pvClientPresent,

          chantierTermine:
            pvChantierTermine,

          reserves:
            pvReserves,

          commentaireClient:
            pvCommentaireClient,

          commentaireEntreprise:
            pvCommentaireEntreprise,

          signataireClientNom:
            pvSignataireClient,

          signatureClient:
            pvSignatureClient,

          signataireEntrepriseNom:
            pvSignataireEntreprise,

          signatureEntreprise:
            pvSignatureEntreprise,
        });

      const date =
        new Date().toISOString();

      const nouveauCache:
        CacheIntervention = {
        ...cache,

        fiche: {
          ...cache.fiche,

          pv_fin_chantier_id:
            `offline:${pv.localPvId}`,

          etape_fin_statut:
            pvChantierTermine
              ? "valide"
              : "probleme",

          updated_at:
            date,
        },

        enregistreLe:
          date,
      };

      await sauvegarderCache(
        nouveauCache
      );

      setPvEnregistreLocalement(
        true
      );

      setSucces(
        "PV signé et enregistré sur cet appareil. Il sera synchronisé automatiquement dès le retour du réseau."
      );

      onModification?.();
    } catch (
      error
    ) {
      setErreur(
        error instanceof
          Error
          ? error.message
          : "Impossible d’enregistrer le PV hors ligne."
      );
    } finally {
      setPvEnregistrement(
        false
      );
    }
  }

  if (
    !modeHorsLigne
  ) {
    return (
      <InterventionSalarieMobile
        entrepriseId={
          entrepriseId
        }
        ficheId={
          ficheId
        }
        onFermer={
          onFermer
        }
      />
    );
  }

  if (
    chargement
  ) {
    return (
      <main className="offline-intervention">
        <section className="offline-intervention-state">
          <div className="offline-intervention-spinner" />

          <strong>
            Chargement du chantier hors ligne…
          </strong>
        </section>
      </main>
    );
  }

  if (
    erreur &&
    !fiche
  ) {
    return (
      <main className="offline-intervention">
        <header className="offline-intervention-header">
          <button
            type="button"
            onClick={
              onFermer
            }
          >
            ‹
          </button>

          <div>
            <small>
              MODE HORS LIGNE
            </small>

            <h1>
              Intervention
            </h1>
          </div>

          <span>
            ○
          </span>
        </header>

        <section className="offline-intervention-content">
          <div className="offline-intervention-error">
            <strong>
              Chantier indisponible hors ligne
            </strong>

            <p>
              {erreur}
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (
    !fiche ||
    !cache
  ) {
    return null;
  }

  const travaux =
    elements.filter(
      (
        element
      ) =>
        element.categorie ===
        "travaux"
    );

  const securite =
    elements.filter(
      (
        element
      ) =>
        element.categorie ===
          "consigne_securite" ||
        element.categorie ===
          "consigne_chantier"
    );

  return (
    <main className="offline-intervention">
      <header className="offline-intervention-header">
        <button
          type="button"
          onClick={
            onFermer
          }
          aria-label="Retour"
        >
          ‹
        </button>

        <div>
          <small>
            MODE HORS LIGNE
          </small>

          <h1>
            {titreFiche(
              fiche
            )}
          </h1>
        </div>

        <span
          className="offline-intervention-network"
          title="Hors ligne"
        >
          ○
        </span>
      </header>

      <section className="offline-intervention-content">
        <section className="offline-intervention-banner">
          <span>
            ↻
          </span>

          <div>
            <strong>
              Travail hors ligne
            </strong>

            <p>
              Vos actions sont enregistrées sur l’appareil et seront synchronisées automatiquement dès que le réseau revient.
            </p>
          </div>
        </section>

        {erreur ? (
          <div className="offline-intervention-error">
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div className="offline-intervention-success">
            {succes}
          </div>
        ) : null}

        <section className="offline-intervention-hero">
          <p>
            {fiche.client_nom ||
              "Client"}
          </p>

          <h2>
            {titreFiche(
              fiche
            )}
          </h2>

          <div>
            📍{" "}
            {adresseFiche(
              fiche
            )}
          </div>
        </section>

        <nav className="offline-intervention-steps">
          {[
            [1, "Matériel"],
            [2, "Arrivée"],
            [3, "Chantier"],
            [4, "Fin"],
            [5, "PV"],
          ].map(
            (
              [
                numero,
                titre,
              ]
            ) => (
              <button
                key={
                  numero
                }
                type="button"
                className={
                  etape ===
                  numero
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setEtape(
                    numero as Etape
                  )
                }
              >
                <span>
                  {numero}
                </span>

                <small>
                  {titre}
                </small>
              </button>
            )
          )}
        </nav>

        {etape ===
        1 ? (
          <>
            <section className="offline-intervention-section-title">
              <span>
                🧰
              </span>

              <div>
                <small>
                  ÉTAPE 1
                </small>

                <h2>
                  Matériel
                </h2>

                <p>
                  Contrôlez le matériel et les matériaux avant le départ.
                </p>
              </div>
            </section>

            {materiel.length ===
            0 ? (
              <section className="offline-intervention-card">
                Aucun matériel spécifique n’est renseigné.
              </section>
            ) : (
              <section className="offline-intervention-list">
                {materiel.map(
                  (
                    element
                  ) => (
                    <button
                      type="button"
                      key={
                        element.id
                      }
                      className={
                        element.coche_prepare
                          ? "done"
                          : ""
                      }
                      disabled={
                        materielValide
                      }
                      onClick={() =>
                        void basculerPreparation(
                          element
                        )
                      }
                    >
                      <span>
                        {element.coche_prepare
                          ? "✓"
                          : iconeCategorie(
                              element.categorie
                            )}
                      </span>

                      <div>
                        <strong>
                          {element.nom}
                        </strong>

                        <small>
                          {element.quantite_prevue
                            ? `${element.quantite_prevue} ${element.unite || ""}`
                            : element.categorie ===
                                "materiaux"
                              ? "Matériau"
                              : "Matériel"}
                        </small>
                      </div>
                    </button>
                  )
                )}
              </section>
            )}

            <label className="offline-intervention-field">
              <span>
                Commentaire préparation
              </span>

              <textarea
                value={
                  commentairePreparation
                }
                onChange={
                  (
                    event
                  ) =>
                    setCommentairePreparation(
                      event.target.value
                    )
                }
                disabled={
                  materielValide
                }
                placeholder="Information utile avant départ…"
              />
            </label>

            {materielValide ? (
              <div className="offline-intervention-complete">
                ✓ Matériel validé{" "}
                {formatDateHeure(
                  fiche.materiel_valide_at
                )}
              </div>
            ) : (
              <button
                type="button"
                className="offline-intervention-main"
                disabled={
                  !tousPrepares
                }
                onClick={() =>
                  void validerMateriel()
                }
              >
                {tousPrepares
                  ? "✓ Valider le matériel"
                  : "Contrôlez tous les éléments"}
              </button>
            )}
          </>
        ) : null}

        {etape ===
        2 ? (
          <>
            <section className="offline-intervention-section-title">
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
                  Validez uniquement lorsque vous êtes arrivé sur place.
                </p>
              </div>
            </section>

            <section className="offline-intervention-card">
              <strong>
                Adresse
              </strong>

              <p>
                {adresseFiche(
                  fiche
                )}
              </p>

              {fiche.notes_chantier ? (
                <>
                  <strong>
                    Notes chantier
                  </strong>

                  <p>
                    {fiche.notes_chantier}
                  </p>
                </>
              ) : null}
            </section>

            <label className="offline-intervention-field">
              <span>
                Commentaire arrivée
              </span>

              <textarea
                value={
                  commentaireArrivee
                }
                onChange={
                  (
                    event
                  ) =>
                    setCommentaireArrivee(
                      event.target.value
                    )
                }
                disabled={
                  arriveeValidee
                }
              />
            </label>

            {arriveeValidee ? (
              <div className="offline-intervention-complete">
                ✓ Arrivée validée à{" "}
                {fiche.heure_debut_reelle ||
                  "—"}
              </div>
            ) : (
              <button
                type="button"
                className="offline-intervention-main"
                disabled={
                  !materielValide
                }
                onClick={() =>
                  void validerArrivee()
                }
              >
                📍 Je suis arrivé —{" "}
                {heureMaintenant()}
              </button>
            )}
          </>
        ) : null}

        {etape ===
        3 ? (
          <>
            <section className="offline-intervention-section-title">
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
                  Tâches et consignes disponibles hors ligne.
                </p>
              </div>
            </section>

            {travaux.length >
            0 ? (
              <section className="offline-intervention-card">
                <h3>
                  Travaux à réaliser
                </h3>

                {travaux.map(
                  (
                    element
                  ) => (
                    <div
                      className="offline-intervention-info-row"
                      key={
                        element.id
                      }
                    >
                      <span>
                        ✅
                      </span>

                      <div>
                        <strong>
                          {element.nom}
                        </strong>

                        {element.commentaire_chef ? (
                          <p>
                            {element.commentaire_chef}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                )}
              </section>
            ) : null}

            {securite.length >
            0 ? (
              <section className="offline-intervention-card">
                <h3>
                  Consignes
                </h3>

                {securite.map(
                  (
                    element
                  ) => (
                    <div
                      className="offline-intervention-info-row"
                      key={
                        element.id
                      }
                    >
                      <span>
                        {iconeCategorie(
                          element.categorie
                        )}
                      </span>

                      <div>
                        <strong>
                          {element.nom}
                        </strong>

                        {element.commentaire_chef ? (
                          <p>
                            {element.commentaire_chef}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                )}
              </section>
            ) : null}

            <section className="offline-intervention-photo-panel">
              <div className="offline-intervention-photo-heading">
                <div>
                  <small>
                    PHOTOS CHANTIER
                  </small>

                  <h3>
                    Photos hors ligne
                  </h3>

                  <p>
                    Les photos restent sur ce téléphone jusqu’à leur envoi dans Arboboard.
                  </p>
                </div>

                <span>
                  {photosEnAttente.length}
                </span>
              </div>

              <div className="offline-intervention-photo-tabs">
                {CATEGORIES_PHOTOS.map(
                  (
                    categorie
                  ) => (
                    <button
                      type="button"
                      key={
                        categorie.value
                      }
                      className={
                        categoriePhoto ===
                        categorie.value
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setCategoriePhoto(
                          categorie.value
                        )
                      }
                    >
                      <span>
                        {categorie.icone}
                      </span>

                      <small>
                        {categorie.label}
                      </small>
                    </button>
                  )
                )}
              </div>

              <label className="offline-intervention-field offline-intervention-photo-comment">
                <span>
                  Commentaire pour les prochaines photos
                </span>

                <textarea
                  value={
                    commentairePhoto
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setCommentairePhoto(
                        event.target.value
                      )
                  }
                  placeholder="Ex. état avant travaux, branche cassée, résultat final…"
                />
              </label>

              <div className="offline-intervention-photo-actions">
                <button
                  type="button"
                  className="offline-intervention-camera"
                  disabled={
                    photoEnCours ||
                    !arriveeValidee
                  }
                  onClick={() =>
                    inputCameraRef.current?.click()
                  }
                >
                  <span>
                    📷
                  </span>

                  <strong>
                    Prendre une photo
                  </strong>
                </button>

                <button
                  type="button"
                  className="offline-intervention-gallery"
                  disabled={
                    photoEnCours ||
                    !arriveeValidee
                  }
                  onClick={() =>
                    inputGalerieRef.current?.click()
                  }
                >
                  <span>
                    🖼️
                  </span>

                  <strong>
                    Galerie
                  </strong>
                </button>
              </div>

              <input
                ref={
                  inputCameraRef
                }
                className="offline-intervention-hidden-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={
                  (
                    event
                  ) => {
                    const fichiers =
                      Array.from(
                        event.currentTarget.files ||
                        []
                      );

                    event.currentTarget.value =
                      "";

                    void ajouterPhotosLocales(
                      fichiers
                    );
                  }
                }
              />

              <input
                ref={
                  inputGalerieRef
                }
                className="offline-intervention-hidden-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={
                  (
                    event
                  ) => {
                    const fichiers =
                      Array.from(
                        event.currentTarget.files ||
                        []
                      );

                    event.currentTarget.value =
                      "";

                    void ajouterPhotosLocales(
                      fichiers
                    );
                  }
                }
              />

              {photoEnCours ? (
                <div className="offline-intervention-photo-saving">
                  Enregistrement de la photo sur l’appareil…
                </div>
              ) : null}

              {photosEnAttente.length >
              0 ? (
                <div className="offline-intervention-photo-grid">
                  {photosEnAttente.map(
                    (
                      photo
                    ) => (
                      <article
                        key={
                          photo.localPhotoId
                        }
                        className="offline-intervention-photo-card"
                      >
                        <div className="offline-intervention-photo-image">
                          {apercusPhotos[
                            photo.localPhotoId
                          ] ? (
                            <img
                              src={
                                apercusPhotos[
                                  photo.localPhotoId
                                ]
                              }
                              alt={`Photo ${libelleCategoriePhoto(
                                photo.categorie
                              )}`}
                            />
                          ) : (
                            <span>
                              📷
                            </span>
                          )}

                          <b>
                            ⟳ En attente
                          </b>
                        </div>

                        <div className="offline-intervention-photo-card-content">
                          <div>
                            <strong>
                              {libelleCategoriePhoto(
                                photo.categorie
                              )}
                            </strong>

                            <small>
                              {new Intl.DateTimeFormat(
                                "fr-FR",
                                {
                                  hour:
                                    "2-digit",
                                  minute:
                                    "2-digit",
                                }
                              ).format(
                                new Date(
                                  photo.createdAt
                                )
                              )}
                            </small>
                          </div>

                          {photo.commentaire ? (
                            <p>
                              {photo.commentaire}
                            </p>
                          ) : null}

                          <button
                            type="button"
                            disabled={
                              photoEnCours
                            }
                            onClick={() =>
                              void supprimerPhotoLocale(
                                photo
                              )
                            }
                          >
                            Supprimer avant envoi
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              ) : (
                <div className="offline-intervention-photo-empty">
                  <span>
                    📷
                  </span>

                  <p>
                    Aucune photo en attente sur cet appareil.
                  </p>
                </div>
              )}
            </section>

            <button
              type="button"
              className="offline-intervention-main"
              disabled={
                !arriveeValidee
              }
              onClick={() =>
                setEtape(
                  4
                )
              }
            >
              Passer à la fin de chantier →
            </button>
          </>
        ) : null}

        {etape ===
        4 ? (
          <>
            <section className="offline-intervention-section-title">
              <span>
                ✓
              </span>

              <div>
                <small>
                  ÉTAPE 4
                </small>

                <h2>
                  Fin de chantier
                </h2>

                <p>
                  Enregistrez l’heure réelle de fin.
                </p>
              </div>
            </section>

            <label className="offline-intervention-field">
              <span>
                Commentaire de fin
              </span>

              <textarea
                value={
                  commentaireFin
                }
                onChange={
                  (
                    event
                  ) =>
                    setCommentaireFin(
                      event.target.value
                    )
                }
                disabled={
                  finValidee
                }
              />
            </label>

            <label className="offline-intervention-toggle">
              <input
                type="checkbox"
                checked={
                  signalerProbleme
                }
                onChange={
                  (
                    event
                  ) =>
                    setSignalerProbleme(
                      event.target.checked
                    )
                }
                disabled={
                  finValidee
                }
              />

              <span>
                <strong>
                  Signaler un problème
                </strong>

                <small>
                  Le chantier reste en cours jusqu’au traitement du problème.
                </small>
              </span>
            </label>

            {signalerProbleme ? (
              <label className="offline-intervention-field">
                <span>
                  Description du problème
                </span>

                <textarea
                  value={
                    descriptionProbleme
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setDescriptionProbleme(
                        event.target.value
                      )
                  }
                  disabled={
                    finValidee
                  }
                />
              </label>
            ) : null}

            {finValidee ? (
              <div className="offline-intervention-complete">
                ✓ Fin enregistrée à{" "}
                {fiche.heure_fin_reelle ||
                  "—"}
              </div>
            ) : (
              <button
                type="button"
                className="offline-intervention-main"
                disabled={
                  !arriveeValidee
                }
                onClick={() =>
                  void validerFin()
                }
              >
                {signalerProbleme
                  ? "⚠ Enregistrer la fin avec problème"
                  : `✓ Terminer le chantier — ${heureMaintenant()}`}
              </button>
            )}
          </>
        ) : null}

        {etape ===
        5 ? (
          <>
            <section className="offline-intervention-section-title">
              <span>
                ✍
              </span>

              <div>
                <small>
                  ÉTAPE 5
                </small>

                <h2>
                  PV / Signature
                </h2>

                <p>
                  Faites signer le PV directement au doigt, même sans réseau.
                </p>
              </div>
            </section>

            {!interventionTermineePourPv(
              fiche
            ) ? (
              <section className="offline-pv-warning">
                <strong>
                  PV non disponible
                </strong>

                <p>
                  L’intervention doit être terminée sans problème bloquant avant de faire signer le PV.
                </p>
              </section>
            ) : (
              <>
                {pvEnregistreLocalement ? (
                  <section className="offline-pv-pending">
                    <span>
                      ✓
                    </span>

                    <div>
                      <strong>
                        PV enregistré sur cet appareil
                      </strong>

                      <p>
                        En attente de synchronisation avec Arboboard.
                      </p>
                    </div>
                  </section>
                ) : null}

                <section className="offline-pv-section">
                  <div className="offline-pv-section-title">
                    <span>
                      1
                    </span>

                    <div>
                      <small>
                        RÉCEPTION
                      </small>

                      <h3>
                        Le chantier est-il terminé ?
                      </h3>
                    </div>
                  </div>

                  <div className="offline-pv-choice-grid">
                    <button
                      type="button"
                      className={
                        pvChantierTermine
                          ? "active success"
                          : ""
                      }
                      onClick={() =>
                        setPvChantierTermine(
                          true
                        )
                      }
                      disabled={
                        pvEnregistrement
                      }
                    >
                      <span>
                        ✓
                      </span>

                      <strong>
                        Oui
                      </strong>

                      <small>
                        Travaux terminés
                      </small>
                    </button>

                    <button
                      type="button"
                      className={
                        !pvChantierTermine
                          ? "active warning"
                          : ""
                      }
                      onClick={() =>
                        setPvChantierTermine(
                          false
                        )
                      }
                      disabled={
                        pvEnregistrement
                      }
                    >
                      <span>
                        !
                      </span>

                      <strong>
                        Avec réserves
                      </strong>

                      <small>
                        Reste à signaler
                      </small>
                    </button>
                  </div>

                  {!pvChantierTermine ? (
                    <label className="offline-pv-field">
                      <span>
                        Réserves *
                      </span>

                      <textarea
                        value={
                          pvReserves
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setPvReserves(
                              event.target.value
                            )
                        }
                        placeholder="Décrivez précisément les réserves ou travaux restant à réaliser."
                        disabled={
                          pvEnregistrement
                        }
                      />
                    </label>
                  ) : (
                    <>
                      <label className="offline-pv-toggle">
                        <input
                          type="checkbox"
                          checked={
                            Boolean(
                              pvReserves.trim()
                            )
                          }
                          onChange={
                            (
                              event
                            ) => {
                              if (
                                event.target.checked
                              ) {
                                if (
                                  !pvReserves
                                ) {
                                  setPvReserves(
                                    "Réserve signalée : "
                                  );
                                }
                              } else {
                                setPvReserves(
                                  ""
                                );
                              }
                            }
                          }
                          disabled={
                            pvEnregistrement
                          }
                        />

                        <span>
                          Ajouter une réserve ou observation
                        </span>
                      </label>

                      {pvReserves ? (
                        <label className="offline-pv-field">
                          <span>
                            Réserves / observations
                          </span>

                          <textarea
                            value={
                              pvReserves
                            }
                            onChange={
                              (
                                event
                              ) =>
                                setPvReserves(
                                  event.target.value
                                )
                            }
                            disabled={
                              pvEnregistrement
                            }
                          />
                        </label>
                      ) : null}
                    </>
                  )}
                </section>

                <section className="offline-pv-section">
                  <div className="offline-pv-section-title">
                    <span>
                      2
                    </span>

                    <div>
                      <small>
                        CLIENT
                      </small>

                      <h3>
                        Le client est-il présent ?
                      </h3>
                    </div>
                  </div>

                  <div className="offline-pv-choice-grid">
                    <button
                      type="button"
                      className={
                        pvClientPresent
                          ? "active success"
                          : ""
                      }
                      onClick={() =>
                        setPvClientPresent(
                          true
                        )
                      }
                      disabled={
                        pvEnregistrement
                      }
                    >
                      <span>
                        👤
                      </span>

                      <strong>
                        Présent
                      </strong>

                      <small>
                        Signature sur place
                      </small>
                    </button>

                    <button
                      type="button"
                      className={
                        !pvClientPresent
                          ? "active neutral"
                          : ""
                      }
                      onClick={() => {
                        setPvClientPresent(
                          false
                        );

                        setPvSignatureClient(
                          ""
                        );
                      }}
                      disabled={
                        pvEnregistrement
                      }
                    >
                      <span>
                        —
                      </span>

                      <strong>
                        Absent
                      </strong>

                      <small>
                        Pas de signature client
                      </small>
                    </button>
                  </div>

                  <label className="offline-pv-field">
                    <span>
                      Email client
                    </span>

                    <input
                      type="email"
                      inputMode="email"
                      value={
                        pvClientEmail
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setPvClientEmail(
                            event.target.value
                          )
                      }
                      placeholder="client@email.fr"
                      disabled={
                        pvEnregistrement
                      }
                    />

                    <small>
                      L’envoi du PV reste géré depuis l’espace Chef après synchronisation.
                    </small>
                  </label>
                </section>

                <section className="offline-pv-section">
                  <div className="offline-pv-section-title">
                    <span>
                      3
                    </span>

                    <div>
                      <small>
                        OBSERVATIONS
                      </small>

                      <h3>
                        Derniers commentaires
                      </h3>
                    </div>
                  </div>

                  <label className="offline-pv-field">
                    <span>
                      Commentaire de l’entreprise
                    </span>

                    <textarea
                      value={
                        pvCommentaireEntreprise
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setPvCommentaireEntreprise(
                            event.target.value
                          )
                      }
                      placeholder="Information utile sur la fin du chantier…"
                      disabled={
                        pvEnregistrement
                      }
                    />
                  </label>

                  {pvClientPresent ? (
                    <label className="offline-pv-field">
                      <span>
                        Commentaire du client
                      </span>

                      <textarea
                        value={
                          pvCommentaireClient
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setPvCommentaireClient(
                              event.target.value
                            )
                        }
                        placeholder="Observation éventuelle du client…"
                        disabled={
                          pvEnregistrement
                        }
                      />
                    </label>
                  ) : null}
                </section>

                <section className="offline-pv-section">
                  <div className="offline-pv-section-title">
                    <span>
                      4
                    </span>

                    <div>
                      <small>
                        ENTREPRISE
                      </small>

                      <h3>
                        Signature de l’intervenant
                      </h3>
                    </div>
                  </div>

                  <label className="offline-pv-field">
                    <span>
                      Nom du représentant *
                    </span>

                    <input
                      type="text"
                      value={
                        pvSignataireEntreprise
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setPvSignataireEntreprise(
                            event.target.value
                          )
                      }
                      placeholder="Nom et prénom"
                      disabled={
                        pvEnregistrement
                      }
                    />
                  </label>

                  <SignatureOffline
                    titre="Signature entreprise"
                    sousTitre="Signez dans le cadre avec le doigt."
                    valeur={
                      pvSignatureEntreprise
                    }
                    onChange={
                      setPvSignatureEntreprise
                    }
                    disabled={
                      pvEnregistrement
                    }
                  />
                </section>

                {pvClientPresent ? (
                  <section className="offline-pv-section offline-pv-client-section">
                    <div className="offline-pv-section-title">
                      <span>
                        5
                      </span>

                      <div>
                        <small>
                          CLIENT
                        </small>

                        <h3>
                          Signature du client
                        </h3>
                      </div>
                    </div>

                    <label className="offline-pv-field">
                      <span>
                        Nom du signataire *
                      </span>

                      <input
                        type="text"
                        value={
                          pvSignataireClient
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setPvSignataireClient(
                              event.target.value
                            )
                        }
                        placeholder="Nom et prénom"
                        disabled={
                          pvEnregistrement
                        }
                      />
                    </label>

                    <SignatureOffline
                      titre="Signature client"
                      sousTitre="Le client signe directement sur le téléphone."
                      valeur={
                        pvSignatureClient
                      }
                      onChange={
                        setPvSignatureClient
                      }
                      disabled={
                        pvEnregistrement
                      }
                    />
                  </section>
                ) : null}

                <section className="offline-pv-final">
                  <small>
                    ENREGISTREMENT HORS LIGNE
                  </small>

                  <h3>
                    Finaliser le PV
                  </h3>

                  <p>
                    Le PV et les signatures seront conservés sur cet appareil puis synchronisés automatiquement dès que la connexion revient.
                  </p>

                  <button
                    type="button"
                    disabled={
                      pvEnregistrement
                    }
                    onClick={() =>
                      void enregistrerPvLocal()
                    }
                  >
                    {pvEnregistrement
                      ? "Enregistrement…"
                      : pvEnregistreLocalement
                        ? "Mettre à jour le PV hors ligne"
                        : "✓ Enregistrer le PV hors ligne"}
                  </button>

                  {pvEnregistreLocalement ? (
                    <p className="offline-pv-final-ok">
                      ✓ PV enregistré localement — PDF disponible après synchronisation
                    </p>
                  ) : null}
                </section>
              </>
            )}
          </>
        ) : null}

        <button
          type="button"
          className="offline-intervention-back-bottom"
          onClick={() => {
            onActualiser?.();
            onFermer();
          }}
        >
          Retour à mes chantiers
        </button>
      </section>
    </main>
  );
}
