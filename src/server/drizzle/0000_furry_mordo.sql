-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."fuel_category" AS ENUM('gasoline', 'diesel', 'lpg', 'other');--> statement-breakpoint
CREATE TYPE "public"."price_report_status" AS ENUM('pending', 'accepted', 'expired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."station_source" AS ENUM('google', 'osm', 'user');--> statement-breakpoint
CREATE TYPE "public"."station_status" AS ENUM('pending', 'active', 'rejected', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text
);
--> statement-breakpoint
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"reputation" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "brands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fuel_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"common_name" text NOT NULL,
	"technical_name" text NOT NULL,
	"category" "fuel_category" DEFAULT 'gasoline' NOT NULL,
	"octane" smallint,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fuel_types_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "fuel_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fuel_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fuel_type_id" uuid NOT NULL,
	"brand_id" uuid,
	"alias" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fuel_aliases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"province" text,
	"location" "geography" NOT NULL,
	"source" "station_source" NOT NULL,
	"google_place_id" text,
	"osm_type" text,
	"osm_id" bigint,
	"external_synced_at" timestamp with time zone,
	"status" "station_status" DEFAULT 'pending' NOT NULL,
	"created_by" uuid,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stations_google_place_id_key" UNIQUE("google_place_id"),
	CONSTRAINT "uq_osm" UNIQUE("osm_type","osm_id"),
	CONSTRAINT "chk_google_has_place_id" CHECK ((source <> 'google'::station_source) OR (google_place_id IS NOT NULL)),
	CONSTRAINT "chk_osm_has_id" CHECK ((source <> 'osm'::station_source) OR (osm_id IS NOT NULL)),
	CONSTRAINT "stations_osm_type_check" CHECK (osm_type = ANY (ARRAY['node'::text, 'way'::text, 'relation'::text]))
);
--> statement-breakpoint
ALTER TABLE "stations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "station_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"source" text NOT NULL,
	"google_photo_reference" text,
	"storage_path" text,
	"attribution" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_photo_ref" CHECK ((google_photo_reference IS NOT NULL) OR (storage_path IS NOT NULL)),
	CONSTRAINT "station_photos_source_check" CHECK (source = ANY (ARRAY['google'::text, 'user'::text]))
);
--> statement-breakpoint
ALTER TABLE "station_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "price_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"fuel_type_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"price" numeric(6, 2) NOT NULL,
	"status" "price_report_status" DEFAULT 'pending' NOT NULL,
	"confirms_report_id" uuid,
	"reported_on" date DEFAULT ((now() AT TIME ZONE 'Asia/Manila' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_report_per_day" UNIQUE("station_id","fuel_type_id","user_id","reported_on"),
	CONSTRAINT "price_reports_price_check" CHECK ((price > (0)::numeric) AND (price < (500)::numeric))
);
--> statement-breakpoint
ALTER TABLE "price_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "price_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"station_id" uuid NOT NULL,
	"fuel_type_id" uuid NOT NULL,
	"price" numeric(6, 2) NOT NULL,
	"source" text DEFAULT 'consensus' NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_history_source_check" CHECK (source = ANY (ARRAY['consensus'::text, 'import'::text, 'admin'::text]))
);
--> statement-breakpoint
ALTER TABLE "price_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "station_votes" (
	"station_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vote" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "station_votes_pkey" PRIMARY KEY("station_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "station_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "station_fuels" (
	"station_id" uuid NOT NULL,
	"fuel_type_id" uuid NOT NULL,
	"price" numeric(6, 2) NOT NULL,
	"price_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmations" integer DEFAULT 1 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	CONSTRAINT "station_fuels_pkey" PRIMARY KEY("station_id","fuel_type_id")
);
--> statement-breakpoint
ALTER TABLE "station_fuels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_aliases" ADD CONSTRAINT "fuel_aliases_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_aliases" ADD CONSTRAINT "fuel_aliases_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "public"."fuel_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_photos" ADD CONSTRAINT "station_photos_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_photos" ADD CONSTRAINT "station_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_reports" ADD CONSTRAINT "price_reports_confirms_report_id_fkey" FOREIGN KEY ("confirms_report_id") REFERENCES "public"."price_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_reports" ADD CONSTRAINT "price_reports_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "public"."fuel_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_reports" ADD CONSTRAINT "price_reports_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_reports" ADD CONSTRAINT "price_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "public"."fuel_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_votes" ADD CONSTRAINT "station_votes_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_votes" ADD CONSTRAINT "station_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_fuels" ADD CONSTRAINT "station_fuels_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "public"."fuel_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_fuels" ADD CONSTRAINT "station_fuels_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fuel_alias_trgm" ON "fuel_aliases" USING gin ("alias" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fuel_alias" ON "fuel_aliases" USING btree (fuel_type_id uuid_ops,lower(alias) text_ops,COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::uuid text_ops);--> statement-breakpoint
CREATE INDEX "idx_stations_brand" ON "stations" USING btree ("brand_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_stations_location" ON "stations" USING gist ("location" gist_geography_ops);--> statement-breakpoint
CREATE INDEX "idx_stations_status" ON "stations" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_station_photos_station" ON "station_photos" USING btree ("station_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_price_reports_lookup" ON "price_reports" USING btree ("station_id" timestamptz_ops,"fuel_type_id" enum_ops,"status" timestamptz_ops,"created_at" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_price_history_series" ON "price_history" USING btree ("station_id" timestamptz_ops,"fuel_type_id" timestamptz_ops,"recorded_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_price_history_time" ON "price_history" USING btree ("fuel_type_id" timestamptz_ops,"recorded_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_station_fuels_fuel" ON "station_fuels" USING btree ("fuel_type_id" numeric_ops,"price" numeric_ops);--> statement-breakpoint
CREATE VIEW "public"."fuel_types_with_aliases" WITH (security_invoker = true) AS (SELECT id, slug, common_name, technical_name, category, octane, sort_order, created_at, COALESCE(( SELECT array_agg(a.alias ORDER BY a.priority, a.alias) AS array_agg FROM fuel_aliases a WHERE a.fuel_type_id = f.id AND a.brand_id IS NULL), '{}'::text[]) AS aliases FROM fuel_types f);--> statement-breakpoint
CREATE VIEW "public"."stations_with_coords" WITH (security_invoker = true) AS (SELECT id, brand_id, name, address, city, province, location, source, google_place_id, osm_type, osm_id, external_synced_at, status, created_by, activated_at, created_at, updated_at, st_y(location::geometry) AS lat, st_x(location::geometry) AS lng FROM stations s);--> statement-breakpoint
CREATE VIEW "public"."station_vote_counts" AS (SELECT station_id, count(*) FILTER (WHERE vote) AS yes_votes, count(*) FILTER (WHERE NOT vote) AS no_votes FROM station_votes GROUP BY station_id);--> statement-breakpoint
CREATE VIEW "public"."pending_price_report_summary" AS (SELECT station_id, fuel_type_id, price, count(DISTINCT user_id) AS supporters, max(created_at) AS latest_at FROM price_reports WHERE status = 'pending'::price_report_status GROUP BY station_id, fuel_type_id, price);--> statement-breakpoint
CREATE POLICY "read settings" ON "app_settings" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "update own profile" ON "profiles" AS PERMISSIVE FOR UPDATE TO public USING ((id = auth.uid())) WITH CHECK (((id = auth.uid()) AND (role = ( SELECT p.role
   FROM profiles p
  WHERE (p.id = auth.uid())))));--> statement-breakpoint
CREATE POLICY "read profiles" ON "profiles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "mod manage brands" ON "brands" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_moderator()) WITH CHECK (is_moderator());--> statement-breakpoint
CREATE POLICY "read brands" ON "brands" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "mod manage fuels" ON "fuel_types" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_moderator()) WITH CHECK (is_moderator());--> statement-breakpoint
CREATE POLICY "read fuel types" ON "fuel_types" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "mod manage aliases" ON "fuel_aliases" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_moderator()) WITH CHECK (is_moderator());--> statement-breakpoint
CREATE POLICY "read aliases" ON "fuel_aliases" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "mod manage stations" ON "stations" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_moderator()) WITH CHECK (is_moderator());--> statement-breakpoint
CREATE POLICY "propose station" ON "stations" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "read stations" ON "stations" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "mod manage photos" ON "station_photos" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_moderator()) WITH CHECK (is_moderator());--> statement-breakpoint
CREATE POLICY "upload photo" ON "station_photos" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "read photos" ON "station_photos" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "mod manage reports" ON "price_reports" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_moderator()) WITH CHECK (is_moderator());--> statement-breakpoint
CREATE POLICY "insert own report" ON "price_reports" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "read own reports" ON "price_reports" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "read history" ON "price_history" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "change own vote" ON "station_votes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "insert own vote" ON "station_votes" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "read own votes" ON "station_votes" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "mod manage prices" ON "station_fuels" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_moderator()) WITH CHECK (is_moderator());--> statement-breakpoint
CREATE POLICY "read live fuels" ON "station_fuels" AS PERMISSIVE FOR SELECT TO public;
*/