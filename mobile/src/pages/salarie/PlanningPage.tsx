import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../../components/Page";
import ListCard from "../../components/ListCard";
import StateCard from "../../components/StateCard";
import { useAuth } from "../../context/AuthContext";
import { fichesDuSalarie, trouverSalarie } from "../../lib/salarie";
import { dateFr, texte } from "../../lib/format";

export default function PlanningPage() {
  const navigate = useNavigate();
  const { profil } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!profil?.entreprise_id) return;
      try {
        const s = await trouverSalarie(profil);
        if (!s) throw new Error("Fiche salarié introuvable.");
        setItems(await fichesDuSalarie(profil.entreprise_id, s.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chargement impossible.");
      }
    }
    void load();
  }, [profil?.id]);

  return (
    <Page titre="Mon planning" sousTitre="Interventions">
      {error ? <StateCard texte={error} type="error" /> : null}
      <div className="list">
        {items.map(item => (
          <ListCard
            key={item.id}
            titre={`${dateFr(item.date_prevue || item.date_intervention)} — ${texte(item.titre, item.type_intervention)}`}
            meta={`${texte(item.heure_debut_prevue, item.heure_debut)} • ${texte(item.client_nom)}`}
            badge={texte(item.statut)}
            onClick={() => navigate(`/salarie/interventions/${item.id}`)}
          />
        ))}
      </div>
    </Page>
  );
}
