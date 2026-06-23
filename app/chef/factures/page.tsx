"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import BoutonEnvoyerDocumentEmail from "@/components/documents/BoutonEnvoyerDocumentEmail";
import HistoriqueEmailsDocument from "@/components/documents/HistoriqueEmailsDocument";
import BoutonEncaisserFacture from "@/components/documents/BoutonEncaisserFacture";
import HistoriquePaiementsFacture from "@/components/documents/HistoriquePaiementsFacture";
import BoutonCreerAvoirFacture from "@/components/documents/BoutonCreerAvoirFacture";
import HistoriqueAvoirsFacture from "@/components/documents/HistoriqueAvoirsFacture";
import BoutonRelancerFacture from "@/components/documents/BoutonRelancerFacture";
import BoutonTelechargerDocumentPdf from "@/components/documents/BoutonTelechargerDocumentPdf";
import ChampNumeroDocumentVerrouille from "@/components/documents/ChampNumeroDocumentVerrouille";
import { genererNumeroDocumentClient } from "@/lib/documents/genererNumeroDocumentClient";

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
};

type Facture = {
  id: string;
  entreprise_id: string;
  client_id?: string | null;
  client_nom?: string | null;
  numero?: string | null;
  objet?: string | null;
  description?: string | null;
  date_facture?: string | null;
  date_echeance?: string | null;
  statut?: string | null;
  type_facture?: string | null;
  total_ht?: number | null;
  total_tva?: number | null;
  total_ttc?: number | null;
  montant_paye?: number | null;
  reste_a_payer?: number | null;
  conditions?: string | null;
  est_avoir?: boolean | null;
  facture_origine_id?: string | null;
  motif_avoir?: string | null;
  avoir_annule_facture?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  client?: Client | null;
};

type LigneFactureForm = {
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

type FormFacture = {
  client_id: string;
  numero: string;
  objet: string;
  description: string;
  date_facture: string;
  date_echeance: string;
  statut: "brouillon" | "envoyee";
  type_facture: "simple" | "acompte" | "solde";
  conditions: string;
};

type FiltreFactures =
  | "toutes"
  | "brouillon"
  | "envoyee"
  | "en_retard"
  | "payee"
  | "avoirs"
  | "archive";

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

function ajouterJours(dateIso: string, jours: number) {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() + jours);
  return date.toISOString().slice(0, 10);
}

const formVide: FormFacture = {
  client_id: "",
  numero: "",
  objet: "",
  description: "",
  date_facture: dateAujourdhui(),
  date_echeance: ajouterJours(dateAujourdhui(), 30),
  statut: "brouillon",
  type_facture: "simple",
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

function nomClient(client?: Client | null, facture?: Facture | null) {
  if (facture?.client_nom) return facture.client_nom;

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

function estAvoirFacture(facture: Facture) {
  return !!facture.est_avoir || facture.type_facture === "avoir";
}

function libelleStatut(statut?: string | null) {
  if (statut === "brouillon") return "Brouillon";
  if (statut === "envoyee") return "Envoyée";
  if (statut === "payee") return "Payée";
  if (statut === "en_retard") return "En retard";
  if (statut === "annulee") return "Annulée";
  if (statut === "archive") return "Archivée";
  return "Inconnu";
}

function classeStatut(statut?: string | null) {
  if (statut === "brouillon") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (statut === "envoyee") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (statut === "payee") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (statut === "en_retard") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (statut === "annulee") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (statut === "archive") {
    return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function libelleTypeFacture(type?: string | null) {
  if (type === "acompte") return "Acompte";
  if (type === "solde") return "Solde";
  if (type === "avoir") return "Avoir";
  return "Facture";
}

function ligneVide(): LigneFactureForm {
  return {
    designation: "",
    description: "",
    quantite: 1,
    unite: "u",
    prix_unitaire_ht: 0,
    tva: 20,
    total_ht: 0,
    total_tva: 0,
    total_ttc: 0,
  };
}

function recalculerLigne(ligne: LigneFactureForm): LigneFactureForm {
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

function calculerTotaux(lignes: LigneFactureForm[]) {
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

export default function PageFactures() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [factures, setFactures] = useState<Facture[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [chargement, setChargement] = useState(true);
  const [chargementAction, setChargementAction] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<FiltreFactures>("toutes");

  const [modalOuverte, setModalOuverte] = useState(false);
  const [factureEdition, setFactureEdition] = useState<Facture | null>(null);
  const [form, setForm] = useState<FormFacture>(formVide);
  const [lignes, setLignes] = useState<LigneFactureForm[]>([ligneVide()]);

  const chargerFactures = useCallback(async () => {
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

      const [
        { data: clientsData, error: clientsError },
        { data: facturesData, error: facturesError },
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .eq("entreprise_id", profil.entreprise_id)
          .order("created_at", { ascending: false }),

        supabase
          .from("factures")
          .select("*")
          .eq("entreprise_id", profil.entreprise_id)
          .order("date_facture", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (clientsError) throw clientsError;
      if (facturesError) throw facturesError;

      const listeClients = (clientsData || []) as Client[];
      const mapClients = new Map(
        listeClients.map((client) => [client.id, client])
      );

      const listeFactures = ((facturesData || []) as Facture[]).map(
        (facture) => ({
          ...facture,
          client: facture.client_id
            ? mapClients.get(facture.client_id) || null
            : null,
        })
      );

      setClients(listeClients);
      setFactures(listeFactures);
    } catch (error: any) {
      console.error("Erreur chargement factures :", error);
      setMessageErreur(error?.message || "Impossible de charger les factures.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerFactures();
  }, [chargerFactures]);

  const facturesFiltrees = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase();

    return factures.filter((facture) => {
      const estAvoir = estAvoirFacture(facture);

      if (filtre === "avoirs" && !estAvoir) return false;

      if (
        filtre !== "toutes" &&
        filtre !== "avoirs" &&
        facture.statut !== filtre
      ) {
        return false;
      }

      if (!rechercheNormalisee) return true;

      const texte = [
        facture.numero,
        facture.objet,
        facture.description,
        facture.statut,
        facture.type_facture,
        nomClient(facture.client, facture),
        facture.client?.email,
        facture.client?.telephone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texte.includes(rechercheNormalisee);
    });
  }, [factures, filtre, recherche]);

  const statistiques = useMemo(() => {
    const facturesClassiques = factures.filter(
      (facture) => !estAvoirFacture(facture)
    );

    const avoirs = factures.filter(estAvoirFacture);

    return {
      totalFactures: facturesClassiques.length,
      totalAvoirs: avoirs.length,
      caTtc: facturesClassiques.reduce(
        (total, facture) => total + Number(facture.total_ttc || 0),
        0
      ),
      resteAPayer: facturesClassiques.reduce(
        (total, facture) => total + Number(facture.reste_a_payer || 0),
        0
      ),
      totalAvoirsTtc: avoirs.reduce(
        (total, facture) => total + Number(facture.total_ttc || 0),
        0
      ),
    };
  }, [factures]);

  async function genererNumeroFacture() {
    return await genererNumeroDocumentClient("facture");
  }

  async function ouvrirCreation() {
    try {
      setMessageErreur("");
      setMessageSucces("");
      setChargementAction(true);

      const numero = await genererNumeroFacture();

      setFactureEdition(null);
      setForm({
        ...formVide,
        numero,
        date_facture: dateAujourdhui(),
        date_echeance: ajouterJours(dateAujourdhui(), 30),
      });
      setLignes([ligneVide()]);
      setModalOuverte(true);
    } catch (error: any) {
      console.error("Erreur génération numéro facture :", error);
      setMessageErreur(
        error?.message || "Impossible de générer le numéro de facture."
      );
    } finally {
      setChargementAction(false);
    }
  }

  async function ouvrirEdition(facture: Facture) {
    try {
      setMessageErreur("");
      setMessageSucces("");

      if (estAvoirFacture(facture)) {
        setMessageErreur("Un avoir ne peut pas être modifié.");
        return;
      }

      if (facture.statut !== "brouillon") {
        setMessageErreur(
          "Seules les factures en brouillon peuvent être modifiées."
        );
        return;
      }

      const { data: lignesData, error: lignesError } = await supabase
        .from("factures_lignes")
        .select("*")
        .eq("facture_id", facture.id)
        .eq("entreprise_id", facture.entreprise_id)
        .order("ordre", { ascending: true });

      if (lignesError) throw lignesError;

      setFactureEdition(facture);
      setForm({
        client_id: facture.client_id || "",
        numero: facture.numero || "",
        objet: facture.objet || "",
        description: facture.description || "",
        date_facture: facture.date_facture || dateAujourdhui(),
        date_echeance:
          facture.date_echeance || ajouterJours(dateAujourdhui(), 30),
        statut: "brouillon",
        type_facture:
          facture.type_facture === "acompte" || facture.type_facture === "solde"
            ? facture.type_facture
            : "simple",
        conditions: facture.conditions || "",
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

      setLignes(lignesForm.length > 0 ? lignesForm : [ligneVide()]);
      setModalOuverte(true);
    } catch (error: any) {
      console.error("Erreur ouverture édition facture :", error);
      setMessageErreur(error?.message || "Impossible d’ouvrir la facture.");
    }
  }

  function fermerModal() {
    if (chargementAction) return;

    setModalOuverte(false);
    setFactureEdition(null);
    setForm(formVide);
    setLignes([ligneVide()]);
  }

  function modifierLigne(
    index: number,
    champ: keyof LigneFactureForm,
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
    setLignes((anciennesLignes) => [...anciennesLignes, ligneVide()]);
  }

  function supprimerLigne(index: number) {
    setLignes((anciennesLignes) => {
      if (anciennesLignes.length <= 1) return anciennesLignes;
      return anciennesLignes.filter((_, ligneIndex) => ligneIndex !== index);
    });
  }

  async function enregistrerFacture() {
    try {
      setChargementAction(true);
      setMessageErreur("");
      setMessageSucces("");

      if (!entrepriseId) {
        setMessageErreur("Entreprise introuvable.");
        return;
      }

      let numeroFinal = form.numero.trim();

      if (!numeroFinal) {
        numeroFinal = await genererNumeroFacture();
      }

      if (!form.objet.trim()) {
        setMessageErreur("Veuillez renseigner l’objet de la facture.");
        return;
      }

      const lignesValides = lignes
        .map(recalculerLigne)
        .filter((ligne) => ligne.designation.trim());

      if (lignesValides.length === 0) {
        setMessageErreur("Veuillez ajouter au moins une ligne de facture.");
        return;
      }

      const { lignesCalculees, total_ht, total_tva, total_ttc } =
        calculerTotaux(lignesValides);

      const client = clients.find((item) => item.id === form.client_id) || null;
      const clientNom = client ? nomClient(client, null) : null;

      const montantPaye = Number(factureEdition?.montant_paye || 0);
      const resteAPayer = Number((total_ttc - montantPaye).toFixed(2));

      const payloadFacture = {
        entreprise_id: entrepriseId,
        client_id: form.client_id || null,
        client_nom: clientNom,
        numero: numeroFinal,
        objet: form.objet.trim(),
        description: form.description.trim() || null,
        date_facture: form.date_facture,
        date_echeance: form.date_echeance,
        statut: "brouillon",
        type_facture: form.type_facture,
        total_ht,
        total_tva,
        total_ttc,
        montant_paye: montantPaye,
        reste_a_payer: resteAPayer,
        conditions: form.conditions.trim() || null,
        est_avoir: false,
      };

      let factureId = factureEdition?.id || "";

      if (factureEdition) {
        const { error: factureError } = await supabase
          .from("factures")
          .update(payloadFacture)
          .eq("id", factureEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (factureError) throw factureError;

        const { error: deleteLignesError } = await supabase
          .from("factures_lignes")
          .delete()
          .eq("facture_id", factureEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (deleteLignesError) throw deleteLignesError;
      } else {
        const { data: factureCreee, error: factureError } = await supabase
          .from("factures")
          .insert(payloadFacture)
          .select("id")
          .single();

        if (factureError) throw factureError;

        factureId = factureCreee.id;
      }

      const lignesPayload = lignesCalculees.map((ligne, index) => ({
        entreprise_id: entrepriseId,
        facture_id: factureId,
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
        .from("factures_lignes")
        .insert(lignesPayload);

      if (lignesInsertError) throw lignesInsertError;

      if (form.statut === "envoyee") {
        const { error: statutError } = await supabase
          .from("factures")
          .update({
            statut: "envoyee",
          })
          .eq("id", factureId)
          .eq("entreprise_id", entrepriseId);

        if (statutError) throw statutError;
      }

      setMessageSucces(
        factureEdition
          ? "Facture modifiée avec succès."
          : "Facture créée avec succès."
      );

      fermerModal();
      await chargerFactures();
    } catch (error: any) {
      console.error("Erreur enregistrement facture :", error);
      setMessageErreur(error?.message || "Impossible d’enregistrer la facture.");
    } finally {
      setChargementAction(false);
    }
  }

  async function archiverFacture(facture: Facture) {
    try {
      setMessageErreur("");
      setMessageSucces("");

      if (estAvoirFacture(facture)) {
        setMessageErreur("Un avoir ne peut pas être archivé depuis cette action.");
        return;
      }

      if (facture.statut !== "payee") {
        setMessageErreur("Seules les factures payées peuvent être archivées.");
        return;
      }

      const { error } = await supabase
        .from("factures")
        .update({ statut: "archive" })
        .eq("id", facture.id)
        .eq("entreprise_id", facture.entreprise_id);

      if (error) throw error;

      setMessageSucces("Facture archivée.");
      await chargerFactures();
    } catch (error: any) {
      console.error("Erreur archivage facture :", error);
      setMessageErreur(error?.message || "Impossible d’archiver la facture.");
    }
  }

  async function synchroniserRetards() {
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

      const response = await fetch("/api/factures/synchroniser-retards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const resultat = await response.json().catch(() => null);

      if (!response.ok || !resultat?.success) {
        throw new Error(
          resultat?.error || "Impossible de synchroniser les retards."
        );
      }

      setMessageSucces(resultat.message || "Retards synchronisés.");
      await chargerFactures();
    } catch (error: any) {
      console.error("Erreur synchronisation retards :", error);
      setMessageErreur(
        error?.message || "Impossible de synchroniser les retards."
      );
    } finally {
      setChargementAction(false);
    }
  }

  const totauxFormulaire = useMemo(() => calculerTotaux(lignes), [lignes]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Facturation
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              Factures & avoirs
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Gérez vos factures, les paiements, les relances, les avoirs, les
              emails et les PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={synchroniserRetards}
              disabled={chargementAction}
              className="rounded-2xl border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Synchroniser retards
            </button>

            <button
              type="button"
              onClick={() => void ouvrirCreation()}
              disabled={chargementAction}
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {chargementAction ? "Préparation..." : "Nouvelle facture"}
            </button>
          </div>
        </div>

        {(messageErreur || messageSucces) && (
          <div className="space-y-3">
            {messageErreur && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {messageErreur}
              </div>
            )}

            {messageSucces && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {messageSucces}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Factures</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {statistiques.totalFactures}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Avoirs</p>
            <p className="mt-2 text-2xl font-black text-purple-700">
              {statistiques.totalAvoirs}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total facturé TTC</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {formatMontant(statistiques.caTtc)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Reste à payer</p>
            <p className="mt-2 text-2xl font-black text-red-600">
              {formatMontant(statistiques.resteAPayer)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total avoirs TTC</p>
            <p className="mt-2 text-2xl font-black text-purple-700">
              {formatMontant(statistiques.totalAvoirsTtc)}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              type="search"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher une facture, un client, un numéro..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 lg:max-w-md"
            />

            <div className="flex flex-wrap gap-2">
              {[
                ["toutes", "Toutes"],
                ["brouillon", "Brouillons"],
                ["envoyee", "Envoyées"],
                ["en_retard", "Retards"],
                ["payee", "Payées"],
                ["avoirs", "Avoirs"],
                ["archive", "Archives"],
              ].map(([valeur, label]) => (
                <button
                  key={valeur}
                  type="button"
                  onClick={() => setFiltre(valeur as FiltreFactures)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    filtre === valeur
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {chargement ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-slate-900">
              Chargement des factures...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération des données en cours.
            </p>
          </div>
        ) : facturesFiltrees.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              🧾
            </div>

            <p className="text-lg font-bold text-slate-950">
              Aucune facture trouvée
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Créez votre première facture ou modifiez les filtres.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {facturesFiltrees.map((facture) => {
              const estAvoir = estAvoirFacture(facture);
              const client = facture.client || null;
              const emailClient = client?.email || "";
              const estEnvoyeeOuRetard =
                facture.statut === "envoyee" ||
                facture.statut === "en_retard";
              const resteAPayer = Number(facture.reste_a_payer || 0);

              const messageEmailParDefaut = estAvoir
                ? `Bonjour,

Veuillez trouver ci-joint votre avoir ${facture.numero || ""} au format PDF.

Cet avoir vient rectifier ou annuler une facture précédemment émise.

Cordialement.`
                : `Bonjour,

Veuillez trouver ci-joint votre facture ${facture.numero || ""} au format PDF.

Cordialement.`;

              return (
                <div
                  key={facture.id}
                  className={`rounded-3xl border bg-white p-5 shadow-sm ${
                    estAvoir ? "border-purple-200" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${classeStatut(
                            facture.statut
                          )}`}
                        >
                          {libelleStatut(facture.statut)}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            estAvoir
                              ? "border-purple-200 bg-purple-50 text-purple-700"
                              : "border-blue-200 bg-blue-50 text-blue-700"
                          }`}
                        >
                          {estAvoir
                            ? "Avoir"
                            : libelleTypeFacture(facture.type_facture)}
                        </span>

                        {facture.avoir_annule_facture && (
                          <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                            Facture annulée par avoir
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-xl font-black text-slate-950">
                        {facture.numero || "Sans numéro"}
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {facture.objet || "Sans objet"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Client : {nomClient(client, facture)}
                      </p>

                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Date</p>
                          <p className="font-bold text-slate-900">
                            {formatDate(facture.date_facture)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Échéance</p>
                          <p className="font-bold text-slate-900">
                            {estAvoir ? "—" : formatDate(facture.date_echeance)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Total TTC</p>
                          <p
                            className={`font-black ${
                              estAvoir ? "text-purple-700" : "text-slate-950"
                            }`}
                          >
                            {formatMontant(facture.total_ttc)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">
                            Reste à payer
                          </p>
                          <p className="font-black text-red-600">
                            {estAvoir
                              ? "—"
                              : formatMontant(facture.reste_a_payer)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex max-w-full flex-wrap gap-2 xl:max-w-md xl:justify-end">
                      <BoutonTelechargerDocumentPdf
                        typeDocument={estAvoir ? "avoir" : "facture"}
                        documentId={facture.id}
                        numero={facture.numero}
                      />

                      <Link
                        href={`/chef/factures/${facture.id}/impression`}
                        target="_blank"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Imprimer
                      </Link>

                      <BoutonEnvoyerDocumentEmail
                        typeDocument={estAvoir ? "avoir" : "facture"}
                        documentId={facture.id}
                        numero={facture.numero}
                        defaultEmail={emailClient}
                        defaultMessage={messageEmailParDefaut}
                        onEnvoye={chargerFactures}
                      />

                      <HistoriqueEmailsDocument
                        typeDocument={estAvoir ? "avoir" : "facture"}
                        documentId={facture.id}
                        numero={facture.numero}
                      />

                      {!estAvoir && estEnvoyeeOuRetard && resteAPayer > 0 && (
                        <BoutonRelancerFacture
                          factureId={facture.id}
                          numero={facture.numero}
                          defaultEmail={emailClient}
                          resteAPayer={resteAPayer}
                          dateEcheance={facture.date_echeance}
                          onRelanceEnvoyee={chargerFactures}
                        />
                      )}

                      {!estAvoir && (
                        <>
                          <HistoriquePaiementsFacture
                            factureId={facture.id}
                            numero={facture.numero}
                            onPaiementSupprime={chargerFactures}
                          />

                          {resteAPayer > 0 && facture.statut !== "brouillon" && (
                            <BoutonEncaisserFacture
                              factureId={facture.id}
                              numero={facture.numero}
                              totalTtc={Number(facture.total_ttc || 0)}
                              montantPaye={Number(facture.montant_paye || 0)}
                              resteAPayer={resteAPayer}
                              onPaiementEnregistre={chargerFactures}
                            />
                          )}

                          {facture.statut !== "brouillon" &&
                            facture.statut !== "archive" && (
                              <BoutonCreerAvoirFacture
                                factureId={facture.id}
                                numero={facture.numero}
                                onAvoirCree={chargerFactures}
                              />
                            )}

                          <HistoriqueAvoirsFacture
                            factureId={facture.id}
                            numero={facture.numero}
                          />
                        </>
                      )}

                      {!estAvoir && facture.statut === "brouillon" && (
                        <button
                          type="button"
                          onClick={() => void ouvrirEdition(facture)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Modifier
                        </button>
                      )}

                      {!estAvoir && facture.statut === "payee" && (
                        <button
                          type="button"
                          onClick={() => void archiverFacture(facture)}
                          className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Archiver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modalOuverte && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    {factureEdition ? "Modifier la facture" : "Nouvelle facture"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Les modifications sont autorisées uniquement sur les
                    brouillons. Le numéro est généré automatiquement.
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
                      onChange={(event) =>
                        setForm((ancien) => ({
                          ...ancien,
                          client_id: event.target.value,
                        }))
                      }
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
                    typeDocument="facture"
                    numero={form.numero}
                  />

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Date facture
                    </label>

                    <input
                      type="date"
                      value={form.date_facture}
                      onChange={(event) =>
                        setForm((ancien) => ({
                          ...ancien,
                          date_facture: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Date échéance
                    </label>

                    <input
                      type="date"
                      value={form.date_echeance}
                      onChange={(event) =>
                        setForm((ancien) => ({
                          ...ancien,
                          date_echeance: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Type
                    </label>

                    <select
                      value={form.type_facture}
                      onChange={(event) =>
                        setForm((ancien) => ({
                          ...ancien,
                          type_facture: event.target
                            .value as FormFacture["type_facture"],
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="simple">Facture simple</option>
                      <option value="acompte">Facture d’acompte</option>
                      <option value="solde">Facture de solde</option>
                    </select>
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
                          statut: event.target.value as FormFacture["statut"],
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="brouillon">Brouillon</option>
                      <option value="envoyee">Envoyée</option>
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
                    placeholder="Ex : Entretien espaces verts"
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

                <div className="rounded-3xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 p-4">
                    <h3 className="font-bold text-slate-950">
                      Lignes de facture
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

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
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
                  onClick={enregistrerFacture}
                  disabled={chargementAction}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {chargementAction ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}