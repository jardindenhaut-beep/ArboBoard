import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./PhotosChantierMobile.css";

type CategoriePhoto =
  | "avant"
  | "pendant"
  | "apres"
  | "probleme"
  | "signature"
  | "autre";

export type PhotoChantierMobile = {
  id: string;

  entreprise_id: string;

  fiche_id: string;

  categorie:
    | CategoriePhoto
    | string;

  url: string;

  storage_path?:
    string | null;

  commentaire?:
    string | null;

  uploaded_by?:
    string | null;

  created_at?:
    string | null;

  signed_url?:
    string | null;
};

type Props = {
  entrepriseId: string;

  ficheId: string;

  userId?:
    string | null;

  lectureSeule?:
    boolean;

  categorieInitiale?:
    CategoriePhoto;

  onPhotosChange?: (
    photos:
      PhotoChantierMobile[]
  ) => void;
};

type CategorieConfiguration = {
  value:
    CategoriePhoto;

  label:
    string;

  labelCourt:
    string;

  icone:
    string;

  description:
    string;
};

type ProgressionUpload = {
  categorie:
    CategoriePhoto;

  termine:
    number;

  total:
    number;

  nomFichier:
    string;
};

const CATEGORIES_UPLOAD:
  CategorieConfiguration[] =
  [
    {
      value:
        "avant",

      label:
        "Avant chantier",

      labelCourt:
        "Avant",

      icone:
        "📸",

      description:
        "État du chantier avant de commencer.",
    },

    {
      value:
        "pendant",

      label:
        "Pendant chantier",

      labelCourt:
        "Pendant",

      icone:
        "🛠️",

      description:
        "Avancement et travaux en cours.",
    },

    {
      value:
        "apres",

      label:
        "Après chantier",

      labelCourt:
        "Après",

      icone:
        "✅",

      description:
        "Résultat final de l’intervention.",
    },

    {
      value:
        "probleme",

      label:
        "Problème / réserve",

      labelCourt:
        "Problème",

      icone:
        "⚠️",

      description:
        "Dommage, imprévu ou réserve à documenter.",
    },
  ];

const CATEGORIES_AFFICHAGE:
  CategorieConfiguration[] =
  [
    ...CATEGORIES_UPLOAD,

    {
      value:
        "signature",

      label:
        "Signature",

      labelCourt:
        "Signature",

      icone:
        "✍️",

      description:
        "Élément lié à une signature.",
    },

    {
      value:
        "autre",

      label:
        "Autres photos",

      labelCourt:
        "Autre",

      icone:
        "📎",

      description:
        "Autre élément photographique.",
    },
  ];

const TAILLE_MAX_ORIGINALE =
  10 *
  1024 *
  1024;

const TAILLE_OPTIMISATION =
  3 *
  1024 *
  1024;

const DIMENSION_MAX =
  1920;

function messageErreur(
  error: unknown,
  valeurParDefaut:
    string
) {
  if (
    error instanceof
      Error &&
    error.message
  ) {
    return error.message;
  }

  return valeurParDefaut;
}

function nettoyerNomFichier(
  nom: string
) {
  return nom
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^-|-$/g,
      ""
    )
    .toLowerCase();
}

function extensionDepuisType(
  type: string
) {
  if (
    type ===
    "image/png"
  ) {
    return "png";
  }

  if (
    type ===
    "image/webp"
  ) {
    return "webp";
  }

  return "jpg";
}

function remplacerExtension(
  nom: string,
  extension: string
) {
  const base =
    nom.replace(
      /\.[^/.]+$/,
      ""
    ) ||
    "photo";

  return `${base}.${extension}`;
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
    return "";
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
    return "";
  }
}

function configurationCategorie(
  categorie:
    | string
    | null
    | undefined
) {
  return (
    CATEGORIES_AFFICHAGE.find(
      (
        item
      ) =>
        item.value ===
        categorie
    ) ||
    CATEGORIES_AFFICHAGE.find(
      (
        item
      ) =>
        item.value ===
        "autre"
    )!
  );
}

function estUrlDistante(
  valeur:
    | string
    | null
    | undefined
) {
  return Boolean(
    valeur &&
      /^https?:\/\//i.test(
        valeur
      )
  );
}

function identifiantUnique() {
  if (
    typeof crypto !==
      "undefined" &&
    "randomUUID" in
      crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(
      36
    )
    .slice(
      2,
      10
    )}`;
}

function chargerImage(
  fichier: File
) {
  return new Promise<HTMLImageElement>(
    (
      resolve,
      reject
    ) => {
      const url =
        URL.createObjectURL(
          fichier
        );

      const image =
        new Image();

      image.onload =
        () => {
          URL.revokeObjectURL(
            url
          );

          resolve(
            image
          );
        };

      image.onerror =
        () => {
          URL.revokeObjectURL(
            url
          );

          reject(
            new Error(
              "Impossible de lire cette image."
            )
          );
        };

      image.src =
        url;
    }
  );
}

async function optimiserImage(
  fichier: File
) {
  if (
    fichier.size <=
    TAILLE_OPTIMISATION
  ) {
    return fichier;
  }

  try {
    const image =
      await chargerImage(
        fichier
      );

    const largeurInitiale =
      image.naturalWidth ||
      image.width;

    const hauteurInitiale =
      image.naturalHeight ||
      image.height;

    if (
      !largeurInitiale ||
      !hauteurInitiale
    ) {
      return fichier;
    }

    const ratio =
      Math.min(
        1,
        DIMENSION_MAX /
          largeurInitiale,
        DIMENSION_MAX /
          hauteurInitiale
      );

    const largeur =
      Math.max(
        1,
        Math.round(
          largeurInitiale *
            ratio
        )
      );

    const hauteur =
      Math.max(
        1,
        Math.round(
          hauteurInitiale *
            ratio
        )
      );

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      largeur;

    canvas.height =
      hauteur;

    const contexte =
      canvas.getContext(
        "2d"
      );

    if (
      !contexte
    ) {
      return fichier;
    }

    contexte.drawImage(
      image,
      0,
      0,
      largeur,
      hauteur
    );

    const typeSortie =
      fichier.type ===
        "image/png" &&
      fichier.size <=
        4 *
          1024 *
          1024
        ? "image/png"
        : "image/jpeg";

    const blob =
      await new Promise<Blob | null>(
        (
          resolve
        ) => {
          canvas.toBlob(
            resolve,
            typeSortie,
            typeSortie ===
              "image/jpeg"
              ? 0.82
              : 1
          );
        }
      );

    if (
      !blob ||
      blob.size >=
        fichier.size
    ) {
      return fichier;
    }

    const extension =
      extensionDepuisType(
        typeSortie
      );

    const nom =
      remplacerExtension(
        nettoyerNomFichier(
          fichier.name ||
            "photo.jpg"
        ),
        extension
      );

    return new File(
      [
        blob,
      ],
      nom,
      {
        type:
          typeSortie,

        lastModified:
          fichier.lastModified,
      }
    );
  } catch (
    error
  ) {
    console.warn(
      "Optimisation photo impossible, fichier original conservé :",
      error
    );

    return fichier;
  }
}

export default function PhotosChantierMobile({
  entrepriseId,
  ficheId,
  userId = null,
  lectureSeule = false,
  categorieInitiale = "pendant",
  onPhotosChange,
}: Props) {
  const [
    photos,
    setPhotos,
  ] =
    useState<
      PhotoChantierMobile[]
    >([]);

  const [
    categorieActive,
    setCategorieActive,
  ] =
    useState<CategoriePhoto>(
      categorieInitiale
    );

  const [
    commentaires,
    setCommentaires,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    chargement,
    setChargement,
  ] =
    useState(
      true
    );

  const [
    uploadEnCours,
    setUploadEnCours,
  ] =
    useState<
      CategoriePhoto | null
    >(
      null
    );

  const [
    progressionUpload,
    setProgressionUpload,
  ] =
    useState<
      ProgressionUpload | null
    >(
      null
    );

  const [
    suppressionId,
    setSuppressionId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    photoAgrandie,
    setPhotoAgrandie,
  ] =
    useState<
      PhotoChantierMobile | null
    >(
      null
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

  const inputCameraRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const inputGalerieRef =
    useRef<HTMLInputElement | null>(
      null
    );

  useEffect(() => {
    void chargerPhotos();
  }, [
    entrepriseId,
    ficheId,
  ]);

  const photosParCategorie =
    useMemo(() => {
      const groupes:
        Record<
          string,
          PhotoChantierMobile[]
        > = {};

      photos.forEach(
        (
          photo
        ) => {
          const categorie =
            photo.categorie ||
            "autre";

          if (
            !groupes[
              categorie
            ]
          ) {
            groupes[
              categorie
            ] = [];
          }

          groupes[
            categorie
          ].push(
            photo
          );
        }
      );

      return groupes;
    }, [
      photos,
    ]);

  const nombrePhotosParCategorie =
    useMemo(() => {
      const compteur:
        Record<
          string,
          number
        > = {};

      CATEGORIES_AFFICHAGE.forEach(
        (
          categorie
        ) => {
          compteur[
            categorie.value
          ] =
            photosParCategorie[
              categorie.value
            ]?.length ||
            0;
        }
      );

      return compteur;
    }, [
      photosParCategorie,
    ]);

  const categorieConfiguration =
    configurationCategorie(
      categorieActive
    );

  async function construireUrlPhoto(
    photo:
      PhotoChantierMobile
  ) {
    const chemin =
      photo.storage_path ||
      photo.url;

    if (
      !chemin
    ) {
      return null;
    }

    if (
      !photo.storage_path &&
      estUrlDistante(
        photo.url
      )
    ) {
      return photo.url;
    }

    const {
      data,
      error,
    } =
      await supabase.storage
        .from(
          "interventions-photos"
        )
        .createSignedUrl(
          chemin,
          60 *
            60
        );

    if (
      error
    ) {
      console.error(
        "URL signée photo :",
        error
      );

      return estUrlDistante(
        photo.url
      )
        ? photo.url
        : null;
    }

    return (
      data?.signedUrl ||
      null
    );
  }

  async function chargerPhotos() {
    if (
      !entrepriseId ||
      !ficheId
    ) {
      setPhotos(
        []
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

      setErreur(
        ""
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "fiches_intervention_photos"
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
                false,
            }
          );

      if (
        error
      ) {
        throw error;
      }

      const photosBase =
        (
          data ||
          []
        ) as PhotoChantierMobile[];

      const photosAvecUrls =
        await Promise.all(
          photosBase.map(
            async (
              photo
            ) => ({
              ...photo,

              signed_url:
                await construireUrlPhoto(
                  photo
                ),
            })
          )
        );

      setPhotos(
        photosAvecUrls
      );

      onPhotosChange?.(
        photosAvecUrls
      );
    } catch (
      error
    ) {
      console.error(
        "Chargement photos chantier mobile :",
        error
      );

      setPhotos(
        []
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger les photos chantier."
        )
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  function modifierCommentaire(
    categorie:
      CategoriePhoto,
    valeur:
      string
  ) {
    setCommentaires(
      (
        ancien
      ) => ({
        ...ancien,

        [categorie]:
          valeur,
      })
    );
  }

  function validerFichiers(
    fichiers:
      File[]
  ) {
    const erreurs:
      string[] = [];

    const fichiersValides:
      File[] = [];

    const fichiersVus =
      new Set<string>();

    fichiers.forEach(
      (
        fichier
      ) => {
        if (
          !fichier.type.startsWith(
            "image/"
          )
        ) {
          erreurs.push(
            `${fichier.name} n’est pas une image.`
          );

          return;
        }

        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(
            fichier.type
          )
        ) {
          erreurs.push(
            `${fichier.name} : utilisez JPG, PNG ou WebP.`
          );

          return;
        }

        if (
          fichier.size >
          TAILLE_MAX_ORIGINALE
        ) {
          erreurs.push(
            `${fichier.name} dépasse 10 Mo.`
          );

          return;
        }

        const cle =
          `${fichier.name}-${fichier.size}-${fichier.lastModified}`;

        if (
          fichiersVus.has(
            cle
          )
        ) {
          return;
        }

        fichiersVus.add(
          cle
        );

        fichiersValides.push(
          fichier
        );
      }
    );

    return {
      fichiersValides,
      erreurs,
    };
  }

  async function envoyerPhotos(
    categorie:
      CategoriePhoto,
    fichiersSelectionnes:
      File[]
  ) {
    if (
      lectureSeule ||
      uploadEnCours ||
      !entrepriseId ||
      !ficheId ||
      fichiersSelectionnes.length ===
        0
    ) {
      return;
    }

    const {
      fichiersValides,
      erreurs:
        erreursValidation,
    } =
      validerFichiers(
        fichiersSelectionnes
      );

    if (
      fichiersValides.length ===
      0
    ) {
      setErreur(
        erreursValidation[0] ||
          "Aucune photo valide."
      );

      return;
    }

    try {
      setUploadEnCours(
        categorie
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const commentaire =
        commentaires[
          categorie
        ]?.trim() ||
        null;

      const erreursUpload =
        [
          ...erreursValidation,
        ];

      let nombreEnvoye =
        0;

      for (
        let index = 0;
        index <
        fichiersValides.length;
        index += 1
      ) {
        const fichierOriginal =
          fichiersValides[
            index
          ];

        setProgressionUpload({
          categorie,

          termine:
            index,

          total:
            fichiersValides.length,

          nomFichier:
            fichierOriginal.name,
        });

        let chemin:
          string | null =
          null;

        try {
          const fichier =
            await optimiserImage(
              fichierOriginal
            );

          const nomNettoye =
            nettoyerNomFichier(
              fichier.name ||
                "photo.jpg"
            ) ||
            "photo.jpg";

          chemin =
            `${entrepriseId}/${ficheId}/${categorie}/${Date.now()}-${identifiantUnique()}-${nomNettoye}`;

          const {
            error:
              erreurUpload,
          } =
            await supabase.storage
              .from(
                "interventions-photos"
              )
              .upload(
                chemin,
                fichier,
                {
                  cacheControl:
                    "3600",

                  contentType:
                    fichier.type,

                  upsert:
                    false,
                }
              );

          if (
            erreurUpload
          ) {
            throw erreurUpload;
          }

          const {
            error:
              erreurInsert,
          } =
            await supabase
              .from(
                "fiches_intervention_photos"
              )
              .insert({
                entreprise_id:
                  entrepriseId,

                fiche_id:
                  ficheId,

                categorie,

                url:
                  chemin,

                storage_path:
                  chemin,

                commentaire,

                uploaded_by:
                  userId ||
                  null,
              });

          if (
            erreurInsert
          ) {
            await supabase.storage
              .from(
                "interventions-photos"
              )
              .remove(
                [
                  chemin,
                ]
              );

            throw erreurInsert;
          }

          nombreEnvoye +=
            1;
        } catch (
          error
        ) {
          console.error(
            "Upload photo chantier mobile :",
            error
          );

          erreursUpload.push(
            `${fichierOriginal.name} : ${messageErreur(
              error,
              "envoi impossible"
            )}`
          );
        }
      }

      setProgressionUpload({
        categorie,

        termine:
          fichiersValides.length,

        total:
          fichiersValides.length,

        nomFichier:
          "",
      });

      if (
        nombreEnvoye >
        0
      ) {
        setCommentaires(
          (
            ancien
          ) => ({
            ...ancien,

            [categorie]:
              "",
          })
        );

        setSucces(
          `${nombreEnvoye} photo${
            nombreEnvoye >
            1
              ? "s"
              : ""
          } ajoutée${
            nombreEnvoye >
            1
              ? "s"
              : ""
          }.`
        );

        await chargerPhotos();
      }

      if (
        erreursUpload.length >
        0
      ) {
        setErreur(
          erreursUpload.join(
            " "
          )
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Photos chantier mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible d’envoyer les photos."
        )
      );
    } finally {
      setUploadEnCours(
        null
      );

      setProgressionUpload(
        null
      );
    }
  }

  async function supprimerPhoto(
    photo:
      PhotoChantierMobile
  ) {
    if (
      lectureSeule ||
      suppressionId
    ) {
      return;
    }

    const confirmation =
      window.confirm(
        "Supprimer cette photo du chantier ?"
      );

    if (
      !confirmation
    ) {
      return;
    }

    try {
      setSuppressionId(
        photo.id
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const {
        error:
          erreurBase,
      } =
        await supabase
          .from(
            "fiches_intervention_photos"
          )
          .delete()
          .eq(
            "id",
            photo.id
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "fiche_id",
            ficheId
          );

      if (
        erreurBase
      ) {
        throw erreurBase;
      }

      const chemin =
        photo.storage_path ||
        (
          !estUrlDistante(
            photo.url
          )
            ? photo.url
            : null
        );

      if (
        chemin
      ) {
        const {
          error:
            erreurStorage,
        } =
          await supabase.storage
            .from(
              "interventions-photos"
            )
            .remove(
              [
                chemin,
              ]
            );

        if (
          erreurStorage
        ) {
          console.error(
            "Suppression fichier Storage :",
            erreurStorage
          );
        }
      }

      const nouvelleListe =
        photos.filter(
          (
            item
          ) =>
            item.id !==
            photo.id
        );

      setPhotos(
        nouvelleListe
      );

      onPhotosChange?.(
        nouvelleListe
      );

      if (
        photoAgrandie?.id ===
        photo.id
      ) {
        setPhotoAgrandie(
          null
        );
      }

      setSucces(
        "Photo supprimée."
      );
    } catch (
      error
    ) {
      console.error(
        "Suppression photo mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de supprimer cette photo."
        )
      );
    } finally {
      setSuppressionId(
        null
      );
    }
  }

  function ouvrirCamera() {
    if (
      lectureSeule ||
      uploadEnCours
    ) {
      return;
    }

    inputCameraRef.current?.click();
  }

  function ouvrirGalerie() {
    if (
      lectureSeule ||
      uploadEnCours
    ) {
      return;
    }

    inputGalerieRef.current?.click();
  }

  const photosCategorieActive =
    photosParCategorie[
      categorieActive
    ] ||
    [];

  return (
    <section className="photos-mobile">
      <div className="photos-mobile-heading">
        <div className="photos-mobile-heading-icon">
          📸
        </div>

        <div>
          <span>
            CHANTIER
          </span>

          <h2>
            Photos
          </h2>

          <p>
            Gardez une trace simple du chantier.
          </p>
        </div>

        <strong>
          {
            photos.length
          }
        </strong>
      </div>

      {erreur ? (
        <div className="photos-mobile-error">
          {erreur}
        </div>
      ) : null}

      {succes ? (
        <div className="photos-mobile-success">
          {succes}
        </div>
      ) : null}

      <div className="photos-mobile-tabs">
        {CATEGORIES_UPLOAD.map(
          (
            categorie
          ) => (
            <button
              type="button"
              key={
                categorie.value
              }
              className={
                categorieActive ===
                categorie.value
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategorieActive(
                  categorie.value
                )
              }
            >
              <span>
                {
                  categorie.icone
                }
              </span>

              <small>
                {
                  categorie.labelCourt
                }
              </small>

              {nombrePhotosParCategorie[
                categorie.value
              ] >
              0 ? (
                <b>
                  {
                    nombrePhotosParCategorie[
                      categorie.value
                    ]
                  }
                </b>
              ) : null}
            </button>
          )
        )}
      </div>

      <div className="photos-mobile-category-card">
        <div className="photos-mobile-category-title">
          <span>
            {
              categorieConfiguration.icone
            }
          </span>

          <div>
            <strong>
              {
                categorieConfiguration.label
              }
            </strong>

            <small>
              {
                categorieConfiguration.description
              }
            </small>
          </div>
        </div>

        {!lectureSeule ? (
          <>
            <label className="photos-mobile-comment">
              <span>
                Commentaire facultatif
              </span>

              <textarea
                rows={
                  2
                }
                value={
                  commentaires[
                    categorieActive
                  ] ||
                  ""
                }
                disabled={
                  Boolean(
                    uploadEnCours
                  )
                }
                onChange={(
                  event
                ) =>
                  modifierCommentaire(
                    categorieActive,
                    event.target.value
                  )
                }
                placeholder="Ex : branche cassée côté route..."
              />
            </label>

            <div className="photos-mobile-actions">
              <button
                type="button"
                className="photos-mobile-camera"
                disabled={
                  Boolean(
                    uploadEnCours
                  )
                }
                onClick={
                  ouvrirCamera
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
                className="photos-mobile-gallery"
                disabled={
                  Boolean(
                    uploadEnCours
                  )
                }
                onClick={
                  ouvrirGalerie
                }
              >
                <span>
                  🖼
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
              className="photos-mobile-hidden-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(
                event
              ) => {
                const fichiers =
                  Array.from(
                    event.currentTarget.files ||
                      []
                  );

                event.currentTarget.value =
                  "";

                void envoyerPhotos(
                  categorieActive,
                  fichiers
                );
              }}
            />

            <input
              ref={
                inputGalerieRef
              }
              className="photos-mobile-hidden-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(
                event
              ) => {
                const fichiers =
                  Array.from(
                    event.currentTarget.files ||
                      []
                  );

                event.currentTarget.value =
                  "";

                void envoyerPhotos(
                  categorieActive,
                  fichiers
                );
              }}
            />

            {progressionUpload &&
            progressionUpload.categorie ===
              categorieActive ? (
              <div className="photos-mobile-upload">
                <div className="photos-mobile-upload-row">
                  <strong>
                    Envoi des photos…
                  </strong>

                  <span>
                    {
                      progressionUpload.termine
                    }
                    /
                    {
                      progressionUpload.total
                    }
                  </span>
                </div>

                <div className="photos-mobile-upload-bar">
                  <span
                    style={{
                      width:
                        `${Math.round(
                          (
                            progressionUpload.termine /
                            Math.max(
                              progressionUpload.total,
                              1
                            )
                          ) *
                            100
                        )}%`,
                    }}
                  />
                </div>

                {progressionUpload.nomFichier ? (
                  <small>
                    {
                      progressionUpload.nomFichier
                    }
                  </small>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="photos-mobile-readonly">
            Intervention terminée : consultation des photos uniquement.
          </div>
        )}
      </div>

      <div className="photos-mobile-section-title">
        <h3>
          {
            categorieConfiguration.label
          }
        </h3>

        <span>
          {
            photosCategorieActive.length
          }
        </span>
      </div>

      {chargement ? (
        <div className="photos-mobile-loading">
          <div className="photos-mobile-spinner" />

          <span>
            Chargement des photos…
          </span>
        </div>
      ) : photosCategorieActive.length ===
        0 ? (
        <div className="photos-mobile-empty">
          <span>
            {
              categorieConfiguration.icone
            }
          </span>

          <strong>
            Aucune photo
          </strong>

          <small>
            {lectureSeule
              ? "Aucune photo enregistrée dans cette catégorie."
              : "Prenez une photo ou choisissez-en une dans la galerie."}
          </small>
        </div>
      ) : (
        <div className="photos-mobile-grid">
          {photosCategorieActive.map(
            (
              photo
            ) => (
              <article
                className="photos-mobile-card"
                key={
                  photo.id
                }
              >
                {photo.signed_url ? (
                  <button
                    type="button"
                    className="photos-mobile-image-button"
                    onClick={() =>
                      setPhotoAgrandie(
                        photo
                      )
                    }
                  >
                    <img
                      src={
                        photo.signed_url
                      }
                      alt={
                        configurationCategorie(
                          photo.categorie
                        ).label
                      }
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <div className="photos-mobile-no-preview">
                    Aperçu indisponible
                  </div>
                )}

                <div className="photos-mobile-card-content">
                  <div className="photos-mobile-card-top">
                    <strong>
                      {
                        configurationCategorie(
                          photo.categorie
                        ).icone
                      }{" "}
                      {
                        configurationCategorie(
                          photo.categorie
                        ).labelCourt
                      }
                    </strong>

                    {photo.created_at ? (
                      <small>
                        {formatDate(
                          photo.created_at
                        )}
                      </small>
                    ) : null}
                  </div>

                  {photo.commentaire ? (
                    <p>
                      {
                        photo.commentaire
                      }
                    </p>
                  ) : null}

                  {!lectureSeule ? (
                    <button
                      type="button"
                      className="photos-mobile-delete"
                      disabled={
                        suppressionId !==
                        null
                      }
                      onClick={() =>
                        void supprimerPhoto(
                          photo
                        )
                      }
                    >
                      {suppressionId ===
                      photo.id
                        ? "Suppression…"
                        : "Supprimer"}
                    </button>
                  ) : null}
                </div>
              </article>
            )
          )}
        </div>
      )}

      {photos.some(
        (
          photo
        ) =>
          !CATEGORIES_UPLOAD.some(
            (
              categorie
            ) =>
              categorie.value ===
              photo.categorie
          )
      ) ? (
        <div className="photos-mobile-other">
          <h3>
            Autres éléments
          </h3>

          <div className="photos-mobile-grid">
            {photos
              .filter(
                (
                  photo
                ) =>
                  !CATEGORIES_UPLOAD.some(
                    (
                      categorie
                    ) =>
                      categorie.value ===
                      photo.categorie
                  )
              )
              .map(
                (
                  photo
                ) => (
                  <article
                    className="photos-mobile-card"
                    key={
                      photo.id
                    }
                  >
                    {photo.signed_url ? (
                      <button
                        type="button"
                        className="photos-mobile-image-button"
                        onClick={() =>
                          setPhotoAgrandie(
                            photo
                          )
                        }
                      >
                        <img
                          src={
                            photo.signed_url
                          }
                          alt={
                            configurationCategorie(
                              photo.categorie
                            ).label
                          }
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div className="photos-mobile-no-preview">
                        Aperçu indisponible
                      </div>
                    )}

                    <div className="photos-mobile-card-content">
                      <strong>
                        {
                          configurationCategorie(
                            photo.categorie
                          ).icone
                        }{" "}
                        {
                          configurationCategorie(
                            photo.categorie
                          ).label
                        }
                      </strong>

                      {photo.commentaire ? (
                        <p>
                          {
                            photo.commentaire
                          }
                        </p>
                      ) : null}
                    </div>
                  </article>
                )
              )}
          </div>
        </div>
      ) : null}

      {photoAgrandie ? (
        <div
          className="photos-mobile-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Photo chantier"
        >
          <button
            type="button"
            className="photos-mobile-modal-backdrop"
            aria-label="Fermer"
            onClick={() =>
              setPhotoAgrandie(
                null
              )
            }
          />

          <div className="photos-mobile-modal-content">
            <div className="photos-mobile-modal-header">
              <div>
                <strong>
                  {
                    configurationCategorie(
                      photoAgrandie.categorie
                    ).icone
                  }{" "}
                  {
                    configurationCategorie(
                      photoAgrandie.categorie
                    ).label
                  }
                </strong>

                {photoAgrandie.created_at ? (
                  <small>
                    {formatDate(
                      photoAgrandie.created_at
                    )}
                  </small>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() =>
                  setPhotoAgrandie(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            {photoAgrandie.signed_url ? (
              <img
                className="photos-mobile-modal-image"
                src={
                  photoAgrandie.signed_url
                }
                alt="Photo chantier"
              />
            ) : null}

            {photoAgrandie.commentaire ? (
              <p className="photos-mobile-modal-comment">
                {
                  photoAgrandie.commentaire
                }
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}