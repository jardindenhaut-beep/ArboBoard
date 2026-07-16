"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { journaliserActivite } from "@/lib/journalActivite";
import { supabase } from "@/lib/supabaseClient";

type FacteurTotp = {
  id: string;
  friendly_name?: string | null;
  status: "verified" | "unverified";
  created_at?: string;
  updated_at?: string;
};

type InscriptionMfa = {
  factorId: string;
  qrCode: string;
  secret: string;
};

function messageErreur(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const message = error.message.toLowerCase();

    if (
      message.includes("invalid") &&
      (message.includes("totp") ||
        message.includes("verification code"))
    ) {
      return "Le code est incorrect ou a expiré. Attendez le prochain code puis recommencez.";
    }

    if (message.includes("aal2")) {
      return "Une vérification à deux facteurs est nécessaire pour effectuer cette opération.";
    }

    return error.message;
  }

  return "Une erreur inattendue est survenue.";
}

function formaterDate(date?: string) {
  if (!date) return "Date non disponible";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function DoubleAuthentificationChefPage() {
  const [utilisateurId, setUtilisateurId] =
    useState<string | null>(null);
  const [facteurs, setFacteurs] = useState<FacteurTotp[]>([]);
  const [niveauActuel, setNiveauActuel] = useState<
    "aal1" | "aal2" | null
  >(null);
  const [inscription, setInscription] =
    useState<InscriptionMfa | null>(null);
  const [codeActivation, setCodeActivation] = useState("");
  const [facteurDesactivation, setFacteurDesactivation] =
    useState<FacteurTotp | null>(null);
  const [codeDesactivation, setCodeDesactivation] =
    useState("");

  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [creation, setCreation] = useState(false);
  const [verification, setVerification] = useState(false);
  const [desactivation, setDesactivation] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [cleCopiee, setCleCopiee] = useState(false);

  const facteursVerifies = useMemo(
    () =>
      facteurs.filter(
        (facteur) => facteur.status === "verified"
      ),
    [facteurs]
  );

  const protectionActive = facteursVerifies.length > 0;
  const sessionDoublementVerifiee = niveauActuel === "aal2";

  const niveauProtection = useMemo(() => {
    if (protectionActive && sessionDoublementVerifiee) {
      return {
        libelle: "Protection maximale",
        couleur:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        barre: "bg-emerald-600",
        pourcentage: 100,
      };
    }

    if (protectionActive) {
      return {
        libelle: "MFA active, session à confirmer",
        couleur:
          "border-blue-200 bg-blue-50 text-blue-700",
        barre: "bg-blue-600",
        pourcentage: 75,
      };
    }

    return {
      libelle: "Protection à renforcer",
      couleur:
        "border-amber-200 bg-amber-50 text-amber-700",
      barre: "bg-amber-500",
      pourcentage: 40,
    };
  }, [protectionActive, sessionDoublementVerifiee]);

  const chargerConfiguration = useCallback(
    async (chargementInitial = false) => {
      try {
        if (chargementInitial) {
          setChargement(true);
        } else {
          setActualisation(true);
        }

        setErreur("");

      const [
        utilisateurResultat,
        facteursResultat,
        niveauResultat,
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      if (
        utilisateurResultat.error ||
        !utilisateurResultat.data.user
      ) {
        throw (
          utilisateurResultat.error ||
          new Error("Compte utilisateur introuvable.")
        );
      }

      if (facteursResultat.error) {
        throw facteursResultat.error;
      }

      if (niveauResultat.error) {
        throw niveauResultat.error;
      }

      setUtilisateurId(
        utilisateurResultat.data.user.id
      );
      setFacteurs(
        facteursResultat.data.totp as FacteurTotp[]
      );
      setNiveauActuel(
        niveauResultat.data.currentLevel
      );
    } catch (error) {
      console.error(
        "Erreur chargement double authentification :",
        error
      );
      setErreur(messageErreur(error));
      } finally {
        setChargement(false);
        setActualisation(false);
      }
    },
    []
  );

  useEffect(() => {
    void chargerConfiguration(true);
  }, [chargerConfiguration]);

  async function actualiserConfiguration() {
    setMessage("");
    await chargerConfiguration(false);
    setMessage(
      "La configuration de la double authentification a été actualisée."
    );
  }

  async function nettoyerFacteursNonVerifies() {
    const { data, error } =
      await supabase.auth.mfa.listFactors();

    if (error) throw error;

    const nonVerifies = data.all.filter(
      (facteur) =>
        facteur.factor_type === "totp" &&
        facteur.status === "unverified"
    );

    for (const facteur of nonVerifies) {
      const { error: suppressionError } =
        await supabase.auth.mfa.unenroll({
          factorId: facteur.id,
        });

      if (suppressionError) {
        continue;
      }
    }
  }

  async function commencerActivation() {
    if (!utilisateurId || creation) return;

    try {
      setCreation(true);
      setErreur("");
      setMessage("");
      setInscription(null);
      setCodeActivation("");

      await nettoyerFacteursNonVerifies();

      const { data, error } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Arboboard",
        });

      if (error) throw error;

      setInscription({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (error) {
      console.error(
        "Erreur démarrage activation MFA :",
        error
      );
      setErreur(messageErreur(error));
    } finally {
      setCreation(false);
    }
  }

  async function confirmerActivation() {
    if (
      !utilisateurId ||
      !inscription ||
      verification
    ) {
      return;
    }

    const code = codeActivation
      .replace(/\D/g, "")
      .slice(0, 6);

    if (code.length !== 6) {
      setErreur(
        "Saisis le code à 6 chiffres de l'application d'authentification."
      );
      return;
    }

    try {
      setVerification(true);
      setErreur("");
      setMessage("");

      const { error } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: inscription.factorId,
          code,
        });

      if (error) throw error;

      await journaliserActivite({
        action: "double_authentification_activee",
        categorie: "securite",
        ressource_type: "compte_utilisateur",
        ressource_id: utilisateurId,
        resultat: "succes",
        description:
          "Activation d’un facteur TOTP sur le compte utilisateur.",
        details: {
          type_facteur: "totp",
        },
      });

      const { error: deconnexionError } =
        await supabase.auth.signOut({
          scope: "others",
        });

      setInscription(null);
      setCodeActivation("");
      setCleCopiee(false);
      setMessage(
        deconnexionError
          ? "La double authentification est activée. Les autres sessions n’ont pas toutes pu être fermées automatiquement."
          : "La double authentification est activée. Les autres sessions ont été fermées par mesure de sécurité."
      );

      await chargerConfiguration(false);
    } catch (error) {
      console.error(
        "Erreur confirmation activation MFA :",
        error
      );

      const texteErreur = messageErreur(error);
      setErreur(texteErreur);

      await journaliserActivite({
        action:
          "double_authentification_activation_echec",
        categorie: "securite",
        ressource_type: "compte_utilisateur",
        ressource_id: utilisateurId,
        resultat: "echec",
        description:
          "Échec de la vérification du facteur TOTP pendant son activation.",
        details: {
          erreur: texteErreur,
        },
      });

      setCodeActivation("");
    } finally {
      setVerification(false);
    }
  }

  async function annulerActivation() {
    if (!inscription) return;

    try {
      const { error } =
        await supabase.auth.mfa.unenroll({
          factorId: inscription.factorId,
        });

      if (error) throw error;
    } catch {
      setErreur(
        "L’activation a été fermée, mais le facteur temporaire n’a pas pu être supprimé automatiquement."
      );
    } finally {
      setInscription(null);
      setCodeActivation("");
      setCleCopiee(false);
      await chargerConfiguration(false);
    }
  }

  async function copierCleSecrete() {
    if (!inscription?.secret) return;

    try {
      await navigator.clipboard.writeText(
        inscription.secret
      );

      setCleCopiee(true);
      setErreur("");
      setMessage(
        "La clé de configuration a été copiée. Conservez-la uniquement dans un emplacement sécurisé."
      );

      window.setTimeout(() => {
        setCleCopiee(false);
      }, 2500);
    } catch (error) {
      console.error(
        "Erreur copie clé MFA :",
        error
      );

      setErreur(
        "Impossible de copier automatiquement la clé. Sélectionnez-la manuellement."
      );
    }
  }

  function demanderDesactivation(facteur: FacteurTotp) {
    setFacteurDesactivation(facteur);
    setCodeDesactivation("");
    setErreur("");
    setMessage("");
  }

  async function confirmerDesactivation() {
    if (
      !utilisateurId ||
      !facteurDesactivation ||
      desactivation
    ) {
      return;
    }

    const code = codeDesactivation
      .replace(/\D/g, "")
      .slice(0, 6);

    if (code.length !== 6) {
      setErreur(
        "Saisis le code actuel à 6 chiffres pour confirmer la désactivation."
      );
      return;
    }

    try {
      setDesactivation(true);
      setErreur("");
      setMessage("");

      const { error: verificationError } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: facteurDesactivation.id,
          code,
        });

      if (verificationError) {
        throw verificationError;
      }

      const { error: suppressionError } =
        await supabase.auth.mfa.unenroll({
          factorId: facteurDesactivation.id,
        });

      if (suppressionError) {
        throw suppressionError;
      }

      await journaliserActivite({
        action: "double_authentification_desactivee",
        categorie: "securite",
        ressource_type: "compte_utilisateur",
        ressource_id: utilisateurId,
        resultat: "succes",
        description:
          "Suppression d’un facteur TOTP du compte utilisateur.",
        details: {
          facteur_id: facteurDesactivation.id,
        },
      });

      setFacteurDesactivation(null);
      setCodeDesactivation("");
      setMessage(
        "Le facteur de double authentification a été supprimé."
      );

      await chargerConfiguration(false);
    } catch (error) {
      console.error(
        "Erreur désactivation MFA :",
        error
      );

      const texteErreur = messageErreur(error);
      setErreur(texteErreur);

      await journaliserActivite({
        action:
          "double_authentification_desactivation_echec",
        categorie: "securite",
        ressource_type: "compte_utilisateur",
        ressource_id: utilisateurId,
        resultat: "echec",
        description:
          "Échec de la suppression d’un facteur TOTP.",
        details: {
          facteur_id: facteurDesactivation.id,
          erreur: texteErreur,
        },
      });

      setCodeDesactivation("");
    } finally {
      setDesactivation(false);
    }
  }

  if (chargement) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            ⏳
          </div>

          <p className="font-semibold text-slate-950">
            Chargement de la double authentification…
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Vérification des appareils TOTP et du niveau de la session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-emerald-600" />

        <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
                📲
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Sécurité du compte
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Double authentification
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Ajoutez une seconde vérification au mot de passe avec
                  une application d’authentification compatible TOTP.
                </p>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <button
                type="button"
                onClick={() =>
                  void actualiserConfiguration()
                }
                disabled={
                  actualisation ||
                  creation ||
                  verification ||
                  desactivation
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span aria-hidden="true">↻</span>
                {actualisation
                  ? "Actualisation…"
                  : "Actualiser"}
              </button>

              <Link
                href="/chef/securite/compte"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                ← Sécurité du compte
              </Link>
            </div>
          </div>
        </div>
      </header>

      {erreur ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {erreur}
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Etat
          label="Protection MFA"
          valeur={
            protectionActive
              ? "Activée"
              : "Désactivée"
          }
          positif={protectionActive}
        />

        <Etat
          label="Niveau de cette session"
          valeur={
            sessionDoublementVerifiee
              ? "Doublement vérifiée"
              : "Mot de passe uniquement"
          }
          positif={sessionDoublementVerifiee}
        />

        <Etat
          label="Appareils configurés"
          valeur={String(facteursVerifies.length)}
          positif={facteursVerifies.length > 0}
        />

        <div
          className={`rounded-3xl border p-5 shadow-sm ${niveauProtection.couleur}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Niveau de protection
          </p>

          <p className="mt-2 text-sm font-black">
            {niveauProtection.libelle}
          </p>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
            <div
              className={`h-full rounded-full ${niveauProtection.barre}`}
              style={{
                width: `${niveauProtection.pourcentage}%`,
              }}
            />
          </div>
        </div>
      </section>

      {facteursVerifies.length > 0 ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl">
              ✓
            </div>
            <h2 className="text-xl font-black text-emerald-950">
              Protection active
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-emerald-800">
            Après la saisie du mot de passe, Arboboard demandera un
            code temporaire à 6 chiffres avant d’ouvrir l’espace chef.
          </p>
        </section>
      ) : (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl">
              !
            </div>
            <h2 className="text-xl font-black text-amber-950">
              Protection recommandée
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-amber-800">
            Sans second facteur, toute personne disposant du mot de
            passe peut tenter d’accéder au compte.
          </p>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Appareils d’authentification
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Chaque facteur vérifié peut générer les codes nécessaires
              à la connexion.
            </p>
          </div>

          {!inscription ? (
            <button
              type="button"
              onClick={() => void commencerActivation()}
              disabled={creation}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creation
                ? "Création…"
                : facteursVerifies.length > 0
                  ? "Ajouter un autre appareil"
                  : "Activer la double authentification"}
            </button>
          ) : null}
        </div>

        {facteursVerifies.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            Aucun appareil vérifié.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {facteursVerifies.map((facteur, index) => (
              <article
                key={facteur.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-5 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">
                      {facteur.friendly_name ||
                        `Appareil ${index + 1}`}
                    </p>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      Vérifié
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Ajouté le {formaterDate(facteur.created_at)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    demanderDesactivation(facteur)
                  }
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 sm:w-auto"
                >
                  Supprimer cet appareil
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {inscription ? (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-blue-950">
            Configuration du nouvel appareil
          </h2>

          <ol className="mt-4 space-y-2 text-sm leading-6 text-blue-900">
            <li>1. Ouvre ton application d’authentification.</li>
            <li>2. Scanne le QR code ci-dessous.</li>
            <li>3. Saisis le code à 6 chiffres généré.</li>
          </ol>

          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-blue-200 bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inscription.qrCode}
                alt="QR code de double authentification Arboboard"
                className="mx-auto h-auto w-full max-w-[230px]"
              />

              <p className="mt-3 text-center text-xs font-medium text-slate-500">
                Scannez ce QR code uniquement depuis votre application d’authentification.
              </p>
            </div>

            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-blue-950">
                  Clé de configuration manuelle
                </p>

                <button
                  type="button"
                  onClick={() => void copierCleSecrete()}
                  className="inline-flex w-fit items-center justify-center rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-100"
                >
                  {cleCopiee ? "✓ Clé copiée" : "Copier la clé"}
                </button>
              </div>

              <code className="mt-2 block select-all break-all rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
                {inscription.secret}
              </code>

              <label className="mt-5 block">
                <span className="text-sm font-semibold text-blue-950">
                  Code à 6 chiffres
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={codeActivation}
                  onChange={(event) => {
                    setCodeActivation(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    );
                    setErreur("");
                    setMessage("");
                  }}
                  autoComplete="one-time-code"
                  className="mt-2 w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] outline-none focus:border-blue-700"
                  placeholder="000000"
                />
              </label>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    void confirmerActivation()
                  }
                  disabled={
                    verification ||
                    codeActivation.length !== 6
                  }
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {verification
                    ? "Vérification…"
                    : "Vérifier et activer"}
                </button>

                <button
                  type="button"
                  onClick={() => void annulerActivation()}
                  disabled={verification}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-blue-900 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs leading-5 text-blue-800">
            Ne partage jamais le QR code ni la clé secrète. Une personne
            qui les possède peut générer tes codes de connexion.
          </p>
        </section>
      ) : null}

      {facteurDesactivation ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-red-950">
            Confirmer la suppression
          </h2>
          <p className="mt-2 text-sm leading-6 text-red-800">
            Saisis un code actuel généré par{" "}
            <strong>
              {facteurDesactivation.friendly_name ||
                "cet appareil"}
            </strong>
            . La protection restera active si un autre appareil vérifié
            est encore enregistré.
          </p>

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={codeDesactivation}
            onChange={(event) => {
              setCodeDesactivation(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              );
              setErreur("");
              setMessage("");
            }}
            autoComplete="one-time-code"
            className="mt-5 w-full max-w-sm rounded-xl border border-red-300 bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] outline-none focus:border-red-700"
            placeholder="000000"
          />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void confirmerDesactivation()
              }
              disabled={
                desactivation ||
                codeDesactivation.length !== 6
              }
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {desactivation
                ? "Suppression…"
                : "Confirmer la suppression"}
            </button>

            <button
              type="button"
              onClick={() => {
                setFacteurDesactivation(null);
                setCodeDesactivation("");
              }}
              disabled={desactivation}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Annuler
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl">
            📱
          </div>

          <div>
            <h2 className="font-black text-slate-950">
              En cas de perte du téléphone
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Supabase ne fournit pas de codes de récupération TOTP.
              Enregistrez idéalement un second appareil sécurisé. Si aucun
              facteur n’est accessible, une procédure d’assistance et de
              vérification d’identité sera nécessaire.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Etat({
  label,
  valeur,
  positif,
}: {
  label: string;
  valeur: string;
  positif: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-bold ${
          positif
            ? "text-emerald-700"
            : "text-amber-700"
        }`}
      >
        {valeur}
      </p>
    </div>
  );
}