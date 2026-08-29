import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Page from "../../components/Page";
import StateCard from "../../components/StateCard";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { trouverSalarie } from "../../lib/salarie";
import { heureMaintenant, texte } from "../../lib/format";

export default function InterventionDetailPage() {
  const { id } = useParams();
  const { profil } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [fiche, setFiche] = useState<any | null>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [affectation, setAffectation] = useState<any | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [salarieId, setSalarieId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function charger() {
    if (!id || !profil?.entreprise_id) return;

    try {
      setError("");
      const s = await trouverSalarie(profil);
      if (!s) throw new Error("Fiche salarié introuvable.");
      setSalarieId(s.id);

      const [ficheR, elemR, affR, photoR] = await Promise.all([
        supabase.from("fiches_intervention").select("*")
          .eq("entreprise_id", profil.entreprise_id).eq("id", id).single(),
        supabase.from("fiches_intervention_elements").select("*")
          .eq("entreprise_id", profil.entreprise_id).eq("fiche_id", id).order("ordre"),
        supabase.from("fiches_intervention_salaries").select("*")
          .eq("entreprise_id", profil.entreprise_id).eq("fiche_id", id)
          .eq("salarie_id", s.id).limit(1).maybeSingle(),
        supabase.from("fiches_intervention_photos").select("*")
          .eq("entreprise_id", profil.entreprise_id).eq("fiche_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (ficheR.error) throw ficheR.error;
      if (elemR.error) throw elemR.error;
      if (affR.error) throw affR.error;
      if (photoR.error) throw photoR.error;

      const f = ficheR.data;
      const autorise = f.salarie_id === s.id || !!affR.data;
      if (!autorise) throw new Error("Vous n’êtes pas affecté à cette intervention.");

      setFiche(f);
      setElements(elemR.data || []);
      setAffectation(affR.data || (f.salarie_id === s.id ? { id: "legacy" } : null));

      const pAvecUrl = await Promise.all((photoR.data || []).map(async (p:any) => {
        const chemin = p.storage_path || p.url;
        if (!chemin) return p;
        const { data } = await supabase.storage.from("interventions-photos").createSignedUrl(chemin, 3600);
        return { ...p, signed_url: data?.signedUrl || null };
      }));
      setPhotos(pAvecUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }

  useEffect(() => { void charger(); }, [id, profil?.id]);

  const preparables = useMemo(
    () => elements.filter(x => x.categorie === "materiel" || x.categorie === "materiaux"),
    [elements]
  );
  const toutPrepare = preparables.length === 0 || preparables.every(x => x.coche_prepare);
  const materielValide = fiche?.etape_materiel_statut === "valide";
  const arriveeValidee = fiche?.etape_arrivee_statut === "valide";
  const finValidee = fiche?.etape_fin_statut === "valide";

  async function basculerElement(el:any) {
    if (!profil?.entreprise_id || !id || materielValide) return;
    try {
      setBusy(true); setError("");
      const { error } = await supabase
        .from("fiches_intervention_elements")
        .update({ coche_prepare: !el.coche_prepare })
        .eq("entreprise_id", profil.entreprise_id)
        .eq("fiche_id", id)
        .eq("id", el.id);
      if (error) throw error;
      setElements(old => old.map(x => x.id === el.id ? { ...x, coche_prepare: !el.coche_prepare } : x));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mise à jour impossible.");
    } finally { setBusy(false); }
  }

  async function validerMateriel() {
    if (!profil?.entreprise_id || !id || !toutPrepare || materielValide) return;
    try {
      setBusy(true); setError("");
      const { error } = await supabase.from("fiches_intervention").update({
        etape_materiel_statut: "valide",
        materiel_valide_at: new Date().toISOString(),
      }).eq("entreprise_id", profil.entreprise_id).eq("id", id);
      if (error) throw error;
      setMessage("Matériel validé.");
      await charger();
    } catch (e) { setError(e instanceof Error ? e.message : "Validation impossible."); }
    finally { setBusy(false); }
  }

  async function validerArrivee() {
    if (!profil?.entreprise_id || !id || !materielValide || arriveeValidee) return;
    try {
      setBusy(true); setError("");
      const maintenant = new Date().toISOString();
      const heure = heureMaintenant();

      const { error } = await supabase.from("fiches_intervention").update({
        statut: "en_cours",
        etape_arrivee_statut: "valide",
        arrivee_validee_at: maintenant,
        heure_debut_reelle: fiche?.heure_debut_reelle || heure,
      }).eq("entreprise_id", profil.entreprise_id).eq("id", id);

      if (error) throw error;

      if (affectation?.id && affectation.id !== "legacy") {
        const { error: e2 } = await supabase.from("fiches_intervention_salaries").update({
          heure_arrivee_reelle: affectation.heure_arrivee_reelle || heure,
        }).eq("entreprise_id", profil.entreprise_id).eq("id", affectation.id);
        if (e2) throw e2;
      }

      setMessage("Arrivée chantier validée.");
      await charger();
    } catch (e) { setError(e instanceof Error ? e.message : "Validation impossible."); }
    finally { setBusy(false); }
  }

  async function ajouterPhotos(files: FileList | null) {
    if (!files || !profil?.entreprise_id || !id) return;

    try {
      setBusy(true); setError("");
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        const nom = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const chemin = `${profil.entreprise_id}/${id}/chantier/${Date.now()}-${crypto.randomUUID()}-${nom}`;

        const { error: upErr } = await supabase.storage
          .from("interventions-photos")
          .upload(chemin, f, { contentType: f.type, upsert: false });
        if (upErr) throw upErr;

        const { error: dbErr } = await supabase
          .from("fiches_intervention_photos")
          .insert({
            entreprise_id: profil.entreprise_id,
            fiche_id: id,
            categorie: "chantier",
            url: chemin,
            storage_path: chemin,
            uploaded_by: profil.id,
          });

        if (dbErr) {
          await supabase.storage.from("interventions-photos").remove([chemin]);
          throw dbErr;
        }
      }
      setMessage("Photo(s) ajoutée(s).");
      await charger();
    } catch (e) { setError(e instanceof Error ? e.message : "Envoi impossible."); }
    finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function terminer() {
    if (!profil?.entreprise_id || !id || !arriveeValidee || finValidee) return;
    try {
      setBusy(true); setError("");
      const heure = heureMaintenant();

      const { error } = await supabase.from("fiches_intervention").update({
        statut: "terminee",
        etape_fin_statut: "valide",
        fin_validee_at: new Date().toISOString(),
        heure_fin_reelle: fiche?.heure_fin_reelle || heure,
        probleme_signale: false,
      }).eq("entreprise_id", profil.entreprise_id).eq("id", id);

      if (error) throw error;

      if (affectation?.id && affectation.id !== "legacy") {
        const { error: e2 } = await supabase.from("fiches_intervention_salaries").update({
          heure_depart_reelle: affectation.heure_depart_reelle || heure,
        }).eq("entreprise_id", profil.entreprise_id).eq("id", affectation.id);
        if (e2) throw e2;
      }

      setMessage("Intervention terminée.");
      await charger();
    } catch (e) { setError(e instanceof Error ? e.message : "Clôture impossible."); }
    finally { setBusy(false); }
  }

  return (
    <Page titre={texte(fiche?.titre, fiche?.type_intervention, "Intervention")} sousTitre={texte(fiche?.client_nom)}>
      {error ? <StateCard texte={error} type="error" /> : null}
      {message ? <StateCard texte={message} type="success" /> : null}

      {fiche ? (
        <>
          <div className="panel">
            <h2>Chantier</h2>
            <p><b>Adresse :</b> {texte(fiche.adresse_chantier, fiche.adresse, "—")} {texte(fiche.code_postal_chantier, fiche.code_postal)} {texte(fiche.ville_chantier, fiche.ville)}</p>
            <p><b>Travaux :</b> {texte(fiche.travaux_prevus, "—")}</p>
            <p><b>Consignes :</b> {texte(fiche.consignes_securite, "—")}</p>
          </div>

          <div className="workflow">
            <section className={`step ${materielValide ? "done" : ""}`}>
              <h2>1. Matériel</h2>
              {preparables.map(el => (
                <button
                  key={el.id}
                  className={`check-row ${el.coche_prepare ? "checked" : ""}`}
                  disabled={busy || materielValide}
                  onClick={() => void basculerElement(el)}
                >
                  <span>{el.coche_prepare ? "✓" : "○"}</span>
                  <b>{texte(el.nom, "Élément")}</b>
                </button>
              ))}
              <button className="primary" disabled={busy || materielValide || !toutPrepare} onClick={() => void validerMateriel()}>
                {materielValide ? "Matériel validé ✓" : "Valider le matériel"}
              </button>
            </section>

            <section className={`step ${arriveeValidee ? "done" : ""}`}>
              <h2>2. Arrivée</h2>
              <button className="primary" disabled={busy || !materielValide || arriveeValidee} onClick={() => void validerArrivee()}>
                {arriveeValidee ? "Arrivée validée ✓" : "Je suis arrivé sur le chantier"}
              </button>
            </section>

            <section className="step">
              <h2>3. Photos</h2>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={e => void ajouterPhotos(e.target.files)} />
              <div className="photo-grid">
                {photos.map(p => p.signed_url ? <img key={p.id} src={p.signed_url} alt="Chantier" /> : null)}
              </div>
            </section>

            <section className={`step ${finValidee ? "done" : ""}`}>
              <h2>4. Fin de chantier</h2>
              <button className="primary" disabled={busy || !arriveeValidee || finValidee} onClick={() => void terminer()}>
                {finValidee ? "Intervention terminée ✓" : "Terminer l’intervention"}
              </button>
              <p className="muted">Le PV de fin de chantier reste accessible dans Arboboard et sera la prochaine brique native enrichie.</p>
            </section>
          </div>
        </>
      ) : null}
    </Page>
  );
}
