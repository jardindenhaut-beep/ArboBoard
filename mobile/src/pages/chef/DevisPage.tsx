import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "../../components/Screen";
import State from "../../components/State";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { argent, dateFr, normaliser, texte } from "../../lib/format";
import { ouvrirPdf, envoyerDocumentEmail } from "../../lib/documents";

export default function DevisPage() {
  const navigate = useNavigate(); const { profil } = useAuth();
  const [items,setItems]=useState<any[]>([]); const [clients,setClients]=useState<any[]>([]); const [q,setQ]=useState(""); const [filtre,setFiltre]=useState("tous");
  const [error,setError]=useState(""); const [message,setMessage]=useState(""); const [busyId,setBusyId]=useState("");

  async function load(){
    if(!profil?.entreprise_id)return;
    try{setError(""); const [d,c]=await Promise.all([
      supabase.from("devis").select("*").eq("entreprise_id",profil.entreprise_id).order("date_devis",{ascending:false}).order("created_at",{ascending:false}),
      supabase.from("clients").select("*").eq("entreprise_id",profil.entreprise_id)
    ]); if(d.error)throw d.error;if(c.error)throw c.error;setItems(d.data||[]);setClients(c.data||[]);}catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
  }
  useEffect(()=>{void load();},[profil?.entreprise_id]);
  const filtered=useMemo(()=>{const n=normaliser(q);return items.filter(item=>{if(filtre!=="tous"&&normaliser(item.statut)!==normaliser(filtre))return false;if(!n)return true;return normaliser([item.numero,item.client_nom,item.objet,item.description].join(" ")).includes(n);});},[items,q,filtre]);
  function emailClient(devis:any){return texte(clients.find(x=>x.id===devis.client_id)?.email);}
  async function envoyer(devis:any){const email=emailClient(devis);if(!email){setError("Aucune adresse e-mail n’est renseignée pour ce client.");return;}try{setBusyId(devis.id);setError("");setMessage("");await envoyerDocumentEmail({typeDocument:"devis",documentId:devis.id,email});setMessage(`Devis envoyé à ${email}.`);await load();}catch(e){setError(e instanceof Error?e.message:"Envoi impossible.");}finally{setBusyId("");}}

  return <Screen title="Devis" subtitle="Simple, rapide, professionnel" right={<button className="round-button plus" onClick={()=>navigate("/chef/devis/nouveau")}>＋</button>}>
    {error?<State type="error">{error}</State>:null}{message?<State type="success">{message}</State>:null}
    <div className="toolbar-pro"><input className="search-input" placeholder="Rechercher un devis…" value={q} onChange={e=>setQ(e.target.value)}/><select value={filtre} onChange={e=>setFiltre(e.target.value)}><option value="tous">Tous</option><option value="brouillon">Brouillons</option><option value="envoye">Envoyés</option><option value="accepte">Acceptés</option><option value="refuse">Refusés</option></select></div>
    <div className="document-list">{filtered.map(devis=><article className="document-card" key={devis.id}><div className="document-card-top"><div><small>{texte(devis.numero,"Devis")}</small><h3>{texte(devis.client_nom,"Client")}</h3></div><span className={`status-chip status-${normaliser(devis.statut)}`}>{texte(devis.statut,"Brouillon")}</span></div><p className="document-object">{texte(devis.objet,devis.description,"Devis professionnel")}</p><div className="document-meta"><span>{dateFr(devis.date_devis)}</span><strong>{argent(devis.total_ttc)}</strong></div><div className="document-actions"><button onClick={()=>void ouvrirPdf("devis",devis.id)}>Voir PDF</button><button className="primary-mini" disabled={busyId===devis.id} onClick={()=>void envoyer(devis)}>{busyId===devis.id?"Envoi…":"Envoyer"}</button></div></article>)}</div>
    {!filtered.length?<div className="empty-card"><span>▱</span><h3>Aucun devis</h3><p>Créez votre premier devis mobile en quelques étapes.</p><button className="primary" onClick={()=>navigate("/chef/devis/nouveau")}>＋ Nouveau devis</button></div>:null}
  </Screen>;
}
