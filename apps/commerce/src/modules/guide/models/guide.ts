import { model } from "@medusajs/framework/utils";

/**
 * Guides — the knowledge-platform half of NordPrint.
 *
 * A deliberately small content model: title, slug, hero, intro, markdown body,
 * SEO fields and relations. Anything more elaborate belongs in a real CMS, and
 * this schema is small enough to migrate to one without a rewrite.
 */
export const Guide = model
  .define("guide", {
    id: model.id({ prefix: "guide" }).primaryKey(),
    slug: model.text(),
    title: model.text().searchable(),
    intro: model.text().searchable(),
    /** Markdown. Rendered and sanitised server-side. */
    content: model.text().searchable(),

    hero_image_url: model.text().nullable(),
    hero_image_alt: model.text().nullable(),

    seo_title: model.text().nullable(),
    seo_description: model.text().nullable(),

    author: model.text().nullable(),
    tags: model.json().nullable(),

    /** Product ids shown as "Produkter nævnt i guiden". */
    related_product_ids: model.json().nullable(),
    related_guide_slugs: model.json().nullable(),

    published_at: model.dateTime().nullable(),
    rank: model.number().default(0),
  })
  .indexes([{ on: ["slug"], unique: true }, { on: ["published_at"] }]);
