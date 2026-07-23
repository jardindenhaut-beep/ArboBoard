"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  extraireFacteursMfa,
  messageErreurMfa,
  obtenirTypeFacteurMfa,
  type FacteurMfaArboboard,
} from "@/lib/auth/mfaTelephone";

type Props = {
  espace: "chef" | "salarie";
};

type ProfilMfa = {
  id: string;
  email: string | null;
  role: string | null;
  entreprise_id: string | null;
};

type InscriptionTotp = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type ReponseInscriptionTotp = {
  id: string;
  totp?: {
    qr_code?: string;
    secret?: string;
    uri?: string;
  } | null;
};

function formaterDate(date?: string | null) {
  if (!date) return "Date non disponible";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  } catch {
    return "Date non disponible";
  }
}

function sourceQrCode(qrCode: string) {
  const valeur = qrCode.trim();

  if (valeur.startsWith("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      valeur
    )}`;
  }

  return valeur;
}

export default function GestionMfaApplication({
  espace,
}: Props) {
  const [profil, setProfil] = useState<ProfilMfa | null>(null);
  const [facteurs, setFacteurs] = useState<
    FacteurMfaArboboard[]
  >([]);
  const [niveauActuel, setNiveauActuel] = useState<
    "aal1" | "aal2" | null
  >(null);

  const [inscription, setInscription] =
    useState<InscriptionTotp | null>(null);
  const [code, setCode] = useState("");

  const [chargement, setChargement] = useState(true);
  const [action, setAction] = useState("");
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const facteursTotp = useMemo(
    () =>
      facteurs.filter(
        (facteur) =>
          obtenirTypeFacteurMfa(facteur) === "totp"
      ),
    [facteurs]
  );

  const facteursTotpVerifies = useMemo(
    () =>
      facteursTotp.filter(
        (facteur) => facteur.status === "verified"
      ),
    [facteursTotp]
  );

  const anciensFacteursTelephone = useMemo(
    () =>
      facteurs.filter(
        (facteur) =>
          obtenirTypeFacteurMfa(facteur) === "phone"
      ),
    [facteurs]
  );

  const protectionActive =
    facteursTotpVerifies.length > 0;

  const charger = useCallback(async () => {
    try {
      setChargement(true);
      setErreur("");

      const [
        utilisateurResultat,
        facteursResultat,
        niveauResultat,
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      if (
        utilisateurResultat.error ||
        !utilisateurResultat.data.user
      ) {
        throw (
          utilisateurResultat.error ||
          new Error("Compte utilisateur introuvable.")
        );
      }

      if (facteursResultat.error) {
        throw facteursResultat.error;
      }

      if (niveauResultat.error) {
        throw niveauResultat.error;
      }

      const user = utilisateurResultat.data.user;

      const { data: profilData, error: profilError } =
        await supabase
          .from("profils_utilisateurs")
          .select("id, email, role, entreprise_id")
          .eq("id", user.id)
          .maybeSingle();

      if (profilError || !profilData) {
        throw (
          profilError ||
          new Error("Profil utilisateur introuvable.")
        );
      }

      const profilCharge = profilData as ProfilMfa;

      const role = String(
        profilCharge.role || ""
      ).toLowerCase();

      const roleAutorise =
        espace === "chef"
          ? [
              "chef",
              "admin",
              "administrateur",
              "gerant",
              "gérant",
              "dirigeant",
              "patron",
            ].includes(role)
          : role === "salarie";

      if (!roleAutorise) {
        throw new Error(
          espace === "chef"
            ? "Cette page est réservée au chef d'entreprise."
            : "Cette page est réservée aux salariés."
        );
      }

      setProfil(profilCharge);
      setNiveauActuel(niveauResultat.data.currentLevel);
      setFacteurs(
        extraireFacteursMfa(facteursResultat.data)
      );
    } catch (error) {
      setErreur(messageErreurMfa(error));
    } finally {
      setChargement(false);
    }
  }, [espace]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function commencerInscription() {
    try {
      setAction("inscription");
      setErreur("");
      setMessage("");
      setCode("");

      if (facteursTotpVerifies.length > 0) {
        throw new Error(
          "Une application d'authentification est déjà active sur ce compte."
        );
      }

      const facteursNonVerifies = facteursTotp.filter(
        (facteur) => facteur.status !== "verified"
      );

      for (const facteur of facteursNonVerifies) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: facteur.id,
        });

        if (error) throw error;
      }

      const { data, error } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Application Arboboard",
        });

      if (error) throw error;

      const facteur = data as ReponseInscriptionTotp;
      const qrCode = facteur.totp?.qr_code || "";
      const secret = facteur.totp?.secret || "";

      if (!facteur.id || !qrCode || !secret) {
        throw new Error(
          "Supabase n'a pas retourné le QR code nécessaire à l'activation."
        );
      }

      setInscription({
        factorId: facteur.id,
        qrCode,
        secret,
      });

      setMessage(
        "Scannez le QR code puis saisissez le code affiché dans votre application."
      );
    } catch (error) {
      setErreur(messageErreurMfa(error));
    } finally {
      setAction("");
    }
  }

  async function verifierInscription() {
    if (!inscription) return;

    try {
      setAction("verification");
      setErreur("");
      setMessage("");

      const codeNettoye = code.replace(/\D/g, "").slice(0, 8);

      if (codeNettoye.length < 6) {
        throw new Error(
          "Saisissez le code à 6 chiffres affiché dans votre application."
        );
      }

      const { error } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: inscription.factorId,
          code: codeNettoye,
        });

      if (error) throw error;

      setInscription(null);
      setCode("");
      setMessage(
        "La double authentification gratuite par application est maintenant active."
      );

      await charger();
    } catch (error) {
      setErreur(messageErreurMfa(error));
    } finally {
      setAction("");
    }
  }

  async function copierSecret() {
    if (!inscription?.secret) return;

    try {
      await navigator.clipboard.writeText(
        inscription.secret
      );
      setMessage(
        "La clé secrète a été copiée. Collez-la dans votre application d'authentification."
      );
    } catch {
      setErreur(
        "La copie automatique est impossible. Sélectionnez la clé manuellement."
      );
    }
  }

  async function supprimerFacteur(
    facteur: FacteurMfaArboboard
  ) {
    const type = obtenirTypeFacteurMfa(facteur);

    const confirmation = window.confirm(
      type === "phone"
        ? "Supprimer cet ancien facteur téléphone ?"
        : "Désactiver la double authentification par application ?"
    );

    if (!confirmation) return;

    try {
      setAction(`suppression-${facteur.id}`);
      setErreur("");
      setMessage("");

      if (
        facteur.status === "verified" &&
        niveauActuel !== "aal2"
      ) {
        throw new Error(
          "Reconnectez-vous et validez votre code de sécurité avant de supprimer ce facteur."
        );
      }

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: facteur.id,
      });

      if (error) throw error;

      setMessage(
        type === "phone"
          ? "L'ancien facteur téléphone a été supprimé."
          : "La double authentification par application a été désactivée."
      );

      await charger();
    } catch (error) {
      setErreur(messageErreurMfa(error));
    } finally {
      setAction("");
    }
  }

  if (chargement) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="font-bold text-slate-950">
          Chargement de la sécurité du compte…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div
          className={`h-1.5 ${
            protectionActive
              ? "bg-emerald-600"
              : "bg-amber-500"
          }`}
        />

        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Sécurité du compte
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                Double authentification par application
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Utilisez gratuitement Google Authenticator,
                Microsoft Authenticator, 2FAS ou toute autre
                application compatible TOTP.
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
                protectionActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {protectionActive
                ? "Protection active"
                : "Protection inactive"}
            </span>
          </div>
        </div>
      </section>

      {erreur ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {erreur}
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-black text-slate-950">
              Application d'authentification
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Aucun SMS n'est envoyé et aucun abonnement
              supplémentaire n'est nécessaire.
            </p>
          </div>

          <div className="space-y-5 p-5">
            {!protectionActive && !inscription ? (
              <>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  <p className="font-bold text-slate-900">
                    Activation en trois étapes
                  </p>
                  <p className="mt-2">
                    1. Installez une application d'authentification.
                  </p>
                  <p>2. Scannez le QR code Arboboard.</p>
                  <p>
                    3. Confirmez avec le code à 6 chiffres.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void commencerInscription()
                  }
                  disabled={Boolean(action)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {action === "inscription"
                    ? "Préparation…"
                    : "Afficher le QR code"}
                </button>
              </>
            ) : null}

            {inscription ? (
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <img
                      src={sourceQrCode(inscription.qrCode)}
                      alt="QR code d'activation Arboboard"
                      className="mx-auto h-48 w-48"
                    />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-950">
                      Scannez ce QR code
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Dans votre application, choisissez
                      « Ajouter un compte » puis scannez le QR code.
                    </p>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Clé de saisie manuelle
                      </p>
                      <code className="mt-2 block break-all text-sm font-bold text-slate-900">
                        {inscription.secret}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copierSecret()}
                        className="mt-3 text-sm font-semibold text-emerald-700 hover:underline"
                      >
                        Copier la clé
                      </button>
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    Code à 6 chiffres
                  </span>
                  <input
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 8)
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void verifierInscription();
                      }
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    className="mt-1.5 w-full max-w-sm rounded-xl border border-slate-300 px-4 py-3 text-center text-xl font-black tracking-[0.35em] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void verifierInscription()
                    }
                    disabled={Boolean(action)}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {action === "verification"
                      ? "Vérification…"
                      : "Activer la protection"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInscription(null);
                      setCode("");
                      setMessage("");
                    }}
                    disabled={Boolean(action)}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : null}

            {protectionActive ? (
              <div className="space-y-3">
                {facteursTotpVerifies.map((facteur) => (
                  <div
                    key={facteur.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-bold text-emerald-950">
                        {facteur.friendly_name ||
                          "Application Arboboard"}
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Active depuis le{" "}
                        {formaterDate(facteur.created_at)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void supprimerFacteur(facteur)
                      }
                      disabled={Boolean(action)}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {action ===
                      `suppression-${facteur.id}`
                        ? "Suppression…"
                        : "Désactiver"}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="font-black text-blue-950">
              Appareil reconnu
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-800">
              Sur ce navigateur, le code ne sera pas redemandé
              tant que la session reste ouverte.
            </p>
            <p className="mt-2 text-xs leading-5 text-blue-700">
              Il sera demandé sur un nouvel appareil ou navigateur,
              après une déconnexion, en navigation privée ou après
              suppression des données du navigateur.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">
              État de la session
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Niveau actuel
                </dt>
                <dd className="text-right font-bold text-slate-900">
                  {niveauActuel === "aal2"
                    ? "Doublement vérifiée"
                    : "Mot de passe uniquement"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Compte</dt>
                <dd className="break-all text-right font-bold text-slate-900">
                  {profil?.email || "Non renseigné"}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>

      {anciensFacteursTelephone.length > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <h2 className="font-black text-amber-950">
            Ancien facteur téléphone détecté
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Ce facteur n'est plus utilisé par Arboboard.
            Activez d'abord l'application gratuite, puis supprimez
            l'ancien facteur téléphone.
          </p>

          <div className="mt-4 space-y-2">
            {anciensFacteursTelephone.map((facteur) => (
              <div
                key={facteur.id}
                className="flex flex-col justify-between gap-3 rounded-2xl bg-white p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    Téléphone
                  </p>
                  <p className="text-xs text-slate-500">
                    Statut : {facteur.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void supprimerFacteur(facteur)
                  }
                  disabled={Boolean(action)}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}