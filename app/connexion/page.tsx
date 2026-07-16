"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { journaliserActivite } from "@/lib/journalActivite";
import { supabase } from "@/lib/supabaseClient";
import {
  masquerNumeroTelephone,
  messageErreurMfa,
  preparerMfaApresConnexion,
  renvoyerCodeMfa,
  verifierCodeMfa,
  type TypeFacteurMfa,
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
  const [typeFacteur, setTypeFacteur] =
    useState<TypeFacteurMfa | null>(null);
  const [telephoneMasque, setTelephoneMasque] = useState("");

  const [chargement, setChargement] = useState(false);
  const [renvoi, setRenvoi] = useState(false);
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
        "Aucun profil chef n’est associé à ce compte."
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
        "Ce compte n’est pas un compte chef."
      );
    }

    if (
      profil.statut &&
      profil.statut.toLowerCase() !== "actif"
    ) {
      throw new Error(
        "Ce compte est désactivé."
      );
    }

    if (!profil.entreprise_id) {
      throw new Error(
        "Ce compte n’est rattaché à aucune entreprise."
      );
    }

    return profil;
  }

  async function terminerConnexion(
    userId: string,
    profil?: ProfilUtilisateur
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
        "Connexion réussie à l’espace chef.",
      details: {
        double_authentification:
          typeFacteur === "phone"
            ? "telephone"
            : typeFacteur || "non_requise",
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
      await terminerConnexion(userId, profilValide);
      return;
    }

    if (
      !mfa.facteur ||
      !mfa.challengeId ||
      !mfa.typeFacteur
    ) {
      throw new Error(
        "Impossible de préparer la double authentification."
      );
    }

    setUtilisateurId(userId);
    setFactorId(mfa.facteur.id);
    setChallengeId(mfa.challengeId);
    setTypeFacteur(mfa.typeFacteur);
    setTelephoneMasque(
      mfa.typeFacteur === "phone"
        ? masquerNumeroTelephone(mfa.facteur.phone)
        : ""
    );
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
      await supabase.auth.signOut();
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
          "Merci de remplir l’email et le mot de passe."
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
            : error?.message ||
                "Connexion impossible."
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
        await supabase.auth.signOut();
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

      await terminerConnexion(utilisateurId);
    } catch (error) {
      setMessage(messageErreurMfa(error));
    } finally {
      setChargement(false);
    }
  }

  async function renvoyerLeCode() {
    if (!factorId || typeFacteur !== "phone") return;

    try {
      setRenvoi(true);
      setMessage("");

      const nouveauChallenge =
        await renvoyerCodeMfa(factorId);

      setChallengeId(nouveauChallenge);
      setMessage(
        `Un nouveau code a été envoyé au ${telephoneMasque}.`
      );
    } catch (error) {
      setMessage(messageErreurMfa(error));
    } finally {
      setRenvoi(false);
    }
  }

  async function annulerMfa() {
    await supabase.auth.signOut();
    setEtape("identifiants");
    setUtilisateurId("");
    setFactorId("");
    setChallengeId("");
    setCodeMfa("");
    setTypeFacteur(null);
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
            ← Retour à l’accueil
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
                : typeFacteur === "phone"
                  ? `Saisissez le code envoyé au ${telephoneMasque}.`
                  : "Saisissez temporairement le code de votre ancienne application d’authentification."}
            </p>
          </div>

          {etape === "identifiants" ? (
            <div className="grid gap-5">
              <label className="block">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  placeholder="contact@entreprise.fr"
                />
              </label>

              <label className="block">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Mot de passe"
                />
              </label>

              <Link
                href="/mot-de-passe-oublie"
                className="text-sm font-semibold text-emerald-700 hover:underline"
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
            <div className="grid gap-4">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
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
                className="w-full rounded-2xl border border-slate-300 px-4 py-4 text-center text-2xl font-black tracking-[0.35em] outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                placeholder="123456"
              />

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

              {typeFacteur === "phone" && (
                <button
                  type="button"
                  onClick={() =>
                    void renvoyerLeCode()
                  }
                  disabled={renvoi || chargement}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {renvoi
                    ? "Envoi…"
                    : "Renvoyer le code"}
                </button>
              )}

              <button
                type="button"
                onClick={() => void annulerMfa()}
                disabled={chargement}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Annuler et revenir à la connexion
              </button>
            </div>
          )}

          {message && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700"
            >
              {message}
            </p>
          )}

          <div className="mt-6 border-t border-slate-200 pt-5 text-center">
            <Link
              href="/connexion/salarie"
              className="text-sm font-semibold text-slate-600 hover:text-slate-950 hover:underline"
            >
              Vous êtes salarié ? Connexion salarié
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}