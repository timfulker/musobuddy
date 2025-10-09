import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CalendarX, Palette } from "lucide-react";

interface MarkUnavailableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

interface UnavailableDateForm {
  startDate: string;
  endDate: string;
  title: string;
  description?: string;
  color: string;
}

const colorOptions = [
  { value: "#ef4444", label: "Red", color: "bg-red-500" },
  { value: "#f97316", label: "Orange", color: "bg-orange-500" },
  { value: "#eab308", label: "Yellow", color: "bg-yellow-500" },
  { value: "#22c55e", label: "Green", color: "bg-green-500" },
  { value: "#3b82f6", label: "Blue", color: "bg-blue-500" },
  { value: "#8b5cf6", label: "Purple", color: "bg-purple-500" },
  { value: "#ec4899", label: "Pink", color: "bg-pink-500" },
  { value: "#6b7280", label: "Gray", color: "bg-gray-500" },
];

export default function MarkUnavailableDialog({
  isOpen,
  onClose,
  initialDate
}: MarkUnavailableDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UnavailableDateForm>({
    defaultValues: {
      startDate: initialDate || "",
      endDate: initialDate || "",
      title: "",
      description: "",
      color: "#ef4444" // Red default
    }
  });

  const createUnavailableDateMutation = useMutation({
    mutationFn: async (data: UnavailableDateForm) => {
      // Convert date strings to proper Date objects with timezone handling
      const startDate = new Date(data.startDate + 'T00:00:00');
      const endDate = new Date(data.endDate + 'T23:59:59');

      const payload = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        title: data.title,
        description: data.description || null,
        color: data.color
      };

      console.log('📤 Sending to API:', payload);

      const response = await apiRequest('/api/blocked-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: error,
          payload: payload
        });
        throw new Error(error.message || `HTTP ${response.status}: Failed to create unavailable date`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unavailable date has been added to your calendar.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/blocked-dates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create unavailable date",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UnavailableDateForm) => {
    // Validate that end date is not before start date
    if (new Date(data.endDate) < new Date(data.startDate)) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after or equal to start date",
        variant: "destructive",
      });
      return;
    }

    // Additional client-side validation
    if (!data.startDate || !data.endDate || !data.title) {
      toast({
        title: "Missing Required Fields",
        description: "Start date, end date, and title are required",
        variant: "destructive",
      });
      return;
    }

    if (data.title.length > 100) {
      toast({
        title: "Title Too Long",
        description: "Title must be 100 characters or less",
        variant: "destructive",
      });
      return;
    }

    if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      toast({
        title: "Invalid Color",
        description: "Color must be a valid hex color",
        variant: "destructive",
      });
      return;
    }

    console.log('📋 Client-side validation passed:', {
      startDate: data.startDate,
      endDate: data.endDate,
      title: data.title,
      titleLength: data.title.length,
      description: data.description,
      color: data.color,
    });

    createUnavailableDateMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX className="h-5 w-5" />
            Mark Dates Unavailable
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate", { required: "Start date is required" })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate", { required: "End date is required" })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Holiday, Personal Time, Unavailable"
              {...form.register("title", { required: "Title is required" })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional notes about this unavailable period..."
              rows={2}
              {...form.register("description")}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Palette className="h-4 w-4" />
              Calendar Color
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((color) => (
                <label
                  key={color.value}
                  className="flex items-center justify-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    value={color.value}
                    {...form.register("color")}
                    className="sr-only"
                  />
                  <div
                    className={`w-6 h-6 rounded-full ${color.color} ${
                      form.watch("color") === color.value
                        ? "ring-2 ring-offset-2 ring-gray-400"
                        : ""
                    }`}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createUnavailableDateMutation.isPending}
            >
              {createUnavailableDateMutation.isPending
                ? "Creating..."
                : "Mark Unavailable"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}