"use client";

import { useState } from "react";
import {
  DESIGN_DOCUMENTS_DEFAUT,
  tailleLogoApercu,
  type DesignDocuments,
} from "@/lib/documents/designDocuments";

type Props = {
  valeur: DesignDocuments;
  logoUrl?: string;
  nomEntreprise?: string;
  onChange: <K extends keyof DesignDocuments>(
    champ: K,
    valeur: DesignDocuments[K]
  ) => void;
  onReset: () => void;
};

type TypeApercu = "devis" | "facture";

function initiales(nom: string) {
  const mots = nom.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (mots.length === 0) return "AR";

  return mots.map((mot) => mot.charAt(0).toUpperCase()).join("");
}

function SelectDesign<K extends keyof DesignDocuments>({
  label,
  champ,
  valeur,
  options,
  onChange,
}: {
  label: string;
  champ: K;
  valeur: DesignDocuments[K];
  options: Array<{ valeur: DesignDocuments[K]; label: string }>;
  onChange: Props["onChange"];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>

      <select
        value={String(valeur)}
        onChange={(event) =>
          onChange(champ, event.target.value as DesignDocuments[K])
        }
        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      >
        {options.map((option) => (
          <option key={String(option.valeur)} value={String(option.valeur)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Interrupteur<K extends keyof DesignDocuments>({
  label,
  description,
  champ,
  actif,
  onChange,
}: {
  label: string;
  description: string;
  champ: K;
  actif: boolean;
  onChange: Props["onChange"];
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      onClick={() => onChange(champ, !actif as DesignDocuments[K])}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50"
    >
      <span>
        <span className="block text-sm font-semibold text-slate-800">
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>

      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          actif ? "bg-emerald-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            actif ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

export default function DesignDocumentsParametres({
  valeur,
  logoUrl = "",
  nomEntreprise = "",
  onChange,
  onReset,
}: Props) {
  const [typeApercu, setTypeApercu] = useState<TypeApercu>("devis");

  const compact =
    valeur.design_modele_document === "compact" ||
    valeur.design_lignes_compactes;

  const classique = valeur.design_modele_document === "classique";
  const enteteEmpilee =
    valeur.design_disposition_entete === "empilee";

  const positionLogo = valeur.design_position_logo;

  const classeLogo = tailleLogoApercu(valeur.design_taille_logo);

  const tableauEntete =
    valeur.design_style_tableau === "lignes"
      ? {
          backgroundColor: valeur.design_couleur_principale,
          color: "#ffffff",
        }
      : valeur.design_style_tableau === "minimal"
        ? {
            backgroundColor: "#ffffff",
            color: valeur.design_couleur_principale,
          }
        : {
            backgroundColor: valeur.design_couleur_secondaire,
            color: valeur.design_couleur_principale,
          };

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-950">
            Design des devis et factures
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Personnalisez les PDF, les impressions et les pièces jointes
            envoyées aux clients.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Restaurer le design standard
        </button>
      </div>

      <div className="grid gap-6 p-5 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Modèle et disposition
            </h3>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <SelectDesign
                label="Modèle du document"
                champ="design_modele_document"
                valeur={valeur.design_modele_document}
                onChange={onChange}
                options={[
                  { valeur: "moderne", label: "Moderne" },
                  { valeur: "classique", label: "Classique" },
                  { valeur: "compact", label: "Compact" },
                ]}
              />

              <SelectDesign
                label="Disposition de l’en-tête"
                champ="design_disposition_entete"
                valeur={valeur.design_disposition_entete}
                onChange={onChange}
                options={[
                  { valeur: "horizontale", label: "Entreprise et document côte à côte" },
                  { valeur: "empilee", label: "Entreprise puis document" },
                ]}
              />

              <SelectDesign
                label="Position du logo"
                champ="design_position_logo"
                valeur={valeur.design_position_logo}
                onChange={onChange}
                options={[
                  { valeur: "gauche", label: "À gauche" },
                  { valeur: "centre", label: "Centré" },
                  { valeur: "droite", label: "À droite" },
                ]}
              />

              <SelectDesign
                label="Taille du logo"
                champ="design_taille_logo"
                valeur={valeur.design_taille_logo}
                onChange={onChange}
                options={[
                  { valeur: "petit", label: "Petit" },
                  { valeur: "moyen", label: "Moyen" },
                  { valeur: "grand", label: "Grand" },
                ]}
              />

              <SelectDesign
                label="Style du tableau"
                champ="design_style_tableau"
                valeur={valeur.design_style_tableau}
                onChange={onChange}
                options={[
                  { valeur: "doux", label: "Fond coloré doux" },
                  { valeur: "lignes", label: "En-tête plein et lignes" },
                  { valeur: "minimal", label: "Minimal" },
                ]}
              />

              <SelectDesign
                label="Position des totaux"
                champ="design_position_totaux"
                valeur={valeur.design_position_totaux}
                onChange={onChange}
                options={[
                  { valeur: "droite", label: "À droite" },
                  { valeur: "gauche", label: "À gauche" },
                ]}
              />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Couleurs
            </h3>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Couleur principale
                </span>

                <div className="mt-1.5 flex gap-2">
                  <input
                    type="color"
                    value={valeur.design_couleur_principale}
                    onChange={(event) =>
                      onChange(
                        "design_couleur_principale",
                        event.target.value.toUpperCase()
                      )
                    }
                    className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                  />

                  <input
                    value={valeur.design_couleur_principale}
                    onChange={(event) =>
                      onChange(
                        "design_couleur_principale",
                        event.target.value.toUpperCase()
                      )
                    }
                    maxLength={7}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Couleur secondaire
                </span>

                <div className="mt-1.5 flex gap-2">
                  <input
                    type="color"
                    value={valeur.design_couleur_secondaire}
                    onChange={(event) =>
                      onChange(
                        "design_couleur_secondaire",
                        event.target.value.toUpperCase()
                      )
                    }
                    className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                  />

                  <input
                    value={valeur.design_couleur_secondaire}
                    onChange={(event) =>
                      onChange(
                        "design_couleur_secondaire",
                        event.target.value.toUpperCase()
                      )
                    }
                    maxLength={7}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Informations affichées
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Interrupteur
                label="Lignes compactes"
                description="Réduit la hauteur des prestations pour gagner de la place."
                champ="design_lignes_compactes"
                actif={valeur.design_lignes_compactes}
                onChange={onChange}
              />
              <Interrupteur
                label="Adresse de l’entreprise"
                description="Affiche l’adresse postale dans l’en-tête."
                champ="design_afficher_adresse"
                actif={valeur.design_afficher_adresse}
                onChange={onChange}
              />
              <Interrupteur
                label="Téléphone et email"
                description="Affiche les coordonnées de contact."
                champ="design_afficher_contact"
                actif={valeur.design_afficher_contact}
                onChange={onChange}
              />
              <Interrupteur
                label="Numéro SIRET"
                description="Affiche le SIRET dans les informations légales."
                champ="design_afficher_siret"
                actif={valeur.design_afficher_siret}
                onChange={onChange}
              />
              <Interrupteur
                label="Numéro de TVA"
                description="Affiche le numéro de TVA intracommunautaire."
                champ="design_afficher_tva"
                actif={valeur.design_afficher_tva}
                onChange={onChange}
              />
              <Interrupteur
                label="Assurance professionnelle"
                description="Ajoute le bloc d’assurance sous le document."
                champ="design_afficher_assurance"
                actif={valeur.design_afficher_assurance}
                onChange={onChange}
              />
            </div>
          </section>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Texte personnalisé en pied de page
            </span>

            <textarea
              value={valeur.design_pied_page}
              onChange={(event) =>
                onChange("design_pied_page", event.target.value)
              }
              rows={3}
              maxLength={500}
              placeholder="Merci pour votre confiance · arboboard.fr"
              className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <span className="mt-1 block text-right text-xs text-slate-400">
              {valeur.design_pied_page.length}/500
            </span>
          </label>
        </div>

        <section className="2xl:sticky 2xl:top-24 2xl:self-start">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-950">Aperçu direct</h3>
              <p className="mt-1 text-xs text-slate-500">
                Aperçu simplifié du rendu client.
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              {(["devis", "facture"] as TypeApercu[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeApercu(type)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    typeApercu === type
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  {type === "devis" ? "Devis" : "Facture"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-3">
            <div
              className={`mx-auto bg-white shadow-sm ${
                classique ? "rounded-sm" : "rounded-xl"
              } ${compact ? "p-4" : "p-6"}`}
            >
              {!classique && (
                <div
                  className="mb-4 h-1.5 rounded-full"
                  style={{
                    backgroundColor: valeur.design_couleur_principale,
                  }}
                />
              )}

              <div
                className={`flex gap-4 border-b border-slate-200 pb-4 ${
                  enteteEmpilee
                    ? "flex-col"
                    : "items-start justify-between"
                }`}
              >
                <div
                  className={`flex min-w-0 gap-3 ${
                    positionLogo === "centre"
                      ? "flex-col items-center text-center"
                      : positionLogo === "droite"
                        ? "flex-row-reverse text-right"
                        : "items-start"
                  }`}
                >
                  <div
                    className={`${classeLogo} flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-black`}
                    style={{
                      backgroundColor: valeur.design_couleur_secondaire,
                      color: valeur.design_couleur_principale,
                    }}
                  >
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      initiales(nomEntreprise)
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-950">
                      {nomEntreprise || "Votre entreprise"}
                    </p>

                    {valeur.design_afficher_adresse && (
                      <p className="mt-1 text-[10px] leading-4 text-slate-500">
                        1 rue des Jardins · 03000 Moulins
                      </p>
                    )}

                    {valeur.design_afficher_contact && (
                      <p className="text-[10px] leading-4 text-slate-500">
                        04 70 00 00 00 · contact@entreprise.fr
                      </p>
                    )}

                    {(valeur.design_afficher_siret ||
                      valeur.design_afficher_tva) && (
                      <p className="mt-1 text-[9px] text-slate-400">
                        {valeur.design_afficher_siret
                          ? "SIRET 123 456 789 00012"
                          : ""}
                        {valeur.design_afficher_siret &&
                        valeur.design_afficher_tva
                          ? " · "
                          : ""}
                        {valeur.design_afficher_tva
                          ? "TVA FR00123456789"
                          : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className={`${enteteEmpilee ? "w-full" : "w-44"} rounded-xl border p-3`}
                  style={{
                    borderColor: valeur.design_couleur_principale,
                    backgroundColor: valeur.design_couleur_secondaire,
                  }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: valeur.design_couleur_principale }}
                  >
                    {typeApercu === "devis" ? "Devis" : "Facture"}
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {typeApercu === "devis" ? "DEV-2026-0001" : "FAC-2026-0001"}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Date : 16/07/2026
                  </p>
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-4 ${compact ? "py-3" : "py-5"}`}>
                <div>
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    Client
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-900">
                    Jean Dupont
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    8 avenue des Tilleuls
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    Objet
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-900">
                    Entretien des espaces verts
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Taille, tonte et évacuation.
                  </p>
                </div>
              </div>

              <div
                className={`overflow-hidden ${
                  valeur.design_style_tableau === "minimal"
                    ? "border-y border-slate-200"
                    : "rounded-lg border border-slate-200"
                }`}
              >
                <div
                  className="grid grid-cols-[1fr_50px_75px] gap-2 px-3 py-2 text-[9px] font-bold uppercase"
                  style={tableauEntete}
                >
                  <span>Prestation</span>
                  <span className="text-right">Qté</span>
                  <span className="text-right">Total HT</span>
                </div>

                {[
                  ["Taille de haie", "1", "420,00 €"],
                  ["Évacuation des déchets", "1", "85,00 €"],
                ].map((ligne) => (
                  <div
                    key={ligne[0]}
                    className={`grid grid-cols-[1fr_50px_75px] gap-2 border-t border-slate-100 px-3 text-[10px] text-slate-700 ${
                      compact ? "py-1.5" : "py-2.5"
                    }`}
                  >
                    <span className="font-medium">{ligne[0]}</span>
                    <span className="text-right">{ligne[1]}</span>
                    <span className="text-right font-semibold">{ligne[2]}</span>
                  </div>
                ))}
              </div>

              <div
                className={`mt-4 flex ${
                  valeur.design_position_totaux === "gauche"
                    ? "justify-start"
                    : "justify-end"
                }`}
              >
                <div className="w-48 rounded-xl bg-slate-50 p-3">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Total HT</span>
                    <span className="font-bold text-slate-900">505,00 €</span>
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                    <span>TVA</span>
                    <span className="font-bold text-slate-900">101,00 €</span>
                  </div>
                  <div
                    className="mt-2 flex justify-between border-t pt-2 text-xs font-black"
                    style={{
                      borderColor: valeur.design_couleur_principale,
                      color: valeur.design_couleur_principale,
                    }}
                  >
                    <span>Total TTC</span>
                    <span>606,00 €</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-3 text-center text-[9px] text-slate-400">
                {valeur.design_pied_page ||
                  "Document généré par Arboboard"}
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

export { DESIGN_DOCUMENTS_DEFAUT };