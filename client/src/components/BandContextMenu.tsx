import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Users, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Band } from '@shared/schema';

interface BandContextMenuProps {
  bookingId: number;
  currentBandId?: number | null;
  position: { x: number; y: number };
  onClose: () => void;
  isVisible: boolean;
}

export function BandContextMenu({
  bookingId,
  currentBandId,
  position,
  onClose,
  isVisible
}: BandContextMenuProps) {
  const { toast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch user's bands
  const { data: bands = [] } = useQuery<Band[]>({
    queryKey: ['/api/bands'],
  });

  // Mutation to assign band to booking
  const assignBandMutation = useMutation({
    mutationFn: async (bandId: number | null) => {
      const response = await apiRequest(`/api/bookings/${bookingId}/band`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: 'Band Updated',
        description: 'The booking has been assigned to the selected band.',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign band',
        variant: 'destructive'
      });
    }
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = React.useMemo(() => {
    if (!isVisible || !menuRef.current) return position;

    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }

    // Adjust vertical position
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10;
    }

    return { x: Math.max(10, x), y: Math.max(10, y) };
  }, [position, isVisible]);

  if (!isVisible) return null;

  const handleBandSelect = (bandId: number | null) => {
    assignBandMutation.mutate(bandId);
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48 z-50"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Users className="w-4 h-4" />
          Assign to Band
        </div>
      </div>

      <div className="py-1">
        {/* No band option */}
        <button
          onClick={() => handleBandSelect(null)}
          disabled={assignBandMutation.isPending}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
        >
          <span className="text-gray-600">No Band</span>
          {currentBandId === null && (
            <Check className="w-4 h-4 text-green-600" />
          )}
        </button>

        {/* Band options */}
        {bands.map((band) => (
          <button
            key={band.id}
            onClick={() => handleBandSelect(band.id)}
            disabled={assignBandMutation.isPending}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: band.color }}
              />
              <span>{band.name}</span>
              {band.isDefault && (
                <span className="text-xs text-gray-500">(Default)</span>
              )}
            </div>
            {currentBandId === band.id && (
              <Check className="w-4 h-4 text-green-600" />
            )}
          </button>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-1">
        <button
          onClick={onClose}
          className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}