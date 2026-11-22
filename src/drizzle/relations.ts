import { relations } from "drizzle-orm/relations";
import { usersInAuth, profiles, brands, fuelAliases, fuelTypes, stations, stationPhotos, priceReports, priceHistory, stationVotes, stationFuels } from "./schema";

export const profilesRelations = relations(profiles, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [profiles.id],
		references: [usersInAuth.id]
	}),
	stations: many(stations),
	stationPhotos: many(stationPhotos),
	priceReports: many(priceReports),
	stationVotes: many(stationVotes),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	profiles: many(profiles),
}));

export const fuelAliasesRelations = relations(fuelAliases, ({one}) => ({
	brand: one(brands, {
		fields: [fuelAliases.brandId],
		references: [brands.id]
	}),
	fuelType: one(fuelTypes, {
		fields: [fuelAliases.fuelTypeId],
		references: [fuelTypes.id]
	}),
}));

export const brandsRelations = relations(brands, ({many}) => ({
	fuelAliases: many(fuelAliases),
	stations: many(stations),
}));

export const fuelTypesRelations = relations(fuelTypes, ({many}) => ({
	fuelAliases: many(fuelAliases),
	priceReports: many(priceReports),
	priceHistories: many(priceHistory),
	stationFuels: many(stationFuels),
}));

export const stationsRelations = relations(stations, ({one, many}) => ({
	brand: one(brands, {
		fields: [stations.brandId],
		references: [brands.id]
	}),
	profile: one(profiles, {
		fields: [stations.createdBy],
		references: [profiles.id]
	}),
	stationPhotos: many(stationPhotos),
	priceReports: many(priceReports),
	priceHistories: many(priceHistory),
	stationVotes: many(stationVotes),
	stationFuels: many(stationFuels),
}));

export const stationPhotosRelations = relations(stationPhotos, ({one}) => ({
	station: one(stations, {
		fields: [stationPhotos.stationId],
		references: [stations.id]
	}),
	profile: one(profiles, {
		fields: [stationPhotos.uploadedBy],
		references: [profiles.id]
	}),
}));

export const priceReportsRelations = relations(priceReports, ({one, many}) => ({
	priceReport: one(priceReports, {
		fields: [priceReports.confirmsReportId],
		references: [priceReports.id],
		relationName: "priceReports_confirmsReportId_priceReports_id"
	}),
	priceReports: many(priceReports, {
		relationName: "priceReports_confirmsReportId_priceReports_id"
	}),
	fuelType: one(fuelTypes, {
		fields: [priceReports.fuelTypeId],
		references: [fuelTypes.id]
	}),
	station: one(stations, {
		fields: [priceReports.stationId],
		references: [stations.id]
	}),
	profile: one(profiles, {
		fields: [priceReports.userId],
		references: [profiles.id]
	}),
}));

export const priceHistoryRelations = relations(priceHistory, ({one}) => ({
	fuelType: one(fuelTypes, {
		fields: [priceHistory.fuelTypeId],
		references: [fuelTypes.id]
	}),
	station: one(stations, {
		fields: [priceHistory.stationId],
		references: [stations.id]
	}),
}));

export const stationVotesRelations = relations(stationVotes, ({one}) => ({
	station: one(stations, {
		fields: [stationVotes.stationId],
		references: [stations.id]
	}),
	profile: one(profiles, {
		fields: [stationVotes.userId],
		references: [profiles.id]
	}),
}));

export const stationFuelsRelations = relations(stationFuels, ({one}) => ({
	fuelType: one(fuelTypes, {
		fields: [stationFuels.fuelTypeId],
		references: [fuelTypes.id]
	}),
	station: one(stations, {
		fields: [stationFuels.stationId],
		references: [stations.id]
	}),
}));