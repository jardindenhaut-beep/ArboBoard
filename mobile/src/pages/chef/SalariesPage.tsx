import { useEffect, useMemo, useState } from "react";
import Page from "../../components/Page";
import ListCard from "../../components/ListCard";
import StateCard from "../../components/StateCard";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { texte } from "../../lib/format";

export default function SalariesPage() {
  const { profil } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!profil?.entreprise_id) return;
    try {
      setLoading(true); setError("");
      const { data, error } = await supabase
        .from("salaries")
        .select("*")
        .eq("entreprise_id", profil.entreprise_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [profil?.entreprise_id]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return items;
    return items.filter(x => JSON.stringify(x).toLowerCase().includes(n));
  }, [items, q]);

  return (
    <Page titre="Salariés" sousTitre="Équipe">
      <div className="toolbar">
        <input className="search" placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="small-button" type="button" onClick={() => void load()}>↻</button>
      </div>
      {error ? <StateCard texte={error} type="error" /> : null}
      {loading ? <StateCard texte="Chargement…" /> : null}
      <div className="list">
        {filtered.map((item) => (
          <ListCard
            key={item.id}
            titre={texte([item.prenom, item.nom].filter(Boolean).join(" "), item.email, "Salarié")}
            meta={texte(item.email, item.telephone)} badge={texte(item.statut)}
          />
        ))}
      </div>
      {!loading && !filtered.length ? <StateCard texte="Aucun élément." /> : null}
    </Page>
  );
}
