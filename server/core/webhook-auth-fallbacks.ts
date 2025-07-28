// CRITICAL FALLBACKS: Authentication-independent user lookup for webhooks
import { storage } from "./storage";

/**
 * Email webhook fallback - find user by email prefix without session
 */
export async function getUserByEmailPrefix(emailPrefix: string) {
  try {
    const user = await storage.getUserByEmailPrefix(emailPrefix);
    console.log(`📧 FALLBACK: Found user for prefix "${emailPrefix}":`, !!user);
    return user;
  } catch (error) {
    console.error(`❌ FALLBACK: Email prefix lookup failed for "${emailPrefix}":`, error);
    return null;
  }
}

/**
 * Stripe webhook fallback - find user by Stripe customer ID without session
 */
export async function getUserByStripeCustomerId(customerId: string) {
  try {
    const user = await storage.getUserByStripeCustomerId(customerId);
    console.log(`💳 FALLBACK: Found user for Stripe customer "${customerId}":`, !!user);
    return user;
  } catch (error) {
    console.error(`❌ FALLBACK: Stripe customer lookup failed for "${customerId}":`, error);
    return null;
  }
}

/**
 * Admin emergency fallback - get admin user without session
 */
export async function getAdminUser() {
  try {
    const adminUser = await storage.getUserByEmail('timfulker@gmail.com');
    console.log(`🚨 FALLBACK: Admin user lookup:`, !!adminUser);
    return adminUser;
  } catch (error) {
    console.error(`❌ FALLBACK: Admin lookup failed:`, error);
    return null;
  }
}

/**
 * Database operation fallback - get bookings for specific user ID
 */
export async function getBookingsForUser(userId: string) {
  try {
    const bookings = await storage.getBookings(userId);
    console.log(`📋 FALLBACK: Retrieved ${bookings.length} bookings for user ${userId}`);
    return bookings;
  } catch (error) {
    console.error(`❌ FALLBACK: Bookings retrieval failed for user ${userId}:`, error);
    return [];
  }
}