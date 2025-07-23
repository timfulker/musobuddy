import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Edit3, Trash2, Star, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';

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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  
  // Check if we're responding to a specific booking
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');
  const action = urlParams.get('action');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    emailBody: '',
    smsBody: '',
    isAutoRespond: false
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTemplates(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchTemplates();
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const response = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchTemplates();
      setEditingTemplate(null);
      resetForm();
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchTemplates();
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/templates/${template.id}/set-default`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchTemplates();
      toast({
        title: "Success",
        description: `"${template.name}" set as default template`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      emailBody: template.emailBody,
      smsBody: template.smsBody,
      isAutoRespond: template.isAutoRespond
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      emailBody: '',
      smsBody: '',
      isAutoRespond: false
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="bg-card shadow-lg"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="md:ml-64 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white ml-12 md:ml-0">Email Templates</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {bookingId && action === 'respond' 
                  ? `Select a template to respond to booking #${bookingId}`
                  : 'Manage your automated response templates for enquiries'
                }
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>

          {/* Booking Response Context */}
          {bookingId && action === 'respond' && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Responding to Booking #{bookingId}
                  </h3>
                  <p className="text-blue-600 mb-4">
                    Select an email template below to send a response to your client. 
                    The template will be customized with the booking details.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => window.history.back()}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    ← Back to Bookings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <div className="col-span-2 text-center py-8">Loading templates...</div>
        ) : error ? (
          <div className="col-span-2 text-center py-8 text-red-500">
            Error loading templates: {error}
          </div>
        ) : templates.length > 0 ? (
          templates.map((template) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Subject</p>
                    <p className="text-sm text-gray-600">{template.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Email Body</p>
                    <p className="text-sm text-gray-600 line-clamp-3">{template.emailBody}</p>
                  </div>
                  {template.smsBody && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">SMS Body</p>
                      <p className="text-sm text-gray-600 line-clamp-2">{template.smsBody}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex space-x-2">
                      {!template.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(template)}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Set as Default
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-2 text-center py-8 text-gray-500">
            <p>No templates found. Create your first template to get started!</p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Polite Decline"
              />
            </div>
            <div>
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="e.g., Thank you for your enquiry"
              />
            </div>
            <div>
              <Label htmlFor="emailBody">Email Body</Label>
              <Textarea
                id="emailBody"
                value={formData.emailBody}
                onChange={(e) => setFormData({...formData, emailBody: e.target.value})}
                placeholder="Your email message here..."
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="smsBody">SMS Body (Optional)</Label>
              <Textarea
                id="smsBody"
                value={formData.smsBody}
                onChange={(e) => setFormData({...formData, smsBody: e.target.value})}
                placeholder="Your SMS message here..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoRespond"
                checked={formData.isAutoRespond}
                onCheckedChange={(checked) => setFormData({...formData, isAutoRespond: !!checked})}
              />
              <Label htmlFor="autoRespond" className="text-sm">
                Show in auto-respond options
              </Label>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">Template Name</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Polite Decline"
              />
            </div>
            <div>
              <Label htmlFor="editSubject">Email Subject</Label>
              <Input
                id="editSubject"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="e.g., Thank you for your enquiry"
              />
            </div>
            <div>
              <Label htmlFor="editEmailBody">Email Body</Label>
              <Textarea
                id="editEmailBody"
                value={formData.emailBody}
                onChange={(e) => setFormData({...formData, emailBody: e.target.value})}
                placeholder="Your email message here..."
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="editSmsBody">SMS Body (Optional)</Label>
              <Textarea
                id="editSmsBody"
                value={formData.smsBody}
                onChange={(e) => setFormData({...formData, smsBody: e.target.value})}
                placeholder="Your SMS message here..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editAutoRespond"
                checked={formData.isAutoRespond}
                onCheckedChange={(checked) => setFormData({...formData, isAutoRespond: !!checked})}
              />
              <Label htmlFor="editAutoRespond" className="text-sm">
                Show in auto-respond options
              </Label>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => { setEditingTemplate(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTemplate}>
                Update Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}