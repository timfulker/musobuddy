import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FieldLock {
  locked: boolean;
  lockedBy: 'user' | 'client';
}

interface IndividualFieldLockProps {
  bookingId: number;
  fieldName: string;
  initialLock?: FieldLock;
  onLockChanged?: (fieldName: string, lock: FieldLock) => void;
}

export default function IndividualFieldLock({ 
  bookingId, 
  fieldName, 
  initialLock, 
  onLockChanged 
}: IndividualFieldLockProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLocked, setIsLocked] = useState(initialLock?.locked || false);

  useEffect(() => {
    setIsLocked(initialLock?.locked || false);
  }, [initialLock]);

  const updateFieldLockMutation = useMutation({
    mutationFn: async ({ fieldName, locked }: { fieldName: string; locked: boolean }) => {
      const fieldLocks = {
        [fieldName]: {
          locked,
          lockedBy: 'user' as const
        }
      };

      return apiRequest(`/api/bookings/${bookingId}/field-locks`, {
        method: 'PATCH',
        body: JSON.stringify({ fieldLocks }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      toast({
        title: isLocked ? "Field Unlocked" : "Field Locked",
        description: `${fieldName} has been ${isLocked ? 'unlocked' : 'locked'} for client editing`,
      });
    },
    onError: () => {
      // Revert the optimistic update
      setIsLocked(!isLocked);
      toast({
        title: "Error",
        description: "Failed to update field lock",
        variant: "destructive",
      });
    },
  });

  const toggleLock = () => {
    const newLockedState = !isLocked;
    
    // Optimistic update
    setIsLocked(newLockedState);
    
    // Call the mutation
    updateFieldLockMutation.mutate({
      fieldName,
      locked: newLockedState
    });

    // Notify parent if provided
    if (onLockChanged) {
      onLockChanged(fieldName, {
        locked: newLockedState,
        lockedBy: 'user'
      });
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleLock}
      disabled={updateFieldLockMutation.isPending}
      className={`ml-2 h-6 w-6 p-0 ${
        isLocked 
          ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
      }`}
      title={isLocked ? 'Click to unlock for client editing' : 'Click to lock from client editing'}
    >
      {isLocked ? (
        <Lock className="h-3 w-3" />
      ) : (
        <Unlock className="h-3 w-3" />
      )}
    </Button>
  );
}