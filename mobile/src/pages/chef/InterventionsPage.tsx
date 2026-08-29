import { useEffect, useMemo, useState } from "react";
import Page from "../../components/Page";
import ListCard from "../../components/ListCard";
import StateCard from "../../components/StateCard";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { dateFr, texte } from "../../lib/format";

export default function InterventionsPage() {
  const { profil } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [filtre, setFiltre] = useState("tous");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!profil?.entreprise_id) return;
    try {
      setLoading(true); setError("");
      const { data, error } = await supabase
        .from("fiches_intervention")
        .select("*")
        .eq("entreprise_id", profil.entreprise_id)
        .order("date_prevue", { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [profil?.entreprise_id]);

  const filtered = useMemo(
    () => filtre === "tous" ? items : items.filter(x => x.statut === filtre),
    [items, filtre]
  );

  return (
    <Page titre="Interventions" sousTitre="Chantiers">
      <div className="toolbar">
        <select className="search" value={filtre} onChange={e => setFiltre(e.target.value)}>
          <option value="tous">Tous les statuts</option>
          <option value="brouillon">Brouillons</option>
          <option value="planifiee">Planifiées</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminées</option>
          <option value="archivee">Archivées</option>
        </select>
        <button className="small-button" onClick={() => void load()}>↻</button>
      </div>
      {error ? <StateCard texte={error} type="error" /> : null}
      <div className="list">
        {filtered.map(item => (
          <ListCard
            key={item.id}
            titre={texte(item.titre, item.type_intervention, "Intervention")}
            meta={`${dateFr(item.date_prevue || item.date_intervention)} • ${texte(item.client_nom, item.ville_chantier, item.ville)}`}
            badge={texte(item.statut)}
          />
        ))}
      </div>
      {!loading && !filtered.length ? <StateCard texte="Aucune intervention." /> : null}
    </Page>
  );
}
