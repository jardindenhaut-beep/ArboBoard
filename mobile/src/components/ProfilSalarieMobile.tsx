import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./ProfilSalarieMobile.css";

type Props = {
  entrepriseId: string;

  profilId: string;

  salarieId: string;

  onFermer: () => void;

  onDeconnexion: () => void;
};

type ProfilUtilisateur = {
  id: string;

  email:
    string | null;

  role:
    string | null;

  statut:
    string | null;

  nom:
    string | null;

  prenom:
    string | null;

  entreprise_id:
    string | null;

  telephone_mfa:
    string | null;
};

type Salarie = {
  id: string;

  entreprise_id:
    string;

  user_id:
    string | null;

  profil_id:
    string | null;

  email:
    string | null;

  nom:
    string | null;

  prenom:
    string | null;

  telephone:
    string | null;

  statut:
    string | null;

  created_at?:
    string | null;

  updated_at?:
    string | null;
};

type Entreprise = {
  id: string;

  nom_entreprise?:
    string | null;

  slug?:
    string | null;

  email_contact?:
    string | null;
};

type FormulaireProfil = {
  prenom: string;

  nom: string;

  telephone: string;
};

type EtatMfa = {
  actif: boolean;

  nombreFacteurs:
    number;

  niveauActuel:
    string;

  niveauSuivant:
    string;
};

function messageErreur(
  error: unknown,
  fallback: string
) {
  if (
    error instanceof
      Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error ===
      "object" &&
    "message" in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message ===
      "string"
  ) {
    return (
      error as {
        message: string;
      }
    ).message;
  }

  return fallback;
}

function nettoyerTexte(
  valeur: string
) {
  const texte =
    valeur.trim();

  return texte
    ? texte
    : null;
}

function normaliserTelephone(
  valeur: string
) {
  const brut =
    valeur.trim();

  if (
    !brut
  ) {
    return null;
  }

  let numero =
    brut
      .replace(
        /[\s().-]/g,
        ""
      )
      .replace(
        /[^0-9+]/g,
        ""
      );

  if (
    numero.startsWith(
      "0033"
    )
  ) {
    numero =
      `+33${numero.slice(
        4
      )}`;
  }

  if (
    numero.startsWith(
      "0"
    ) &&
    numero.length ===
      10
  ) {
    numero =
      `+33${numero.slice(
        1
      )}`;
  }

  return numero;
}

function afficherTelephone(
  valeur:
    | string
    | null
    | undefined
) {
  if (
    !valeur
  ) {
    return "Non renseigné";
  }

  return valeur;
}

function initiales(
  prenom:
    | string
    | null
    | undefined,
  nom:
    | string
    | null
    | undefined,
  email:
    | string
    | null
    | undefined
) {
  const texte =
    [
      prenom,
      nom,
    ]
      .filter(Boolean)
      .map(
        (
          valeur
        ) =>
          String(
            valeur
          )
            .trim()
            .charAt(0)
            .toUpperCase()
      )
      .join("")
      .slice(
        0,
        2
      );

  if (
    texte
  ) {
    return texte;
  }

  return String(
    email ||
      "A"
  )
    .charAt(0)
    .toUpperCase();
}

function nomComplet(
  profil:
    ProfilUtilisateur | null,
  salarie:
    Salarie | null
) {
  const prenom =
    salarie?.prenom ||
    profil?.prenom ||
    "";

  const nom =
    salarie?.nom ||
    profil?.nom ||
    "";

  const complet =
    `${prenom} ${nom}`.trim();

  return (
    complet ||
    profil?.email ||
    salarie?.email ||
    "Salarié"
  );
}

function libelleStatut(
  statut:
    | string
    | null
    | undefined
) {
  const valeur =
    String(
      statut ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    valeur ===
      "actif"
  ) {
    return "Actif";
  }

  if (
    valeur ===
      "inactif"
  ) {
    return "Inactif";
  }

  if (
    valeur ===
      "archive" ||
    valeur ===
      "archivee"
  ) {
    return "Archivé";
  }

  return (
    statut ||
    "—"
  );
}

export default function ProfilSalarieMobile({
  entrepriseId,
  profilId,
  salarieId,
  onFermer,
  onDeconnexion,
}: Props) {
  const [
    profil,
    setProfil,
  ] =
    useState<ProfilUtilisateur | null>(
      null
    );

  const [
    salarie,
    setSalarie,
  ] =
    useState<Salarie | null>(
      null
    );

  const [
    entreprise,
    setEntreprise,
  ] =
    useState<Entreprise | null>(
      null
    );

  const [
    formulaire,
    setFormulaire,
  ] =
    useState<FormulaireProfil>({
      prenom:
        "",

      nom:
        "",

      telephone:
        "",
    });

  const [
    mfa,
    setMfa,
  ] =
    useState<EtatMfa>({
      actif:
        false,

      nombreFacteurs:
        0,

      niveauActuel:
        "aal1",

      niveauSuivant:
        "aal1",
    });

  const [
    chargement,
    setChargement,
  ] =
    useState(
      true
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
    succes,
    setSucces,
  ] =
    useState(
      ""
    );

  useEffect(() => {
    void initialiser();
  }, [
    entrepriseId,
    profilId,
    salarieId,
  ]);

  async function chargerMfa() {
    try {
      const [
        facteursResultat,
        niveauResultat,
      ] =
        await Promise.all([
          supabase.auth.mfa.listFactors(),

          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);

      if (
        facteursResultat.error
      ) {
        throw facteursResultat.error;
      }

      if (
        niveauResultat.error
      ) {
        throw niveauResultat.error;
      }

      const brut =
        facteursResultat.data as any;

      const facteurs =
        [
          ...(brut?.all ||
            []),

          ...(brut?.totp ||
            []),

          ...(brut?.phone ||
            []),
        ];

      const uniques =
        Array.from(
          new Map(
            facteurs.map(
              (
                facteur:
                  any
              ) => [
                facteur.id,
                facteur,
              ]
            )
          ).values()
        );

      const verifies =
        uniques.filter(
          (
            facteur:
              any
          ) =>
            facteur?.status ===
            "verified"
        );

      setMfa({
        actif:
          verifies.length >
          0,

        nombreFacteurs:
          verifies.length,

        niveauActuel:
          niveauResultat.data.currentLevel ||
          "aal1",

        niveauSuivant:
          niveauResultat.data.nextLevel ||
          "aal1",
      });
    } catch (
      error
    ) {
      console.warn(
        "Chargement MFA profil salarié mobile :",
        error
      );
    }
  }

  async function initialiser() {
    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      if (
        !entrepriseId ||
        !profilId ||
        !salarieId
      ) {
        throw new Error(
          "Profil salarié incomplet."
        );
      }

      const [
        profilResultat,
        salarieResultat,
        entrepriseResultat,
      ] =
        await Promise.all([
          supabase
            .from(
              "profils_utilisateurs"
            )
            .select(
              `
                id,
                email,
                role,
                statut,
                nom,
                prenom,
                entreprise_id,
                telephone_mfa
              `
            )
            .eq(
              "id",
              profilId
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .maybeSingle(),

          supabase
            .from(
              "salaries"
            )
            .select(
              "*"
            )
            .eq(
              "id",
              salarieId
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .maybeSingle(),

          supabase
            .from(
              "entreprises_abonnees"
            )
            .select(
              "*"
            )
            .eq(
              "id",
              entrepriseId
            )
            .maybeSingle(),
        ]);

      if (
        profilResultat.error
      ) {
        throw profilResultat.error;
      }

      if (
        salarieResultat.error
      ) {
        throw salarieResultat.error;
      }

      if (
        !profilResultat.data
      ) {
        throw new Error(
          "Profil utilisateur introuvable."
        );
      }

      if (
        !salarieResultat.data
      ) {
        throw new Error(
          "Fiche salarié introuvable."
        );
      }

      const profilCharge =
        profilResultat.data as ProfilUtilisateur;

      const salarieCharge =
        salarieResultat.data as Salarie;

      setProfil(
        profilCharge
      );

      setSalarie(
        salarieCharge
      );

      setEntreprise(
        entrepriseResultat.data
          ? (
              entrepriseResultat.data as Entreprise
            )
          : null
      );

      setFormulaire({
        prenom:
          salarieCharge.prenom ||
          profilCharge.prenom ||
          "",

        nom:
          salarieCharge.nom ||
          profilCharge.nom ||
          "",

        telephone:
          salarieCharge.telephone ||
          profilCharge.telephone_mfa ||
          "",
      });

      await chargerMfa();
    } catch (
      error
    ) {
      console.error(
        "Profil salarié mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger votre profil."
        )
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  function modifierChamp(
    champ:
      keyof FormulaireProfil,
    valeur:
      string
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

  async function enregistrerProfil() {
    if (
      !profil ||
      !salarie ||
      enregistrement
    ) {
      return;
    }

    if (
      !formulaire.prenom.trim()
    ) {
      setErreur(
        "Votre prénom doit être renseigné."
      );

      return;
    }

    if (
      !formulaire.nom.trim()
    ) {
      setErreur(
        "Votre nom doit être renseigné."
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

      setSucces(
        ""
      );

      const telephone =
        normaliserTelephone(
          formulaire.telephone
        );

      if (
        telephone &&
        !/^\+[1-9][0-9]{7,14}$/.test(
          telephone
        )
      ) {
        throw new Error(
          "Le numéro de téléphone n’est pas valide."
        );
      }

      const maintenant =
        new Date().toISOString();

      const payloadProfil = {
        nom:
          nettoyerTexte(
            formulaire.nom
          ),

        prenom:
          nettoyerTexte(
            formulaire.prenom
          ),

        telephone_mfa:
          telephone,
      };

      const {
        error:
          profilError,
      } =
        await supabase
          .from(
            "profils_utilisateurs"
          )
          .update(
            payloadProfil
          )
          .eq(
            "id",
            profil.id
          )
          .eq(
            "entreprise_id",
            entrepriseId
          );

      if (
        profilError
      ) {
        throw profilError;
      }

      const payloadSalarie = {
        nom:
          nettoyerTexte(
            formulaire.nom
          ),

        prenom:
          nettoyerTexte(
            formulaire.prenom
          ),

        telephone,

        user_id:
          profil.id,

        profil_id:
          profil.id,

        updated_at:
          maintenant,
      };

      const {
        error:
          salarieError,
      } =
        await supabase
          .from(
            "salaries"
          )
          .update(
            payloadSalarie
          )
          .eq(
            "id",
            salarie.id
          )
          .eq(
            "entreprise_id",
            entrepriseId
          );

      if (
        salarieError
      ) {
        throw salarieError;
      }

      setProfil(
        (
          ancien
        ) =>
          ancien
            ? {
                ...ancien,

                ...payloadProfil,
              }
            : ancien
      );

      setSalarie(
        (
          ancien
        ) =>
          ancien
            ? {
                ...ancien,

                ...payloadSalarie,
              }
            : ancien
      );

      setFormulaire(
        (
          ancien
        ) => ({
          ...ancien,

          telephone:
            telephone ||
            "",
        })
      );

      setSucces(
        "Votre profil a été mis à jour."
      );
    } catch (
      error
    ) {
      console.error(
        "Mise à jour profil salarié mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de mettre à jour votre profil."
        )
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  const emailConnexion =
    profil?.email ||
    salarie?.email ||
    "";

  const nomEntreprise =
    entreprise?.nom_entreprise ||
    entreprise?.slug ||
    entreprise?.email_contact ||
    "Votre entreprise";

  const nomAffiche =
    useMemo(
      () =>
        nomComplet(
          profil,
          salarie
        ),
      [
        profil,
        salarie,
      ]
    );

  const initialesAffichees =
    useMemo(
      () =>
        initiales(
          salarie?.prenom ||
            profil?.prenom,

          salarie?.nom ||
            profil?.nom,

          emailConnexion
        ),
      [
        salarie,
        profil,
        emailConnexion,
      ]
    );

  if (
    chargement
  ) {
    return (
      <main className="profil-salarie-mobile">
        <div className="profil-salarie-loading">
          <div className="profil-salarie-spinner" />

          <strong>
            Chargement du profil…
          </strong>
        </div>
      </main>
    );
  }

  return (
    <main className="profil-salarie-mobile">
      <header className="profil-salarie-header">
        <button
          type="button"
          className="profil-salarie-back"
          onClick={
            onFermer
          }
        >
          ‹
        </button>

        <div>
          <h1>
            Mon profil
          </h1>

          <span>
            Espace Salarié
          </span>
        </div>

        <div className="profil-salarie-header-space" />
      </header>

      <div className="profil-salarie-content">
        {erreur ? (
          <div className="profil-salarie-error">
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div className="profil-salarie-success">
            {succes}
          </div>
        ) : null}

        <section className="profil-salarie-identity">
          <div className="profil-salarie-avatar-large">
            {
              initialesAffichees
            }
          </div>

          <div>
            <small>
              COMPTE SALARIÉ
            </small>

            <h2>
              {
                nomAffiche
              }
            </h2>

            <p>
              {
                emailConnexion ||
                "Email non renseigné"
              }
            </p>
          </div>

          <span className="profil-salarie-active">
            {
              libelleStatut(
                profil?.statut
              )
            }
          </span>
        </section>

        <section className="profil-salarie-company">
          <span>
            🌳
          </span>

          <div>
            <small>
              ENTREPRISE
            </small>

            <strong>
              {
                nomEntreprise
              }
            </strong>
          </div>
        </section>

        <section className="profil-salarie-card">
          <div className="profil-salarie-card-title">
            <span>
              👤
            </span>

            <div>
              <h3>
                Informations personnelles
              </h3>

              <p>
                Modifiez les informations utilisées dans Arboboard.
              </p>
            </div>
          </div>

          <div className="profil-salarie-grid">
            <label className="profil-salarie-field">
              <span>
                Prénom *
              </span>

              <input
                type="text"
                value={
                  formulaire.prenom
                }
                disabled={
                  enregistrement
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "prenom",
                    event.target.value
                  )
                }
                placeholder="Votre prénom"
                autoComplete="given-name"
              />
            </label>

            <label className="profil-salarie-field">
              <span>
                Nom *
              </span>

              <input
                type="text"
                value={
                  formulaire.nom
                }
                disabled={
                  enregistrement
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "nom",
                    event.target.value
                  )
                }
                placeholder="Votre nom"
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="profil-salarie-field">
            <span>
              Téléphone
            </span>

            <input
              type="tel"
              inputMode="tel"
              value={
                formulaire.telephone
              }
              disabled={
                enregistrement
              }
              onChange={(
                event
              ) =>
                modifierChamp(
                  "telephone",
                  event.target.value
                )
              }
              placeholder="06 00 00 00 00"
              autoComplete="tel"
            />

            <small>
              Numéro utilisé également pour la sécurité du compte si nécessaire.
            </small>
          </label>

          <label className="profil-salarie-field">
            <span>
              Email de connexion
            </span>

            <input
              type="email"
              value={
                emailConnexion
              }
              disabled
            />

            <small>
              L’email de connexion n’est pas modifiable depuis ce profil.
            </small>
          </label>

          <button
            type="button"
            className="profil-salarie-save"
            disabled={
              enregistrement
            }
            onClick={() =>
              void enregistrerProfil()
            }
          >
            {enregistrement
              ? "Enregistrement…"
              : "✓ Enregistrer mon profil"}
          </button>
        </section>

        <section className="profil-salarie-card">
          <div className="profil-salarie-card-title">
            <span>
              🔐
            </span>

            <div>
              <h3>
                Sécurité
              </h3>

              <p>
                État de la double authentification de votre compte.
              </p>
            </div>
          </div>

          <div className="profil-salarie-security">
            <div>
              <span>
                Double authentification
              </span>

              <strong
                className={
                  mfa.actif
                    ? "success"
                    : "warning"
                }
              >
                {mfa.actif
                  ? "Active ✓"
                  : "Non configurée"}
              </strong>
            </div>

            <div>
              <span>
                Facteurs vérifiés
              </span>

              <strong>
                {
                  mfa.nombreFacteurs
                }
              </strong>
            </div>

            <div>
              <span>
                Session actuelle
              </span>

              <strong>
                {mfa.niveauActuel ===
                "aal2"
                  ? "Sécurisée AAL2 ✓"
                  : "AAL1"}
              </strong>
            </div>
          </div>

          <div className="profil-salarie-security-info">
            <span>
              🛡️
            </span>

            <p>
              La connexion mobile utilise la même double authentification que votre compte Arboboard.
            </p>
          </div>
        </section>

        <section className="profil-salarie-card">
          <div className="profil-salarie-card-title">
            <span>
              ℹ️
            </span>

            <div>
              <h3>
                Compte Arboboard
              </h3>

              <p>
                Informations liées à votre accès salarié.
              </p>
            </div>
          </div>

          <div className="profil-salarie-details">
            <div>
              <span>
                Nom affiché
              </span>

              <strong>
                {
                  nomAffiche
                }
              </strong>
            </div>

            <div>
              <span>
                Rôle
              </span>

              <strong>
                Salarié
              </strong>
            </div>

            <div>
              <span>
                Statut profil
              </span>

              <strong>
                {libelleStatut(
                  profil?.statut
                )}
              </strong>
            </div>

            <div>
              <span>
                Statut salarié
              </span>

              <strong>
                {libelleStatut(
                  salarie?.statut
                )}
              </strong>
            </div>

            <div>
              <span>
                Téléphone enregistré
              </span>

              <strong>
                {afficherTelephone(
                  salarie?.telephone ||
                    profil?.telephone_mfa
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="profil-salarie-logout-card">
          <div>
            <span>
              ↗
            </span>

            <div>
              <strong>
                Se déconnecter
              </strong>

              <small>
                Fermer votre session Arboboard sur cet appareil.
              </small>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const confirmation =
                window.confirm(
                  "Voulez-vous vous déconnecter d’Arboboard ?"
                );

              if (
                confirmation
              ) {
                onDeconnexion();
              }
            }}
          >
            Se déconnecter
          </button>
        </section>
      </div>
    </main>
  );
}