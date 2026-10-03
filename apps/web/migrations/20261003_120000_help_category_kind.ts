import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Hand-written: `payload migrate:create` needs an interactive prompt here, and the
// JSON snapshots predate the move to the "cms" schema, so it would re-emit every enum.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_help_categories_kind" AS ENUM('faq', 'guide');
  ALTER TABLE "cms"."help_categories" ADD COLUMN "kind" "cms"."enum_help_categories_kind" DEFAULT 'faq' NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."help_categories" DROP COLUMN "kind";
  DROP TYPE "cms"."enum_help_categories_kind";`)
}
