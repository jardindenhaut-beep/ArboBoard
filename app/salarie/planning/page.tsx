"use client";

import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import BlocPhotosChantier from "@/components/interventions/BlocPhotosChantier";
import BlocPvFinChantier from "@/components/interventions/BlocPvFinChantier";

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

  numero: string | null;
  devis_id: string | null;
  facture_id: string | null;

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

  date_prevue: string | null;
  heure_debut_prevue: string | null;
  heure_fin_prevue: string | null;

  heure_debut_reelle: string | null;
  heure_fin_reelle: string | null;

  adresse: string | null;
  code_postal: string | null;
  ville: string | null;

  adresse_chantier: string | null;
  code_postal_chantier: string | null;
  ville_chantier: string | null;
  notes_chantier: string | null;

  travaux_prevus: string | null;
  materiel_prevu: string | null;
  consignes_securite: string | null;
  notes_internes: string | null;

  commentaire_salarie: string | null;

  validation_materiel_charge: boolean | null;
  validation_arrivee: boolean | null;
  validation_fin_intervention: boolean | null;

  etape_materiel_statut: string | null;
  etape_arrivee_statut: string | null;
  etape_fin_statut: string | null;

  materiel_valide_at: string | null;
  arrivee_validee_at: string | null;
  fin_validee_at: string | null;

  commentaire_preparation: string | null;
  commentaire_arrivee: string | null;
  commentaire_fin: string | null;

  probleme_signale: boolean | null;
  description_probleme: string | null;

  created_at: string | null;
  updated_at: string | null;
};

type FicheSalarie = {
  id: string;
  entreprise_id: string;
  fiche_id: string;
  salarie_id: string | null;
  salarie_nom: string | null;
  role_chantier: string | null;
  heure_arrivee_prevue: string | null;
  heure_depart_prevue: string | null;
  heure_arrivee_reelle: string | null;
  heure_depart_reelle: string | null;
  arrivee_validee_at: string | null;
  depart_valide_at: string | null;
  commentaire_salarie: string | null;
};

type FicheElement = {
  id: string;
  entreprise_id: string;
  fiche_id: string;
  article_id: string | null;
  nom: string;
  categorie: string;
  icone: string | null;
  couleur: string | null;
  quantite_prevue: number | null;
  quantite_reelle: number | null;
  unite: string | null;
  obligatoire: boolean | null;
  coche_prepare: boolean | null;
  commentaire_chef: string | null;
  commentaire_salarie: string | null;
  ordre: number | null;
};

type PayloadUpdateFiche = {
  statut?: StatutFiche;
  commentaire_salarie?: string | null;
  validation_materiel_charge?: boolean;
  validation_arrivee?: boolean;
  validation_fin_intervention?: boolean;
  etape_materiel_statut?: string;
  etape_arrivee_statut?: string;
  etape_fin_statut?: string;
  materiel_valide_at?: string;
  arrivee_validee_at?: string;
  fin_validee_at?: string;
  heure_debut_reelle?: string;
  heure_fin_reelle?: string;
  commentaire_preparation?: string | null;
  commentaire_arrivee?: string | null;
  commentaire_fin?: string | null;
  probleme_signale?: boolean;
  description_probleme?: string | null;
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

function maintenantTime() {
  return new Date().toTimeString().slice(0, 5);
}

function datePlanning(fiche: FicheIntervention) {
  return fiche.date_prevue || fiche.date_intervention || null;
}

function heureDebutPlanning(fiche: FicheIntervention) {
  return fiche.heure_debut_prevue || fiche.heure_debut || null;
}

function heureFinPlanning(fiche: FicheIntervention) {
  return fiche.heure_fin_prevue || fiche.heure_fin || null;
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

function formatHeure(heure: string | null | undefined) {
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

function badgeEtape(statut: string | null | undefined) {
  if (statut === "valide") return "bg-emerald-100 text-emerald-700";
  if (statut === "en_cours") return "bg-amber-100 text-amber-700";
  if (statut === "probleme") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-500";
}

function libelleEtape(statut: string | null | undefined) {
  if (statut === "valide") return "Validée";
  if (statut === "en_cours") return "En cours";
  if (statut === "probleme") return "Problème";
  if (statut === "a_preparer") return "À préparer";
  return "En attente";
}

function titreFiche(fiche: FicheIntervention) {
  return fiche.titre || "Intervention sans titre";
}

function adresseFiche(fiche: FicheIntervention) {
  const adresse = fiche.adresse_chantier || fiche.adresse || "";
  const codePostal = fiche.code_postal_chantier || fiche.code_postal || "";
  const ville = fiche.ville_chantier || fiche.ville || "";

  return [adresse, codePostal, ville].filter(Boolean).join(", ") || "—";
}

function nomSalarie(salarie: Salarie | null | undefined) {
  if (!salarie) return "Salarié";

  const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();

  return complet || salarie.email || "Salarié";
}

function comparerFiches(a: FicheIntervention, b: FicheIntervention) {
  const dateA = datePlanning(a) || "9999-12-31";
  const dateB = datePlanning(b) || "9999-12-31";

  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  const heureA = heureDebutPlanning(a) || "99:99";
  const heureB = heureDebutPlanning(b) || "99:99";

  return heureA.localeCompare(heureB);
}

export default function PlanningSalariePage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [salarie, setSalarie] = useState<Salarie | null>(null);

  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [affectations, setAffectations] = useState<FicheSalarie[]>([]);
  const [elementsFiches, setElementsFiches] = useState<FicheElement[]>([]);

  const [commentairesPreparation, setCommentairesPreparation] = useState<
    Record<string, string>
  >({});
  const [commentairesArrivee, setCommentairesArrivee] = useState<
    Record<string, string>
  >({});
  const [commentairesFin, setCommentairesFin] = useState<Record<string, string>>(
    {}
  );
  const [descriptionsProbleme, setDescriptionsProbleme] = useState<
    Record<string, string>
  >({});

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

  async function chargerFiches(
    idEntreprise = entrepriseId,
    salarieId = salarie?.id
  ) {
    if (!idEntreprise || !salarieId) return;

    const { data: affectationsData, error: erreurAffectations } = await supabase
      .from("fiches_intervention_salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("salarie_id", salarieId)
      .order("created_at", { ascending: true });

    if (erreurAffectations) {
      console.error("Erreur chargement affectations salarié :", erreurAffectations);
      setMessageErreur(
        erreurAffectations.message ||
          "Impossible de charger vos affectations d’intervention."
      );
      return;
    }

    const affectationsChargees = (affectationsData || []) as FicheSalarie[];
    setAffectations(affectationsChargees);

    const idsFichesAffectees = affectationsChargees
      .map((item) => item.fiche_id)
      .filter(Boolean);

    const fichesParId = new Map<string, FicheIntervention>();

    if (idsFichesAffectees.length > 0) {
      const { data: fichesEquipe, error: erreurFichesEquipe } = await supabase
        .from("fiches_intervention")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .in("id", idsFichesAffectees);

      if (erreurFichesEquipe) {
        console.error("Erreur chargement fiches équipe :", erreurFichesEquipe);
        setMessageErreur(
          erreurFichesEquipe.message ||
            "Impossible de charger vos fiches d’intervention."
        );
        return;
      }

      ((fichesEquipe || []) as FicheIntervention[]).forEach((fiche) => {
        fichesParId.set(fiche.id, fiche);
      });
    }

    const { data: fichesLegacy, error: erreurLegacy } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("salarie_id", salarieId);

    if (erreurLegacy) {
      console.error("Erreur chargement anciennes fiches salarié :", erreurLegacy);
    } else {
      ((fichesLegacy || []) as FicheIntervention[]).forEach((fiche) => {
        fichesParId.set(fiche.id, fiche);
      });
    }

    const fichesChargees = Array.from(fichesParId.values()).sort(comparerFiches);

    setFiches(fichesChargees);
    initialiserCommentaires(fichesChargees);

    const idsFiches = fichesChargees.map((fiche) => fiche.id);

    if (idsFiches.length === 0) {
      setElementsFiches([]);
      return;
    }

    await chargerElementsFiches(idEntreprise, idsFiches);
  }

  async function chargerElementsFiches(idEntreprise: string, ficheIds: string[]) {
    const { data, error } = await supabase
      .from("fiches_intervention_elements")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .in("fiche_id", ficheIds)
      .order("ordre", { ascending: true });

    if (error) {
      console.error("Erreur chargement éléments fiches salarié :", error);
      setElementsFiches([]);
      return;
    }

    setElementsFiches((data || []) as FicheElement[]);
  }

  function initialiserCommentaires(fichesChargees: FicheIntervention[]) {
    const preparation: Record<string, string> = {};
    const arrivee: Record<string, string> = {};
    const fin: Record<string, string> = {};
    const problemes: Record<string, string> = {};

    fichesChargees.forEach((fiche) => {
      preparation[fiche.id] = fiche.commentaire_preparation || "";
      arrivee[fiche.id] = fiche.commentaire_arrivee || "";
      fin[fiche.id] = fiche.commentaire_fin || fiche.commentaire_salarie || "";
      problemes[fiche.id] = fiche.description_probleme || "";
    });

    setCommentairesPreparation(preparation);
    setCommentairesArrivee(arrivee);
    setCommentairesFin(fin);
    setDescriptionsProbleme(problemes);
  }

  function affectationFiche(fiche: FicheIntervention) {
    return (
      affectations.find((item) => item.fiche_id === fiche.id) ||
      ({
        id: `legacy-${fiche.id}`,
        entreprise_id: fiche.entreprise_id,
        fiche_id: fiche.id,
        salarie_id: fiche.salarie_id,
        salarie_nom: fiche.salarie_nom,
        role_chantier: "Intervenant",
        heure_arrivee_prevue: heureDebutPlanning(fiche),
        heure_depart_prevue: heureFinPlanning(fiche),
        heure_arrivee_reelle: fiche.heure_debut_reelle,
        heure_depart_reelle: fiche.heure_fin_reelle,
        arrivee_validee_at: fiche.arrivee_validee_at,
        depart_valide_at: fiche.fin_validee_at,
        commentaire_salarie: fiche.commentaire_salarie,
      } as FicheSalarie)
    );
  }

  function elementsDeFiche(ficheId: string, categorie?: string) {
    return elementsFiches.filter((element) => {
      if (element.fiche_id !== ficheId) return false;
      if (!categorie) return true;
      return element.categorie === categorie;
    });
  }

  function elementsMateriel(ficheId: string) {
    return elementsFiches.filter(
      (element) =>
        element.fiche_id === ficheId &&
        (element.categorie === "materiel" || element.categorie === "materiaux")
    );
  }

  function elementsTravaux(ficheId: string) {
    return elementsDeFiche(ficheId, "travaux");
  }

  function elementsConsignes(ficheId: string) {
    return elementsFiches.filter(
      (element) =>
        element.fiche_id === ficheId &&
        (element.categorie === "consigne_securite" ||
          element.categorie === "consigne_chantier")
    );
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

        const dateFiche = datePlanning(fiche);
        let correspondPeriode = true;

        if (periode !== "tous") {
          if (!dateFiche) {
            correspondPeriode = false;
          } else if (periode === "aujourdhui") {
            correspondPeriode = dateFiche === aujourdHui;
          } else if (dateFin) {
            correspondPeriode = dateFiche >= aujourdHui && dateFiche <= dateFin;
          }
        }

        const elements = elementsDeFiche(fiche.id)
          .map((item) => item.nom)
          .join(" ");

        const zoneRecherche = [
          fiche.numero,
          fiche.titre,
          fiche.client_nom,
          fiche.type_intervention,
          fiche.adresse,
          fiche.code_postal,
          fiche.ville,
          fiche.adresse_chantier,
          fiche.code_postal_chantier,
          fiche.ville_chantier,
          fiche.notes_chantier,
          fiche.travaux_prevus,
          fiche.materiel_prevu,
          fiche.consignes_securite,
          elements,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const correspondRecherche =
          texte.length === 0 || zoneRecherche.includes(texte);

        return correspondStatut && correspondPeriode && correspondRecherche;
      })
      .sort(comparerFiches);
  }, [fiches, elementsFiches, recherche, filtreStatut, periode]);

  const fichesGroupees = useMemo(() => {
    const groupes: Record<string, FicheIntervention[]> = {};

    fichesFiltrees.forEach((fiche) => {
      const cle = datePlanning(fiche) || "non_datee";

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
          datePlanning(fiche) === aujourdhui && fiche.statut !== "archivee"
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
        .eq("entreprise_id", entrepriseId);

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

  async function mettreAJourAffectation(
    fiche: FicheIntervention,
    payload: Partial<FicheSalarie>
  ) {
    if (!entrepriseId) return;

    const affectation = affectationFiche(fiche);

    if (!affectation.id || affectation.id.startsWith("legacy-")) {
      return;
    }

    const { error } = await supabase
      .from("fiches_intervention_salaries")
      .update(payload)
      .eq("id", affectation.id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      console.error("Erreur mise à jour affectation salarié :", error);
    }
  }

  async function basculerElementPrepare(element: FicheElement) {
    if (!entrepriseId || !salarie?.id) return;

    try {
      setActionEnCours(true);
      setMessageErreur("");
      setMessageSucces("");

      const nouvelleValeur = !element.coche_prepare;

      const { error } = await supabase
        .from("fiches_intervention_elements")
        .update({ coche_prepare: nouvelleValeur })
        .eq("id", element.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      setElementsFiches((anciens) =>
        anciens.map((item) =>
          item.id === element.id
            ? { ...item, coche_prepare: nouvelleValeur }
            : item
        )
      );
    } catch (error: any) {
      console.error("Erreur validation élément matériel :", error);
      setMessageErreur(error?.message || "Impossible de modifier cet élément.");
    } finally {
      setActionEnCours(false);
    }
  }

  async function validerMateriel(fiche: FicheIntervention) {
    if (!entrepriseId || !salarie?.id) return;

    const materiel = elementsMateriel(fiche.id);
    const elementsNonCoches = materiel.filter((item) => !item.coche_prepare);

    if (elementsNonCoches.length > 0) {
      const continuer = window.confirm(
        `Il reste ${elementsNonCoches.length} élément(s) non coché(s). Valider quand même le chargement ?`
      );

      if (!continuer) return;
    }

    try {
      setActionEnCours(true);
      setMessageErreur("");
      setMessageSucces("");

      if (materiel.length > 0) {
        const { error: erreurElements } = await supabase
          .from("fiches_intervention_elements")
          .update({ coche_prepare: true })
          .eq("entreprise_id", entrepriseId)
          .eq("fiche_id", fiche.id)
          .in("categorie", ["materiel", "materiaux"]);

        if (erreurElements) throw erreurElements;
      }

      const commentaire = commentairesPreparation[fiche.id] || "";

      await mettreAJourFiche(
        fiche,
        {
          validation_materiel_charge: true,
          etape_materiel_statut: "valide",
          materiel_valide_at: new Date().toISOString(),
          commentaire_preparation: commentaire.trim() || null,
        },
        "Matériel chargé validé."
      );
    } catch (error: any) {
      console.error("Erreur validation matériel :", error);
      setMessageErreur(
        error?.message || "Impossible de valider le matériel chargé."
      );
    } finally {
      setActionEnCours(false);
    }
  }

  async function validerArrivee(fiche: FicheIntervention) {
    if (!entrepriseId || !salarie?.id) return;

    const heure = maintenantTime();
    const commentaire = commentairesArrivee[fiche.id] || "";

    await mettreAJourAffectation(fiche, {
      heure_arrivee_reelle: heure,
      arrivee_validee_at: new Date().toISOString(),
      commentaire_salarie: commentaire.trim() || null,
    });

    await mettreAJourFiche(
      fiche,
      {
        validation_arrivee: true,
        statut: "en_cours",
        etape_arrivee_statut: "valide",
        arrivee_validee_at: new Date().toISOString(),
        heure_debut_reelle: heure,
        commentaire_arrivee: commentaire.trim() || null,
      },
      "Arrivée sur chantier validée. L’intervention est passée en cours."
    );
  }

  async function terminerIntervention(fiche: FicheIntervention) {
    if (!entrepriseId || !salarie?.id) return;

    const heure = maintenantTime();
    const commentaire = commentairesFin[fiche.id] || "";
    const descriptionProbleme = descriptionsProbleme[fiche.id] || "";
    const probleme = descriptionProbleme.trim().length > 0;

    await mettreAJourAffectation(fiche, {
      heure_depart_reelle: heure,
      depart_valide_at: new Date().toISOString(),
      commentaire_salarie: commentaire.trim() || null,
    });

    await mettreAJourFiche(
      fiche,
      {
        validation_fin_intervention: true,
        statut: "terminee",
        etape_fin_statut: probleme ? "probleme" : "valide",
        fin_validee_at: new Date().toISOString(),
        heure_fin_reelle: heure,
        commentaire_fin: commentaire.trim() || null,
        commentaire_salarie: commentaire.trim() || null,
        probleme_signale: probleme,
        description_probleme: probleme ? descriptionProbleme.trim() : null,
      },
      probleme
        ? "Fin d’intervention validée avec problème signalé."
        : "Fin d’intervention validée."
    );
  }

  function modifierCommentairePreparation(ficheId: string, valeur: string) {
    setCommentairesPreparation((ancien) => ({
      ...ancien,
      [ficheId]: valeur,
    }));
  }

  function modifierCommentaireArrivee(ficheId: string, valeur: string) {
    setCommentairesArrivee((ancien) => ({
      ...ancien,
      [ficheId]: valeur,
    }));
  }

  function modifierCommentaireFin(ficheId: string, valeur: string) {
    setCommentairesFin((ancien) => ({
      ...ancien,
      [ficheId]: valeur,
    }));
  }

  function modifierDescriptionProbleme(ficheId: string, valeur: string) {
    setDescriptionsProbleme((ancien) => ({
      ...ancien,
      [ficheId]: valeur,
    }));
  }

  function renduEtapes(fiche: FicheIntervention) {
    return (
      <div className="grid gap-2 md:grid-cols-3">
        <span
          className={`rounded-full px-3 py-2 text-center text-xs font-semibold ${badgeEtape(
            fiche.etape_materiel_statut ||
              (fiche.validation_materiel_charge ? "valide" : "a_preparer")
          )}`}
        >
          Matériel :{" "}
          {libelleEtape(
            fiche.etape_materiel_statut ||
              (fiche.validation_materiel_charge ? "valide" : "a_preparer")
          )}
        </span>

        <span
          className={`rounded-full px-3 py-2 text-center text-xs font-semibold ${badgeEtape(
            fiche.etape_arrivee_statut ||
              (fiche.validation_arrivee ? "valide" : "en_attente")
          )}`}
        >
          Arrivée :{" "}
          {libelleEtape(
            fiche.etape_arrivee_statut ||
              (fiche.validation_arrivee ? "valide" : "en_attente")
          )}
        </span>

        <span
          className={`rounded-full px-3 py-2 text-center text-xs font-semibold ${badgeEtape(
            fiche.etape_fin_statut ||
              (fiche.validation_fin_intervention ? "valide" : "en_attente")
          )}`}
        >
          Fin / PV :{" "}
          {libelleEtape(
            fiche.etape_fin_statut ||
              (fiche.validation_fin_intervention ? "valide" : "en_attente")
          )}
        </span>
      </div>
    );
  }

  function renduElementsLecture(titre: string, elements: FicheElement[]) {
    if (elements.length === 0) return null;

    return (
      <div className="rounded-2xl bg-white p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">{titre}</p>

        <div className="mt-3 space-y-2">
          {elements.map((element) => (
            <div
              key={element.id}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <p className="font-medium text-slate-800">
                {element.icone || "•"} {element.nom}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Quantité prévue : {Number(element.quantite_prevue || 1)}{" "}
                {element.unite || "u"}
              </p>

              {element.commentaire_chef && (
                <p className="mt-1 text-xs text-slate-500">
                  {element.commentaire_chef}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renduChecklistMateriel(fiche: FicheIntervention) {
    const materiel = elementsMateriel(fiche.id);

    if (materiel.length === 0 && !fiche.materiel_prevu) {
      return (
        <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">
          Aucun matériel ou matériau spécifique renseigné.
        </div>
      );
    }

    return (
      <div className="rounded-2xl bg-white p-4">
        <p className="font-semibold text-slate-900">
          1. Matériel / matériaux à charger
        </p>

        {fiche.materiel_prevu && (
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
            {fiche.materiel_prevu}
          </p>
        )}

        {materiel.length > 0 && (
          <div className="mt-4 space-y-2">
            {materiel.map((element) => (
              <button
                key={element.id}
                type="button"
                onClick={() => basculerElementPrepare(element)}
                disabled={
                  actionEnCours || fiche.validation_materiel_charge === true
                }
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
                  element.coche_prepare
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="text-xl">
                  {element.coche_prepare ? "✅" : "⬜"}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">
                    {element.icone || "•"} {element.nom}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {Number(element.quantite_prevue || 1)} {element.unite || "u"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        <textarea
          value={commentairesPreparation[fiche.id] || ""}
          onChange={(event) =>
            modifierCommentairePreparation(fiche.id, event.target.value)
          }
          rows={3}
          placeholder="Commentaire préparation : matériel manquant, carburant, remarque..."
          disabled={fiche.validation_materiel_charge === true}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-70"
        />

        <button
          onClick={() => validerMateriel(fiche)}
          disabled={actionEnCours || fiche.validation_materiel_charge === true}
          className={`mt-3 w-full rounded-xl px-3 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
            fiche.validation_materiel_charge
              ? "bg-emerald-600 text-white"
              : "bg-slate-900 text-white hover:bg-slate-700"
          }`}
        >
          {fiche.validation_materiel_charge
            ? "✅ Matériel chargé validé"
            : "Valider matériel chargé"}
        </button>
      </div>
    );
  }

  function renduBlocArrivee(fiche: FicheIntervention) {
    const affectation = affectationFiche(fiche);

    return (
      <div className="rounded-2xl bg-white p-4">
        <p className="font-semibold text-slate-900">2. Arrivée chantier</p>

        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-800">Prévue :</span>{" "}
            {formatHeure(
              affectation.heure_arrivee_prevue || heureDebutPlanning(fiche)
            )}
          </p>

          <p>
            <span className="font-semibold text-slate-800">Réelle :</span>{" "}
            {formatHeure(
              affectation.heure_arrivee_reelle || fiche.heure_debut_reelle
            )}
          </p>
        </div>

        <textarea
          value={commentairesArrivee[fiche.id] || ""}
          onChange={(event) =>
            modifierCommentaireArrivee(fiche.id, event.target.value)
          }
          rows={3}
          placeholder="Commentaire arrivée : client absent, accès fermé, difficulté..."
          disabled={fiche.validation_arrivee === true}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-70"
        />

        <button
          onClick={() => validerArrivee(fiche)}
          disabled={actionEnCours || fiche.validation_arrivee === true}
          className={`mt-3 w-full rounded-xl px-3 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
            fiche.validation_arrivee
              ? "bg-emerald-600 text-white"
              : "bg-amber-600 text-white hover:bg-amber-700"
          }`}
        >
          {fiche.validation_arrivee
            ? "✅ Arrivée chantier validée"
            : "Je suis arrivé sur le chantier"}
        </button>
      </div>
    );
  }

  function renduBlocFin(fiche: FicheIntervention) {
    const affectation = affectationFiche(fiche);

    return (
      <div className="rounded-2xl bg-white p-4">
        <p className="font-semibold text-slate-900">3. Fin chantier</p>

        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-800">Fin prévue :</span>{" "}
            {formatHeure(
              affectation.heure_depart_prevue || heureFinPlanning(fiche)
            )}
          </p>

          <p>
            <span className="font-semibold text-slate-800">Fin réelle :</span>{" "}
            {formatHeure(
              affectation.heure_depart_reelle || fiche.heure_fin_reelle
            )}
          </p>
        </div>

        <textarea
          value={commentairesFin[fiche.id] || ""}
          onChange={(event) => modifierCommentaireFin(fiche.id, event.target.value)}
          rows={3}
          placeholder="Commentaire fin : travaux terminés, reste à faire, client absent..."
          disabled={fiche.validation_fin_intervention === true}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-70"
        />

        <textarea
          value={descriptionsProbleme[fiche.id] || ""}
          onChange={(event) =>
            modifierDescriptionProbleme(fiche.id, event.target.value)
          }
          rows={3}
          placeholder="Problème à signaler au chef ? Laisse vide si aucun problème."
          disabled={fiche.validation_fin_intervention === true}
          className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 outline-none focus:border-red-400 disabled:opacity-70"
        />

        <button
          onClick={() => terminerIntervention(fiche)}
          disabled={actionEnCours || fiche.validation_fin_intervention === true}
          className={`mt-3 w-full rounded-xl px-3 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
            fiche.validation_fin_intervention
              ? "bg-emerald-600 text-white"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {fiche.validation_fin_intervention
            ? "✅ Fin chantier validée"
            : "Valider la fin du chantier"}
        </button>

        <p className="mt-2 text-xs text-slate-500">
          Après la fin du chantier, ajoute les photos finales puis fais signer le
          PV client quand il sera disponible.
        </p>
      </div>
    );
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
            Retrouvez vos interventions affectées, le matériel à charger, les
            consignes chantier, les photos et les validations terrain en trois
            étapes.
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
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.total}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Aujourd’hui
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.aujourdHui}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-blue-500">
            Planifiées
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-900">
            {statistiques.planifiees}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-amber-500">
            En cours
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {statistiques.enCours}
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-emerald-500">
            Terminées
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {statistiques.terminees}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_180px_220px]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher client, ville, matériel, travaux..."
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

                <div className="grid gap-5">
                  {fichesDuJour.map((fiche) => (
                    <article
                      key={fiche.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
                                fiche.statut
                              )}`}
                            >
                              {libelleStatut(fiche.statut)}
                            </span>

                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                              {fiche.type_intervention || "Intervention"}
                            </span>
                          </div>

                          <h3 className="mt-3 text-xl font-bold text-slate-950">
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
                              {formatHeure(heureDebutPlanning(fiche))} →{" "}
                              {formatHeure(heureFinPlanning(fiche))}
                            </p>

                            <p className="md:col-span-2">
                              <span className="font-semibold text-slate-800">
                                Adresse :
                              </span>{" "}
                              {adresseFiche(fiche)}
                            </p>
                          </div>

                          {fiche.notes_chantier && (
                            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                              <span className="font-semibold">
                                Notes chantier :
                              </span>{" "}
                              {fiche.notes_chantier}
                            </div>
                          )}
                        </div>
                      </div>

                      {renduEtapes(fiche)}

                      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_420px]">
                        <div className="space-y-4">
                          {renduElementsLecture(
                            "Travaux à réaliser",
                            elementsTravaux(fiche.id)
                          )}

                          {fiche.travaux_prevus && (
                            <div className="rounded-2xl bg-white p-4 text-sm text-slate-700">
                              <p className="font-semibold text-slate-900">
                                Travaux prévus
                              </p>
                              <p className="mt-1 whitespace-pre-line">
                                {fiche.travaux_prevus}
                              </p>
                            </div>
                          )}

                          {renduElementsLecture(
                            "Consignes chantier / sécurité",
                            elementsConsignes(fiche.id)
                          )}

                          {fiche.consignes_securite && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                              <p className="font-semibold">
                                Consignes sécurité
                              </p>
                              <p className="mt-1 whitespace-pre-line">
                                {fiche.consignes_securite}
                              </p>
                            </div>
                          )}

                          <BlocPhotosChantier
                            entrepriseId={entrepriseId}
                            ficheId={fiche.id}
                            userId={profil?.id || null}
                          />
                        </div>

                        <div className="space-y-4">
                          {renduChecklistMateriel(fiche)}
{renduBlocArrivee(fiche)}
{renduBlocFin(fiche)}

<BlocPvFinChantier
  entrepriseId={entrepriseId}
  ficheId={fiche.id}
  clientId={fiche.client_id}
  clientNom={fiche.client_nom}
  signataireEntrepriseNom={
    salarie ? nomSalarie(salarie) : profil?.email || ""
  }
/>
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