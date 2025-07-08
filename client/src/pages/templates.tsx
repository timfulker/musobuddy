import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit3, Trash2, MessageSquare, Mail, Phone, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  emailBody: string;
  smsBody: string;
  isDefault: boolean;
  isAutoRespond: boolean;
  createdAt: string;
}

export default function Templates() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    emailBody: '',
    smsBody: '',
    isAutoRespond: false
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['/api/templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/templates');
      console.log('Templates API response:', response);
      console.log('Templates is array:', Array.isArray(response));
      console.log('Templates length:', response?.length);
      return Array.isArray(response) ? response : [];
    },
    staleTime: 0, // Always refetch
    cacheTime: 0  // Don't cache
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest('POST', '/api/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', subject: '', emailBody: '', smsBody: '', isAutoRespond: false });
      toast({
        title: "Success",
        description: "Template created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: { id: number } & typeof formData) => 
      apiRequest('PATCH', `/api/templates/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setEditingTemplate(null);
      setFormData({ name: '', subject: '', emailBody: '', smsBody: '', isAutoRespond: false });
      toast({
        title: "Success",
        description: "Template updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "Success",
        description: "Template deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => apiRequest('PATCH', `/api/templates/${id}`, { isDefault: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "Success",
        description: "Template set as default successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set template as default. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreateTemplate = () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.emailBody.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createTemplateMutation.mutate(formData);
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate || !formData.name.trim() || !formData.subject.trim() || !formData.emailBody.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    updateTemplateMutation.mutate({ id: editingTemplate.id, ...formData });
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      emailBody: template.emailBody,
      smsBody: template.smsBody,
      isAutoRespond: template.isAutoRespond || false
    });
  };

  const handleDelete = (template: EmailTemplate) => {
    if (template.isDefault) {
      toast({
        title: "Error",
        description: "Cannot delete default templates.",
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const handleSetDefault = (template: EmailTemplate) => {
    if (template.isDefault) {
      toast({
        title: "Info",
        description: "This template is already set as default.",
      });
      return;
    }
    
    if (window.confirm(`Set "${template.name}" as default template?`)) {
      setDefaultMutation.mutate(template.id);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', subject: '', emailBody: '', smsBody: '', isAutoRespond: false });
    setEditingTemplate(null);
  };

  // Debug logging for templates display
  console.log('Render check - templates:', templates);
  console.log('Render check - templates.length:', templates?.length);
  console.log('Render check - isLoading:', isLoading);
  console.log('Render check - error:', error);



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600">Manage your automated response templates for enquiries</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Polite Decline, Request Info"
                />
              </div>
              
              <div>
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Re: Your Enquiry - Unfortunately Not Available"
                />
              </div>
              
              <div>
                <Label htmlFor="emailBody">Email Body *</Label>
                <Textarea
                  id="emailBody"
                  value={formData.emailBody}
                  onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
                  placeholder="Use {clientName} for the client's name and {title} for the enquiry title"
                  rows={8}
                />
              </div>
              
              <div>
                <Label htmlFor="smsBody">SMS Version (Optional)</Label>
                <Textarea
                  id="smsBody"
                  value={formData.smsBody}
                  onChange={(e) => setFormData({ ...formData, smsBody: e.target.value })}
                  placeholder="Shorter version for SMS (160 characters recommended)"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoRespond"
                  checked={formData.isAutoRespond}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAutoRespond: checked })}
                />
                <Label htmlFor="autoRespond" className="text-sm">
                  Show in auto-respond options
                </Label>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTemplate}
                  disabled={createTemplateMutation.isPending}
                >
                  {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && <div className="col-span-2 text-center py-8">Loading templates...</div>}
        {error && <div className="col-span-2 text-center py-8 text-red-500">Error loading templates: {error.message}</div>}
        {templates && templates.length > 0 ? (
          templates.map((template: EmailTemplate) => (
            <Card key={template.id} className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {template.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                    {template.isAutoRespond && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Auto-Respond
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    {!template.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(template)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      disabled={template.isDefault}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm">Subject:</span>
                  </div>
                  <p className="text-sm text-gray-600">{template.subject}</p>
                </div>
                
                <Separator />
                
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm">Email Body:</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3">{template.emailBody}</p>
                </div>
                
                {template.smsBody && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-sm">SMS Version:</span>
                      </div>
                      <p className="text-sm text-gray-600">{template.smsBody}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          !isLoading && (
            <div className="col-span-2 text-center py-8 text-gray-500">
              <p>No templates found. Create your first template to get started!</p>
              <p className="text-sm mt-2">Debug: templates={JSON.stringify(templates)}</p>
            </div>
          )
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Template Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Polite Decline, Request Info"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-subject">Email Subject *</Label>
              <Input
                id="edit-subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Re: Your Enquiry - Unfortunately Not Available"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-emailBody">Email Body *</Label>
              <Textarea
                id="edit-emailBody"
                value={formData.emailBody}
                onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
                placeholder="Use {clientName} for the client's name and {title} for the enquiry title"
                rows={8}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-smsBody">SMS Version (Optional)</Label>
              <Textarea
                id="edit-smsBody"
                value={formData.smsBody}
                onChange={(e) => setFormData({ ...formData, smsBody: e.target.value })}
                placeholder="Shorter version for SMS (160 characters recommended)"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-autoRespond"
                checked={formData.isAutoRespond}
                onCheckedChange={(checked) => setFormData({ ...formData, isAutoRespond: checked })}
              />
              <Label htmlFor="edit-autoRespond" className="text-sm">
                Show in auto-respond options
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => { setEditingTemplate(null); resetForm(); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateTemplate}
                disabled={updateTemplateMutation.isPending}
              >
                {updateTemplateMutation.isPending ? 'Updating...' : 'Update Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}