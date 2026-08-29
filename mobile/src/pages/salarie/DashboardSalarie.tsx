import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Brand from "../../components/Brand";
import BottomNav from "../../components/BottomNav";
import State from "../../components/State";
import { useAuth } from "../../context/AuthContext";
import { fichesDuSalarie, trouverSalarie } from "../../lib/salarie";
import { isoAujourdHui, texte } from "../../lib/format";

export default function DashboardSalarie(){
  const n=useNavigate();const {profil}=useAuth();const [fiche,setFiche]=useState<any|null>(null);const [error,setError]=useState("");
  useEffect(()=>{async function load(){if(!profil?.entreprise_id)return;try{const s=await trouverSalarie(profil);if(!s)throw new Error("Fiche salarié introuvable.");const fiches=await fichesDuSalarie(profil.entreprise_id,s.id);const today=isoAujourdHui();setFiche(fiches.find(f=>{const d=f.date_prevue||f.date_intervention;const fin=f.date_fin_prevue||d;return d&&today>=d&&today<=fin;})||fiches.find(f=>f.statut==="en_cours")||fiches[0]||null);}catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}}void load();},[profil?.id]);
  return <main className="dashboard-pro employee"><header className="dashboard-pro-header"><div><Brand inverse compact/><div className="hello-block"><p>ESPACE TERRAIN</p><h1>Bonjour {profil?.prenom||""} 👋</h1></div></div></header><section className="dashboard-main">{error?<State type="error">{error}</State>:null}<section className="employee-today-card"><p className="eyebrow light">INTERVENTION DU JOUR</p><h2>{fiche?texte(fiche.titre,fiche.type_intervention,"Intervention"):"Aucune intervention aujourd’hui"}</h2>{fiche?<><p>{texte(fiche.client_nom)} • {texte(fiche.ville_chantier,fiche.ville)}</p><div className="employee-progress"><span className={fiche.etape_materiel_statut==="valide"?"done":"active"}>1</span><i/><span className={fiche.etape_arrivee_statut==="valide"?"done":""}>2</span><i/><span className={fiche.etape_fin_statut==="valide"?"done":""}>3</span></div><div className="employee-progress-labels"><small>Matériel</small><small>Arrivée</small><small>Fin</small></div><button className="hero-button full" onClick={()=>n(`/salarie/interventions/${fiche.id}`)}>Ouvrir mon intervention →</button></>:null}</section><div className="quick-grid employee-quick"><button onClick={()=>n("/salarie/planning")}><span>📅</span><div><strong>Planning</strong><small>Voir ma semaine</small></div></button><button onClick={()=>n("/salarie/demandes")}><span>＋</span><div><strong>Demandes</strong><small>Congés, RDV, divers</small></div></button></div></section><BottomNav espace="salarie" active="accueil"/></main>;
}
