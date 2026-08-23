import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260823154112 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "guide" drop constraint if exists "guide_slug_unique";`);
    this.addSql(`create table if not exists "guide" ("id" text not null, "slug" text not null, "title" text not null, "intro" text not null, "content" text not null, "hero_image_url" text null, "hero_image_alt" text null, "seo_title" text null, "seo_description" text null, "author" text null, "tags" jsonb null, "related_product_ids" jsonb null, "related_guide_slugs" jsonb null, "published_at" timestamptz null, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "guide_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_guide_deleted_at" ON "guide" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_guide_slug_unique" ON "guide" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_guide_published_at" ON "guide" ("published_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "guide" cascade;`);
  }

}
