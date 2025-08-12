import { Client } from "@googlemaps/google-maps-services-js";
import { LRUCache } from "lru-cache";
import type { Request, Response } from "express";
import { z } from "zod";

const client = new Client({});
const cache = new LRUCache<string, any>({ max: 2000, ttl: 1000 * 60 * 60 * 24 * 30 }); // 30 days

const Body = z.object({ address: z.string().min(3) });

export async function geocode(req: Request, res: Response) {
  try {
    const parse = Body.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "invalid_body", details: parse.error.issues });
    }

    const address = parse.data.address.trim();
    const key = `gc:${address.toLowerCase()}`;
    const hit = cache.get(key);
    if (hit) {
      console.log(`🗺️ Geocode cache hit for: ${address}`);
      return res.json(hit);
    }

    if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
      return res.status(500).json({ error: "google_maps_not_configured" });
    }

    console.log(`🗺️ Geocoding address: ${address}`);
    
    const { data } = await client.geocode({
      params: { address, key: process.env.GOOGLE_MAPS_SERVER_KEY },
      timeout: 5000,
    });

    const best = data.results?.[0];
    if (!best) {
      return res.status(404).json({ error: "no_results", query: address });
    }

    const payload = {
      formattedAddress: best.formatted_address,
      lat: best.geometry.location.lat,
      lng: best.geometry.location.lng,
      placeId: best.place_id,
    };

    cache.set(key, payload);
    console.log(`✅ Geocoded: ${address} → ${payload.formattedAddress}`);
    
    res.json(payload);
  } catch (error) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: "geocoding_failed", details: error instanceof Error ? error.message : "Unknown error" });
  }
}