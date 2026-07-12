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

const CATEGORIES: {
  value: CategoriePhoto;
  label: string;
  icone: string;
  description: string;
}[] = [
  {
    value: "avant",
    label: "Avant chantier",
    icone: "📸",
    description: "État du chantier avant intervention.",
  },
  {
    value: "pendant",
    label: "Pendant chantier",
    icone: "🛠️",
    description: "Avancement, travaux en cours.",
  },
  {
    value: "apres",
    label: "Après chantier",
    icone: "✅",
    description: "Résultat final du chantier.",
  },
  {
    value: "probleme",
    label: "Problème",
    icone: "⚠️",
    description: "Photo d’un problème ou d’une réserve.",
  },
];

function nettoyerNomFichier(nom: string) {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
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

function libelleCategorie(categorie: string | null | undefined) {
  const item = CATEGORIES.find((cat) => cat.value === categorie);
  return item ? `${item.icone} ${item.label}` : "📎 Autre";
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

  async function chargerPhotos() {
    if (!entrepriseId || !ficheId) return;

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
        photosBase.map(async (photo) => {
          const chemin = photo.storage_path || photo.url;

          if (!chemin) {
            return photo;
          }

          const { data: signedData, error: signedError } =
            await supabase.storage
              .from("interventions-photos")
              .createSignedUrl(chemin, 60 * 60);

          if (signedError) {
            console.error("Erreur URL signée photo :", signedError);
            return {
              ...photo,
              signed_url: null,
            };
          }

          return {
            ...photo,
            signed_url: signedData?.signedUrl || null,
          };
        })
      );

      setPhotos(photosAvecUrls);
    } catch (error: any) {
      console.error("Erreur chargement photos chantier :", error);
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

  async function envoyerPhoto(categorie: CategoriePhoto, fichier: File | null) {
    if (!entrepriseId || !ficheId || !fichier) return;

    try {
      setUploadEnCours(categorie);
      setMessageErreur("");
      setMessageSucces("");

      if (!fichier.type.startsWith("image/")) {
        setMessageErreur("Le fichier sélectionné doit être une image.");
        return;
      }

      if (fichier.size > 10 * 1024 * 1024) {
        setMessageErreur("La photo ne doit pas dépasser 10 Mo.");
        return;
      }

      const nomNettoye = nettoyerNomFichier(fichier.name || "photo.jpg");
      const chemin = `${entrepriseId}/${ficheId}/${categorie}/${Date.now()}-${nomNettoye}`;

      const { error: erreurUpload } = await supabase.storage
        .from("interventions-photos")
        .upload(chemin, fichier, {
          cacheControl: "3600",
          upsert: false,
        });

      if (erreurUpload) throw erreurUpload;

      const commentaire = commentaires[categorie] || "";

      const { error: erreurInsert } = await supabase
        .from("fiches_intervention_photos")
        .insert({
          entreprise_id: entrepriseId,
          fiche_id: ficheId,
          categorie,
          url: chemin,
          storage_path: chemin,
          commentaire: commentaire.trim() || null,
          uploaded_by: userId || null,
        });

      if (erreurInsert) throw erreurInsert;

      setCommentaires((ancien) => ({
        ...ancien,
        [categorie]: "",
      }));

      setMessageSucces("Photo ajoutée au chantier.");
      await chargerPhotos();
    } catch (error: any) {
      console.error("Erreur envoi photo chantier :", error);
      setMessageErreur(
        error?.message || "Impossible d’envoyer la photo pour le moment."
      );
    } finally {
      setUploadEnCours(null);
    }
  }

  async function supprimerPhoto(photo: PhotoChantier) {
    const confirmation = window.confirm(
      "Supprimer cette photo du chantier ? Cette action est définitive."
    );

    if (!confirmation) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const chemin = photo.storage_path || photo.url;

      if (chemin) {
        const { error: erreurStorage } = await supabase.storage
          .from("interventions-photos")
          .remove([chemin]);

        if (erreurStorage) {
          console.error("Erreur suppression storage photo :", erreurStorage);
        }
      }

      const { error } = await supabase
        .from("fiches_intervention_photos")
        .delete()
        .eq("id", photo.id)
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId);

      if (error) throw error;

      setPhotos((anciens) => anciens.filter((item) => item.id !== photo.id));
      setMessageSucces("Photo supprimée.");
    } catch (error: any) {
      console.error("Erreur suppression photo chantier :", error);
      setMessageErreur(
        error?.message || "Impossible de supprimer cette photo."
      );
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900">Photos chantier</p>
          <p className="mt-1 text-sm text-slate-500">
            Ajoutez les photos avant, pendant, après chantier ou en cas de
            problème.
          </p>
        </div>

        <button
          type="button"
          onClick={chargerPhotos}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Actualiser
        </button>
      </div>

      {messageErreur && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {messageSucces}
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {CATEGORIES.map((categorie) => (
          <div
            key={categorie.value}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-xl">
                {categorie.icone}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">
                  {categorie.label}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {categorie.description}
                </p>

                <textarea
                  value={commentaires[categorie.value] || ""}
                  onChange={(event) =>
                    modifierCommentaire(categorie.value, event.target.value)
                  }
                  rows={2}
                  placeholder="Commentaire photo optionnel..."
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />

                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-700">
                  {uploadEnCours === categorie.value
                    ? "Envoi en cours..."
                    : `Ajouter photo ${categorie.label.toLowerCase()}`}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploadEnCours !== null}
                    onChange={(event) => {
                      const fichier = event.target.files?.[0] || null;
                      envoyerPhoto(categorie.value, fichier);
                      event.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-3 text-sm font-semibold text-slate-900">
          Photos enregistrées
        </p>

        {chargement ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Chargement des photos...
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Aucune photo ajoutée pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {CATEGORIES.map((categorie) => {
              const photosCategorie = photosParCategorie[categorie.value] || [];

              if (photosCategorie.length === 0) return null;

              return (
                <div key={categorie.value}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {categorie.icone} {categorie.label}
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {photosCategorie.map((photo) => (
                      <div
                        key={photo.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                      >
                        {photo.signed_url ? (
                          <img
                            src={photo.signed_url}
                            alt={libelleCategorie(photo.categorie)}
                            className="h-48 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-500">
                            Aperçu indisponible
                          </div>
                        )}

                        <div className="space-y-2 p-3">
                          <p className="text-xs font-semibold text-slate-700">
                            {libelleCategorie(photo.categorie)}
                          </p>

                          {photo.commentaire && (
                            <p className="text-sm text-slate-600">
                              {photo.commentaire}
                            </p>
                          )}

                          {photo.created_at && (
                            <p className="text-xs text-slate-400">
                              Ajoutée le {formatDate(photo.created_at)}
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() => supprimerPhoto(photo)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {(photosParCategorie.autre || []).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  📎 Autres photos
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(photosParCategorie.autre || []).map((photo) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                    >
                      {photo.signed_url ? (
                        <img
                          src={photo.signed_url}
                          alt="Photo chantier"
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-500">
                          Aperçu indisponible
                        </div>
                      )}

                      <div className="space-y-2 p-3">
                        {photo.commentaire && (
                          <p className="text-sm text-slate-600">
                            {photo.commentaire}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => supprimerPhoto(photo)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}