"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfilUtilisateur = {
  id: string;
  email: string;
  role: "chef" | "salarie";
};

export default function ResetPasswordPage() {
  const router = useRouter();

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState(
    "Validation du lien de récupération..."
  );

  useEffect(() => {
    preparerSessionRecovery();
  }, []);

  async function preparerSessionRecovery() {
    setChargement(true);
    setMessage("Validation du lien de récupération...");

    const url = new URL(window.location.href);

    const code = url.searchParams.get("code");

    const hash = window.location.hash.replace("#", "");
    const hashParams = new URLSearchParams(hash);

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(
          error.message ||
            "Lien de récupération invalide ou expiré. Recommence la demande."
        );
        setChargement(false);
        return;
      }
    } else if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setMessage(
          error.message ||
            "Impossible de récupérer la session depuis le lien de récupération."
        );
        setChargement(false);
        return;
      }
    } else {
      setMessage(
        "Aucun lien de récupération valide. Redirection vers la connexion..."
      );

      await supabase.auth.signOut();

      setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    const {
      data: { session },
      error: erreurSession,
    } = await supabase.auth.getSession();

    if (erreurSession || !session?.user) {
      setMessage(
        erreurSession?.message ||
          "Session introuvable. Le lien est peut-être expiré. Recommence la demande."
      );
      setChargement(false);
      return;
    }

    setMessage("Lien validé. Choisis maintenant ton nouveau mot de passe.");
    setChargement(false);
  }

  async function recupererRoleUtilisateur() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data } = await supabase
      .from("profils_utilisateurs")
      .select("id, email, role")
      .eq("id", user.id)
      .maybeSingle();

    return (data as ProfilUtilisateur | null) || null;
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

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setMessage(
        "Session absente. Le lien est expiré ou déjà utilisé. Recommence depuis Mot de passe oublié."
      );
      setSauvegarde(false);
      return;
    }

    const profil = await recupererRoleUtilisateur();

    const { error } = await supabase.auth.updateUser({
      password: motDePasse,
    });

    if (error) {
      setMessage(
        error.message || "Impossible d'enregistrer le nouveau mot de passe."
      );
      setSauvegarde(false);
      return;
    }

    setMotDePasse("");
    setConfirmation("");

    const redirection =
      profil?.role === "salarie" ? "/connexion/salarie" : "/connexion";

    setMessage(
      "Mot de passe modifié avec succès. Reconnecte-toi avec ton nouveau mot de passe."
    );

    await supabase.auth.signOut();

    setTimeout(() => {
      router.push(redirection);
    }, 1200);
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
              Nouveau mot de passe
            </h1>

            <p className="mt-2 text-slate-600">
              Crée un nouveau mot de passe pour ton compte Arboboard.
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
                {sauvegarde
                  ? "Enregistrement..."
                  : "Enregistrer le nouveau mot de passe"}
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