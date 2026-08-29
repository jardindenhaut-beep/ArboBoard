import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Brand from "../../components/Brand";
import BottomNav from "../../components/BottomNav";
import State from "../../components/State";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { argent, isoAujourdHui, normaliser, texte } from "../../lib/format";

export default function DashboardChef() {
  const navigate = useNavigate();
  const { profil } = useAuth();
  const [devis, setDevis] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!profil?.entreprise_id) return;
    try {
      setLoading(true); setError("");
      const [d, f, i] = await Promise.all([
        supabase.from("devis").select("*").eq("entreprise_id", profil.entreprise_id).order("date_devis", { ascending: false }),
        supabase.from("factures").select("*").eq("entreprise_id", profil.entreprise_id).order("date_facture", { ascending: false }),
        supabase.from("fiches_intervention").select("*").eq("entreprise_id", profil.entreprise_id).neq("statut", "archivee").order("date_prevue", { ascending: true }),
      ]);
      if (d.error) throw d.error; if (f.error) throw f.error; if (i.error) throw i.error;
      setDevis(d.data || []); setFactures(f.data || []); setInterventions(i.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible de charger le dashboard."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [profil?.entreprise_id]);

  const stats = useMemo(() => {
    const today = isoAujourdHui();
    const interventionsAujourdhui = interventions.filter(x => {
      const debut = x.date_prevue || x.date_intervention;
      const fin = x.date_fin_prevue || debut;
      return debut && today >= debut && today <= fin;
    });
    const devisRelance = devis.filter(x => ["envoye", "envoyé", "relance"].includes(normaliser(x.statut)));
    const facturesAttente = factures.filter(x => ["brouillon", "envoyee", "envoyée", "en_attente", "retard"].includes(normaliser(x.statut)));
    const ca = factures.filter(x => ["payee", "payée", "partiellement_payee", "partiellement payée"].includes(normaliser(x.statut)))
      .reduce((total, x) => total + Number(x.montant_paye || x.total_ttc || 0), 0);
    return { interventionsAujourdhui, devisRelance, facturesAttente, ca };
  }, [devis, factures, interventions]);

  return (
    <main className="dashboard-pro">
      <header className="dashboard-pro-header">
        <div>
          <Brand inverse compact />
          <div className="hello-block">
            <p>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1>Bonjour {profil?.prenom || ""} 👋</h1>
          </div>
        </div>
        <button className="bell-button" type="button" onClick={() => navigate("/chef/plus")}>•••</button>
      </header>

      <section className="dashboard-main">
        {error ? <State type="error">{error}</State> : null}
        <div className="metric-grid">
          <button onClick={() => navigate("/chef/interventions")}><span className="metric-icon">◉</span><strong>{loading ? "…" : stats.interventionsAujourdhui.length}</strong><small>Interventions aujourd’hui</small></button>
          <button onClick={() => navigate("/chef/devis")}><span className="metric-icon">▱</span><strong>{loading ? "…" : stats.devisRelance.length}</strong><small>Devis à relancer</small></button>
          <button onClick={() => navigate("/chef/factures")}><span className="metric-icon">€</span><strong>{loading ? "…" : stats.facturesAttente.length}</strong><small>Factures en attente</small></button>
          <button onClick={() => navigate("/chef/factures")}><span className="metric-icon">↗</span><strong className="metric-money">{loading ? "…" : argent(stats.ca)}</strong><small>Encaissements suivis</small></button>
        </div>

        <section className="section-block">
          <div className="section-title-row"><div><p className="eyebrow">ACTIONS RAPIDES</p><h2>Que voulez-vous faire ?</h2></div></div>
          <div className="quick-grid">
            <button className="quick-primary" onClick={() => navigate("/chef/devis/nouveau")}><span>＋</span><div><strong>Devis</strong><small>Créer en quelques étapes</small></div></button>
            <button onClick={() => navigate("/chef/clients")}><span>＋</span><div><strong>Client</strong><small>Ajouter une fiche</small></div></button>
            <button className="wide" onClick={() => navigate("/chef/interventions")}><span>＋</span><div><strong>Intervention</strong><small>Préparer un chantier</small></div></button>
          </div>
        </section>

        <section className="section-block">
          <div className="section-title-row"><div><p className="eyebrow">AUJOURD’HUI</p><h2>Votre journée</h2></div><button className="link-button" onClick={() => navigate("/chef/planning")}>Planning →</button></div>
          <div className="today-list">
            {stats.interventionsAujourdhui.slice(0, 4).map(fiche => (
              <button key={fiche.id} className="today-item" onClick={() => navigate("/chef/interventions")}>
                <div className="time-column"><strong>{texte(fiche.heure_debut_prevue, fiche.heure_debut, "—").slice(0,5)}</strong></div>
                <div className="today-copy"><strong>{texte(fiche.titre, fiche.type_intervention, "Intervention")}</strong><small>{texte(fiche.client_nom, "Client")}{texte(fiche.salarie_nom) ? ` • ${texte(fiche.salarie_nom)}` : ""}</small></div>
                <span className="status-chip">{texte(fiche.statut, "Planifiée")}</span>
              </button>
            ))}
            {!loading && stats.interventionsAujourdhui.length === 0 ? <div className="empty-soft"><span>✓</span><div><strong>Aucun chantier planifié aujourd’hui</strong><small>Votre journée est libre dans Arboboard.</small></div></div> : null}
          </div>
        </section>
      </section>
      <BottomNav espace="chef" active="accueil" />
    </main>
  );
}
