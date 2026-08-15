import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_blog_posts_topic" AS ENUM('ooh', 'campaigns', 'product', 'company', 'insights');
  CREATE TYPE "cms"."enum_blog_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__blog_posts_v_version_topic" AS ENUM('ooh', 'campaigns', 'product', 'company', 'insights');
  CREATE TYPE "cms"."enum__blog_posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );

  CREATE TABLE "cms"."blog_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"featured_image_id" integer,
  	"author_name" varchar,
  	"author_role" varchar,
  	"published_at" timestamp(3) with time zone,
  	"topic" "cms"."enum_blog_posts_topic" DEFAULT 'insights',
  	"body" jsonb,
  	"featured" boolean DEFAULT false,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_blog_posts_status" DEFAULT 'draft'
  );

  CREATE TABLE "cms"."_blog_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_featured_image_id" integer,
  	"version_author_name" varchar,
  	"version_author_role" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_topic" "cms"."enum__blog_posts_v_version_topic" DEFAULT 'insights',
  	"version_body" jsonb,
  	"version_featured" boolean DEFAULT false,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__blog_posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );

  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "blog_posts_id" integer;
  ALTER TABLE "cms"."blog_posts" ADD CONSTRAINT "blog_posts_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_parent_id_blog_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."blog_posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_updated_at_idx" ON "cms"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "cms"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "cms"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "cms"."media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "cms"."media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "cms"."media" USING btree ("sizes_hero_filename");
  CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "cms"."blog_posts" USING btree ("slug");
  CREATE INDEX "blog_posts_featured_image_idx" ON "cms"."blog_posts" USING btree ("featured_image_id");
  CREATE INDEX "blog_posts_updated_at_idx" ON "cms"."blog_posts" USING btree ("updated_at");
  CREATE INDEX "blog_posts_created_at_idx" ON "cms"."blog_posts" USING btree ("created_at");
  CREATE INDEX "blog_posts__status_idx" ON "cms"."blog_posts" USING btree ("_status");
  CREATE INDEX "_blog_posts_v_parent_idx" ON "cms"."_blog_posts_v" USING btree ("parent_id");
  CREATE INDEX "_blog_posts_v_version_version_slug_idx" ON "cms"."_blog_posts_v" USING btree ("version_slug");
  CREATE INDEX "_blog_posts_v_version_version_featured_image_idx" ON "cms"."_blog_posts_v" USING btree ("version_featured_image_id");
  CREATE INDEX "_blog_posts_v_version_version_updated_at_idx" ON "cms"."_blog_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_blog_posts_v_version_version_created_at_idx" ON "cms"."_blog_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_blog_posts_v_version_version__status_idx" ON "cms"."_blog_posts_v" USING btree ("version__status");
  CREATE INDEX "_blog_posts_v_created_at_idx" ON "cms"."_blog_posts_v" USING btree ("created_at");
  CREATE INDEX "_blog_posts_v_updated_at_idx" ON "cms"."_blog_posts_v" USING btree ("updated_at");
  CREATE INDEX "_blog_posts_v_latest_idx" ON "cms"."_blog_posts_v" USING btree ("latest");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "cms"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "cms"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_blog_posts_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("blog_posts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."blog_posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_blog_posts_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."media" CASCADE;
  DROP TABLE "cms"."blog_posts" CASCADE;
  DROP TABLE "cms"."_blog_posts_v" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";

  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blog_posts_fk";

  DROP INDEX "cms"."payload_locked_documents_rels_media_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_blog_posts_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "media_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "blog_posts_id";
  DROP TYPE "cms"."enum_blog_posts_topic";
  DROP TYPE "cms"."enum_blog_posts_status";
  DROP TYPE "cms"."enum__blog_posts_v_version_topic";
  DROP TYPE "cms"."enum__blog_posts_v_version_status";`)
}
