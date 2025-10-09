import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Band } from '@shared/schema';

interface BandFormData {
  name: string;
  color: string;
  isDefault?: boolean;
}

export function BandManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<Band | null>(null);
  const [formData, setFormData] = useState<BandFormData>({
    name: '',
    color: '#9333ea'
  });

  // Fetch bands
  const { data: bands = [], isLoading } = useQuery({
    queryKey: ['/api/bands'],
    queryFn: async () => {
      const response = await apiRequest('/api/bands');
      return response.json();
    }
  });

  // Create band mutation
  const createMutation = useMutation({
    mutationFn: async (data: BandFormData) => {
      const response = await apiRequest('/api/bands', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bands'] });
      toast({
        title: 'Band Created',
        description: 'Your new band has been created successfully.'
      });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create band',
        variant: 'destructive'
      });
    }
  });

  // Update band mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BandFormData> }) => {
      const response = await apiRequest(`/api/bands/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bands'] });
      toast({
        title: 'Band Updated',
        description: 'The band has been updated successfully.'
      });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update band',
        variant: 'destructive'
      });
    }
  });

  // Delete band mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/bands/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bands'] });
      toast({
        title: 'Band Deleted',
        description: 'The band has been deleted successfully.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete band',
        variant: 'destructive'
      });
    }
  });

  // Set default band mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/bands/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDefault: true }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bands'] });
      toast({
        title: 'Default Band Set',
        description: 'The default band has been updated.'
      });
    }
  });

  const openDialog = (band?: Band) => {
    if (band) {
      setEditingBand(band);
      setFormData({
        name: band.name,
        color: band.color,
        isDefault: band.isDefault
      });
    } else {
      setEditingBand(null);
      setFormData({
        name: '',
        color: '#9333ea'
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingBand(null);
    setFormData({
      name: '',
      color: '#9333ea'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBand) {
      updateMutation.mutate({ id: editingBand.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Predefined colors for quick selection
  const presetColors = [
    '#9333ea', // Purple (default)
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#6b7280', // Gray
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading bands...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bands & Projects</CardTitle>
              <CardDescription>
                Organize your bookings by band or project with custom colors
              </CardDescription>
            </div>
            <Button onClick={() => openDialog()} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Band
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bands.map((band: Band) => (
              <div
                key={band.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                {/* Drag handle (for future drag-and-drop) */}
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />

                {/* Color indicator */}
                <div
                  className="w-8 h-8 rounded-md border-2 border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: band.color }}
                />

                {/* Band name */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{band.name}</span>
                    {band.isDefault && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!band.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate(band.id)}
                      disabled={setDefaultMutation.isPending}
                      title="Set as default"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(band)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  {!band.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${band.name}"?`)) {
                          deleteMutation.mutate(band.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {bands.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No bands created yet. Click "Add Band" to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Band Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBand ? 'Edit Band' : 'Add New Band'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Band Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Solo, Jazz Trio, Rock Band"
                required
              />
            </div>

            <div>
              <Label htmlFor="color">Color</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    placeholder="#9333ea"
                    className="flex-1"
                  />
                </div>

                {/* Color presets */}
                <div className="flex gap-2 flex-wrap">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded-md border-2 border-white shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingBand ? 'Update' : 'Create'} Band
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}