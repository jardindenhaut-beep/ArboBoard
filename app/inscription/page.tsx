"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function InscriptionPage() {
  const router = useRouter();

  const [nomEntreprise, setNomEntreprise] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");

  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");

  async function creerCompte() {
    setChargement(true);
    setMessage("");

    if (!nomEntreprise.trim()) {
      setMessage("Merci de renseigner le nom de l'entreprise.");
      setChargement(false);
      return;
    }

    if (!prenom.trim() || !nom.trim()) {
      setMessage("Merci de renseigner ton prénom et ton nom.");
      setChargement(false);
      return;
    }

    if (!email.trim()) {
      setMessage("Merci de renseigner ton email.");
      setChargement(false);
      return;
    }

    if (motDePasse.length < 8) {
      setMessage("Le mot de passe doit contenir au moins 8 caractères.");
      setChargement(false);
      return;
    }

    if (motDePasse !== confirmationMotDePasse) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      setChargement(false);
      return;
    }

    const { data: inscriptionData, error: erreurInscription } =
  await supabase.auth.signUp({
    email: email.trim(),
    password: motDePasse,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        nom_entreprise: nomEntreprise.trim(),
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: telephone.trim(),
      },
    },
  });

    if (erreurInscription) {
      setMessage(erreurInscription.message || "Erreur lors de l'inscription.");
      setChargement(false);
      return;
    }

    if (!inscriptionData.user) {
      setMessage("Impossible de créer le compte utilisateur.");
      setChargement(false);
      return;
    }

    if (!inscriptionData.session) {
      setMessage(
        "Compte créé. Vérifie ton email pour confirmer ton compte, puis connecte-toi."
      );
      setChargement(false);
      return;
    }

    const { error: erreurCreationSaas } = await supabase.rpc(
      "creer_compte_saas",
      {
        p_nom_entreprise: nomEntreprise.trim(),
        p_email: email.trim(),
        p_nom: nom.trim(),
        p_prenom: prenom.trim(),
        p_telephone: telephone.trim(),
      }
    );

    if (erreurCreationSaas) {
      setMessage(
        erreurCreationSaas.message ||
          "Compte créé, mais impossible de créer l'espace entreprise."
      );
      setChargement(false);
      return;
    }

    setMessage("Compte entreprise créé avec succès.");

    setTimeout(() => {
      router.push("/chef/dashboard");
    }, 800);
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              🌱
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Créer mon espace Arboboard
            </h1>

            <p className="mt-2 text-slate-600">
              Crée ton compte entreprise et accède à ton espace chef.
            </p>
          </div>

          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nom de l&apos;entreprise
              </label>

              <input
                value={nomEntreprise}
                onChange={(e) => setNomEntreprise(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Exemple : Jardin d'en haut"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Prénom
                </label>

                <input
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Prénom"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom
                </label>

                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Nom"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="contact@entreprise.fr"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Téléphone
                </label>

                <input
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="07 00 00 00 00"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Mot de passe
                </label>

                <input
                  type="password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="8 caractères minimum"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Confirmer le mot de passe
                </label>

                <input
                  type="password"
                  value={confirmationMotDePasse}
                  onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      creerCompte();
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Confirmer"
                />
              </div>
            </div>

            <button
              onClick={creerCompte}
              disabled={chargement}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {chargement ? "Création du compte..." : "Créer mon espace"}
            </button>

            {message && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}

            <p className="text-center text-sm text-slate-500">
              Déjà un compte ?{" "}
              <Link
                href="/connexion"
                className="font-semibold text-slate-900 hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}