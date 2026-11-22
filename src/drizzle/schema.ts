import { pgTable, pgPolicy, pgSchema, text, jsonb, foreignKey, uuid, integer, timestamp, unique, smallint, index, uniqueIndex, check, bigint, numeric, date, primaryKey, boolean, pgView, doublePrecision, pgEnum, customType } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const geographyPoint4326 = customType<{ data: string }>({
	dataType() {
		return "geography";
	},
});

export const fuelCategory = pgEnum("fuel_category", ['gasoline', 'diesel', 'lpg', 'other'])
export const priceReportStatus = pgEnum("price_report_status", ['pending', 'accepted', 'expired', 'rejected'])
export const stationSource = pgEnum("station_source", ['google', 'osm', 'user'])
export const stationStatus = pgEnum("station_status", ['pending', 'active', 'rejected', 'closed'])
export const userRole = pgEnum("user_role", ['user', 'moderator', 'admin'])

export const authSchema = pgSchema("auth");
export const usersInAuth = authSchema.table("users", {
	id: uuid().primaryKey().notNull(),
});

export const appSettings = pgTable("app_settings", {
	key: text().primaryKey().notNull(),
	value: jsonb().notNull(),
	description: text(),
}, (table) => [
	pgPolicy("read settings", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	role: userRole().default('user').notNull(),
	reputation: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [usersInAuth.id],
			name: "profiles_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("update own profile", { as: "permissive", for: "update", to: ["public"], using: sql`(id = auth.uid())`, withCheck: sql`((id = auth.uid()) AND (role = ( SELECT p.role
   FROM profiles p
  WHERE (p.id = auth.uid()))))`  }),
	pgPolicy("read profiles", { as: "permissive", for: "select", to: ["public"] }),
]);

export const brands = pgTable("brands", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logoUrl: text("logo_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("brands_slug_key").on(table.slug),
	pgPolicy("mod manage brands", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_moderator()`, withCheck: sql`is_moderator()`  }),
	pgPolicy("read brands", { as: "permissive", for: "select", to: ["public"] }),
]);

export const fuelTypes = pgTable("fuel_types", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: text().notNull(),
	commonName: text("common_name").notNull(),
	technicalName: text("technical_name").notNull(),
	category: fuelCategory().default('gasoline').notNull(),
	octane: smallint(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("fuel_types_slug_key").on(table.slug),
	pgPolicy("mod manage fuels", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_moderator()`, withCheck: sql`is_moderator()`  }),
	pgPolicy("read fuel types", { as: "permissive", for: "select", to: ["public"] }),
]);

export const fuelAliases = pgTable("fuel_aliases", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fuelTypeId: uuid("fuel_type_id").notNull(),
	brandId: uuid("brand_id"),
	alias: text().notNull(),
	priority: integer().default(100).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_fuel_alias_trgm").using("gin", table.alias.asc().nullsLast().op("gin_trgm_ops")),
	uniqueIndex("uq_fuel_alias").using("btree", sql`fuel_type_id`, sql`lower(alias)`, sql`COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::uuid`),
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [brands.id],
			name: "fuel_aliases_brand_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fuelTypeId],
			foreignColumns: [fuelTypes.id],
			name: "fuel_aliases_fuel_type_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("mod manage aliases", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_moderator()`, withCheck: sql`is_moderator()`  }),
	pgPolicy("read aliases", { as: "permissive", for: "select", to: ["public"] }),
]);

export const stations = pgTable("stations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	brandId: uuid("brand_id"),
	name: text().notNull(),
	address: text(),
	city: text(),
	province: text(),
	location: geographyPoint4326("location").notNull(),
	source: stationSource().notNull(),
	googlePlaceId: text("google_place_id"),
	osmType: text("osm_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	osmId: bigint("osm_id", { mode: "number" }),
	externalSyncedAt: timestamp("external_synced_at", { withTimezone: true, mode: 'string' }),
	status: stationStatus().default('pending').notNull(),
	createdBy: uuid("created_by"),
	activatedAt: timestamp("activated_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stations_brand").using("btree", table.brandId.asc().nullsLast().op("uuid_ops")),
	index("idx_stations_location").using("gist", table.location.asc().nullsLast().op("gist_geography_ops")),
	index("idx_stations_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [brands.id],
			name: "stations_brand_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "stations_created_by_fkey"
		}).onDelete("set null"),
	unique("stations_google_place_id_key").on(table.googlePlaceId),
	unique("uq_osm").on(table.osmType, table.osmId),
	pgPolicy("mod manage stations", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_moderator()`, withCheck: sql`is_moderator()`  }),
	pgPolicy("propose station", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("read stations", { as: "permissive", for: "select", to: ["public"] }),
	check("chk_google_has_place_id", sql`(source <> 'google'::station_source) OR (google_place_id IS NOT NULL)`),
	check("chk_osm_has_id", sql`(source <> 'osm'::station_source) OR (osm_id IS NOT NULL)`),
	check("stations_osm_type_check", sql`osm_type = ANY (ARRAY['node'::text, 'way'::text, 'relation'::text])`),
]);

export const stationPhotos = pgTable("station_photos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	stationId: uuid("station_id").notNull(),
	source: text().notNull(),
	googlePhotoReference: text("google_photo_reference"),
	storagePath: text("storage_path"),
	attribution: text(),
	uploadedBy: uuid("uploaded_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_station_photos_station").using("btree", table.stationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.stationId],
			foreignColumns: [stations.id],
			name: "station_photos_station_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [profiles.id],
			name: "station_photos_uploaded_by_fkey"
		}).onDelete("set null"),
	pgPolicy("mod manage photos", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_moderator()`, withCheck: sql`is_moderator()`  }),
	pgPolicy("upload photo", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("read photos", { as: "permissive", for: "select", to: ["public"] }),
	check("chk_photo_ref", sql`(google_photo_reference IS NOT NULL) OR (storage_path IS NOT NULL)`),
	check("station_photos_source_check", sql`source = ANY (ARRAY['google'::text, 'user'::text])`),
]);

export const priceReports = pgTable("price_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	stationId: uuid("station_id").notNull(),
	fuelTypeId: uuid("fuel_type_id").notNull(),
	userId: uuid("user_id").notNull(),
	price: numeric({ precision: 6, scale:  2 }).notNull(),
	status: priceReportStatus().default('pending').notNull(),
	confirmsReportId: uuid("confirms_report_id"),
	reportedOn: date("reported_on").default(sql`((now() AT TIME ZONE 'Asia/Manila'`).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_price_reports_lookup").using("btree", table.stationId.asc().nullsLast().op("timestamptz_ops"), table.fuelTypeId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.confirmsReportId],
			foreignColumns: [table.id],
			name: "price_reports_confirms_report_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.fuelTypeId],
			foreignColumns: [fuelTypes.id],
			name: "price_reports_fuel_type_id_fkey"
		}),
	foreignKey({
			columns: [table.stationId],
			foreignColumns: [stations.id],
			name: "price_reports_station_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "price_reports_user_id_fkey"
		}).onDelete("cascade"),
	unique("uq_report_per_day").on(table.stationId, table.fuelTypeId, table.userId, table.reportedOn),
	pgPolicy("mod manage reports", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_moderator()`, withCheck: sql`is_moderator()`  }),
	pgPolicy("insert own report", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("read own reports", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("price_reports_price_check", sql`(price > (0)::numeric) AND (price < (500)::numeric)`),
]);

export const priceHistory = pgTable("price_history", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "price_history_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	stationId: uuid("station_id").notNull(),
	fuelTypeId: uuid("fuel_type_id").notNull(),
	price: numeric({ precision: 6, scale:  2 }).notNull(),
	source: text().default('consensus').notNull(),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_price_history_series").using("btree", table.stationId.asc().nullsLast().op("timestamptz_ops"), table.fuelTypeId.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.asc().nullsLast().op("uuid_ops")),
	index("idx_price_history_time").using("btree", table.fuelTypeId.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.fuelTypeId],
			foreignColumns: [fuelTypes.id],
			name: "price_history_fuel_type_id_fkey"
		}),
	foreignKey({
			columns: [table.stationId],
			foreignColumns: [stations.id],
			name: "price_history_station_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("read history", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	check("price_history_source_check", sql`source = ANY (ARRAY['consensus'::text, 'import'::text, 'admin'::text])`),
]);

export const stationVotes = pgTable("station_votes", {
	stationId: uuid("station_id").notNull(),
	userId: uuid("user_id").notNull(),
	vote: boolean().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.stationId],
			foreignColumns: [stations.id],
			name: "station_votes_station_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "station_votes_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.stationId, table.userId], name: "station_votes_pkey"}),
	pgPolicy("change own vote", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(user_id = auth.uid())`, withCheck: sql`(user_id = auth.uid())`  }),
	pgPolicy("insert own vote", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("read own votes", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const stationFuels = pgTable("station_fuels", {
	stationId: uuid("station_id").notNull(),
	fuelTypeId: uuid("fuel_type_id").notNull(),
	price: numeric({ precision: 6, scale:  2 }).notNull(),
	priceUpdatedAt: timestamp("price_updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	confirmations: integer().default(1).notNull(),
	isAvailable: boolean("is_available").default(true).notNull(),
}, (table) => [
	index("idx_station_fuels_fuel").using("btree", table.fuelTypeId.asc().nullsLast().op("numeric_ops"), table.price.asc().nullsLast().op("numeric_ops")),
	foreignKey({
			columns: [table.fuelTypeId],
			foreignColumns: [fuelTypes.id],
			name: "station_fuels_fuel_type_id_fkey"
		}),
	foreignKey({
			columns: [table.stationId],
			foreignColumns: [stations.id],
			name: "station_fuels_station_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.stationId, table.fuelTypeId], name: "station_fuels_pkey"}),
	pgPolicy("mod manage prices", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_moderator()`, withCheck: sql`is_moderator()`  }),
	pgPolicy("read live fuels", { as: "permissive", for: "select", to: ["public"] }),
]);
export const fuelTypesWithAliases = pgView("fuel_types_with_aliases", {	id: uuid(),
	slug: text(),
	commonName: text("common_name"),
	technicalName: text("technical_name"),
	category: fuelCategory(),
	octane: smallint(),
	sortOrder: integer("sort_order"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	aliases: text(),
}).with({"securityInvoker":true}).as(sql`SELECT id, slug, common_name, technical_name, category, octane, sort_order, created_at, COALESCE(( SELECT array_agg(a.alias ORDER BY a.priority, a.alias) AS array_agg FROM fuel_aliases a WHERE a.fuel_type_id = f.id AND a.brand_id IS NULL), '{}'::text[]) AS aliases FROM fuel_types f`);

export const stationsWithCoords = pgView("stations_with_coords", {	id: uuid(),
	brandId: uuid("brand_id"),
	name: text(),
	address: text(),
	city: text(),
	province: text(),
	location: geographyPoint4326("location"),
	source: stationSource(),
	googlePlaceId: text("google_place_id"),
	osmType: text("osm_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	osmId: bigint("osm_id", { mode: "number" }),
	externalSyncedAt: timestamp("external_synced_at", { withTimezone: true, mode: 'string' }),
	status: stationStatus(),
	createdBy: uuid("created_by"),
	activatedAt: timestamp("activated_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	lat: doublePrecision(),
	lng: doublePrecision(),
}).with({"securityInvoker":true}).as(sql`SELECT id, brand_id, name, address, city, province, location, source, google_place_id, osm_type, osm_id, external_synced_at, status, created_by, activated_at, created_at, updated_at, st_y(location::geometry) AS lat, st_x(location::geometry) AS lng FROM stations s`);

export const stationVoteCounts = pgView("station_vote_counts", {	stationId: uuid("station_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	yesVotes: bigint("yes_votes", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	noVotes: bigint("no_votes", { mode: "number" }),
}).as(sql`SELECT station_id, count(*) FILTER (WHERE vote) AS yes_votes, count(*) FILTER (WHERE NOT vote) AS no_votes FROM station_votes GROUP BY station_id`);

export const pendingPriceReportSummary = pgView("pending_price_report_summary", {	stationId: uuid("station_id"),
	fuelTypeId: uuid("fuel_type_id"),
	price: numeric({ precision: 6, scale:  2 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	supporters: bigint({ mode: "number" }),
	latestAt: timestamp("latest_at", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT station_id, fuel_type_id, price, count(DISTINCT user_id) AS supporters, max(created_at) AS latest_at FROM price_reports WHERE status = 'pending'::price_report_status GROUP BY station_id, fuel_type_id, price`);