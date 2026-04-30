"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

export default function ProfilChefPage() {
  const router = useRouter();

  const [nomEntreprise, setNomEntreprise] = useState("");
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [planAbonnement, setPlanAbonnement] = useState("");
  const [statutAbonnement, setStatutAbonnement] = useState("");

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    chargerProfil();
  }, []);

  async function chargerProfil() {
    setChargement(true);
    setMessage("");

    const { contexte, erreur } = await chargerContexteEntreprise();

    if (erreur || !contexte) {
      setMessage(erreur || "Impossible de charger ton profil.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    if (contexte.profil.role !== "chef") {
      setMessage("Ce compte n'est pas un compte chef.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    setNomEntreprise(contexte.entreprise.nom_entreprise || "");
    setPlanAbonnement(contexte.entreprise.plan_abonnement || "");
    setStatutAbonnement(contexte.entreprise.statut_abonnement || "");
    setEmail(contexte.profil.email || "");
    setNom(contexte.profil.nom || "");
    setPrenom(contexte.profil.prenom || "");

    setChargement(false);
  }

  async function modifierMotDePasse() {
    setSauvegarde(true);
    setMessage("");

    if (motDePasse.length < 8) {
      setMessage("Le mot de passe doit contenir au moins 8 caractères.");
      setSauvegarde(false);
      return;
    }

    if (motDePasse !== confirmation) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      setSauvegarde(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: motDePasse,
    });

    if (error) {
      setMessage(error.message || "Impossible de modifier le mot de passe.");
      setSauvegarde(false);
      return;
    }

    setMotDePasse("");
    setConfirmation("");
    setMessage("Mot de passe modifié avec succès.");
    setSauvegarde(false);
  }

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Chargement du profil chef...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Mon profil chef
          </h1>

          <p className="mt-2 text-slate-600">
            Consulte ton compte chef, ton entreprise et modifie ton mot de passe.
          </p>
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Informations du compte
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Prénom
              </label>

              <input
                value={prenom}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nom
              </label>

              <input
                value={nom}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email de connexion
              </label>

              <input
                value={email}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Pour modifier ton nom, prénom ou email, on ajoutera plus tard une page de gestion avancée du compte.
          </p>
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Entreprise SaaS
          </h2>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Entreprise
              </label>

              <input
                value={nomEntreprise}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Plan
              </label>

              <input
                value={planAbonnement}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Statut abonnement
              </label>

              <input
                value={statutAbonnement}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>
          </div>

          <div className="mt-5">
            <Link
              href="/chef/parametres"
              className="inline-block rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
            >
              Modifier les paramètres entreprise
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Modifier mon mot de passe
          </h2>

          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nouveau mot de passe
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
                Confirmer le nouveau mot de passe
              </label>

              <input
                type="password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    modifierMotDePasse();
                  }
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Confirmer"
              />
            </div>

            <button
              onClick={modifierMotDePasse}
              disabled={sauvegarde}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {sauvegarde ? "Modification..." : "Modifier mon mot de passe"}
            </button>

            {message && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}