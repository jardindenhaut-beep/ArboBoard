import {
  Directory,
  Filesystem,
} from "@capacitor/filesystem";

import {
  ajouterActionHorsLigne,
  listerActionsEnAttente,
  supprimerActionHorsLigne,
} from "./offline";

export const ACTION_PHOTO_AJOUTER =
  "intervention.photo.ajouter";

export type CategoriePhotoHorsLigne =
  | "avant"
  | "pendant"
  | "apres"
  | "probleme";

export type PayloadPhotoHorsLigne = {
  localPhotoId: string;

  entrepriseId: string;
  ficheId: string;

  userId:
    string | null;

  categorie:
    CategoriePhotoHorsLigne;

  commentaire:
    string | null;

  localPath: string;

  nomFichier: string;
  mimeType: string;

  createdAt: string;
};

export type PhotoHorsLigneEnAttente =
  PayloadPhotoHorsLigne & {
    actionId: string;
  };

const TAILLE_MAX =
  10 *
  1024 *
  1024;

function identifiantUnique() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(
      36
    )
    .slice(
      2,
      12
    )}`;
}

function nettoyerNomFichier(
  nom: string
) {
  return (
    nom
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
      .toLowerCase() ||
    "photo.jpg"
  );
}

function extensionDepuisMime(
  mimeType: string
) {
  if (
    mimeType ===
    "image/png"
  ) {
    return "png";
  }

  if (
    mimeType ===
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

function arrayBufferVersBase64(
  buffer:
    ArrayBuffer
) {
  const octets =
    new Uint8Array(
      buffer
    );

  const tailleBloc =
    0x8000;

  let binaire =
    "";

  for (
    let index = 0;
    index <
    octets.length;
    index +=
      tailleBloc
  ) {
    const bloc =
      octets.subarray(
        index,
        Math.min(
          index +
            tailleBloc,
          octets.length
        )
      );

    binaire +=
      String.fromCharCode(
        ...bloc
      );
  }

  return btoa(
    binaire
  );
}

function payloadValide(
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
      "string" &&
    typeof payload.createdAt ===
      "string"
  );
}

export async function enregistrerPhotoHorsLigne({
  entrepriseId,
  ficheId,
  userId = null,
  categorie,
  commentaire,
  fichier,
}: {
  entrepriseId:
    string;

  ficheId:
    string;

  userId?:
    string | null;

  categorie:
    CategoriePhotoHorsLigne;

  commentaire?:
    string | null;

  fichier:
    File;
}) {
  if (
    !entrepriseId ||
    !ficheId
  ) {
    throw new Error(
      "Entreprise ou intervention manquante."
    );
  }

  if (
    !fichier.type.startsWith(
      "image/"
    )
  ) {
    throw new Error(
      "Le fichier sélectionné n’est pas une image."
    );
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
    throw new Error(
      "Utilisez une photo JPG, PNG ou WebP."
    );
  }

  if (
    fichier.size >
    TAILLE_MAX
  ) {
    throw new Error(
      "La photo dépasse 10 Mo."
    );
  }

  const localPhotoId =
    identifiantUnique();

  const extension =
    extensionDepuisMime(
      fichier.type
    );

  const nomFichier =
    remplacerExtension(
      nettoyerNomFichier(
        fichier.name ||
          "photo.jpg"
      ),
      extension
    );

  const localPath =
    [
      "arboboard",
      "offline-photos",
      entrepriseId,
      ficheId,
      `${localPhotoId}-${nomFichier}`,
    ].join(
      "/"
    );

  const buffer =
    await fichier.arrayBuffer();

  const base64 =
    arrayBufferVersBase64(
      buffer
    );

  await Filesystem.writeFile({
    path:
      localPath,
    data:
      base64,
    directory:
      Directory.Data,
    recursive:
      true,
  });

  const payload:
    PayloadPhotoHorsLigne = {
      localPhotoId,

      entrepriseId,
      ficheId,

      userId,

      categorie,

      commentaire:
        commentaire
          ?.trim() ||
        null,

      localPath,

      nomFichier,
      mimeType:
        fichier.type,

      createdAt:
        new Date().toISOString(),
  };

  const action =
    await ajouterActionHorsLigne(
      ACTION_PHOTO_AJOUTER,
      payload,
      {
        cleDeduplication:
          `photo:${localPhotoId}`,
      }
    );

  return {
    ...payload,
    actionId:
      action.id,
  } satisfies PhotoHorsLigneEnAttente;
}

export async function listerPhotosHorsLigne(
  ficheId:
    string
) {
  const actions =
    await listerActionsEnAttente();

  const photos:
    PhotoHorsLigneEnAttente[] =
    [];

  for (
    const action
    of actions
  ) {
    if (
      action.type !==
      ACTION_PHOTO_AJOUTER ||
      !payloadValide(
        action.payload
      ) ||
      action.payload.ficheId !==
        ficheId
    ) {
      continue;
    }

    photos.push({
      ...action.payload,
      actionId:
        action.id,
    });
  }

  return photos.sort(
    (
      a,
      b
    ) =>
      a.createdAt.localeCompare(
        b.createdAt
      )
  );
}

export async function obtenirApercuPhotoHorsLigne(
  photo:
    PhotoHorsLigneEnAttente
) {
  const fichier =
    await Filesystem.readFile({
      path:
        photo.localPath,
      directory:
        Directory.Data,
    });

  if (
    typeof fichier.data !==
      "string"
  ) {
    return URL.createObjectURL(
      fichier.data
    );
  }

  return `data:${photo.mimeType};base64,${fichier.data}`;
}

export async function supprimerPhotoHorsLigne(
  photo:
    PhotoHorsLigneEnAttente
) {
  try {
    await Filesystem.deleteFile({
      path:
        photo.localPath,
      directory:
        Directory.Data,
    });
  } catch (
    error
  ) {
    console.warn(
      "Suppression fichier photo hors ligne :",
      error
    );
  }

  await supprimerActionHorsLigne(
    photo.actionId
  );
}
