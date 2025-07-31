// Distance-based pricing calculator using Google Maps API
import fetch from 'node-fetch';

interface DistanceResult {
  distance: number; // in miles
  duration: number; // in minutes
  travelCost: number; // calculated travel surcharge
}

interface PricingTiers {
  local: { maxMiles: number; cost: number };
  regional: { maxMiles: number; cost: number };
  distant: { maxMiles: number; cost: number };
  remote: { cost: number }; // per mile over distant threshold
}

export class DistancePricingCalculator {
  private apiKey: string;
  private baseLocation: string;
  
  // Standard travel pricing tiers
  private pricingTiers: PricingTiers = {
    local: { maxMiles: 20, cost: 0 },      // No charge within 20 miles
    regional: { maxMiles: 50, cost: 50 },   // £50 for 21-50 miles
    distant: { maxMiles: 100, cost: 100 },  // £100 for 51-100 miles
    remote: { cost: 2 }                     // £2 per mile over 100 miles
  };

  constructor(apiKey?: string, baseLocation?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY || '';
    this.baseLocation = baseLocation || 'Bournemouth, UK'; // Default base location
    
    if (!this.apiKey) {
      console.warn('⚠️ Google Maps API key not configured - distance pricing disabled');
    }
  }

  async calculateDistance(destinationAddress: string): Promise<DistanceResult | null> {
    if (!this.apiKey) {
      console.warn('⚠️ Cannot calculate distance - Google Maps API key missing');
      return null;
    }

    try {
      console.log(`🗺️ Calculating distance from ${this.baseLocation} to ${destinationAddress}`);
      
      const encodedOrigin = encodeURIComponent(this.baseLocation);
      const encodedDestination = encodeURIComponent(destinationAddress);
      
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodedOrigin}&destinations=${encodedDestination}&units=imperial&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json() as any;
      
      if (data.status !== 'OK') {
        console.error('❌ Google Maps API error:', data.status, data.error_message);
        return null;
      }
      
      const element = data.rows[0]?.elements[0];
      if (!element || element.status !== 'OK') {
        console.error('❌ Distance calculation failed:', element?.status);
        return null;
      }
      
      const distanceText = element.distance.text;
      const durationText = element.duration.text;
      const distanceValue = element.distance.value; // in meters
      const durationValue = element.duration.value; // in seconds
      
      // Convert to miles and minutes
      const distanceMiles = Math.round((distanceValue * 0.000621371) * 10) / 10; // Round to 1 decimal
      const durationMinutes = Math.round(durationValue / 60);
      
      const travelCost = this.calculateTravelCost(distanceMiles);
      
      console.log(`✅ Distance calculated: ${distanceMiles} miles (${distanceText}), ${durationMinutes} minutes (${durationText}), travel cost: £${travelCost}`);
      
      return {
        distance: distanceMiles,
        duration: durationMinutes,
        travelCost: travelCost
      };
      
    } catch (error: any) {
      console.error('❌ Distance calculation error:', error.message);
      return null;
    }
  }

  private calculateTravelCost(miles: number): number {
    if (miles <= this.pricingTiers.local.maxMiles) {
      return this.pricingTiers.local.cost; // Free for local gigs
    } else if (miles <= this.pricingTiers.regional.maxMiles) {
      return this.pricingTiers.regional.cost; // £50 for regional
    } else if (miles <= this.pricingTiers.distant.maxMiles) {
      return this.pricingTiers.distant.cost; // £100 for distant
    } else {
      // Remote: base distant cost + per-mile charge
      const extraMiles = miles - this.pricingTiers.distant.maxMiles;
      return this.pricingTiers.distant.cost + (extraMiles * this.pricingTiers.remote.cost);
    }
  }

  getTravelCostBreakdown(miles: number): string {
    const cost = this.calculateTravelCost(miles);
    
    if (miles <= this.pricingTiers.local.maxMiles) {
      return `${miles} miles - Local area (no travel charge)`;
    } else if (miles <= this.pricingTiers.regional.maxMiles) {
      return `${miles} miles - Regional travel surcharge: £${cost}`;
    } else if (miles <= this.pricingTiers.distant.maxMiles) {
      return `${miles} miles - Distant travel surcharge: £${cost}`;
    } else {
      const extraMiles = miles - this.pricingTiers.distant.maxMiles;
      return `${miles} miles - Remote location: £${this.pricingTiers.distant.cost} base + £${extraMiles * this.pricingTiers.remote.cost} (${extraMiles} extra miles) = £${cost}`;
    }
  }

  // Update pricing tiers (for user customization)
  updatePricingTiers(newTiers: Partial<PricingTiers>) {
    this.pricingTiers = { ...this.pricingTiers, ...newTiers };
  }

  // Get current pricing tier structure for display
  getPricingTiers(): PricingTiers {
    return { ...this.pricingTiers };
  }
}

// Export singleton instance
export const distancePricing = new DistancePricingCalculator();