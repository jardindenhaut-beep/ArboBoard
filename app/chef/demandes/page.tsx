"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type DecisionChef = "acceptee" | "refusee";

type Demande = {
  id: string;
  entreprise_id: string;
  demandeur_user_id: string | null;
  salarie_id: string | null;
  demandeur_nom: string | null;
  demandeur_email: string | null;
  type_demande: string | null;
  titre: string | null;
  message: string | null;
  statut: string | null;
  date_debut: string | null;
  date_fin: string | null;
  reponse_chef: string | null;
  repondu_par: string | null;
  repondu_at: string | null;
  decision_chef: DecisionChef | null;
  decision_chef_at: string | null;
  planning_evenement_id: string | null;
  archivee: boolean | null;
  archivee_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type VueDemandes = "actives" | "archives";

function messageErreurInconnue(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
  } catch {
    return date;
  }
}

function formatDateHeure(date: string | null | undefined) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function libelleType(type: string | null | undefined) {
  switch (type) {
    case "conge":
      return "Congé";
    case "materiel":
      return "Matériel";
    case "absence":
      return "Absence";
    case "formation":
      return "Formation";
    case "rendez_vous":
    case "rendez-vous":
      return "Rendez-vous";
    case "indisponibilite":
      return "Indisponibilité";
    case "probleme":
      return "Problème";
    default:
      return "Autre demande";
  }
}

function iconeType(type: string | null | undefined) {
  switch (type) {
    case "conge":
      return "🏖️";
    case "materiel":
      return "🧰";
    case "absence":
      return "🚫";
    case "formation":
      return "🎓";
    case "rendez_vous":
    case "rendez-vous":
      return "🤝";
    case "indisponibilite":
      return "⛔";
    case "probleme":
      return "⚠️";
    default:
      return "📩";
  }
}

function estPlanifiable(type: string | null | undefined) {
  return [
    "conge",
    "absence",
    "formation",
    "rendez_vous",
    "rendez-vous",
    "indisponibilite",
  ].includes(type || "");
}

function libelleDecision(demande: Demande) {
  if (demande.decision_chef === "acceptee") return "Acceptée";
  if (demande.decision_chef === "refusee") return "Refusée";
  if (demande.statut === "traitee") return "Traitée — décision à classer";
  return "En attente";
}

function classeDecision(demande: Demande) {
  if (demande.decision_chef === "acceptee") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (demande.decision_chef === "refusee") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (demande.statut === "traitee") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function demandeVerrouillee(demande: Demande) {
  return Boolean(demande.decision_chef || demande.archivee);
}

export default function DemandesChefPage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [utilisateurId, setUtilisateurId] = useState("");
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [reponses, setReponses] = useState<Record<string, string>>({});

  const [vue, setVue] = useState<VueDemandes>("actives");
  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("tous");

  const [chargement, setChargement] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const chargerDemandes = useCallback(async (idEntreprise: string) => {
    const { data, error } = await supabase
      .from("demandes")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const liste = (data || []) as Demande[];
    setDemandes(liste);

    setReponses((anciennes) => {
      const suivantes = { ...anciennes };
      for (const demande of liste) {
        if (suivantes[demande.id] === undefined) {
          suivantes[demande.id] = demande.reponse_chef || "";
        }
      }
      return suivantes;
    });
  }, []);

  const initialiser = useCallback(async () => {
    try {
      setChargement(true);
      setMessageErreur("");

      const resultat = await chargerContexteEntreprise();

      if (
        resultat.erreur ||
        !resultat.contexte?.entreprise?.id ||
        !resultat.contexte?.profil?.id
      ) {
        throw new Error(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
      }

      const idEntreprise = resultat.contexte.entreprise.id;
      const idUtilisateur = resultat.contexte.profil.id;

      setEntrepriseId(idEntreprise);
      setUtilisateurId(idUtilisateur);

      await chargerDemandes(idEntreprise);
    } catch (error: unknown) {
      console.error("Erreur initialisation demandes chef :", error);
      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible de charger les demandes des salariés."
        )
      );
    } finally {
      setChargement(false);
    }
  }, [chargerDemandes]);

  useEffect(() => {
    void initialiser();
  }, [initialiser]);

  useEffect(() => {
    if (!entrepriseId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const recharger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void chargerDemandes(entrepriseId).catch((error) => {
          console.error("Erreur actualisation demandes :", error);
        });
      }, 250);
    };

    const canal = supabase
      .channel(`demandes-chef-${entrepriseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demandes",
          filter: `entreprise_id=eq.${entrepriseId}`,
        },
        recharger
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(canal);
    };
  }, [entrepriseId, chargerDemandes]);

  const typesDisponibles = useMemo(() => {
    return Array.from(
      new Set(demandes.map((demande) => demande.type_demande).filter(Boolean))
    ).sort() as string[];
  }, [demandes]);

  const statistiques = useMemo(() => {
    return {
      actives: demandes.filter((d) => !demandeVerrouillee(d)).length,
      archives: demandes.filter((d) => demandeVerrouillee(d)).length,
      acceptees: demandes.filter((d) => d.decision_chef === "acceptee").length,
      refusees: demandes.filter((d) => d.decision_chef === "refusee").length,
    };
  }, [demandes]);

  const demandesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();

    return demandes.filter((demande) => {
      const archive = demandeVerrouillee(demande);

      if (vue === "actives" && archive) return false;
      if (vue === "archives" && !archive) return false;

      if (filtreType !== "tous" && demande.type_demande !== filtreType) {
        return false;
      }

      if (!texte) return true;

      const contenu = [
        demande.demandeur_nom,
        demande.demandeur_email,
        demande.titre,
        demande.message,
        demande.reponse_chef,
        libelleType(demande.type_demande),
        libelleDecision(demande),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenu.includes(texte);
    });
  }, [demandes, vue, filtreType, recherche]);

  async function prendreDecision(
    demande: Demande,
    decision: DecisionChef
  ) {
    if (!entrepriseId || !utilisateurId || actionId) return;

    if (demandeVerrouillee(demande)) {
      setMessageErreur(
        "Cette demande a déjà reçu une décision définitive et ne peut plus être modifiée."
      );
      return;
    }

    const action = decision === "acceptee" ? "accepter" : "refuser";
    const confirmation = window.confirm(
      decision === "acceptee"
        ? "Accepter définitivement cette demande ? Elle sera ensuite archivée automatiquement."
        : "Refuser définitivement cette demande ? Elle sera ensuite archivée automatiquement."
    );

    if (!confirmation) return;

    try {
      setActionId(demande.id);
      setMessageErreur("");
      setMessageSucces("");

      const maintenant = new Date().toISOString();
      const reponse = (reponses[demande.id] || "").trim();

      const { data, error } = await supabase
        .from("demandes")
        .update({
          decision_chef: decision,
          statut: decision,
          reponse_chef: reponse || null,
          repondu_par: utilisateurId,
          repondu_at: maintenant,
          archivee: true,
          archivee_at: maintenant,
          updated_at: maintenant,
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", demande.id)
        .is("decision_chef", null)
        .eq("archivee", false)
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "La demande a déjà été traitée ou son état a changé. Actualisez la page."
        );
      }

      await chargerDemandes(entrepriseId);

      const textePlanning =
        decision === "acceptee" &&
        estPlanifiable(demande.type_demande) &&
        demande.date_debut
          ? " L’événement correspondant a été transmis automatiquement au planning."
          : "";

      setMessageSucces(
        `Demande ${decision === "acceptee" ? "acceptée" : "refusée"} et archivée définitivement.${textePlanning}`
      );
    } catch (error: unknown) {
      console.error(`Erreur pour ${action} la demande :`, error);
      setMessageErreur(
        messageErreurInconnue(
          error,
          `Impossible d’${action} cette demande.`
        )
      );
    } finally {
      setActionId(null);
    }
  }

  if (chargement) {
    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Chargement des demandes…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <div className="mx-auto max-w-7xl space-y-5 p-3 sm:p-5 lg:p-6">
        <header className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-5 text-white shadow-lg sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                Équipe
              </p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                Demandes salariés
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100">
                Acceptez ou refusez une demande une seule fois. Toute décision
                est définitive et la demande est automatiquement archivée.
                Les demandes qui touchent le planning sont synchronisées dès
                leur acceptation.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void initialiser()}
              className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20"
            >
              ↻ Actualiser
            </button>
          </div>
        </header>

        {messageErreur ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {messageErreur}
          </div>
        ) : null}

        {messageSucces ? (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
          >
            {messageSucces}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["À traiter", statistiques.actives, "text-amber-700", "bg-amber-50 border-amber-200"],
            ["Archives", statistiques.archives, "text-slate-700", "bg-white border-slate-200"],
            ["Acceptées", statistiques.acceptees, "text-emerald-700", "bg-emerald-50 border-emerald-200"],
            ["Refusées", statistiques.refusees, "text-red-700", "bg-red-50 border-red-200"],
          ].map(([label, valeur, texte, fond]) => (
            <div
              key={String(label)}
              className={`rounded-2xl border p-4 shadow-sm ${fond}`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className={`mt-1 text-3xl font-black ${texte}`}>{valeur}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setVue("actives")}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  vue === "actives"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                À traiter · {statistiques.actives}
              </button>
              <button
                type="button"
                onClick={() => setVue("archives")}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  vue === "archives"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Archives · {statistiques.archives}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[560px]">
              <input
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Rechercher un salarié, une demande…"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />

              <select
                value={filtreType}
                onChange={(event) => setFiltreType(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="tous">Tous les types</option>
                {typesDisponibles.map((type) => (
                  <option key={type} value={type}>
                    {libelleType(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {demandesFiltrees.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="text-3xl">{vue === "archives" ? "🗄️" : "📭"}</div>
            <h2 className="mt-3 font-black text-slate-900">
              {vue === "archives"
                ? "Aucune demande archivée"
                : "Aucune demande à traiter"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {vue === "archives"
                ? "Les demandes acceptées ou refusées apparaîtront ici."
                : "Les nouvelles demandes des salariés apparaîtront ici."}
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            {demandesFiltrees.map((demande) => {
              const verrouillee = demandeVerrouillee(demande);
              const enAction = actionId === demande.id;
              const periode =
                demande.date_debut || demande.date_fin
                  ? `${formatDate(demande.date_debut)}${
                      demande.date_fin &&
                      demande.date_fin !== demande.date_debut
                        ? ` → ${formatDate(demande.date_fin)}`
                        : ""
                    }`
                  : "Aucune date renseignée";

              return (
                <article
                  key={demande.id}
                  className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                    verrouillee
                      ? demande.decision_chef === "acceptee"
                        ? "border-emerald-200"
                        : "border-red-200"
                      : "border-slate-200"
                  }`}
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xl" aria-hidden="true">
                            {iconeType(demande.type_demande)}
                          </span>
                          <h2 className="text-lg font-black text-slate-950">
                            {demande.titre ||
                              libelleType(demande.type_demande)}
                          </h2>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${classeDecision(
                              demande
                            )}`}
                          >
                            {libelleDecision(demande)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-bold text-slate-800">
                          {demande.demandeur_nom || "Salarié"}
                        </p>
                        {demande.demandeur_email ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {demande.demandeur_email}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-xs leading-5 text-slate-500 lg:text-right">
                        <p>
                          Reçue :{" "}
                          <strong className="text-slate-700">
                            {formatDateHeure(demande.created_at)}
                          </strong>
                        </p>
                        <p>
                          Période :{" "}
                          <strong className="text-slate-700">{periode}</strong>
                        </p>
                      </div>
                    </div>

                    {demande.message ? (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Message du salarié
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {demande.message}
                        </p>
                      </div>
                    ) : null}

                    {!verrouillee ? (
                      <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                        <label className="text-sm font-black text-slate-800">
                          Réponse au salarié
                        </label>
                        <textarea
                          rows={3}
                          value={reponses[demande.id] || ""}
                          onChange={(event) =>
                            setReponses((ancien) => ({
                              ...ancien,
                              [demande.id]: event.target.value,
                            }))
                          }
                          placeholder="Message facultatif qui accompagnera votre décision…"
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        />

                        {demande.statut === "traitee" &&
                        !demande.decision_chef ? (
                          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-800">
                            Cette ancienne demande était marquée « traitée » sans
                            préciser si elle avait été acceptée ou refusée.
                            Classez-la une dernière fois avec l’un des deux
                            boutons ci-dessous.
                          </div>
                        ) : null}

                        {estPlanifiable(demande.type_demande) &&
                        demande.date_debut ? (
                          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-800">
                            Si vous acceptez cette demande, elle sera ajoutée
                            automatiquement au planning et affectée au salarié.
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() =>
                              void prendreDecision(demande, "acceptee")
                            }
                            disabled={Boolean(actionId)}
                            className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {enAction ? "Enregistrement…" : "✓ Accepter définitivement"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void prendreDecision(demande, "refusee")
                            }
                            disabled={Boolean(actionId)}
                            className="min-h-11 flex-1 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {enAction ? "Enregistrement…" : "✕ Refuser définitivement"}
                          </button>
                        </div>

                        <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">
                          Après validation ou refus, aucune modification ne sera
                          possible.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Décision définitive
                            </p>
                            <p
                              className={`mt-1 text-base font-black ${
                                demande.decision_chef === "acceptee"
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {demande.decision_chef === "acceptee"
                                ? "Demande acceptée"
                                : "Demande refusée"}
                            </p>
                          </div>

                          <div className="text-xs text-slate-500 sm:text-right">
                            <p>{formatDateHeure(demande.decision_chef_at || demande.repondu_at)}</p>
                            {demande.planning_evenement_id ? (
                              <p className="mt-1 font-bold text-emerald-700">
                                📅 Ajoutée au planning
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {demande.reponse_chef ? (
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <p className="text-xs font-bold text-slate-500">
                              Réponse du chef
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
                              {demande.reponse_chef}
                            </p>
                          </div>
                        ) : null}

                        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                          🔒 Demande archivée et verrouillée. Elle ne peut plus
                          être modifiée.
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}