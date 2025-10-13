import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Calendar, Trash2, Edit3, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface BlockedDate {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

interface BlockedDatesManagerProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PRESET_COLORS = [
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Yellow', value: '#ca8a04' },
  { name: 'Lime', value: '#65a30d' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Cyan', value: '#0891b2' },
  { name: 'Sky', value: '#0284c7' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Fuchsia', value: '#c026d3' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Rose', value: '#e11d48' }
];

export function BlockedDatesManager({ trigger, open, onOpenChange }: BlockedDatesManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<BlockedDate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    color: '#dc2626'
  });

  const queryClient = useQueryClient();

  // Use external open state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : dialogOpen;
  const setIsOpen = onOpenChange || setDialogOpen;

  // Fetch blocked dates
  const { data: blockedDates = [], isLoading } = useQuery({
    queryKey: ['/api/blocked-dates'],
    retry: 2,
  }) as { data: BlockedDate[], isLoading: boolean };

  // Create blocked date mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('/api/blocked-dates', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blocked-dates'] });
      toast({
        title: 'Success',
        description: 'Blocked date created successfully'
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create blocked date',
        variant: 'destructive'
      });
    }
  });

  // Update blocked date mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => 
      apiRequest(`/api/blocked-dates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blocked-dates'] });
      toast({
        title: 'Success',
        description: 'Blocked date updated successfully'
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update blocked date',
        variant: 'destructive'
      });
    }
  });

  // Delete blocked date mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => 
      apiRequest(`/api/blocked-dates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blocked-dates'] });
      toast({
        title: 'Success',
        description: 'Blocked date deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete blocked date',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      color: '#dc2626'
    });
    setEditingDate(null);
    setShowForm(false);
  };

  const handleEdit = (blockedDate: BlockedDate) => {
    setEditingDate(blockedDate);
    setFormData({
      title: blockedDate.title,
      description: blockedDate.description || '',
      startDate: blockedDate.startDate,
      endDate: blockedDate.endDate,
      color: blockedDate.color
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.startDate || !formData.endDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast({
        title: 'Error',
        description: 'End date must be after start date',
        variant: 'destructive'
      });
      return;
    }

    if (editingDate) {
      updateMutation.mutate({ id: editingDate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (startDate === endDate) {
      return format(start, 'MMM d, yyyy');
    }
    
    if (start.getFullYear() === end.getFullYear()) {
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  };

  const DialogComponent = trigger ? Dialog : React.Fragment;
  const dialogProps = trigger ? { open: isOpen, onOpenChange: setIsOpen } : {};

  const content = (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Manage Blocked Dates
        </DialogTitle>
      </DialogHeader>
      
      <div className="flex-1 overflow-hidden flex gap-6">
        {/* Left side - List of blocked dates */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Blocked Dates</h3>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : blockedDates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No blocked dates yet. Add some to prevent bookings on specific days.
              </div>
            ) : (
              blockedDates.map((blockedDate) => (
                <Card key={blockedDate.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: blockedDate.color }}
                        />
                        <div>
                          <CardTitle className="text-base">{blockedDate.title}</CardTitle>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {formatDateRange(blockedDate.startDate, blockedDate.endDate)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(blockedDate)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(blockedDate.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {blockedDate.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{blockedDate.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
        
        {/* Right side - Form */}
        {showForm && (
          <div className="w-96 border-l pl-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingDate ? 'Edit Blocked Date' : 'Add Blocked Date'}
              </h3>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Christmas Holiday, Vacation"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Color</Label>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform ${
                        formData.color === color.value ? 'border-ring scale-110' : 'border-muted'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingDate
                    ? 'Update Date'
                    : 'Add Date'
                  }
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        {content}
      </Dialog>
    );
  }

  // For controlled usage without trigger
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {content}
    </Dialog>
  );
}