import type { MetadataRoute } from "next";

const URL_SITE = "https://arboboard.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/mentions-legales",
        "/politique-confidentialite",
        "/cgu",
        "/cgv",
      ],
      disallow: [
        "/api/",
        "/auth/",
        "/chef/",
        "/salarie/",
        "/connexion",
        "/inscription",
        "/mot-de-passe-oublie",
      ],
    },
    sitemap: `${URL_SITE}/sitemap.xml`,
    host: URL_SITE,
  };
}