"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  const [message, setMessage] = useState("Validation du compte en cours...");

  useEffect(() => {
    finaliserInscription();
  }, []);

  async function finaliserInscription() {
    setMessage("Validation du compte en cours...");

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(
          error.message ||
            "Lien de validation invalide ou expiré. Recommence l'inscription."
        );
        return;
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setMessage(
        "Email validé. Tu peux maintenant te connecter avec ton email et ton mot de passe."
      );

      setTimeout(() => {
        router.push("/connexion");
      }, 1500);

      return;
    }

    const user = session.user;
    const metadata = user.user_metadata || {};

    const nomEntreprise =
      metadata.nom_entreprise || metadata.nomEntreprise || "Entreprise";

    const prenom = metadata.prenom || "";
    const nom = metadata.nom || "";
    const telephone = metadata.telephone || "";

    const { error } = await supabase.rpc("creer_compte_saas", {
      p_nom_entreprise: nomEntreprise,
      p_email: user.email || "",
      p_nom: nom,
      p_prenom: prenom,
      p_telephone: telephone,
    });

    if (error) {
      setMessage(
        error.message ||
          "Compte validé, mais impossible de créer l'espace entreprise."
      );
      return;
    }

    setMessage("Compte validé. Redirection vers ton espace chef...");

    setTimeout(() => {
      router.push("/chef/dashboard");
    }, 800);
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
            ✅
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Confirmation du compte
          </h1>

          <p className="mt-4 text-slate-600">{message}</p>
        </div>
      </div>
    </main>
  );
}