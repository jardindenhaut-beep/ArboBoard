import { Network } from "@capacitor/network";
import type { PluginListenerHandle } from "@capacitor/core";

const DB_NAME = "arboboard-offline";
const DB_VERSION = 1;

const STORE_CACHE = "cache";
const STORE_QUEUE = "sync_queue";

const OFFLINE_EVENT = "arboboard:offline-status";

export type TypeConnexionArboboard =
  | "wifi"
  | "cellular"
  | "none"
  | "unknown"
  | string;

export type ActionHorsLigne = {
  id: string;
  type: string;
  payload: unknown;
  cleDeduplication?: string | null;
  creeLe: string;
  modifieLe: string;
  tentatives: number;
  derniereErreur?: string | null;
};

type EntreeCache<T = unknown> = {
  cle: string;
  valeur: T;
  modifieLe: string;
};

export type EtatHorsLigne = {
  enLigne: boolean;
  typeConnexion: TypeConnexionArboboard;
  aSynchroniser: number;
};

type OptionsAction = {
  cleDeduplication?: string | null;
};

let dbPromise: Promise<IDBDatabase> | null = null;

let statutReseau: {
  connected: boolean;
  connectionType: TypeConnexionArboboard;
} = {
  connected:
    typeof navigator !== "undefined"
      ? navigator.onLine
      : true,
  connectionType: "unknown",
};

let listenerNetwork:
  | PluginListenerHandle
  | null = null;

let listenersNavigateurInitialises = false;

/* =========================================================
   OUTILS INDEXEDDB
   ========================================================= */

function creerId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join("-");
}

function isoMaintenant() {
  return new Date().toISOString();
}

function ouvrirBase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>(
    (resolve, reject) => {
      const requete = indexedDB.open(
        DB_NAME,
        DB_VERSION
      );

      requete.onupgradeneeded = () => {
        const db = requete.result;

        if (
          !db.objectStoreNames.contains(
            STORE_CACHE
          )
        ) {
          db.createObjectStore(
            STORE_CACHE,
            {
              keyPath: "cle",
            }
          );
        }

        if (
          !db.objectStoreNames.contains(
            STORE_QUEUE
          )
        ) {
          const queue =
            db.createObjectStore(
              STORE_QUEUE,
              {
                keyPath: "id",
              }
            );

          queue.createIndex(
            "cleDeduplication",
            "cleDeduplication",
            {
              unique: false,
            }
          );

          queue.createIndex(
            "creeLe",
            "creeLe",
            {
              unique: false,
            }
          );
        }
      };

      requete.onsuccess = () => {
        const db = requete.result;

        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };

        resolve(db);
      };

      requete.onerror = () => {
        dbPromise = null;

        reject(
          requete.error ||
            new Error(
              "Impossible d’ouvrir la base hors ligne Arboboard."
            )
        );
      };

      requete.onblocked = () => {
        console.warn(
          "Base hors ligne Arboboard bloquée par une autre instance."
        );
      };
    }
  );

  return dbPromise;
}

function attendreRequete<T>(
  requete: IDBRequest<T>
) {
  return new Promise<T>(
    (resolve, reject) => {
      requete.onsuccess = () =>
        resolve(requete.result);

      requete.onerror = () =>
        reject(
          requete.error ||
            new Error(
              "Erreur IndexedDB Arboboard."
            )
        );
    }
  );
}

function attendreTransaction(
  transaction: IDBTransaction
) {
  return new Promise<void>(
    (resolve, reject) => {
      transaction.oncomplete = () =>
        resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ||
            new Error(
              "Erreur de transaction hors ligne Arboboard."
            )
        );

      transaction.onabort = () =>
        reject(
          transaction.error ||
            new Error(
              "Transaction hors ligne Arboboard annulée."
            )
        );
    }
  );
}

/* =========================================================
   CACHE LOCAL
   ========================================================= */

export async function mettreEnCache<T>(
  cle: string,
  valeur: T
) {
  const db = await ouvrirBase();

  const transaction =
    db.transaction(
      STORE_CACHE,
      "readwrite"
    );

  transaction
    .objectStore(STORE_CACHE)
    .put({
      cle,
      valeur,
      modifieLe: isoMaintenant(),
    } satisfies EntreeCache<T>);

  await attendreTransaction(
    transaction
  );
}

export async function lireCache<T>(
  cle: string
): Promise<T | null> {
  const db = await ouvrirBase();

  const transaction =
    db.transaction(
      STORE_CACHE,
      "readonly"
    );

  const resultat =
    await attendreRequete(
      transaction
        .objectStore(STORE_CACHE)
        .get(cle)
    );

  await attendreTransaction(
    transaction
  );

  if (!resultat) {
    return null;
  }

  return (
    resultat as EntreeCache<T>
  ).valeur;
}

export async function lireEntreeCache<T>(
  cle: string
): Promise<EntreeCache<T> | null> {
  const db = await ouvrirBase();

  const transaction =
    db.transaction(
      STORE_CACHE,
      "readonly"
    );

  const resultat =
    await attendreRequete(
      transaction
        .objectStore(STORE_CACHE)
        .get(cle)
    );

  await attendreTransaction(
    transaction
  );

  return (
    (resultat as
      | EntreeCache<T>
      | undefined) ||
    null
  );
}

export async function supprimerDuCache(
  cle: string
) {
  const db = await ouvrirBase();

  const transaction =
    db.transaction(
      STORE_CACHE,
      "readwrite"
    );

  transaction
    .objectStore(STORE_CACHE)
    .delete(cle);

  await attendreTransaction(
    transaction
  );
}

/* =========================================================
   FILE DE SYNCHRONISATION
   ========================================================= */

export async function listerActionsEnAttente() {
  const db = await ouvrirBase();

  const transaction =
    db.transaction(
      STORE_QUEUE,
      "readonly"
    );

  const resultats =
    await attendreRequete(
      transaction
        .objectStore(STORE_QUEUE)
        .getAll()
    );

  await attendreTransaction(
    transaction
  );

  return (
    (resultats as ActionHorsLigne[]) ||
    []
  ).sort((a, b) =>
    a.creeLe.localeCompare(
      b.creeLe
    )
  );
}

export async function compterActionsEnAttente() {
  const db = await ouvrirBase();

  const transaction =
    db.transaction(
      STORE_QUEUE,
      "readonly"
    );

  const total =
    await attendreRequete(
      transaction
        .objectStore(STORE_QUEUE)
        .count()
    );

  await attendreTransaction(
    transaction
  );

  return total;
}

export async function ajouterActionHorsLigne(
  type: string,
  payload: unknown,
  options: OptionsAction = {}
) {
  const maintenant =
    isoMaintenant();

  const cleDeduplication =
    options.cleDeduplication ||
    null;

  let existante:
    | ActionHorsLigne
    | undefined;

  if (cleDeduplication) {
    const actions =
      await listerActionsEnAttente();

    existante =
      actions.find(
        (action) =>
          action.cleDeduplication ===
          cleDeduplication
      );
  }

  const action:
    ActionHorsLigne =
    existante
      ? {
          ...existante,
          type,
          payload,
          modifieLe:
            maintenant,
          derniereErreur:
            null,
        }
      : {
          id: creerId(),
          type,
          payload,
          cleDeduplication,
          creeLe:
            maintenant,
          modifieLe:
            maintenant,
          tentatives: 0,
          derniereErreur:
            null,
        };

  const db = await ouvrirBase();

  const transaction =
    db.transaction(
      STORE_QUEUE,
      "readwrite"
    );

  transaction
    .objectStore(STORE_QUEUE)
    .put(action);

  await attendreTransaction(
    transaction
  );

  await notifierEtatHorsLigne();

  return action;
}

export async function supprimerActionHorsLigne(
  id: string
) {
  const db = await ouvrirBase();

  const transaction =
    db.transaction(
      STORE_QUEUE,
      "readwrite"
    );

  transaction
    .objectStore(STORE_QUEUE)
    .delete(id);

  await attendreTransaction(
    transaction
  );

  await notifierEtatHorsLigne();
}

export async function marquerEchecActionHorsLigne(
  id: string,
  erreur: unknown
) {
  const db = await ouvrirBase();

  const transactionLecture =
    db.transaction(
      STORE_QUEUE,
      "readonly"
    );

  const resultat =
    await attendreRequete(
      transactionLecture
        .objectStore(STORE_QUEUE)
        .get(id)
    );

  await attendreTransaction(
    transactionLecture
  );

  if (!resultat) {
    return;
  }

  const action =
    resultat as ActionHorsLigne;

  const message =
    erreur instanceof Error
      ? erreur.message
      : String(
          erreur ||
            "Erreur de synchronisation."
        );

  const transactionEcriture =
    db.transaction(
      STORE_QUEUE,
      "readwrite"
    );

  transactionEcriture
    .objectStore(STORE_QUEUE)
    .put({
      ...action,
      tentatives:
        action.tentatives + 1,
      derniereErreur:
        message,
      modifieLe:
        isoMaintenant(),
    } satisfies ActionHorsLigne);

  await attendreTransaction(
    transactionEcriture
  );

  await notifierEtatHorsLigne();
}

export async function viderFileSynchronisation() {
  const db = await ouvrirBase();

  const transaction =
    db.transaction(
      STORE_QUEUE,
      "readwrite"
    );

  transaction
    .objectStore(STORE_QUEUE)
    .clear();

  await attendreTransaction(
    transaction
  );

  await notifierEtatHorsLigne();
}

/* =========================================================
   ETAT RESEAU
   ========================================================= */

export function estEnLigne() {
  return statutReseau.connected;
}

export async function obtenirEtatHorsLigne():
Promise<EtatHorsLigne> {
  return {
    enLigne:
      statutReseau.connected,
    typeConnexion:
      statutReseau.connectionType,
    aSynchroniser:
      await compterActionsEnAttente(),
  };
}

async function notifierEtatHorsLigne() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const etat =
    await obtenirEtatHorsLigne();

  window.dispatchEvent(
    new CustomEvent<EtatHorsLigne>(
      OFFLINE_EVENT,
      {
        detail: etat,
      }
    )
  );
}

function appliquerStatutReseau(
  connected: boolean,
  connectionType:
    TypeConnexionArboboard =
      "unknown"
) {
  statutReseau = {
    connected,
    connectionType,
  };

  void notifierEtatHorsLigne();
}

function initialiserListenersNavigateur() {
  if (
    listenersNavigateurInitialises ||
    typeof window === "undefined"
  ) {
    return;
  }

  listenersNavigateurInitialises =
    true;

  window.addEventListener(
    "online",
    () => {
      appliquerStatutReseau(
        true,
        statutReseau.connectionType
      );
    }
  );

  window.addEventListener(
    "offline",
    () => {
      appliquerStatutReseau(
        false,
        "none"
      );
    }
  );
}

/* =========================================================
   INITIALISATION
   ========================================================= */

export async function initialiserModeHorsLigne() {
  await ouvrirBase();

  initialiserListenersNavigateur();

  try {
    const statut =
      await Network.getStatus();

    appliquerStatutReseau(
      statut.connected,
      statut.connectionType
    );

    if (!listenerNetwork) {
      listenerNetwork =
        await Network.addListener(
          "networkStatusChange",
          (nouveauStatut) => {
            appliquerStatutReseau(
              nouveauStatut.connected,
              nouveauStatut.connectionType
            );
          }
        );
    }
  } catch (error) {
    console.warn(
      "Détection réseau Capacitor indisponible :",
      error
    );

    appliquerStatutReseau(
      typeof navigator !==
        "undefined"
        ? navigator.onLine
        : true,
      "unknown"
    );
  }

  await notifierEtatHorsLigne();

  return obtenirEtatHorsLigne();
}

/* =========================================================
   ABONNEMENT REACT / UI
   ========================================================= */

export function ecouterEtatHorsLigne(
  callback: (
    etat: EtatHorsLigne
  ) => void
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return () => {};
  }

  const listener = (
    event: Event
  ) => {
    const detail =
      (
        event as
          CustomEvent<EtatHorsLigne>
      ).detail;

    if (detail) {
      callback(detail);
    }
  };

  window.addEventListener(
    OFFLINE_EVENT,
    listener
  );

  void obtenirEtatHorsLigne()
    .then(callback)
    .catch((error) => {
      console.warn(
        "Lecture état hors ligne :",
        error
      );
    });

  return () => {
    window.removeEventListener(
      OFFLINE_EVENT,
      listener
    );
  };
}
