import {

  useEffect,

  useState,

} from "react";

import type {

  FormEvent,

} from "react";

import type {

  User,

} from "@supabase/supabase-js";

import {

  supabase,

} from "./lib/supabase";

import {

  preparerMfaApresConnexion,

  verifierCodeMfa,

} from "./lib/mfa";

import {

  enregistrerAppareilConfianceMobile,

  estApplicationNative,

  verifierAppareilConfianceMobile,

} from "./lib/appareilConfianceMobile";

import {

  estEnLigne,

  initialiserModeHorsLigne,

  lireCache,

  mettreEnCache,

  supprimerDuCache,

} from "./lib/offline";

import {

  initialiserSynchronisationTerrain,

} from "./lib/syncInterventions";

import DashboardChef from "./components/DashboardChef";

import DashboardSalarie from "./components/DashboardSalarie";

import LoginPage from "./pages/auth/LoginPage";
import MfaPage from "./pages/auth/MfaPage";

import "./App.css";

type ProfilUtilisateur = {

  id: string;

  email:

    string | null;

  role:

    string | null;

  nom:

    string | null;

  prenom:

    string | null;

  statut:

    string | null;

  entreprise_id:

    string | null;

};

type Espace =

  | "chef"

  | "salarie";

type EtapeConnexion =

  | "identifiants"

  | "mfa";


type ProfilHorsLigne = {

  profil: ProfilUtilisateur;

  espace: Espace;

  valideLe: string;

  expireLe: string;

};

const DUREE_ACCES_HORS_LIGNE_MS =

  7 * 24 * 60 * 60 * 1000;

function cleProfilHorsLigne(

  userId: string

) {

  return `auth:profil:${userId}`;

}

function normaliser(

  valeur:

    | string

    | null

    | undefined

) {

  return String(

    valeur ||

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

}

function determinerEspace(

  role:

    | string

    | null

    | undefined

): Espace | null {

  const valeur =

    normaliser(

      role

    );

  if (

    [

      "chef",

      "admin",

      "administrateur",

      "gerant",

      "dirigeant",

      "patron",

    ].includes(

      valeur

    )

  ) {

    return "chef";

  }

  if (

    [

      "salarie",

      "employe",

      "employee",

      "ouvrier",

      "collaborateur",

    ].includes(

      valeur

    )

  ) {

    return "salarie";

  }

  return null;

}

function profilActif(

  statut:

    | string

    | null

    | undefined

) {

  const valeur =

    normaliser(

      statut ||

        "actif"

    );

  return ![

    "archive",

    "archivee",

    "inactif",

    "supprime",

    "supprimee",

    "desactive",

    "desactivee",

  ].includes(

    valeur

  );

}

function messageErreurConnexion(

  message?:

    string

) {

  if (

    message ===

    "Invalid login credentials"

  ) {

    return "Adresse e-mail ou mot de passe incorrect.";

  }

  return (

    message ||

    "Connexion impossible."

  );

}

function messageErreurMfa(

  error:

    unknown

) {

  if (

    error &&

    typeof error ===

      "object" &&

    "message" in error &&

    typeof (

      error as {

        message?:

          unknown;

      }

    ).message ===

      "string"

  ) {

    const message =

      (

        error as {

          message:

            string;

        }

      ).message;

    const normalisee =

      message.toLowerCase();

    if (

      normalisee.includes(

        "invalid"

      ) &&

      (

        normalisee.includes(

          "code"

        ) ||

        normalisee.includes(

          "challenge"

        ) ||

        normalisee.includes(

          "verification"

        ) ||

        normalisee.includes(

          "totp"

        )

      )

    ) {

      return "Le code est incorrect ou a expiré. Attendez le prochain code puis recommencez.";

    }

    if (

      normalisee.includes(

        "rate limit"

      )

    ) {

      return "Trop de tentatives. Patientez quelques instants avant de recommencer.";

    }

    return message;

  }

  return "Une erreur inattendue est survenue.";

}

export default function App() {

  const [

    email,

    setEmail,

  ] =

    useState(

      ""

    );

  const [

    motDePasse,

    setMotDePasse,

  ] =

    useState(

      ""

    );

  const [

    codeMfa,

    setCodeMfa,

  ] =

    useState(

      ""

    );

  const [

    faireConfianceAppareil,

    setFaireConfianceAppareil,

  ] =

    useState(

      true

    );

  const [

    chargement,

    setChargement,

  ] =

    useState(

      true

    );

  const [

    message,

    setMessage,

  ] =

    useState(

      ""

    );

  const [

    profil,

    setProfil,

  ] =

    useState<ProfilUtilisateur | null>(

      null

    );

  const [

    espace,

    setEspace,

  ] =

    useState<Espace | null>(

      null

    );

  const [

    etape,

    setEtape,

  ] =

    useState<EtapeConnexion>(

      "identifiants"

    );

  const [

    utilisateurEnAttente,

    setUtilisateurEnAttente,

  ] =

    useState<User | null>(

      null

    );

  const [

    facteurId,

    setFacteurId,

  ] =

    useState(

      ""

    );

  const [

    challengeId,

    setChallengeId,

  ] =

    useState(

      ""

    );

  const applicationNative =

    estApplicationNative();

  useEffect(() => {

    void initialiserModeHorsLigne()

      .catch(

        (error) => {

          console.warn(

            "Initialisation mode hors ligne Arboboard :",

            error

          );

        }

      )

      .finally(

        () => {

          initialiserSynchronisationTerrain();

          void verifierSession();

        }

      );

    const {

      data: {

        subscription,

      },

    } =

      supabase.auth.onAuthStateChange(

        (

          _event,

          session

        ) => {

          if (

            !session?.user

          ) {

            setProfil(

              null

            );

            setEspace(

              null

            );

            setEtape(

              "identifiants"

            );

            nettoyerEtatMfa();

          }

        }

      );

    return () =>

      subscription.unsubscribe();

  }, []);

  function nettoyerEtatMfa() {

    setUtilisateurEnAttente(

      null

    );

    setFacteurId(

      ""

    );

    setChallengeId(

      ""

    );

    setCodeMfa(

      ""

    );

  }

  async function enregistrerProfilHorsLigne(

    profilAEnregistrer: ProfilUtilisateur,

    espaceAEnregistrer: Espace

  ) {

    const maintenant =

      Date.now();

    await mettreEnCache<ProfilHorsLigne>(

      cleProfilHorsLigne(

        profilAEnregistrer.id

      ),

      {

        profil:

          profilAEnregistrer,

        espace:

          espaceAEnregistrer,

        valideLe:

          new Date(

            maintenant

          ).toISOString(),

        expireLe:

          new Date(

            maintenant +

              DUREE_ACCES_HORS_LIGNE_MS

          ).toISOString(),

      }

    );

  }

  async function chargerProfilHorsLigne(

    userId: string

  ) {

    const cache =

      await lireCache<ProfilHorsLigne>(

        cleProfilHorsLigne(

          userId

        )

      );

    if (

      !cache?.profil ||

      !cache.espace

    ) {

      throw new Error(

        "Aucun accès hors ligne n’est encore enregistré sur cet appareil. Connectez-vous une fois avec Internet."

      );

    }

    const expiration =

      new Date(

        cache.expireLe

      ).getTime();

    if (

      !Number.isFinite(

        expiration

      ) ||

      Date.now() >

        expiration

    ) {

      throw new Error(

        "L’accès hors ligne de cet appareil doit être renouvelé. Reconnectez-vous avec Internet."

      );

    }

    if (

      cache.profil.id !==

      userId

    ) {

      throw new Error(

        "Le profil hors ligne ne correspond pas à la session enregistrée."

      );

    }

    if (

      !profilActif(

        cache.profil.statut

      )

    ) {

      throw new Error(

        "Ce compte Arboboard est désactivé."

      );

    }

    setProfil(

      cache.profil

    );

    setEspace(

      cache.espace

    );

    setEtape(

      "identifiants"

    );

    nettoyerEtatMfa();

  }

  async function chargerProfil(

    user:

      User

  ) {

    const {

      data,

      error,

    } =

      await supabase

        .from(

          "profils_utilisateurs"

        )

        .select(

          `

            id,

            email,

            role,

            nom,

            prenom,

            statut,

            entreprise_id

          `

        )

        .eq(

          "id",

          user.id

        )

        .maybeSingle();

    if (

      error ||

      !data

    ) {

      throw new Error(

        "Profil Arboboard introuvable pour ce compte."

      );

    }

    const profilCharge =

      data as ProfilUtilisateur;

    if (

      !profilActif(

        profilCharge.statut

      )

    ) {

      throw new Error(

        "Ce compte Arboboard est désactivé."

      );

    }

    const espaceTrouve =

      determinerEspace(

        profilCharge.role

      );

    if (

      !espaceTrouve

    ) {

      throw new Error(

        `Rôle Arboboard non reconnu : ${

          profilCharge.role ||

          "non renseigné"

        }.`

      );

    }

    if (

      !profilCharge.entreprise_id

    ) {

      throw new Error(

        "Aucune entreprise n’est associée à ce compte."

      );

    }

    await enregistrerProfilHorsLigne(

      profilCharge,

      espaceTrouve

    );

    setProfil(

      profilCharge

    );

    setEspace(

      espaceTrouve

    );

    setEtape(

      "identifiants"

    );

    nettoyerEtatMfa();

  }

  async function appareilDejaReconnu(

    accessToken:

      string | null

  ) {

    if (

      !applicationNative ||

      !accessToken

    ) {

      return false;

    }

    try {

      return await verifierAppareilConfianceMobile(

        accessToken

      );

    } catch (

      error

    ) {

      console.warn(

        "Vérification appareil de confiance :",

        error

      );

      return false;

    }

  }

  async function gererMfaApresConnexion(

    user:

      User,

    accessToken:

      string | null

  ) {

    const {

      data:

        niveau,

      error:

        niveauError,

    } =

      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (

      niveauError

    ) {

      throw niveauError;

    }

    /*

     * Déjà AAL2 :

     * aucune nouvelle vérification.

     */

    if (

      niveau.currentLevel ===

      "aal2"

    ) {

      await chargerProfil(

        user

      );

      return;

    }

    /*

     * Aucune MFA requise sur ce compte.

     */

    if (

      niveau.nextLevel !==

      "aal2"

    ) {

      await chargerProfil(

        user

      );

      return;

    }

    /*

     * Le compte exige AAL2 mais la session

     * est actuellement AAL1.

     *

     * Dans l'application native seulement,

     * on demande au serveur si le téléphone

     * possède déjà un jeton de confiance valide.

     */

    const reconnu =

      await appareilDejaReconnu(

        accessToken

      );

    if (

      reconnu

    ) {

      await chargerProfil(

        user

      );

      return;

    }

    /*

     * Téléphone non reconnu :

     * création d'un challenge TOTP normal.

     */

    const preparation =

      await preparerMfaApresConnexion();

    if (

      !preparation.necessaire

    ) {

      await chargerProfil(

        user

      );

      return;

    }

    if (

      !preparation.facteurId ||

      !preparation.challengeId

    ) {

      throw new Error(

        "Impossible de préparer la double authentification."

      );

    }

    setUtilisateurEnAttente(

      user

    );

    setFacteurId(

      preparation.facteurId

    );

    setChallengeId(

      preparation.challengeId

    );

    setCodeMfa(

      ""

    );

    setEtape(

      "mfa"

    );

  }

  async function verifierSession() {

    try {

      setChargement(

        true

      );

      setMessage(

        ""

      );

      const {

        data: {

          session,

        },

        error,

      } =

        await supabase.auth.getSession();

      if (

        error

      ) {

        throw error;

      }

      if (

        !session?.user

      ) {

        return;

      }

      if (

        !estEnLigne()

      ) {

        await chargerProfilHorsLigne(

          session.user.id

        );

        return;

      }

      try {

        await gererMfaApresConnexion(

          session.user,

          session.access_token ||

            null

        );

      } catch (

        errorEnLigne

      ) {

        console.warn(

          "Restauration en ligne impossible, tentative du cache hors ligne :",

          errorEnLigne

        );

        await chargerProfilHorsLigne(

          session.user.id

        );

      }

    } catch (

      error

    ) {

      console.error(

        "Restauration session mobile :",

        error

      );

      setMessage(

        error instanceof

          Error

          ? error.message

          : "Impossible de restaurer la session."

      );

      /*
       * IMPORTANT :
       * on ne détruit plus automatiquement
       * la session lorsqu'une coupure réseau
       * empêche la restauration.
       *
       * Une déconnexion explicite reste gérée
       * par deconnecter().
       */

      setProfil(

        null

      );

      setEspace(

        null

      );

      nettoyerEtatMfa();

      setEtape(

        "identifiants"

      );

    } finally {

      setChargement(

        false

      );

    }

  }

  async function connecter(

    event:

      FormEvent<HTMLFormElement>

  ) {

    event.preventDefault();

    try {

      setChargement(

        true

      );

      setMessage(

        ""

      );

      setProfil(

        null

      );

      setEspace(

        null

      );

      nettoyerEtatMfa();

      const emailNettoye =

        email

          .trim()

          .toLowerCase();

      if (

        !emailNettoye ||

        !motDePasse

      ) {

        throw new Error(

          "Renseignez votre adresse e-mail et votre mot de passe."

        );

      }

      const {

        data,

        error,

      } =

        await supabase.auth.signInWithPassword({

          email:

            emailNettoye,

          password:

            motDePasse,

        });

      if (

        error ||

        !data.user

      ) {

        throw new Error(

          messageErreurConnexion(

            error?.message

          )

        );

      }

      await gererMfaApresConnexion(

        data.user,

        data.session?.access_token ||

          null

      );

      setMotDePasse(

        ""

      );

    } catch (

      error

    ) {

      console.error(

        "Connexion mobile :",

        error

      );

      setMessage(

        error instanceof

          Error

          ? error.message

          : "Connexion impossible."

      );

      await supabase.auth.signOut();

      setProfil(

        null

      );

      setEspace(

        null

      );

      nettoyerEtatMfa();

      setEtape(

        "identifiants"

      );

    } finally {

      setChargement(

        false

      );

    }

  }

  async function enregistrerConfianceApresMfa() {

    if (

      !applicationNative ||

      !faireConfianceAppareil

    ) {

      return;

    }

    try {

      /*

       * Après le verify MFA, on renouvelle

       * explicitement la session afin que

       * le token envoyé à l'API contienne

       * bien le niveau AAL2.

       */

      const {

        data:

          refreshData,

        error:

          refreshError,

      } =

        await supabase.auth.refreshSession();

      if (

        refreshError

      ) {

        throw refreshError;

      }

      const accessToken =

        refreshData.session

          ?.access_token ||

        null;

      if (

        !accessToken

      ) {

        throw new Error(

          "La session sécurisée AAL2 est introuvable."

        );

      }

      const {

        data:

          niveau,

        error:

          niveauError,

      } =

        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (

        niveauError

      ) {

        throw niveauError;

      }

      if (

        niveau.currentLevel !==

        "aal2"

      ) {

        throw new Error(

          "La session n’a pas atteint le niveau de sécurité AAL2."

        );

      }

      await enregistrerAppareilConfianceMobile(

        accessToken

      );

    } catch (

      error

    ) {

      /*

       * Le TOTP est déjà valide.

       * Un problème d'enregistrement du

       * téléphone ne doit pas empêcher

       * l'utilisateur d'entrer dans Arboboard.

       *

       * Il devra simplement refaire le TOTP

       * lors d'une prochaine connexion.

       */

      console.warn(

        "Impossible d'enregistrer le téléphone de confiance :",

        error

      );

    }

  }

  async function validerMfa(

    event:

      FormEvent<HTMLFormElement>

  ) {

    event.preventDefault();

    if (

      !utilisateurEnAttente ||

      !facteurId ||

      !challengeId

    ) {

      setMessage(

        "Session MFA incomplète. Reconnectez-vous."

      );

      return;

    }

    try {

      setChargement(

        true

      );

      setMessage(

        ""

      );

      /*

       * IMPORTANT :

       * src/lib/mfa.ts attend trois

       * arguments positionnels.

       */

      await verifierCodeMfa(

        facteurId,

        challengeId,

        codeMfa

      );

      await enregistrerConfianceApresMfa();

      await chargerProfil(

        utilisateurEnAttente

      );

    } catch (

      error

    ) {

      console.error(

        "Validation MFA mobile :",

        error

      );

      setMessage(

        messageErreurMfa(

          error

        )

      );

    } finally {

      setChargement(

        false

      );

    }

  }

  async function annulerMfa() {

    try {

      setChargement(

        true

      );

      await supabase.auth.signOut();

    } finally {

      setProfil(

        null

      );

      setEspace(

        null

      );

      nettoyerEtatMfa();

      setEtape(

        "identifiants"

      );

      setMessage(

        ""

      );

      setChargement(

        false

      );

    }

  }

  async function deconnecter() {

    const profilIdAvantDeconnexion =

      profil?.id ||

      null;

    try {

      setChargement(

        true

      );

      /*
       * On ne supprime PAS le jeton
       * d'appareil de confiance ici.
       *
       * Une déconnexion normale doit
       * conserver la confiance pendant
       * les 90 jours prévus.
       */

      await supabase.auth.signOut();

      if (

        profilIdAvantDeconnexion

      ) {

        await supprimerDuCache(

          cleProfilHorsLigne(

            profilIdAvantDeconnexion

          )

        );

      }

    } finally {

      setProfil(

        null

      );

      setEspace(

        null

      );

      nettoyerEtatMfa();

      setEmail(

        ""

      );

      setMotDePasse(

        ""

      );

      setMessage(

        ""

      );

      setEtape(

        "identifiants"

      );

      setChargement(

        false

      );

    }

  }

  if (

    chargement &&

    !profil &&

    etape !==

      "mfa"

  ) {

    return (

      <main className="app-shell app-shell-center">

        <div className="loader" />

        <p className="loading-text">

          Chargement d’Arboboard…

        </p>

      </main>

    );

  }

  if (

    profil &&

    espace ===

      "chef" &&

    profil.entreprise_id

  ) {

    return (

      <DashboardChef

        entrepriseId={

          profil.entreprise_id

        }

        prenom={

          profil.prenom

        }

        onDeconnexion={() =>

          void deconnecter()

        }

      />

    );

  }

  if (

    profil &&

    espace ===

      "salarie" &&

    profil.entreprise_id

  ) {

    return (

      <DashboardSalarie

        profilId={

          profil.id

        }

        entrepriseId={

          profil.entreprise_id

        }

        prenom={

          profil.prenom

        }

        email={

          profil.email

        }

        onDeconnexion={() =>

          void deconnecter()

        }

      />

    );

  }

  if (etape === "mfa") {
    return (
      <MfaPage
        code={codeMfa}
        faireConfianceAppareil={faireConfianceAppareil}
        chargement={chargement}
        erreur={message}
        applicationNative={applicationNative}
        onCodeChange={(valeur) =>
          setCodeMfa(
            valeur
              .replace(/\D/g, "")
              .slice(0, 6)
          )
        }
        onConfianceChange={setFaireConfianceAppareil}
        onSubmit={validerMfa}
        onAnnuler={() => void annulerMfa()}
      />
    );
  }

  return (
    <LoginPage
      email={email}
      motDePasse={motDePasse}
      chargement={chargement}
      erreur={message}
      onEmailChange={setEmail}
      onMotDePasseChange={setMotDePasse}
      onSubmit={connecter}
    />
  );
}

