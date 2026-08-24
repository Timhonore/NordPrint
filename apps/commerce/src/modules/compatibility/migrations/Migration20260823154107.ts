import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260823154107 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "compatibility_rule" drop constraint if exists "compatibility_rule_subject_type_subject_id_target_type_target_id_unique";`
    );
    this.addSql(
      `create table if not exists "compatibility_rule" ("id" text not null, "subject_type" text check ("subject_type" in ('product', 'variant')) not null default 'product', "subject_id" text not null, "target_type" text check ("target_type" in ('printer_model', 'printer_family', 'printer_brand')) not null, "target_id" text not null, "status" text check ("status" in ('compatible', 'incompatible', 'conditional', 'unknown')) not null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "compatibility_rule_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_compatibility_rule_deleted_at" ON "compatibility_rule" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_compatibility_rule_subject_type_subject_id_target_type_target_id_unique" ON "compatibility_rule" ("subject_type", "subject_id", "target_type", "target_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_compatibility_rule_subject_id" ON "compatibility_rule" ("subject_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_compatibility_rule_target_id" ON "compatibility_rule" ("target_id") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "compatibility_rule" cascade;`);
  }
}
