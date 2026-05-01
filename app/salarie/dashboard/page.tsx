"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type ProfilUtilisateur = {
  id: string;
  email?: string | null;
  nom?: string | null;
  prenom?: string | null;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
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
  commentaire_salarie: string | null;
  validation_materiel_charge: boolean | null;
  validation_arrivee: boolean | null;
  validation_fin_intervention: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type Demande = {
  id: string;
  entreprise_id: string;
  demandeur_user_id: string | null;
  demandeur_nom: string | null;
  demandeur_email: string | null;
  type_demande: string | null;
  titre: string | null;
  message: string | null;
  statut: string | null;
  date_debut: string | null;
  date_fin: string | null;
  reponse_chef: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function aujourdHuiISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return "—";
  }
}

function formatDateCourte(date: string | null | undefined) {
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

function formatHeure(heure: string | null | undefined) {
  if (!heure) return "—";
  return heure.slice(0, 5);
}

function nomSalarie(salarie: Salarie | null, profil: ProfilUtilisateur | null) {
  if (salarie) {
    const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();
    return complet || salarie.email || "Salarié";
  }

  if (profil) {
    const complet = `${profil.prenom || ""} ${profil.nom || ""}`.trim();
    return complet || profil.email || "Salarié";
  }

  return "Salarié";
}

function libelleStatutFiche(statut: string | null | undefined) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  if (statut === "archivee") return "Archivée";
  return "Brouillon";
}

function libelleTypeIntervention(type: string | null | undefined) {
  if (type === "entretien") return "Entretien";
  if (type === "elagage") return "Élagage";
  if (type === "abattage") return "Abattage";
  if (type === "taille") return "Taille";
  if (type === "tonte") return "Tonte";
  if (type === "debroussaillage") return "Débroussaillage";
  if (type === "creation") return "Création";
  return "Autre";
}

function libelleTypeDemande(type: string | null | undefined) {
  if (type === "conge") return "Congé";
  if (type === "materiel") return "Matériel";
  if (type === "absence") return "Absence";
  if (type === "probleme") return "Problème";
  return "Autre";
}

function libelleStatutDemande(statut: string | null | undefined) {
  if (statut === "acceptee") return "Acceptée";
  if (statut === "refusee") return "Refusée";
  if (statut === "traitee") return "Traitée";
  if (statut === "annulee") return "Annulée";
  return "En attente";
}

function badgeStatut(statut: string | null | undefined) {
  if (
    statut === "terminee" ||
    statut === "acceptee" ||
    statut === "traitee"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (statut === "planifiee") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (statut === "en_cours" || statut === "en_attente") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (statut === "annulee" || statut === "refusee") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function titreFiche(fiche: FicheIntervention) {
  return fiche.titre || "Intervention sans titre";
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

export default function DashboardSalariePage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [salarie, setSalarie] = useState<Salarie | null>(null);
  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);

  const [chargement, setChargement] = useState(true);
  const [messageErreur, setMessageErreur] = useState("");

  useEffect(() => {
    initialiserDashboard();
  }, []);

  async function initialiserDashboard() {
    try {
      setChargement(true);
      setMessageErreur("");

      const resultat = await chargerContexteEntreprise();

      if (resultat.erreur || !resultat.contexte?.entreprise?.id) {
        setMessageErreur(
          "Impossible de charger votre espace salarié. Veuillez vous reconnecter."
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
      setSalarie(salarieConnecte);

      if (salarieConnecte) {
        await chargerFiches(idEntreprise, salarieConnecte.id);
      } else {
        setMessageErreur(
          "Votre fiche salarié est introuvable. Demandez au chef d’entreprise de vérifier votre accès salarié."
        );
      }

      await chargerDemandes(idEntreprise, profilConnecte.id);
    } catch (error) {
      console.error("Erreur dashboard salarié :", error);
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
      console.error("Erreur chargement salarié dashboard :", erreurParEmail);
      return null;
    }

    return (salarieParEmail || null) as Salarie | null;
  }

  async function chargerFiches(idEntreprise: string, salarieId: string) {
    const { data, error } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("salarie_id", salarieId)
      .order("date_intervention", { ascending: true })
      .order("heure_debut", { ascending: true });

    if (error) {
      console.error("Erreur chargement fiches dashboard salarié :", error);
      setFiches([]);
      return;
    }

    setFiches(((data || []) as FicheIntervention[]).sort(comparerFiches));
  }

  async function chargerDemandes(idEntreprise: string, userId: string) {
    const { data, error } = await supabase
      .from("demandes")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("demandeur_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement demandes dashboard salarié :", error);
      setDemandes([]);
      return;
    }

    setDemandes((data || []) as Demande[]);
  }

  const statistiques = useMemo(() => {
    const aujourdhui = aujourdHuiISO();

    const fichesActives = fiches.filter(
      (fiche) => fiche.statut !== "archivee" && fiche.statut !== "annulee"
    );

    const interventionsAujourdhui = fichesActives.filter(
      (fiche) => fiche.date_intervention === aujourdhui
    );

    const interventionsAVenir = fichesActives.filter(
      (fiche) =>
        fiche.date_intervention &&
        fiche.date_intervention >= aujourdhui &&
        fiche.statut !== "terminee"
    );

    const interventionsEnCours = fichesActives.filter(
      (fiche) => fiche.statut === "en_cours"
    );

    const interventionsTerminees = fichesActives.filter(
      (fiche) => fiche.statut === "terminee"
    );

    const validationsRestantes = fichesActives.reduce((total, fiche) => {
      let compteur = 0;

      if (!fiche.validation_materiel_charge) compteur += 1;
      if (!fiche.validation_arrivee) compteur += 1;
      if (!fiche.validation_fin_intervention) compteur += 1;

      return total + compteur;
    }, 0);

    const demandesEnAttente = demandes.filter(
      (demande) => demande.statut === "en_attente"
    );

    return {
      interventionsAujourdhui: interventionsAujourdhui.length,
      interventionsAVenir: interventionsAVenir.length,
      interventionsEnCours: interventionsEnCours.length,
      interventionsTerminees: interventionsTerminees.length,
      validationsRestantes,
      demandesEnAttente: demandesEnAttente.length,
    };
  }, [fiches, demandes]);

  const interventionsDuJour = useMemo(() => {
    const aujourdhui = aujourdHuiISO();

    return fiches
      .filter(
        (fiche) =>
          fiche.date_intervention === aujourdhui &&
          fiche.statut !== "archivee" &&
          fiche.statut !== "annulee"
      )
      .sort(comparerFiches);
  }, [fiches]);

  const prochainesInterventions = useMemo(() => {
    const aujourdhui = aujourdHuiISO();

    return fiches
      .filter(
        (fiche) =>
          fiche.date_intervention &&
          fiche.date_intervention >= aujourdhui &&
          fiche.statut !== "archivee" &&
          fiche.statut !== "annulee" &&
          fiche.statut !== "terminee"
      )
      .sort(comparerFiches)
      .slice(0, 5);
  }, [fiches]);

  const demandesRecentes = useMemo(() => {
    return demandes.slice(0, 5);
  }, [demandes]);

  const fichesAvecValidationsRestantes = useMemo(() => {
    return fiches
      .filter(
        (fiche) =>
          fiche.statut !== "archivee" &&
          fiche.statut !== "annulee" &&
          (!fiche.validation_materiel_charge ||
            !fiche.validation_arrivee ||
            !fiche.validation_fin_intervention)
      )
      .sort(comparerFiches)
      .slice(0, 5);
  }, [fiches]);

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-3xl">
            🌿
          </div>
          <p className="text-lg font-bold text-slate-950">
            Chargement de votre espace...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Récupération de votre planning salarié.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Arboboard</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Bonjour {nomSalarie(salarie, profil)}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Retrouvez vos interventions, les validations terrain à effectuer et
              vos demandes envoyées au chef d’entreprise.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/salarie/planning"
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Voir mon planning
            </Link>

            <Link
              href="/salarie/demandes"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Nouvelle demande
            </Link>
          </div>
        </div>
      </section>

      {messageErreur && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messageErreur}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Aujourd’hui
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.interventionsAujourdhui}
          </p>
          <p className="mt-2 text-sm text-slate-500">intervention(s)</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            À venir
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.interventionsAVenir}
          </p>
          <p className="mt-2 text-sm text-slate-500">intervention(s)</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            En cours
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.interventionsEnCours}
          </p>
          <p className="mt-2 text-sm text-slate-500">chantier(s)</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Terminées
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.interventionsTerminees}
          </p>
          <p className="mt-2 text-sm text-slate-500">fiche(s)</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Validations
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.validationsRestantes}
          </p>
          <p className="mt-2 text-sm text-slate-500">restante(s)</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Demandes
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.demandesEnAttente}
          </p>
          <p className="mt-2 text-sm text-slate-500">en attente</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-slate-950">
                Mes interventions du jour
              </h2>
              <p className="text-sm text-slate-500">
                Ce qui est prévu aujourd’hui.
              </p>
            </div>

            <Link
              href="/salarie/planning"
              className="text-sm font-semibold text-emerald-700"
            >
              Voir tout
            </Link>
          </div>

          {interventionsDuJour.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Aucune intervention prévue aujourd’hui.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {interventionsDuJour.map((fiche) => (
                <div key={fiche.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {titreFiche(fiche)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {fiche.client_nom || "Client non renseigné"} —{" "}
                        {fiche.ville || "ville non renseignée"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatHeure(fiche.heure_debut)} →{" "}
                        {formatHeure(fiche.heure_fin)} ·{" "}
                        {libelleTypeIntervention(fiche.type_intervention)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                        fiche.statut
                      )}`}
                    >
                      {libelleStatutFiche(fiche.statut)}
                    </span>
                  </div>

                  {fiche.adresse && (
                    <p className="mt-3 text-sm text-slate-600">
                      {[fiche.adresse, fiche.code_postal, fiche.ville]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-slate-950">
                Validations restantes
              </h2>
              <p className="text-sm text-slate-500">
                Points terrain à cocher dans le planning.
              </p>
            </div>

            <Link
              href="/salarie/planning"
              className="text-sm font-semibold text-emerald-700"
            >
              Valider
            </Link>
          </div>

          {fichesAvecValidationsRestantes.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Toutes les validations sont à jour.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {fichesAvecValidationsRestantes.map((fiche) => (
                <div key={fiche.id} className="p-5">
                  <p className="font-semibold text-slate-950">
                    {titreFiche(fiche)}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateCourte(fiche.date_intervention)} ·{" "}
                    {fiche.client_nom || "Client non renseigné"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-3 py-1 font-medium ${
                        fiche.validation_materiel_charge
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      Matériel
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 font-medium ${
                        fiche.validation_arrivee
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      Arrivée
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 font-medium ${
                        fiche.validation_fin_intervention
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      Fin
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-slate-950">
                Prochaines interventions
              </h2>
              <p className="text-sm text-slate-500">
                Les 5 prochaines fiches affectées.
              </p>
            </div>

            <Link
              href="/salarie/planning"
              className="text-sm font-semibold text-emerald-700"
            >
              Voir planning
            </Link>
          </div>

          {prochainesInterventions.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Aucune prochaine intervention affectée.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {prochainesInterventions.map((fiche) => (
                <div key={fiche.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {titreFiche(fiche)}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(fiche.date_intervention)} ·{" "}
                        {formatHeure(fiche.heure_debut)} →{" "}
                        {formatHeure(fiche.heure_fin)}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {fiche.client_nom || "Client non renseigné"} —{" "}
                        {fiche.ville || "ville non renseignée"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                        fiche.statut
                      )}`}
                    >
                      {libelleStatutFiche(fiche.statut)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-slate-950">Mes demandes</h2>
              <p className="text-sm text-slate-500">
                Dernières demandes envoyées au chef.
              </p>
            </div>

            <Link
              href="/salarie/demandes"
              className="text-sm font-semibold text-emerald-700"
            >
              Voir demandes
            </Link>
          </div>

          {demandesRecentes.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Aucune demande envoyée.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {demandesRecentes.map((demande) => (
                <div key={demande.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {demande.titre || "Demande sans titre"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {libelleTypeDemande(demande.type_demande)}
                      </p>

                      {demande.reponse_chef && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          Réponse : {demande.reponse_chef}
                        </p>
                      )}
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                        demande.statut
                      )}`}
                    >
                      {libelleStatutDemande(demande.statut)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/salarie/planning"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <p className="text-2xl">📅</p>
          <p className="mt-3 font-bold text-slate-950">Mon planning</p>
          <p className="mt-1 text-sm text-slate-500">
            Voir mes interventions, mes consignes et valider le terrain.
          </p>
        </Link>

        <Link
          href="/salarie/demandes"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <p className="text-2xl">📩</p>
          <p className="mt-3 font-bold text-slate-950">Mes demandes</p>
          <p className="mt-1 text-sm text-slate-500">
            Envoyer une demande de congé, matériel, absence ou problème.
          </p>
        </Link>
      </section>
    </div>
  );
}