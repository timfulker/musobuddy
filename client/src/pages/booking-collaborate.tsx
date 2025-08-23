import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import NewBooking from "./new-booking";

interface CollaborationPageProps {}

export default function BookingCollaborate({}: CollaborationPageProps) {
  // Use useParams to get the bookingId from the route
  const { bookingId } = useParams();
  const [location] = useLocation();
  
  // Extract query parameters for the token
  const queryString = location.includes('?') ? location.split('?')[1] : '';
  const urlParams = new URLSearchParams(queryString);
  const token = urlParams.get('token');

  // Comprehensive debug logging
  console.log('[COLLABORATION DEBUG] Component rendered');
  console.log('[COLLABORATION DEBUG] Location:', location);
  console.log('[COLLABORATION DEBUG] Booking ID from params:', bookingId);
  console.log('[COLLABORATION DEBUG] Token from query:', token);
  console.log('[COLLABORATION DEBUG] Query will be enabled:', !!(bookingId && token));

  // Verify collaboration token and get booking access
  const { data: collaborationData, isLoading, error } = useQuery({
    queryKey: ['/api/booking-collaboration/verify', bookingId, token],
    queryFn: async () => {
      console.log('[COLLABORATION DEBUG] queryFn executing...');
      console.log('[COLLABORATION DEBUG] BookingId:', bookingId, 'Token:', token);
      
      if (!bookingId || !token) {
        console.log('[COLLABORATION DEBUG] Missing data - bookingId:', bookingId, 'token:', token);
        throw new Error('Missing booking ID or token');
      }
      
      const url = `/api/booking-collaboration/${bookingId}/verify?token=${token}`;
      console.log('[COLLABORATION DEBUG] Fetching:', url);
      
      try {
        const response = await fetch(url);
        console.log('[COLLABORATION DEBUG] Response status:', response.status);
        console.log('[COLLABORATION DEBUG] Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('[COLLABORATION DEBUG] Error response:', errorText);
          throw new Error('Invalid collaboration link');
        }
        
        const data = await response.json();
        console.log('[COLLABORATION DEBUG] Success! Data:', data);
        return data;
      } catch (err) {
        console.error('[COLLABORATION DEBUG] Fetch error:', err);
        throw err;
      }
    },
    enabled: !!(bookingId && token),
    retry: false, // Disable retry for clearer debugging
  });

  console.log('[COLLABORATION DEBUG] Query state - isLoading:', isLoading, 'error:', error, 'data:', collaborationData);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying collaboration access...</p>
        </div>
      </div>
    );
  }

  if (error || !collaborationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-slate-600 mb-4">
            This collaboration link is invalid or has expired. Please contact your musician for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Render the booking form in client mode
  return (
    <NewBooking 
      clientMode={true}
      collaborationToken={token}
      editBookingId={bookingId ? parseInt(bookingId) : undefined}
      clientInfo={collaborationData}
    />
  );
}