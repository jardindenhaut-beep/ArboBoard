import { useEffect, useState } from "react";
import Page from "../../components/Page";
import ListCard from "../../components/ListCard";
import StateCard from "../../components/StateCard";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { dateFr, texte } from "../../lib/format";

export default function PlanningPage() {
  const { profil } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!profil?.entreprise_id) return;
      const { data, error } = await supabase
        .from("fiches_intervention")
        .select("*")
        .eq("entreprise_id", profil.entreprise_id)
        .neq("statut", "archivee")
        .order("date_prevue", { ascending: true });
      if (error) setError(error.message);
      else setItems(data || []);
    }
    void load();
  }, [profil?.entreprise_id]);

  return (
    <Page titre="Planning" sousTitre="Planning de l’équipe">
      {error ? <StateCard texte={error} type="error" /> : null}
      <div className="list">
        {items.map(item => (
          <ListCard
            key={item.id}
            titre={`${dateFr(item.date_prevue || item.date_intervention)} — ${texte(item.titre, item.type_intervention, "Intervention")}`}
            meta={`${texte(item.heure_debut_prevue, item.heure_debut)} • ${texte(item.client_nom)} • ${texte(item.salarie_nom)}`}
            badge={texte(item.statut)}
          />
        ))}
      </div>
    </Page>
  );
}
