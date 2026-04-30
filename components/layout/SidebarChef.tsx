import Link from "next/link";

const menuItems = [
  { label: "Tableau de bord", href: "/chef/dashboard" },
  { label: "Devis", href: "/chef/devis" },
  { label: "Factures", href: "/chef/factures" },
  { label: "Calendrier", href: "/chef/calendrier" },
  { label: "Fiches d'intervention", href: "/chef/interventions" },
  { label: "Demandes salariés", href: "/chef/demandes" },
  { label: "Paramètres entreprise", href: "/chef/parametres" },
];

export default function SidebarChef() {
  return (
    <aside className="min-h-screen w-72 border-r bg-white p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-green-700">Arboboard</h1>
        <p className="text-sm text-gray-500">Espace chef d’entreprise</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
