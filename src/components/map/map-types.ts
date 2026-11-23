"use client";

export type MapPosition = [number, number];

export type MapStation = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
};
