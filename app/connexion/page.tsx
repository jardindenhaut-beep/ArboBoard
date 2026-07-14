"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { journaliserActivite } from "@/lib/journalActivite";
import { supabase } from "@/lib/supabaseClient";

type ProfilUtilisateur = {
  id: string;
  email: string;
  role: "chef" | "salarie";
  nom: string;
  prenom: string;
  statut: string;
  entreprise_id: string | null;
};

type EtapeConnexion = "identifiants" | "double_authentification";

function messageErreurConnexion(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const message = error.message.toLowerCase();

    if (
      message.includes("invalid login credentials") ||
      message.includes("email not confirmed")
    ) {
      return "Email ou mot de passe incorrect.";
    }

    if (
      message.includes("invalid") &&
      (message.includes("totp") ||
        message.includes("verification code"))
    ) {
      return "Le code de vérification est incorrect ou expiré.";
    }

    return error.message;
  }

  return "Une erreur inattendue est survenue.";
}

export default function ConnexionChefPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [codeMfa, setCodeMfa] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [utilisateurId, setUtilisateurId] = useState<string | null>(
    null
  );
  const [etape, setEtape] =
    useState<EtapeConnexion>("identifiants");
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void verifierSessionExistante();
  }, []);

  async function verifierSessionExistante() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: niveau } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (
        niveau?.nextLevel === "aal2" &&
        niveau.currentLevel !== "aal2"
      ) {
        const { data: facteurs, error: facteursError } =
          await supabase.auth.mfa.listFactors();

        if (facteursError) return;

        const facteurTotp = facteurs.totp.find(
          (facteur) => facteur.status === "verified"
        );

        if (facteurTotp) {
          setUtilisateurId(session.user.id);
          setFactorId(facteurTotp.id);
          setEtape("double_authentification");
          return;
        }
      }

      if (
        niveau?.currentLevel === "aal2" ||
        (
          niveau?.currentLevel === "aal1" &&
          niveau.nextLevel === "aal1"
        )
      ) {
        await validerProfilEtRediriger(session.user.id);
      }
    } catch (error) {
      console.warn(
        "Vérification de la session existante impossible :",
        error
      );
    }
  }

  async function validerProfilEtRediriger(userId: string) {
    const { data: profil, error: erreurProfil } = await supabase
      .from("profils_utilisateurs")
      .select("id, email, role, nom, prenom, statut, entreprise_id")
      .eq("id", userId)
      .maybeSingle();

    if (erreurProfil || !profil) {
      await supabase.auth.signOut();
      throw new Error(
        "Aucun profil chef n'est associé à ce compte."
      );
    }

    const profilUtilisateur = profil as ProfilUtilisateur;

    if (profilUtilisateur.role !== "chef") {
      await supabase.auth.signOut();
      throw new Error("Ce compte n'est pas un compte chef.");
    }

    if (
      profilUtilisateur.statut &&
      profilUtilisateur.statut !== "actif"
    ) {
      await supabase.auth.signOut();
      throw new Error("Ce compte chef est désactivé.");
    }

    if (!profilUtilisateur.entreprise_id) {
      await supabase.auth.signOut();
      throw new Error(
        "Ce compte chef n'est rattaché à aucune entreprise."
      );
    }

    await journaliserActivite({
      action: "connexion_chef_reussie",
      categorie: "authentification",
      ressource_type: "compte_utilisateur",
      ressource_id: userId,
      resultat: "succes",
      description:
        "Connexion réussie à l’espace chef Arboboard.",
      details: {
        double_authentification:
          etape === "double_authentification",
      },
    });

    router.replace("/chef/dashboard");
    router.refresh();
  }

  async function seConnecter() {
    if (chargement) return;

    setChargement(true);
    setMessage("");

    try {
      if (!email.trim() || !motDePasse.trim()) {
        throw new Error(
          "Merci de remplir l'email et le mot de passe."
        );
      }

      const { data: connexionData, error: erreurConnexion } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: motDePasse,
        });

      if (erreurConnexion || !connexionData.user) {
        throw erreurConnexion || new Error("Connexion impossible.");
      }

      const { data: facteurs, error: erreurFacteurs } =
        await supabase.auth.mfa.listFactors();

      if (erreurFacteurs) {
        await supabase.auth.signOut();
        throw erreurFacteurs;
      }

      const facteurTotp = facteurs.totp.find(
        (facteur) => facteur.status === "verified"
      );

      if (facteurTotp) {
        setUtilisateurId(connexionData.user.id);
        setFactorId(facteurTotp.id);
        setCodeMfa("");
        setMotDePasse("");
        setEtape("double_authentification");
        return;
      }

      await validerProfilEtRediriger(connexionData.user.id);
    } catch (error) {
      setMessage(messageErreurConnexion(error));
    } finally {
      setChargement(false);
    }
  }

  async function verifierCodeMfa() {
    if (chargement) return;

    setChargement(true);
    setMessage("");

    try {
      const code = codeMfa.replace(/\D/g, "").slice(0, 6);

      if (!factorId || !utilisateurId) {
        throw new Error(
          "La demande de double authentification a expiré. Recommence la connexion."
        );
      }

      if (code.length !== 6) {
        throw new Error(
          "Saisis le code à 6 chiffres de ton application d'authentification."
        );
      }

      const { error } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId,
          code,
        });

      if (error) throw error;

      await journaliserActivite({
        action: "double_authentification_validee",
        categorie: "authentification",
        ressource_type: "compte_utilisateur",
        ressource_id: utilisateurId,
        resultat: "succes",
        description:
          "Validation du second facteur lors de la connexion.",
      });

      await validerProfilEtRediriger(utilisateurId);
    } catch (error) {
      setMessage(messageErreurConnexion(error));
      setCodeMfa("");
    } finally {
      setChargement(false);
    }
  }

  async function annulerDoubleAuthentification() {
    await supabase.auth.signOut();

    setFactorId(null);
    setUtilisateurId(null);
    setCodeMfa("");
    setMotDePasse("");
    setEtape("identifiants");
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          {etape === "identifiants" ? (
            <>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                  👨‍💼
                </div>

                <h1 className="text-3xl font-bold text-slate-900">
                  Connexion chef
                </h1>

                <p className="mt-2 text-slate-600">
                  Connecte-toi pour accéder au tableau de bord et
                  gérer l&apos;entreprise.
                </p>
              </div>

              <div className="grid gap-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email chef
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="email"
                    disabled={chargement}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 disabled:bg-slate-50"
                    placeholder="chef@mail.fr"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Mot de passe
                  </label>

                  <input
                    type="password"
                    value={motDePasse}
                    onChange={(event) =>
                      setMotDePasse(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void seConnecter();
                      }
                    }}
                    autoComplete="current-password"
                    disabled={chargement}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 disabled:bg-slate-50"
                    placeholder="Mot de passe"
                  />
                </div>

                <Link
                  href="/mot-de-passe-oublie"
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 hover:underline"
                >
                  Mot de passe oublié ?
                </Link>

                <button
                  type="button"
                  onClick={() => void seConnecter()}
                  disabled={chargement}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {chargement
                    ? "Connexion..."
                    : "Se connecter"}
                </button>

                {message ? (
                  <p
                    role="alert"
                    className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700"
                  >
                    {message}
                  </p>
                ) : null}

                <p className="text-center text-sm text-slate-500">
                  Pas encore de compte ?{" "}
                  <Link
                    href="/inscription"
                    className="font-semibold text-slate-900 hover:underline"
                  >
                    Créer mon espace
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
                  🔐
                </div>

                <h1 className="text-3xl font-bold text-slate-900">
                  Vérification de sécurité
                </h1>

                <p className="mt-2 text-slate-600">
                  Ouvre ton application d&apos;authentification et
                  saisis le code à 6 chiffres affiché pour Arboboard.
                </p>
              </div>

              <div className="grid gap-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Code de vérification
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={codeMfa}
                    onChange={(event) =>
                      setCodeMfa(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6)
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void verifierCodeMfa();
                      }
                    }}
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={chargement}
                    className="w-full rounded-xl border border-slate-300 px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.45em] outline-none focus:border-emerald-600 disabled:bg-slate-50"
                    placeholder="000000"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void verifierCodeMfa()}
                  disabled={
                    chargement || codeMfa.length !== 6
                  }
                  className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {chargement
                    ? "Vérification..."
                    : "Valider le code"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void annulerDoubleAuthentification()
                  }
                  disabled={chargement}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Recommencer la connexion
                </button>

                {message ? (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  >
                    {message}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Accès réservé au chef d&apos;entreprise.
        </p>
      </div>
    </main>
  );
}