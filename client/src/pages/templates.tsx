import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit3, Trash2, Star, Menu, Wand2, Sparkles, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import { apiRequest } from '@/lib/queryClient';
import { findActiveAuthToken } from '@/utils/authToken';

interface EmailTemplate {
  id: number;
  name: string;
  category?: string;
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
  
  // AI-related state
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTone, setAiTone] = useState<'professional' | 'friendly' | 'formal' | 'casual'>('professional');
  const [customPrompt, setCustomPrompt] = useState('');
  const [travelExpense, setTravelExpense] = useState('');
  const [aiGenerated, setAiGenerated] = useState<{
    subject: string;
    emailBody: string;
    smsBody?: string;
  } | null>(null);
  
  // AI editing state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingContent, setEditingContent] = useState<{
    subject: string;
    emailBody: string;
    smsBody?: string;
  } | null>(null);
  
  const { toast } = useToast();
  
  // Check if we're responding to a specific booking or message
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');
  const messageId = urlParams.get('messageId');
  const action = urlParams.get('action');
  const clientEmail = urlParams.get('clientEmail');
  const clientName = urlParams.get('clientName');
  
  // Fetch booking data if responding to a specific booking or message
  const [bookingData, setBookingData] = useState<any>(null);
  const [messageData, setMessageData] = useState<any>(null);
  const [userSettings, setUserSettings] = useState<any>(null);
  
  useEffect(() => {
    if (bookingId && (action === 'respond' || action === 'thankyou')) {
      fetchBookingData();
    } else if ((messageId && action === 'respond') || (action === 'compose' && clientEmail)) {
      // Create mock booking data for message replies or compose from address book
      setMessageData({
        clientName: decodeURIComponent(clientName || 'Client'),
        clientEmail: decodeURIComponent(clientEmail || ''),
        messageId: messageId
      });
    }
    fetchUserSettings();
  }, [bookingId, messageId, action, clientName, clientEmail]);
  
  // Use centralized auth token system
  const getAuthToken = () => {
    return findActiveAuthToken(); // Returns the token string directly
  };

  const fetchBookingData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('❌ No auth token for booking data');
        return;
      }
      
      const response = await apiRequest(`/api/bookings/${bookingId}`, { method: 'GET' });
      const booking = await response.json();
      setBookingData(booking);
      console.log('✅ Booking data loaded');
    } catch (error) {
      console.error('❌ Failed to fetch booking data:', error);
    }
  };

  const fetchUserSettings = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('❌ No auth token for settings');
        return;
      }
      
      const response = await apiRequest('/api/settings', { method: 'GET' });
      const settings = await response.json();
      setUserSettings(settings);
      console.log('✅ User settings loaded');
    } catch (error) {
      console.error('❌ Error fetching user settings:', error);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    subject: '',
    emailBody: '',
    smsBody: '',
    isAutoRespond: false
  });
  
  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const templateCategories = [
    { value: 'all', label: 'All Templates' },
    { value: 'booking', label: 'Booking' },
    { value: 'contract', label: 'Contract' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'general', label: 'General' }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const seedDefaultTemplates = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('❌ No auth token for seeding templates');
        return;
      }
      
      const response = await apiRequest('/api/templates/seed-defaults', { method: 'POST' });
      const result = await response.json();
      console.log('✅ Seeded default templates:', result);
      setTemplates(result.templates || []);
      toast({
        title: "Templates Created",
        description: "5 default email templates have been created for you",
      });
    } catch (err: any) {
      console.error('❌ Failed to seed templates:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        console.error('❌ No auth token for templates');
        window.location.href = '/';
        return;
      }
      
      const response = await apiRequest('/api/templates', { method: 'GET' });
      const data = await response.json();
      const templatesArray = Array.isArray(data) ? data : [];
      
      // If no templates exist, seed the defaults
      if (templatesArray.length === 0) {
        console.log('📧 No templates found, seeding defaults...');
        await seedDefaultTemplates();
      } else {
        setTemplates(templatesArray);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await apiRequest('/api/templates', { 
        method: 'POST',
        body: formData 
      });
      await response.json();

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
      const response = await apiRequest(`/api/templates/${editingTemplate.id}`, { 
        method: 'PATCH',
        body: formData 
      });
      await response.json();

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
      const response = await apiRequest(`/api/templates/${template.id}`, { 
        method: 'DELETE' 
      });
      await response.json();

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
      const response = await apiRequest(`/api/templates/${template.id}/set-default`, { 
        method: 'POST' 
      });
      await response.json();

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
      category: template.category || 'general',
      subject: template.subject,
      emailBody: template.emailBody,
      smsBody: template.smsBody,
      isAutoRespond: template.isAutoRespond
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'general',
      subject: '',
      emailBody: '',
      smsBody: '',
      isAutoRespond: false
    });
  };
  
  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => (t.category || 'general') === selectedCategory);

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
      return numericFee.toFixed(2); // Return just the number, £ sign added in template
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
      .replace(/\[What's included\]/g, booking.whatsIncluded || '[What\'s included]')
      .replace(/\[what's included\]/g, booking.whatsIncluded || '[What\'s included]')
      .replace(/\[WHAT'S INCLUDED\]/g, booking.whatsIncluded || '[What\'s included]')
      
      // Business signature and individual business details
      .replace(/\[Business Signature\]/g, userSettings ? 
        `Best regards,\n${userSettings.businessName || 'MusoBuddy'}\n${userSettings.businessEmail || ''}\n${userSettings.phone || ''}`.trim() : 
        'Best regards,\n[Business Name]\n[Business Email]\n[Business Phone]')
      .replace(/\[business signature\]/g, userSettings ? 
        `Best regards,\n${userSettings.businessName || 'MusoBuddy'}\n${userSettings.businessEmail || ''}\n${userSettings.phone || ''}`.trim() : 
        'Best regards,\n[Business Name]\n[Business Email]\n[Business Phone]')
      .replace(/\[Your Name\]/g, userSettings?.businessName || '[Business Name]')
      .replace(/\[Your Business Name\]/g, userSettings?.businessName || '[Business Name]')
      .replace(/\[Business Name\]/g, userSettings?.businessName || '[Business Name]')
      .replace(/\[Business Email\]/g, userSettings?.businessEmail || '[Business Email]')
      .replace(/\[Business Phone\]/g, userSettings?.phone || '[Business Phone]')
      .replace(/\[Contact Details\]/g, userSettings ? 
        `${userSettings.businessEmail || ''}\n${userSettings.phone || ''}`.trim() : 
        '[Business Email]\n[Business Phone]');

    // Clean up any duplicate business names that might appear close together
    const businessName = userSettings?.businessName;
    if (businessName && businessName !== 'MusoBuddy') {
      const duplicatePattern = new RegExp(`(${businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([\\s\\n]{0,50}${businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
      processedText = processedText.replace(duplicatePattern, '$1');
    }
    
    return processedText;
  };

  const handleUseTemplate = async (template: EmailTemplate) => {
    const targetData = bookingData || messageData;
    if (!targetData) {
      toast({
        title: "Error",
        description: "Contact data not loaded yet. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Replace template variables with actual booking/message data
    const customizedSubject = replaceTemplateVariables(template.subject, targetData, userSettings);
    const customizedEmailBody = replaceTemplateVariables(template.emailBody, targetData, userSettings);

    // Show preview dialog first
    setPreviewData({
      subject: customizedSubject,
      emailBody: customizedEmailBody,
      template: template
    });
    setShowPreview(true);
  };

  const handleSendEmail = async () => {
    const targetData = bookingData || messageData;
    if (!previewData || !targetData) return;

    const customizedTemplate = {
      subject: previewData.subject,
      emailBody: previewData.emailBody,
      smsBody: previewData.template.smsBody ? replaceTemplateVariables(previewData.template.smsBody, targetData) : ''
    };

    try {
      // Send the email using the template
      const response = await apiRequest('/api/templates/send-email', {
        method: 'POST',
        body: {
          template: customizedTemplate,
          bookingId: bookingId,
          messageId: messageId,
          clientEmail: targetData.clientEmail,
          clientName: targetData.clientName
        }
      });
      
      const result = await response.json();
        
        // Check if this was a thank you template
        const isThankYouTemplate = previewData.template.name?.toLowerCase().includes('thank you') || 
                                 previewData.template.subject?.toLowerCase().includes('thank you') ||
                                 previewData.template.emailBody?.toLowerCase().includes('thank you for');
        
        const message = isThankYouTemplate 
          ? `Thank you email sent to ${targetData.clientName}. ${bookingId ? 'Booking marked as completed.' : ''}`
          : `Your message has been sent to ${targetData.clientName}. Replies will go to your business email.`;
          
        toast({
          title: "Email Sent Successfully",
          description: message,
        });
        
        setShowPreview(false);
        setPreviewData(null);
        
        // If this was accessed from booking respond menu, refresh parent page
        if (bookingId && action === 'thankyou') {
          setTimeout(() => {
            window.close(); // Close if opened in new tab
            window.location.href = '/bookings'; // Or redirect to bookings
          }, 2000);
        } else if (messageId) {
          // For message replies, redirect back to unparseable messages
          setTimeout(() => {
            window.location.href = '/unparseable-messages';
          }, 2000);
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

  // AI Generation Functions
  const handleGenerateAIResponse = async () => {
    const targetData = bookingData || messageData;
    const targetClientEmail = targetData?.clientEmail || clientEmail;
    
    if (!targetData && !customPrompt && !targetClientEmail) {
      toast({
        title: "Missing Information",
        description: "Please provide either booking context, client email, or a custom prompt for AI generation.",
        variant: "destructive",
      });
      return;
    }

    setAiLoading(true);
    try {
      // Fetch client history if we have a client email
      let clientHistory = null;
      if (targetClientEmail) {
        try {
          const clientsResponse = await apiRequest('/api/clients', { method: 'GET' });
          const clients = await clientsResponse.json();
          const client = clients.find((c: any) => c.email === targetClientEmail);
          
          if (client) {
            // Fetch client's booking history
            const bookingsResponse = await apiRequest('/api/bookings', { method: 'GET' });
            const allBookings = await bookingsResponse.json();
            const clientBookings = allBookings.filter((b: any) => 
              b.clientEmail === targetClientEmail || b.clientName === client.name
            );
            
            clientHistory = {
              name: client.name,
              totalBookings: clientBookings.length,
              totalRevenue: clientBookings.reduce((sum: number, b: any) => sum + (b.fee || 0), 0),
              recentBookings: clientBookings.slice(0, 5).map((b: any) => ({
                eventDate: b.eventDate,
                venue: b.venue,
                eventType: b.eventType,
                fee: b.fee,
                status: b.status
              }))
            };
          }
        } catch (error) {
          console.log('Could not fetch client history:', error);
        }
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await apiRequest('/api/ai/generate-response', {
        method: 'POST',
        body: {
          action: action || 'respond',
          bookingId: bookingId || null,
          customPrompt: customPrompt || null,
          clientHistory: clientHistory,
          tone: aiTone,
          travelExpense: travelExpense || null
        }
      });
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      setAiGenerated(result);
      
      toast({
        title: "AI Response Generated",
        description: "Your personalized response has been created. Review and edit as needed.",
      });
    } catch (error) {
      console.error('AI generation error:', error);
      
      let errorMessage = "Failed to connect to AI service. Please check your internet connection.";
      if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = "AI request timed out. The system may be processing a complex request. Please try again.";
      }
      
      toast({
        title: "AI Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseAIGenerated = () => {
    if (!aiGenerated) return;
    
    // Open editing dialog with AI-generated content
    setEditingContent({
      subject: aiGenerated.subject,
      emailBody: aiGenerated.emailBody,
      smsBody: aiGenerated.smsBody || ''
    });
    setShowEditDialog(true);
    setShowAIDialog(false);
  };

  const handleSaveEditedResponse = () => {
    if (!editingContent) return;
    
    // Create a temporary template from edited content
    const aiTemplate: EmailTemplate = {
      id: -1,
      name: 'AI Generated Response (Edited)',
      subject: editingContent.subject,
      emailBody: editingContent.emailBody,
      smsBody: editingContent.smsBody || '',
      isDefault: false,
      isAutoRespond: false,
      createdAt: new Date().toISOString()
    };

    // Show preview with edited content
    setPreviewData({
      subject: editingContent.subject,
      emailBody: editingContent.emailBody,
      template: aiTemplate
    });
    setShowPreview(true);
    setShowEditDialog(false);
    setEditingContent(null);
    setAiGenerated(null);
    setCustomPrompt('');
  };

  const handleSaveAIAsTemplate = () => {
    if (!aiGenerated) return;
    
    // Pre-fill the create template dialog with AI-generated content
    setFormData({
      name: `AI Generated - ${action || 'Response'}`,
      subject: aiGenerated.subject,
      emailBody: aiGenerated.emailBody,
      smsBody: aiGenerated.smsBody || '',
      isAutoRespond: false
    });
    
    setShowAIDialog(false);
    setAiGenerated(null);
    setIsCreateDialogOpen(true);
  };

  // Glockapps deliverability test function
  const runGlockAppsTest = async () => {
    if (templates.length === 0) {
      toast({
        title: "No Templates",
        description: "Please create a template first to run the deliverability test.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Run Glockapps deliverability test?\n\nThis will send your first template to 25 test email addresses to check spam filter performance.\n\nTest ID: UK-Launch-Batch1-${Date.now()}\n\nCheck your Glockapps dashboard in 5-10 minutes for results.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      toast({
        title: "Starting Deliverability Test",
        description: "Sending test emails through your MusoBuddy system...",
      });

      // Your Batch 1 seed emails (25 addresses for rate limiting)
      const seedEmails = [
        "elizabeaver@auth.glockdb.com", 
        "clyde@trustycheck.pro", 
        "johnsimonskh@gmail.com", 
        "juliarspivey@aol.com", 
        "eliza@spamcombat.com", 
        "madeleinecagleks@gmail.com", 
        "joereddison@outlook.com", 
        "virginia@buyemailsoftware.com", 
        "carollpooool@outlook.com", 
        "davidkdoyle@hotmail.com", 
        "simonetgrimard@laposte.net", 
        "verifycom79@gmx.com", 
        "dannakbond@aol.com", 
        "allanb@glockapps.awsapps.com", 
        "frankdesalvo@mailo.com", 
        "lynettedweyand@protonmail.com", 
        "glencabrera@outlook.fr", 
        "brittanyrocha@outlook.de", 
        "irene@postmasterpro.email", 
        "bbarretthenryhe@gmail.com", 
        "deweymadddax@currently.com", 
        "gailllitle@att.net", 
        "bobbybagdgddwins@mailo.com", 
        "naomimartinsn@hotmail.com", 
        "luisl417@yahoo.com"
      ];

      const testId = `UK-Launch-Batch1-${Date.now()}`;
      const response = await apiRequest('/api/test/glockapp-delivery', {
        method: 'POST',
        body: {
          testId,
          templateId: templates[0].id.toString(),
          seedEmails: seedEmails
        }
      });
      
      const result = await response.json();
      
      toast({
        title: "Deliverability Test Completed!",
        description: `✅ ${result.totalSent} emails sent successfully. Check your Glockapps dashboard in 5-10 minutes for spam filter results.`,
      });

      console.log('Deliverability test results:', result);

    } catch (error: any) {
      console.error('Deliverability test error:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to run deliverability test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
                  : bookingId && action === 'thankyou'
                  ? `Select a thank you template for booking #${bookingId}`
                  : action === 'compose' && clientEmail
                  ? `Select a template to send to ${clientName || 'your client'}`
                  : messageId && action === 'respond'
                  ? `Select a template to respond to the message`
                  : 'Manage your automated response templates for enquiries'
                }
              </p>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => runGlockAppsTest()}
                variant="outline"
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none hover:from-green-600 hover:to-emerald-600"
                disabled={loading || templates.length === 0}
              >
                <Bot className="w-4 h-4 mr-2" />
                Spam Test
              </Button>
              <Button 
                onClick={() => setShowAIDialog(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {templateCategories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Booking Context */}
          {bookingId && (action === 'respond' || action === 'thankyou') && (
            <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-green-800 mb-2">
                    📧 {action === 'thankyou' ? `Send Thank You Email - Booking #${bookingId}` : `Send Response Email - Booking #${bookingId}`}
                  </h3>
                  <p className="text-green-700 mb-4 text-lg">
                    {action === 'thankyou' 
                      ? '👇 Click "📧 Select & Send" on any template below to send a customized thank you email'
                      : '👇 Click "📧 Select & Send" on any template below to send a customized response email'}
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

          {/* Message or Compose Context */}
          {((messageId && action === 'respond') || (action === 'compose' && clientEmail)) && (
            <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-blue-800 mb-2">
                    📧 {action === 'compose' ? 'Compose Email' : 'Send Response Email'}
                  </h3>
                  <p className="text-blue-700 mb-4 text-lg">
                    👇 Click "📧 Select & Send" on any template below to send a customized {action === 'compose' ? 'email' : 'response'}
                  </p>
                  {messageData && (
                    <div className="text-left bg-white p-4 rounded-lg mb-4">
                      <h4 className="font-semibold text-blue-800 mb-2">{action === 'compose' ? 'Client Details:' : 'Message Details:'}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span><strong>Client:</strong> {messageData.clientName}</span>
                        <span><strong>Email:</strong> {messageData.clientEmail}</span>
                      </div>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => window.history.back()}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    ← Back to {action === 'compose' ? 'Address Book' : 'Messages'}
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
        ) : filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className={`h-fit transition-all duration-300 ${
                ((bookingId && (action === 'respond' || action === 'thankyou')) || (messageId && action === 'respond') || (action === 'compose' && clientEmail))
                  ? 'hover:shadow-xl hover:border-green-300 hover:bg-green-50/30 cursor-pointer border-2 border-gray-200 hover:border-green-400'
                  : ''
              }`}
              onClick={((bookingId && (action === 'respond' || action === 'thankyou')) || (messageId && action === 'respond') || (action === 'compose' && clientEmail)) 
                ? () => handleUseTemplate(template)
                : undefined
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {template.name}
                      {((bookingId && (action === 'respond' || action === 'thankyou')) || (messageId && action === 'respond') || (action === 'compose' && clientEmail)) && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">👆 Click to use</span>
                      )}
                    </CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {templateCategories.find(c => c.value === (template.category || 'general'))?.label || 'General'}
                    </Badge>
                  </div>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(template);
                      }}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    {((bookingId && (action === 'respond' || action === 'thankyou')) || (messageId && action === 'respond') || (action === 'compose' && clientEmail)) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseTemplate(template);
                        }}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg border-0 transition-all duration-200 transform hover:scale-105"
                      >
                        📧 Select & Send
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template);
                      }}
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
            <DialogDescription>
              Create a new email template that you can reuse for different booking scenarios and client communications.
            </DialogDescription>
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
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {templateCategories.slice(1).map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogDescription>
              Make changes to your existing email template. This will update the template for future use.
            </DialogDescription>
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
              <Label htmlFor="editCategory">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {templateCategories.slice(1).map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogDescription>
              Review your email before sending to {(bookingData || messageData)?.clientName}. This preview shows exactly how your email will appear to the recipient.
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <>
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* Email Header Info */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div><strong>To:</strong> {(bookingData || messageData)?.clientEmail}</div>
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Send Email
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Bot className="w-5 h-5 mr-2 text-primary" />
              AI Response Generator
            </DialogTitle>
            <DialogDescription>
              Generate intelligent, personalized responses using AI based on your booking context and preferences. The AI will create professional templates tailored to your specific situation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Booking Context Display */}
            {bookingData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Using Booking Context:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                  <span><strong>Client:</strong> {bookingData.clientName}</span>
                  <span><strong>Date:</strong> {bookingData.eventDate ? new Date(bookingData.eventDate).toLocaleDateString('en-GB') : 'TBD'}</span>
                  <span><strong>Event:</strong> {bookingData.eventType || 'General enquiry'}</span>
                  <span><strong>Venue:</strong> {bookingData.venue || 'TBD'}</span>
                </div>
              </div>
            )}

            {/* Tone Selection */}
            <div className="space-y-2">
              <Label htmlFor="ai-tone">Response Tone</Label>
              <Select value={aiTone} onValueChange={(value: 'professional' | 'friendly' | 'formal' | 'casual') => setAiTone(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional & Business-like</SelectItem>
                  <SelectItem value="friendly">Friendly & Warm</SelectItem>
                  <SelectItem value="formal">Formal & Traditional</SelectItem>
                  <SelectItem value="casual">Casual & Relaxed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2">
              <Label htmlFor="custom-prompt">
                Custom Instructions (Optional)
              </Label>
              <Textarea
                id="custom-prompt"
                placeholder="e.g., 'Include multiple package options with different durations and pricing', 'Mention ceremony and reception services', 'Ask about specific music preferences'..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Provide specific instructions for what to include in the response. AI will use your booking context and business details automatically.
              </p>
            </div>

            {/* Travel Expense */}
            <div className="space-y-2">
              <Label htmlFor="travel-expense" className="flex items-center">
                <span>Travel Expense (Optional)</span>
                <span className="ml-2 text-xs text-gray-500">- Fixed price for this booking</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
                <Input
                  id="travel-expense"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={travelExpense}
                  onChange={(e) => setTravelExpense(e.target.value)}
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-gray-500">
                Add a fixed travel charge for this specific booking (e.g., £25 for travel to venue). This will be included in the AI-generated pricing quote.
              </p>
            </div>

            {/* AI Generated Content Preview */}
            {aiGenerated && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">Generated Response:</h4>
                <div className="space-y-3">
                  <div>
                    <strong className="text-sm text-green-700">Subject:</strong>
                    <p className="text-sm bg-white p-2 rounded border mt-1">{aiGenerated.subject}</p>
                  </div>
                  <div>
                    <strong className="text-sm text-green-700">Email Body:</strong>
                    <div className="text-sm bg-white p-3 rounded border mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {aiGenerated.emailBody}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 mt-4">
                  <Button onClick={handleUseAIGenerated} className="bg-green-600 hover:bg-green-700">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit & Use Response
                  </Button>
                  <Button onClick={handleSaveAIAsTemplate} variant="outline">
                    Save as Template
                  </Button>
                  <Button 
                    onClick={() => setAiGenerated(null)} 
                    variant="ghost" 
                    size="sm"
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowAIDialog(false);
                setAiGenerated(null);
                setCustomPrompt('');
                setTravelExpense('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateAIResponse}
                disabled={aiLoading}
                className="bg-gradient-to-r from-primary/50 to-blue-500 hover:from-primary hover:to-blue-600"
              >
                {aiLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Response
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Response Editing Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-primary/50 via-blue-500 to-primary-600 rounded-xl shadow-lg">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-blue-600 to-primary-600 bg-clip-text text-transparent">
                  Edit AI Response
                </DialogTitle>
                <DialogDescription>
                  Perfect your AI-generated content before sending to your client. Edit the subject, email body, and SMS content to match your exact needs.
                </DialogDescription>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">AI Powered</div>
                <div className="text-xs text-primary font-semibold">Ready to Edit</div>
              </div>
            </div>
          </DialogHeader>
          
          {editingContent && (
            <div className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="edit-subject" className="text-sm font-semibold text-gray-700 flex items-center">
                  <span className="inline-block w-1 h-4 bg-primary/50 rounded-full mr-2"></span>
                  Email Subject
                </Label>
                <Input
                  id="edit-subject"
                  value={editingContent.subject}
                  onChange={(e) => setEditingContent({
                    ...editingContent,
                    subject: e.target.value
                  })}
                  placeholder="Email subject line"
                  className="border-gray-200 focus:border-primary/50 focus:ring-primary/50/20 transition-all duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email-body" className="text-sm font-semibold text-gray-700 flex items-center">
                  <span className="inline-block w-1 h-4 bg-blue-500 rounded-full mr-2"></span>
                  Email Body
                </Label>
                <div className="relative">
                  <Textarea
                    id="edit-email-body"
                    value={editingContent.emailBody}
                    onChange={(e) => setEditingContent({
                      ...editingContent,
                      emailBody: e.target.value
                    })}
                    placeholder="Your email message here..."
                    rows={12}
                    className="font-mono text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 resize-none"
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded border">
                    {editingContent.emailBody.length} characters
                  </div>
                </div>
              </div>
              
              {editingContent.smsBody && (
                <div className="space-y-2">
                  <Label htmlFor="edit-sms-body" className="text-sm font-semibold text-gray-700 flex items-center">
                    <span className="inline-block w-1 h-4 bg-green-500 rounded-full mr-2"></span>
                    SMS Body (Optional)
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="edit-sms-body"
                      value={editingContent.smsBody}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        smsBody: e.target.value
                      })}
                      placeholder="Your SMS message here..."
                      rows={3}
                      className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200"
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded border">
                      {editingContent.smsBody.length}/160
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                <div className="text-xs text-gray-500 flex items-center">
                  <span className="inline-block w-2 h-2 bg-primary/50 rounded-full mr-2 animate-pulse"></span>
                  Changes will be applied to your response preview
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => {
                    setShowEditDialog(false);
                    setEditingContent(null);
                  }} className="px-6">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveEditedResponse} 
                    className="bg-gradient-to-r from-primary/50 via-blue-500 to-primary-600 hover:from-primary hover:via-blue-600 hover:to-primary-700 px-6 shadow-lg transition-all duration-200"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Use Edited Response
                  </Button>
                </div>
              </div>
            </div>
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