import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALGORITHME = "aes-256-gcm";
const VERSION = "v1";

function obtenirCle() {
  const valeur =
    process.env.ARBOBOARD_CREDENTIALS_ENCRYPTION_KEY?.trim();

  if (!valeur) {
    throw new Error(
      "La variable ARBOBOARD_CREDENTIALS_ENCRYPTION_KEY est absente."
    );
  }

  let cle: Buffer;

  if (/^[a-f0-9]{64}$/i.test(valeur)) {
    cle = Buffer.from(valeur, "hex");
  } else {
    cle = Buffer.from(valeur, "base64");
  }

  if (cle.length !== 32) {
    throw new Error(
      "ARBOBOARD_CREDENTIALS_ENCRYPTION_KEY doit représenter exactement 32 octets."
    );
  }

  return cle;
}

export function chiffrerIdentifiant(
  valeur: string
): string {
  const texte = valeur.trim();

  if (!texte) {
    throw new Error(
      "Impossible de chiffrer une valeur vide."
    );
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(
    ALGORITHME,
    obtenirCle(),
    iv
  );

  const contenuChiffre = Buffer.concat([
    cipher.update(texte, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    contenuChiffre.toString("base64url"),
  ].join(".");
}

export function dechiffrerIdentifiant(
  valeurChiffree: string
): string {
  const parties = valeurChiffree.split(".");

  if (
    parties.length !== 4 ||
    parties[0] !== VERSION
  ) {
    throw new Error(
      "Format d’identifiant chiffré invalide."
    );
  }

  const [, ivBase64, tagBase64, contenuBase64] =
    parties;

  const decipher = createDecipheriv(
    ALGORITHME,
    obtenirCle(),
    Buffer.from(ivBase64, "base64url")
  );

  decipher.setAuthTag(
    Buffer.from(tagBase64, "base64url")
  );

  const contenu = Buffer.concat([
    decipher.update(
      Buffer.from(contenuBase64, "base64url")
    ),
    decipher.final(),
  ]);

  return contenu.toString("utf8");
}