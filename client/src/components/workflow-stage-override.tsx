import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings } from "lucide-react";
import { WORKFLOW_STAGES, getStageDefinition, type WorkflowStage } from "../../../shared/workflow-stages";

interface WorkflowStageOverrideProps {
  booking: any;
  onStageUpdate?: (newStage: WorkflowStage) => void;
}

export default function WorkflowStageOverride({ booking, onStageUpdate }: WorkflowStageOverrideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<WorkflowStage>(
    booking.workflowStage || 'initial'
  );

  const updateStageMutation = useMutation({
    mutationFn: async (newStage: WorkflowStage) => {
      return apiRequest(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ workflowStage: newStage }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, newStage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      onStageUpdate?.(newStage);
      setIsOpen(false);
      toast({
        title: "Workflow Stage Updated",
        description: `Booking moved to ${getStageDefinition(newStage)?.label} stage`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: "Failed to update workflow stage",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (selectedStage !== booking.workflowStage) {
      updateStageMutation.mutate(selectedStage);
    } else {
      setIsOpen(false);
    }
  };

  const currentStage = getStageDefinition(booking.workflowStage || 'initial');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs h-6 px-2 text-gray-500 hover:text-gray-700"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          <Settings className="w-3 h-3 mr-1" />
          Override
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Override Workflow Stage</DialogTitle>
          <DialogDescription>
            Manually set the workflow stage for this booking. This will override automatic stage detection.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Current Stage</Label>
            <div className="mt-1">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                {currentStage?.icon} {currentStage?.label}
              </Badge>
              <p className="text-xs text-gray-600 mt-1">{currentStage?.description}</p>
            </div>
          </div>
          
          <div>
            <Label htmlFor="stage-select" className="text-sm font-medium">
              New Stage
            </Label>
            <Select value={selectedStage} onValueChange={(value: WorkflowStage) => setSelectedStage(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select workflow stage" />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_STAGES.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <span>{stage.icon}</span>
                      <span>{stage.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStage && (
              <p className="text-xs text-gray-600 mt-1">
                {getStageDefinition(selectedStage)?.description}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateStageMutation.isPending}
          >
            {updateStageMutation.isPending ? 'Updating...' : 'Update Stage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}