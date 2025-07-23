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
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    subject: string;
    emailBody: string;
    template: EmailTemplate;
  } | null>(null);
  const { toast } = useToast();
  
  // Check if we're responding to a specific booking
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');
  const action = urlParams.get('action');
  
  // Fetch booking data if responding to a specific booking
  const [bookingData, setBookingData] = useState<any>(null);
  const [userSettings, setUserSettings] = useState<any>(null);
  
  useEffect(() => {
    if (bookingId && action === 'respond') {
      fetchBookingData();
    }
    fetchUserSettings();
  }, [bookingId, action]);
  
  const fetchBookingData = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const booking = await response.json();
        setBookingData(booking);
        console.log('✅ Booking data loaded:', booking);
      } else {
        console.error('❌ Failed to fetch booking:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Failed to fetch booking data:', error);
    }
  };

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const settings = await response.json();
        setUserSettings(settings);
        console.log('✅ User settings loaded:', settings);
      } else {
        console.error('❌ Failed to fetch user settings');
      }
    } catch (error) {
      console.error('❌ Error fetching user settings:', error);
    }
  };

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

  const replaceTemplateVariables = (text: string, booking: any, userSettings?: any) => {
    if (!booking) return text;
    
    const eventDate = booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-GB') : 'TBD';
    const eventTime = booking.eventTime || 'TBD';
    const eventEndTime = booking.eventEndTime || '';
    const timeRange = eventEndTime ? `${eventTime} - ${eventEndTime}` : eventTime;
    
    // Format performance duration - now stored as text
    const formatDuration = (duration: string | number | null) => {
      if (!duration) return '[Performance Duration]';
      // If it's already text, return as-is
      if (typeof duration === 'string') return duration;
      // If it's a number (legacy data), convert to readable format
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      if (hours === 0) return `${mins} minutes`;
      if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
    };

    // Format fee with proper currency
    const formatFee = (fee: any) => {
      if (!fee) return '[Fee]';
      const numericFee = typeof fee === 'string' ? parseFloat(fee) : fee;
      return `£${numericFee.toFixed(2)}`;
    };
    
    let processedText = text
      // Basic fields
      .replace(/\[Client Name\]/g, booking.clientName || '[Client Name]')
      .replace(/\[client name\]/g, booking.clientName || '[Client Name]')
      .replace(/\[CLIENT NAME\]/g, (booking.clientName || '[Client Name]').toUpperCase())
      .replace(/\[Event Date\]/g, eventDate)
      .replace(/\[event date\]/g, eventDate)
      .replace(/\[date\]/g, eventDate)
      .replace(/\[Date\]/g, eventDate)
      .replace(/\[Event Time\]/g, timeRange)
      .replace(/\[event time\]/g, timeRange)
      .replace(/\[Venue\]/g, booking.venue || '[Venue]')
      .replace(/\[venue\]/g, booking.venue || '[Venue]')
      .replace(/\[Client Email\]/g, booking.clientEmail || '[Client Email]')
      .replace(/\[Venue Address\]/g, booking.venueAddress || '[Venue Address]')
      
      // Financial fields
      .replace(/\[Fee\]/g, formatFee(booking.fee))
      .replace(/\[fee\]/g, formatFee(booking.fee))
      .replace(/\[FEE\]/g, formatFee(booking.fee))
      
      // NEW Performance fields
      .replace(/\[Performance Duration\]/g, formatDuration(booking.performanceDuration))
      .replace(/\[performance duration\]/g, formatDuration(booking.performanceDuration))
      .replace(/\[Repertoire\]/g, booking.styles || '[Styles]')
      .replace(/\[repertoire\]/g, booking.styles || '[Styles]')
      .replace(/\[Styles\]/g, booking.styles || '[Styles]')
      .replace(/\[styles\]/g, booking.styles || '[Styles]')
      .replace(/\[Equipment Provided\]/g, booking.equipmentProvided || '[Equipment Provided]')
      .replace(/\[equipment provided\]/g, booking.equipmentProvided || '[Equipment Provided]')
      .replace(/\{Equipment provided\}/g, booking.equipmentProvided || '[Equipment Provided]')
      .replace(/\[Equipment details\]/g, booking.equipmentProvided || '[Equipment Provided]')
      .replace(/\[equipment details\]/g, booking.equipmentProvided || '[Equipment Provided]')
      .replace(/\[What's Included\]/g, booking.whatsIncluded || '[What\'s Included]')
      .replace(/\[whats included\]/g, booking.whatsIncluded || '[What\'s Included]')
      .replace(/\[What\'s Included\]/g, booking.whatsIncluded || '[What\'s Included]')
      .replace(/\[What's included\?\]/g, booking.whatsIncluded || '[What\'s Included]')
      .replace(/\{What's included\?\}/g, booking.whatsIncluded || '[What\'s Included]')
      
      // Additional patterns
      .replace(/\[Duration\]/g, formatDuration(booking.performanceDuration))
      .replace(/\[duration\]/g, formatDuration(booking.performanceDuration))
      .replace(/\[Style\/Genre\]/g, booking.styles || '[Styles]')
      .replace(/\[style\/genre\]/g, booking.styles || '[Styles]')
      .replace(/\[Amount\]/g, formatFee(booking.fee))
      .replace(/\[amount\]/g, formatFee(booking.fee))
      
      // Complete business signature (the only sign-off needed)
      .replace(/\[Business Signature\]/g, userSettings ? 
        `Best regards,\n${userSettings.businessName || 'MusoBuddy'}\n${userSettings.businessEmail || ''}\n${userSettings.phone || ''}`.trim() : 
        'Best regards,\n[Business Name]\n[Business Email]\n[Business Phone]')
      .replace(/\[business signature\]/g, userSettings ? 
        `Best regards,\n${userSettings.businessName || 'MusoBuddy'}\n${userSettings.businessEmail || ''}\n${userSettings.phone || ''}`.trim() : 
        'Best regards,\n[Business Name]\n[Business Email]\n[Business Phone]');
    
    return processedText;
  };

  const handleUseTemplate = async (template: EmailTemplate) => {
    if (!bookingData) {
      toast({
        title: "Error",
        description: "Booking data not loaded yet. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Replace template variables with actual booking data
    const customizedSubject = replaceTemplateVariables(template.subject, bookingData, userSettings);
    const customizedEmailBody = replaceTemplateVariables(template.emailBody, bookingData, userSettings);

    // Show preview dialog first
    setPreviewData({
      subject: customizedSubject,
      emailBody: customizedEmailBody,
      template: template
    });
    setShowPreview(true);
  };

  const handleSendEmail = async () => {
    if (!previewData || !bookingData) return;

    const customizedTemplate = {
      subject: previewData.subject,
      emailBody: previewData.emailBody,
      smsBody: previewData.template.smsBody ? replaceTemplateVariables(previewData.template.smsBody, bookingData) : ''
    };

    try {
      // Send the email using the template
      const response = await fetch('/api/templates/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          template: customizedTemplate,
          bookingId: bookingId
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Email Sent Successfully",
          description: `Your message has been sent to ${bookingData.clientName}. Replies will go to your business email.`,
        });
        console.log('✅ Template email sent:', result);
        setShowPreview(false);
        setPreviewData(null);
      } else {
        const error = await response.json();
        toast({
          title: "Email Failed",
          description: error.error || "Failed to send email. Please try again.",
          variant: "destructive",
        });
        console.error('❌ Template email failed:', error);
      }
    } catch (error) {
      console.error('❌ Template email error:', error);
      toast({
        title: "Email Error",
        description: "Failed to send email. Please check your internet connection and try again.",
        variant: "destructive",
      });
    }
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
                    The template will be automatically customized with booking details.
                  </p>
                  {bookingData && (
                    <div className="text-left bg-white p-4 rounded-lg mb-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Booking Details:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span><strong>Client:</strong> {bookingData.clientName}</span>
                        <span><strong>Email:</strong> {bookingData.clientEmail}</span>
                        <span><strong>Date:</strong> {bookingData.eventDate ? new Date(bookingData.eventDate).toLocaleDateString('en-GB') : 'TBD'}</span>
                        <span><strong>Time:</strong> {bookingData.eventTime || 'TBD'}</span>
                        <span><strong>Venue:</strong> {bookingData.venue || 'TBD'}</span>
                        <span><strong>Fee:</strong> £{bookingData.fee || 'TBD'}</span>
                      </div>
                    </div>
                  )}
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
                    {bookingId && action === 'respond' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleUseTemplate(template)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Use Template
                      </Button>
                    )}
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

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Email Preview</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Review your email before sending to {bookingData?.clientName}
            </p>
          </DialogHeader>
          
          {previewData && (
            <>
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* Email Header Info */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div><strong>To:</strong> {bookingData?.clientEmail}</div>
                  <div><strong>Subject:</strong> {previewData.subject}</div>
                  <div><strong>From:</strong> Your Business Email (via MusoBuddy)</div>
                </div>
                
                {/* Email Body Preview */}
                <div className="border rounded-lg p-4 bg-white">
                  <div className="whitespace-pre-wrap font-sans leading-relaxed text-sm">
                    {previewData.emailBody}
                  </div>
                </div>
              </div>
              
              {/* Fixed Action Buttons */}
              <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewData(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendEmail}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Send Email
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}