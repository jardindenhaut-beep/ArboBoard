"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import BoutonTelechargerPvFinChantierPdf from "@/components/interventions/BoutonTelechargerPvFinChantierPdf";
import BoutonEnvoyerPvFinChantierEmail from "@/components/interventions/BoutonEnvoyerPvFinChantierEmail";

type PvFinChantier = {
  id: string;
  entreprise_id: string;
  fiche_id: string;
  client_id: string | null;
  client_nom: string | null;
  client_present: boolean | null;
  chantier_termine: boolean | null;
  reserves_client: string | null;
  commentaire_client: string | null;
  commentaire_entreprise: string | null;
  signature_client_data_url: string | null;
  signature_entreprise_data_url: string | null;
  signature_client_at: string | null;
  signature_entreprise_at: string | null;
  signataire_client_nom: string | null;
  signataire_entreprise_nom: string | null;
  envoye_client_at?: string | null;
  envoye_client_email?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Props = {
  entrepriseId: string;
  ficheId: string;
  clientId?: string | null;
  clientNom?: string | null;
  signataireEntrepriseNom?: string | null;
};

type SignaturePadProps = {
  label: string;
  value: string | null;
  onChange: (valeur: string | null) => void;
  disabled?: boolean;
};

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function formatDateHeure(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function SignaturePad({ label, value, onChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dessinEnCours, setDessinEnCours] = useState(false);
  const [canvasInitialise, setCanvasInitialise] = useState(false);

  useEffect(() => {
    initialiserCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dessinerSignatureExistante();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, canvasInitialise]);

  function initialiserCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const rectangle = canvas.getBoundingClientRect();

    const largeur = rectangle.width || 700;
    const hauteur = rectangle.height || 180;

    canvas.width = largeur * ratio;
    canvas.height = hauteur * ratio;

    const contexte = canvas.getContext("2d");
    if (!contexte) return;

    contexte.scale(ratio, ratio);
    contexte.lineCap = "round";
    contexte.lineJoin = "round";
    contexte.lineWidth = 2.5;
    contexte.strokeStyle = "#0f172a";

    contexte.fillStyle = "#ffffff";
    contexte.fillRect(0, 0, largeur, hauteur);

    setCanvasInitialise(true);
  }

  function dessinerSignatureExistante() {
    const canvas = canvasRef.current;
    if (!canvas || !canvasInitialise) return;

    const contexte = canvas.getContext("2d");
    if (!contexte) return;

    const rectangle = canvas.getBoundingClientRect();
    const largeur = rectangle.width || 700;
    const hauteur = rectangle.height || 180;

    contexte.fillStyle = "#ffffff";
    contexte.fillRect(0, 0, largeur, hauteur);

    if (!value) return;

    const image = new Image();
    image.onload = () => {
      contexte.drawImage(image, 0, 0, largeur, hauteur);
    };
    image.src = value;
  }

  function positionDepuisEvenement(
    event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rectangle = canvas.getBoundingClientRect();

    if ("touches" in event && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rectangle.left,
        y: event.touches[0].clientY - rectangle.top,
      };
    }

    if ("clientX" in event) {
      return {
        x: event.clientX - rectangle.left,
        y: event.clientY - rectangle.top,
      };
    }

    return null;
  }

  function commencerDessin(
    event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>
  ) {
    if (disabled) return;

    event.preventDefault();

    const position = positionDepuisEvenement(event);
    const canvas = canvasRef.current;
    if (!position || !canvas) return;

    const contexte = canvas.getContext("2d");
    if (!contexte) return;

    contexte.beginPath();
    contexte.moveTo(position.x, position.y);
    setDessinEnCours(true);
  }

  function dessiner(
    event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>
  ) {
    if (!dessinEnCours || disabled) return;

    event.preventDefault();

    const position = positionDepuisEvenement(event);
    const canvas = canvasRef.current;
    if (!position || !canvas) return;

    const contexte = canvas.getContext("2d");
    if (!contexte) return;

    contexte.lineTo(position.x, position.y);
    contexte.stroke();
  }

  function terminerDessin() {
    if (!dessinEnCours) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setDessinEnCours(false);

    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  }

  function effacerSignature() {
    if (disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const contexte = canvas.getContext("2d");
    if (!contexte) return;

    const rectangle = canvas.getBoundingClientRect();
    const largeur = rectangle.width || 700;
    const hauteur = rectangle.height || 180;

    contexte.fillStyle = "#ffffff";
    contexte.fillRect(0, 0, largeur, hauteur);

    onChange(null);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-950">{label}</p>

        <button
          type="button"
          onClick={effacerSignature}
          disabled={disabled}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Effacer
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={commencerDessin}
        onMouseMove={dessiner}
        onMouseUp={terminerDessin}
        onMouseLeave={terminerDessin}
        onTouchStart={commencerDessin}
        onTouchMove={dessiner}
        onTouchEnd={terminerDessin}
        className={`h-44 w-full rounded-2xl border border-slate-200 bg-white ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"
        }`}
      />

      <p className="mt-2 text-xs text-slate-400">
        Signez directement dans le cadre avec la souris, le doigt ou le stylet.
      </p>
    </div>
  );
}

export default function BlocPvFinChantier({
  entrepriseId,
  ficheId,
  clientId,
  clientNom,
  signataireEntrepriseNom,
}: Props) {
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppression, setSuppression] = useState(false);

  const [pvId, setPvId] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState("");

  const [clientPresent, setClientPresent] = useState(true);
  const [chantierTermine, setChantierTermine] = useState(true);

  const [signataireClientNom, setSignataireClientNom] = useState(
    clientNom || ""
  );
  const [signataireEntreprise, setSignataireEntreprise] = useState(
    signataireEntrepriseNom || ""
  );

  const [reservesClient, setReservesClient] = useState("");
  const [commentaireClient, setCommentaireClient] = useState("");
  const [commentaireEntreprise, setCommentaireEntreprise] = useState("");

  const [signatureClient, setSignatureClient] = useState<string | null>(null);
  const [signatureEntreprise, setSignatureEntreprise] = useState<string | null>(
    null
  );

  const [signatureClientAt, setSignatureClientAt] = useState<string | null>(
    null
  );
  const [signatureEntrepriseAt, setSignatureEntrepriseAt] = useState<
    string | null
  >(null);

  const [envoyeClientAt, setEnvoyeClientAt] = useState<string | null>(null);
  const [envoyeClientEmail, setEnvoyeClientEmail] = useState<string | null>(
    null
  );

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  useEffect(() => {
    chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId, ficheId, clientId]);

  async function chargerDonnees() {
    if (!entrepriseId || !ficheId) return;

    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      await Promise.all([chargerPv(), chargerEmailClient()]);
    } catch (error: any) {
      console.error("Erreur chargement PV fin chantier :", error);
      setMessageErreur(
        error?.message || "Impossible de charger le PV de fin de chantier."
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerPv() {
    const { data, error } = await supabase
      .from("pv_fin_chantier")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("fiche_id", ficheId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      reinitialiserFormulaire();
      return;
    }

    const pv = data as PvFinChantier;

    setPvId(pv.id);
    setClientPresent(pv.client_present !== false);
    setChantierTermine(pv.chantier_termine !== false);

    setSignataireClientNom(pv.signataire_client_nom || clientNom || "");
    setSignataireEntreprise(
      pv.signataire_entreprise_nom || signataireEntrepriseNom || ""
    );

    setReservesClient(pv.reserves_client || "");
    setCommentaireClient(pv.commentaire_client || "");
    setCommentaireEntreprise(pv.commentaire_entreprise || "");

    setSignatureClient(pv.signature_client_data_url || null);
    setSignatureEntreprise(pv.signature_entreprise_data_url || null);

    setSignatureClientAt(pv.signature_client_at || null);
    setSignatureEntrepriseAt(pv.signature_entreprise_at || null);

    setEnvoyeClientAt(pv.envoye_client_at || null);
    setEnvoyeClientEmail(pv.envoye_client_email || null);
  }

  async function chargerEmailClient() {
    if (!clientId || !entrepriseId) {
      setClientEmail("");
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .select("email")
      .eq("entreprise_id", entrepriseId)
      .eq("id", clientId)
      .maybeSingle();

    if (error) {
      console.error("Erreur chargement email client PV :", error);
      setClientEmail("");
      return;
    }

    setClientEmail(data?.email || "");
  }

  function reinitialiserFormulaire() {
    setPvId(null);
    setClientPresent(true);
    setChantierTermine(true);
    setSignataireClientNom(clientNom || "");
    setSignataireEntreprise(signataireEntrepriseNom || "");
    setReservesClient("");
    setCommentaireClient("");
    setCommentaireEntreprise("");
    setSignatureClient(null);
    setSignatureEntreprise(null);
    setSignatureClientAt(null);
    setSignatureEntrepriseAt(null);
    setEnvoyeClientAt(null);
    setEnvoyeClientEmail(null);
  }

  function changerClientPresent(valeur: boolean) {
    setClientPresent(valeur);

    if (!valeur) {
      setSignatureClient(null);
      setSignataireClientNom("");
      setSignatureClientAt(null);
    } else {
      setSignataireClientNom(clientNom || "");
    }
  }

  async function enregistrerPv() {
    if (!entrepriseId || !ficheId) {
      setMessageErreur("Fiche ou entreprise introuvable.");
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const maintenant = new Date().toISOString();

      const payload = {
        entreprise_id: entrepriseId,
        fiche_id: ficheId,
        client_id: clientId || null,
        client_nom: clientNom || null,

        client_present: clientPresent,
        chantier_termine: chantierTermine,

        reserves_client: nettoyerTexte(reservesClient),
        commentaire_client: nettoyerTexte(commentaireClient),
        commentaire_entreprise: nettoyerTexte(commentaireEntreprise),

        signature_client_data_url: clientPresent ? signatureClient : null,
        signature_entreprise_data_url: signatureEntreprise,

        signataire_client_nom: clientPresent
          ? nettoyerTexte(signataireClientNom)
          : null,
        signataire_entreprise_nom: nettoyerTexte(signataireEntreprise),

        signature_client_at:
          clientPresent && signatureClient
            ? signatureClientAt || maintenant
            : null,

        signature_entreprise_at: signatureEntreprise
          ? signatureEntrepriseAt || maintenant
          : null,
      };

      if (pvId) {
        const { error } = await supabase
          .from("pv_fin_chantier")
          .update(payload)
          .eq("id", pvId)
          .eq("entreprise_id", entrepriseId);

        if (error) throw error;

        setMessageSucces("PV de fin de chantier mis à jour.");
      } else {
        const { data, error } = await supabase
          .from("pv_fin_chantier")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;

        const nouveauPv = data as PvFinChantier;

        setPvId(nouveauPv.id);
        setSignatureClientAt(nouveauPv.signature_client_at || null);
        setSignatureEntrepriseAt(nouveauPv.signature_entreprise_at || null);

        await supabase
          .from("fiches_intervention")
          .update({
            pv_fin_chantier_id: nouveauPv.id,
          })
          .eq("id", ficheId)
          .eq("entreprise_id", entrepriseId);

        setMessageSucces("PV de fin de chantier enregistré.");
      }

      await chargerPv();
    } catch (error: any) {
      console.error("Erreur enregistrement PV fin chantier :", error);
      setMessageErreur(
        error?.message || "Impossible d’enregistrer le PV de fin de chantier."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimerPv() {
    if (!pvId || !entrepriseId || !ficheId) return;

    const confirmation = window.confirm(
      "Supprimer définitivement ce PV de fin de chantier ?"
    );

    if (!confirmation) return;

    try {
      setSuppression(true);
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("pv_fin_chantier")
        .delete()
        .eq("id", pvId)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await supabase
        .from("fiches_intervention")
        .update({
          pv_fin_chantier_id: null,
        })
        .eq("id", ficheId)
        .eq("entreprise_id", entrepriseId);

      reinitialiserFormulaire();

      setMessageSucces("PV supprimé.");
    } catch (error: any) {
      console.error("Erreur suppression PV :", error);
      setMessageErreur(error?.message || "Impossible de supprimer le PV.");
    } finally {
      setSuppression(false);
    }
  }

  if (chargement) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
            📝
          </div>
          <div>
            <h3 className="font-bold text-slate-950">
              PV de fin de chantier
            </h3>
            <p className="text-sm text-slate-500">Chargement du PV...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
            📝
          </div>

          <div>
            <h3 className="font-bold text-slate-950">
              PV de fin de chantier
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Compte rendu final, réserves éventuelles et signatures client /
              entreprise.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {pvId ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              PV enregistré
            </span>
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
              Non enregistré
            </span>
          )}

          {envoyeClientAt && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Envoyé client
            </span>
          )}
        </div>
      </div>

      {messageErreur && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {messageSucces}
        </div>
      )}

      {envoyeClientAt && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          PV envoyé au client le {formatDateHeure(envoyeClientAt)}
          {envoyeClientEmail ? ` à ${envoyeClientEmail}` : ""}.
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={chantierTermine}
            onChange={(event) => setChantierTermine(event.target.checked)}
            disabled={enregistrement || suppression}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />

          <span>
            <span className="block text-sm font-bold text-slate-950">
              Chantier terminé
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              À décocher si le chantier n’est pas totalement terminé.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={clientPresent}
            onChange={(event) => changerClientPresent(event.target.checked)}
            disabled={enregistrement || suppression}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />

          <span>
            <span className="block text-sm font-bold text-slate-950">
              Client présent pour signature
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              Si le client est absent, la signature client sera ignorée.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nom du signataire client
          </label>
          <input
            value={signataireClientNom}
            onChange={(event) => setSignataireClientNom(event.target.value)}
            disabled={!clientPresent || enregistrement || suppression}
            placeholder="Nom du client ou représentant"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nom du signataire entreprise
          </label>
          <input
            value={signataireEntreprise}
            onChange={(event) => setSignataireEntreprise(event.target.value)}
            disabled={enregistrement || suppression}
            placeholder="Nom du salarié / chef"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Réserves éventuelles du client
        </label>
        <textarea
          value={reservesClient}
          onChange={(event) => setReservesClient(event.target.value)}
          disabled={enregistrement || suppression}
          rows={4}
          placeholder="Ex : réserve sur une partie du chantier, demande de reprise, remarque client..."
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Commentaire client
          </label>
          <textarea
            value={commentaireClient}
            onChange={(event) => setCommentaireClient(event.target.value)}
            disabled={enregistrement || suppression}
            rows={4}
            placeholder="Avis client, validation orale, remarque..."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Commentaire entreprise
          </label>
          <textarea
            value={commentaireEntreprise}
            onChange={(event) => setCommentaireEntreprise(event.target.value)}
            disabled={enregistrement || suppression}
            rows={4}
            placeholder="Compte rendu interne, travaux réalisés, information utile..."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SignaturePad
          label="Signature client"
          value={clientPresent ? signatureClient : null}
          onChange={setSignatureClient}
          disabled={!clientPresent || enregistrement || suppression}
        />

        <SignaturePad
          label="Signature entreprise"
          value={signatureEntreprise}
          onChange={setSignatureEntreprise}
          disabled={enregistrement || suppression}
        />
      </div>

      {(signatureClientAt || signatureEntrepriseAt) && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
            Signature client : {formatDateHeure(signatureClientAt)}
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
            Signature entreprise : {formatDateHeure(signatureEntrepriseAt)}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {pvId && (
          <button
            type="button"
            onClick={supprimerPv}
            disabled={suppression || enregistrement}
            className="rounded-2xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {suppression ? "Suppression..." : "Supprimer PV"}
          </button>
        )}

        {pvId && (
          <BoutonTelechargerPvFinChantierPdf
            ficheId={ficheId}
            disabled={enregistrement || suppression}
          />
        )}

        <button
          type="button"
          onClick={enregistrerPv}
          disabled={enregistrement || suppression}
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enregistrement ? "Enregistrement..." : "Enregistrer le PV"}
        </button>
      </div>

      {pvId && (
        <div className="mt-5">
          <BoutonEnvoyerPvFinChantierEmail
            ficheId={ficheId}
            clientEmail={clientEmail}
            clientNom={clientNom}
            disabled={enregistrement || suppression}
          />
        </div>
      )}
    </section>
  );
}