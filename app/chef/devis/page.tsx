"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerParametresEntrepriseClient } from "@/lib/parametresEntrepriseClient";

import BoutonEnvoyerDocumentEmail from "@/components/documents/BoutonEnvoyerDocumentEmail";
import HistoriqueEmailsDocument from "@/components/documents/HistoriqueEmailsDocument";
import BoutonTelechargerDocumentPdf from "@/components/documents/BoutonTelechargerDocumentPdf";
import ChampNumeroDocumentVerrouille from "@/components/documents/ChampNumeroDocumentVerrouille";
import BoutonCreerFicheInterventionDepuisDevis from "@/components/devis/BoutonCreerFicheInterventionDepuisDevis";
import FichesInterventionLieesDevis from "@/components/devis/FichesInterventionLieesDevis";

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
  conditions?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  client?: Client | null;
  facture_liee?: FactureLiee | null;
};

type LigneDevisForm = {
  id?: string;
  designation: string;
  description: string;
  quantite: number;
  unite: string;
  prix_unitaire_ht: number;
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
};

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

function ligneVide(tvaDefaut = 20): LigneDevisForm {
  return {
    designation: "",
    description: "",
    quantite: 1,
    unite: "u",
    prix_unitaire_ht: 0,
    tva: tvaDefaut,
    total_ht: 0,
    total_tva: 0,
    total_ttc: 0,
  };
}

function recalculerLigne(ligne: LigneDevisForm): LigneDevisForm {
  const quantite = Number(ligne.quantite || 0);
  const prixUnitaireHt = Number(ligne.prix_unitaire_ht || 0);
  const tva = Number(ligne.tva || 0);

  const totalHt = quantite * prixUnitaireHt;
  const totalTva = totalHt * (tva / 100);
  const totalTtc = totalHt + totalTva;

  return {
    ...ligne,
    quantite,
    prix_unitaire_ht: prixUnitaireHt,
    tva,
    total_ht: Number(totalHt.toFixed(2)),
    total_tva: Number(totalTva.toFixed(2)),
    total_ttc: Number(totalTtc.toFixed(2)),
  };
}

function calculerTotaux(lignes: LigneDevisForm[]) {
  const lignesCalculees = lignes.map(recalculerLigne);

  const totalHt = lignesCalculees.reduce(
    (total, ligne) => total + Number(ligne.total_ht || 0),
    0
  );

  const totalTva = lignesCalculees.reduce(
    (total, ligne) => total + Number(ligne.total_tva || 0),
    0
  );

  const totalTtc = lignesCalculees.reduce(
    (total, ligne) => total + Number(ligne.total_ttc || 0),
    0
  );

  return {
    lignesCalculees,
    total_ht: Number(totalHt.toFixed(2)),
    total_tva: Number(totalTva.toFixed(2)),
    total_ttc: Number(totalTtc.toFixed(2)),
  };
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

export default function PageDevis() {
  const searchParams = useSearchParams();
  const devisSelectionneId = searchParams.get("devisId");
  const [entrepriseId, setEntrepriseId] = useState("");
  const [devis, setDevis] = useState<Devis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

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
      ]);

      if (clientsError) throw clientsError;
      if (devisError) throw devisError;
      if (facturesError) throw facturesError;

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

      const listeDevis = ((devisData || []) as Devis[]).map((item) => ({
        ...item,
        client: item.client_id ? mapClients.get(item.client_id) || null : null,
        facture_liee: mapFacturesParDevis.get(item.id) || null,
      }));

      setClients(listeClients);
      setDevis(listeDevis);
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
      });

      const lignesForm = (lignesData || []).map((ligne: any) =>
        recalculerLigne({
          id: ligne.id,
          designation: ligne.designation || "",
          description: ligne.description || "",
          quantite: Number(ligne.quantite || 0),
          unite: ligne.unite || "u",
          prix_unitaire_ht: Number(ligne.prix_unitaire_ht || 0),
          tva: Number(ligne.tva || 0),
          total_ht: Number(ligne.total_ht || 0),
          total_tva: Number(ligne.total_tva || 0),
          total_ttc: Number(ligne.total_ttc || 0),
        })
      );

      setLignes(lignesForm.length > 0 ? lignesForm : [ligneVide(tvaDefaut)]);
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

  function supprimerLigne(index: number) {
    setLignes((anciennesLignes) => {
      if (anciennesLignes.length <= 1) return anciennesLignes;
      return anciennesLignes.filter((_, ligneIndex) => ligneIndex !== index);
    });
  }

  async function enregistrerDevis() {
    try {
      setChargementAction(true);
      setMessageErreur("");
      setMessageSucces("");

      if (!entrepriseId) {
        setMessageErreur("Entreprise introuvable.");
        return;
      }

      if (!form.objet.trim()) {
        setMessageErreur("Veuillez renseigner l’objet du devis.");
        return;
      }

      const lignesValides = lignes
        .map(recalculerLigne)
        .filter((ligne) => ligne.designation.trim());

      if (lignesValides.length === 0) {
        setMessageErreur("Veuillez ajouter au moins une ligne de devis.");
        return;
      }

      const { lignesCalculees, total_ht, total_tva, total_ttc } =
        calculerTotaux(lignesValides);

      const client = clients.find((item) => item.id === form.client_id) || null;
      const clientNom = client ? nomClient(client, null) : null;

      const numeroFinal = form.numero.trim() || null;

      const payloadDevis: any = {
        entreprise_id: entrepriseId,
        client_id: form.client_id || null,
        client_nom: clientNom,
        numero: numeroFinal,
        objet: form.objet.trim(),
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
        designation: ligne.designation.trim(),
        description: ligne.description.trim() || null,
        quantite: ligne.quantite,
        unite: ligne.unite || "u",
        prix_unitaire_ht: ligne.prix_unitaire_ht,
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

      if (form.statut === "envoye") {
        const { error: statutError } = await supabase
          .from("devis")
          .update({
            statut: "envoye",
          })
          .eq("id", devisId)
          .eq("entreprise_id", entrepriseId);

        if (statutError) throw statutError;
      }

      setMessageSucces(
        devisEdition ? "Devis modifié avec succès." : "Devis créé avec succès."
      );

      reinitialiserModal();
      await chargerDevis();
    } catch (error: any) {
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

  const totauxFormulaire = useMemo(() => calculerTotaux(lignes), [lignes]);

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

                              {devisSelectionneId === item.id && (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                  Devis lié à la fiche
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

                            <FichesInterventionLieesDevis
                              entrepriseId={entrepriseId}
                              devisId={item.id}
                            />

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
          <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/50 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
            <div className="max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-3xl">
              <div className="sticky top-0 z-20 flex items-start justify-between border-b border-slate-200 bg-white/95 p-5 backdrop-blur">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    {devisEdition ? "Modifier le devis" : "Nouveau devis"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Les modifications sont autorisées uniquement sur les
                    brouillons. Le numéro sera généré à l’enregistrement.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fermerModal}
                  disabled={chargementAction}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Fermer
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Client
                    </label>

                    <select
                      value={form.client_id}
                      onChange={(event) => selectionnerClient(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
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

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Date devis
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
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Date de validité
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
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Statut
                    </label>

                    <select
                      value={form.statut}
                      onChange={(event) =>
                        setForm((ancien) => ({
                          ...ancien,
                          statut: event.target.value as FormDevis["statut"],
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="brouillon">Brouillon</option>
                      <option value="envoye">Envoyé</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Objet
                  </label>

                  <input
                    value={form.objet}
                    onChange={(event) =>
                      setForm((ancien) => ({
                        ...ancien,
                        objet: event.target.value,
                      }))
                    }
                    placeholder="Ex : Taille de haie, abattage, entretien..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((ancien) => ({
                        ...ancien,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/30 p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-950">
                        Adresse chantier du devis
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Ces informations seront enregistrées sur ce devis.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={copierAdresseClientVersChantier}
                      disabled={!form.client_id}
                      className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Copier depuis le client
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Adresse chantier
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
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Code postal chantier
                      </label>

                      <input
                        value={form.code_postal_chantier}
                        onChange={(event) =>
                          setForm((ancien) => ({
                            ...ancien,
                            code_postal_chantier: event.target.value,
                          }))
                        }
                        placeholder="03000"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Ville chantier
                      </label>

                      <input
                        value={form.ville_chantier}
                        onChange={(event) =>
                          setForm((ancien) => ({
                            ...ancien,
                            ville_chantier: event.target.value,
                          }))
                        }
                        placeholder="Ville du chantier"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
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
                      placeholder="Ex : accès camion compliqué, portail étroit, chien présent, stationnement..."
                      rows={3}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 p-4">
                    <h3 className="font-bold text-slate-950">
                      Lignes de devis
                    </h3>

                    <button
                      type="button"
                      onClick={ajouterLigne}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      Ajouter ligne
                    </button>
                  </div>

                  <div className="space-y-3 p-4">
                    {lignes.map((ligne, index) => (
                      <div
                        key={index}
                        className="grid gap-3 rounded-2xl border border-slate-200 p-4 lg:grid-cols-12"
                      >
                        <div className="lg:col-span-3">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Désignation
                          </label>

                          <input
                            value={ligne.designation}
                            onChange={(event) =>
                              modifierLigne(
                                index,
                                "designation",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="lg:col-span-3">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Description
                          </label>

                          <input
                            value={ligne.description}
                            onChange={(event) =>
                              modifierLigne(
                                index,
                                "description",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="lg:col-span-1">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Qté
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={ligne.quantite}
                            onChange={(event) =>
                              modifierLigne(
                                index,
                                "quantite",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="lg:col-span-1">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Unité
                          </label>

                          <input
                            value={ligne.unite}
                            onChange={(event) =>
                              modifierLigne(index, "unite", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="lg:col-span-1">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
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
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="lg:col-span-1">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
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
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="lg:col-span-1">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Total TTC
                          </label>

                          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
                            {formatMontant(ligne.total_ttc)}
                          </p>
                        </div>

                        <div className="flex items-end lg:col-span-1">
                          <button
                            type="button"
                            onClick={() => supprimerLigne(index)}
                            className="w-full rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Suppr.
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
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
                      rows={5}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="font-bold text-slate-950">Totaux</h3>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total HT</span>
                        <span className="font-bold text-slate-950">
                          {formatMontant(totauxFormulaire.total_ht)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">TVA</span>
                        <span className="font-bold text-slate-950">
                          {formatMontant(totauxFormulaire.total_tva)}
                        </span>
                      </div>

                      <div className="flex justify-between border-t border-slate-200 pt-3 text-lg">
                        <span className="font-black text-slate-950">
                          Total TTC
                        </span>
                        <span className="font-black text-emerald-700">
                          {formatMontant(totauxFormulaire.total_ttc)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 p-5 backdrop-blur sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fermerModal}
                  disabled={chargementAction}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={enregistrerDevis}
                  disabled={chargementAction}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {chargementAction
                    ? "Enregistrement…"
                    : devisEdition
                      ? "Enregistrer les modifications"
                      : "Créer le devis"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}