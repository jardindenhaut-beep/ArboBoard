import { useEffect, useMemo, useState } from "react";
import Screen from "../../components/Screen";
import State from "../../components/State";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { normaliser, texte } from "../../lib/format";

const VIDE = { type_client: "particulier", nom: "", prenom: "", entreprise: "", email: "", telephone: "", adresse: "", code_postal: "", ville: "" };

export default function ClientsPage() {
  const { profil } = useAuth();
  const [items, setItems] = useState<any[]>([]); const [q, setQ] = useState(""); const [creation, setCreation] = useState(false);
  const [form, setForm] = useState({ ...VIDE }); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");

  async function load() {
    if (!profil?.entreprise_id) return;
    try { setError(""); const { data, error } = await supabase.from("clients").select("*").eq("entreprise_id", profil.entreprise_id).order("created_at", { ascending: false }); if (error) throw error; setItems(data || []); }
    catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); }
  }
  useEffect(() => { void load(); }, [profil?.entreprise_id]);
  const filtered = useMemo(() => { const n = normaliser(q); if (!n) return items; return items.filter(item => normaliser([item.nom,item.prenom,item.entreprise,item.email,item.telephone,item.ville].join(" ")).includes(n)); }, [items,q]);

  async function enregistrer() {
    if (!profil?.entreprise_id) return;
    const nomOk = form.type_client === "particulier" ? Boolean(form.nom.trim() || form.prenom.trim()) : Boolean(form.entreprise.trim() || form.nom.trim());
    if (!nomOk) { setError("Renseignez au minimum le nom du client."); return; }
    try {
      setBusy(true); setError(""); setMessage("");
      const { error } = await supabase.from("clients").insert({ entreprise_id: profil.entreprise_id, ...form, statut: "actif" });
      if (error) throw error; setForm({ ...VIDE }); setCreation(false); setMessage("Client ajouté."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }

  return (
    <Screen title="Clients" subtitle={`${items.length} fiche${items.length > 1 ? "s" : ""}`} right={<button className="round-button plus" onClick={() => setCreation(true)}>＋</button>}>
      {error ? <State type="error">{error}</State> : null}{message ? <State type="success">{message}</State> : null}
      <input className="search-input" placeholder="Rechercher un client…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="client-list">
        {filtered.map(item => <button key={item.id} className="client-card"><span className="avatar-soft">{texte(item.prenom,item.nom,item.entreprise,"C").slice(0,1).toUpperCase()}</span><span className="client-main"><strong>{texte([item.prenom,item.nom].filter(Boolean).join(" "),item.entreprise,"Client")}</strong><small>{texte(item.telephone,item.email,[item.code_postal,item.ville].filter(Boolean).join(" "))}</small></span><span>›</span></button>)}
      </div>
      {creation ? <div className="sheet-overlay" onClick={() => !busy && setCreation(false)}><div className="sheet" onClick={e => e.stopPropagation()}><div className="sheet-handle"/><div className="sheet-title-row"><div><p className="eyebrow">NOUVEAU CLIENT</p><h2>Créer une fiche</h2></div><button className="round-button" onClick={() => setCreation(false)}>×</button></div><div className="form-stack">
        <label>Type<select value={form.type_client} onChange={e => setForm({ ...form, type_client:e.target.value })}><option value="particulier">Particulier</option><option value="entreprise">Entreprise</option><option value="collectivite">Collectivité</option></select></label>
        <div className="form-two"><label>Prénom<input value={form.prenom} onChange={e => setForm({ ...form, prenom:e.target.value })}/></label><label>Nom<input value={form.nom} onChange={e => setForm({ ...form, nom:e.target.value })}/></label></div>
        {form.type_client !== "particulier" ? <label>Entreprise / collectivité<input value={form.entreprise} onChange={e => setForm({ ...form, entreprise:e.target.value })}/></label> : null}
        <div className="form-two"><label>Téléphone<input inputMode="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone:e.target.value })}/></label><label>E-mail<input type="email" value={form.email} onChange={e => setForm({ ...form, email:e.target.value })}/></label></div>
        <label>Adresse<input value={form.adresse} onChange={e => setForm({ ...form, adresse:e.target.value })}/></label><div className="form-two"><label>Code postal<input value={form.code_postal} onChange={e => setForm({ ...form, code_postal:e.target.value })}/></label><label>Ville<input value={form.ville} onChange={e => setForm({ ...form, ville:e.target.value })}/></label></div>
        <button className="primary tall" onClick={() => void enregistrer()} disabled={busy}>{busy ? "Enregistrement…" : "Créer le client"}</button>
      </div></div></div> : null}
    </Screen>
  );
}
