"use client";

// Loads the static weather file for a city (same origin, /public/data) and caches it.
// This is the only network request the app makes.

import { useCallback, useEffect, useState } from "react";
import { cityById, validateWeather, type WeatherSeason } from "@/lib/sim";

const cache = new Map<string, Promise<WeatherSeason>>();

export function loadWeather(cityId: string): Promise<WeatherSeason> {
  const cached = cache.get(cityId);
  if (cached) return cached;
  const city = cityById(cityId);
  const request = fetch(city.weatherPath)
    .then((response) => {
      if (!response.ok) throw new Error(`The weather file could not be loaded (status ${response.status}).`);
      return response.json() as Promise<WeatherSeason>;
    })
    .then((weather) => {
      validateWeather(weather);
      return weather;
    });
  // A failed load is not cached, so "Try again" really tries again.
  request.catch(() => {
    if (cache.get(cityId) === request) cache.delete(cityId);
  });
  cache.set(cityId, request);
  return request;
}

interface Entry {
  weather?: WeatherSeason;
  failed?: boolean;
}

export interface WeatherState {
  status: "loading" | "ready" | "error";
  weather: WeatherSeason | null;
  retry: () => void;
}

export function useWeather(cityId: string): WeatherState {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    loadWeather(cityId).then(
      (weather) => {
        if (live) setEntries((prev) => ({ ...prev, [cityId]: { weather } }));
      },
      () => {
        if (live) setEntries((prev) => ({ ...prev, [cityId]: { failed: true } }));
      }
    );
    return () => {
      live = false;
    };
  }, [cityId, attempt]);

  const retry = useCallback(() => {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[cityId];
      return next;
    });
    setAttempt((n) => n + 1);
  }, [cityId]);

  const entry = entries[cityId];
  if (entry?.weather) return { status: "ready", weather: entry.weather, retry };
  if (entry?.failed) return { status: "error", weather: null, retry };
  return { status: "loading", weather: null, retry };
}
