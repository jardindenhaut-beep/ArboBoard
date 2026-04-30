"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");

  async function envoyerLien() {
    setChargement(true);
    setMessage("");

    if (!email.trim()) {
      setMessage("Merci de renseigner ton email.");
      setChargement(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    );

    if (error) {
      setMessage(error.message || "Impossible d'envoyer le lien de récupération.");
      setChargement(false);
      return;
    }

    setMessage(
      "Si un compte existe avec cet email, un lien de récupération vient d'être envoyé."
    );

    setChargement(false);
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
              🔑
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Mot de passe oublié
            </h1>

            <p className="mt-2 text-slate-600">
              Renseigne ton email pour recevoir un lien de récupération.
            </p>
          </div>

          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email du compte
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    envoyerLien();
                  }
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="email@entreprise.fr"
              />
            </div>

            <button
              onClick={envoyerLien}
              disabled={chargement}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {chargement ? "Envoi en cours..." : "Envoyer le lien"}
            </button>

            {message && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}

            <div className="grid gap-2 text-center text-sm text-slate-500">
              <Link
                href="/connexion"
                className="font-semibold text-slate-900 hover:underline"
              >
                Retour connexion chef
              </Link>

              <Link
                href="/connexion/salarie"
                className="font-semibold text-slate-900 hover:underline"
              >
                Retour connexion salarié
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}