"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  extraireFacteursMfa,
  masquerNumeroTelephone,
  messageErreurMfa,
  normaliserNumeroTelephone,
  obtenirTypeFacteurMfa,
  type FacteurMfaArboboard,
} from "@/lib/auth/mfaTelephone";
import {
  resoudreSalarieConnecte,
  type SalarieConnecte,
} from "@/lib/salaries/resoudreSalarieConnecte";

type Props = {
  espace: "chef" | "salarie";
};

type ProfilMfa = {
  id: string;
  email: string | null;
  role: string | null;
  entreprise_id: string | null;
  telephone_mfa?: string | null;
};

type InscriptionTelephone = {
  factorId: string;
  challengeId: string;
  telephone: string;
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

export default function GestionMfaTelephone({
  espace,
}: Props) {
  const [profil, setProfil] = useState<ProfilMfa | null>(null);
  const [salarie, setSalarie] = useState<SalarieConnecte | null>(
    null
  );
  const [facteurs, setFacteurs] = useState<FacteurMfaArboboard[]>(
    []
  );
  const [niveauActuel, setNiveauActuel] = useState<
    "aal1" | "aal2" | null
  >(null);

  const [telephone, setTelephone] = useState("");
  const [code, setCode] = useState("");
  const [inscription, setInscription] =
    useState<InscriptionTelephone | null>(null);

  const [chargement, setChargement] = useState(true);
  const [action, setAction] = useState("");
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const facteursTelephone = useMemo(
    () =>
      facteurs.filter(
        (facteur) =>
          obtenirTypeFacteurMfa(facteur) === "phone"
      ),
    [facteurs]
  );

  const facteursTelephoneVerifies = useMemo(
    () =>
      facteursTelephone.filter(
        (facteur) => facteur.status === "verified"
      ),
    [facteursTelephone]
  );

  const facteursTotp = useMemo(
    () =>
      facteurs.filter(
        (facteur) =>
          obtenirTypeFacteurMfa(facteur) === "totp"
      ),
    [facteurs]
  );

  const protectionActive =
    facteursTelephoneVerifies.length > 0;

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
          .select(
            "id, email, role, entreprise_id, telephone_mfa"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (profilError || !profilData) {
        throw (
          profilError ||
          new Error("Profil utilisateur introuvable.")
        );
      }

      const profilCharge = profilData as ProfilMfa;

      if (profilCharge.role !== espace) {
        throw new Error(
          espace === "chef"
            ? "Cette page est réservée au chef d’entreprise."
            : "Cette page est réservée aux salariés."
        );
      }

      setProfil(profilCharge);
      setNiveauActuel(niveauResultat.data.currentLevel);

      const facteursCharges = extraireFacteursMfa(
        facteursResultat.data
      );

      setFacteurs(facteursCharges);

      let salarieTrouve: SalarieConnecte | null = null;

      if (
        espace === "salarie" &&
        profilCharge.entreprise_id
      ) {
        salarieTrouve = await resoudreSalarieConnecte(
          profilCharge.entreprise_id,
          {
            profilId: profilCharge.id,
            utilisateurId: user.id,
            email: profilCharge.email || user.email,
          }
        );

        setSalarie(salarieTrouve);
      } else {
        setSalarie(null);
      }

      const telephoneInitial =
        profilCharge.telephone_mfa ||
        salarieTrouve?.telephone ||
        facteursCharges.find(
          (facteur) =>
            obtenirTypeFacteurMfa(facteur) === "phone" &&
            facteur.status === "verified"
        )?.phone ||
        "";

      setTelephone((ancien) =>
        ancien.trim() ? ancien : telephoneInitial
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

  async function enregistrerTelephone(
    numeroNormalise: string
  ) {
    if (!profil) return;

    const { error: profilError } = await supabase
      .from("profils_utilisateurs")
      .update({
        telephone_mfa: numeroNormalise,
      })
      .eq("id", profil.id);

    if (profilError) throw profilError;

    if (
      espace === "salarie" &&
      salarie?.id &&
      profil.entreprise_id
    ) {
      const { error: salarieError } = await supabase
        .from("salaries")
        .update({
          telephone: numeroNormalise,
          user_id: profil.id,
          profil_id: profil.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", salarie.id)
        .eq("entreprise_id", profil.entreprise_id);

      if (salarieError) throw salarieError;
    }
  }

  async function commencerInscription() {
    try {
      setAction("inscription");
      setErreur("");
      setMessage("");
      setCode("");

      if (facteursTelephoneVerifies.length > 0) {
        throw new Error(
          "Un numéro de téléphone est déjà actif. Supprimez-le avant d’en enregistrer un autre."
        );
      }

      const numeroNormalise =
        normaliserNumeroTelephone(telephone);

      const facteursNonVerifies =
        facteursTelephone.filter(
          (facteur) => facteur.status !== "verified"
        );

      for (const facteur of facteursNonVerifies) {
        await supabase.auth.mfa.unenroll({
          factorId: facteur.id,
        });
      }

      const { data: facteur, error: facteurError } =
        await supabase.auth.mfa.enroll({
          factorType: "phone",
          friendlyName: "Téléphone Arboboard",
          phone: numeroNormalise,
        });

      if (facteurError) throw facteurError;

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: facteur.id,
        });

      if (challengeError) throw challengeError;

      setInscription({
        factorId: facteur.id,
        challengeId: challenge.id,
        telephone: numeroNormalise,
      });

      setTelephone(numeroNormalise);
      setMessage(
        `Un code vient d’être envoyé au ${masquerNumeroTelephone(
          numeroNormalise
        )}.`
      );
    } catch (error) {
      setErreur(messageErreurMfa(error));
    } finally {
      setAction("");
    }
  }

  async function renvoyerCode() {
    if (!inscription) return;

    try {
      setAction("renvoi");
      setErreur("");
      setMessage("");

      const { data, error } =
        await supabase.auth.mfa.challenge({
          factorId: inscription.factorId,
        });

      if (error) throw error;

      setInscription((ancien) =>
        ancien
          ? {
              ...ancien,
              challengeId: data.id,
            }
          : ancien
      );

      setMessage(
        `Un nouveau code a été envoyé au ${masquerNumeroTelephone(
          inscription.telephone
        )}.`
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

      const codeNettoye = code.replace(/\D/g, "");

      if (codeNettoye.length < 6) {
        throw new Error(
          "Saisissez le code reçu par SMS."
        );
      }

      const { error } = await supabase.auth.mfa.verify({
        factorId: inscription.factorId,
        challengeId: inscription.challengeId,
        code: codeNettoye,
      });

      if (error) throw error;

      await enregistrerTelephone(
        inscription.telephone
      );

      setInscription(null);
      setCode("");
      setMessage(
        "La double authentification par téléphone est maintenant active."
      );

      await charger();
    } catch (error) {
      setErreur(messageErreurMfa(error));
    } finally {
      setAction("");
    }
  }

  async function supprimerFacteur(
    facteur: FacteurMfaArboboard
  ) {
    const type = obtenirTypeFacteurMfa(facteur);

    const confirmation = window.confirm(
      type === "phone"
        ? "Désactiver la double authentification par téléphone ?"
        : "Supprimer l’ancien facteur par application d’authentification ?"
    );

    if (!confirmation) return;

    try {
      setAction(`suppression-${facteur.id}`);
      setErreur("");
      setMessage("");

      if (niveauActuel !== "aal2") {
        throw new Error(
          "Reconnectez-vous et validez votre code de sécurité avant de supprimer ce facteur."
        );
      }

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: facteur.id,
      });

      if (error) throw error;

      if (type === "phone" && profil) {
        await supabase
          .from("profils_utilisateurs")
          .update({ telephone_mfa: null })
          .eq("id", profil.id);
      }

      setMessage(
        type === "phone"
          ? "La double authentification par téléphone a été désactivée."
          : "L’ancien facteur d’authentification a été supprimé."
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
                Double authentification par téléphone
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Après votre mot de passe, Arboboard envoie un code
                de vérification sur votre téléphone.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${
                protectionActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {protectionActive
                ? "Protection active"
                : "Protection inactive"}
            </span>
          </div>
        </div>
      </section>

      {erreur && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {erreur}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {message}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-bold text-slate-950">
              Numéro de vérification
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Utilisez le numéro personnel de la personne qui
              se connecte.
            </p>
          </div>

          <div className="space-y-5 p-5">
            {facteursTelephoneVerifies.length > 0 ? (
              <div className="space-y-3">
                {facteursTelephoneVerifies.map(
                  (facteur) => (
                    <div
                      key={facteur.id}
                      className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-bold text-emerald-950">
                          {masquerNumeroTelephone(
                            facteur.phone
                          )}
                        </p>
                        <p className="mt-1 text-xs text-emerald-700">
                          Actif depuis{" "}
                          {formaterDate(
                            facteur.updated_at ||
                              facteur.created_at
                          )}
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
                  )
                )}
              </div>
            ) : (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Numéro de téléphone
                  </span>

                  <input
                    type="tel"
                    value={telephone}
                    onChange={(event) =>
                      setTelephone(event.target.value)
                    }
                    placeholder="+33612345678"
                    autoComplete="tel"
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />

                  <span className="mt-1.5 block text-xs text-slate-500">
                    Un numéro français comme 06 12 34 56 78
                    sera automatiquement converti au format
                    international.
                  </span>
                </label>

                {!inscription ? (
                  <button
                    type="button"
                    onClick={() =>
                      void commencerInscription()
                    }
                    disabled={Boolean(action)}
                    className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {action === "inscription"
                      ? "Envoi du code…"
                      : "Envoyer le code d’activation"}
                  </button>
                ) : (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <label className="block">
                      <span className="text-sm font-bold text-blue-950">
                        Code reçu par SMS
                      </span>

                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
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
                        placeholder="123456"
                        className="mt-2 w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-center text-xl font-black tracking-[0.35em] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </label>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() =>
                          void verifierInscription()
                        }
                        disabled={Boolean(action)}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {action === "verification"
                          ? "Vérification…"
                          : "Activer la protection"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void renvoyerCode()
                        }
                        disabled={Boolean(action)}
                        className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {action === "renvoi"
                          ? "Envoi…"
                          : "Renvoyer le code"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInscription(null);
                          setCode("");
                          setErreur("");
                          setMessage("");
                        }}
                        disabled={Boolean(action)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">
              État de la session
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Niveau actuel
                </dt>
                <dd className="font-bold text-slate-950">
                  {niveauActuel === "aal2"
                    ? "Doublement vérifiée"
                    : "Mot de passe uniquement"}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Compte
                </dt>
                <dd className="max-w-48 truncate font-semibold text-slate-950">
                  {profil?.email || "—"}
                </dd>
              </div>
            </dl>
          </div>

          {facteursTotp.length > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-bold text-amber-950">
                Ancienne application d’authentification
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                Un ancien facteur par application est encore
                présent. Activez d’abord le téléphone, puis
                supprimez l’ancien facteur.
              </p>

              <div className="mt-4 space-y-2">
                {facteursTotp.map((facteur) => (
                  <button
                    key={facteur.id}
                    type="button"
                    onClick={() =>
                      void supprimerFacteur(facteur)
                    }
                    disabled={Boolean(action)}
                    className="w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Supprimer l’ancien facteur
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="font-bold text-blue-950">
              Configuration nécessaire
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-800">
              Le fournisseur SMS doit être activé dans
              Supabase avant que les codes puissent être
              envoyés.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}