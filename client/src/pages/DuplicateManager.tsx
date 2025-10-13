import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: number;
  clientName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  createdAt: string;
  source?: string;
}

interface DuplicateGroup {
  [key: number]: Booking;
}

export default function DuplicateManager() {
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch duplicate groups
  const { data: duplicatesData, isLoading, refetch } = useQuery({
    queryKey: ['/api/bookings/duplicates'],
    queryFn: () => apiRequest('/api/bookings/duplicates')
  });

  // Remove duplicates mutation
  const removeMutation = useMutation({
    mutationFn: (bookingIds: number[]) => 
      apiRequest('/api/bookings/remove-duplicates', {
        method: 'POST',
        body: JSON.stringify({ bookingIds })
      }),
    onSuccess: (result) => {
      toast({
        title: 'Success',
        description: result.message || 'Duplicates removed successfully'
      });
      setSelectedForRemoval(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove duplicates',
        variant: 'destructive'
      });
    }
  });

  const handleToggleSelection = (bookingId: number) => {
    const newSelection = new Set(selectedForRemoval);
    if (newSelection.has(bookingId)) {
      newSelection.delete(bookingId);
    } else {
      newSelection.add(bookingId);
    }
    setSelectedForRemoval(newSelection);
  };

  const handleSelectAllDuplicates = () => {
    const allDuplicateIds = new Set<number>();
    
    duplicatesData?.duplicateGroups?.forEach((group: Booking[]) => {
      // Skip the first (original) booking, select the rest as duplicates
      group.slice(1).forEach((booking) => {
        allDuplicateIds.add(booking.id);
      });
    });
    
    setSelectedForRemoval(allDuplicateIds);
  };

  const handleRemoveSelected = () => {
    if (selectedForRemoval.size === 0) {
      toast({
        title: 'No bookings selected',
        description: 'Please select duplicates to remove',
        variant: 'destructive'
      });
      return;
    }

    removeMutation.mutate(Array.from(selectedForRemoval));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return 'All day';
    return timeStr;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Finding duplicates...</p>
          </div>
        </div>
      </div>
    );
  }

  const duplicateGroups = duplicatesData?.duplicateGroups || [];
  const totalDuplicates = duplicatesData?.totalDuplicates || 0;

  if (duplicateGroups.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Duplicates Found</h2>
            <p className="text-muted-foreground">Your booking system is clean!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Duplicate Manager</h1>
        <p className="text-muted-foreground">
          Found {duplicateGroups.length} groups with {totalDuplicates} duplicates to review
        </p>
      </div>

      <div className="mb-6 flex gap-4 flex-wrap">
        <Button 
          onClick={handleSelectAllDuplicates}
          variant="outline"
          disabled={removeMutation.isPending}
        >
          Select All Duplicates
        </Button>
        <Button 
          onClick={() => setSelectedForRemoval(new Set())}
          variant="outline"
          disabled={removeMutation.isPending}
        >
          Clear Selection
        </Button>
        <Button
          onClick={handleRemoveSelected}
          variant="destructive"
          disabled={selectedForRemoval.size === 0 || removeMutation.isPending}
          className="ml-auto"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove Selected ({selectedForRemoval.size})
        </Button>
      </div>

      <div className="space-y-6">
        {duplicateGroups.map((group: Booking[], groupIndex: number) => (
          <Card key={groupIndex} className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Duplicate Group #{groupIndex + 1}
              </CardTitle>
              <CardDescription>
                Event: {group[0].clientName} on {formatDate(group[0].eventDate)} at {formatTime(group[0].eventTime)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.map((booking: Booking, index: number) => {
                  const isOriginal = index === 0;
                  const isSelected = selectedForRemoval.has(booking.id);
                  
                  return (
                    <div
                      key={booking.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isOriginal 
                          ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                          : isSelected
                          ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {!isOriginal && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelection(booking.id)}
                          />
                        )}
                        <div>
                          <div className="font-medium">
                            {booking.clientName}
                            {isOriginal && <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Original</Badge>}
                            {booking.source === 'calendar_import' && <Badge className="ml-2" variant="outline">Imported</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created: {formatDate(booking.createdAt)}
                            {booking.venue && ` • ${booking.venue}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {booking.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}