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
  client_nom: string;
  chantier_titre: string;
  objet: string;
  date_devis: string | null;
  validite_jours: number;
  statut: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  created_at: string;
};

type LigneDevis = {
  designation: string;
  quantite: string;
  unite: string;
  prix_unitaire_ht: string;
  tva: string;
};

type FormDevis = {
  client_id: string;
  client_nom: string;
  chantier_id: string;
  chantier_titre: string;
  objet: string;
  description: string;
  date_devis: string;
  validite_jours: string;
  statut: string;
  notes: string;
};

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

const ligneVide: LigneDevis = {
  designation: "",
  quantite: "1",
  unite: "unité",
  prix_unitaire_ht: "0",
  tva: "20",
};

const formulaireVide: FormDevis = {
  client_id: "",
  client_nom: "",
  chantier_id: "",
  chantier_titre: "",
  objet: "",
  description: "",
  date_devis: dateAujourdhui(),
  validite_jours: "30",
  statut: "Brouillon",
  notes: "",
};

export default function DevisChefPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");

  const [clients, setClients] = useState<ClientEntreprise[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);

  const [form, setForm] = useState<FormDevis>(formulaireVide);
  const [lignes, setLignes] = useState<LigneDevis[]>([{ ...ligneVide }]);

  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    chargerContexteEtDevis();
  }, []);

  async function chargerContexteEtDevis() {
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
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des devis.");
    } else {
      setDevis(data || []);
    }
  }

  function modifierChamp(champ: keyof FormDevis, valeur: string) {
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

  function modifierLigne(index: number, champ: keyof LigneDevis, valeur: string) {
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

  function calculerLigne(ligne: LigneDevis) {
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

  function genererNumeroDevis() {
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
    const jour = String(maintenant.getDate()).padStart(2, "0");
    const heure = String(maintenant.getHours()).padStart(2, "0");
    const minute = String(maintenant.getMinutes()).padStart(2, "0");
    const seconde = String(maintenant.getSeconds()).padStart(2, "0");

    return `DEV-${annee}${mois}${jour}-${heure}${minute}${seconde}`;
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

  async function enregistrerDevis() {
    setSauvegarde(true);
    setMessage("");

    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée. Reconnecte-toi.");
      setSauvegarde(false);
      return;
    }

    if (!form.client_nom.trim()) {
      setMessage("Merci de sélectionner un client.");
      setSauvegarde(false);
      return;
    }

    if (!form.objet.trim()) {
      setMessage("Merci de remplir l'objet du devis.");
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
      setMessage("Merci d'ajouter au moins une ligne de devis valide.");
      setSauvegarde(false);
      return;
    }

    const numero = genererNumeroDevis();

    const { data: devisCree, error: erreurDevis } = await supabase
      .from("devis")
      .insert({
        entreprise_id: entrepriseId,
        numero,
        client_id: form.client_id || null,
        client_nom: form.client_nom,
        chantier_id: form.chantier_id || null,
        chantier_titre: form.chantier_titre,
        objet: form.objet,
        description: form.description,
        date_devis: form.date_devis || null,
        validite_jours: Number(form.validite_jours) || 30,
        statut: form.statut,
        total_ht: totaux.totalHt,
        total_tva: totaux.totalTva,
        total_ttc: totaux.totalTtc,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (erreurDevis || !devisCree) {
      setMessage(
        erreurDevis?.message || "Erreur : le devis n'a pas été créé."
      );
      setSauvegarde(false);
      return;
    }

    const lignesAInserer = lignesValides.map((ligne, index) => {
      const calcul = calculerLigne(ligne);

      return {
        entreprise_id: entrepriseId,
        devis_id: devisCree.id,
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
      .from("devis_lignes")
      .insert(lignesAInserer);

    if (erreurLignes) {
      await supabase
        .from("devis")
        .delete()
        .eq("id", devisCree.id)
        .eq("entreprise_id", entrepriseId);

      setMessage(
        erreurLignes.message ||
          "Erreur : les lignes du devis n'ont pas été enregistrées."
      );
      setSauvegarde(false);
      return;
    }

    setMessage(`Devis ${numero} créé avec succès.`);

    setForm({
      ...formulaireVide,
      date_devis: dateAujourdhui(),
    });

    setLignes([{ ...ligneVide }]);

    await chargerDevis(entrepriseId);
    setSauvegarde(false);
  }

  async function changerStatut(id: string, statut: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const { error } = await supabase
      .from("devis")
      .update({
        statut,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors du changement de statut.");
    } else {
      setMessage("Statut du devis mis à jour.");
      await chargerDevis(entrepriseId);
    }
  }

  async function supprimerDevis(id: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const confirmation = confirm(
      "Supprimer ce devis ? Les lignes du devis seront supprimées aussi."
    );

    if (!confirmation) {
      return;
    }

    const { error } = await supabase
      .from("devis")
      .delete()
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors de la suppression du devis.");
    } else {
      setMessage("Devis supprimé.");
      await chargerDevis(entrepriseId);
    }
  }

  const devisFiltres = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    if (!texte) {
      return devis;
    }

    return devis.filter((devisItem) => {
      const contenu = `
        ${devisItem.numero}
        ${devisItem.client_nom}
        ${devisItem.chantier_titre}
        ${devisItem.objet}
        ${devisItem.statut}
      `;

      return contenu.toLowerCase().includes(texte);
    });
  }, [devis, recherche]);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Devis</h1>

          <p className="mt-2 text-slate-600">
            Crée des devis reliés aux clients et aux chantiers avec calcul automatique HT, TVA et TTC.
          </p>

          {nomEntreprise && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise connectée : {nomEntreprise}
            </p>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Nouveau devis
          </h2>

          <div className="grid gap-5">
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
                  Objet du devis
                </label>

                <input
                  value={form.objet}
                  onChange={(e) => modifierChamp("objet", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Exemple : Taille de haies et évacuation"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date du devis
                </label>

                <input
                  type="date"
                  value={form.date_devis}
                  onChange={(e) => modifierChamp("date_devis", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Validité jours
                </label>

                <input
                  type="number"
                  value={form.validite_jours}
                  onChange={(e) =>
                    modifierChamp("validite_jours", e.target.value)
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
                placeholder="Description globale des travaux..."
              />
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Lignes du devis
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
                  <option>Envoyé</option>
                  <option>Accepté</option>
                  <option>Refusé</option>
                  <option>Facturé</option>
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
              onClick={enregistrerDevis}
              disabled={sauvegarde}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {sauvegarde ? "Création du devis..." : "Créer le devis"}
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
            Rechercher un devis
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
            Liste des devis
          </h2>

          {chargement ? (
            <p className="text-slate-600">Chargement...</p>
          ) : devisFiltres.length === 0 ? (
            <p className="text-slate-600">Aucun devis trouvé.</p>
          ) : (
            <div className="grid gap-4">
              {devisFiltres.map((devisItem) => (
                <div
                  key={devisItem.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {devisItem.numero}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {devisItem.client_nom || "Client non renseigné"} —{" "}
                        {devisItem.objet}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Date : {afficherDate(devisItem.date_devis)} — Validité :{" "}
                        {devisItem.validite_jours} jours
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {devisItem.statut}
                    </span>
                  </div>

                  <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                    <p>
                      <span className="font-medium">HT :</span>{" "}
                      {formatPrix(Number(devisItem.total_ht) || 0)}
                    </p>

                    <p>
                      <span className="font-medium">TVA :</span>{" "}
                      {formatPrix(Number(devisItem.total_tva) || 0)}
                    </p>

                    <p>
                      <span className="font-medium">TTC :</span>{" "}
                      {formatPrix(Number(devisItem.total_ttc) || 0)}
                    </p>
                  </div>

                  {devisItem.chantier_titre && (
                    <p className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      Chantier lié : {devisItem.chantier_titre}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/chef/devis/${devisItem.id}`}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Voir / PDF
                    </Link>

                    <button
                      onClick={() => changerStatut(devisItem.id, "Envoyé")}
                      className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                    >
                      Envoyé
                    </button>

                    <button
                      onClick={() => changerStatut(devisItem.id, "Accepté")}
                      className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                    >
                      Accepté
                    </button>

                    <button
                      onClick={() => changerStatut(devisItem.id, "Refusé")}
                      className="rounded-xl bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      Refusé
                    </button>

                    <button
                      onClick={() => changerStatut(devisItem.id, "Facturé")}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                    >
                      Facturé
                    </button>

                    <button
                      onClick={() => supprimerDevis(devisItem.id)}
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