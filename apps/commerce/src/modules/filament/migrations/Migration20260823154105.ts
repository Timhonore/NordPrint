import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260823154105 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "filament_variant_spec" drop constraint if exists "filament_variant_spec_variant_id_unique";`
    );
    this.addSql(
      `alter table if exists "filament_attribute_value" drop constraint if exists "filament_attribute_value_filament_spec_id_definition_id_unique";`
    );
    this.addSql(
      `alter table if exists "filament_spec" drop constraint if exists "filament_spec_product_id_unique";`
    );
    this.addSql(
      `alter table if exists "filament_attribute_definition" drop constraint if exists "filament_attribute_definition_key_unique";`
    );
    this.addSql(
      `create table if not exists "filament_attribute_definition" ("id" text not null, "key" text not null, "label" text not null, "type" text check ("type" in ('number', 'text', 'boolean', 'enum', 'url')) not null, "unit" text null, "options" jsonb null, "group" text null, "description" text null, "filterable" boolean not null default false, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "filament_attribute_definition_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_attribute_definition_deleted_at" ON "filament_attribute_definition" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_filament_attribute_definition_key_unique" ON "filament_attribute_definition" ("key") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_attribute_definition_filterable" ON "filament_attribute_definition" ("filterable") WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "filament_spec" ("id" text not null, "product_id" text not null, "manufacturer" text null, "material" text check ("material" in ('pla', 'petg', 'abs', 'asa', 'tpu', 'nylon', 'pc', 'pva', 'hips', 'pp', 'pet', 'peek', 'support', 'other')) not null, "material_variant" text null, "finish" text check ("finish" in ('basic', 'matte', 'silk', 'high-speed', 'wood', 'marble', 'glow', 'carbon-fiber', 'glass-fiber', 'translucent', 'metallic', 'gradient', 'other')) null, "diameter_mm" real not null default 1.75, "net_filament_weight_g" integer not null default 1000, "gross_weight_g" integer null, "density_g_cm3" real null, "nozzle_temperature_min" integer null, "nozzle_temperature_max" integer null, "bed_temperature_min" integer null, "bed_temperature_max" integer null, "drying_temperature" integer null, "drying_duration_hours" integer null, "max_volumetric_speed" real null, "heat_resistance_c" integer null, "enclosure_recommended" boolean not null default false, "hardened_nozzle_recommended" boolean not null default false, "abrasive" boolean not null default false, "food_contact_information" text null, "ams_compatible" boolean null, "ams_lite_compatible" boolean null, "spool_material" text null, "technical_datasheet_url" text null, "safety_datasheet_url" text null, "rating_printability" integer null, "rating_strength" integer null, "rating_flexibility" integer null, "rating_heat_resistance" integer null, "rating_uv_resistance" integer null, "rating_layer_adhesion" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "filament_spec_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_spec_deleted_at" ON "filament_spec" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_filament_spec_product_id_unique" ON "filament_spec" ("product_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_spec_material" ON "filament_spec" ("material") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_spec_finish" ON "filament_spec" ("finish") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_spec_diameter_mm" ON "filament_spec" ("diameter_mm") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_spec_net_filament_weight_g" ON "filament_spec" ("net_filament_weight_g") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_spec_ams_compatible" ON "filament_spec" ("ams_compatible") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_spec_abrasive" ON "filament_spec" ("abrasive") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_spec_material_diameter_mm_net_filament_weight_g" ON "filament_spec" ("material", "diameter_mm", "net_filament_weight_g") WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "filament_attribute_value" ("id" text not null, "value_number" real null, "value_text" text null, "value_boolean" boolean null, "filament_spec_id" text not null, "definition_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "filament_attribute_value_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_attribute_value_filament_spec_id" ON "filament_attribute_value" ("filament_spec_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_attribute_value_definition_id" ON "filament_attribute_value" ("definition_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_attribute_value_deleted_at" ON "filament_attribute_value" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_filament_attribute_value_filament_spec_id_definition_id_unique" ON "filament_attribute_value" ("filament_spec_id", "definition_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_attribute_value_definition_id_value_number" ON "filament_attribute_value" ("definition_id", "value_number") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_attribute_value_definition_id_value_text" ON "filament_attribute_value" ("definition_id", "value_text") WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "filament_variant_spec" ("id" text not null, "variant_id" text not null, "color_name" text null, "color_hex" text null, "color_hex_secondary" text null, "manufacturer_color_code" text null, "color_family" text check ("color_family" in ('black', 'white', 'grey', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'beige', 'gold', 'silver', 'transparent', 'multi')) null, "diameter_mm" real null, "net_filament_weight_g" integer null, "expected_restock_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "filament_variant_spec_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_variant_spec_deleted_at" ON "filament_variant_spec" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_filament_variant_spec_variant_id_unique" ON "filament_variant_spec" ("variant_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_variant_spec_color_family" ON "filament_variant_spec" ("color_family") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_filament_variant_spec_net_filament_weight_g" ON "filament_variant_spec" ("net_filament_weight_g") WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `alter table if exists "filament_attribute_value" add constraint "filament_attribute_value_filament_spec_id_foreign" foreign key ("filament_spec_id") references "filament_spec" ("id") on update cascade;`
    );
    this.addSql(
      `alter table if exists "filament_attribute_value" add constraint "filament_attribute_value_definition_id_foreign" foreign key ("definition_id") references "filament_attribute_definition" ("id") on update cascade;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "filament_attribute_value" drop constraint if exists "filament_attribute_value_definition_id_foreign";`
    );

    this.addSql(
      `alter table if exists "filament_attribute_value" drop constraint if exists "filament_attribute_value_filament_spec_id_foreign";`
    );

    this.addSql(`drop table if exists "filament_attribute_definition" cascade;`);

    this.addSql(`drop table if exists "filament_spec" cascade;`);

    this.addSql(`drop table if exists "filament_attribute_value" cascade;`);

    this.addSql(`drop table if exists "filament_variant_spec" cascade;`);
  }
}
