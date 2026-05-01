"use client";

import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type StatutFiche =
  | "brouillon"
  | "planifiee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "archivee";

type PeriodeFiltre = "aujourdhui" | "7jours" | "30jours" | "tous";

type ProfilUtilisateur = {
  id: string;
  email?: string | null;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
  nom?: string | null;
  prenom?: string | null;
};

type Salarie = {
  id: string;
  entreprise_id?: string | null;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  statut?: string | null;
};

type FicheIntervention = {
  id: string;
  entreprise_id: string;
  client_id: string | null;
  client_nom: string | null;
  salarie_id: string | null;
  salarie_nom: string | null;
  titre: string | null;
  type_intervention: string | null;
  statut: string | null;
  date_intervention: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  travaux_prevus: string | null;
  materiel_prevu: string | null;
  consignes_securite: string | null;
  notes_internes: string | null;
  commentaire_salarie: string | null;
  validation_materiel_charge: boolean | null;
  validation_arrivee: boolean | null;
  validation_fin_intervention: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type PayloadUpdateFiche = {
  statut?: StatutFiche;
  commentaire_salarie?: string | null;
  validation_materiel_charge?: boolean;
  validation_arrivee?: boolean;
  validation_fin_intervention?: boolean;
};

function dateISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function aujourdHuiISO() {
  return dateISO(new Date());
}

function ajouterJours(date: Date, jours: number) {
  const copie = new Date(date);
  copie.setDate(copie.getDate() + jours);
  return copie;
}

function formatDate(date: string | null) {
  if (!date) return "Non datée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return "Non datée";
  }
}

function formatDateCourte(date: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return "—";
  }
}

function formatHeure(heure: string | null) {
  if (!heure) return "—";
  return heure.slice(0, 5);
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  if (statut === "archivee") return "Archivée";
  return "Brouillon";
}

function badgeStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "bg-blue-50 text-blue-700 border-blue-200";
  if (statut === "en_cours") return "bg-amber-50 text-amber-700 border-amber-200";
  if (statut === "terminee")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (statut === "annulee") return "bg-red-50 text-red-700 border-red-200";
  if (statut === "archivee")
    return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function libelleType(type: string | null | undefined) {
  if (type === "entretien") return "Entretien";
  if (type === "elagage") return "Élagage";
  if (type === "abattage") return "Abattage";
  if (type === "taille") return "Taille";
  if (type === "tonte") return "Tonte";
  if (type === "debroussaillage") return "Débroussaillage";
  if (type === "creation") return "Création";
  return "Autre";
}

function titreFiche(fiche: FicheIntervention) {
  return fiche.titre || "Intervention sans titre";
}

function nomSalarie(salarie: Salarie | null | undefined) {
  if (!salarie) return "Salarié";

  const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();

  return complet || salarie.email || "Salarié";
}

function comparerFiches(a: FicheIntervention, b: FicheIntervention) {
  const dateA = a.date_intervention || "9999-12-31";
  const dateB = b.date_intervention || "9999-12-31";

  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  const heureA = a.heure_debut || "99:99";
  const heureB = b.heure_debut || "99:99";

  return heureA.localeCompare(heureB);
}

export default function PlanningSalariePage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [salarie, setSalarie] = useState<Salarie | null>(null);
  const [fiches, setFiches] = useState<FicheIntervention[]>([]);

  const [commentaires, setCommentaires] = useState<Record<string, string>>({});

  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState(false);

  const [periode, setPeriode] = useState<PeriodeFiltre>("30jours");
  const [filtreStatut, setFiltreStatut] = useState<"tous" | StatutFiche>("tous");
  const [recherche, setRecherche] = useState("");

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  useEffect(() => {
    initialiserPage();
  }, []);

  async function initialiserPage() {
    try {
      setChargement(true);
      setMessageErreur("");

      const resultat = await chargerContexteEntreprise();

      if (resultat.erreur || !resultat.contexte?.entreprise?.id) {
        setMessageErreur(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
        setChargement(false);
        return;
      }

      const profilConnecte = resultat.contexte.profil as ProfilUtilisateur;
      const idEntreprise = resultat.contexte.entreprise.id as string;

      if (profilConnecte.role !== "salarie") {
        setMessageErreur("Cette page est réservée aux salariés.");
        setChargement(false);
        return;
      }

      setProfil(profilConnecte);
      setEntrepriseId(idEntreprise);

      const salarieConnecte = await chargerSalarie(idEntreprise, profilConnecte);

      if (!salarieConnecte) {
        setMessageErreur(
          "Votre fiche salarié est introuvable. Demandez au chef d’entreprise de vérifier votre accès salarié."
        );
        setChargement(false);
        return;
      }

      setSalarie(salarieConnecte);

      await chargerFiches(idEntreprise, salarieConnecte.id);
    } catch (error) {
      console.error("Erreur initialisation planning salarié :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerSalarie(
    idEntreprise: string,
    profilConnecte: ProfilUtilisateur
  ) {
    const { data: salarieParId, error: erreurParId } = await supabase
      .from("salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("id", profilConnecte.id)
      .maybeSingle();

    if (!erreurParId && salarieParId) {
      return salarieParId as Salarie;
    }

    if (!profilConnecte.email) {
      return null;
    }

    const { data: salarieParEmail, error: erreurParEmail } = await supabase
      .from("salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .ilike("email", profilConnecte.email)
      .maybeSingle();

    if (erreurParEmail) {
      console.error("Erreur chargement salarié :", erreurParEmail);
      return null;
    }

    return (salarieParEmail || null) as Salarie | null;
  }

  async function chargerFiches(idEntreprise = entrepriseId, salarieId = salarie?.id) {
    if (!idEntreprise || !salarieId) return;

    const { data, error } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("salarie_id", salarieId)
      .order("date_intervention", { ascending: true })
      .order("heure_debut", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement fiches salarié :", error);
      setMessageErreur(
        error.message || "Impossible de charger vos fiches d’intervention."
      );
      return;
    }

    const fichesChargees = ((data || []) as FicheIntervention[]).sort(
      comparerFiches
    );

    setFiches(fichesChargees);

    const commentairesInitiaux: Record<string, string> = {};

    fichesChargees.forEach((fiche) => {
      commentairesInitiaux[fiche.id] = fiche.commentaire_salarie || "";
    });

    setCommentaires(commentairesInitiaux);
  }

  const fichesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    const maintenant = new Date();
    const aujourdHui = aujourdHuiISO();

    let dateFin: string | null = null;

    if (periode === "aujourdhui") {
      dateFin = aujourdHui;
    }

    if (periode === "7jours") {
      dateFin = dateISO(ajouterJours(maintenant, 7));
    }

    if (periode === "30jours") {
      dateFin = dateISO(ajouterJours(maintenant, 30));
    }

    return fiches
      .filter((fiche) => fiche.statut !== "archivee")
      .filter((fiche) => {
        const statut = fiche.statut || "brouillon";

        const correspondStatut =
          filtreStatut === "tous" || statut === filtreStatut;

        let correspondPeriode = true;

        if (periode !== "tous") {
          if (!fiche.date_intervention) {
            correspondPeriode = false;
          } else if (periode === "aujourdhui") {
            correspondPeriode = fiche.date_intervention === aujourdHui;
          } else if (dateFin) {
            correspondPeriode =
              fiche.date_intervention >= aujourdHui &&
              fiche.date_intervention <= dateFin;
          }
        }

        const zoneRecherche = [
          fiche.titre,
          fiche.client_nom,
          fiche.type_intervention,
          fiche.adresse,
          fiche.code_postal,
          fiche.ville,
          fiche.travaux_prevus,
          fiche.materiel_prevu,
          fiche.consignes_securite,
          fiche.notes_internes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const correspondRecherche =
          texte.length === 0 || zoneRecherche.includes(texte);

        return correspondStatut && correspondPeriode && correspondRecherche;
      })
      .sort(comparerFiches);
  }, [fiches, recherche, filtreStatut, periode]);

  const fichesGroupees = useMemo(() => {
    const groupes: Record<string, FicheIntervention[]> = {};

    fichesFiltrees.forEach((fiche) => {
      const cle = fiche.date_intervention || "non_datee";

      if (!groupes[cle]) {
        groupes[cle] = [];
      }

      groupes[cle].push(fiche);
    });

    return Object.entries(groupes).sort(([dateA], [dateB]) => {
      if (dateA === "non_datee") return 1;
      if (dateB === "non_datee") return -1;
      return dateA.localeCompare(dateB);
    });
  }, [fichesFiltrees]);

  const statistiques = useMemo(() => {
    const aujourdhui = aujourdHuiISO();

    return {
      total: fiches.filter((fiche) => fiche.statut !== "archivee").length,
      aujourdHui: fiches.filter(
        (fiche) =>
          fiche.date_intervention === aujourdhui && fiche.statut !== "archivee"
      ).length,
      planifiees: fiches.filter((fiche) => fiche.statut === "planifiee").length,
      enCours: fiches.filter((fiche) => fiche.statut === "en_cours").length,
      terminees: fiches.filter((fiche) => fiche.statut === "terminee").length,
    };
  }, [fiches]);

  async function mettreAJourFiche(
    fiche: FicheIntervention,
    payload: PayloadUpdateFiche,
    message: string
  ) {
    if (!entrepriseId || !salarie?.id) return;

    try {
      setActionEnCours(true);
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("fiches_intervention")
        .update(payload)
        .eq("id", fiche.id)
        .eq("entreprise_id", entrepriseId)
        .eq("salarie_id", salarie.id);

      if (error) throw error;

      await chargerFiches(entrepriseId, salarie.id);

      setMessageSucces(message);
    } catch (error: any) {
      console.error("Erreur mise à jour fiche salarié :", error);
      setMessageErreur(
        error?.message || "Impossible de mettre à jour cette intervention."
      );
    } finally {
      setActionEnCours(false);
    }
  }

  async function validerMateriel(fiche: FicheIntervention) {
    await mettreAJourFiche(
      fiche,
      {
        validation_materiel_charge: !fiche.validation_materiel_charge,
      },
      fiche.validation_materiel_charge
        ? "Validation matériel retirée."
        : "Matériel chargé validé."
    );
  }

  async function validerArrivee(fiche: FicheIntervention) {
    await mettreAJourFiche(
      fiche,
      {
        validation_arrivee: true,
        statut: "en_cours",
      },
      "Arrivée sur site validée. L’intervention est passée en cours."
    );
  }

  async function terminerIntervention(fiche: FicheIntervention) {
    await mettreAJourFiche(
      fiche,
      {
        validation_fin_intervention: true,
        statut: "terminee",
      },
      "Fin d’intervention validée. L’intervention est terminée."
    );
  }

  async function enregistrerCommentaire(fiche: FicheIntervention) {
    const commentaire = commentaires[fiche.id] || "";

    await mettreAJourFiche(
      fiche,
      {
        commentaire_salarie: commentaire.trim() || null,
      },
      "Commentaire terrain enregistré."
    );
  }

  function modifierCommentaire(ficheId: string, valeur: string) {
    setCommentaires((ancien) => ({
      ...ancien,
      [ficheId]: valeur,
    }));
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Arboboard</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Mon planning
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Retrouvez vos interventions affectées, les consignes terrain, le
            matériel prévu et les validations à effectuer pendant la journée.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Connecté en tant que
          </p>
          <p className="mt-1 font-semibold text-slate-950">
            {salarie ? nomSalarie(salarie) : profil?.email || "Salarié"}
          </p>
        </div>
      </section>

      {messageErreur && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {messageSucces}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Aujourd’hui
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.aujourdHui}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Planifiées
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.planifiees}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            En cours
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.enCours}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Terminées
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.terminees}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_180px_220px]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher client, ville, type d’intervention..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <select
            value={periode}
            onChange={(event) => setPeriode(event.target.value as PeriodeFiltre)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="aujourdhui">Aujourd’hui</option>
            <option value="7jours">7 prochains jours</option>
            <option value="30jours">30 prochains jours</option>
            <option value="tous">Tout afficher</option>
          </select>

          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value as "tous" | StatutFiche)
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Tous les statuts</option>
            <option value="brouillon">Brouillons</option>
            <option value="planifiee">Planifiées</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminées</option>
            <option value="annulee">Annulées</option>
          </select>
        </div>

        {chargement ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              📅
            </div>
            <p className="font-semibold text-slate-900">
              Chargement de votre planning...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération de vos fiches d’intervention.
            </p>
          </div>
        ) : fichesGroupees.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📅
            </div>
            <p className="font-semibold text-slate-900">
              Aucune intervention affectée
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Aucune fiche d’intervention ne vous est affectée sur cette période.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {fichesGroupees.map(([date, fichesDuJour]) => (
              <div key={date} className="p-4">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold capitalize text-slate-950">
                      {date === "non_datee"
                        ? "Interventions non datées"
                        : formatDate(date)}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {fichesDuJour.length} intervention
                      {fichesDuJour.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  {date !== "non_datee" && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {formatDateCourte(date)}
                    </span>
                  )}
                </div>

                <div className="grid gap-4">
                  {fichesDuJour.map((fiche) => (
                    <article
                      key={fiche.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                                fiche.statut
                              )}`}
                            >
                              {libelleStatut(fiche.statut)}
                            </span>

                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                              {libelleType(fiche.type_intervention)}
                            </span>
                          </div>

                          <h3 className="mt-3 text-lg font-bold text-slate-950">
                            {titreFiche(fiche)}
                          </h3>

                          <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                            <p>
                              <span className="font-semibold text-slate-800">
                                Client :
                              </span>{" "}
                              {fiche.client_nom || "—"}
                            </p>

                            <p>
                              <span className="font-semibold text-slate-800">
                                Horaires :
                              </span>{" "}
                              {formatHeure(fiche.heure_debut)} →{" "}
                              {formatHeure(fiche.heure_fin)}
                            </p>

                            <p className="md:col-span-2">
                              <span className="font-semibold text-slate-800">
                                Adresse :
                              </span>{" "}
                              {[fiche.adresse, fiche.code_postal, fiche.ville]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </p>
                          </div>

                          {fiche.travaux_prevus && (
                            <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-700">
                              <p className="font-semibold text-slate-900">
                                Travaux prévus
                              </p>
                              <p className="mt-1 whitespace-pre-line">
                                {fiche.travaux_prevus}
                              </p>
                            </div>
                          )}

                          {fiche.materiel_prevu && (
                            <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-700">
                              <p className="font-semibold text-slate-900">
                                Matériel prévu
                              </p>
                              <p className="mt-1 whitespace-pre-line">
                                {fiche.materiel_prevu}
                              </p>
                            </div>
                          )}

                          {fiche.consignes_securite && (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                              <p className="font-semibold">
                                Consignes sécurité
                              </p>
                              <p className="mt-1 whitespace-pre-line">
                                {fiche.consignes_securite}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 rounded-2xl bg-white p-4">
                          <p className="text-sm font-bold text-slate-950">
                            Validations terrain
                          </p>

                          <button
                            onClick={() => validerMateriel(fiche)}
                            disabled={actionEnCours}
                            className={`w-full rounded-xl px-3 py-3 text-sm font-semibold disabled:opacity-60 ${
                              fiche.validation_materiel_charge
                                ? "bg-emerald-600 text-white"
                                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {fiche.validation_materiel_charge
                              ? "✅ Matériel chargé"
                              : "Valider matériel chargé"}
                          </button>

                          <button
                            onClick={() => validerArrivee(fiche)}
                            disabled={actionEnCours}
                            className={`w-full rounded-xl px-3 py-3 text-sm font-semibold disabled:opacity-60 ${
                              fiche.validation_arrivee
                                ? "bg-emerald-600 text-white"
                                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {fiche.validation_arrivee
                              ? "✅ Arrivée validée"
                              : "Valider arrivée sur site"}
                          </button>

                          <button
                            onClick={() => terminerIntervention(fiche)}
                            disabled={actionEnCours}
                            className={`w-full rounded-xl px-3 py-3 text-sm font-semibold disabled:opacity-60 ${
                              fiche.validation_fin_intervention
                                ? "bg-emerald-600 text-white"
                                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {fiche.validation_fin_intervention
                              ? "✅ Intervention terminée"
                              : "Valider fin intervention"}
                          </button>

                          <div className="pt-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-500">
                              Commentaire terrain
                            </label>

                            <textarea
                              value={commentaires[fiche.id] || ""}
                              onChange={(event) =>
                                modifierCommentaire(fiche.id, event.target.value)
                              }
                              rows={4}
                              placeholder="Ex : intervention terminée, accès compliqué, client absent, matériel manquant..."
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                            />

                            <button
                              onClick={() => enregistrerCommentaire(fiche)}
                              disabled={actionEnCours}
                              className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                            >
                              Enregistrer commentaire
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}