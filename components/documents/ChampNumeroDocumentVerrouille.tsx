type TypeDocument = "devis" | "facture" | "avoir";

type Props = {
  typeDocument: TypeDocument;
  numero?: string | null;
  className?: string;
};

function libelleDocument(typeDocument: TypeDocument) {
  if (typeDocument === "devis") return "devis";
  if (typeDocument === "avoir") return "avoir";
  return "facture";
}

function couleurDocument(typeDocument: TypeDocument) {
  if (typeDocument === "devis") {
    return {
      fond: "bg-emerald-50",
      bordure: "border-emerald-200",
      texte: "text-emerald-800",
      badge: "bg-emerald-100 text-emerald-700",
    };
  }

  if (typeDocument === "avoir") {
    return {
      fond: "bg-purple-50",
      bordure: "border-purple-200",
      texte: "text-purple-800",
      badge: "bg-purple-100 text-purple-700",
    };
  }

  return {
    fond: "bg-blue-50",
    bordure: "border-blue-200",
    texte: "text-blue-800",
    badge: "bg-blue-100 text-blue-700",
  };
}

export default function ChampNumeroDocumentVerrouille({
  typeDocument,
  numero,
  className = "",
}: Props) {
  const couleurs = couleurDocument(typeDocument);
  const numeroAffiche = numero?.trim() || "Généré automatiquement";

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Numéro du {libelleDocument(typeDocument)}
      </label>

      <div
        className={`rounded-xl border px-4 py-3 ${couleurs.fond} ${couleurs.bordure}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-sm font-semibold ${couleurs.texte}`}>
            {numeroAffiche}
          </p>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${couleurs.badge}`}
          >
            Verrouillé
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Ce numéro est généré automatiquement et ne peut plus être modifié
          après création.
        </p>
      </div>
    </div>
  );
}