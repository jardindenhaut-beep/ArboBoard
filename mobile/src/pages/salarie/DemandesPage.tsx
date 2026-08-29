import { useEffect, useState } from "react";
import Page from "../../components/Page";
import StateCard from "../../components/StateCard";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { trouverSalarie } from "../../lib/salarie";
import { dateFr, texte } from "../../lib/format";

export default function DemandesPage() {
  const { profil } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [salarieId, setSalarieId] = useState<string | null>(null);
  const [type, setType] = useState("conge");
  const [date, setDate] = useState("");
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    if (!profil?.entreprise_id) return;
    try {
      const s = await trouverSalarie(profil);
      if (!s) throw new Error("Fiche salarié introuvable.");
      setSalarieId(s.id);

      const tables = ["planning_demandes", "demandes_planning", "demandes"];
      let dernier: any = null;

      for (const table of tables) {
        const r = await supabase
          .from(table)
          .select("*")
          .eq("entreprise_id", profil.entreprise_id)
          .eq("salarie_id", s.id)
          .order("created_at", { ascending: false });

        if (!r.error) {
          setItems(r.data || []);
          return;
        }
        dernier = r.error;
      }

      throw dernier || new Error("Table des demandes introuvable.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }

  useEffect(() => { void load(); }, [profil?.id]);

  async function creer() {
    if (!profil?.entreprise_id || !salarieId || !date) return;

    setError(""); setMessage("");

    const payloads = [
      { type, date_debut: date, date_fin: date, motif: motif || null, statut: "en_attente" },
      { type_demande: type, date_debut: date, date_fin: date, motif: motif || null, statut: "en_attente" },
      { type, date, motif: motif || null, statut: "en_attente" },
    ];

    const tables = ["planning_demandes", "demandes_planning", "demandes"];

    for (let i = 0; i < tables.length; i++) {
      const { error } = await supabase.from(tables[i]).insert({
        entreprise_id: profil.entreprise_id,
        salarie_id: salarieId,
        utilisateur_id: profil.id,
        ...payloads[i],
      });
      if (!error) {
        setMessage("Demande envoyée.");
        setDate(""); setMotif("");
        await load();
        return;
      }
    }

    setError("Impossible d’enregistrer la demande avec le schéma actuel. La connexion reste fonctionnelle.");
  }

  return (
    <Page titre="Mes demandes" sousTitre="Congés, rendez-vous, divers">
      {error ? <StateCard texte={error} type="error" /> : null}
      {message ? <StateCard texte={message} type="success" /> : null}

      <div className="panel">
        <h2>Nouvelle demande</h2>
        <label>Type
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="conge">Congé</option>
            <option value="rdv">Rendez-vous</option>
            <option value="divers">Divers</option>
          </select>
        </label>
        <label>Date
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label>Motif
          <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={3} />
        </label>
        <button className="primary" onClick={() => void creer()}>Envoyer la demande</button>
      </div>

      <div className="list">
        {items.map(item => (
          <div className="list-card static" key={item.id}>
            <div className="list-card-top">
              <strong>{texte(item.type_demande, item.type, "Demande")}</strong>
              <span className="badge">{texte(item.statut)}</span>
            </div>
            <small>{dateFr(item.date_debut || item.date)} • {texte(item.motif)}</small>
          </div>
        ))}
      </div>
    </Page>
  );
}
