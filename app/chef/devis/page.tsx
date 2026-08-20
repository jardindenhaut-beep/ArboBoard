"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerParametresEntrepriseClient } from "@/lib/parametresEntrepriseClient";

import BoutonEnvoyerDocumentEmail from "@/components/documents/BoutonEnvoyerDocumentEmail";
import HistoriqueEmailsDocument from "@/components/documents/HistoriqueEmailsDocument";
import BoutonTelechargerDocumentPdf from "@/components/documents/BoutonTelechargerDocumentPdf";
import ChampNumeroDocumentVerrouille from "@/components/documents/ChampNumeroDocumentVerrouille";
import BoutonCreerFicheInterventionDepuisDevis from "@/components/devis/BoutonCreerFicheInterventionDepuisDevis";

type Client = {
  id: string;
  type_client?: string | null;
  nom?: string | null;
  prenom?: string | null;
  entreprise?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  adresse_chantier?: string | null;
  code_postal_chantier?: string | null;
  ville_chantier?: string | null;
  notes_chantier?: string | null;
};

type FactureLiee = {
  id: string;
  devis_id?: string | null;
  numero?: string | null;
  statut?: string | null;
};

type FicheInterventionLiee = {
  id: string;
  devis_id: string | null;
  numero?: string | null;
  titre?: string | null;
  type_intervention?: string | null;
  statut?: string | null;
  date_prevue?: string | null;
  date_intervention?: string | null;
  client_nom?: string | null;
  created_at?: string | null;
};

type Devis = {
  id: string;
  entreprise_id: string;
  client_id?: string | null;
  client_nom?: string | null;
  numero?: string | null;
  objet?: string | null;
  description?: string | null;
  adresse_chantier?: string | null;
  code_postal_chantier?: string | null;
  ville_chantier?: string | null;
  notes_chantier?: string | null;
  date_devis?: string | null;
  date_validite?: string | null;
  statut?: string | null;
  total_ht?: number | null;
  total_tva?: number | null;
  total_ttc?: number | null;
  remise_globale_pourcent?: number | null;
  remise_globale_montant?: number | null;
  conditions?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  client?: Client | null;
  facture_liee?: FactureLiee | null;
  fiches_liees?: FicheInterventionLiee[];
};

type CategoriePrestation = {
  id: string;
  entreprise_id: string;
  nom: string;
  prefixe_code?: string | null;
  actif?: boolean | null;
};

type PrestationCatalogue = {
  id: string;
  entreprise_id: string;
  categorie_id: string;
  code: string;
  designation: string;
  description: string | null;
  unite_reference: string;
  prix_vente_ht: number;
  taux_tva: number;
  actif: boolean;
  ordre?: number | null;
  categorie?: CategoriePrestation | null;
};

type LigneDevisForm = {
  id?: string;
  type_ligne: "prestation" | "section";
  prestation_tarif_id?: string | null;
  prestation_code?: string | null;
  prestation_categorie_id?: string | null;
  prestation_categorie_nom?: string | null;
  designation: string;
  description: string;
  quantite: number;
  unite: string;
  prix_unitaire_ht: number;
  remise_pourcent: number;
  total_brut_ht: number;
  tva: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
};

type FormDevis = {
  client_id: string;
  numero: string;
  objet: string;
  description: string;
  adresse_chantier: string;
  code_postal_chantier: string;
  ville_chantier: string;
  notes_chantier: string;
  date_devis: string;
  date_validite: string;
  statut: "brouillon" | "envoye";
  conditions: string;
  remise_globale_pourcent: number;
};

type ModeEnregistrementDocument = "brouillon" | "apercu" | "finaliser";

type FiltreDevis =
  | "tous"
  | "brouillon"
  | "envoye"
  | "accepte"
  | "facture"
  | "refuse"
  | "archive";

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

function ajouterJours(dateIso: string, jours: number) {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() + jours);
  return date.toISOString().slice(0, 10);
}

const formVide: FormDevis = {
  client_id: "",
  numero: "",
  objet: "",
  description: "",
  adresse_chantier: "",
  code_postal_chantier: "",
  ville_chantier: "",
  notes_chantier: "",
  date_devis: dateAujourdhui(),
  date_validite: ajouterJours(dateAujourdhui(), 30),
  statut: "brouillon",
  conditions: "",
  remise_globale_pourcent: 0,
};

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
  } catch {
    return "—";
  }
}

function nomClient(client?: Client | null, devis?: Devis | null) {
  if (devis?.client_nom) return devis.client_nom;

  if (!client) return "Client non renseigné";

  if (client.type_client === "particulier") {
    const nom = `${client.prenom || ""} ${client.nom || ""}`.trim();
    return nom || "Client particulier";
  }

  return (
    client.entreprise ||
    client.nom ||
    `${client.prenom || ""} ${client.nom || ""}`.trim() ||
    "Client professionnel"
  );
}

function libelleStatut(statut?: string | null) {
  if (statut === "brouillon") return "Brouillon";
  if (statut === "envoye") return "Envoyé";
  if (statut === "accepte") return "Accepté";
  if (statut === "facture") return "Facturé";
  if (statut === "refuse") return "Refusé";
  if (statut === "archive") return "Archivé";
  return "Inconnu";
}

function classeStatut(statut?: string | null) {
  if (statut === "brouillon") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (statut === "envoye") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (statut === "accepte") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (statut === "facture") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (statut === "refuse") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (statut === "archive") {
    return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function normaliserRechercheCatalogue(valeur: string) {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function uniteDocumentDepuisReference(reference: string | null | undefined) {
  const valeur = normaliserRechercheCatalogue(reference || "");

  if (!valeur) return "u";
  if (["heure", "heures", "h"].includes(valeur)) return "h";
  if (["jour", "jours", "j"].includes(valeur)) return "jour";
  if (["unite", "unites", "u"].includes(valeur)) return "u";
  if (["forfait", "forfaits"].includes(valeur)) return "forfait";
  if (["passage", "passages"].includes(valeur)) return "passage";
  if (["m2", "m²", "metre carre", "metres carres"].includes(valeur)) return "m²";
  if (["ml", "metre lineaire", "metres lineaires"].includes(valeur)) return "ml";
  if (["m3", "m³", "metre cube", "metres cubes"].includes(valeur)) return "m³";

  return reference?.trim() || "u";
}

function ligneVide(tvaDefaut = 20): LigneDevisForm {
  return {
    type_ligne: "prestation",
    prestation_tarif_id: null,
    prestation_code: null,
    prestation_categorie_id: null,
    prestation_categorie_nom: null,
    designation: "",
    description: "",
    quantite: 1,
    unite: "u",
    prix_unitaire_ht: 0,
    remise_pourcent: 0,
    total_brut_ht: 0,
    tva: tvaDefaut,
    total_ht: 0,
    total_tva: 0,
    total_ttc: 0,
  };
}

function ligneSectionVide(): LigneDevisForm {
  return {
    type_ligne: "section",
    prestation_tarif_id: null,
    prestation_code: null,
    prestation_categorie_id: null,
    prestation_categorie_nom: null,
    designation: "Nouvelle section",
    description: "",
    quantite: 0,
    unite: "",
    prix_unitaire_ht: 0,
    remise_pourcent: 0,
    total_brut_ht: 0,
    tva: 0,
    total_ht: 0,
    total_tva: 0,
    total_ttc: 0,
  };
}

function bornerPourcentage(valeur: unknown) {
  const nombre = Number(valeur || 0);
  if (!Number.isFinite(nombre)) return 0;
  return Math.min(100, Math.max(0, nombre));
}

function recalculerLigne(ligne: LigneDevisForm): LigneDevisForm {
  if (ligne.type_ligne === "section") {
    return {
      ...ligne,
      prestation_tarif_id: null,
      prestation_code: null,
      prestation_categorie_id: null,
      prestation_categorie_nom: null,
      quantite: 0,
      unite: "",
      prix_unitaire_ht: 0,
      remise_pourcent: 0,
      total_brut_ht: 0,
      tva: 0,
      total_ht: 0,
      total_tva: 0,
      total_ttc: 0,
    };
  }

  const quantite = Number(ligne.quantite || 0);
  const prixUnitaireHt = Number(ligne.prix_unitaire_ht || 0);
  const remisePourcent = bornerPourcentage(ligne.remise_pourcent);
  const tva = Number(ligne.tva || 0);

  const totalBrutHt = quantite * prixUnitaireHt;
  const totalHt = totalBrutHt * (1 - remisePourcent / 100);
  const totalTva = totalHt * (tva / 100);
  const totalTtc = totalHt + totalTva;

  return {
    ...ligne,
    type_ligne: "prestation",
    quantite,
    prix_unitaire_ht: prixUnitaireHt,
    remise_pourcent: remisePourcent,
    total_brut_ht: Number(totalBrutHt.toFixed(2)),
    tva,
    total_ht: Number(totalHt.toFixed(2)),
    total_tva: Number(totalTva.toFixed(2)),
    total_ttc: Number(totalTtc.toFixed(2)),
  };
}

function calculerTotaux(
  lignes: LigneDevisForm[],
  remiseGlobalePourcent = 0
) {
  const lignesCalculees = lignes.map(recalculerLigne);
  const prestations = lignesCalculees.filter(
    (ligne) => ligne.type_ligne !== "section"
  );

  const totalBrutHt = prestations.reduce(
    (total, ligne) => total + Number(ligne.total_brut_ht || 0),
    0
  );

  const totalLignesHt = prestations.reduce(
    (total, ligne) => total + Number(ligne.total_ht || 0),
    0
  );

  const remiseGlobale = bornerPourcentage(remiseGlobalePourcent);
  const remiseGlobaleMontant = totalLignesHt * (remiseGlobale / 100);
  const coefficientGlobal =
    totalLignesHt > 0
      ? Math.max(0, (totalLignesHt - remiseGlobaleMontant) / totalLignesHt)
      : 1;

  const recapMap = new Map<number, { base_ht: number; montant_tva: number }>();

  for (const ligne of prestations) {
    const taux = Number(ligne.tva || 0);
    const baseApresRemiseGlobale = Number(ligne.total_ht || 0) * coefficientGlobal;
    const montantTva = baseApresRemiseGlobale * (taux / 100);
    const actuel = recapMap.get(taux) || { base_ht: 0, montant_tva: 0 };
    recapMap.set(taux, {
      base_ht: actuel.base_ht + baseApresRemiseGlobale,
      montant_tva: actuel.montant_tva + montantTva,
    });
  }

  const recap_tva = Array.from(recapMap.entries())
    .map(([taux, valeur]) => ({
      taux,
      base_ht: Number(valeur.base_ht.toFixed(2)),
      montant_tva: Number(valeur.montant_tva.toFixed(2)),
    }))
    .sort((a, b) => a.taux - b.taux);

  const totalHt = totalLignesHt - remiseGlobaleMontant;
  const totalTva = recap_tva.reduce(
    (total, ligne) => total + ligne.montant_tva,
    0
  );
  const totalTtc = totalHt + totalTva;

  return {
    lignesCalculees,
    total_brut_ht: Number(totalBrutHt.toFixed(2)),
    total_lignes_ht: Number(totalLignesHt.toFixed(2)),
    remise_lignes_montant: Number((totalBrutHt - totalLignesHt).toFixed(2)),
    remise_globale_pourcent: remiseGlobale,
    remise_globale_montant: Number(remiseGlobaleMontant.toFixed(2)),
    recap_tva,
    total_ht: Number(totalHt.toFixed(2)),
    total_tva: Number(totalTva.toFixed(2)),
    total_ttc: Number(totalTtc.toFixed(2)),
  };
}

function sousTotalSection(lignes: LigneDevisForm[], indexSection: number) {
  let total = 0;

  for (let index = indexSection + 1; index < lignes.length; index += 1) {
    const ligne = recalculerLigne(lignes[index]);
    if (ligne.type_ligne === "section") break;
    total += Number(ligne.total_ht || 0);
  }

  return Number(total.toFixed(2));
}

function champsChantierDepuisClient(client?: Client | null) {
  if (!client) {
    return {
      adresse_chantier: "",
      code_postal_chantier: "",
      ville_chantier: "",
      notes_chantier: "",
    };
  }

  return {
    adresse_chantier: client.adresse_chantier || client.adresse || "",
    code_postal_chantier:
      client.code_postal_chantier || client.code_postal || "",
    ville_chantier: client.ville_chantier || client.ville || "",
    notes_chantier: client.notes_chantier || "",
  };
}

function adresseChantierTexte(item: Devis) {
  return [
    item.adresse_chantier,
    [item.code_postal_chantier, item.ville_chantier]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

function iconeStatut(statut?: string | null) {
  if (statut === "brouillon") return "📝";
  if (statut === "envoye") return "✉️";
  if (statut === "accepte") return "✅";
  if (statut === "facture") return "🧾";
  if (statut === "refuse") return "⛔";
  if (statut === "archive") return "🗄️";
  return "📄";
}

function barreStatut(statut?: string | null) {
  if (statut === "brouillon") return "bg-slate-400";
  if (statut === "envoye") return "bg-blue-500";
  if (statut === "accepte") return "bg-emerald-600";
  if (statut === "facture") return "bg-purple-600";
  if (statut === "refuse") return "bg-red-500";
  if (statut === "archive") return "bg-zinc-400";
  return "bg-slate-300";
}

function dateDepassee(date?: string | null) {
  if (!date) return false;

  try {
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);

    const dateValidite = new Date(`${date.slice(0, 10)}T00:00:00`);

    return dateValidite.getTime() < aujourdHui.getTime();
  } catch {
    return false;
  }
}

function libelleStatutFiche(statut?: string | null) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  if (statut === "archivee") return "Archivée";
  return "Brouillon";
}

function classeStatutFiche(statut?: string | null) {
  if (statut === "planifiee") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (statut === "en_cours") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (statut === "terminee") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (statut === "annulee") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (statut === "archivee") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function titreFicheLiee(fiche: FicheInterventionLiee) {
  return (
    fiche.titre ||
    fiche.type_intervention ||
    fiche.numero ||
    "Fiche d’intervention"
  );
}

function ContenuPageDevis() {
  const searchParams = useSearchParams();
  const devisSelectionneId = searchParams.get("devisId");
  const [entrepriseId, setEntrepriseId] = useState("");
  const [devis, setDevis] = useState<Devis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [prestationsCatalogue, setPrestationsCatalogue] = useState<PrestationCatalogue[]>([]);
  const [rechercheCatalogue, setRechercheCatalogue] = useState("");

  const [tvaDefaut, setTvaDefaut] = useState(20);
  const [conditionsDevisDefaut, setConditionsDevisDefaut] = useState("");

  const [chargement, setChargement] = useState(true);
  const [chargementAction, setChargementAction] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<FiltreDevis>("tous");

  const [modalOuverte, setModalOuverte] = useState(false);
  const [devisEdition, setDevisEdition] = useState<Devis | null>(null);
  const [form, setForm] = useState<FormDevis>(formVide);
  const [lignes, setLignes] = useState<LigneDevisForm[]>([ligneVide()]);

  const chargerDevis = useCallback(async () => {
    try {
      setChargement(true);
      setMessageErreur("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setMessageErreur("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const { data: profil, error: profilError } = await supabase
        .from("profils_utilisateurs")
        .select("entreprise_id, role, statut")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profilError) throw profilError;

      if (!profil?.entreprise_id) {
        setMessageErreur("Entreprise introuvable pour ce compte.");
        return;
      }

      if (profil.role !== "chef" || profil.statut !== "actif") {
        setMessageErreur("Accès refusé.");
        return;
      }

      setEntrepriseId(profil.entreprise_id);

      const parametresEntreprise = await chargerParametresEntrepriseClient(
        profil.entreprise_id
      );

      setTvaDefaut(parametresEntreprise.tva_defaut);
      setConditionsDevisDefaut(
        parametresEntreprise.conditions_generales_devis
      );

      const [
        { data: clientsData, error: clientsError },
        { data: devisData, error: devisError },
        { data: facturesData, error: facturesError },
        { data: fichesData, error: fichesError },
        { data: categoriesPrestationsData, error: categoriesPrestationsError },
        { data: prestationsData, error: prestationsError },
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .eq("entreprise_id", profil.entreprise_id)
          .order("created_at", { ascending: false }),

        supabase
          .from("devis")
          .select("*")
          .eq("entreprise_id", profil.entreprise_id)
          .order("date_devis", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("factures")
          .select("id, devis_id, numero, statut")
          .eq("entreprise_id", profil.entreprise_id)
          .not("devis_id", "is", null)
          .or("est_avoir.is.false,est_avoir.is.null"),

        supabase
          .from("fiches_intervention")
          .select(
            "id, devis_id, numero, titre, type_intervention, statut, date_prevue, date_intervention, client_nom, created_at"
          )
          .eq("entreprise_id", profil.entreprise_id)
          .not("devis_id", "is", null)
          .order("date_prevue", { ascending: true })
          .order("created_at", { ascending: false }),

        supabase
          .from("prestations_categories")
          .select("id, entreprise_id, nom, prefixe_code, actif")
          .eq("entreprise_id", profil.entreprise_id),

        supabase
          .from("prestations_tarifs")
          .select(
            "id, entreprise_id, categorie_id, code, designation, description, unite_reference, prix_vente_ht, taux_tva, actif, ordre"
          )
          .eq("entreprise_id", profil.entreprise_id)
          .eq("actif", true)
          .order("ordre", { ascending: true })
          .order("code", { ascending: true }),
      ]);

      if (clientsError) throw clientsError;
      if (devisError) throw devisError;
      if (facturesError) throw facturesError;
      if (fichesError) throw fichesError;
      if (categoriesPrestationsError) throw categoriesPrestationsError;
      if (prestationsError) throw prestationsError;

      const listeClients = (clientsData || []) as Client[];
      const mapClients = new Map(
        listeClients.map((client) => [client.id, client])
      );

      const listeFacturesLiees = (facturesData || []) as FactureLiee[];

      const mapFacturesParDevis = new Map(
        listeFacturesLiees
          .filter((facture) => facture.devis_id)
          .map((facture) => [facture.devis_id as string, facture])
      );

      const listeFichesLiees =
        (fichesData || []) as FicheInterventionLiee[];

      const mapFichesParDevis = new Map<
        string,
        FicheInterventionLiee[]
      >();

      for (const fiche of listeFichesLiees) {
        if (!fiche.devis_id) continue;

        const listeExistante =
          mapFichesParDevis.get(fiche.devis_id) || [];

        listeExistante.push(fiche);
        mapFichesParDevis.set(fiche.devis_id, listeExistante);
      }

      const listeDevis = ((devisData || []) as Devis[]).map((item) => ({
        ...item,
        client: item.client_id ? mapClients.get(item.client_id) || null : null,
        facture_liee: mapFacturesParDevis.get(item.id) || null,
        fiches_liees: mapFichesParDevis.get(item.id) || [],
      }));

      const categoriesPrestations =
        (categoriesPrestationsData || []) as CategoriePrestation[];
      const mapCategoriesPrestations = new Map(
        categoriesPrestations.map((categorie) => [categorie.id, categorie])
      );

      const prestationsChargees = ((prestationsData || []) as PrestationCatalogue[]).map(
        (prestation) => ({
          ...prestation,
          categorie: mapCategoriesPrestations.get(prestation.categorie_id) || null,
        })
      );

      setClients(listeClients);
      setDevis(listeDevis);
      setPrestationsCatalogue(prestationsChargees);
    } catch (error: any) {
      console.error("Erreur chargement devis :", error);
      setMessageErreur(error?.message || "Impossible de charger les devis.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerDevis();
  }, [chargerDevis]);

  const devisFiltres = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase();

    return devis.filter((item) => {
      if (filtre !== "tous" && item.statut !== filtre) {
        return false;
      }

      if (!rechercheNormalisee) return true;

      const texte = [
        item.numero,
        item.objet,
        item.description,
        item.statut,
        item.adresse_chantier,
        item.code_postal_chantier,
        item.ville_chantier,
        item.notes_chantier,
        nomClient(item.client, item),
        item.client?.email,
        item.client?.telephone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texte.includes(rechercheNormalisee);
    });
  }, [devis, filtre, recherche]);

  const prestationsCatalogueFiltrees = useMemo(() => {
    const rechercheNormalisee = normaliserRechercheCatalogue(rechercheCatalogue);

    // Aucun résultat n'est affiché tant qu'aucune recherche n'est saisie.
    if (!rechercheNormalisee) return [];

    const liste = prestationsCatalogue
      .filter((prestation) => {
        if (!prestation.actif) return false;

        const contenu = normaliserRechercheCatalogue(
          [
            prestation.code,
            prestation.designation,
            prestation.description || "",
            prestation.categorie?.nom || "",
          ].join(" ")
        );

        return contenu.includes(rechercheNormalisee);
      })
      .sort((a, b) => {
        const codeA = normaliserRechercheCatalogue(a.code);
        const codeB = normaliserRechercheCatalogue(b.code);
        const designationA = normaliserRechercheCatalogue(a.designation);
        const designationB = normaliserRechercheCatalogue(b.designation);

        const score = (code: string, designation: string) => {
          if (code === rechercheNormalisee) return 0;
          if (code.startsWith(rechercheNormalisee)) return 1;
          if (designation.startsWith(rechercheNormalisee)) return 2;
          return 3;
        };

        return score(codeA, designationA) - score(codeB, designationB);
      });

    // Même avec des centaines ou milliers de prestations, on ne montre
    // qu'une petite liste de choix.
    return liste.slice(0, 8);
  }, [prestationsCatalogue, rechercheCatalogue]);

  const statistiques = useMemo(() => {
    return {
      total: devis.length,
      brouillons: devis.filter((item) => item.statut === "brouillon").length,
      envoyes: devis.filter((item) => item.statut === "envoye").length,
      acceptes: devis.filter((item) => item.statut === "accepte").length,
      factures: devis.filter((item) => item.statut === "facture").length,
      totalAccepteTtc: devis
        .filter((item) => item.statut === "accepte")
        .reduce((total, item) => total + Number(item.total_ttc || 0), 0),
    };
  }, [devis]);

  function ouvrirCreation() {
    setMessageErreur("");
    setMessageSucces("");

    const dateDuJour = dateAujourdhui();

    setDevisEdition(null);
    setForm({
      ...formVide,
      numero: "",
      date_devis: dateDuJour,
      date_validite: ajouterJours(dateDuJour, 30),
      conditions: conditionsDevisDefaut,
      adresse_chantier: "",
      code_postal_chantier: "",
      ville_chantier: "",
      notes_chantier: "",
    });

    setLignes([ligneVide(tvaDefaut)]);
    setRechercheCatalogue("");
    setModalOuverte(true);
  }

  async function ouvrirEdition(item: Devis) {
    try {
      setMessageErreur("");
      setMessageSucces("");

      if (item.statut !== "brouillon") {
        setMessageErreur("Seuls les devis en brouillon peuvent être modifiés.");
        return;
      }

      const { data: lignesData, error: lignesError } = await supabase
        .from("devis_lignes")
        .select("*")
        .eq("devis_id", item.id)
        .eq("entreprise_id", item.entreprise_id)
        .order("ordre", { ascending: true });

      if (lignesError) throw lignesError;

      setDevisEdition(item);
      setForm({
        client_id: item.client_id || "",
        numero: item.numero || "",
        objet: item.objet || "",
        description: item.description || "",
        adresse_chantier: item.adresse_chantier || "",
        code_postal_chantier: item.code_postal_chantier || "",
        ville_chantier: item.ville_chantier || "",
        notes_chantier: item.notes_chantier || "",
        date_devis: item.date_devis || dateAujourdhui(),
        date_validite: item.date_validite || ajouterJours(dateAujourdhui(), 30),
        statut: "brouillon",
        conditions: item.conditions || "",
        remise_globale_pourcent: Number(item.remise_globale_pourcent || 0),
      });

      const lignesForm = (lignesData || []).map((ligne: any) =>
        recalculerLigne({
          id: ligne.id,
          type_ligne: ligne.type_ligne === "section" ? "section" : "prestation",
          prestation_tarif_id: ligne.prestation_tarif_id || null,
          prestation_code: ligne.prestation_code || null,
          prestation_categorie_id: ligne.prestation_categorie_id || null,
          prestation_categorie_nom: ligne.prestation_categorie_nom || null,
          designation: ligne.designation || "",
          description: ligne.description || "",
          quantite: Number(ligne.quantite || 0),
          unite: ligne.unite || "u",
          prix_unitaire_ht: Number(ligne.prix_unitaire_ht || 0),
          remise_pourcent: Number(ligne.remise_pourcent || 0),
          total_brut_ht: Number(
            ligne.total_brut_ht ??
              Number(ligne.quantite || 0) * Number(ligne.prix_unitaire_ht || 0)
          ),
          tva: Number(ligne.tva || 0),
          total_ht: Number(ligne.total_ht || 0),
          total_tva: Number(ligne.total_tva || 0),
          total_ttc: Number(ligne.total_ttc || 0),
        })
      );

      setLignes(lignesForm.length > 0 ? lignesForm : [ligneVide(tvaDefaut)]);
      setRechercheCatalogue("");
      setModalOuverte(true);
    } catch (error: any) {
      console.error("Erreur ouverture édition devis :", error);
      setMessageErreur(error?.message || "Impossible d’ouvrir le devis.");
    }
  }

  function reinitialiserModal() {
    setModalOuverte(false);
    setDevisEdition(null);
    setForm(formVide);
    setLignes([ligneVide(tvaDefaut)]);
    setRechercheCatalogue("");
  }

  function fermerModal() {
    if (chargementAction) return;
    reinitialiserModal();
  }

  function selectionnerClient(clientId: string) {
    const client = clients.find((item) => item.id === clientId) || null;
    const champsChantier = champsChantierDepuisClient(client);

    setForm((ancien) => ({
      ...ancien,
      client_id: clientId,
      ...champsChantier,
    }));
  }

  function copierAdresseClientVersChantier() {
    const client = clients.find((item) => item.id === form.client_id) || null;
    const champsChantier = champsChantierDepuisClient(client);

    setForm((ancien) => ({
      ...ancien,
      ...champsChantier,
    }));
  }

  function ajouterPrestationDepuisCatalogue(prestation: PrestationCatalogue) {
    const ligneCatalogue = recalculerLigne({
      prestation_tarif_id: prestation.id,
      prestation_code: prestation.code,
      prestation_categorie_id: prestation.categorie_id,
      type_ligne: "prestation",
      prestation_categorie_nom: prestation.categorie?.nom || "",
      designation: prestation.designation,
      description: prestation.description || "",
      quantite: 1,
      unite: uniteDocumentDepuisReference(prestation.unite_reference),
      prix_unitaire_ht: Number(prestation.prix_vente_ht || 0),
      remise_pourcent: 0,
      total_brut_ht: 0,
      tva: Number(prestation.taux_tva || 0),
      total_ht: 0,
      total_tva: 0,
      total_ttc: 0,
    });

    setLignes((anciennesLignes) => {
      const indexLigneVide = anciennesLignes.findIndex(
        (ligne) =>
          ligne.type_ligne !== "section" &&
          !ligne.designation.trim() &&
          !ligne.description.trim() &&
          Number(ligne.prix_unitaire_ht || 0) === 0 &&
          !ligne.prestation_tarif_id
      );

      if (indexLigneVide >= 0) {
        return anciennesLignes.map((ligne, index) =>
          index === indexLigneVide ? ligneCatalogue : ligne
        );
      }

      return [...anciennesLignes, ligneCatalogue];
    });

    setRechercheCatalogue("");
  }

  function detacherPrestationLigne(index: number) {
    setLignes((anciennesLignes) =>
      anciennesLignes.map((ligne, ligneIndex) =>
        ligneIndex === index
          ? {
              ...ligne,
              prestation_tarif_id: null,
              prestation_code: null,
              prestation_categorie_id: null,
              prestation_categorie_nom: null,
            }
          : ligne
      )
    );
  }

  function modifierLigne(
    index: number,
    champ: keyof LigneDevisForm,
    valeur: any
  ) {
    setLignes((anciennesLignes) =>
      anciennesLignes.map((ligne, ligneIndex) => {
        if (ligneIndex !== index) return ligne;

        return recalculerLigne({
          ...ligne,
          [champ]:
            champ === "quantite" ||
            champ === "prix_unitaire_ht" ||
            champ === "remise_pourcent" ||
            champ === "tva"
              ? Number(valeur || 0)
              : valeur,
        });
      })
    );
  }

  function ajouterLigne() {
    setLignes((anciennesLignes) => [...anciennesLignes, ligneVide(tvaDefaut)]);
  }

  function ajouterSection() {
    setLignes((anciennesLignes) => [...anciennesLignes, ligneSectionVide()]);
  }

  function deplacerLigne(index: number, direction: -1 | 1) {
    setLignes((anciennesLignes) => {
      const nouvelIndex = index + direction;
      if (nouvelIndex < 0 || nouvelIndex >= anciennesLignes.length) {
        return anciennesLignes;
      }

      const copie = [...anciennesLignes];
      const [ligne] = copie.splice(index, 1);
      copie.splice(nouvelIndex, 0, ligne);
      return copie;
    });
  }

  function supprimerLigne(index: number) {
    setLignes((anciennesLignes) => {
      if (anciennesLignes.length <= 1) return anciennesLignes;
      return anciennesLignes.filter((_, ligneIndex) => ligneIndex !== index);
    });
  }

  async function enregistrerDevis(
    mode: ModeEnregistrementDocument = "brouillon"
  ) {
    const fenetreApercu =
      mode === "apercu"
        ? window.open("about:blank", "_blank")
        : null;

    try {
      setChargementAction(true);
      setMessageErreur("");
      setMessageSucces("");

      if (!entrepriseId) {
        setMessageErreur("Entreprise introuvable.");
        fenetreApercu?.close();
        return;
      }

      if (mode === "finaliser") {
        const confirmation = window.confirm(
          "Finaliser ce devis ? Une fois finalisé, son contenu sera verrouillé et ne pourra plus être modifié."
        );

        if (!confirmation) {
          fenetreApercu?.close();
          return;
        }
      }


      const lignesValides = lignes
        .map(recalculerLigne)
        .filter((ligne) => ligne.designation.trim());

      const prestationsValides = lignesValides.filter(
        (ligne) => ligne.type_ligne !== "section"
      );

      if (prestationsValides.length === 0) {
        setMessageErreur("Veuillez ajouter au moins une prestation au devis.");
        fenetreApercu?.close();
        return;
      }

      const {
        lignesCalculees,
        remise_globale_montant,
        total_ht,
        total_tva,
        total_ttc,
      } = calculerTotaux(
        lignesValides,
        form.remise_globale_pourcent
      );

      const client = clients.find((item) => item.id === form.client_id) || null;
      const clientNom = client ? nomClient(client, null) : null;

      const numeroFinal = form.numero.trim() || null;

      const payloadDevis: any = {
        entreprise_id: entrepriseId,
        client_id: form.client_id || null,
        client_nom: clientNom,
        numero: numeroFinal,
        objet: form.objet.trim() || null,
        description: form.description.trim() || null,
        adresse_chantier: form.adresse_chantier.trim() || null,
        code_postal_chantier: form.code_postal_chantier.trim() || null,
        ville_chantier: form.ville_chantier.trim() || null,
        notes_chantier: form.notes_chantier.trim() || null,
        date_devis: form.date_devis,
        date_validite: form.date_validite,
        statut: "brouillon",
        total_ht,
        total_tva,
        total_ttc,
        remise_globale_pourcent: bornerPourcentage(
          form.remise_globale_pourcent
        ),
        remise_globale_montant,
        conditions: form.conditions.trim() || null,
      };

      let devisId = devisEdition?.id || "";

      if (devisEdition) {
        const { error: devisError } = await supabase
          .from("devis")
          .update(payloadDevis)
          .eq("id", devisEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (devisError) throw devisError;

        const { error: deleteLignesError } = await supabase
          .from("devis_lignes")
          .delete()
          .eq("devis_id", devisEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (deleteLignesError) throw deleteLignesError;
      } else {
        const { data: devisCree, error: devisError } = await supabase
          .from("devis")
          .insert(payloadDevis)
          .select("id, numero")
          .single();

        if (devisError) throw devisError;

        devisId = devisCree.id;
      }

      const lignesPayload = lignesCalculees.map((ligne, index) => ({
        entreprise_id: entrepriseId,
        devis_id: devisId,
        type_ligne: ligne.type_ligne,
        prestation_tarif_id:
          ligne.type_ligne === "section"
            ? null
            : ligne.prestation_tarif_id || null,
        prestation_code: ligne.prestation_code || null,
        prestation_categorie_id: ligne.prestation_categorie_id || null,
        prestation_categorie_nom: ligne.prestation_categorie_nom || null,
        designation: ligne.designation.trim(),
        description: ligne.description.trim() || null,
        quantite: ligne.quantite,
        unite: ligne.unite || "u",
        prix_unitaire_ht: ligne.prix_unitaire_ht,
        remise_pourcent: ligne.remise_pourcent,
        total_brut_ht: ligne.total_brut_ht,
        tva: ligne.tva,
        total_ht: ligne.total_ht,
        total_tva: ligne.total_tva,
        total_ttc: ligne.total_ttc,
        ordre: index + 1,
      }));

      const { error: lignesInsertError } = await supabase
        .from("devis_lignes")
        .insert(lignesPayload);

      if (lignesInsertError) throw lignesInsertError;

      if (mode === "finaliser") {
        const { error: statutError } = await supabase
          .from("devis")
          .update({
            statut: "envoye",
          })
          .eq("id", devisId)
          .eq("entreprise_id", entrepriseId);

        if (statutError) throw statutError;
      }

      if (mode === "apercu" && fenetreApercu) {
        fenetreApercu.location.href = `/chef/devis/${devisId}/impression`;
      }

      setMessageSucces(
        mode === "finaliser"
          ? "Devis finalisé et verrouillé."
          : mode === "apercu"
            ? "Devis enregistré. Aperçu ouvert dans un nouvel onglet."
            : devisEdition
              ? "Brouillon modifié avec succès."
              : "Brouillon créé avec succès."
      );

      reinitialiserModal();
      await chargerDevis();
    } catch (error: any) {
      fenetreApercu?.close();
      console.error("Erreur enregistrement devis :", error);
      setMessageErreur(error?.message || "Impossible d’enregistrer le devis.");
    } finally {
      setChargementAction(false);
    }
  }

  async function changerStatut(item: Devis, statut: string) {
    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("devis")
        .update({ statut })
        .eq("id", item.id)
        .eq("entreprise_id", item.entreprise_id);

      if (error) throw error;

      setMessageSucces(
        `Devis marqué comme ${libelleStatut(statut).toLowerCase()}.`
      );
      await chargerDevis();
    } catch (error: any) {
      console.error("Erreur changement statut devis :", error);
      setMessageErreur(error?.message || "Impossible de modifier le statut.");
    }
  }

  async function transformerEnFacture(item: Devis) {
    try {
      setChargementAction(true);
      setMessageErreur("");
      setMessageSucces("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageErreur("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const response = await fetch("/api/devis/transformer-en-facture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          devisId: item.id,
        }),
      });

      const resultat = await response.json().catch(() => null);

      if (!response.ok || !resultat?.success) {
        throw new Error(
          resultat?.error || "Impossible de transformer le devis en facture."
        );
      }

      setMessageSucces(
        resultat.message ||
          `Facture ${resultat.numero || ""} créée depuis le devis.`
      );

      await chargerDevis();
    } catch (error: any) {
      console.error("Erreur transformation devis en facture :", error);
      setMessageErreur(
        error?.message || "Impossible de transformer le devis en facture."
      );
    } finally {
      setChargementAction(false);
    }
  }

  useEffect(() => {
    if (!devisSelectionneId || chargement) return;

    setFiltre("tous");
    setRecherche("");

    let surbrillanceTimer: number | null = null;

    const timer = window.setTimeout(() => {
      const element = document.getElementById(
        `devis-${devisSelectionneId}`
      );

      if (!element) {
        setMessageErreur(
          "Le devis demandé n’a pas été trouvé dans cette entreprise."
        );
        return;
      }

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      element.classList.add(
        "ring-4",
        "ring-emerald-400",
        "ring-offset-2"
      );

      surbrillanceTimer = window.setTimeout(() => {
        element.classList.remove(
          "ring-4",
          "ring-emerald-400",
          "ring-offset-2"
        );
      }, 4000);
    }, 350);

    return () => {
      window.clearTimeout(timer);

      if (surbrillanceTimer !== null) {
        window.clearTimeout(surbrillanceTimer);
      }
    };
  }, [devisSelectionneId, chargement, devis]);

  const totauxFormulaire = useMemo(
    () => calculerTotaux(lignes, form.remise_globale_pourcent),
    [lignes, form.remise_globale_pourcent]
  );

  const nombresParFiltre = useMemo(
    () => ({
      tous: devis.length,
      brouillon: devis.filter((item) => item.statut === "brouillon").length,
      envoye: devis.filter((item) => item.statut === "envoye").length,
      accepte: devis.filter((item) => item.statut === "accepte").length,
      facture: devis.filter((item) => item.statut === "facture").length,
      refuse: devis.filter((item) => item.statut === "refuse").length,
      archive: devis.filter((item) => item.statut === "archive").length,
    }),
    [devis]
  );

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-emerald-600" />

          <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl shadow-sm">
                  📄
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                    Documents commerciaux
                  </p>

                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Devis clients
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Créez, envoyez, imprimez et transformez vos devis en
                    factures ou en fiches d’intervention.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={ouvrirCreation}
                disabled={chargementAction}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <span aria-hidden="true">＋</span>
                Nouveau devis
              </button>
            </div>
          </div>
        </section>

        {(messageErreur || messageSucces) && (
          <div className="space-y-3">
            {messageErreur && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {messageErreur}
              </div>
            )}

            {messageSucces && (
              <div
                role="status"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
              >
                {messageSucces}
              </div>
            )}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            {
              filtre: "tous" as FiltreDevis,
              label: "Total devis",
              valeur: statistiques.total,
              icone: "📄",
              classeValeur: "text-slate-950",
            },
            {
              filtre: "brouillon" as FiltreDevis,
              label: "Brouillons",
              valeur: statistiques.brouillons,
              icone: "📝",
              classeValeur: "text-slate-950",
            },
            {
              filtre: "envoye" as FiltreDevis,
              label: "Envoyés",
              valeur: statistiques.envoyes,
              icone: "✉️",
              classeValeur: "text-blue-700",
            },
            {
              filtre: "accepte" as FiltreDevis,
              label: "Acceptés",
              valeur: statistiques.acceptes,
              icone: "✅",
              classeValeur: "text-emerald-700",
            },
            {
              filtre: "facture" as FiltreDevis,
              label: "Facturés",
              valeur: nombresParFiltre.facture,
              icone: "🧾",
              classeValeur: "text-purple-700",
            },
          ].map((carte) => (
            <button
              key={carte.filtre}
              type="button"
              onClick={() => {
                setFiltre(carte.filtre);
                setRecherche("");
              }}
              className={`rounded-3xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                filtre === carte.filtre
                  ? "border-emerald-400 ring-2 ring-emerald-100"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {carte.label}
                  </p>
                  <p className={`mt-2 text-2xl font-black ${carte.classeValeur}`}>
                    {carte.valeur}
                  </p>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-xl">
                  {carte.icone}
                </span>
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setFiltre("accepte");
              setRecherche("");
            }}
            className={`rounded-3xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              filtre === "accepte"
                ? "border-emerald-400 ring-2 ring-emerald-100"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Accepté TTC
                </p>
                <p className="mt-2 truncate text-xl font-black text-emerald-700">
                  {formatMontant(statistiques.totalAccepteTtc)}
                </p>
              </div>

              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                💶
              </span>
            </div>
          </button>
        </section>

        <section className="sticky top-3 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-lg">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </span>

              <input
                type="search"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Rechercher un devis, un client, une adresse..."
                className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="overflow-x-auto">
              <div className="flex min-w-max gap-2">
                {[
                  ["tous", "Tous"],
                  ["brouillon", "Brouillons"],
                  ["envoye", "Envoyés"],
                  ["accepte", "Acceptés"],
                  ["facture", "Facturés"],
                  ["refuse", "Refusés"],
                  ["archive", "Archives"],
                ].map(([valeur, label]) => (
                  <button
                    key={valeur}
                    type="button"
                    onClick={() => setFiltre(valeur as FiltreDevis)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      filtre === valeur
                        ? "bg-slate-950 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}{" "}
                    <span className="opacity-70">
                      ({nombresParFiltre[valeur as FiltreDevis]})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {devisFiltres.length} devis affiché(s)
            </span>

            {(recherche || filtre !== "tous") && (
              <button
                type="button"
                onClick={() => {
                  setRecherche("");
                  setFiltre("tous");
                }}
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </section>

        {chargement ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              ⏳
            </div>
            <p className="font-semibold text-slate-900">
              Chargement des devis…
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération des documents et des clients.
            </p>
          </section>
        ) : devisFiltres.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              📄
            </div>

            <p className="text-lg font-bold text-slate-950">
              Aucun devis trouvé
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Créez un devis ou modifiez les critères de recherche.
            </p>

            <button
              type="button"
              onClick={ouvrirCreation}
              className="mt-5 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Créer un devis
            </button>
          </section>
        ) : (
          <section className="space-y-4">
            {devisFiltres.map((item) => {
              const client = item.client || null;
              const emailClient = client?.email || "";
              const adresseChantier = adresseChantierTexte(item);
              const fichesLiees = item.fiches_liees || [];
              const validiteDepassee =
                dateDepassee(item.date_validite) &&
                item.statut !== "accepte" &&
                item.statut !== "facture" &&
                item.statut !== "archive";

              const messageEmailParDefaut = `Bonjour,

Veuillez trouver ci-joint votre devis ${item.numero || ""} au format PDF.

Cordialement.`;

              return (
                <article
                  id={`devis-${item.id}`}
                  key={item.id}
                  className={`scroll-mt-28 overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-500 hover:shadow-md ${
                    devisSelectionneId === item.id
                      ? "border-emerald-400"
                      : "border-slate-200"
                  }`}
                >
                  <div className={`h-1.5 ${barreStatut(item.statut)}`} />

                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-xl">
                            {iconeStatut(item.statut)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold ${classeStatut(
                                  item.statut
                                )}`}
                              >
                                {libelleStatut(item.statut)}
                              </span>

                              {fichesLiees.length > 0 && (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                  {fichesLiees.length === 1
                                    ? "1 fiche liée"
                                    : `${fichesLiees.length} fiches liées`}
                                </span>
                              )}

                              {devisSelectionneId === item.id && (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                  Devis sélectionné
                                </span>
                              )}

                              {validiteDepassee && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                  Validité dépassée
                                </span>
                              )}
                            </div>

                            <h2 className="mt-3 break-words text-xl font-black text-slate-950">
                              {item.numero || "Sans numéro"}
                            </h2>

                            <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                              {item.objet || "Sans objet"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {nomClient(client, item)}
                            </p>
                          </div>
                        </div>

                        {(adresseChantier || item.notes_chantier) && (
                          <div className="mt-4 grid gap-2 lg:grid-cols-2">
                            {adresseChantier && (
                              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                                <span className="font-bold">📍 Chantier :</span>{" "}
                                {adresseChantier}
                              </div>
                            )}

                            {item.notes_chantier && (
                              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                                <span className="font-bold">⚠️ Notes :</span>{" "}
                                {item.notes_chantier}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-400">
                              Date du devis
                            </p>
                            <p className="mt-1 font-bold text-slate-900">
                              {formatDate(item.date_devis)}
                            </p>
                          </div>

                          <div
                            className={`rounded-2xl p-3 ${
                              validiteDepassee
                                ? "bg-amber-50"
                                : "bg-slate-50"
                            }`}
                          >
                            <p className="text-xs font-medium text-slate-400">
                              Date de validité
                            </p>
                            <p
                              className={`mt-1 font-bold ${
                                validiteDepassee
                                  ? "text-amber-800"
                                  : "text-slate-900"
                              }`}
                            >
                              {formatDate(item.date_validite)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-400">
                              Total HT
                            </p>
                            <p className="mt-1 font-bold text-slate-900">
                              {formatMontant(item.total_ht)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-emerald-50 p-3">
                            <p className="text-xs font-medium text-emerald-600">
                              Total TTC
                            </p>
                            <p className="mt-1 text-lg font-black text-emerald-800">
                              {formatMontant(item.total_ttc)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full xl:max-w-md">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <BoutonTelechargerDocumentPdf
                            typeDocument="devis"
                            documentId={item.id}
                            numero={item.numero}
                          />

                          <Link
                            href={`/chef/devis/${item.id}/impression`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            Imprimer
                          </Link>

                          <BoutonEnvoyerDocumentEmail
                            typeDocument="devis"
                            documentId={item.id}
                            numero={item.numero}
                            defaultEmail={emailClient}
                            defaultMessage={messageEmailParDefaut}
                            onEnvoye={chargerDevis}
                          />

                          <HistoriqueEmailsDocument
                            typeDocument="devis"
                            documentId={item.id}
                            numero={item.numero}
                          />
                        </div>

                        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                            Chantier et documents liés
                          </p>

                          <div className="grid gap-2">
                            <BoutonCreerFicheInterventionDepuisDevis
                              devisId={item.id}
                              statut={item.statut}
                              factureLiee={item.facture_liee || null}
                            />

                            {fichesLiees.length > 0 ? (
                              <div className="grid gap-2">
                                {fichesLiees.map((fiche) => (
                                  <Link
                                    key={fiche.id}
                                    href={`/chef/interventions/${fiche.id}`}
                                    className="rounded-xl border border-emerald-200 bg-white px-3 py-3 transition hover:bg-emerald-50"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-xs font-black text-emerald-800">
                                          {titreFicheLiee(fiche)}
                                        </p>

                                        <p className="mt-1 text-[11px] text-slate-500">
                                          {fiche.numero
                                            ? `${fiche.numero} · `
                                            : ""}
                                          {formatDate(
                                            fiche.date_prevue ||
                                              fiche.date_intervention
                                          )}
                                        </p>
                                      </div>

                                      <span
                                        className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${classeStatutFiche(
                                          fiche.statut
                                        )}`}
                                      >
                                        {libelleStatutFiche(fiche.statut)}
                                      </span>
                                    </div>

                                    <p className="mt-2 text-[11px] font-semibold text-emerald-700">
                                      Ouvrir la fiche →
                                    </p>
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2.5 text-center text-[11px] font-medium text-slate-400">
                                Aucune fiche d’intervention liée à ce devis
                              </div>
                            )}

                            {item.facture_liee && (
                              <Link
                                href={`/chef/factures?factureId=${item.facture_liee.id}`}
                                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-medium text-purple-700 transition hover:bg-purple-50"
                              >
                                Voir facture {item.facture_liee.numero || ""}
                              </Link>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {item.statut === "brouillon" && (
                            <button
                              type="button"
                              onClick={() => void ouvrirEdition(item)}
                              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              Modifier
                            </button>
                          )}

                          {item.statut === "envoye" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void changerStatut(item, "accepte")
                                }
                                className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                              >
                                Accepter
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void changerStatut(item, "refuse")
                                }
                                className="min-h-10 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                              >
                                Refuser
                              </button>
                            </>
                          )}

                          {item.statut === "accepte" && (
                            <button
                              type="button"
                              onClick={() => void transformerEnFacture(item)}
                              disabled={chargementAction}
                              className="min-h-10 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                            >
                              Transformer en facture
                            </button>
                          )}

                          {item.statut !== "archive" && (
                            <button
                              type="button"
                              onClick={() => void changerStatut(item, "archive")}
                              className="min-h-10 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                            >
                              Archiver
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {modalOuverte && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm">
            <div className="flex h-full flex-col bg-slate-100">
              <header className="z-40 border-b border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={fermerModal}
                      disabled={chargementAction}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                      aria-label="Fermer l’éditeur"
                    >
                      ×
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-black text-slate-950 sm:text-xl">
                          {devisEdition ? "Modifier le devis" : "Nouveau devis"}
                        </h2>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Éditeur document
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Modifiez le document à gauche et ses paramètres à droite.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600">
                      Brouillon modifiable
                    </span>

                    <button
                      type="button"
                      onClick={() => void enregistrerDevis("brouillon")}
                      disabled={chargementAction}
                      className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {chargementAction ? "Enregistrement…" : "Enregistrer"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void enregistrerDevis("apercu")}
                      disabled={chargementAction}
                      className="min-h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Aperçu
                    </button>

                    <button
                      type="button"
                      onClick={() => void enregistrerDevis("finaliser")}
                      disabled={chargementAction}
                      className="min-h-10 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Finaliser
                    </button>
                  </div>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto grid max-w-[1700px] gap-5 p-3 sm:p-5 xl:grid-cols-[minmax(0,1fr)_390px]">
                  <main className="min-w-0">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Document
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Aperçu et édition en direct
                        </p>
                      </div>

                      <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
                        <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                          A4
                        </span>
                        <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                          EUR
                        </span>
                      </div>
                    </div>

                    <section className="mx-auto min-h-[1050px] max-w-[1050px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
                      <div className="h-2 bg-emerald-600" />

                      <div className="space-y-7 p-5 sm:p-8 lg:p-10">
                        <div className="grid gap-6 border-b border-slate-200 pb-7 md:grid-cols-[1fr_auto]">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                              Émetteur
                            </p>
                            <h3 className="mt-2 text-xl font-black text-slate-950">
                              Votre entreprise
                            </h3>
                            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                              Les coordonnées, le logo, les mentions légales et le
                              design final sont repris automatiquement depuis les
                              paramètres Arboboard.
                            </p>
                          </div>

                          <div className="text-left md:min-w-56 md:text-right">
                            <p className="text-3xl font-black tracking-tight text-slate-950">
                              DEVIS
                            </p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                              {form.numero || "Numéro généré à l’enregistrement"}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                              Destinataire
                            </p>
                            <p className="mt-2 text-base font-black text-slate-950">
                              {nomClient(
                                clients.find((client) => client.id === form.client_id) || null,
                                null
                              )}
                            </p>
                            {(() => {
                              const client = clients.find(
                                (item) => item.id === form.client_id
                              );
                              if (!client) {
                                return (
                                  <p className="mt-1 text-xs text-slate-400">
                                    Sélectionnez un client dans le panneau de droite.
                                  </p>
                                );
                              }

                              return (
                                <div className="mt-2 space-y-0.5 text-xs leading-5 text-slate-500">
                                  <p>{client.adresse || "Adresse non renseignée"}</p>
                                  <p>
                                    {[client.code_postal, client.ville]
                                      .filter(Boolean)
                                      .join(" ") || "Ville non renseignée"}
                                  </p>
                                  {client.email && <p>{client.email}</p>}
                                </div>
                              );
                            })()}
                          </div>

                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                              <div>
                                <p className="font-bold uppercase tracking-wide text-slate-400">
                                  Date
                                </p>
                                <p className="mt-1 font-black text-slate-800">
                                  {formatDate(form.date_devis)}
                                </p>
                              </div>
                              <div>
                                <p className="font-bold uppercase tracking-wide text-slate-400">
                                  Valable jusqu’au
                                </p>
                                <p className="mt-1 font-black text-slate-800">
                                  {formatDate(form.date_validite)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 border-t border-slate-100 pt-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Chantier
                              </p>
                              <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">
                                {[form.adresse_chantier, form.code_postal_chantier, form.ville_chantier]
                                  .filter(Boolean)
                                  .join(", ") || "Adresse à renseigner"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Objet du devis · facultatif
                          </label>
                          <input
                            value={form.objet}
                            onChange={(event) =>
                              setForm((ancien) => ({
                                ...ancien,
                                objet: event.target.value,
                              }))
                            }
                            placeholder="Ex. Taille de haie, élagage, création paysagère…"
                            className="mt-2 w-full border-0 border-b-2 border-slate-200 bg-transparent px-0 py-2 text-xl font-black text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-emerald-500"
                          />

                          <textarea
                            value={form.description}
                            onChange={(event) =>
                              setForm((ancien) => ({
                                ...ancien,
                                description: event.target.value,
                              }))
                            }
                            rows={2}
                            placeholder="Description générale du devis…"
                            className="mt-2 w-full resize-y rounded-xl border border-transparent bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600 outline-none transition focus:border-emerald-200 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                          />
                        </div>

                        <section>
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Prestations
                              </p>
                              <h3 className="mt-1 text-base font-black text-slate-950">
                                Lignes du devis
                              </h3>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={ajouterSection}
                                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                              >
                                + Section
                              </button>
                              <button
                                type="button"
                                onClick={ajouterLigne}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                              >
                                + Ligne manuelle
                              </button>
                            </div>
                          </div>

                          {prestationsCatalogue.length > 0 && (
                            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-emerald-900">
                                    Rechercher dans Prestations & tarifs
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-emerald-700">
                                    Code, désignation ou catégorie. Le catalogue reste facultatif.
                                  </p>
                                </div>

                                <div className="relative w-full sm:max-w-sm">
                                  <input
                                    value={rechercheCatalogue}
                                    onChange={(event) =>
                                      setRechercheCatalogue(event.target.value)
                                    }
                                    placeholder="ABA001, élagage, tonte…"
                                    autoComplete="off"
                                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 pr-9 text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                                  />
                                  {rechercheCatalogue.trim() && (
                                    <button
                                      type="button"
                                      onClick={() => setRechercheCatalogue("")}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-1.5 py-0.5 text-xs font-black text-slate-400 hover:bg-slate-100"
                                      aria-label="Effacer"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>

                              {rechercheCatalogue.trim() && (
                                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-emerald-200 bg-white shadow-lg">
                                  {prestationsCatalogueFiltrees.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                      {prestationsCatalogueFiltrees.map((prestation) => (
                                        <button
                                          key={prestation.id}
                                          type="button"
                                          onClick={() =>
                                            ajouterPrestationDepuisCatalogue(prestation)
                                          }
                                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-emerald-50"
                                        >
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                                                {prestation.code}
                                              </span>
                                              <span className="truncate text-xs font-black text-slate-900">
                                                {prestation.designation}
                                              </span>
                                            </div>
                                            <p className="mt-1 truncate text-[10px] text-slate-500">
                                              {prestation.categorie?.nom || "Sans catégorie"}
                                              {" · "}
                                              {uniteDocumentDepuisReference(
                                                prestation.unite_reference
                                              )}
                                              {" · TVA "}
                                              {Number(prestation.taux_tva || 0)} %
                                            </p>
                                          </div>
                                          <span className="shrink-0 text-xs font-black text-slate-900">
                                            {formatMontant(prestation.prix_vente_ht)} HT
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="px-3 py-3 text-xs text-slate-500">
                                      Aucun résultat.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="overflow-hidden rounded-2xl border border-slate-200">
                            <div className="hidden grid-cols-[minmax(220px,1fr)_70px_72px_100px_78px_76px_112px_88px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400 lg:grid">
                              <span>Prestation</span>
                              <span>Qté</span>
                              <span>Unité</span>
                              <span>PU HT</span>
                              <span>Remise</span>
                              <span>TVA</span>
                              <span className="text-right">TTC</span>
                              <span className="text-center">Ordre</span>
                            </div>

                            <div className="divide-y divide-slate-200">
                              {lignes.map((ligne, index) => {
                                if (ligne.type_ligne === "section") {
                                  const sousTotal = sousTotalSection(lignes, index);

                                  return (
                                    <div
                                      key={`section-${ligne.id || index}`}
                                      className="bg-emerald-50/70 p-3"
                                    >
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="rounded-lg bg-emerald-600 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                                              Section
                                            </span>
                                            <input
                                              value={ligne.designation}
                                              onChange={(event) =>
                                                modifierLigne(
                                                  index,
                                                  "designation",
                                                  event.target.value
                                                )
                                              }
                                              placeholder="Titre de la section"
                                              className="min-w-0 flex-1 border-0 border-b border-emerald-200 bg-transparent px-1 py-1 text-sm font-black text-emerald-950 outline-none focus:border-emerald-500"
                                            />
                                          </div>

                                          <input
                                            value={ligne.description}
                                            onChange={(event) =>
                                              modifierLigne(
                                                index,
                                                "description",
                                                event.target.value
                                              )
                                            }
                                            placeholder="Description facultative de la section"
                                            className="mt-2 w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-emerald-800 outline-none hover:border-emerald-200 focus:border-emerald-400 focus:bg-white"
                                          />
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                          <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-right">
                                            <p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">
                                              Sous-total HT
                                            </p>
                                            <p className="mt-0.5 text-sm font-black text-emerald-950">
                                              {formatMontant(sousTotal)}
                                            </p>
                                          </div>

                                          <div className="grid grid-cols-3 gap-1">
                                            <button
                                              type="button"
                                              onClick={() => deplacerLigne(index, -1)}
                                              disabled={index === 0}
                                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-white text-xs font-black text-emerald-700 disabled:opacity-30"
                                            >
                                              ↑
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => deplacerLigne(index, 1)}
                                              disabled={index === lignes.length - 1}
                                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-white text-xs font-black text-emerald-700 disabled:opacity-30"
                                            >
                                              ↓
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => supprimerLigne(index)}
                                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-xs font-black text-red-500 hover:bg-red-50"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={ligne.id || `ligne-${index}`}
                                    className="grid gap-2 bg-white p-3 lg:grid-cols-[minmax(220px,1fr)_70px_72px_100px_78px_76px_112px_88px] lg:items-start"
                                  >
                                    <div className="min-w-0">
                                      {ligne.prestation_tarif_id && (
                                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                                            {ligne.prestation_code || "Prestation"}
                                          </span>
                                          {ligne.prestation_categorie_nom && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                                              {ligne.prestation_categorie_nom}
                                            </span>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => detacherPrestationLigne(index)}
                                            className="text-[9px] font-bold text-slate-400 underline underline-offset-2 hover:text-slate-700"
                                          >
                                            Ligne libre
                                          </button>
                                        </div>
                                      )}

                                      <input
                                        value={ligne.designation}
                                        onChange={(event) =>
                                          modifierLigne(
                                            index,
                                            "designation",
                                            event.target.value
                                          )
                                        }
                                        placeholder="Désignation"
                                        className="w-full rounded-lg border border-transparent px-2 py-1.5 text-sm font-black text-slate-900 outline-none hover:border-slate-200 focus:border-emerald-400"
                                      />
                                      <textarea
                                        value={ligne.description}
                                        onChange={(event) =>
                                          modifierLigne(
                                            index,
                                            "description",
                                            event.target.value
                                          )
                                        }
                                        rows={2}
                                        placeholder="Description"
                                        className="mt-1 w-full resize-y rounded-lg border border-transparent px-2 py-1.5 text-xs leading-5 text-slate-500 outline-none hover:border-slate-200 focus:border-emerald-400"
                                      />
                                    </div>

                                    <div>
                                      <label className="mb-1 block text-[10px] font-bold text-slate-400 lg:hidden">
                                        Quantité
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={ligne.quantite}
                                        onChange={(event) =>
                                          modifierLigne(index, "quantite", event.target.value)
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-emerald-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="mb-1 block text-[10px] font-bold text-slate-400 lg:hidden">
                                        Unité
                                      </label>
                                      <input
                                        value={ligne.unite}
                                        onChange={(event) =>
                                          modifierLigne(index, "unite", event.target.value)
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-emerald-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="mb-1 block text-[10px] font-bold text-slate-400 lg:hidden">
                                        PU HT
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={ligne.prix_unitaire_ht}
                                        onChange={(event) =>
                                          modifierLigne(
                                            index,
                                            "prix_unitaire_ht",
                                            event.target.value
                                          )
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-emerald-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="mb-1 block text-[10px] font-bold text-slate-400 lg:hidden">
                                        Remise %
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={ligne.remise_pourcent}
                                        onChange={(event) =>
                                          modifierLigne(
                                            index,
                                            "remise_pourcent",
                                            event.target.value
                                          )
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-emerald-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="mb-1 block text-[10px] font-bold text-slate-400 lg:hidden">
                                        TVA %
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={ligne.tva}
                                        onChange={(event) =>
                                          modifierLigne(index, "tva", event.target.value)
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-emerald-500"
                                      />
                                    </div>

                                    <div>
                                      <div className="flex h-9 items-center justify-end rounded-lg bg-slate-50 px-2 text-xs font-black text-slate-900">
                                        {formatMontant(ligne.total_ttc)}
                                      </div>
                                      {ligne.remise_pourcent > 0 && (
                                        <p className="mt-1 text-right text-[9px] font-semibold text-emerald-600">
                                          -{ligne.remise_pourcent} %
                                        </p>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-1">
                                      <button
                                        type="button"
                                        onClick={() => deplacerLigne(index, -1)}
                                        disabled={index === 0}
                                        className="flex h-9 items-center justify-center rounded-lg border border-slate-200 text-xs font-black text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                                        aria-label="Monter la ligne"
                                      >
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deplacerLigne(index, 1)}
                                        disabled={index === lignes.length - 1}
                                        className="flex h-9 items-center justify-center rounded-lg border border-slate-200 text-xs font-black text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                                        aria-label="Descendre la ligne"
                                      >
                                        ↓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => supprimerLigne(index)}
                                        className="flex h-9 items-center justify-center rounded-lg border border-red-100 text-xs font-black text-red-500 transition hover:bg-red-50"
                                        aria-label="Supprimer la ligne"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </section>

                        <div className="grid gap-5 md:grid-cols-[1fr_320px]">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                              Conditions
                            </label>
                            <textarea
                              value={form.conditions}
                              onChange={(event) =>
                                setForm((ancien) => ({
                                  ...ancien,
                                  conditions: event.target.value,
                                }))
                              }
                              rows={7}
                              placeholder="Conditions particulières, modalités d’acceptation…"
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                            />
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                              Récapitulatif
                            </p>

                            <div className="mt-4 space-y-2.5 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Total brut HT</span>
                                <span className="font-black text-slate-900">
                                  {formatMontant(totauxFormulaire.total_brut_ht)}
                                </span>
                              </div>

                              {totauxFormulaire.remise_lignes_montant > 0 && (
                                <div className="flex items-center justify-between text-emerald-700">
                                  <span>Remises lignes</span>
                                  <span className="font-black">
                                    -{formatMontant(totauxFormulaire.remise_lignes_montant)}
                                  </span>
                                </div>
                              )}

                              {totauxFormulaire.remise_globale_montant > 0 && (
                                <div className="flex items-center justify-between text-emerald-700">
                                  <span>
                                    Remise globale ({totauxFormulaire.remise_globale_pourcent} %)
                                  </span>
                                  <span className="font-black">
                                    -{formatMontant(totauxFormulaire.remise_globale_montant)}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                                <span className="text-slate-500">Total HT</span>
                                <span className="font-black text-slate-900">
                                  {formatMontant(totauxFormulaire.total_ht)}
                                </span>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                  Récapitulatif TVA
                                </p>
                                <div className="mt-2 space-y-1.5">
                                  {totauxFormulaire.recap_tva.map((ligneTva) => (
                                    <div
                                      key={ligneTva.taux}
                                      className="flex items-center justify-between gap-2 text-[11px]"
                                    >
                                      <span className="text-slate-500">
                                        TVA {ligneTva.taux} % · base {formatMontant(ligneTva.base_ht)}
                                      </span>
                                      <span className="font-black text-slate-800">
                                        {formatMontant(ligneTva.montant_tva)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Total TVA</span>
                                <span className="font-black text-slate-900">
                                  {formatMontant(totauxFormulaire.total_tva)}
                                </span>
                              </div>

                              <div className="border-t border-slate-200 pt-3">
                                <div className="flex items-end justify-between gap-3">
                                  <span className="font-black text-slate-950">
                                    Total TTC
                                  </span>
                                  <span className="text-2xl font-black tracking-tight text-emerald-700">
                                    {formatMontant(totauxFormulaire.total_ttc)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-5 text-center text-[10px] leading-5 text-slate-400">
                          Aperçu de travail. Le PDF final appliquera le logo, les
                          couleurs et les mentions configurées dans Paramètres.
                        </div>
                      </div>
                    </section>
                  </main>

                  <aside className="min-w-0 xl:sticky xl:top-5 xl:self-start">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Paramètres du devis
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Informations générales et chantier
                        </p>
                      </div>

                      <div className="max-h-[calc(100vh-155px)] space-y-5 overflow-y-auto p-4">
                        <section className="space-y-3">
                          <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">
                            Document
                          </h3>

                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-500">
                              Client
                            </label>
                            <select
                              value={form.client_id}
                              onChange={(event) =>
                                selectionnerClient(event.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                            >
                              <option value="">Client non renseigné</option>
                              {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                  {nomClient(client, null)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <ChampNumeroDocumentVerrouille
                            typeDocument="devis"
                            numero={form.numero}
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-slate-500">
                                Date
                              </label>
                              <input
                                type="date"
                                value={form.date_devis}
                                onChange={(event) =>
                                  setForm((ancien) => ({
                                    ...ancien,
                                    date_devis: event.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 px-2.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-bold text-slate-500">
                                Validité
                              </label>
                              <input
                                type="date"
                                value={form.date_validite}
                                onChange={(event) =>
                                  setForm((ancien) => ({
                                    ...ancien,
                                    date_validite: event.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 px-2.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-500">
                              Remise globale %
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={form.remise_globale_pourcent}
                                onChange={(event) =>
                                  setForm((ancien) => ({
                                    ...ancien,
                                    remise_globale_pourcent: bornerPourcentage(
                                      event.target.value
                                    ),
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-9 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                                %
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] leading-4 text-slate-400">
                              Appliquée après les remises de chaque ligne.
                            </p>
                          </div>

                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-black text-amber-900">
                              Cycle du document
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-amber-800">
                              « Enregistrer » conserve le devis en brouillon. « Aperçu »
                              enregistre le brouillon puis ouvre l’impression. « Finaliser »
                              passe le devis en envoyé et verrouille définitivement son contenu.
                            </p>
                          </div>
                        </section>

                        <section className="space-y-3 border-t border-slate-200 pt-5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">
                              Chantier
                            </h3>
                            <button
                              type="button"
                              onClick={copierAdresseClientVersChantier}
                              disabled={!form.client_id}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                            >
                              Copier client
                            </button>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-500">
                              Adresse
                            </label>
                            <input
                              value={form.adresse_chantier}
                              onChange={(event) =>
                                setForm((ancien) => ({
                                  ...ancien,
                                  adresse_chantier: event.target.value,
                                }))
                              }
                              placeholder="Adresse du chantier"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-slate-500">
                                Code postal
                              </label>
                              <input
                                value={form.code_postal_chantier}
                                onChange={(event) =>
                                  setForm((ancien) => ({
                                    ...ancien,
                                    code_postal_chantier: event.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-slate-500">
                                Ville
                              </label>
                              <input
                                value={form.ville_chantier}
                                onChange={(event) =>
                                  setForm((ancien) => ({
                                    ...ancien,
                                    ville_chantier: event.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-500">
                              Notes chantier
                            </label>
                            <textarea
                              value={form.notes_chantier}
                              onChange={(event) =>
                                setForm((ancien) => ({
                                  ...ancien,
                                  notes_chantier: event.target.value,
                                }))
                              }
                              rows={4}
                              placeholder="Accès, contraintes, stationnement…"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-5 outline-none focus:border-emerald-500"
                            />
                          </div>
                        </section>

                        <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                          <p className="text-xs font-black text-emerald-900">
                            Design du PDF
                          </p>
                          <p className="mt-1 text-[11px] leading-5 text-emerald-700">
                            Le modèle, le logo, les couleurs et la disposition sont
                            ceux définis dans Paramètres → Design des devis et factures.
                          </p>
                          <Link
                            href="/chef/parametres"
                            className="mt-2 inline-flex text-[11px] font-black text-emerald-800 underline underline-offset-2"
                          >
                            Ouvrir les paramètres
                          </Link>
                        </section>
                      </div>

                      <div className="border-t border-slate-200 bg-white p-4">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={fermerModal}
                            disabled={chargementAction}
                            className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            Annuler
                          </button>

                          <button
                            type="button"
                            onClick={() => void enregistrerDevis("brouillon")}
                            disabled={chargementAction}
                            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            {chargementAction ? "Enregistrement…" : "Enregistrer"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void enregistrerDevis("apercu")}
                            disabled={chargementAction}
                            className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Aperçu
                          </button>

                          <button
                            type="button"
                            onClick={() => void enregistrerDevis("finaliser")}
                            disabled={chargementAction}
                            className="min-h-11 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Finaliser
                          </button>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChargementPageDevis() {
  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            ⏳
          </div>

          <p className="font-semibold text-slate-900">
            Chargement des devis…
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Préparation de la page et des paramètres de navigation.
          </p>
        </section>
      </div>
    </div>
  );
}

export default function PageDevis() {
  return (
    <Suspense fallback={<ChargementPageDevis />}>
      <ContenuPageDevis />
    </Suspense>
  );
}