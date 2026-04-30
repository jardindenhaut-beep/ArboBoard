"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

type EntrepriseParametres = {
  nom: string;
  siret: string;
  email: string;
  telephone: string;
  adresse: string;
  tva: number;
};

type ClientComplet = {
  id: string;
  type_client: string;
  nom: string;
  prenom: string;
  entreprise: string;
  telephone: string;
  email: string;
  adresse_facturation: string;
  adresse_chantier: string;
  code_postal: string;
  ville: string;
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
  date_devis: string | null;
  validite_jours: number;
  statut: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string;
  created_at: string;
};

type LigneDevis = {
  id: string;
  devis_id: string;
  entreprise_id: string | null;
  ordre: number;
  designation: string;
  quantite: number;
  unite: string;
  prix_unitaire_ht: number;
  tva: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
};

export default function DetailDevisPage() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params.id) ? params.id[0] : String(params.id || "");

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntrepriseSaas, setNomEntrepriseSaas] = useState("");

  const [entreprise, setEntreprise] = useState<EntrepriseParametres | null>(null);
  const [client, setClient] = useState<ClientComplet | null>(null);
  const [devis, setDevis] = useState<Devis | null>(null);
  const [lignes, setLignes] = useState<LigneDevis[]>([]);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (id) {
      chargerPage();
    }
  }, [id]);

  async function chargerPage() {
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
    setNomEntrepriseSaas(contexte.entreprise.nom_entreprise);

    await chargerDetailDevis(contexte.entreprise.id);
  }

  async function chargerDetailDevis(idEntreprise: string) {
    const { data: entrepriseData } = await supabase
      .from("entreprise_parametres")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .maybeSingle();

    if (entrepriseData) {
      setEntreprise(entrepriseData);
    }

    const { data: devisData, error: erreurDevis } = await supabase
      .from("devis")
      .select("*")
      .eq("id", id)
      .eq("entreprise_id", idEntreprise)
      .maybeSingle();

    if (erreurDevis || !devisData) {
      setMessage(
        erreurDevis?.message ||
          "Impossible de charger ce devis. Il n'existe pas ou n'appartient pas à cette entreprise."
      );
      setChargement(false);
      return;
    }

    setDevis(devisData);

    if (devisData.client_id) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("id", devisData.client_id)
        .eq("entreprise_id", idEntreprise)
        .maybeSingle();

      if (clientData) {
        setClient(clientData);
      }
    }

    const { data: lignesData, error: erreurLignes } = await supabase
      .from("devis_lignes")
      .select("*")
      .eq("devis_id", id)
      .eq("entreprise_id", idEntreprise)
      .order("ordre", { ascending: true });

    if (erreurLignes) {
      setMessage(
        erreurLignes.message || "Impossible de charger les lignes du devis."
      );
    } else {
      setLignes(lignesData || []);
    }

    setChargement(false);
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

  function calculerDateValidite() {
    if (!devis?.date_devis) {
      return "—";
    }

    const date = new Date(devis.date_devis + "T00:00:00");
    date.setDate(date.getDate() + Number(devis.validite_jours || 30));

    return date.toLocaleDateString("fr-FR");
  }

  function nomClientComplet() {
    if (!client) {
      return devis?.client_nom || "Client non renseigné";
    }

    if (client.type_client === "Professionnel" && client.entreprise) {
      return client.entreprise;
    }

    const nomComplet = `${client.prenom || ""} ${client.nom || ""}`.trim();

    if (nomComplet) {
      return nomComplet;
    }

    return client.entreprise || devis?.client_nom || "Client non renseigné";
  }

  function imprimerPDF() {
    window.print();
  }

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Chargement du devis...</p>
      </main>
    );
  }

  if (!devis) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-red-700">
            {message || "Devis introuvable."}
          </p>

          <button
            onClick={() => router.push("/chef/devis")}
            className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
          >
            Retour aux devis
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 print:bg-white print:p-0">
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          .print-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-6 flex max-w-5xl flex-wrap gap-3">
        <button
          onClick={() => router.push("/chef/devis")}
          className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-300"
        >
          Retour aux devis
        </button>

        <button
          onClick={imprimerPDF}
          className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
        >
          Imprimer / PDF
        </button>
      </div>

      {message && (
        <div className="no-print mx-auto mb-6 max-w-5xl rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-800">
          {message}
        </div>
      )}

      <div className="print-page mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">DEVIS</h1>

            <p className="mt-2 text-slate-600">N° {devis.numero}</p>
            <p className="text-slate-600">
              Date : {afficherDate(devis.date_devis)}
            </p>
            <p className="text-slate-600">
              Valable jusqu’au : {calculerDateValidite()}
            </p>

            <p className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              Statut : {devis.statut}
            </p>

            {entrepriseId && (
              <p className="no-print mt-2 text-xs text-slate-400">
                Entreprise SaaS : {nomEntrepriseSaas}
              </p>
            )}
          </div>

          <div className="text-left md:text-right">
            <h2 className="text-xl font-bold text-slate-900">
              {entreprise?.nom || nomEntrepriseSaas || "Entreprise"}
            </h2>

            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
              {entreprise?.adresse || ""}
            </p>

            <p className="text-sm text-slate-600">
              SIRET : {entreprise?.siret || "—"}
            </p>

            <p className="text-sm text-slate-600">
              Tél : {entreprise?.telephone || "—"}
            </p>

            <p className="text-sm text-slate-600">
              Email : {entreprise?.email || "—"}
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Client
            </h2>

            <p className="font-medium text-slate-900">{nomClientComplet()}</p>

            {client && (
              <div className="mt-2 text-sm text-slate-600">
                {client.telephone && <p>Tél : {client.telephone}</p>}
                {client.email && <p>Email : {client.email}</p>}

                <p className="mt-2 whitespace-pre-line">
                  {client.adresse_facturation ||
                    client.adresse_chantier ||
                    ""}
                </p>

                <p>
                  {client.code_postal || ""} {client.ville || ""}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Objet du devis
            </h2>

            <p className="font-medium text-slate-900">{devis.objet}</p>

            {devis.chantier_titre && (
              <p className="mt-2 text-sm text-slate-600">
                Chantier lié : {devis.chantier_titre}
              </p>
            )}

            {devis.description && (
              <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
                {devis.description}
              </p>
            )}
          </div>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 text-left text-slate-700">
              <tr>
                <th className="p-3">Désignation</th>
                <th className="p-3 text-right">Qté</th>
                <th className="p-3">Unité</th>
                <th className="p-3 text-right">PU HT</th>
                <th className="p-3 text-right">TVA</th>
                <th className="p-3 text-right">Total HT</th>
                <th className="p-3 text-right">Total TTC</th>
              </tr>
            </thead>

            <tbody>
              {lignes.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-600" colSpan={7}>
                    Aucune ligne enregistrée pour ce devis.
                  </td>
                </tr>
              ) : (
                lignes.map((ligne) => (
                  <tr key={ligne.id} className="border-t border-slate-200">
                    <td className="p-3 text-slate-900">
                      {ligne.designation}
                    </td>

                    <td className="p-3 text-right text-slate-700">
                      {Number(ligne.quantite || 0)}
                    </td>

                    <td className="p-3 text-slate-700">{ligne.unite}</td>

                    <td className="p-3 text-right text-slate-700">
                      {formatPrix(Number(ligne.prix_unitaire_ht) || 0)}
                    </td>

                    <td className="p-3 text-right text-slate-700">
                      {Number(ligne.tva || 0)} %
                    </td>

                    <td className="p-3 text-right text-slate-700">
                      {formatPrix(Number(ligne.total_ht) || 0)}
                    </td>

                    <td className="p-3 text-right font-medium text-slate-900">
                      {formatPrix(Number(ligne.total_ttc) || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mb-8 flex justify-end">
          <div className="w-full max-w-sm rounded-2xl bg-slate-100 p-5">
            <div className="flex justify-between py-2 text-slate-700">
              <span>Total HT</span>
              <span>{formatPrix(Number(devis.total_ht) || 0)}</span>
            </div>

            <div className="flex justify-between border-t border-slate-300 py-2 text-slate-700">
              <span>TVA</span>
              <span>{formatPrix(Number(devis.total_tva) || 0)}</span>
            </div>

            <div className="flex justify-between border-t border-slate-300 pt-3 text-xl font-bold text-slate-900">
              <span>Total TTC</span>
              <span>{formatPrix(Number(devis.total_ttc) || 0)}</span>
            </div>
          </div>
        </div>

        {devis.notes && (
          <div className="mb-8 rounded-2xl border border-slate-200 p-5">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              Notes
            </h2>

            <p className="whitespace-pre-line text-sm text-slate-600">
              {devis.notes}
            </p>
          </div>
        )}

        <div className="border-t border-slate-200 pt-6 text-sm text-slate-500">
          <p>
            Bon pour accord, précédé de la mention manuscrite “Bon pour accord”,
            date et signature du client.
          </p>

          <div className="mt-10 h-24 rounded-2xl border border-dashed border-slate-300 p-4">
            Signature client
          </div>
        </div>
      </div>
    </main>
  );
}