export default function InterventionsSalariePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Mes fiches d’intervention</h1>
      <p className="mt-2 text-gray-600">
        Consultation des fiches d’intervention préparées par l’employeur.
      </p>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Fiches disponibles</h2>
        <p className="mt-2 text-gray-500">
          Aucune fiche d’intervention disponible pour le moment.
        </p>
      </div>
    </div>
  );
}
