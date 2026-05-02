"use client";

import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import BoutonEnvoyerDocumentEmail from "@/components/documents/BoutonEnvoyerDocumentEmail";

type StatutDevis = "brouillon" | "envoye" | "accepte" | "refuse" | "archive";

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
  statut?: string | null;
};

type Devis = {
  id: string;
  entreprise_id: string;
  client_id: string | null;
  client_nom: string | null;
  numero: string | null;
  objet: string | null;
  description: string | null;
  statut: string | null;
  date_devis: string | null;
  date_validite: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  conditions: string | null;
  notes_internes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LigneDevis = {
  id: string;
  devis_id: string;
  entreprise_id: string;
  ordre: number | null;
  designation: string | null;
  description: string | null;
  quantite: number | null;
  unite: string | null;
  prix_unitaire_ht: number | null;
  tva: number | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
};

type DevisAvecLignes = Devis & {
  lignes: LigneDevis[];
};

type EntrepriseParametres = {
  tva_defaut?: number | null;
  acompte_defaut?: number | null;
  validite_devis_jours?: number | null;
  prefixe_devis?: string | null;
  numerotation_devis_auto?: boolean | null;
  conditions_devis?: string | null;
};

type LigneFormulaire = {
  designation: string;
  description: string;
  quantite: string;
  unite: string;
  prix_unitaire_ht: string;
  tva: string;
};

type FormulaireDevis = {
  client_id: string;
  numero: string;
  objet: string;
  description: string;
  statut: StatutDevis;
  date_devis: string;
  date_validite: string;
  conditions: string;
  notes_internes: string;
  lignes: LigneFormulaire[];
};

const CONDITIONS_DEVIS_DEFAUT =
  "Devis valable pendant la durée indiquée. Acompte de 30 % à la signature sauf indication contraire. Les travaux seront réalisés selon les conditions précisées dans le devis.";

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

function dateDansJours(jours: number) {
  const date = new Date();
  date.setDate(date.getDate() + jours);
  return date.toISOString().slice(0, 10);
}

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nettoyerDate(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nombreDepuisTexte(valeur: string | number | null | undefined) {
  if (typeof valeur === "number") {
    return Number.isFinite(valeur) ? valeur : 0;
  }

  const texte = String(valeur || "")
    .replace(",", ".")
    .replace(/\s/g, "")
    .trim();

  const nombre = Number.parseFloat(texte);

  return Number.isFinite(nombre) ? nombre : 0;
}

function arrondir2(nombre: number) {
  return Math.round((nombre + Number.EPSILON) * 100) / 100;
}

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
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return "—";
  }
}

function nomClient(client: Client | null | undefined) {
  if (!client) return "Client non renseigné";

  if (client.type_client === "particulier") {
    const complet = `${client.prenom || ""} ${client.nom || ""}`.trim();
    return complet || "Client particulier";
  }

  return (
    client.entreprise ||
    client.nom ||
    `${client.prenom || ""} ${client.nom || ""}`.trim() ||
    "Client professionnel"
  );
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "envoye") return "Envoyé";
  if (statut === "accepte") return "Accepté";
  if (statut === "refuse") return "Refusé";
  if (statut === "archive") return "Archivé";
  return "Brouillon";
}

function badgeStatut(statut: string | null | undefined) {
  if (statut === "envoye") return "bg-blue-50 text-blue-700 border-blue-200";
  if (statut === "accepte")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (statut === "refuse") return "bg-red-50 text-red-700 border-red-200";
  if (statut === "archive")
    return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function calculerLigne(ligne: LigneFormulaire) {
  const quantite = nombreDepuisTexte(ligne.quantite);
  const prixUnitaire = nombreDepuisTexte(ligne.prix_unitaire_ht);
  const tauxTva = nombreDepuisTexte(ligne.tva);

  const totalHt = arrondir2(quantite * prixUnitaire);
  const totalTva = arrondir2(totalHt * (tauxTva / 100));
  const totalTtc = arrondir2(totalHt + totalTva);

  return {
    quantite,
    prixUnitaire,
    tauxTva,
    totalHt,
    totalTva,
    totalTtc,
  };
}

function calculerTotaux(lignes: LigneFormulaire[]) {
  return lignes.reduce(
    (acc, ligne) => {
      const calcul = calculerLigne(ligne);

      return {
        totalHt: arrondir2(acc.totalHt + calcul.totalHt),
        totalTva: arrondir2(acc.totalTva + calcul.totalTva),
        totalTtc: arrondir2(acc.totalTtc + calcul.totalTtc),
      };
    },
    {
      totalHt: 0,
      totalTva: 0,
      totalTtc: 0,
    }
  );
}

function ligneEstValide(ligne: LigneFormulaire) {
  return ligne.designation.trim().length > 0;
}

function ligneVide(tva = 20): LigneFormulaire {
  return {
    designation: "",
    description: "",
    quantite: "1",
    unite: "u",
    prix_unitaire_ht: "0",
    tva: String(tva),
  };
}

function formulaireVide(parametres: EntrepriseParametres | null): FormulaireDevis {
  const tva = parametres?.tva_defaut ?? 20;
  const validite = parametres?.validite_devis_jours ?? 30;

  return {
    client_id: "",
    numero: "",
    objet: "",
    description: "",
    statut: "brouillon",
    date_devis: dateDuJour(),
    date_validite: dateDansJours(validite),
    conditions: parametres?.conditions_devis || CONDITIONS_DEVIS_DEFAUT,
    notes_internes: "",
    lignes: [ligneVide(tva)],
  };
}

export default function DevisPage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [devis, setDevis] = useState<DevisAvecLignes[]>([]);
  const [parametres, setParametres] = useState<EntrepriseParametres | null>(null);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<"tous" | StatutDevis>("tous");

  const [modalOuverte, setModalOuverte] = useState(false);
  const [devisEdition, setDevisEdition] = useState<DevisAvecLignes | null>(null);
  const [formulaire, setFormulaire] = useState<FormulaireDevis>(() =>
    formulaireVide(null)
  );

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

      const idEntreprise = resultat.contexte.entreprise.id as string;
      setEntrepriseId(idEntreprise);

      const params = await chargerParametres(idEntreprise);
      setParametres(params);

      await Promise.all([chargerClients(idEntreprise), chargerDevis(idEntreprise)]);
    } catch (error) {
      console.error("Erreur initialisation devis :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerParametres(idEntreprise = entrepriseId) {
    if (!idEntreprise) return null;

    const { data, error } = await supabase
      .from("entreprise_parametres")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .maybeSingle();

    if (error) {
      console.error("Erreur chargement paramètres devis :", error);
      return null;
    }

    return (data || null) as EntrepriseParametres | null;
  }

  async function chargerClients(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .neq("statut", "archive")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement clients :", error);
      setMessageErreur(error.message || "Impossible de charger les clients.");
      return;
    }

    setClients((data || []) as Client[]);
  }

  async function chargerDevis(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data: devisData, error: devisError } = await supabase
      .from("devis")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (devisError) {
      console.error("Erreur chargement devis :", devisError);
      setMessageErreur(devisError.message || "Impossible de charger les devis.");
      return;
    }

    const devisListe = (devisData || []) as Devis[];
    const devisIds = devisListe.map((item) => item.id);

    if (devisIds.length === 0) {
      setDevis([]);
      return;
    }

    const { data: lignesData, error: lignesError } = await supabase
      .from("devis_lignes")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .in("devis_id", devisIds)
      .order("ordre", { ascending: true });

    if (lignesError) {
      console.error("Erreur chargement lignes devis :", lignesError);
      setMessageErreur(
        lignesError.message || "Impossible de charger les lignes de devis."
      );
      return;
    }

    const lignes = (lignesData || []) as LigneDevis[];

    const devisAvecLignes = devisListe.map((item) => ({
      ...item,
      lignes: lignes.filter((ligne) => ligne.devis_id === item.id),
    }));

    setDevis(devisAvecLignes);
  }

  const statistiques = useMemo(() => {
    const totalTtc = devis.reduce(
      (total, item) => total + Number(item.total_ttc || 0),
      0
    );

    const accepteTtc = devis
      .filter((item) => item.statut === "accepte")
      .reduce((total, item) => total + Number(item.total_ttc || 0), 0);

    return {
      total: devis.length,
      brouillons: devis.filter((item) => item.statut === "brouillon").length,
      envoyes: devis.filter((item) => item.statut === "envoye").length,
      acceptes: devis.filter((item) => item.statut === "accepte").length,
      refuses: devis.filter((item) => item.statut === "refuse").length,
      totalTtc,
      accepteTtc,
    };
  }, [devis]);

  const devisFiltres = useMemo(() => {
    const texte = recherche.trim().toLowerCase();

    return devis.filter((item) => {
      const statut = item.statut || "brouillon";
      const correspondStatut = filtreStatut === "tous" || statut === filtreStatut;

      const zoneRecherche = [
        item.numero,
        item.client_nom,
        item.objet,
        item.description,
        item.conditions,
        item.notes_internes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const correspondRecherche =
        texte.length === 0 || zoneRecherche.includes(texte);

      return correspondStatut && correspondRecherche;
    });
  }, [devis, recherche, filtreStatut]);

  const totauxFormulaire = useMemo(() => {
    return calculerTotaux(formulaire.lignes);
  }, [formulaire.lignes]);

  function trouverClient(clientId: string | null | undefined) {
    if (!clientId) return null;
    return clients.find((client) => client.id === clientId) || null;
  }

  function ouvrirCreation() {
    setDevisEdition(null);
    setFormulaire(formulaireVide(parametres));
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function ouvrirEdition(item: DevisAvecLignes) {
    setDevisEdition(item);

    const tva = parametres?.tva_defaut ?? 20;

    const lignesFormulaire =
      item.lignes.length > 0
        ? item.lignes.map((ligne) => ({
            designation: ligne.designation || "",
            description: ligne.description || "",
            quantite: String(ligne.quantite ?? 1),
            unite: ligne.unite || "u",
            prix_unitaire_ht: String(ligne.prix_unitaire_ht ?? 0),
            tva: String(ligne.tva ?? tva),
          }))
        : [ligneVide(tva)];

    setFormulaire({
      client_id: item.client_id || "",
      numero: item.numero || "",
      objet: item.objet || "",
      description: item.description || "",
      statut: (item.statut as StatutDevis) || "brouillon",
      date_devis: item.date_devis || dateDuJour(),
      date_validite:
        item.date_validite ||
        dateDansJours(parametres?.validite_devis_jours ?? 30),
      conditions:
        item.conditions || parametres?.conditions_devis || CONDITIONS_DEVIS_DEFAUT,
      notes_internes: item.notes_internes || "",
      lignes: lignesFormulaire,
    });

    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function fermerModal() {
    if (enregistrement) return;

    setModalOuverte(false);
    setDevisEdition(null);
    setFormulaire(formulaireVide(parametres));
  }

  function modifierChamp(champ: keyof Omit<FormulaireDevis, "lignes">, valeur: string) {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function modifierLigne(index: number, champ: keyof LigneFormulaire, valeur: string) {
    setFormulaire((ancien) => ({
      ...ancien,
      lignes: ancien.lignes.map((ligne, ligneIndex) =>
        ligneIndex === index
          ? {
              ...ligne,
              [champ]: valeur,
            }
          : ligne
      ),
    }));
  }

  function ajouterLigne() {
    setFormulaire((ancien) => ({
      ...ancien,
      lignes: [...ancien.lignes, ligneVide(parametres?.tva_defaut ?? 20)],
    }));
  }

  function supprimerLigne(index: number) {
    setFormulaire((ancien) => {
      if (ancien.lignes.length <= 1) return ancien;

      return {
        ...ancien,
        lignes: ancien.lignes.filter((_, ligneIndex) => ligneIndex !== index),
      };
    });
  }

  function formulaireValide() {
    if (!formulaire.objet.trim()) return false;
    return formulaire.lignes.some((ligne) => ligneEstValide(ligne));
  }

  async function genererNumeroDevisSiBesoin() {
    const numeroManuel = formulaire.numero.trim();

    if (numeroManuel.length > 0) {
      return numeroManuel;
    }

    if (parametres?.numerotation_devis_auto === false) {
      const maintenant = new Date();
      const annee = maintenant.getFullYear();
      const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
      const jour = String(maintenant.getDate()).padStart(2, "0");
      const heures = String(maintenant.getHours()).padStart(2, "0");
      const minutes = String(maintenant.getMinutes()).padStart(2, "0");
      const secondes = String(maintenant.getSeconds()).padStart(2, "0");

      return `DEV-${annee}${mois}${jour}-${heures}${minutes}${secondes}`;
    }

    const { data, error } = await supabase.rpc("generer_numero_devis_entreprise", {
      p_entreprise_id: entrepriseId,
    });

    if (error) throw error;

    if (!data || typeof data !== "string") {
      throw new Error("Impossible de générer le numéro du devis.");
    }

    return data;
  }

  async function enregistrerDevis() {
    if (!entrepriseId) {
      setMessageErreur("Entreprise introuvable. Veuillez vous reconnecter.");
      return;
    }

    if (!formulaireValide()) {
      setMessageErreur(
        "Renseignez au minimum un objet et une ligne de devis avec une désignation."
      );
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const clientSelectionne = trouverClient(formulaire.client_id);
      const lignesValides = formulaire.lignes.filter((ligne) => ligneEstValide(ligne));
      const totaux = calculerTotaux(lignesValides);

      const numeroFinal = devisEdition
        ? formulaire.numero.trim() || devisEdition.numero || ""
        : await genererNumeroDevisSiBesoin();

      const payloadDevis = {
        entreprise_id: entrepriseId,
        client_id: formulaire.client_id || null,
        client_nom: clientSelectionne ? nomClient(clientSelectionne) : null,
        numero: numeroFinal,
        objet: nettoyerTexte(formulaire.objet),
        description: nettoyerTexte(formulaire.description),
        statut: formulaire.statut,
        date_devis: nettoyerDate(formulaire.date_devis),
        date_validite: nettoyerDate(formulaire.date_validite),
        total_ht: totaux.totalHt,
        total_tva: totaux.totalTva,
        total_ttc: totaux.totalTtc,
        conditions: nettoyerTexte(formulaire.conditions),
        notes_internes: nettoyerTexte(formulaire.notes_internes),
      };

      let devisId = devisEdition?.id || "";

      if (devisEdition) {
        const { error } = await supabase
          .from("devis")
          .update(payloadDevis)
          .eq("id", devisEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (error) throw error;

        const { error: deleteLignesError } = await supabase
          .from("devis_lignes")
          .delete()
          .eq("devis_id", devisEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (deleteLignesError) throw deleteLignesError;
      } else {
        const { data, error } = await supabase
          .from("devis")
          .insert(payloadDevis)
          .select("id")
          .single();

        if (error) throw error;

        if (!data?.id) {
          throw new Error("Impossible de récupérer l’identifiant du devis créé.");
        }

        devisId = data.id;
      }

      const payloadLignes = lignesValides.map((ligne, index) => {
        const calcul = calculerLigne(ligne);

        return {
          devis_id: devisId,
          entreprise_id: entrepriseId,
          ordre: index + 1,
          designation: nettoyerTexte(ligne.designation),
          description: nettoyerTexte(ligne.description),
          quantite: calcul.quantite,
          unite: nettoyerTexte(ligne.unite) || "u",
          prix_unitaire_ht: calcul.prixUnitaire,
          tva: calcul.tauxTva,
          total_ht: calcul.totalHt,
          total_tva: calcul.totalTva,
          total_ttc: calcul.totalTtc,
        };
      });

      if (payloadLignes.length > 0) {
        const { error: lignesError } = await supabase
          .from("devis_lignes")
          .insert(payloadLignes);

        if (lignesError) throw lignesError;
      }

      await chargerDevis(entrepriseId);

      setMessageSucces(
        devisEdition
          ? "Devis modifié avec succès."
          : `Devis créé avec succès : ${numeroFinal}.`
      );

      fermerModal();
    } catch (error: any) {
      console.error("Erreur enregistrement devis :", error);
      setMessageErreur(
        error?.message || "Impossible d’enregistrer le devis pour le moment."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function changerStatutDevis(item: DevisAvecLignes, statut: StatutDevis) {
    if (!entrepriseId) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("devis")
        .update({ statut })
        .eq("id", item.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerDevis(entrepriseId);

      setMessageSucces(`Statut du devis mis à jour : ${libelleStatut(statut)}.`);
    } catch (error: any) {
      console.error("Erreur changement statut devis :", error);
      setMessageErreur(error?.message || "Impossible de modifier le statut du devis.");
    }
  }

  async function supprimerDevis(item: DevisAvecLignes) {
    if (!entrepriseId) return;

    const confirmation = window.confirm(
      `Suppression définitive du devis "${
        item.numero || item.objet || "sans numéro"
      }". Continuer ?`
    );

    if (!confirmation) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error: lignesError } = await supabase
        .from("devis_lignes")
        .delete()
        .eq("devis_id", item.id)
        .eq("entreprise_id", entrepriseId);

      if (lignesError) throw lignesError;

      const { error } = await supabase
        .from("devis")
        .delete()
        .eq("id", item.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerDevis(entrepriseId);

      setMessageSucces("Devis supprimé définitivement.");
    } catch (error: any) {
      console.error("Erreur suppression devis :", error);
      setMessageErreur(error?.message || "Impossible de supprimer ce devis.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Arboboard</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Devis</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Créez vos devis, calculez les totaux automatiquement et suivez leur
            avancement commercial.
          </p>
        </div>

        <button
          onClick={ouvrirCreation}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          + Créer un devis
        </button>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Brouillons
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.brouillons}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Envoyés
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.envoyes}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Acceptés
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.acceptes}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Total devis TTC
          </p>
          <p className="mt-2 text-xl font-bold text-slate-950">
            {formatMontant(statistiques.totalTtc)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Accepté TTC
          </p>
          <p className="mt-2 text-xl font-bold text-slate-950">
            {formatMontant(statistiques.accepteTtc)}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_240px]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher par numéro, client, objet..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value as "tous" | StatutDevis)
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Tous les statuts</option>
            <option value="brouillon">Brouillons</option>
            <option value="envoye">Envoyés</option>
            <option value="accepte">Acceptés</option>
            <option value="refuse">Refusés</option>
            <option value="archive">Archivés</option>
          </select>
        </div>

        {chargement ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              📝
            </div>
            <p className="font-semibold text-slate-900">Chargement des devis...</p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération des données depuis Supabase.
            </p>
          </div>
        ) : devisFiltres.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📝
            </div>
            <p className="font-semibold text-slate-900">Aucun devis trouvé</p>
            <p className="mt-1 text-sm text-slate-500">
              Créez votre premier devis avec numérotation automatique.
            </p>

            <button
              onClick={ouvrirCreation}
              className="mt-5 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Créer un devis
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Devis</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Montants</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {devisFiltres.map((item) => {
                  const client = trouverClient(item.client_id);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4 align-top">
                        <p className="font-semibold text-slate-950">
                          {item.numero || "Sans numéro"}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {item.objet || "Sans objet"}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-slate-800">
                          {item.client_nom || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        <p>Devis : {formatDate(item.date_devis)}</p>
                        <p className="text-xs text-slate-500">
                          Validité : {formatDate(item.date_validite)}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        <p>HT : {formatMontant(item.total_ht)}</p>
                        <p className="text-xs text-slate-500">
                          TVA : {formatMontant(item.total_tva)}
                        </p>
                        <p className="font-semibold text-slate-950">
                          TTC : {formatMontant(item.total_ttc)}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                            item.statut
                          )}`}
                        >
                          {libelleStatut(item.statut)}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          <a
                            href={`/chef/devis/${item.id}/impression`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            PDF
                          </a>

                          <BoutonEnvoyerDocumentEmail
                            typeDocument="devis"
                            documentId={item.id}
                            numero={item.numero}
                            defaultEmail={client?.email || ""}
                            defaultMessage={`Bonjour,\n\nVeuillez trouver ci-dessous votre devis ${
                              item.numero || ""
                            }.\n\nCordialement.`}
                            onEnvoye={() => chargerDevis(entrepriseId)}
                          />

                          <button
                            onClick={() => ouvrirEdition(item)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Modifier
                          </button>

                          <button
                            onClick={() => changerStatutDevis(item, "envoye")}
                            className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          >
                            Envoyé
                          </button>

                          <button
                            onClick={() => changerStatutDevis(item, "accepte")}
                            className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Accepté
                          </button>

                          <button
                            onClick={() => changerStatutDevis(item, "refuse")}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Refusé
                          </button>

                          <button
                            onClick={() => supprimerDevis(item)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  {devisEdition ? "Modifier le devis" : "Créer un devis"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {devisEdition
                    ? "Le numéro existant est conservé."
                    : "Le numéro sera généré automatiquement à l’enregistrement."}
                </p>
              </div>

              <button
                onClick={fermerModal}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="grid gap-4 md:grid-cols-[260px_1fr_180px]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Numéro
                  </label>
                  <input
                    value={formulaire.numero}
                    onChange={(event) => modifierChamp("numero", event.target.value)}
                    placeholder={
                      parametres?.numerotation_devis_auto === false
                        ? "Numéro manuel"
                        : "Auto à l’enregistrement"
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Client
                  </label>
                  <select
                    value={formulaire.client_id}
                    onChange={(event) =>
                      modifierChamp("client_id", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Aucun client sélectionné</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {nomClient(client)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Statut
                  </label>
                  <select
                    value={formulaire.statut}
                    onChange={(event) =>
                      modifierChamp("statut", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="envoye">Envoyé</option>
                    <option value="accepte">Accepté</option>
                    <option value="refuse">Refusé</option>
                    <option value="archive">Archivé</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_180px_180px]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Objet
                  </label>
                  <input
                    value={formulaire.objet}
                    onChange={(event) => modifierChamp("objet", event.target.value)}
                    placeholder="Ex : Taille de haies, élagage, entretien..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date devis
                  </label>
                  <input
                    type="date"
                    value={formulaire.date_devis}
                    onChange={(event) =>
                      modifierChamp("date_devis", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Validité
                  </label>
                  <input
                    type="date"
                    value={formulaire.date_validite}
                    onChange={(event) =>
                      modifierChamp("date_validite", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={formulaire.description}
                  onChange={(event) =>
                    modifierChamp("description", event.target.value)
                  }
                  placeholder="Description globale du devis..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 p-4">
                  <div>
                    <h3 className="font-bold text-slate-950">Lignes de devis</h3>
                    <p className="text-sm text-slate-500">
                      Les totaux HT, TVA et TTC sont calculés automatiquement.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={ajouterLigne}
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    + Ajouter ligne
                  </button>
                </div>

                <div className="space-y-4 p-4">
                  {formulaire.lignes.map((ligne, index) => {
                    const calcul = calculerLigne(ligne);

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="grid gap-3 lg:grid-cols-[1fr_100px_110px_140px_100px_130px]">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Désignation
                            </label>
                            <input
                              value={ligne.designation}
                              onChange={(event) =>
                                modifierLigne(index, "designation", event.target.value)
                              }
                              placeholder="Ex : Taille de haie"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Qté
                            </label>
                            <input
                              value={ligne.quantite}
                              onChange={(event) =>
                                modifierLigne(index, "quantite", event.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Unité
                            </label>
                            <input
                              value={ligne.unite}
                              onChange={(event) =>
                                modifierLigne(index, "unite", event.target.value)
                              }
                              placeholder="h, ml, u..."
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              PU HT
                            </label>
                            <input
                              value={ligne.prix_unitaire_ht}
                              onChange={(event) =>
                                modifierLigne(
                                  index,
                                  "prix_unitaire_ht",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              TVA %
                            </label>
                            <input
                              value={ligne.tva}
                              onChange={(event) =>
                                modifierLigne(index, "tva", event.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Total TTC
                            </label>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950">
                              {formatMontant(calcul.totalTtc)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_130px]">
                          <textarea
                            value={ligne.description}
                            onChange={(event) =>
                              modifierLigne(index, "description", event.target.value)
                            }
                            placeholder="Description complémentaire de la ligne..."
                            rows={2}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          />

                          <button
                            type="button"
                            onClick={() => supprimerLigne(index)}
                            disabled={formulaire.lignes.length <= 1}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-200 bg-white p-4">
                  <div className="ml-auto max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total HT</span>
                      <span className="font-semibold">
                        {formatMontant(totauxFormulaire.totalHt)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Total TVA</span>
                      <span className="font-semibold">
                        {formatMontant(totauxFormulaire.totalTva)}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                      <span className="font-bold text-slate-950">Total TTC</span>
                      <span className="font-bold text-slate-950">
                        {formatMontant(totauxFormulaire.totalTtc)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Conditions
                </label>
                <textarea
                  value={formulaire.conditions}
                  onChange={(event) =>
                    modifierChamp("conditions", event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes internes
                </label>
                <textarea
                  value={formulaire.notes_internes}
                  onChange={(event) =>
                    modifierChamp("notes_internes", event.target.value)
                  }
                  placeholder="Notes non visibles client..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button
                onClick={fermerModal}
                disabled={enregistrement}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                onClick={enregistrerDevis}
                disabled={enregistrement}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrement
                  ? "Enregistrement..."
                  : devisEdition
                  ? "Modifier le devis"
                  : "Créer le devis"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}