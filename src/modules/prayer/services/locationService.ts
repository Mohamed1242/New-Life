import { Platform } from "react-native";
import * as Location from "expo-location";
import type { CityPreset } from "../types/prayer.types";
import { detectDeviceTimezone } from "./prayerCalculator";

export const CITY_PRESETS: CityPreset[] = [
  {
    id: "cairo",
    name: "Cairo",
    country: "Egypt",
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: "Africa/Cairo",
    recommendedMethod: "Egyptian",
  },
  {
    id: "alexandria",
    name: "Alexandria",
    country: "Egypt",
    latitude: 31.2001,
    longitude: 29.9187,
    timezone: "Africa/Cairo",
    recommendedMethod: "Egyptian",
  },
  {
    id: "giza",
    name: "Giza",
    country: "Egypt",
    latitude: 30.0131,
    longitude: 31.2089,
    timezone: "Africa/Cairo",
    recommendedMethod: "Egyptian",
  },
  {
    id: "makkah",
    name: "Makkah",
    country: "Saudi Arabia",
    latitude: 21.4225,
    longitude: 39.8262,
    timezone: "Asia/Riyadh",
    recommendedMethod: "UmmAlQura",
  },
  {
    id: "madinah",
    name: "Madinah",
    country: "Saudi Arabia",
    latitude: 24.4672,
    longitude: 39.6112,
    timezone: "Asia/Riyadh",
    recommendedMethod: "UmmAlQura",
  },
  {
    id: "riyadh",
    name: "Riyadh",
    country: "Saudi Arabia",
    latitude: 24.7136,
    longitude: 46.6753,
    timezone: "Asia/Riyadh",
    recommendedMethod: "UmmAlQura",
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: "Asia/Dubai",
    recommendedMethod: "Dubai",
  },
  {
    id: "doha",
    name: "Doha",
    country: "Qatar",
    latitude: 25.2854,
    longitude: 51.531,
    timezone: "Asia/Qatar",
    recommendedMethod: "Qatar",
  },
  {
    id: "amman",
    name: "Amman",
    country: "Jordan",
    latitude: 31.9454,
    longitude: 35.9284,
    timezone: "Asia/Amman",
    recommendedMethod: "Egyptian",
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    latitude: 41.0082,
    longitude: 28.9784,
    timezone: "Europe/Istanbul",
    recommendedMethod: "Turkey",
  },
  {
    id: "london",
    name: "London",
    country: "UK",
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: "Europe/London",
    recommendedMethod: "MuslimWorldLeague",
  },
  {
    id: "new_york",
    name: "New York",
    country: "USA",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
    recommendedMethod: "NorthAmerica",
  },
];

export interface DetectedLocationResult {
  latitude: number;
  longitude: number;
  cityName: string;
  timezone: string;
}

export const locationService = {
  async detectCurrentLocation(): Promise<DetectedLocationResult> {
    if (Platform.OS === "web") {
      return await new Promise<DetectedLocationResult>((resolve, reject) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          reject(new Error("Geolocation is not supported in this browser."));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: Number(pos.coords.latitude.toFixed(4)),
              longitude: Number(pos.coords.longitude.toFixed(4)),
              cityName: `GPS (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`,
              timezone: detectDeviceTimezone(),
            });
          },
          (err) => reject(new Error(err.message || "Location access denied.")),
          { enableHighAccuracy: false, timeout: 10000 },
        );
      });
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      throw new Error(
        "Location permission denied. Select a city manually instead.",
      );
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;

    let cityName = `GPS (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
    try {
      const places = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (places.length > 0) {
        const first = places[0];
        const parts = [first.city || first.subregion || first.region, first.country].filter(
          Boolean,
        );
        if (parts.length > 0) {
          cityName = parts.join(", ");
        }
      }
    } catch {
      // Reverse geocoding requires network; coordinates still work completely offline
    }

    return {
      latitude: Number(latitude.toFixed(4)),
      longitude: Number(longitude.toFixed(4)),
      cityName,
      timezone: detectDeviceTimezone(),
    };
  },
};
