import { Client, TrafficModel } from "@googlemaps/google-maps-services-js";
import { LRUCache } from "lru-cache";
import type { Request, Response } from "express";
import { z } from "zod";

const client = new Client({});
const cache = new LRUCache<string, any>({ max: 2000, ttl: 1000 * 60 * 10 }); // 10 minutes

const Body = z.object({
  origin: z.union([z.string(), z.object({ lat: z.number(), lng: z.number() })]),
  destination: z.union([z.string(), z.object({ lat: z.number(), lng: z.number() })]),
  departureTimeIso: z.string().datetime().optional(), // ISO, e.g., "2025-08-12T16:00:00Z"
});

export async function travelTime(req: Request, res: Response) {
  try {
    const parse = Body.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "invalid_body", details: parse.error.issues });
    }

    const { origin, destination, departureTimeIso } = parse.data;
    const key = `dm:${JSON.stringify({ origin, destination, departureTimeIso })}`;
    const hit = cache.get(key);
    if (hit) {
      console.log(`🚗 Travel time cache hit for: ${JSON.stringify({ origin, destination })}`);
      return res.json(hit);
    }

    if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
      return res.status(500).json({ error: "google_maps_not_configured" });
    }

    const departure_time = departureTimeIso ? Math.floor(new Date(departureTimeIso).getTime() / 1000) : "now";
    
    console.log(`🚗 Calculating travel time: ${JSON.stringify({ origin, destination, departure_time })}`);

    const { data } = await client.distancematrix({
      params: {
        key: process.env.GOOGLE_MAPS_SERVER_KEY,
        origins: [origin],
        destinations: [destination],
        mode: "driving",
        departure_time,
        traffic_model: TrafficModel.best_guess,
      },
      timeout: 8000,
    });

    const el = data.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") {
      console.error(`❌ Distance Matrix failed: ${el?.status}`, { origin, destination });
      return res.status(502).json({ error: "distance_matrix_failed", status: el?.status });
    }

    const result = {
      distanceText: el.distance?.text,
      distanceMeters: el.distance?.value,
      durationText: el.duration?.text,
      durationSec: el.duration?.value,
      durationInTrafficText: el.duration_in_traffic?.text,
      durationInTrafficSec: el.duration_in_traffic?.value,
    };

    cache.set(key, result);
    console.log(`✅ Travel time calculated: ${result.durationInTrafficText || result.durationText}`);
    
    res.json(result);
  } catch (error) {
    console.error("Travel time calculation error:", error);
    res.status(500).json({ error: "travel_time_failed", details: error instanceof Error ? error.message : "Unknown error" });
  }
}