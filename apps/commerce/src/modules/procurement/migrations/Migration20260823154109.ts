import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260823154109 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "variant_cost" drop constraint if exists "variant_cost_variant_id_unique";`);
    this.addSql(`create table if not exists "variant_cost" ("id" text not null, "variant_id" text not null, "cost_price" integer not null, "currency_code" text not null default 'dkk', "supplier_name" text null, "supplier_sku" text null, "last_purchased_at" timestamptz null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "variant_cost_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_cost_deleted_at" ON "variant_cost" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_variant_cost_variant_id_unique" ON "variant_cost" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_cost_supplier_sku" ON "variant_cost" ("supplier_sku") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "variant_cost" cascade;`);
  }

}
