"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type FiltreStatut = "tous" | StatutDemande;
type FiltreType = "tous" | TypeDemande;

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

function normaliserTexte(valeur: unknown) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function estStatutFerme(statut: StatutDemande) {
  return [
    "terminee",
    "refusee",
    "annulee",
  ].includes(statut);
}

function echeanceEffective(demande: DemandeAdmin) {
  return (
    demande.prolongee_jusqu_au ||
    demande.echeance_reponse
  );
}

function joursAvantEcheance(demande: DemandeAdmin) {
  const echeance = new Date(
    echeanceEffective(demande)
  ).getTime();

  if (!Number.isFinite(echeance)) return null;

  return Math.ceil(
    (echeance - Date.now()) /
      (1000 * 60 * 60 * 24)
  );
}

function formulaireIdentique(
  demande: DemandeAdmin,
  formulaire: FormulaireTraitement
) {
  return (
    formulaire.statut === demande.statut &&
    formulaire.reponse_interne.trim() ===
      (demande.reponse_interne || "").trim() &&
    !formulaire.prolonger &&
    formulaire.motif_prolongation.trim() ===
      (demande.motif_prolongation || "").trim()
  );
}

export default function AdministrationDemandesRgpdPage() {
  const [demandes, setDemandes] = useState<
    DemandeAdmin[]
  >([]);
  const [formulaires, setFormulaires] = useState<
    Record<string, FormulaireTraitement>
  >({});
  const [filtreStatut, setFiltreStatut] =
    useState<FiltreStatut>("tous");
  const [filtreType, setFiltreType] =
    useState<FiltreType>("tous");
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [enregistrementId, setEnregistrementId] =
    useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const premierChargement = useRef(true);

  const demandesAffichees = useMemo(() => {
    const rechercheNormalisee =
      normaliserTexte(recherche);

    return [...demandes]
      .filter((demande) => {
        if (!rechercheNormalisee) return true;

        const contenu = normaliserTexte(
          [
            nomUtilisateur(demande),
            demande.utilisateur.email,
            demande.entreprise.nom_entreprise,
            demande.commentaire_utilisateur,
            demande.reponse_interne,
            libelleType(demande.type_demande),
            libelleStatut(demande.statut),
          ]
            .filter(Boolean)
            .join(" ")
        );

        return contenu.includes(
          rechercheNormalisee
        );
      })
      .sort((a, b) => {
        const aFermee = estStatutFerme(a.statut);
        const bFermee = estStatutFerme(b.statut);

        if (aFermee !== bFermee) {
          return aFermee ? 1 : -1;
        }

        return (
          new Date(echeanceEffective(a)).getTime() -
          new Date(echeanceEffective(b)).getTime()
        );
      });
  }, [demandes, recherche]);

  const statistiques = useMemo(() => {
    const ouvertes = demandes.filter(
      (demande) => !estStatutFerme(demande.statut)
    );

    return {
      total: demandes.length,
      ouvertes: ouvertes.length,
      terminees: demandes.filter(
        (demande) => demande.statut === "terminee"
      ).length,
      enRetard: ouvertes.filter((demande) => {
        const jours = joursAvantEcheance(demande);
        return jours !== null && jours < 0;
      }).length,
      urgentes: ouvertes.filter((demande) => {
        const jours = joursAvantEcheance(demande);
        return (
          jours !== null &&
          jours >= 0 &&
          jours <= 7
        );
      }).length,
    };
  }, [demandes]);

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

  const chargerDemandes = useCallback(
    async (chargementInitial = false) => {
      try {
        if (chargementInitial) {
          setChargement(true);
        } else {
          setActualisation(true);
        }

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
        setActualisation(false);
      }
    },
    [filtreStatut, filtreType]
  );

  useEffect(() => {
    const initial = premierChargement.current;
    premierChargement.current = false;

    void chargerDemandes(initial);
  }, [chargerDemandes]);

  async function actualiserDemandes() {
    setMessage("");
    await chargerDemandes(false);
    setMessage(
      "La liste des demandes RGPD a été actualisée."
    );
  }

  function modifierFormulaire(
    demandeId: string,
    modification: Partial<FormulaireTraitement>
  ) {
    setErreur("");
    setMessage("");

    setFormulaires((anciens) => ({
      ...anciens,
      [demandeId]: {
        ...anciens[demandeId],
        ...modification,
      },
    }));
  }

  function reinitialiserTraitement(
    demande: DemandeAdmin
  ) {
    setFormulaires((anciens) => ({
      ...anciens,
      [demande.id]: creerFormulaire(demande),
    }));

    setErreur("");
    setMessage(
      "Les modifications de cette demande ont été annulées."
    );
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

    if (
      ["terminee", "refusee"].includes(
        formulaire.statut
      ) &&
      !formulaire.reponse_interne.trim()
    ) {
      setErreur(
        "Une réponse visible par l’utilisateur est requise pour terminer ou refuser une demande."
      );
      return;
    }

    if (formulaireIdentique(demande, formulaire)) {
      setErreur(
        "Aucune modification n’a été apportée à cette demande."
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
              formulaire.reponse_interne.trim(),
            prolonger: formulaire.prolonger,
            motif_prolongation:
              formulaire.motif_prolongation.trim(),
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
      await chargerDemandes(false);
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
      <header className="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
        <div className="h-1.5 bg-violet-600" />

        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-2xl text-white shadow-sm">
                🇪🇺
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                  Administration Arboboard
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Demandes RGPD
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Consultez les demandes reçues, prenez-les en charge,
                  communiquez une réponse et clôturez leur traitement.
                  Cette page est réservée au compte développeur.
                </p>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <button
                type="button"
                onClick={() => void actualiserDemandes()}
                disabled={
                  actualisation ||
                  enregistrementId !== null
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span aria-hidden="true">↻</span>
                {actualisation
                  ? "Actualisation…"
                  : "Actualiser"}
              </button>

              <Link
                href="/chef/securite"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                ← Sécurité
              </Link>
            </div>
          </div>
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Statistique
          label="Demandes affichées"
          valeur={statistiques.total}
          description="Résultats renvoyés par l’API"
        />

        <Statistique
          label="Demandes ouvertes"
          valeur={statistiques.ouvertes}
          description="Traitements à poursuivre"
        />

        <Statistique
          label="Terminées"
          valeur={statistiques.terminees}
          description="Demandes clôturées"
          positif={statistiques.terminees > 0}
        />

        <Statistique
          label="À échéance sous 7 jours"
          valeur={statistiques.urgentes}
          description="Demandes à prioriser"
          attention={statistiques.urgentes > 0}
        />

        <Statistique
          label="Échéances dépassées"
          valeur={statistiques.enRetard}
          description="Demandes en retard"
          alerte={statistiques.enRetard > 0}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <label>
          <span className="text-sm font-medium text-slate-700">
            Statut
          </span>
          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(
                event.target.value as FiltreStatut
              )
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
              setFiltreType(
                event.target.value as FiltreType
              )
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

          <label>
            <span className="text-sm font-medium text-slate-700">
              Recherche
            </span>

            <input
              type="search"
              value={recherche}
              onChange={(event) =>
                setRecherche(event.target.value)
              }
              placeholder="Utilisateur, email, entreprise, commentaire…"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {demandesAffichees.length} demande(s) affichée(s)
            sur {demandes.length}.
          </p>

          <button
            type="button"
            onClick={() => {
              setFiltreStatut("tous");
              setFiltreType("tous");
              setRecherche("");
              setMessage("");
              setErreur("");
            }}
            disabled={
              filtreStatut === "tous" &&
              filtreType === "tous" &&
              !recherche.trim()
            }
            className="w-fit text-sm font-semibold text-violet-700 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </section>

      {chargement ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-xl">
            ⏳
          </div>

          <p className="text-sm font-semibold text-slate-700">
            Chargement des demandes…
          </p>
        </div>
      ) : demandesAffichees.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="text-4xl">📭</div>
          <p className="mt-3 font-bold text-slate-950">
            Aucune demande pour ces critères
          </p>
        </div>
      ) : (
        <section className="space-y-5">
          {demandesAffichees.map((demande) => {
            const formulaire =
              formulaires[demande.id] ||
              creerFormulaire(demande);

            const dateEcheance =
              echeanceEffective(demande);
            const joursRestants =
              joursAvantEcheance(demande);
            const fermee =
              estStatutFerme(demande.statut);
            const enRetard =
              !fermee &&
              joursRestants !== null &&
              joursRestants < 0;
            const urgente =
              !fermee &&
              joursRestants !== null &&
              joursRestants >= 0 &&
              joursRestants <= 7;
            const formulaireModifie =
              !formulaireIdentique(
                demande,
                formulaire
              );

            return (
              <article
                key={demande.id}
                className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
                  enRetard
                    ? "border-red-200 bg-red-50/20"
                    : urgente
                      ? "border-amber-200 bg-amber-50/20"
                      : "border-slate-200 bg-white"
                }`}
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

                      {urgente ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                          Échéance sous {joursRestants} jour
                          {joursRestants === 1 ? "" : "s"}
                        </span>
                      ) : null}

                      {demande.prolongee_jusqu_au ? (
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                          Prolongée
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
                            : urgente
                              ? "text-amber-700"
                              : "text-slate-700"
                        }
                      >
                        {formatDate(dateEcheance)}
                      </strong>
                    </p>

                    {demande.prise_en_charge_at ? (
                      <p>
                        Prise en charge :{" "}
                        <strong className="text-slate-700">
                          {formatDate(
                            demande.prise_en_charge_at
                          )}
                        </strong>
                      </p>
                    ) : null}

                    {demande.terminee_at ? (
                      <p>
                        Clôturée :{" "}
                        <strong className="text-emerald-700">
                          {formatDate(
                            demande.terminee_at
                          )}
                        </strong>
                      </p>
                    ) : null}
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

                    <span className="mt-1 block text-right text-[11px] text-slate-400">
                      {formulaire.reponse_interne.length}
                      /10000 caractères
                    </span>
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
                      <>
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

                        <p className="mt-1 text-right text-[11px] text-amber-700">
                          {formulaire.motif_prolongation.length}
                          /2000 caractères
                        </p>
                      </>
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

                <div className="mt-6 flex flex-col gap-3">
                  {formulaireModifie ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                      Des modifications ne sont pas encore enregistrées.
                    </div>
                  ) : null}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        reinitialiserTraitement(demande)
                      }
                      disabled={
                        enregistrementId === demande.id ||
                        !formulaireModifie
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Annuler les modifications
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void enregistrerTraitement(
                          demande
                        )
                      }
                      disabled={
                        enregistrementId === demande.id ||
                        demande.statut === "annulee" ||
                        !formulaireModifie
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {enregistrementId === demande.id
                        ? "Enregistrement…"
                        : demande.statut === "annulee"
                          ? "Demande annulée"
                          : "Enregistrer le traitement"}
                    </button>
                  </div>
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
  description,
  alerte = false,
  attention = false,
  positif = false,
}: {
  label: string;
  valeur: number;
  description: string;
  alerte?: boolean;
  attention?: boolean;
  positif?: boolean;
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
            : attention
              ? "text-amber-700"
              : positif
                ? "text-emerald-700"
                : "text-slate-950"
        }`}
      >
        {valeur}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}