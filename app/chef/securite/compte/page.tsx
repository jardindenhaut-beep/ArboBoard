"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { journaliserActivite } from "@/lib/journalActivite";
import { supabase } from "@/lib/supabaseClient";

type InformationsCompte = {
  id: string;
  email: string;
  emailConfirme: boolean;
  creeAt: string | null;
  derniereConnexionAt: string | null;
  fournisseur: string;
};

type EtatMotDePasse = {
  longueur: boolean;
  minuscule: boolean;
  majuscule: boolean;
  chiffre: boolean;
  caractereSpecial: boolean;
};

function formaterDate(date: string | null) {
  if (!date) return "Non disponible";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date));
}

function traduireFournisseur(fournisseur: string) {
  const valeur = fournisseur.toLowerCase();

  if (valeur === "email") return "Email et mot de passe";
  if (valeur === "google") return "Google";
  if (valeur === "github") return "GitHub";
  if (valeur === "azure") return "Microsoft";
  if (valeur === "apple") return "Apple";

  return fournisseur || "Non renseigné";
}

function analyserMotDePasse(
  motDePasse: string
): EtatMotDePasse {
  return {
    longueur: motDePasse.length >= 12,
    minuscule: /[a-z]/.test(motDePasse),
    majuscule: /[A-Z]/.test(motDePasse),
    chiffre: /\d/.test(motDePasse),
    caractereSpecial: /[^A-Za-z0-9]/.test(motDePasse),
  };
}

function messageErreurInconnue(
  erreur: unknown,
  messageParDefaut: string
) {
  if (
    erreur &&
    typeof erreur === "object" &&
    "message" in erreur &&
    typeof erreur.message === "string"
  ) {
    return erreur.message;
  }

  return messageParDefaut;
}

export default function SecuriteCompteChefPage() {
  const router = useRouter();

  const [compte, setCompte] =
    useState<InformationsCompte | null>(null);
  const [mfaActive, setMfaActive] = useState(false);
  const [niveauMfa, setNiveauMfa] = useState<
    "aal1" | "aal2" | null
  >(null);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [afficherMotDePasse, setAfficherMotDePasse] =
    useState(false);

  const [chargement, setChargement] = useState(true);
  const [modificationMotDePasse, setModificationMotDePasse] =
    useState(false);
  const [fermetureAutresSessions, setFermetureAutresSessions] =
    useState(false);
  const [fermetureGlobale, setFermetureGlobale] =
    useState(false);

  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const etatMotDePasse = useMemo(
    () => analyserMotDePasse(motDePasse),
    [motDePasse]
  );

  const motDePasseValide = useMemo(
    () =>
      Object.values(etatMotDePasse).every(Boolean) &&
      motDePasse === confirmation,
    [etatMotDePasse, motDePasse, confirmation]
  );

  const niveauSecurite = useMemo(() => {
    let score = 0;

    if (compte?.emailConfirme) score += 30;
    if (compte?.fournisseur === "email") score += 20;
    if (mfaActive) score += 50;

    return Math.min(score, 100);
  }, [compte, mfaActive]);

  useEffect(() => {
    void chargerCompte();
  }, []);

  async function chargerCompte() {
    try {
      setChargement(true);
      setErreur("");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        throw error || new Error("Compte utilisateur introuvable.");
      }

      const fournisseur =
        user.app_metadata?.provider ||
        user.identities?.[0]?.provider ||
        "email";

      const [facteursResultat, niveauResultat] =
        await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);

      if (facteursResultat.error) {
        throw facteursResultat.error;
      }

      if (niveauResultat.error) {
        throw niveauResultat.error;
      }

      setCompte({
        id: user.id,
        email: user.email || "",
        emailConfirme: Boolean(
          user.email_confirmed_at ||
            user.confirmed_at
        ),
        creeAt: user.created_at || null,
        derniereConnexionAt:
          user.last_sign_in_at || null,
        fournisseur,
      });

      setMfaActive(
        facteursResultat.data.totp.some(
          (facteur) => facteur.status === "verified"
        )
      );
      setNiveauMfa(
        niveauResultat.data.currentLevel
      );
    } catch (error) {
      console.error(
        "Erreur chargement sécurité du compte :",
        error
      );

      setErreur(
        messageErreurInconnue(
          error,
          "Impossible de charger les informations du compte."
        )
      );
    } finally {
      setChargement(false);
    }
  }

  async function modifierMotDePasse() {
    if (!compte) return;

    if (!motDePasseValide) {
      setErreur(
        "Le nouveau mot de passe ne respecte pas encore tous les critères."
      );
      return;
    }

    try {
      setModificationMotDePasse(true);
      setErreur("");
      setMessage("");

      const { error } = await supabase.auth.updateUser({
        password: motDePasse,
      });

      if (error) throw error;

      setMotDePasse("");
      setConfirmation("");
      setMessage(
        "Votre mot de passe a été modifié avec succès."
      );

      await journaliserActivite({
        action: "mot_de_passe_modifie",
        categorie: "securite",
        ressource_type: "compte_utilisateur",
        ressource_id: compte.id,
        resultat: "succes",
        description:
          "Modification du mot de passe du compte utilisateur.",
      });
    } catch (error) {
      console.error(
        "Erreur modification mot de passe :",
        error
      );

      const message = messageErreurInconnue(
        error,
        "Impossible de modifier le mot de passe."
      );

      setErreur(message);

      await journaliserActivite({
        action: "mot_de_passe_modification_echec",
        categorie: "securite",
        ressource_type: "compte_utilisateur",
        ressource_id: compte.id,
        resultat: "echec",
        description:
          "Échec de la modification du mot de passe du compte.",
        details: {
          erreur: message,
        },
      });
    } finally {
      setModificationMotDePasse(false);
    }
  }

  async function fermerAutresSessions() {
    if (!compte) return;

    const confirme = window.confirm(
      "Fermer toutes les autres sessions Arboboard tout en conservant celle utilisée actuellement ?"
    );

    if (!confirme) return;

    try {
      setFermetureAutresSessions(true);
      setErreur("");
      setMessage("");

      const { error } = await supabase.auth.signOut({
        scope: "others",
      });

      if (error) throw error;

      setMessage(
        "Les autres sessions ont été fermées. Cette session reste active."
      );

      await journaliserActivite({
        action: "autres_sessions_fermees",
        categorie: "securite",
        ressource_type: "compte_utilisateur",
        ressource_id: compte.id,
        resultat: "succes",
        description:
          "Révocation des sessions ouvertes sur les autres appareils.",
      });
    } catch (error) {
      console.error(
        "Erreur fermeture autres sessions :",
        error
      );

      const message = messageErreurInconnue(
        error,
        "Impossible de fermer les autres sessions."
      );

      setErreur(message);

      await journaliserActivite({
        action: "fermeture_autres_sessions_echec",
        categorie: "securite",
        ressource_type: "compte_utilisateur",
        ressource_id: compte.id,
        resultat: "echec",
        description:
          "Échec de la révocation des autres sessions.",
        details: {
          erreur: message,
        },
      });
    } finally {
      setFermetureAutresSessions(false);
    }
  }

  async function fermerToutesLesSessions() {
    if (!compte) return;

    const confirme = window.confirm(
      "Fermer Arboboard sur tous les appareils, y compris celui-ci ? Vous devrez vous reconnecter."
    );

    if (!confirme) return;

    try {
      setFermetureGlobale(true);
      setErreur("");
      setMessage("");

      await journaliserActivite({
        action: "toutes_sessions_fermees",
        categorie: "securite",
        ressource_type: "compte_utilisateur",
        ressource_id: compte.id,
        resultat: "succes",
        description:
          "Déconnexion globale demandée depuis la sécurité du compte.",
      });

      const { error } = await supabase.auth.signOut({
        scope: "global",
      });

      if (error) throw error;

      router.replace("/connexion");
      router.refresh();
    } catch (error) {
      console.error(
        "Erreur fermeture globale des sessions :",
        error
      );

      setErreur(
        messageErreurInconnue(
          error,
          "Impossible de fermer toutes les sessions."
        )
      );

      setFermetureGlobale(false);
    }
  }

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-semibold text-slate-700">
          Chargement de la sécurité du compte…
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Sécurité & conformité
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Sécurité du compte
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Contrôlez les informations de connexion, renforcez votre
              mot de passe et révoquez les sessions ouvertes sur
              d’autres appareils.
            </p>
          </div>

          <Link
            href="/chef/securite"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Sécurité
          </Link>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CarteInformation
          label="Adresse email"
          valeur={compte?.email || "Non disponible"}
        />
        <CarteInformation
          label="Email confirmé"
          valeur={compte?.emailConfirme ? "Oui" : "Non"}
          positif={Boolean(compte?.emailConfirme)}
        />
        <CarteInformation
          label="Méthode de connexion"
          valeur={traduireFournisseur(
            compte?.fournisseur || ""
          )}
        />
        <CarteInformation
          label="Dernière connexion"
          valeur={formaterDate(
            compte?.derniereConnexionAt || null
          )}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              État du compte
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Compte créé le{" "}
              <strong className="font-semibold text-slate-800">
                {formaterDate(compte?.creeAt || null)}
              </strong>
              .
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            Session active
          </span>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Indicateur de sécurité</span>
            <span>{niveauSecurite} %</span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${niveauSecurite}%` }}
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            {mfaActive
              ? "La double authentification protège actuellement ce compte."
              : "Active la double authentification pour renforcer fortement la connexion."}
          </p>
        </div>
      </section>

      <section
        className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
          mfaActive
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className={`text-xl font-bold ${
                  mfaActive
                    ? "text-emerald-950"
                    : "text-amber-950"
                }`}
              >
                Double authentification
              </h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  mfaActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {mfaActive ? "Activée" : "Désactivée"}
              </span>
            </div>

            <p
              className={`mt-2 text-sm leading-6 ${
                mfaActive
                  ? "text-emerald-800"
                  : "text-amber-800"
              }`}
            >
              {mfaActive
                ? `Le compte demande un code temporaire après le mot de passe. Niveau de cette session : ${
                    niveauMfa === "aal2"
                      ? "doublement vérifiée"
                      : "mot de passe uniquement"
                  }.`
                : "Ajoute une application d’authentification pour protéger le compte même si le mot de passe est découvert."}
            </p>
          </div>

          <Link
            href="/chef/securite/double-authentification"
            className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
              mfaActive
                ? "bg-emerald-700 hover:bg-emerald-800"
                : "bg-amber-700 hover:bg-amber-800"
            }`}
          >
            {mfaActive
              ? "Gérer les appareils"
              : "Activer la protection"}
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Modifier le mot de passe
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Utilisez un mot de passe unique que vous n’employez sur
            aucun autre service.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label>
            <span className="text-sm font-medium text-slate-700">
              Nouveau mot de passe
            </span>
            <input
              type={afficherMotDePasse ? "text" : "password"}
              value={motDePasse}
              onChange={(event) =>
                setMotDePasse(event.target.value)
              }
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label>
            <span className="text-sm font-medium text-slate-700">
              Confirmer le mot de passe
            </span>
            <input
              type={afficherMotDePasse ? "text" : "password"}
              value={confirmation}
              onChange={(event) =>
                setConfirmation(event.target.value)
              }
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
        </div>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={afficherMotDePasse}
            onChange={(event) =>
              setAfficherMotDePasse(event.target.checked)
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          Afficher les mots de passe
        </label>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Critere
            valide={etatMotDePasse.longueur}
            texte="12 caractères"
          />
          <Critere
            valide={etatMotDePasse.minuscule}
            texte="Une minuscule"
          />
          <Critere
            valide={etatMotDePasse.majuscule}
            texte="Une majuscule"
          />
          <Critere
            valide={etatMotDePasse.chiffre}
            texte="Un chiffre"
          />
          <Critere
            valide={etatMotDePasse.caractereSpecial}
            texte="Un caractère spécial"
          />
        </div>

        {confirmation &&
        motDePasse !== confirmation ? (
          <p className="mt-3 text-sm font-medium text-red-600">
            Les deux mots de passe ne correspondent pas.
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void modifierMotDePasse()}
            disabled={
              modificationMotDePasse ||
              !motDePasseValide
            }
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {modificationMotDePasse
              ? "Modification…"
              : "Modifier le mot de passe"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-slate-950">
          Sessions et appareils
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Révoquez les connexions lorsque vous avez utilisé un appareil
          partagé, perdu un téléphone ou suspectez un accès non
          autorisé.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-950">
              Fermer les autres sessions
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Déconnecte les autres appareils tout en conservant la
              session utilisée maintenant.
            </p>

            <button
              type="button"
              onClick={() => void fermerAutresSessions()}
              disabled={fermetureAutresSessions}
              className="mt-5 rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-50"
            >
              {fermetureAutresSessions
                ? "Fermeture…"
                : "Fermer les autres sessions"}
            </button>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
            <h3 className="font-bold text-red-950">
              Fermer toutes les sessions
            </h3>
            <p className="mt-2 text-sm leading-6 text-red-800">
              Déconnecte tous les appareils, y compris celui utilisé
              actuellement.
            </p>

            <button
              type="button"
              onClick={() =>
                void fermerToutesLesSessions()
              }
              disabled={fermetureGlobale}
              className="mt-5 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
            >
              {fermetureGlobale
                ? "Déconnexion…"
                : "Tout déconnecter"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function CarteInformation({
  label,
  valeur,
  positif,
}: {
  label: string;
  valeur: string;
  positif?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm font-bold ${
          positif
            ? "text-emerald-700"
            : "text-slate-950"
        }`}
      >
        {valeur}
      </p>
    </div>
  );
}

function Critere({
  valide,
  texte,
}: {
  valide: boolean;
  texte: string;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
        valide
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {valide ? "✓" : "○"} {texte}
    </div>
  );
}