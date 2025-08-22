import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import NewBooking from "./new-booking";

interface CollaborationPageProps {}

export default function BookingCollaborate({}: CollaborationPageProps) {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const bookingId = location.split('/')[2]; // Extract booking ID from URL
  const token = urlParams.get('token');

  // Verify collaboration token and get booking access
  const { data: collaborationData, isLoading, error } = useQuery({
    queryKey: ['/api/booking-collaboration/verify', bookingId, token],
    queryFn: async () => {
      if (!bookingId || !token) {
        throw new Error('Missing booking ID or token');
      }
      
      const response = await fetch(`/api/booking-collaboration/${bookingId}/verify?token=${token}`);
      if (!response.ok) {
        throw new Error('Invalid collaboration link');
      }
      return response.json();
    },
    enabled: !!(bookingId && token),
  });

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
      editBookingId={parseInt(bookingId)}
      clientInfo={collaborationData}
    />
  );
}