"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SetPasswordPage() {
  const router = useRouter();

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState("Préparation de ton compte...");

  useEffect(() => {
    preparerSessionInvitation();
  }, []);

  async function preparerSessionInvitation() {
    setChargement(true);
    setMessage("Validation de ton invitation...");

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(
          error.message ||
            "Lien d'invitation invalide ou expiré. Demande au chef de renvoyer une invitation."
        );
        setChargement(false);
        return;
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setMessage(
        "Session introuvable. Le lien est peut-être expiré. Demande une nouvelle invitation."
      );
      setChargement(false);
      return;
    }

    setMessage("Invitation validée. Choisis maintenant ton mot de passe.");
    setChargement(false);
  }

  async function enregistrerMotDePasse() {
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
      setMessage(error.message || "Impossible d'enregistrer le mot de passe.");
      setSauvegarde(false);
      return;
    }

    setMessage("Mot de passe créé. Redirection vers ton espace salarié...");

    setTimeout(() => {
      router.push("/salarie/dashboard");
    }, 800);
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              🔐
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Créer mon mot de passe
            </h1>

            <p className="mt-2 text-slate-600">
              Termine la création de ton accès salarié Arboboard.
            </p>
          </div>

          {chargement ? (
            <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {message}
            </p>
          ) : (
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
                  Confirmer le mot de passe
                </label>

                <input
                  type="password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      enregistrerMotDePasse();
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Confirmer"
                />
              </div>

              <button
                onClick={enregistrerMotDePasse}
                disabled={sauvegarde}
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {sauvegarde ? "Enregistrement..." : "Créer mon mot de passe"}
              </button>

              {message && (
                <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  {message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}