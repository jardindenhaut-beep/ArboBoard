import type { MetadataRoute } from "next";

const URL_SITE = "https://arboboard.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const dateGeneration = new Date();

  return [
    {
      url: URL_SITE,
      lastModified: dateGeneration,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${URL_SITE}/mentions-legales`,
      lastModified: dateGeneration,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${URL_SITE}/politique-confidentialite`,
      lastModified: dateGeneration,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${URL_SITE}/cgu`,
      lastModified: dateGeneration,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${URL_SITE}/cgv`,
      lastModified: dateGeneration,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}