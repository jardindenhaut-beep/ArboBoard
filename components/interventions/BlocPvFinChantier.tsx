"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import BoutonTelechargerPvFinChantierPdf from "@/components/interventions/BoutonTelechargerPvFinChantierPdf";
import BoutonEnvoyerPvFinChantierEmail from "@/components/interventions/BoutonEnvoyerPvFinChantierEmail";

type PvFinChantier = {
  id: string;
  entreprise_id: string;
  fiche_id: string;
  client_id: string | null;
  client_nom: string | null;
  client_email: string | null;
  client_present: boolean | null;
  chantier_termine: boolean | null;
  reserves: string | null;
  commentaire_client: string | null;
  commentaire_entreprise: string | null;
  signature_client: string | null;
  signature_entreprise: string | null;
  signataire_client_nom: string | null;
  signataire_entreprise_nom: string | null;
  envoye_client_at: string | null;
  envoye_client_email: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Props = {
  entrepriseId: string;
  ficheId: string;
  clientId?: string | null;
  clientNom?: string | null;
  clientEmail?: string | null;
  signataireEntrepriseNom?: string | null;
  afficherEnvoiEmail?: boolean;
};

type SignaturePadProps = {
  label: string;
  valeur: string;
  onChange: (valeur: string) => void;
  disabled?: boolean;
};

function SignaturePad({
  label,
  valeur,
  onChange,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dessinActifRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const contexte = canvas.getContext("2d");
    if (!contexte) return;

    contexte.lineWidth = 2;
    contexte.lineCap = "round";
    contexte.strokeStyle = "#0f172a";

    contexte.clearRect(0, 0, canvas.width, canvas.height);

    if (valeur) {
      const image = new Image();
      image.onload = () => {
        contexte.clearRect(0, 0, canvas.width, canvas.height);
        contexte.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      image.src = valeur;
    }
  }, [valeur]);

  function positionDepuisEvenement(
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    if ("touches" in event) {
      const touch = event.touches[0] || event.changedTouches[0];

      return {
        x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
        y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
      };
    }

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function commencerDessin(
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (disabled) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    const contexte = canvas?.getContext("2d");

    if (!canvas || !contexte) return;

    const position = positionDepuisEvenement(event);

    dessinActifRef.current = true;
    contexte.beginPath();
    contexte.moveTo(position.x, position.y);
  }

  function dessiner(
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (disabled) return;
    if (!dessinActifRef.current) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    const contexte = canvas?.getContext("2d");

    if (!canvas || !contexte) return;

    const position = positionDepuisEvenement(event);

    contexte.lineTo(position.x, position.y);
    contexte.stroke();
  }

  function terminerDessin() {
    if (disabled) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    dessinActifRef.current = false;
    onChange(canvas.toDataURL("image/png"));
  }

  function effacerSignature() {
    if (disabled) return;

    const canvas = canvasRef.current;
    const contexte = canvas?.getContext("2d");

    if (!canvas || !contexte) return;

    contexte.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{label}</p>

        <button
          type="button"
          onClick={effacerSignature}
          disabled={disabled || !valeur}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Effacer
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={700}
        height={220}
        onMouseDown={commencerDessin}
        onMouseMove={dessiner}
        onMouseUp={terminerDessin}
        onMouseLeave={terminerDessin}
        onTouchStart={commencerDessin}
        onTouchMove={dessiner}
        onTouchEnd={terminerDessin}
        className={`h-40 w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"
        }`}
      />

      <p className="mt-2 text-xs text-slate-400">
        Signature au doigt sur mobile ou à la souris sur ordinateur.
      </p>
    </div>
  );
}

function formatDateHeure(date: string | null | undefined) {
  if (!date) return "";

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

export default function BlocPvFinChantier({
  entrepriseId,
  ficheId,
  clientId = null,
  clientNom = null,
  clientEmail = null,
  signataireEntrepriseNom = null,
  afficherEnvoiEmail = true,
}: Props) {
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppression, setSuppression] = useState(false);

  const [pv, setPv] = useState<PvFinChantier | null>(null);

  const [clientEmailCharge, setClientEmailCharge] = useState(clientEmail || "");

  const [clientPresent, setClientPresent] = useState(true);
  const [chantierTermine, setChantierTermine] = useState(true);
  const [reserves, setReserves] = useState("");
  const [commentaireClient, setCommentaireClient] = useState("");
  const [commentaireEntreprise, setCommentaireEntreprise] = useState("");
  const [signatureClient, setSignatureClient] = useState("");
  const [signatureEntreprise, setSignatureEntreprise] = useState("");
  const [signataireClientNom, setSignataireClientNom] = useState(
    clientNom || ""
  );
  const [signataireEntreprise, setSignataireEntreprise] = useState(
    signataireEntrepriseNom || ""
  );

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  useEffect(() => {
    chargerPv();
    chargerEmailClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId, ficheId, clientId]);

  async function chargerPv() {
    if (!entrepriseId || !ficheId) {
      setChargement(false);
      return;
    }

    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const { data, error } = await supabase
        .from("pv_fin_chantier")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setPv(null);
        setClientPresent(true);
        setChantierTermine(true);
        setReserves("");
        setCommentaireClient("");
        setCommentaireEntreprise("");
        setSignatureClient("");
        setSignatureEntreprise("");
        setSignataireClientNom(clientNom || "");
        setSignataireEntreprise(signataireEntrepriseNom || "");
        return;
      }

      const pvCharge = data as PvFinChantier;

      setPv(pvCharge);
      setClientPresent(pvCharge.client_present !== false);
      setChantierTermine(pvCharge.chantier_termine !== false);
      setReserves(pvCharge.reserves || "");
      setCommentaireClient(pvCharge.commentaire_client || "");
      setCommentaireEntreprise(pvCharge.commentaire_entreprise || "");
      setSignatureClient(pvCharge.signature_client || "");
      setSignatureEntreprise(pvCharge.signature_entreprise || "");
      setSignataireClientNom(pvCharge.signataire_client_nom || clientNom || "");
      setSignataireEntreprise(
        pvCharge.signataire_entreprise_nom || signataireEntrepriseNom || ""
      );

      if (pvCharge.client_email) {
        setClientEmailCharge(pvCharge.client_email);
      }
    } catch (error: any) {
      console.error("Erreur chargement PV fin chantier :", error);
      setMessageErreur(
        error?.message || "Impossible de charger le PV de fin de chantier."
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerEmailClient() {
    if (clientEmail) {
      setClientEmailCharge(clientEmail);
      return;
    }

    if (!clientId || !entrepriseId) return;

    const { data, error } = await supabase
      .from("clients")
      .select("email")
      .eq("entreprise_id", entrepriseId)
      .eq("id", clientId)
      .maybeSingle();

    if (!error && data?.email) {
      setClientEmailCharge(data.email);
    }
  }

  async function enregistrerPv() {
    if (!entrepriseId || !ficheId) {
      setMessageErreur("Fiche intervention introuvable.");
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const payload = {
        entreprise_id: entrepriseId,
        fiche_id: ficheId,
        client_id: clientId || null,
        client_nom: clientNom || null,
        client_email: clientEmailCharge || null,
        client_present: clientPresent,
        chantier_termine: chantierTermine,
        reserves: reserves.trim() || null,
        commentaire_client: commentaireClient.trim() || null,
        commentaire_entreprise: commentaireEntreprise.trim() || null,
        signature_client: clientPresent ? signatureClient || null : null,
        signature_entreprise: signatureEntreprise || null,
        signataire_client_nom:
          clientPresent && signataireClientNom.trim()
            ? signataireClientNom.trim()
            : null,
        signataire_entreprise_nom: signataireEntreprise.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let pvEnregistre: PvFinChantier | null = null;

      if (pv?.id) {
        const { data, error } = await supabase
          .from("pv_fin_chantier")
          .update(payload)
          .eq("entreprise_id", entrepriseId)
          .eq("id", pv.id)
          .select("*")
          .single();

        if (error) throw error;

        pvEnregistre = data as PvFinChantier;
      } else {
        const { data, error } = await supabase
          .from("pv_fin_chantier")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;

        pvEnregistre = data as PvFinChantier;
      }

      if (pvEnregistre?.id) {
        await supabase
          .from("fiches_intervention")
          .update({
            pv_fin_chantier_id: pvEnregistre.id,
            etape_fin_statut: "valide",
            updated_at: new Date().toISOString(),
          })
          .eq("entreprise_id", entrepriseId)
          .eq("id", ficheId);
      }

      setPv(pvEnregistre);
      setMessageSucces("PV de fin de chantier enregistré.");
    } catch (error: any) {
      console.error("Erreur enregistrement PV fin chantier :", error);
      setMessageErreur(
        error?.message ||
          "Impossible d’enregistrer le PV de fin de chantier."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimerPv() {
    if (!pv?.id || !entrepriseId || !ficheId) return;

    const confirmation = window.confirm(
      "Supprimer le PV de fin de chantier ? Cette action est définitive."
    );

    if (!confirmation) return;

    try {
      setSuppression(true);
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("pv_fin_chantier")
        .delete()
        .eq("entreprise_id", entrepriseId)
        .eq("id", pv.id);

      if (error) throw error;

      await supabase
        .from("fiches_intervention")
        .update({
          pv_fin_chantier_id: null,
          etape_fin_statut: "en_attente",
          updated_at: new Date().toISOString(),
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", ficheId);

      setPv(null);
      setClientPresent(true);
      setChantierTermine(true);
      setReserves("");
      setCommentaireClient("");
      setCommentaireEntreprise("");
      setSignatureClient("");
      setSignatureEntreprise("");
      setSignataireClientNom(clientNom || "");
      setSignataireEntreprise(signataireEntrepriseNom || "");
      setMessageSucces("PV supprimé.");
    } catch (error: any) {
      console.error("Erreur suppression PV fin chantier :", error);
      setMessageErreur(
        error?.message || "Impossible de supprimer le PV de fin de chantier."
      );
    } finally {
      setSuppression(false);
    }
  }

  if (chargement) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          Chargement du PV de fin de chantier...
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              📝
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-950">
                PV de fin de chantier
              </h2>

              <p className="text-sm text-slate-500">
                Validation de fin d’intervention, réserves, commentaires et
                signatures.
              </p>
            </div>
          </div>

          {pv?.envoye_client_at && (
            <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              PV envoyé au client le {formatDateHeure(pv.envoye_client_at)}
              {pv.envoye_client_email ? ` à ${pv.envoye_client_email}` : ""}.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
  {pv?.id && (
    <BoutonTelechargerPvFinChantierPdf ficheId={ficheId} />
  )}

  {pv?.id && afficherEnvoiEmail && (
    <BoutonEnvoyerPvFinChantierEmail
      ficheId={ficheId}
      clientEmail={clientEmailCharge}
    />
  )}

  {pv?.id && (
    <button
      type="button"
      onClick={supprimerPv}
      disabled={suppression}
      className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {suppression ? "Suppression..." : "Supprimer PV"}
    </button>
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

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-950">État du chantier</p>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={chantierTermine}
                onChange={(event) => setChantierTermine(event.target.checked)}
                className="h-4 w-4"
              />
              Chantier terminé
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={clientPresent}
                onChange={(event) => {
                  setClientPresent(event.target.checked);

                  if (!event.target.checked) {
                    setSignatureClient("");
                    setSignataireClientNom("");
                    setCommentaireClient("");
                  }
                }}
                className="h-4 w-4"
              />
              Client présent sur place
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-950">
            Signataires / client
          </p>

          <div className="mt-4 space-y-3">
            <input
              value={signataireEntreprise}
              onChange={(event) => setSignataireEntreprise(event.target.value)}
              placeholder="Nom du signataire entreprise"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <input
              value={signataireClientNom}
              onChange={(event) => setSignataireClientNom(event.target.value)}
              placeholder="Nom du signataire client"
              disabled={!clientPresent}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            />

            <input
              value={clientEmailCharge}
              onChange={(event) => setClientEmailCharge(event.target.value)}
              placeholder="Email client pour l’envoi du PV"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Réserves éventuelles
          </label>

          <textarea
            value={reserves}
            onChange={(event) => setReserves(event.target.value)}
            rows={5}
            placeholder="Ex : souche à reprendre, branche non accessible, attente validation client..."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Commentaire client
          </label>

          <textarea
            value={commentaireClient}
            onChange={(event) => setCommentaireClient(event.target.value)}
            rows={5}
            disabled={!clientPresent}
            placeholder="Commentaire ou observation du client"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Commentaire entreprise
          </label>

          <textarea
            value={commentaireEntreprise}
            onChange={(event) => setCommentaireEntreprise(event.target.value)}
            rows={5}
            placeholder="Commentaire interne ou précision de fin de chantier"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SignaturePad
          label="Signature entreprise"
          valeur={signatureEntreprise}
          onChange={setSignatureEntreprise}
        />

        <SignaturePad
          label="Signature client"
          valeur={signatureClient}
          onChange={setSignatureClient}
          disabled={!clientPresent}
        />
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={chargerPv}
          disabled={enregistrement}
          className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Annuler les modifications
        </button>

        <button
          type="button"
          onClick={enregistrerPv}
          disabled={enregistrement}
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enregistrement ? "Enregistrement..." : "Enregistrer le PV"}
        </button>
      </div>
    </section>
  );
}