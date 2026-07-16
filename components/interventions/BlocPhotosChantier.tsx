"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CategoriePhoto =
  | "avant"
  | "pendant"
  | "apres"
  | "probleme"
  | "signature"
  | "autre";

type PhotoChantier = {
  id: string;
  entreprise_id: string;
  fiche_id: string;
  categorie: CategoriePhoto | string;
  url: string;
  storage_path?: string | null;
  commentaire?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
  signed_url?: string | null;
};

type Props = {
  entrepriseId: string;
  ficheId: string;
  userId?: string | null;
};

type ProgressionUpload = {
  categorie: CategoriePhoto;
  termine: number;
  total: number;
  nomFichier: string;
};

type CategorieConfiguration = {
  value: CategoriePhoto;
  label: string;
  icone: string;
  description: string;
};

const CATEGORIES_UPLOAD: CategorieConfiguration[] = [
  {
    value: "avant",
    label: "Avant chantier",
    icone: "📸",
    description: "État du chantier avant l’intervention.",
  },
  {
    value: "pendant",
    label: "Pendant chantier",
    icone: "🛠️",
    description: "Avancement et travaux en cours.",
  },
  {
    value: "apres",
    label: "Après chantier",
    icone: "✅",
    description: "Résultat final de l’intervention.",
  },
  {
    value: "probleme",
    label: "Problème / réserve",
    icone: "⚠️",
    description: "Photo d’un dommage, d’une réserve ou d’un imprévu.",
  },
];

const CATEGORIES_AFFICHAGE: CategorieConfiguration[] = [
  ...CATEGORIES_UPLOAD,
  {
    value: "signature",
    label: "Signature",
    icone: "✍️",
    description: "Éléments liés aux signatures.",
  },
  {
    value: "autre",
    label: "Autres photos",
    icone: "📎",
    description: "Autres documents photographiques du chantier.",
  },
];

const TAILLE_MAX_ORIGINALE = 10 * 1024 * 1024;
const TAILLE_OPTIMISATION = 3 * 1024 * 1024;
const DIMENSION_MAX = 1920;

function nettoyerNomFichier(nom: string) {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function extensionDepuisType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function remplacerExtension(nom: string, extension: string) {
  const base = nom.replace(/\.[^/.]+$/, "") || "photo";
  return `${base}.${extension}`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return "";
  }
}

function configurationCategorie(categorie: string | null | undefined) {
  return (
    CATEGORIES_AFFICHAGE.find((item) => item.value === categorie) ||
    CATEGORIES_AFFICHAGE.find((item) => item.value === "autre")!
  );
}

function libelleCategorie(categorie: string | null | undefined) {
  const item = configurationCategorie(categorie);
  return `${item.icone} ${item.label}`;
}

function estUrlDistante(valeur: string | null | undefined) {
  return Boolean(valeur && /^https?:\/\//i.test(valeur));
}

function identifiantUnique() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function chargerImage(fichier: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire cette image."));
    };

    image.src = url;
  });
}

async function optimiserImage(fichier: File) {
  if (fichier.size <= TAILLE_OPTIMISATION) {
    return fichier;
  }

  try {
    const image = await chargerImage(fichier);
    const largeurInitiale = image.naturalWidth || image.width;
    const hauteurInitiale = image.naturalHeight || image.height;

    if (!largeurInitiale || !hauteurInitiale) {
      return fichier;
    }

    const ratio = Math.min(
      1,
      DIMENSION_MAX / largeurInitiale,
      DIMENSION_MAX / hauteurInitiale
    );

    const largeur = Math.max(1, Math.round(largeurInitiale * ratio));
    const hauteur = Math.max(1, Math.round(hauteurInitiale * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;

    const contexte = canvas.getContext("2d");
    if (!contexte) return fichier;

    contexte.drawImage(image, 0, 0, largeur, hauteur);

    const typeSortie =
      fichier.type === "image/png" && fichier.size <= 4 * 1024 * 1024
        ? "image/png"
        : "image/jpeg";

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, typeSortie, typeSortie === "image/jpeg" ? 0.82 : 1);
    });

    if (!blob || blob.size >= fichier.size) {
      return fichier;
    }

    const extension = extensionDepuisType(typeSortie);

    return new File(
      [blob],
      remplacerExtension(nettoyerNomFichier(fichier.name), extension),
      {
        type: typeSortie,
        lastModified: fichier.lastModified,
      }
    );
  } catch {
    return fichier;
  }
}

export default function BlocPhotosChantier({
  entrepriseId,
  ficheId,
  userId,
}: Props) {
  const [photos, setPhotos] = useState<PhotoChantier[]>([]);
  const [chargement, setChargement] = useState(true);
  const [uploadEnCours, setUploadEnCours] = useState<CategoriePhoto | null>(
    null
  );
  const [progressionUpload, setProgressionUpload] =
    useState<ProgressionUpload | null>(null);
  const [suppressionId, setSuppressionId] = useState<string | null>(null);
  const [photoAgrandie, setPhotoAgrandie] = useState<PhotoChantier | null>(null);

  const [commentaires, setCommentaires] = useState<Record<string, string>>({});
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  useEffect(() => {
    chargerPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId, ficheId]);

  const photosParCategorie = useMemo(() => {
    const groupes: Record<string, PhotoChantier[]> = {};

    for (const photo of photos) {
      const categorie = photo.categorie || "autre";

      if (!groupes[categorie]) {
        groupes[categorie] = [];
      }

      groupes[categorie].push(photo);
    }

    return groupes;
  }, [photos]);

  const nombrePhotosParCategorie = useMemo(() => {
    const compteur: Record<string, number> = {};

    for (const categorie of CATEGORIES_AFFICHAGE) {
      compteur[categorie.value] = photosParCategorie[categorie.value]?.length || 0;
    }

    return compteur;
  }, [photosParCategorie]);

  async function construireUrlPhoto(photo: PhotoChantier) {
    const chemin = photo.storage_path || photo.url;

    if (!chemin) {
      return null;
    }

    if (!photo.storage_path && estUrlDistante(photo.url)) {
      return photo.url;
    }

    const { data, error } = await supabase.storage
      .from("interventions-photos")
      .createSignedUrl(chemin, 60 * 60);

    if (error) {
      console.error("Erreur URL signée photo :", error);
      return estUrlDistante(photo.url) ? photo.url : null;
    }

    return data?.signedUrl || null;
  }

  async function chargerPhotos() {
    if (!entrepriseId || !ficheId) {
      setPhotos([]);
      setChargement(false);
      return;
    }

    try {
      setChargement(true);
      setMessageErreur("");

      const { data, error } = await supabase
        .from("fiches_intervention_photos")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const photosBase = (data || []) as PhotoChantier[];

      const photosAvecUrls = await Promise.all(
        photosBase.map(async (photo) => ({
          ...photo,
          signed_url: await construireUrlPhoto(photo),
        }))
      );

      setPhotos(photosAvecUrls);
    } catch (error: any) {
      console.error("Erreur chargement photos chantier :", error);
      setPhotos([]);
      setMessageErreur(
        error?.message || "Impossible de charger les photos chantier."
      );
    } finally {
      setChargement(false);
    }
  }

  function modifierCommentaire(categorie: CategoriePhoto, valeur: string) {
    setCommentaires((ancien) => ({
      ...ancien,
      [categorie]: valeur,
    }));
  }

  function validerFichiers(fichiers: File[]) {
    const erreurs: string[] = [];
    const clesVues = new Set<string>();
    const fichiersValides: File[] = [];

    for (const fichier of fichiers) {
      if (!fichier.type.startsWith("image/")) {
        erreurs.push(`${fichier.name} n’est pas une image.`);
        continue;
      }

      if (![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(fichier.type)) {
        erreurs.push(
          `${fichier.name} utilise un format non pris en charge. Utilisez JPG, PNG ou WebP.`
        );
        continue;
      }

      if (fichier.size > TAILLE_MAX_ORIGINALE) {
        erreurs.push(`${fichier.name} dépasse la limite de 10 Mo.`);
        continue;
      }

      const cle = `${fichier.name}-${fichier.size}-${fichier.lastModified}`;

      if (clesVues.has(cle)) {
        erreurs.push(`${fichier.name} a été sélectionné plusieurs fois.`);
        continue;
      }

      clesVues.add(cle);
      fichiersValides.push(fichier);
    }

    return { fichiersValides, erreurs };
  }

  async function envoyerPhotos(
    categorie: CategoriePhoto,
    fichiersSelectionnes: File[]
  ) {
    if (!entrepriseId || !ficheId || fichiersSelectionnes.length === 0) return;

    const { fichiersValides, erreurs: erreursValidation } =
      validerFichiers(fichiersSelectionnes);

    if (fichiersValides.length === 0) {
      setMessageErreur(
        erreursValidation[0] || "Aucune photo valide n’a été sélectionnée."
      );
      return;
    }

    try {
      setUploadEnCours(categorie);
      setMessageErreur("");
      setMessageSucces("");

      let nombreEnvoye = 0;
      const erreursUpload = [...erreursValidation];
      const commentaire = commentaires[categorie]?.trim() || null;

      for (let index = 0; index < fichiersValides.length; index += 1) {
        const fichierOriginal = fichiersValides[index];

        setProgressionUpload({
          categorie,
          termine: index,
          total: fichiersValides.length,
          nomFichier: fichierOriginal.name,
        });

        try {
          const fichier = await optimiserImage(fichierOriginal);
          const nomNettoye =
            nettoyerNomFichier(fichier.name || "photo.jpg") || "photo.jpg";
          const chemin = `${entrepriseId}/${ficheId}/${categorie}/${Date.now()}-${identifiantUnique()}-${nomNettoye}`;

          const { error: erreurUpload } = await supabase.storage
            .from("interventions-photos")
            .upload(chemin, fichier, {
              cacheControl: "3600",
              contentType: fichier.type,
              upsert: false,
            });

          if (erreurUpload) throw erreurUpload;

          const { error: erreurInsert } = await supabase
            .from("fiches_intervention_photos")
            .insert({
              entreprise_id: entrepriseId,
              fiche_id: ficheId,
              categorie,
              url: chemin,
              storage_path: chemin,
              commentaire,
              uploaded_by: userId || null,
            });

          if (erreurInsert) {
            await supabase.storage.from("interventions-photos").remove([chemin]);
            throw erreurInsert;
          }

          nombreEnvoye += 1;
        } catch (error: any) {
          console.error("Erreur envoi d’une photo chantier :", error);
          erreursUpload.push(
            `${fichierOriginal.name} : ${
              error?.message || "envoi impossible"
            }`
          );
        }
      }

      setProgressionUpload({
        categorie,
        termine: fichiersValides.length,
        total: fichiersValides.length,
        nomFichier: "",
      });

      if (nombreEnvoye > 0) {
        setCommentaires((ancien) => ({
          ...ancien,
          [categorie]: "",
        }));

        setMessageSucces(
          `${nombreEnvoye} photo${nombreEnvoye > 1 ? "s" : ""} ajoutée${
            nombreEnvoye > 1 ? "s" : ""
          } au chantier.`
        );

        await chargerPhotos();
      }

      if (erreursUpload.length > 0) {
        setMessageErreur(erreursUpload.join(" "));
      }
    } catch (error: any) {
      console.error("Erreur envoi photos chantier :", error);
      setMessageErreur(
        error?.message || "Impossible d’envoyer les photos pour le moment."
      );
    } finally {
      setUploadEnCours(null);
      setProgressionUpload(null);
    }
  }

  async function supprimerPhoto(photo: PhotoChantier) {
    if (suppressionId) return;

    const confirmation = window.confirm(
      "Supprimer cette photo du chantier ? Cette action est définitive."
    );

    if (!confirmation) return;

    try {
      setSuppressionId(photo.id);
      setMessageErreur("");
      setMessageSucces("");

      const { error: erreurBase } = await supabase
        .from("fiches_intervention_photos")
        .delete()
        .eq("id", photo.id)
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId);

      if (erreurBase) throw erreurBase;

      const chemin = photo.storage_path ||
        (!estUrlDistante(photo.url) ? photo.url : null);

      if (chemin) {
        const { error: erreurStorage } = await supabase.storage
          .from("interventions-photos")
          .remove([chemin]);

        if (erreurStorage) {
          console.error("Erreur suppression fichier Storage :", erreurStorage);
          setMessageErreur(
            "La photo a été retirée de la fiche, mais le fichier Storage n’a pas pu être supprimé."
          );
        }
      }

      setPhotos((anciens) => anciens.filter((item) => item.id !== photo.id));

      if (photoAgrandie?.id === photo.id) {
        setPhotoAgrandie(null);
      }

      setMessageSucces("Photo supprimée.");
    } catch (error: any) {
      console.error("Erreur suppression photo chantier :", error);
      setMessageErreur(
        error?.message || "Impossible de supprimer cette photo."
      );
    } finally {
      setSuppressionId(null);
    }
  }

  function renduCategoriePhotos(categorie: CategorieConfiguration) {
    const photosCategorie = photosParCategorie[categorie.value] || [];

    if (photosCategorie.length === 0) return null;

    return (
      <section key={categorie.value}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {categorie.icone} {categorie.label}
          </p>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {photosCategorie.length}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {photosCategorie.map((photo) => (
            <article
              key={photo.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              {photo.signed_url ? (
                <button
                  type="button"
                  onClick={() => setPhotoAgrandie(photo)}
                  className="block w-full bg-slate-100 text-left"
                  aria-label="Agrandir la photo"
                >
                  <img
                    src={photo.signed_url}
                    alt={libelleCategorie(photo.categorie)}
                    loading="lazy"
                    className="h-52 w-full object-cover transition duration-200 hover:scale-[1.02]"
                  />
                </button>
              ) : (
                <div className="flex h-52 items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500">
                  Aperçu indisponible
                </div>
              )}

              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-700">
                    {libelleCategorie(photo.categorie)}
                  </p>

                  {photo.created_at && (
                    <p className="shrink-0 text-[11px] text-slate-400">
                      {formatDate(photo.created_at)}
                    </p>
                  )}
                </div>

                {photo.commentaire && (
                  <p className="whitespace-pre-line text-sm text-slate-600">
                    {photo.commentaire}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {photo.signed_url && (
                    <button
                      type="button"
                      onClick={() => setPhotoAgrandie(photo)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Agrandir
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => supprimerPhoto(photo)}
                    disabled={suppressionId !== null}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {suppressionId === photo.id ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const categoriesInconnues = Object.keys(photosParCategorie).filter(
    (categorie) =>
      !CATEGORIES_AFFICHAGE.some((item) => item.value === categorie)
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
            📸
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Photos chantier
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ajoutez plusieurs photos avant, pendant et après le chantier, ou
              documentez un problème rencontré.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={chargerPhotos}
          disabled={chargement || uploadEnCours !== null}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {chargement ? "Chargement..." : "Actualiser"}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CATEGORIES_UPLOAD.map((categorie) => (
          <div
            key={categorie.value}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
          >
            <p className="text-xs font-semibold text-slate-500">
              {categorie.icone} {categorie.label}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-950">
              {nombrePhotosParCategorie[categorie.value] || 0}
            </p>
          </div>
        ))}
      </div>

      {messageErreur && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {messageSucces}
        </div>
      )}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {CATEGORIES_UPLOAD.map((categorie) => {
          const enCours = uploadEnCours === categorie.value;
          const progression =
            enCours && progressionUpload?.categorie === categorie.value
              ? progressionUpload
              : null;

          return (
            <div
              key={categorie.value}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-xl">
                  {categorie.icone}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {categorie.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {categorie.description}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {nombrePhotosParCategorie[categorie.value] || 0}
                    </span>
                  </div>

                  <textarea
                    value={commentaires[categorie.value] || ""}
                    onChange={(event) =>
                      modifierCommentaire(categorie.value, event.target.value)
                    }
                    rows={2}
                    disabled={uploadEnCours !== null}
                    placeholder="Commentaire commun aux photos sélectionnées (optionnel)..."
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {progression && (
                    <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      <p className="font-semibold">
                        Envoi {Math.min(progression.termine + 1, progression.total)} / {progression.total}
                      </p>
                      {progression.nomFichier && (
                        <p className="mt-1 truncate">{progression.nomFichier}</p>
                      )}
                    </div>
                  )}

                  <label
                    className={`mt-3 flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
                      uploadEnCours !== null
                        ? "cursor-not-allowed bg-slate-400"
                        : "cursor-pointer bg-slate-900 hover:bg-slate-700"
                    }`}
                  >
                    {enCours
                      ? "Envoi en cours..."
                      : `Ajouter des photos ${categorie.label.toLowerCase()}`}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={uploadEnCours !== null}
                      onChange={(event) => {
                        const fichiers = Array.from(event.target.files || []);
                        envoyerPhotos(categorie.value, fichiers);
                        event.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>

                  <p className="mt-2 text-center text-[11px] text-slate-400">
                    JPG, PNG ou WebP · 10 Mo maximum par photo
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">Photos enregistrées</p>
            <p className="mt-1 text-xs text-slate-500">
              {photos.length} photo{photos.length > 1 ? "s" : ""} sur cette fiche.
            </p>
          </div>
        </div>

        {chargement ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
            Chargement des photos...
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl">
              📷
            </div>
            <p className="mt-3 font-semibold text-slate-800">
              Aucune photo ajoutée
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Les photos du chantier apparaîtront ici après leur envoi.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORIES_AFFICHAGE.map((categorie) =>
              renduCategoriePhotos(categorie)
            )}

            {categoriesInconnues.map((categorie) =>
              renduCategoriePhotos({
                value: categorie as CategoriePhoto,
                label: "Autres photos",
                icone: "📎",
                description: "Anciennes photos du chantier.",
              })
            )}
          </div>
        )}
      </div>

      {photoAgrandie?.signed_url && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu de la photo chantier"
          onClick={() => setPhotoAgrandie(null)}
        >
          <div
            className="relative max-h-full w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPhotoAgrandie(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-slate-900 shadow-lg hover:bg-white"
            >
              Fermer
            </button>

            <img
              src={photoAgrandie.signed_url}
              alt={libelleCategorie(photoAgrandie.categorie)}
              className="max-h-[88vh] w-full rounded-2xl object-contain"
            />

            {(photoAgrandie.commentaire || photoAgrandie.created_at) && (
              <div className="mt-3 rounded-2xl bg-white p-4">
                <p className="font-semibold text-slate-950">
                  {libelleCategorie(photoAgrandie.categorie)}
                </p>

                {photoAgrandie.commentaire && (
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                    {photoAgrandie.commentaire}
                  </p>
                )}

                {photoAgrandie.created_at && (
                  <p className="mt-2 text-xs text-slate-400">
                    Ajoutée le {formatDate(photoAgrandie.created_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}