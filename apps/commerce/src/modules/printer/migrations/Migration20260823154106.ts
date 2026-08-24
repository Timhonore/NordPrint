import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260823154106 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "printer_model" drop constraint if exists "printer_model_handle_unique";`
    );
    this.addSql(
      `alter table if exists "printer_family" drop constraint if exists "printer_family_handle_unique";`
    );
    this.addSql(
      `alter table if exists "printer_brand" drop constraint if exists "printer_brand_handle_unique";`
    );
    this.addSql(
      `alter table if exists "customer_printer" drop constraint if exists "customer_printer_customer_id_printer_model_id_unique";`
    );
    this.addSql(
      `create table if not exists "customer_printer" ("id" text not null, "customer_id" text not null, "printer_model_id" text not null, "nickname" text null, "is_primary" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_printer_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_printer_deleted_at" ON "customer_printer" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_printer_customer_id_printer_model_id_unique" ON "customer_printer" ("customer_id", "printer_model_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_printer_customer_id" ON "customer_printer" ("customer_id") WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "printer_brand" ("id" text not null, "name" text not null, "handle" text not null, "logo_url" text null, "website_url" text null, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "printer_brand_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_printer_brand_deleted_at" ON "printer_brand" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_printer_brand_handle_unique" ON "printer_brand" ("handle") WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "printer_family" ("id" text not null, "name" text not null, "handle" text not null, "description" text null, "rank" integer not null default 0, "brand_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "printer_family_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_printer_family_brand_id" ON "printer_family" ("brand_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_printer_family_deleted_at" ON "printer_family" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_printer_family_handle_unique" ON "printer_family" ("handle") WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "printer_model" ("id" text not null, "name" text not null, "handle" text not null, "technology" text check ("technology" in ('fdm', 'resin')) not null default 'fdm', "release_year" integer null, "enclosed" boolean not null default false, "heated_bed" boolean not null default true, "max_nozzle_temperature" integer null, "max_bed_temperature" integer null, "build_volume_x" integer null, "build_volume_y" integer null, "build_volume_z" integer null, "default_nozzle_diameter_mm" real null, "supports_ams" boolean not null default false, "supports_ams_lite" boolean not null default false, "hardened_nozzle_stock" boolean not null default false, "image_url" text null, "rank" integer not null default 0, "active" boolean not null default true, "family_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "printer_model_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_printer_model_family_id" ON "printer_model" ("family_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_printer_model_deleted_at" ON "printer_model" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_printer_model_handle_unique" ON "printer_model" ("handle") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_printer_model_active" ON "printer_model" ("active") WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `alter table if exists "printer_family" add constraint "printer_family_brand_id_foreign" foreign key ("brand_id") references "printer_brand" ("id") on update cascade;`
    );

    this.addSql(
      `alter table if exists "printer_model" add constraint "printer_model_family_id_foreign" foreign key ("family_id") references "printer_family" ("id") on update cascade;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "printer_family" drop constraint if exists "printer_family_brand_id_foreign";`
    );

    this.addSql(
      `alter table if exists "printer_model" drop constraint if exists "printer_model_family_id_foreign";`
    );

    this.addSql(`drop table if exists "customer_printer" cascade;`);

    this.addSql(`drop table if exists "printer_brand" cascade;`);

    this.addSql(`drop table if exists "printer_family" cascade;`);

    this.addSql(`drop table if exists "printer_model" cascade;`);
  }
}
