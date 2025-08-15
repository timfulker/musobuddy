import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock, Info } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FieldLock {
  locked: boolean;
  lockedBy: 'user' | 'client';
}

interface FieldLockSettings {
  [fieldName: string]: FieldLock;
}

interface FieldLockManagerProps {
  bookingId: number;
  initialFieldLocks: FieldLockSettings;
  onFieldLocksUpdated?: (fieldLocks: FieldLockSettings) => void;
}

// Define all available collaborative fields with their display names and categories
const COLLABORATIVE_FIELDS = {
  technical: {
    label: "Technical Setup",
    fields: {
      venueContact: "Venue On-Day Contact",
      soundTechContact: "Sound Tech Contact", 
      stageSize: "Stage/Performance Area Size",
      powerEquipment: "Power & Equipment Availability",
      soundCheckTime: "Preferred Sound Check Time",
      loadInInfo: "Load-in Instructions"
    }
  },
  music: {
    label: "Music Preferences",
    fields: {
      styleMood: "Style/Mood Preference",
      setOrder: "Set Order Preferences",
      mustPlaySongs: "Must-Play Songs",
      avoidSongs: "Songs to Avoid",
      referenceTracks: "Reference Tracks/Examples"
    }
  },
  special: {
    label: "Special Moments",
    fields: {
      firstDanceSong: "First Dance Song",
      processionalSong: "Processional Music",
      signingRegisterSong: "Register Signing Music", 
      recessionalSong: "Recessional Music",
      specialDedications: "Special Dedications",
      guestAnnouncements: "Guest Announcements"
    }
  },
  logistics: {
    label: "Event Logistics",
    fields: {
      weatherContingency: "Weather Contingency Plan",
      dietaryRequirements: "Dietary Requirements",
      sharedNotes: "Additional Notes & Requests"
    }
  }
};

export default function FieldLockManager({ bookingId, initialFieldLocks, onFieldLocksUpdated }: FieldLockManagerProps) {
  const [fieldLocks, setFieldLocks] = useState<FieldLockSettings>(initialFieldLocks || {});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fieldLockMutation = useMutation({
    mutationFn: async (updatedLocks: FieldLockSettings) => {
      return apiRequest(`/api/collaborative-form/${bookingId}/locks`, {
        method: 'POST',
        body: JSON.stringify({ fieldLocks: updatedLocks }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, updatedLocks) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Field Locks Updated",
        description: "Field lock settings have been saved successfully.",
      });
      onFieldLocksUpdated?.(updatedLocks);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update field locks. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to update field locks:', error);
    }
  });

  const toggleFieldLock = (fieldName: string) => {
    const currentLock = fieldLocks[fieldName];
    const newLocks = {
      ...fieldLocks,
      [fieldName]: {
        locked: !currentLock?.locked,
        lockedBy: 'user' as const
      }
    };

    // Remove the field from locks if it's being unlocked
    if (currentLock?.locked) {
      delete newLocks[fieldName];
    }

    setFieldLocks(newLocks);
    fieldLockMutation.mutate(newLocks);
  };

  const getLockedCount = () => {
    return Object.values(fieldLocks).filter(lock => lock?.locked).length;
  };

  const getTotalFieldCount = () => {
    return Object.values(COLLABORATIVE_FIELDS).reduce((total, category) => 
      total + Object.keys(category.fields).length, 0
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <span>Field Lock Settings</span>
          </div>
          <Badge variant="secondary" className="text-sm">
            {getLockedCount()} / {getTotalFieldCount()} fields locked
          </Badge>
        </CardTitle>
        <div className="flex items-start space-x-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
          <p>
            Lock fields to prevent clients from editing them in the collaborative form. 
            Locked fields will appear read-only with a lock icon for clients.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(COLLABORATIVE_FIELDS).map(([categoryKey, category]) => (
          <div key={categoryKey}>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">
              {category.label}
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(category.fields).map(([fieldName, displayName]) => {
                const isLocked = fieldLocks[fieldName]?.locked || false;
                return (
                  <div 
                    key={fieldName}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {isLocked ? (
                        <Lock className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Unlock className="w-4 h-4 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{displayName}</p>
                        <p className="text-sm text-gray-500">
                          {isLocked ? 'Read-only for clients' : 'Editable by clients'}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={isLocked}
                      onCheckedChange={() => toggleFieldLock(fieldName)}
                      disabled={fieldLockMutation.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {fieldLockMutation.isPending && (
          <div className="flex items-center justify-center p-4 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
            Updating field locks...
          </div>
        )}
      </CardContent>
    </Card>
  );
}