"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

type ClientEntreprise = {
  id: string;
  type_client: string;
  nom: string;
  prenom: string;
  entreprise: string;
  statut: string;
};

type Chantier = {
  id: string;
  client_id: string | null;
  client_nom: string;
  titre: string;
  statut: string;
  description: string;
};

type Devis = {
  id: string;
  entreprise_id: string | null;
  numero: string;
  client_id: string | null;
  client_nom: string;
  chantier_id: string | null;
  chantier_titre: string;
  objet: string;
  description: string;
  statut: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
};

type LigneSource = {
  designation: string;
  quantite: number;
  unite: string;
  prix_unitaire_ht: number;
  tva: number;
};

type Facture = {
  id: string;
  entreprise_id: string | null;
  numero: string;
  client_nom: string;
  chantier_titre: string;
  objet: string;
  date_facture: string | null;
  echeance_jours: number;
  statut: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  created_at: string;
};

type LigneFacture = {
  designation: string;
  quantite: string;
  unite: string;
  prix_unitaire_ht: string;
  tva: string;
};

type FormFacture = {
  devis_id: string;
  client_id: string;
  client_nom: string;
  chantier_id: string;
  chantier_titre: string;
  objet: string;
  description: string;
  date_facture: string;
  echeance_jours: string;
  statut: string;
  notes: string;
};

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

const ligneVide: LigneFacture = {
  designation: "",
  quantite: "1",
  unite: "unité",
  prix_unitaire_ht: "0",
  tva: "20",
};

const formulaireVide: FormFacture = {
  devis_id: "",
  client_id: "",
  client_nom: "",
  chantier_id: "",
  chantier_titre: "",
  objet: "",
  description: "",
  date_facture: dateAujourdhui(),
  echeance_jours: "30",
  statut: "Brouillon",
  notes: "",
};

export default function FacturesChefPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");

  const [clients, setClients] = useState<ClientEntreprise[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);

  const [form, setForm] = useState<FormFacture>(formulaireVide);
  const [lignes, setLignes] = useState<LigneFacture[]>([{ ...ligneVide }]);

  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    chargerContexteEtFactures();
  }, []);

  async function chargerContexteEtFactures() {
    setChargement(true);
    setMessage("");

    const { contexte, erreur } = await chargerContexteEntreprise();

    if (erreur || !contexte) {
      setMessage(erreur || "Impossible de charger le contexte entreprise.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    setEntrepriseId(contexte.entreprise.id);
    setNomEntreprise(contexte.entreprise.nom_entreprise);

    await Promise.all([
      chargerClients(contexte.entreprise.id),
      chargerChantiers(contexte.entreprise.id),
      chargerDevis(contexte.entreprise.id),
      chargerFactures(contexte.entreprise.id),
    ]);

    setChargement(false);
  }

  async function chargerClients(idEntreprise: string) {
    const { data, error } = await supabase
      .from("clients")
      .select("id, type_client, nom, prenom, entreprise, statut")
      .eq("entreprise_id", idEntreprise)
      .in("statut", ["Actif", "Prospect"])
      .order("entreprise", { ascending: true })
      .order("nom", { ascending: true })
      .order("prenom", { ascending: true });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des clients.");
    } else {
      setClients(data || []);
    }
  }

  async function chargerChantiers(idEntreprise: string) {
    const { data, error } = await supabase
      .from("chantiers")
      .select("id, client_id, client_nom, titre, statut, description")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des chantiers.");
    } else {
      setChantiers(data || []);
    }
  }

  async function chargerDevis(idEntreprise: string) {
    const { data, error } = await supabase
      .from("devis")
      .select(
        "id, entreprise_id, numero, client_id, client_nom, chantier_id, chantier_titre, objet, description, statut, total_ht, total_tva, total_ttc"
      )
      .eq("entreprise_id", idEntreprise)
      .neq("statut", "Refusé")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des devis.");
    } else {
      setDevis(data || []);
    }
  }

  async function chargerFactures(idEntreprise: string) {
    const { data, error } = await supabase
      .from("factures")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des factures.");
    } else {
      setFactures(data || []);
    }
  }

  function modifierChamp(champ: keyof FormFacture, valeur: string) {
    setForm((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function nomAffichageClient(client: ClientEntreprise) {
    if (client.type_client === "Professionnel" && client.entreprise) {
      return client.entreprise;
    }

    const nomComplet = `${client.prenom || ""} ${client.nom || ""}`.trim();

    if (nomComplet) {
      return nomComplet;
    }

    return client.entreprise || "Client sans nom";
  }

  function choisirClient(id: string) {
    if (!id) {
      setForm((ancien) => ({
        ...ancien,
        client_id: "",
        client_nom: "",
      }));
      return;
    }

    const clientTrouve = clients.find((client) => client.id === id);

    if (!clientTrouve) {
      return;
    }

    setForm((ancien) => ({
      ...ancien,
      client_id: clientTrouve.id,
      client_nom: nomAffichageClient(clientTrouve),
    }));
  }

  function choisirChantier(id: string) {
    if (!id) {
      setForm((ancien) => ({
        ...ancien,
        chantier_id: "",
        chantier_titre: "",
      }));
      return;
    }

    const chantierTrouve = chantiers.find((chantier) => chantier.id === id);

    if (!chantierTrouve) {
      return;
    }

    setForm((ancien) => ({
      ...ancien,
      chantier_id: chantierTrouve.id,
      chantier_titre: chantierTrouve.titre,
      client_id: chantierTrouve.client_id || ancien.client_id,
      client_nom: chantierTrouve.client_nom || ancien.client_nom,
      objet: ancien.objet || chantierTrouve.titre,
      description: ancien.description || chantierTrouve.description || "",
    }));
  }

  async function choisirDevis(id: string) {
    if (!id) {
      setForm((ancien) => ({
        ...ancien,
        devis_id: "",
      }));
      return;
    }

    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const devisTrouve = devis.find((devisItem) => devisItem.id === id);

    if (!devisTrouve) {
      return;
    }

    setForm((ancien) => ({
      ...ancien,
      devis_id: devisTrouve.id,
      client_id: devisTrouve.client_id || "",
      client_nom: devisTrouve.client_nom || "",
      chantier_id: devisTrouve.chantier_id || "",
      chantier_titre: devisTrouve.chantier_titre || "",
      objet: devisTrouve.objet || "",
      description: devisTrouve.description || "",
    }));

    const { data: lignesDevis, error } = await supabase
      .from("devis_lignes")
      .select("designation, quantite, unite, prix_unitaire_ht, tva")
      .eq("entreprise_id", entrepriseId)
      .eq("devis_id", id)
      .order("ordre", { ascending: true });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des lignes du devis.");
      return;
    }

    if (!lignesDevis || lignesDevis.length === 0) {
      setLignes([{ ...ligneVide }]);
      return;
    }

    const lignesConverties = (lignesDevis as LigneSource[]).map((ligne) => ({
      designation: ligne.designation || "",
      quantite: String(ligne.quantite || 1),
      unite: ligne.unite || "unité",
      prix_unitaire_ht: String(ligne.prix_unitaire_ht || 0),
      tva: String(ligne.tva || 20),
    }));

    setLignes(lignesConverties);
  }

  function modifierLigne(
    index: number,
    champ: keyof LigneFacture,
    valeur: string
  ) {
    setLignes((anciennesLignes) =>
      anciennesLignes.map((ligne, i) =>
        i === index ? { ...ligne, [champ]: valeur } : ligne
      )
    );
  }

  function ajouterLigne() {
    setLignes((anciennesLignes) => [...anciennesLignes, { ...ligneVide }]);
  }

  function supprimerLigne(index: number) {
    setLignes((anciennesLignes) => {
      if (anciennesLignes.length === 1) {
        return anciennesLignes;
      }

      return anciennesLignes.filter((_, i) => i !== index);
    });
  }

  function calculerLigne(ligne: LigneFacture) {
    const quantite = Number(ligne.quantite) || 0;
    const prix = Number(ligne.prix_unitaire_ht) || 0;
    const tauxTva = Number(ligne.tva) || 0;

    const totalHt = quantite * prix;
    const totalTva = totalHt * (tauxTva / 100);
    const totalTtc = totalHt + totalTva;

    return {
      totalHt,
      totalTva,
      totalTtc,
    };
  }

  const totaux = useMemo(() => {
    return lignes.reduce(
      (acc, ligne) => {
        const calcul = calculerLigne(ligne);

        return {
          totalHt: acc.totalHt + calcul.totalHt,
          totalTva: acc.totalTva + calcul.totalTva,
          totalTtc: acc.totalTtc + calcul.totalTtc,
        };
      },
      {
        totalHt: 0,
        totalTva: 0,
        totalTtc: 0,
      }
    );
  }, [lignes]);

  function genererNumeroFacture() {
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
    const jour = String(maintenant.getDate()).padStart(2, "0");
    const heure = String(maintenant.getHours()).padStart(2, "0");
    const minute = String(maintenant.getMinutes()).padStart(2, "0");
    const seconde = String(maintenant.getSeconds()).padStart(2, "0");

    return `FAC-${annee}${mois}${jour}-${heure}${minute}${seconde}`;
  }

  function formatPrix(nombre: number) {
    return Number(nombre || 0).toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    });
  }

  function afficherDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date + "T00:00:00").toLocaleDateString("fr-FR");
  }

  function calculerDateEcheance(dateFacture: string | null, jours: number) {
    if (!dateFacture) {
      return "—";
    }

    const date = new Date(dateFacture + "T00:00:00");
    date.setDate(date.getDate() + Number(jours || 30));

    return date.toLocaleDateString("fr-FR");
  }

  async function enregistrerFacture() {
    setSauvegarde(true);
    setMessage("");

    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée. Reconnecte-toi.");
      setSauvegarde(false);
      return;
    }

    if (!form.client_nom.trim()) {
      setMessage("Merci de sélectionner un client ou un devis.");
      setSauvegarde(false);
      return;
    }

    if (!form.objet.trim()) {
      setMessage("Merci de remplir l'objet de la facture.");
      setSauvegarde(false);
      return;
    }

    const lignesValides = lignes.filter(
      (ligne) =>
        ligne.designation.trim() &&
        Number(ligne.quantite) > 0 &&
        Number(ligne.prix_unitaire_ht) >= 0
    );

    if (lignesValides.length === 0) {
      setMessage("Merci d'ajouter au moins une ligne de facture valide.");
      setSauvegarde(false);
      return;
    }

    const numero = genererNumeroFacture();

    const { data: factureCreee, error: erreurFacture } = await supabase
      .from("factures")
      .insert({
        entreprise_id: entrepriseId,
        numero,
        devis_id: form.devis_id || null,
        client_id: form.client_id || null,
        client_nom: form.client_nom,
        chantier_id: form.chantier_id || null,
        chantier_titre: form.chantier_titre,
        objet: form.objet,
        description: form.description,
        date_facture: form.date_facture || null,
        echeance_jours: Number(form.echeance_jours) || 30,
        statut: form.statut,
        total_ht: totaux.totalHt,
        total_tva: totaux.totalTva,
        total_ttc: totaux.totalTtc,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (erreurFacture || !factureCreee) {
      setMessage(
        erreurFacture?.message || "Erreur : la facture n'a pas été créée."
      );
      setSauvegarde(false);
      return;
    }

    const lignesAInserer = lignesValides.map((ligne, index) => {
      const calcul = calculerLigne(ligne);

      return {
        entreprise_id: entrepriseId,
        facture_id: factureCreee.id,
        ordre: index + 1,
        designation: ligne.designation,
        quantite: Number(ligne.quantite) || 0,
        unite: ligne.unite,
        prix_unitaire_ht: Number(ligne.prix_unitaire_ht) || 0,
        tva: Number(ligne.tva) || 0,
        total_ht: calcul.totalHt,
        total_tva: calcul.totalTva,
        total_ttc: calcul.totalTtc,
      };
    });

    const { error: erreurLignes } = await supabase
      .from("facture_lignes")
      .insert(lignesAInserer);

    if (erreurLignes) {
      await supabase
        .from("factures")
        .delete()
        .eq("id", factureCreee.id)
        .eq("entreprise_id", entrepriseId);

      setMessage(
        erreurLignes.message ||
          "Erreur : les lignes de la facture n'ont pas été enregistrées."
      );
      setSauvegarde(false);
      return;
    }

    if (form.devis_id) {
      await supabase
        .from("devis")
        .update({
          statut: "Facturé",
          updated_at: new Date().toISOString(),
        })
        .eq("id", form.devis_id)
        .eq("entreprise_id", entrepriseId);
    }

    setMessage(`Facture ${numero} créée avec succès.`);

    setForm({
      ...formulaireVide,
      date_facture: dateAujourdhui(),
    });

    setLignes([{ ...ligneVide }]);

    await chargerFactures(entrepriseId);
    await chargerDevis(entrepriseId);

    setSauvegarde(false);
  }

  async function changerStatut(id: string, statut: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const { error } = await supabase
      .from("factures")
      .update({
        statut,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors du changement de statut.");
    } else {
      setMessage("Statut de la facture mis à jour.");
      await chargerFactures(entrepriseId);
    }
  }

  async function supprimerFacture(id: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const confirmation = confirm(
      "Supprimer cette facture ? Les lignes de facture seront supprimées aussi."
    );

    if (!confirmation) {
      return;
    }

    const { error } = await supabase
      .from("factures")
      .delete()
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors de la suppression de la facture.");
    } else {
      setMessage("Facture supprimée.");
      await chargerFactures(entrepriseId);
    }
  }

  const facturesFiltrees = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    if (!texte) {
      return factures;
    }

    return factures.filter((facture) => {
      const contenu = `
        ${facture.numero}
        ${facture.client_nom}
        ${facture.chantier_titre}
        ${facture.objet}
        ${facture.statut}
      `;

      return contenu.toLowerCase().includes(texte);
    });
  }, [factures, recherche]);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Factures</h1>

          <p className="mt-2 text-slate-600">
            Crée des factures depuis un devis ou manuellement avec calcul automatique HT, TVA et TTC.
          </p>

          {nomEntreprise && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise connectée : {nomEntreprise}
            </p>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Nouvelle facture
          </h2>

          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Créer depuis un devis
              </label>

              <select
                value={form.devis_id}
                onChange={(e) => choisirDevis(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              >
                <option value="">Aucun devis sélectionné</option>

                {devis.map((devisItem) => (
                  <option key={devisItem.id} value={devisItem.id}>
                    {devisItem.numero} — {devisItem.client_nom} —{" "}
                    {formatPrix(Number(devisItem.total_ttc) || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Client
                </label>

                <select
                  value={form.client_id}
                  onChange={(e) => choisirClient(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="">Sélectionner un client</option>

                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {nomAffichageClient(client)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Chantier lié
                </label>

                <select
                  value={form.chantier_id}
                  onChange={(e) => choisirChantier(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="">Aucun chantier lié</option>

                  {chantiers.map((chantier) => (
                    <option key={chantier.id} value={chantier.id}>
                      {chantier.titre} —{" "}
                      {chantier.client_nom || "Client non renseigné"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Objet de la facture
                </label>

                <input
                  value={form.objet}
                  onChange={(e) => modifierChamp("objet", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Exemple : Facture taille de haies"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date facture
                </label>

                <input
                  type="date"
                  value={form.date_facture}
                  onChange={(e) => modifierChamp("date_facture", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Échéance jours
                </label>

                <input
                  type="number"
                  value={form.echeance_jours}
                  onChange={(e) =>
                    modifierChamp("echeance_jours", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description générale
              </label>

              <textarea
                value={form.description}
                onChange={(e) => modifierChamp("description", e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Description globale..."
              />
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Lignes de facture
                </h3>

                <button
                  onClick={ajouterLigne}
                  className="w-fit rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Ajouter une ligne
                </button>
              </div>

              <div className="grid gap-4">
                {lignes.map((ligne, index) => {
                  const calcul = calculerLigne(ligne);

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="grid gap-4 md:grid-cols-12">
                        <div className="md:col-span-4">
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Désignation
                          </label>

                          <input
                            value={ligne.designation}
                            onChange={(e) =>
                              modifierLigne(index, "designation", e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                            placeholder="Exemple : Taille de haie"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Quantité
                          </label>

                          <input
                            type="number"
                            value={ligne.quantite}
                            onChange={(e) =>
                              modifierLigne(index, "quantite", e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Unité
                          </label>

                          <select
                            value={ligne.unite}
                            onChange={(e) =>
                              modifierLigne(index, "unite", e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                          >
                            <option>unité</option>
                            <option>heure</option>
                            <option>jour</option>
                            <option>forfait</option>
                            <option>m²</option>
                            <option>ml</option>
                            <option>m³</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Prix HT
                          </label>

                          <input
                            type="number"
                            value={ligne.prix_unitaire_ht}
                            onChange={(e) =>
                              modifierLigne(
                                index,
                                "prix_unitaire_ht",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            TVA %
                          </label>

                          <input
                            type="number"
                            value={ligne.tva}
                            onChange={(e) =>
                              modifierLigne(index, "tva", e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Action
                          </label>

                          <button
                            onClick={() => supprimerLigne(index)}
                            className="w-full rounded-xl bg-red-700 px-3 py-3 text-sm font-semibold text-white hover:bg-red-600"
                          >
                            X
                          </button>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-slate-600">
                        Total ligne : {formatPrix(calcul.totalHt)} HT —{" "}
                        {formatPrix(calcul.totalTtc)} TTC
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl bg-slate-900 p-5 text-white md:grid-cols-3">
              <div>
                <p className="text-sm text-slate-300">Total HT</p>
                <p className="text-2xl font-bold">
                  {formatPrix(totaux.totalHt)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-300">TVA</p>
                <p className="text-2xl font-bold">
                  {formatPrix(totaux.totalTva)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-300">Total TTC</p>
                <p className="text-2xl font-bold">
                  {formatPrix(totaux.totalTtc)}
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Statut
                </label>

                <select
                  value={form.statut}
                  onChange={(e) => modifierChamp("statut", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option>Brouillon</option>
                  <option>Envoyée</option>
                  <option>Payée</option>
                  <option>En retard</option>
                  <option>Annulée</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes internes
                </label>

                <input
                  value={form.notes}
                  onChange={(e) => modifierChamp("notes", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Notes non affichées au client pour l'instant"
                />
              </div>
            </div>

            <button
              onClick={enregistrerFacture}
              disabled={sauvegarde}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {sauvegarde ? "Création de la facture..." : "Créer la facture"}
            </button>

            {message && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Rechercher une facture
          </label>

          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Recherche par numéro, client, objet, statut..."
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Liste des factures
          </h2>

          {chargement ? (
            <p className="text-slate-600">Chargement...</p>
          ) : facturesFiltrees.length === 0 ? (
            <p className="text-slate-600">Aucune facture trouvée.</p>
          ) : (
            <div className="grid gap-4">
              {facturesFiltrees.map((facture) => (
                <div
                  key={facture.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {facture.numero}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {facture.client_nom || "Client non renseigné"} —{" "}
                        {facture.objet}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Date : {afficherDate(facture.date_facture)} — Échéance :{" "}
                        {calculerDateEcheance(
                          facture.date_facture,
                          facture.echeance_jours
                        )}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {facture.statut}
                    </span>
                  </div>

                  <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                    <p>
                      <span className="font-medium">HT :</span>{" "}
                      {formatPrix(Number(facture.total_ht) || 0)}
                    </p>

                    <p>
                      <span className="font-medium">TVA :</span>{" "}
                      {formatPrix(Number(facture.total_tva) || 0)}
                    </p>

                    <p>
                      <span className="font-medium">TTC :</span>{" "}
                      {formatPrix(Number(facture.total_ttc) || 0)}
                    </p>
                  </div>

                  {facture.chantier_titre && (
                    <p className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      Chantier lié : {facture.chantier_titre}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/chef/factures/${facture.id}`}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Voir / PDF
                    </Link>

                    <button
                      onClick={() => changerStatut(facture.id, "Envoyée")}
                      className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                    >
                      Envoyée
                    </button>

                    <button
                      onClick={() => changerStatut(facture.id, "Payée")}
                      className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                    >
                      Payée
                    </button>

                    <button
                      onClick={() => changerStatut(facture.id, "En retard")}
                      className="rounded-xl bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      En retard
                    </button>

                    <button
                      onClick={() => changerStatut(facture.id, "Annulée")}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                    >
                      Annulée
                    </button>

                    <button
                      onClick={() => supprimerFacture(facture.id)}
                      className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}