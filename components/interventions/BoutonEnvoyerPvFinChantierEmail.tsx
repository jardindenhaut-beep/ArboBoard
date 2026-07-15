"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type EmailPvHistorique = {
  id: string;
  destinataire_email: string;
  sujet: string | null;
  message: string | null;
  statut: string;
  resend_email_id: string | null;
  erreur: string | null;
  created_at: string;
};

type Props = {
  ficheId: string;
  pvId?: string | null;

  /**
   * Nom utilisé actuellement dans BlocPvFinChantier.
   */
  emailClient?: string | null;

  /**
   * Ancien nom conservé pour les autres pages.
   */
  clientEmail?: string | null;

  clientNom?: string | null;
  disabled?: boolean;

  onEnvoiReussi?: (informations: {
    email: string;
    message: string;
  }) => void;
};

function formatDateHeure(
  date: string | null | undefined
) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(date));
  } catch {
    return date;
  }
}

function normaliserEmail(
  valeur: string | null | undefined
) {
  return String(valeur || "")
    .trim()
    .toLowerCase();
}

function emailValide(
  valeur: string | null | undefined
) {
  const email =
    normaliserEmail(valeur);

  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  );
}

function construireMessageParDefaut(
  clientNom?: string | null
) {
  const nom =
    String(clientNom || "").trim();

  return `Bonjour${nom ? ` ${nom}` : ""},

Veuillez trouver en pièce jointe le procès-verbal de fin de chantier correspondant à votre intervention.

Nous vous remercions pour votre confiance.

Cordialement.`;
}

function libelleStatutEmail(
  statut: string
) {
  const valeur = String(
    statut || ""
  ).toLowerCase();

  if (
    valeur === "envoye" ||
    valeur === "sent"
  ) {
    return "Envoyé";
  }

  if (
    valeur === "en_cours" ||
    valeur === "pending" ||
    valeur === "programme"
  ) {
    return "En cours";
  }

  if (
    valeur === "erreur" ||
    valeur === "echec" ||
    valeur === "failed"
  ) {
    return "Erreur";
  }

  return statut || "Inconnu";
}

function classeStatutEmail(
  statut: string
) {
  const valeur = String(
    statut || ""
  ).toLowerCase();

  if (
    valeur === "envoye" ||
    valeur === "sent"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    valeur === "en_cours" ||
    valeur === "pending" ||
    valeur === "programme"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function estEnvoiReussi(
  statut: string
) {
  const valeur = String(
    statut || ""
  ).toLowerCase();

  return (
    valeur === "envoye" ||
    valeur === "sent"
  );
}

export default function BoutonEnvoyerPvFinChantierEmail({
  ficheId,
  pvId = null,
  emailClient = null,
  clientEmail = null,
  clientNom = null,
  disabled = false,
  onEnvoiReussi,
}: Props) {
  const emailInitial =
    normaliserEmail(
      emailClient ||
        clientEmail ||
        ""
    );

  const [
    emailDestinataire,
    setEmailDestinataire,
  ] = useState(emailInitial);

  const [
    message,
    setMessage,
  ] = useState(
    construireMessageParDefaut(
      clientNom
    )
  );

  const [
    historique,
    setHistorique,
  ] = useState<
    EmailPvHistorique[]
  >([]);

  const [envoi, setEnvoi] =
    useState(false);

  const [
    chargementHistorique,
    setChargementHistorique,
  ] = useState(false);

  const [
    erreurHistorique,
    setErreurHistorique,
  ] = useState("");

  const [erreur, setErreur] =
    useState("");

  const [succes, setSucces] =
    useState("");

  const [ouvert, setOuvert] =
    useState(false);

  useEffect(() => {
    const nouvelEmail =
      normaliserEmail(
        emailClient ||
          clientEmail ||
          ""
      );

    setEmailDestinataire(
      (valeurActuelle) => {
        if (
          ouvert &&
          valeurActuelle.trim()
        ) {
          return valeurActuelle;
        }

        return nouvelEmail;
      }
    );
  }, [
    emailClient,
    clientEmail,
    ouvert,
  ]);

  useEffect(() => {
    if (!ouvert) {
      setMessage(
        construireMessageParDefaut(
          clientNom
        )
      );
    }
  }, [clientNom, ouvert]);

  useEffect(() => {
    void chargerHistorique();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ficheId, pvId]);

  const emailNormalise =
    useMemo(
      () =>
        normaliserEmail(
          emailDestinataire
        ),
      [emailDestinataire]
    );

  const emailEstValide =
    useMemo(
      () =>
        emailValide(
          emailNormalise
        ),
      [emailNormalise]
    );

  const messageNettoye =
    useMemo(
      () => message.trim(),
      [message]
    );

  const dernierEnvoiReussi =
    useMemo(
      () =>
        historique.find(
          (item) =>
            estEnvoiReussi(
              item.statut
            )
        ) || null,
      [historique]
    );

  const nombreEnvoisReussis =
    useMemo(
      () =>
        historique.filter(
          (item) =>
            estEnvoiReussi(
              item.statut
            )
        ).length,
      [historique]
    );

  const dejaEnvoyeMemeAdresse =
    useMemo(
      () =>
        historique.some(
          (item) =>
            estEnvoiReussi(
              item.statut
            ) &&
            normaliserEmail(
              item
                .destinataire_email
            ) ===
              emailNormalise
        ),
      [
        historique,
        emailNormalise,
      ]
    );

  const envoiPossible =
    Boolean(ficheId) &&
    !disabled &&
    !envoi &&
    emailEstValide &&
    messageNettoye.length > 0;

  async function chargerHistorique() {
    if (!ficheId) {
      setHistorique([]);
      return;
    }

    try {
      setChargementHistorique(
        true
      );
      setErreurHistorique("");

      let requete = supabase
        .from(
          "pv_fin_chantier_emails"
        )
        .select(
          `
            id,
            destinataire_email,
            sujet,
            message,
            statut,
            resend_email_id,
            erreur,
            created_at
          `
        )
        .eq("fiche_id", ficheId);

      if (pvId) {
        requete = requete.eq(
          "pv_id",
          pvId
        );
      }

      const {
        data,
        error,
      } = await requete
        .order("created_at", {
          ascending: false,
        })
        .limit(10);

      if (error) {
        setHistorique([]);
        setErreurHistorique(
          error.message ||
            "Impossible de charger l’historique des envois."
        );
        return;
      }

      setHistorique(
        (data ||
          []) as EmailPvHistorique[]
      );
    } catch (error) {
      console.error(
        "Erreur chargement historique emails PV :",
        error
      );

      setHistorique([]);
      setErreurHistorique(
        error instanceof Error
          ? error.message
          : "Impossible de charger l’historique des envois."
      );
    } finally {
      setChargementHistorique(
        false
      );
    }
  }

  async function envoyerEmail() {
    if (
      !ficheId ||
      disabled ||
      envoi
    ) {
      return;
    }

    setErreur("");
    setSucces("");

    if (!pvId) {
      setErreur(
        "Enregistrez le PV avant de l’envoyer au client."
      );
      return;
    }

    if (!emailEstValide) {
      setErreur(
        "Renseignez une adresse email valide."
      );
      return;
    }

    if (!messageNettoye) {
      setErreur(
        "Le message de l’email ne peut pas être vide."
      );
      return;
    }

    if (
      dejaEnvoyeMemeAdresse
    ) {
      const confirmer =
        window.confirm(
          `Le PV a déjà été envoyé à ${emailNormalise}. Voulez-vous vraiment le renvoyer ?`
        );

      if (!confirmer) {
        return;
      }
    }

    try {
      setEnvoi(true);

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
          ?.access_token
      ) {
        setErreur(
          "Session utilisateur introuvable. Veuillez vous reconnecter."
        );
        return;
      }

      let response: Response;

      try {
        response = await fetch(
          "/api/interventions/pv-fin-chantier/envoyer-email",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              ficheId,
              pvId,
              destinataireEmail:
                emailNormalise,
              message:
                messageNettoye,
            }),
          }
        );
      } catch {
        setErreur(
          "Le serveur est momentanément inaccessible. Vérifiez votre connexion puis réessayez."
        );
        return;
      }

      const resultat =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        const messageErreur =
          resultat?.erreur ||
          resultat?.error ||
          resultat?.message ||
          "Impossible d’envoyer le PV au client.";

        setErreur(
          String(messageErreur)
        );

        await chargerHistorique();
        return;
      }

      setEmailDestinataire(
        emailNormalise
      );

      const messageSucces =
        resultat?.message ||
        `PV envoyé avec succès à ${emailNormalise}.`;

      setSucces(messageSucces);
      setOuvert(false);

      onEnvoiReussi?.({
        email: emailNormalise,
        message: messageSucces,
      });

      await chargerHistorique();
    } catch (error) {
      console.error(
        "Erreur technique envoi PV email :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’envoyer le PV au client."
      );

      await chargerHistorique();
    } finally {
      setEnvoi(false);
    }
  }

  function ouvrirPreparation() {
    setErreur("");
    setSucces("");

    setMessage(
      construireMessageParDefaut(
        clientNom
      )
    );

    setOuvert(true);
  }

  function fermerPreparation() {
    if (envoi) return;

    setErreur("");
    setOuvert(false);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl">
              ✉️
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-950">
                  Envoyer le PV au client
                </h3>

                {dernierEnvoiReussi ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    Déjà envoyé
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                    Non envoyé
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Le PDF du procès-verbal sera joint automatiquement à l’email.
              </p>

              {dernierEnvoiReussi ? (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  Dernier envoi le{" "}
                  {formatDateHeure(
                    dernierEnvoiReussi
                      .created_at
                  )}{" "}
                  à{" "}
                  {
                    dernierEnvoiReussi
                      .destinataire_email
                  }
                  .
                </p>
              ) : emailNormalise &&
                emailEstValide ? (
                <p className="mt-2 break-all text-xs font-medium text-emerald-700">
                  Destinataire détecté :{" "}
                  {emailNormalise}
                </p>
              ) : (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Une adresse email valide est nécessaire pour l’envoi.
                </p>
              )}
            </div>
          </div>

          {!ouvert ? (
            <button
              type="button"
              onClick={
                ouvrirPreparation
              }
              disabled={
                disabled ||
                envoi ||
                !pvId
              }
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {dernierEnvoiReussi
                ? "Renvoyer le PV"
                : "Préparer l’envoi"}
            </button>
          ) : (
            <button
              type="button"
              onClick={
                fermerPreparation
              }
              disabled={envoi}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {ouvert ? (
          <div className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email destinataire *
              </span>

              <input
                type="email"
                value={
                  emailDestinataire
                }
                onChange={(event) => {
                  setEmailDestinataire(
                    event.target.value
                  );
                  setErreur("");
                  setSucces("");
                }}
                placeholder="client@email.fr"
                autoComplete="email"
                aria-invalid={
                  emailDestinataire.trim() !==
                    "" &&
                  !emailEstValide
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 ${
                  emailDestinataire.trim() !==
                    "" &&
                  !emailEstValide
                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
                }`}
              />

              {emailDestinataire.trim() ===
              "" ? (
                <span className="mt-1 block text-xs font-medium text-amber-700">
                  Renseignez l’adresse du client.
                </span>
              ) : !emailEstValide ? (
                <span className="mt-1 block text-xs font-medium text-red-600">
                  Cette adresse email n’est pas valide.
                </span>
              ) : dejaEnvoyeMemeAdresse ? (
                <span className="mt-1 block text-xs font-medium text-blue-700">
                  Le PV a déjà été envoyé à cette adresse. Une confirmation sera demandée.
                </span>
              ) : (
                <span className="mt-1 block text-xs font-medium text-emerald-700">
                  Adresse email valide.
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Message email *
              </span>

              <textarea
                value={message}
                onChange={(event) => {
                  setMessage(
                    event.target.value
                  );
                  setErreur("");
                  setSucces("");
                }}
                rows={7}
                maxLength={5000}
                placeholder={construireMessageParDefaut(
                  clientNom
                )}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />

              <span className="mt-1 block text-right text-xs text-slate-400">
                {message.length} / 5 000 caractères
              </span>
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={
                  fermerPreparation
                }
                disabled={envoi}
                className="min-h-12 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() =>
                  void envoyerEmail()
                }
                disabled={
                  !envoiPossible
                }
                className="min-h-12 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {envoi
                  ? "Envoi en cours…"
                  : dejaEnvoyeMemeAdresse
                    ? "Renvoyer le PV"
                    : "Envoyer le PV"}
              </button>
            </div>
          </div>
        ) : null}

        {erreur ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            {succes}
          </div>
        ) : null}

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Historique des envois
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {nombreEnvoisReussis} envoi(s) réussi(s) parmi les 10 derniers essais.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void chargerHistorique()
              }
              disabled={
                chargementHistorique
              }
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {chargementHistorique
                ? "Actualisation…"
                : "↻ Actualiser"}
            </button>
          </div>

          {erreurHistorique ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {erreurHistorique}
            </div>
          ) : chargementHistorique ? (
            <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
              Chargement de l’historique…
            </div>
          ) : historique.length ===
            0 ? (
            <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
              Aucun envoi enregistré pour le moment.
            </div>
          ) : (
            <div className="space-y-2">
              {historique.map(
                (email) => (
                  <article
                    key={email.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-semibold text-slate-950">
                          {
                            email.destinataire_email
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateHeure(
                            email.created_at
                          )}
                        </p>

                        {email.sujet ? (
                          <p className="mt-2 text-xs leading-5 text-slate-600">
                            <span className="font-semibold">
                              Sujet :
                            </span>{" "}
                            {email.sujet}
                          </p>
                        ) : null}
                      </div>

                      <span
                        className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${classeStatutEmail(
                          email.statut
                        )}`}
                      >
                        {libelleStatutEmail(
                          email.statut
                        )}
                      </span>
                    </div>

                    {email.erreur ? (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                        {email.erreur}
                      </div>
                    ) : null}
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}