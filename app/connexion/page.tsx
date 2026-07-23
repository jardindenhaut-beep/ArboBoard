"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { journaliserActivite } from "@/lib/journalActivite";
import { supabase } from "@/lib/supabaseClient";
import {
  messageErreurMfa,
  preparerMfaApresConnexion,
  verifierCodeMfa,
} from "@/lib/auth/mfaTelephone";

type ProfilUtilisateur = {
  id: string;
  email: string;
  role: string;
  nom: string | null;
  prenom: string | null;
  statut: string | null;
  entreprise_id: string | null;
};

type EtapeConnexion =
  | "identifiants"
  | "double_authentification";

export default function ConnexionChefPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [codeMfa, setCodeMfa] = useState("");

  const [etape, setEtape] =
    useState<EtapeConnexion>("identifiants");
  const [utilisateurId, setUtilisateurId] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");

  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void verifierSessionExistante();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chargerProfilChef(userId: string) {
    const { data, error } = await supabase
      .from("profils_utilisateurs")
      .select(
        "id, email, role, nom, prenom, statut, entreprise_id"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      throw new Error(
        "Aucun profil chef n'est associé à ce compte."
      );
    }

    const profil = data as ProfilUtilisateur;
    const role = String(profil.role || "").toLowerCase();

    if (
      ![
        "chef",
        "admin",
        "administrateur",
        "gerant",
        "gérant",
        "dirigeant",
        "patron",
      ].includes(role)
    ) {
      throw new Error(
        "Ce compte n'est pas un compte chef."
      );
    }

    if (
      profil.statut &&
      profil.statut.toLowerCase() !== "actif"
    ) {
      throw new Error("Ce compte est désactivé.");
    }

    if (!profil.entreprise_id) {
      throw new Error(
        "Ce compte n'est rattaché à aucune entreprise."
      );
    }

    return profil;
  }

  async function terminerConnexion(
    userId: string,
    profil?: ProfilUtilisateur,
    avecMfa = false
  ) {
    const profilValide =
      profil || (await chargerProfilChef(userId));

    await journaliserActivite({
      action: "connexion_chef_reussie",
      categorie: "authentification",
      ressource_type: "profil_utilisateur",
      ressource_id: profilValide.id,
      resultat: "succes",
      description:
        "Connexion réussie à l'espace chef.",
      details: {
        double_authentification: avecMfa
          ? "application_totp"
          : "session_deja_verifiee_ou_non_requise",
      },
    });

    router.replace("/chef/dashboard");
    router.refresh();
  }

  async function preparerSecondeEtape(
    userId: string,
    profil?: ProfilUtilisateur
  ) {
    const profilValide =
      profil || (await chargerProfilChef(userId));

    const mfa = await preparerMfaApresConnexion();

    if (!mfa.necessaire) {
      await terminerConnexion(
        userId,
        profilValide,
        false
      );
      return;
    }

    if (!mfa.facteur || !mfa.challengeId) {
      throw new Error(
        "Impossible de préparer la double authentification."
      );
    }

    setUtilisateurId(userId);
    setFactorId(mfa.facteur.id);
    setChallengeId(mfa.challengeId);
    setCodeMfa("");
    setEtape("double_authentification");
  }

  async function verifierSessionExistante() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) return;

      await preparerSecondeEtape(session.user.id);
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      setEtape("identifiants");
    }
  }

  async function seConnecter() {
    try {
      setChargement(true);
      setMessage("");

      const emailNettoye = email.trim().toLowerCase();

      if (!emailNettoye || !motDePasse) {
        throw new Error(
          "Merci de remplir l'email et le mot de passe."
        );
      }

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: emailNettoye,
          password: motDePasse,
        });

      if (error || !data.user) {
        throw new Error(
          error?.message === "Invalid login credentials"
            ? "Email ou mot de passe incorrect."
            : error?.message || "Connexion impossible."
        );
      }

      const profil = await chargerProfilChef(data.user.id);

      await preparerSecondeEtape(
        data.user.id,
        profil
      );
    } catch (error) {
      const texte =
        error instanceof Error
          ? error.message
          : "Connexion impossible.";

      if (
        texte.includes("compte chef") ||
        texte.includes("désactivé") ||
        texte.includes("entreprise")
      ) {
        await supabase.auth.signOut({ scope: "local" });
      }

      setMessage(texte);
    } finally {
      setChargement(false);
    }
  }

  async function verifierMfa() {
    try {
      setChargement(true);
      setMessage("");

      if (
        !utilisateurId ||
        !factorId ||
        !challengeId
      ) {
        throw new Error(
          "La demande de vérification a expiré. Reconnectez-vous."
        );
      }

      await verifierCodeMfa({
        facteurId: factorId,
        challengeId,
        code: codeMfa,
      });

      await terminerConnexion(
        utilisateurId,
        undefined,
        true
      );
    } catch (error) {
      setMessage(messageErreurMfa(error));
    } finally {
      setChargement(false);
    }
  }

  async function annulerMfa() {
    await supabase.auth.signOut({ scope: "local" });
    setEtape("identifiants");
    setUtilisateurId("");
    setFactorId("");
    setChallengeId("");
    setCodeMfa("");
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Retour à l'accueil
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
              🌳
            </div>

            <h1 className="text-3xl font-black text-slate-950">
              {etape === "identifiants"
                ? "Connexion chef"
                : "Code de sécurité"}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {etape === "identifiants"
                ? "Accédez à la gestion de votre entreprise."
                : "Ouvrez votre application d'authentification et saisissez le code à 6 chiffres."}
            </p>
          </div>

          {etape === "identifiants" ? (
            <div className="grid gap-5">
              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  placeholder="vous@entreprise.fr"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Mot de passe
                </span>
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
                  placeholder="Mot de passe"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <Link
                href="/mot-de-passe-oublie"
                className="text-sm font-semibold text-slate-700 hover:underline"
              >
                Mot de passe oublié ?
              </Link>

              <button
                type="button"
                onClick={() => void seConnecter()}
                disabled={chargement}
                className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {chargement
                  ? "Connexion…"
                  : "Se connecter"}
              </button>
            </div>
          ) : (
            <div className="grid gap-5">
              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Code de l'application
                </span>
                <input
                  value={codeMfa}
                  onChange={(event) =>
                    setCodeMfa(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 8)
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void verifierMfa();
                    }
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="123456"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl font-black tracking-[0.35em] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                Cet appareil restera connecté tant que vous ne
                vous déconnectez pas et que les données du
                navigateur ne sont pas supprimées.
              </div>

              <button
                type="button"
                onClick={() => void verifierMfa()}
                disabled={chargement}
                className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {chargement
                  ? "Vérification…"
                  : "Valider le code"}
              </button>

              <button
                type="button"
                onClick={() => void annulerMfa()}
                disabled={chargement}
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler et se déconnecter
              </button>
            </div>
          )}

          {message ? (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}