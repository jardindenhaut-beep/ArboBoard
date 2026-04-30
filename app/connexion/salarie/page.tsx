"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function ConnexionSalariePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");

  async function seConnecter() {
    setChargement(true);
    setMessage("");

    if (!email.trim() || !motDePasse.trim()) {
      setMessage("Merci de remplir l'email et le mot de passe.");
      setChargement(false);
      return;
    }

    const { data: connexionData, error: erreurConnexion } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: motDePasse,
      });

    if (erreurConnexion || !connexionData.user) {
      setMessage(
        erreurConnexion?.message ||
          "Connexion impossible. Vérifie l'email et le mot de passe."
      );
      setChargement(false);
      return;
    }

    const { data: profil, error: erreurProfil } = await supabase
      .from("profils_utilisateurs")
      .select("id, email, role, nom, prenom, statut, entreprise_id")
      .eq("id", connexionData.user.id)
      .maybeSingle();

    if (erreurProfil || !profil) {
      await supabase.auth.signOut();
      setMessage("Aucun profil salarié n'est associé à ce compte.");
      setChargement(false);
      return;
    }

    const profilUtilisateur = profil as ProfilUtilisateur;

    if (profilUtilisateur.role !== "salarie") {
      await supabase.auth.signOut();
      setMessage("Ce compte n'est pas un compte salarié.");
      setChargement(false);
      return;
    }

    if (profilUtilisateur.statut && profilUtilisateur.statut !== "actif") {
      await supabase.auth.signOut();
      setMessage("Ce compte salarié est désactivé. Contacte ton chef.");
      setChargement(false);
      return;
    }

    if (!profilUtilisateur.entreprise_id) {
      await supabase.auth.signOut();
      setMessage("Ce compte salarié n'est rattaché à aucune entreprise.");
      setChargement(false);
      return;
    }

    router.push("/salarie/dashboard");
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
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              👷
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Connexion salarié
            </h1>

            <p className="mt-2 text-slate-600">
              Connecte-toi pour accéder à ton planning et à tes demandes.
            </p>
          </div>

          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email salarié
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="salarie@mail.fr"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mot de passe
              </label>

              <input
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    seConnecter();
                  }
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
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
              onClick={seConnecter}
              disabled={chargement}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {chargement ? "Connexion..." : "Se connecter"}
            </button>

            {message && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}

            <p className="text-center text-sm text-slate-500">
              Tu n&apos;as pas encore d&apos;accès ? Demande une invitation à ton chef.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Accès réservé aux salariés invités par leur entreprise.
        </p>
      </div>
    </main>
  );
}