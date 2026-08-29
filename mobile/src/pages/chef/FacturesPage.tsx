import { useEffect, useMemo, useState } from "react";
import Screen from "../../components/Screen";
import State from "../../components/State";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { argent, dateFr, normaliser, texte } from "../../lib/format";
import { envoyerDocumentEmail, ouvrirPdf, transformerDevisEnFacture } from "../../lib/documents";

export default function FacturesPage(){
  const {profil}=useAuth();const [factures,setFactures]=useState<any[]>([]);const [devis,setDevis]=useState<any[]>([]);const [clients,setClients]=useState<any[]>([]);
  const [tab,setTab]=useState<"factures"|"a_facturer">("factures");const [busyId,setBusyId]=useState("");const [error,setError]=useState("");const [message,setMessage]=useState("");
  async function load(){if(!profil?.entreprise_id)return;try{setError("");const [f,d,c]=await Promise.all([
    supabase.from("factures").select("*").eq("entreprise_id",profil.entreprise_id).or("est_avoir.is.false,est_avoir.is.null").order("date_facture",{ascending:false}),
    supabase.from("devis").select("*").eq("entreprise_id",profil.entreprise_id).order("date_devis",{ascending:false}),
    supabase.from("clients").select("*").eq("entreprise_id",profil.entreprise_id)
  ]);if(f.error)throw f.error;if(d.error)throw d.error;if(c.error)throw c.error;setFactures(f.data||[]);setDevis(d.data||[]);setClients(c.data||[]);}catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}}
  useEffect(()=>{void load();},[profil?.entreprise_id]);
  const devisAFacturer=useMemo(()=>{const deja=new Set(factures.map(f=>f.devis_id).filter(Boolean));return devis.filter(d=>["accepte","accepté","signe","signé"].includes(normaliser(d.statut))&&!deja.has(d.id));},[devis,factures]);
  function emailClient(doc:any){return texte(clients.find(x=>x.id===doc.client_id)?.email);}
  async function creerFacture(id:string){try{setBusyId(id);setError("");setMessage("");const r=await transformerDevisEnFacture(id);setMessage(r.dejaExistante?`La facture ${texte(r.numero)} existe déjà.`:`Facture ${texte(r.numero,"créée")} créée avec succès.`);setTab("factures");await load();}catch(e){setError(e instanceof Error?e.message:"Création impossible.");}finally{setBusyId("");}}
  async function envoyer(f:any){const email=emailClient(f);if(!email){setError("Aucune adresse e-mail n’est renseignée pour ce client.");return;}try{setBusyId(f.id);setError("");setMessage("");await envoyerDocumentEmail({typeDocument:"facture",documentId:f.id,email});setMessage(`Facture envoyée à ${email}.`);}catch(e){setError(e instanceof Error?e.message:"Envoi impossible.");}finally{setBusyId("");}}
  return <Screen title="Factures" subtitle="Facturez sans ressaisie">
    {error?<State type="error">{error}</State>:null}{message?<State type="success">{message}</State>:null}
    <div className="segmented"><button className={tab==="factures"?"active":""} onClick={()=>setTab("factures")}>Factures <span>{factures.length}</span></button><button className={tab==="a_facturer"?"active":""} onClick={()=>setTab("a_facturer")}>À facturer <span>{devisAFacturer.length}</span></button></div>
    {tab==="a_facturer"?<div className="document-list">{devisAFacturer.map(d=><article className="invoice-ready-card" key={d.id}><div className="ready-icon">✓</div><div className="ready-copy"><small>DEVIS ACCEPTÉ</small><h3>{texte(d.numero,d.client_nom,"Devis")}</h3><p>{texte(d.client_nom)}</p><strong>{argent(d.total_ttc)} TTC</strong></div><button className="primary tall" disabled={busyId===d.id} onClick={()=>void creerFacture(d.id)}>{busyId===d.id?"Création…":"Créer la facture"}</button></article>)}{!devisAFacturer.length?<div className="empty-card"><span>✓</span><h3>Tout est à jour</h3><p>Aucun devis accepté n’attend sa facture.</p></div>:null}</div>
    :<div className="document-list">{factures.map(f=><article className="document-card" key={f.id}><div className="document-card-top"><div><small>{texte(f.numero,"Facture")}</small><h3>{texte(f.client_nom,"Client")}</h3></div><span className={`status-chip status-${normaliser(f.statut)}`}>{texte(f.statut,"Brouillon")}</span></div><div className="document-meta"><span>{dateFr(f.date_facture)}</span><strong>{argent(f.total_ttc)}</strong></div><div className="payment-progress"><div><span style={{width:`${Math.min(100,f.total_ttc?(Number(f.montant_paye||0)/Number(f.total_ttc))*100:0)}%`}}/></div><small>Payé : {argent(f.montant_paye)} • Reste : {argent(f.reste_a_payer??Number(f.total_ttc||0)-Number(f.montant_paye||0))}</small></div><div className="document-actions"><button onClick={()=>void ouvrirPdf("facture",f.id)}>Voir PDF</button><button className="primary-mini" disabled={busyId===f.id} onClick={()=>void envoyer(f)}>{busyId===f.id?"Envoi…":"Envoyer"}</button></div></article>)}</div>}
  </Screen>;
}
