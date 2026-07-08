"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import BoutonEnvoyerDocumentEmail from "@/components/documents/BoutonEnvoyerDocumentEmail";
import HistoriqueEmailsDocument from "@/components/documents/HistoriqueEmailsDocument";
import BoutonTelechargerDocumentPdf from "@/components/documents/BoutonTelechargerDocumentPdf";
import ChampNumeroDocumentVerrouille from "@/components/documents/ChampNumeroDocumentVerrouille";

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

type Devis = {
  id: string;
  entreprise_id: string;
  client_id?: string | null;
  client_nom?: string | null;
  numero?: string | null;
  objet?: string | null;
  description?: string | null;
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

function ligneVide(): LigneDevisForm {
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

export default function PageDevis() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [devis, setDevis] = useState<Devis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

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

      const [
        { data: clientsData, error: clientsError },
        { data: devisData, error: devisError },
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
      ]);

      if (clientsError) throw clientsError;
      if (devisError) throw devisError;

      const listeClients = (clientsData || []) as Client[];
      const mapClients = new Map(
        listeClients.map((client) => [client.id, client])
      );

      const listeDevis = ((devisData || []) as Devis[]).map((item) => ({
        ...item,
        client: item.client_id ? mapClients.get(item.client_id) || null : null,
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

    setDevisEdition(null);
    setForm({
      ...formVide,
      numero: "",
      date_devis: dateAujourdhui(),
      date_validite: ajouterJours(dateAujourdhui(), 30),
    });
    setLignes([ligneVide()]);
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

      setLignes(lignesForm.length > 0 ? lignesForm : [ligneVide()]);
      setModalOuverte(true);
    } catch (error: any) {
      console.error("Erreur ouverture édition devis :", error);
      setMessageErreur(error?.message || "Impossible d’ouvrir le devis.");
    }
  }

  function fermerModal() {
    if (chargementAction) return;

    setModalOuverte(false);
    setDevisEdition(null);
    setForm(formVide);
    setLignes([ligneVide()]);
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
    setLignes((anciennesLignes) => [...anciennesLignes, ligneVide()]);
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

      fermerModal();
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

  const totauxFormulaire = useMemo(() => calculerTotaux(lignes), [lignes]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Devis
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              Devis clients
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Créez, envoyez, imprimez, téléchargez vos devis en PDF et
              transformez-les en factures.
            </p>
          </div>

          <button
            type="button"
            onClick={ouvrirCreation}
            disabled={chargementAction}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Nouveau devis
          </button>
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
            <p className="text-sm text-slate-500">Total devis</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {statistiques.total}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Brouillons</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {statistiques.brouillons}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Envoyés</p>
            <p className="mt-2 text-2xl font-black text-blue-700">
              {statistiques.envoyes}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Acceptés</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">
              {statistiques.acceptes}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total accepté TTC</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">
              {formatMontant(statistiques.totalAccepteTtc)}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              type="search"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un devis, un client, un numéro..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 lg:max-w-md"
            />

            <div className="flex flex-wrap gap-2">
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
              Chargement des devis...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération des données en cours.
            </p>
          </div>
        ) : devisFiltres.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              📄
            </div>

            <p className="text-lg font-bold text-slate-950">
              Aucun devis trouvé
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Créez votre premier devis ou modifiez les filtres.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {devisFiltres.map((item) => {
              const client = item.client || null;
              const emailClient = client?.email || "";

              const messageEmailParDefaut = `Bonjour,

Veuillez trouver ci-joint votre devis ${item.numero || ""} au format PDF.

Cordialement.`;

              return (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${classeStatut(
                            item.statut
                          )}`}
                        >
                          {libelleStatut(item.statut)}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-black text-slate-950">
                        {item.numero || "Sans numéro"}
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {item.objet || "Sans objet"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Client : {nomClient(client, item)}
                      </p>

                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Date</p>
                          <p className="font-bold text-slate-900">
                            {formatDate(item.date_devis)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Validité</p>
                          <p className="font-bold text-slate-900">
                            {formatDate(item.date_validite)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Total TTC</p>
                          <p className="font-black text-slate-950">
                            {formatMontant(item.total_ttc)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Client</p>
                          <p className="truncate font-bold text-slate-900">
                            {nomClient(client, item)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex max-w-full flex-wrap gap-2 xl:max-w-md xl:justify-end">
                      <BoutonTelechargerDocumentPdf
                        typeDocument="devis"
                        documentId={item.id}
                        numero={item.numero}
                      />

                      <Link
                        href={`/chef/devis/${item.id}/impression`}
                        target="_blank"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
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

                      {item.statut === "brouillon" && (
                        <button
                          type="button"
                          onClick={() => void ouvrirEdition(item)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Modifier
                        </button>
                      )}

                      {item.statut === "envoye" && (
                        <>
                          <button
                            type="button"
                            onClick={() => void changerStatut(item, "accepte")}
                            className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Accepter
                          </button>

                          <button
                            type="button"
                            onClick={() => void changerStatut(item, "refuse")}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
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
                          className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Transformer en facture
                        </button>
                      )}

                      {item.statut !== "archive" && (
                        <button
                          type="button"
                          onClick={() => void changerStatut(item, "archive")}
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
                  onClick={enregistrerDevis}
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