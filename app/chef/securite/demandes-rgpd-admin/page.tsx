"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const TYPES_DEMANDE = [
  "acces",
  "rectification",
  "effacement",
  "limitation",
  "opposition",
  "portabilite",
] as const;

const STATUTS_DEMANDE = [
  "recue",
  "verification_identite",
  "en_cours",
  "terminee",
  "refusee",
  "annulee",
] as const;

type TypeDemande =
  (typeof TYPES_DEMANDE)[number];

type StatutDemande =
  (typeof STATUTS_DEMANDE)[number];

type DemandeAdmin = {
  id: string;
  entreprise_id: string;
  utilisateur_id: string;
  type_demande: TypeDemande;
  statut: StatutDemande;
  commentaire_utilisateur?: string | null;
  reponse_interne?: string | null;
  source: string;
  recue_at: string;
  echeance_reponse: string;
  prolongee_jusqu_au?: string | null;
  motif_prolongation?: string | null;
  prise_en_charge_at?: string | null;
  terminee_at?: string | null;
  annulee_at?: string | null;
  created_at: string;
  updated_at: string;
  utilisateur: {
    id: string;
    email?: string | null;
    nom?: string | null;
    prenom?: string | null;
  };
  entreprise: {
    id: string;
    nom_entreprise?: string | null;
  };
};

type ReponseApi = {
  demandes?: DemandeAdmin[];
  succes?: boolean;
  demande?: DemandeAdmin;
  erreur?: string;
};

type FormulaireTraitement = {
  statut: StatutDemande;
  reponse_interne: string;
  prolonger: boolean;
  motif_prolongation: string;
};

function libelleType(type: TypeDemande) {
  const libelles: Record<TypeDemande, string> = {
    acces: "Accès",
    rectification: "Rectification",
    effacement: "Effacement",
    limitation: "Limitation",
    opposition: "Opposition",
    portabilite: "Portabilité",
  };

  return libelles[type];
}

function libelleStatut(statut: StatutDemande) {
  const libelles: Record<StatutDemande, string> = {
    recue: "Reçue",
    verification_identite: "Vérification d’identité",
    en_cours: "En cours",
    terminee: "Terminée",
    refusee: "Refusée",
    annulee: "Annulée",
  };

  return libelles[statut];
}

function classesStatut(statut: StatutDemande) {
  if (statut === "terminee") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (statut === "refusee") {
    return "bg-red-50 text-red-700";
  }

  if (statut === "annulee") {
    return "bg-slate-100 text-slate-600";
  }

  if (statut === "en_cours") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function nomUtilisateur(demande: DemandeAdmin) {
  const nom =
    `${demande.utilisateur.prenom || ""} ${
      demande.utilisateur.nom || ""
    }`.trim();

  return (
    nom ||
    demande.utilisateur.email ||
    "Utilisateur inconnu"
  );
}

function creerFormulaire(
  demande: DemandeAdmin
): FormulaireTraitement {
  return {
    statut: demande.statut,
    reponse_interne:
      demande.reponse_interne || "",
    prolonger: false,
    motif_prolongation:
      demande.motif_prolongation || "",
  };
}

export default function AdministrationDemandesRgpdPage() {
  const [demandes, setDemandes] = useState<
    DemandeAdmin[]
  >([]);
  const [formulaires, setFormulaires] = useState<
    Record<string, FormulaireTraitement>
  >({});
  const [filtreStatut, setFiltreStatut] =
    useState("tous");
  const [filtreType, setFiltreType] =
    useState("tous");
  const [chargement, setChargement] = useState(true);
  const [enregistrementId, setEnregistrementId] =
    useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const statistiques = useMemo(() => {
    return {
      total: demandes.length,
      ouvertes: demandes.filter((demande) =>
        [
          "recue",
          "verification_identite",
          "en_cours",
        ].includes(demande.statut)
      ).length,
      terminees: demandes.filter(
        (demande) => demande.statut === "terminee"
      ).length,
      enRetard: demandes.filter((demande) => {
        if (
          ["terminee", "refusee", "annulee"].includes(
            demande.statut
          )
        ) {
          return false;
        }

        const echeance =
          demande.prolongee_jusqu_au ||
          demande.echeance_reponse;

        return new Date(echeance).getTime() < Date.now();
      }).length,
    };
  }, [demandes]);

  useEffect(() => {
    void chargerDemandes();
  }, [filtreStatut, filtreType]);

  async function obtenirJeton() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error(
        "Votre session a expiré. Veuillez vous reconnecter."
      );
    }

    return session.access_token;
  }

  async function chargerDemandes() {
    try {
      setChargement(true);
      setErreur("");

      const jeton = await obtenirJeton();
      const parametres = new URLSearchParams({
        statut: filtreStatut,
        type_demande: filtreType,
      });

      const reponse = await fetch(
        `/api/securite/admin/demandes-rgpd?${parametres.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json()) as ReponseApi;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible de charger les demandes."
        );
      }

      const nouvellesDemandes =
        donnees.demandes || [];

      setDemandes(nouvellesDemandes);
      setFormulaires(
        Object.fromEntries(
          nouvellesDemandes.map((demande) => [
            demande.id,
            creerFormulaire(demande),
          ])
        )
      );
    } catch (error) {
      console.error(
        "Erreur chargement administration RGPD :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger les demandes."
      );
    } finally {
      setChargement(false);
    }
  }

  function modifierFormulaire(
    demandeId: string,
    modification: Partial<FormulaireTraitement>
  ) {
    setFormulaires((anciens) => ({
      ...anciens,
      [demandeId]: {
        ...anciens[demandeId],
        ...modification,
      },
    }));
  }

  async function enregistrerTraitement(
    demande: DemandeAdmin
  ) {
    const formulaire = formulaires[demande.id];

    if (!formulaire) return;

    if (
      formulaire.prolonger &&
      !formulaire.motif_prolongation.trim()
    ) {
      setErreur(
        "Renseignez le motif de la prolongation."
      );
      return;
    }

    try {
      setEnregistrementId(demande.id);
      setErreur("");
      setMessage("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/admin/demandes-rgpd",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            demande_id: demande.id,
            statut: formulaire.statut,
            reponse_interne:
              formulaire.reponse_interne,
            prolonger: formulaire.prolonger,
            motif_prolongation:
              formulaire.motif_prolongation,
          }),
        }
      );

      const donnees =
        (await reponse.json()) as ReponseApi;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible de mettre à jour la demande."
        );
      }

      setMessage(
        "La demande a été mise à jour."
      );
      await chargerDemandes();
    } catch (error) {
      console.error(
        "Erreur traitement demande RGPD :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour la demande."
      );
    } finally {
      setEnregistrementId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl border border-violet-200 bg-violet-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold text-violet-700">
              Administration Arboboard
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-violet-950">
              Demandes RGPD
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-800">
              Consultez les demandes reçues, prenez-les en charge,
              communiquez une réponse et clôturez leur traitement.
              Cette page est réservée au compte développeur.
            </p>
          </div>

          <Link
            href="/chef/securite"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
          >
            ← Sécurité
          </Link>
        </div>
      </header>

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Statistique
          label="Demandes affichées"
          valeur={statistiques.total}
        />
        <Statistique
          label="Demandes ouvertes"
          valeur={statistiques.ouvertes}
        />
        <Statistique
          label="Terminées"
          valeur={statistiques.terminees}
        />
        <Statistique
          label="Échéances dépassées"
          valeur={statistiques.enRetard}
          alerte={statistiques.enRetard > 0}
        />
      </section>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <label>
          <span className="text-sm font-medium text-slate-700">
            Statut
          </span>
          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value)
            }
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          >
            <option value="tous">
              Tous les statuts
            </option>
            {STATUTS_DEMANDE.map((statut) => (
              <option key={statut} value={statut}>
                {libelleStatut(statut)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">
            Type de demande
          </span>
          <select
            value={filtreType}
            onChange={(event) =>
              setFiltreType(event.target.value)
            }
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          >
            <option value="tous">
              Tous les types
            </option>
            {TYPES_DEMANDE.map((type) => (
              <option key={type} value={type}>
                {libelleType(type)}
              </option>
            ))}
          </select>
        </label>
      </section>

      {chargement ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Chargement des demandes…
        </div>
      ) : demandes.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="text-4xl">📭</div>
          <p className="mt-3 font-bold text-slate-950">
            Aucune demande pour ces filtres
          </p>
        </div>
      ) : (
        <section className="space-y-5">
          {demandes.map((demande) => {
            const formulaire =
              formulaires[demande.id] ||
              creerFormulaire(demande);

            const echeanceEffective =
              demande.prolongee_jusqu_au ||
              demande.echeance_reponse;

            const enRetard =
              ![
                "terminee",
                "refusee",
                "annulee",
              ].includes(demande.statut) &&
              new Date(echeanceEffective).getTime() <
                Date.now();

            return (
              <article
                key={demande.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-950">
                        {libelleType(
                          demande.type_demande
                        )}
                      </h2>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${classesStatut(
                          demande.statut
                        )}`}
                      >
                        {libelleStatut(
                          demande.statut
                        )}
                      </span>

                      {enRetard ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                          Échéance dépassée
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {nomUtilisateur(demande)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {demande.utilisateur.email ||
                        "Email non disponible"}{" "}
                      ·{" "}
                      {demande.entreprise
                        .nom_entreprise ||
                        "Entreprise inconnue"}
                    </p>
                  </div>

                  <div className="text-xs leading-5 text-slate-500 lg:text-right">
                    <p>
                      Reçue :{" "}
                      <strong className="text-slate-700">
                        {formatDate(demande.recue_at)}
                      </strong>
                    </p>
                    <p>
                      Échéance :{" "}
                      <strong
                        className={
                          enRetard
                            ? "text-red-700"
                            : "text-slate-700"
                        }
                      >
                        {formatDate(echeanceEffective)}
                      </strong>
                    </p>
                  </div>
                </div>

                {demande.commentaire_utilisateur ? (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Demande de l’utilisateur
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {
                        demande.commentaire_utilisateur
                      }
                    </p>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                  <label>
                    <span className="text-sm font-medium text-slate-700">
                      Nouveau statut
                    </span>
                    <select
                      value={formulaire.statut}
                      onChange={(event) =>
                        modifierFormulaire(
                          demande.id,
                          {
                            statut:
                              event.target
                                .value as StatutDemande,
                          }
                        )
                      }
                      disabled={
                        demande.statut === "annulee"
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
                    >
                      {STATUTS_DEMANDE.map(
                        (statut) => (
                          <option
                            key={statut}
                            value={statut}
                          >
                            {libelleStatut(statut)}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="text-sm font-medium text-slate-700">
                      Réponse visible par l’utilisateur
                    </span>
                    <textarea
                      value={
                        formulaire.reponse_interne
                      }
                      onChange={(event) =>
                        modifierFormulaire(
                          demande.id,
                          {
                            reponse_interne:
                              event.target.value.slice(
                                0,
                                10000
                              ),
                          }
                        )
                      }
                      rows={5}
                      disabled={
                        demande.statut === "annulee"
                      }
                      placeholder="Réponse, demande de précision, décision ou informations transmises…"
                      className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
                    />
                  </label>
                </div>

                {!demande.prolongee_jusqu_au &&
                ![
                  "terminee",
                  "refusee",
                  "annulee",
                ].includes(demande.statut) ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={
                          formulaire.prolonger
                        }
                        onChange={(event) =>
                          modifierFormulaire(
                            demande.id,
                            {
                              prolonger:
                                event.target.checked,
                            }
                          )
                        }
                        className="mt-1 h-4 w-4 rounded border-amber-300"
                      />
                      <span>
                        <span className="block text-sm font-bold text-amber-950">
                          Enregistrer une prolongation
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-amber-800">
                          L’échéance sera prolongée de deux
                          mois et le motif sera visible dans
                          le suivi utilisateur.
                        </span>
                      </span>
                    </label>

                    {formulaire.prolonger ? (
                      <textarea
                        value={
                          formulaire.motif_prolongation
                        }
                        onChange={(event) =>
                          modifierFormulaire(
                            demande.id,
                            {
                              motif_prolongation:
                                event.target.value.slice(
                                  0,
                                  2000
                                ),
                            }
                          )
                        }
                        rows={3}
                        placeholder="Motif précis de la prolongation…"
                        className="mt-4 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
                      />
                    ) : null}
                  </div>
                ) : null}

                {demande.motif_prolongation ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    <strong>
                      Prolongation déjà enregistrée :
                    </strong>{" "}
                    {demande.motif_prolongation}
                  </div>
                ) : null}

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      void enregistrerTraitement(
                        demande
                      )
                    }
                    disabled={
                      enregistrementId === demande.id ||
                      demande.statut === "annulee"
                    }
                    className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {enregistrementId === demande.id
                      ? "Enregistrement…"
                      : demande.statut === "annulee"
                        ? "Demande annulée"
                        : "Enregistrer le traitement"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

function Statistique({
  label,
  valeur,
  alerte = false,
}: {
  label: string;
  valeur: number;
  alerte?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold ${
          alerte
            ? "text-red-700"
            : "text-slate-950"
        }`}
      >
        {valeur}
      </p>
    </div>
  );
}