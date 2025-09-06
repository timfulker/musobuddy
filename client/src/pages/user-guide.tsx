import { useState } from 'react';
import { useLocation } from 'wouter';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import BetaStepGuide from '@/components/beta-step-guide';
import { 
  Mail, 
  FileText, 
  DollarSign, 
  Calendar, 
  Settings,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  PlayCircle,
  BookOpen,
  Lightbulb,
  Target,
  Menu,
  AlertTriangle,
  MessageSquare,
  Bug,
  HelpCircle,
  Shield,
  Zap,
  Star,
  Clock
} from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  steps: string[];
  tips?: string[];
  videoUrl?: string;
}

// Beta Tester Guide Steps
const betaGuideSteps: GuideStep[] = [
  {
    id: 'step-by-step',
    title: '🎯 Interactive Step-by-Step Guide',
    description: 'Complete your first MusoBuddy workflow in 45-60 minutes',
    icon: <Target className="h-5 w-5" />,
    steps: [
      'Click "Start Step-by-Step Guide" below to begin your complete MusoBuddy onboarding',
      'This interactive guide walks you through creating your first booking, contract, and invoice',
      'Takes 45-60 minutes and covers everything you need to know',
      'Perfect for first-time users who want hands-on experience',
      'Includes real-time progress tracking and helpful tips',
      'You can pause and resume at any time'
    ],
    tips: [
      'This is the recommended starting point for all new beta testers',
      'You\'ll create real test data that you can delete later',
      'Follow along in a separate browser tab for the best experience',
      'Take screenshots of anything confusing for feedback'
    ]
  },
  {
    id: 'beta-welcome',
    title: '🚀 Welcome Beta Testers!',
    description: 'Important information for beta participants',
    icon: <Star className="h-5 w-5" />,
    steps: [
      'Welcome to the MusoBuddy Beta Program! You\'re helping shape the future of musician admin',
      'This is a BETA version - expect some features to evolve and improve based on your feedback',
      'Your data is safe and secure, but we recommend keeping backup records during beta period',
      'Report any bugs, issues, or suggestions through the Feedback page (accessible via the sidebar)',
      'Check for updates regularly - we\'re releasing improvements based on beta feedback',
      'Join our beta community discussions for tips and shared experiences'
    ],
    tips: [
      'Beta access is free during the testing period - take advantage of all features',
      'Document any workflows that don\'t feel intuitive - this helps us improve',
      'Try different browsers (Chrome, Safari, Firefox) to help us test compatibility',
      'Your feedback directly influences which features we prioritize for the full release'
    ]
  },
  {
    id: 'beta-testing-workflow',
    title: '🧪 Beta Testing Best Practices',
    description: 'How to effectively test MusoBuddy features',
    icon: <Zap className="h-5 w-5" />,
    steps: [
      'Test real scenarios: Use actual client data and booking information when possible',
      'Try edge cases: Test with unusual dates, long text, special characters, and empty fields',
      'Test on different devices: Check functionality on desktop, tablet, and mobile',
      'Test different browsers: Chrome, Safari, Firefox, and Edge if possible',
      'Test workflows end-to-end: Create a booking → Generate contract → Send invoice → Mark as paid',
      'Document what works well and what doesn\'t feel intuitive',
      'Take screenshots of any bugs or confusing interfaces for feedback reports'
    ],
    tips: [
      'Focus on YOUR typical workflow - how would you actually use this in your business?',
      'Don\'t be afraid to break things - that\'s how we find issues to fix',
      'Report both bugs AND suggestions for improvements',
      'Your testing helps make MusoBuddy better for all musicians'
    ]
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Initial setup and dashboard overview',
    icon: <PlayCircle className="h-5 w-5" />,
    steps: [
      'Login to your MusoBuddy account using your email and password',
      'Complete your business setup in Settings (essential for professional documents)',
      'Familiarize yourself with the dashboard showing key metrics',
      'Explore the navigation menu: Bookings, Contracts, Invoices, Calendar, and Settings',
      'Test different features and workflows during the beta period'
    ],
    tips: [
      'The dashboard shows real-time stats: monthly revenue, active bookings, and pending invoices',
      'All pages are responsive and work on mobile devices',
      'Use the search functionality to quickly find specific bookings or contracts',
      'As a beta tester, your feedback on usability is invaluable'
    ]
  },
  {
    id: 'email-setup',
    title: 'Email Forwarding Setup',
    description: 'Automatically convert emails to enquiries',
    icon: <Mail className="h-5 w-5" />,
    steps: [
      'Forward client emails to leads@musobuddy.com',
      'AI automatically extracts client details, dates, and venues',
      'Enquiries appear instantly in your Bookings dashboard',
      'Review and edit AI-extracted information if needed',
      'Conflict detection runs automatically for date clashes'
    ],
    tips: [
      'Works with any email provider (Gmail, Outlook, Apple Mail, etc.)',
      'Forward voice message transcripts for phone enquiries',
      'Perfect for WhatsApp and SMS screenshots',
      'AI recognizes Encore booking platform emails with apply-now links'
    ]
  },
  {
    id: 'booking-management',
    title: 'Booking Management',
    description: 'Complete booking lifecycle from enquiry to completion',
    icon: <Calendar className="h-5 w-5" />,
    steps: [
      'View all bookings in the main Bookings page with status indicators',
      'Create new bookings manually using the "Add Booking" button',
      'Edit booking details by clicking on any booking card',
      'Use status workflow: New → Quoted → Confirmed → Completed',
      'Add notes and track client communications',
      'Set response deadlines and follow-up reminders'
    ],
    tips: [
      'Conflict warnings appear as red badges when dates overlap',
      'Filter bookings by status, date range, or search terms',
      'Booking cards show key info: client, date, venue, value, and status',
      'Use the calendar view to see all bookings in monthly format'
    ]
  },
  {
    id: 'contract-creation',
    title: 'Contract Creation & Management',
    description: 'Professional contract creation and digital signing',
    icon: <FileText className="h-5 w-5" />,
    steps: [
      'Create contracts from existing bookings or manually',
      'Fill in essential details: client info, event details, fees, and terms',
      'Generate professional PDF contracts with your business branding',
      'Send contracts via email with secure digital signing links',
      'Track contract status: Draft → Sent → Signed → Completed'
    ],
    tips: [
      'Contract templates include Musicians Union minimum requirements',
      'Digital signatures are legally binding in the UK',
      'Signed contracts are automatically stored in cloud storage',
      'Both parties receive copies of signed contracts via email'
    ]
  },
  {
    id: 'contract-signing',
    title: 'Contract Signing Workflow',
    description: 'How clients sign contracts digitally',
    icon: <CheckCircle className="h-5 w-5" />,
    steps: [
      'Client receives email with secure signing link',
      'Link opens contract in browser (no app required)',
      'Client reviews contract terms and event details',
      'Client enters their name and provides digital signature',
      'System captures IP address and timestamp for legal compliance',
      'Signed contract is automatically emailed to both parties',
      'Contract status updates to "Signed" in your dashboard'
    ],
    tips: [
      'Signing links work on any device (phone, tablet, desktop)',
      'Contracts remain accessible even if MusoBuddy is offline',
      'Automatic reminders sent for unsigned contracts',
      'Digital signatures include legal metadata for enforceability'
    ]
  },
  {
    id: 'invoice-creation',
    title: 'Invoice Creation & Editing',
    description: 'Professional invoicing with payment tracking',
    icon: <DollarSign className="h-5 w-5" />,
    steps: [
      'Create invoices from signed contracts or manually',
      'Invoice details auto-populate from contract information',
      'Edit invoice amounts, due dates, and payment terms',
      'Add line items for equipment, travel, or additional services',
      'Generate professional PDF invoices with UK tax compliance',
      'Preview invoices before sending to clients'
    ],
    tips: [
      'Invoice numbers auto-increment (customizable in Settings)',
      'Invoice amounts default to contract fee but can be edited',
      'Include your bank details for client payments',
      'Add CC email addresses for client accounts departments'
    ]
  },
  {
    id: 'invoice-sending',
    title: 'Sending & Tracking Invoices',
    description: 'Email delivery and payment monitoring',
    icon: <Target className="h-5 w-5" />,
    steps: [
      'Send invoices directly from the system via email',
      'Invoice PDFs are attached and also available via web link',
      'Track invoice status: Draft → Sent → Paid → Overdue',
      'Mark invoices as paid when payment is received',
      'Send automated reminders for overdue invoices',
      'Download invoice PDFs for your records'
    ],
    tips: [
      'Email includes professional branding with your business name',
      'Web links allow clients to view invoices without downloading',
      'Payment tracking helps with cash flow management',
      'Overdue detection runs automatically with reminder options'
    ]
  },
  {
    id: 'calendar-system',
    title: 'Calendar & Scheduling',
    description: 'Visual booking management and conflict detection',
    icon: <Calendar className="h-5 w-5" />,
    steps: [
      'View all bookings in calendar format by month',
      'Import existing calendar events from .ics files',
      'Export your MusoBuddy calendar to external calendar apps',
      'Identify conflicts with red warning indicators',
      'Mark dates as unavailable for booking',
      'Switch between calendar and list views'
    ],
    tips: [
      'Calendar shows confirmed gigs, potential bookings, and conflicts',
      'Expired enquiries are hidden to keep calendar clean',
      'Works with Google Calendar, Apple Calendar, and Outlook',
      'Conflict detection prevents double-booking mistakes'
    ]
  },
  {
    id: 'compliance-management',
    title: 'Compliance & Document Management',
    description: 'Track insurance, licenses, and certifications',
    icon: <Users className="h-5 w-5" />,
    steps: [
      'Upload compliance documents (insurance, PAT testing, licenses)',
      'Set expiry dates for automatic renewal reminders',
      'Share compliance documents with clients for venue requirements',
      'Track compliance status across all your documents',
      'Receive alerts before documents expire'
    ],
    tips: [
      'Many venues require public liability insurance and PAT certificates',
      'Upload documents once and share with multiple clients',
      'Automatic reminders help avoid expired certifications',
      'Professional document sharing builds client trust'
    ]
  },
  {
    id: 'business-settings',
    title: 'Business Configuration',
    description: 'Set up your business details and preferences',
    icon: <Settings className="h-5 w-5" />,
    steps: [
      'Add business name, address, and contact details',
      'Set up bank account information for invoices',
      'Configure default payment terms and invoice numbering',
      'Customize email branding with your business name',
      'Set buffer times for different event types',
      'Configure instruments played and gig types'
    ],
    tips: [
      'Business details auto-populate on all invoices and contracts',
      'Email branding maintains professional appearance',
      'Invoice numbering ensures legal compliance',
      'Buffer times help with travel and setup scheduling'
    ]
  },
  {
    id: 'advanced-features',
    title: 'Advanced Features',
    description: 'Power user features and automation',
    icon: <Lightbulb className="h-5 w-5" />,
    steps: [
      'Use AI-powered conflict resolution suggestions',
      'Set up automated contract and invoice reminders',
      'Import calendar events from other booking platforms',
      'Use bulk operations for multiple bookings',
      'Export data for accounting software integration',
      'Configure custom gig types and instruments'
    ],
    tips: [
      'AI learns from your booking patterns to improve suggestions',
      'Automation reduces manual follow-up tasks',
      'Data export helps with tax preparation',
      'Custom configurations adapt the system to your specific needs'
    ]
  },
  {
    id: 'client-management',
    title: 'Client Address Book',
    description: 'Manage client contacts and relationships',
    icon: <Users className="h-5 w-5" />,
    steps: [
      'Add clients manually or from enquiries',
      'Store complete contact information',
      'Track client booking history',
      'Search and filter client records',
      'View client statistics and preferences'
    ],
    tips: [
      'Only add clients you want to keep long-term',
      'Client details auto-fill when creating new contracts',
      'Useful for tracking repeat customers'
    ]
  },
  {
    id: 'beta-testing-workflow',
    title: '🧪 Beta Testing Best Practices',
    description: 'How to effectively test MusoBuddy features',
    icon: <Zap className="h-5 w-5" />,
    steps: [
      'Test real scenarios: Use actual client data and booking information when possible',
      'Try edge cases: Test with unusual dates, long text, special characters, and empty fields',
      'Test on different devices: Check functionality on desktop, tablet, and mobile',
      'Test different browsers: Chrome, Safari, Firefox, and Edge if possible',
      'Test workflows end-to-end: Create a booking → Generate contract → Send invoice → Mark as paid',
      'Document what works well and what doesn\'t feel intuitive',
      'Take screenshots of any bugs or confusing interfaces for feedback reports'
    ],
    tips: [
      'Focus on YOUR typical workflow - how would you actually use this in your business?',
      'Don\'t be afraid to break things - that\'s how we find issues to fix',
      'Test features you might not normally use - they might surprise you',
      'Pay attention to loading times and report anything that feels slow'
    ]
  },
  {
    id: 'common-issues',
    title: '⚠️ Known Issues & Workarounds',
    description: 'Current beta limitations and temporary solutions',
    icon: <AlertTriangle className="h-5 w-5" />,
    steps: [
      'Email parsing may occasionally miss complex formatting - manually edit extracted data as needed',
      'Large file uploads (>10MB) may timeout - resize images/documents before uploading',
      'Calendar sync may take up to 5 minutes to reflect changes - refresh page if updates don\'t appear',
      'Contract generation works best with Chrome/Safari - try different browser if PDFs don\'t generate',
      'Mobile interface optimized for portrait mode - rotate device if interface appears cramped',
      'Some email providers may mark MusoBuddy emails as spam initially - check spam folders',
      'Logout/login if you experience session errors or features not loading properly'
    ],
    tips: [
      'Keep this guide bookmarked - we update it regularly with new workarounds',
      'Most issues resolve themselves with a page refresh or browser restart',
      'Report new issues even if you find a workaround - helps us prioritize fixes',
      'Check the feedback page for updates from other beta testers'
    ]
  },
  {
    id: 'troubleshooting',
    title: '🔧 Troubleshooting Guide',
    description: 'Quick fixes for common problems',
    icon: <HelpCircle className="h-5 w-5" />,
    steps: [
      'PAGE WON\'T LOAD: Refresh browser, clear cache, try incognito/private browsing mode',
      'FEATURES MISSING: Ensure you\'re logged in and have completed initial settings setup',
      'EMAIL NOT WORKING: Check spam folder, verify email forwarding setup, try different email client',
      'PDF WON\'T GENERATE: Try different browser, disable ad blockers, ensure popup blocker allows MusoBuddy',
      'DATA NOT SAVING: Check internet connection, wait for page to fully load before submitting forms',
      'MOBILE ISSUES: Update browser app, clear browser cache, try desktop version if critical',
      'LOGIN PROBLEMS: Reset password, clear cookies, check email for verification messages'
    ],
    tips: [
      'Take a screenshot before trying fixes - helps us identify patterns',
      'Note your browser, device, and operating system when reporting issues',
      'Try the same action in different browsers to isolate browser-specific issues',
      'Most issues are resolved within 24-48 hours of reporting'
    ]
  },
  {
    id: 'feedback-reporting',
    title: '📝 How to Report Feedback',
    description: 'Help us improve MusoBuddy with your insights',
    icon: <MessageSquare className="h-5 w-5" />,
    steps: [
      'Use the Feedback page in the sidebar - it\'s the fastest way to reach the development team',
      'Include specific details: What were you trying to do? What happened instead?',
      'Attach screenshots for visual issues - a picture is worth 1000 words',
      'Rate the severity: Critical (blocks you from working) vs. Minor (inconvenient but workable)',
      'Suggest improvements: If you have ideas for better workflows, we want to hear them',
      'Follow up on submitted feedback - we may ask clarifying questions',
      'Join beta tester discussions - share tips and learn from other users'
    ],
    tips: [
      'Good feedback example: "When I try to generate a contract for a wedding booking, the PDF includes the wrong date. Screenshot attached."',
      'Poor feedback example: "Contracts don\'t work" (too vague to investigate)',
      'Feature requests are welcome - tell us what\'s missing from your current workflow',
      'Positive feedback helps too - let us know what you love about MusoBuddy!'
    ]
  },
  {
    id: 'beta-security',
    title: '🔒 Beta Security & Privacy',
    description: 'Your data protection during beta testing',
    icon: <Shield className="h-5 w-5" />,
    steps: [
      'All data is encrypted in transit and at rest using industry-standard security',
      'Beta environment uses the same security measures as our production systems',
      'Your business data is never shared with third parties or other beta testers',
      'Regular automated backups ensure your data is protected against loss',
      'You can export your data at any time through the Settings page',
      'Account deletion removes all your data permanently within 30 days',
      'Security updates are applied immediately as they become available'
    ],
    tips: [
      'Use strong passwords and enable two-factor authentication if available',
      'Don\'t share your login credentials with others during beta testing',
      'Report any suspicious activity or security concerns immediately',
      'Keep personal client data secure - don\'t screenshot sensitive information for feedback'
    ]
  },
  {
    id: 'beta-timeline',
    title: '⏰ Beta Timeline & What\'s Next',
    description: 'Beta program roadmap and expectations',
    icon: <Clock className="h-5 w-5" />,
    steps: [
      'Beta Phase 1 (Current): Core features testing with limited user group',
      'Beta Phase 2 (Coming Soon): Extended feature set with more beta testers',
      'Release Candidate: Final testing with all launch features enabled',
      'Public Launch: General availability with onboarding for all musicians',
      'Post-Launch: Continued feature development based on user feedback',
      'Your beta access continues through launch - no need to re-register',
      'Grandfathered pricing available for committed beta testers'
    ],
    tips: [
      'Beta testers get early access to new features before general release',
      'Your feedback directly influences the launch timeline and feature priorities',
      'Keep testing regularly - the more you use it, the better we can make it',
      'Consider upgrading to paid plans during beta for the best pricing'
    ]
  }
];

// Regular User Guide Steps (no beta-specific content)
const regularGuideSteps: GuideStep[] = [
  {
    id: 'step-by-step',
    title: '🎯 Interactive Step-by-Step Guide',
    description: 'Complete your first MusoBuddy workflow in 45-60 minutes',
    icon: <Target className="h-5 w-5" />,
    steps: [
      'Click "Start Step-by-Step Guide" below to begin your complete MusoBuddy onboarding',
      'This interactive guide walks you through creating your first booking, contract, and invoice',
      'Takes 45-60 minutes and covers everything you need to know',
      'Perfect for first-time users who want hands-on experience',
      'Includes real-time progress tracking and helpful tips',
      'You can pause and resume at any time'
    ],
    tips: [
      'This is the recommended starting point for all new users',
      'You\'ll create real data that you can use in your business',
      'Follow along in a separate browser tab for the best experience',
      'Contact support if you need any assistance'
    ]
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Initial setup and dashboard overview',
    icon: <PlayCircle className="h-5 w-5" />,
    steps: [
      'Login to your MusoBuddy account using your email and password',
      'Complete your business setup in Settings (essential for professional documents)',
      'Familiarize yourself with the dashboard showing key metrics',
      'Explore the navigation menu: Bookings, Contracts, Invoices, Calendar, and Settings'
    ],
    tips: [
      'The dashboard shows real-time stats: monthly revenue, active bookings, and pending invoices',
      'All pages are responsive and work on mobile devices',
      'Use the search functionality to quickly find specific bookings or contracts'
    ]
  },
  {
    id: 'email-setup',
    title: 'Email Forwarding Setup',
    description: 'Automatically convert emails to enquiries',
    icon: <Mail className="h-5 w-5" />,
    steps: [
      'Forward client emails to leads@musobuddy.com',
      'AI automatically extracts client details, dates, and venues',
      'Enquiries appear instantly in your Bookings dashboard',
      'Review and edit AI-extracted information if needed',
      'Conflict detection runs automatically for date clashes'
    ],
    tips: [
      'Works with any email provider (Gmail, Outlook, Apple Mail, etc.)',
      'Forward voice message transcripts for phone enquiries',
      'Perfect for WhatsApp and SMS screenshots',
      'AI recognizes Encore booking platform emails with apply-now links'
    ]
  },
  {
    id: 'booking-management',
    title: 'Booking Management',
    description: 'Track enquiries and confirmed bookings',
    icon: <Calendar className="h-5 w-5" />,
    steps: [
      'View all bookings in the main Bookings dashboard',
      'Use filters to show specific booking statuses or date ranges',
      'Click any booking to view full details and conversation history',
      'Convert enquiries to confirmed bookings when clients accept',
      'Track booking progress from enquiry to payment completion'
    ],
    tips: [
      'Color-coded status system makes it easy to see booking progress at a glance',
      'Click "View Conversation" to see full email history with each client',
      'Use the search bar to quickly find bookings by client name or venue'
    ]
  },
  {
    id: 'contract-generation',
    title: 'Contract Generation',
    description: 'Create and send professional contracts',
    icon: <FileText className="h-5 w-5" />,
    steps: [
      'Click "Create Contract" from any confirmed booking',
      'Review and customize contract terms and pricing',
      'Add specific requirements or additional clauses if needed',
      'Generate PDF contract with professional branding',
      'Send contract link to client for digital signature'
    ],
    tips: [
      'Contracts auto-populate with booking and client details',
      'Digital signatures are legally binding in most jurisdictions',
      'You can download signed contracts as PDF files for your records'
    ]
  },
  {
    id: 'invoice-generation',
    title: 'Invoice & Payment Tracking',
    description: 'Generate invoices and track payments',
    icon: <DollarSign className="h-5 w-5" />,
    steps: [
      'Create invoices from confirmed bookings or manually',
      'Include all agreed fees, deposits, and expenses',
      'Add payment terms and your business bank details',
      'Send professional PDF invoices to clients',
      'Track payment status and send reminders for overdue invoices'
    ],
    tips: [
      'Invoices can be sent before or after performances',
      'Payment tracking helps you maintain cash flow',
      'Professional invoices increase likelihood of prompt payment'
    ]
  },
  {
    id: 'client-management',
    title: 'Client Address Book',
    description: 'Manage client contacts and relationships',
    icon: <Users className="h-5 w-5" />,
    steps: [
      'Add clients manually or from enquiries',
      'Store complete contact information',
      'Track client booking history',
      'Search and filter client records',
      'View client statistics and preferences'
    ],
    tips: [
      'Client details auto-fill when creating new contracts',
      'Useful for tracking repeat customers',
      'Search by name, email, or phone number'
    ]
  },
  {
    id: 'settings-customization',
    title: 'Settings & Customization',
    description: 'Configure MusoBuddy for your business',
    icon: <Settings className="h-5 w-5" />,
    steps: [
      'Complete your business profile with logo and contact details',
      'Set up bank details for invoice generation',
      'Configure default terms and conditions',
      'Customize email templates and branding',
      'Set notification preferences'
    ],
    tips: [
      'Professional business setup improves client perception',
      'Custom branding appears on all contracts and invoices',
      'Review settings periodically as your business grows'
    ]
  },
  {
    id: 'troubleshooting',
    title: '🔧 Troubleshooting Guide',
    description: 'Quick fixes for common problems',
    icon: <HelpCircle className="h-5 w-5" />,
    steps: [
      'PAGE WON\'T LOAD: Refresh browser, clear cache, try incognito/private browsing mode',
      'FEATURES MISSING: Ensure you\'re logged in and have completed initial settings setup',
      'EMAIL NOT WORKING: Check spam folder, verify email forwarding setup, try different email client',
      'PDF WON\'T GENERATE: Try different browser, disable ad blockers, ensure popup blocker allows MusoBuddy',
      'DATA NOT SAVING: Check internet connection, wait for page to fully load before submitting forms',
      'MOBILE ISSUES: Update browser app, clear browser cache, try desktop version if critical',
      'LOGIN PROBLEMS: Reset password, clear cookies, check email for verification messages'
    ],
    tips: [
      'Most issues are resolved with a browser refresh',
      'Contact support if problems persist',
      'Try different browsers to isolate browser-specific issues',
      'Keep your browser updated for the best experience'
    ]
  }
];

export default function UserGuide() {
  const [selectedStep, setSelectedStep] = useState<string>('step-by-step');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showStepGuide, setShowStepGuide] = useState(false);
  const { isMobile } = useResponsive();
  const { user } = useAuth();

  // Determine if user is a beta tester
  const isBetaTester = user?.isBetaTester || user?.is_beta_tester || false;
  
  
  // Use appropriate guide steps based on beta status
  const guideSteps = isBetaTester ? betaGuideSteps : regularGuideSteps;
  
  const currentStep = guideSteps.find(step => step.id === selectedStep);

  const markAsComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const resetProgress = () => {
    setCompletedSteps(new Set());
  };

  // Show the interactive step guide if requested
  if (showStepGuide) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col content-container main-content">
          <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Target className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />
                  Interactive Step-by-Step Guide
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 hidden md:block">Complete MusoBuddy workflow in 45-60 minutes</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowStepGuide(false)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Guide Menu
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <BetaStepGuide onComplete={() => {
              setShowStepGuide(false);
              markAsComplete('step-by-step');
            }} />
          </div>
        </div>
        
        {isMobile && <MobileNav />}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col content-container main-content">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {isBetaTester ? (
                  <>
                    <Star className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />
                    Beta Tester Guide
                  </>
                ) : (
                  <>
                    <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                    User Guide
                  </>
                )}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 hidden md:block">
                {isBetaTester 
                  ? "Complete guide for MusoBuddy beta testers with troubleshooting & feedback"
                  : "Complete guide to using MusoBuddy for your music business"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {completedSteps.size} of {guideSteps.length} completed
            </Badge>
            <Button onClick={resetProgress} variant="outline" size="sm">
              Reset Progress
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Guide Navigation - Hidden on mobile, shown on desktop */}
            <div className="hidden md:block w-80 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-4">
                <h2 className="font-bold mb-6 flex items-center gap-3 text-lg text-gray-800 dark:text-gray-200">
                  {isBetaTester ? (
                    <>
                      <div className="p-2 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-lg">
                        <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      Beta Testing Guide
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      User Guide
                    </>
                  )}
                </h2>
                <div className="space-y-3">
                  {guideSteps.map((step, index) => (
                    <Button
                      key={step.id}
                      variant={selectedStep === step.id ? "default" : "ghost"}
                      className={`w-full justify-start h-auto p-4 rounded-lg transition-all duration-200 ${
                        selectedStep === step.id 
                          ? 'bg-gradient-to-r bg-primary text-white shadow-lg' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      }`}
                      onClick={() => setSelectedStep(step.id)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-shrink-0">
                          {completedSteps.has(step.id) ? (
                            <div className="p-1 bg-green-100 rounded-full">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                          ) : (
                            <div className={`p-1 rounded-full ${
                              selectedStep === step.id 
                                ? 'bg-white/20 text-white' 
                                : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                            }`}>
                              {step.icon}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-sm">{step.title}</div>
                          <div className={`text-xs mt-1 ${
                            selectedStep === step.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                          }`}>{step.description}</div>
                        </div>
                        <div className={`text-xs font-bold ${
                          selectedStep === step.id ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              {/* Mobile Navigation Dropdown - Show above content on mobile */}
              <div className="md:hidden mb-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h2 className="font-bold mb-4 flex items-center gap-3 text-lg text-gray-800 dark:text-gray-200">
                    <div className="p-2 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-lg">
                      <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    Beta Testing Guide
                  </h2>
                  <div className="space-y-2">
                    {guideSteps.map((step, index) => (
                      <Button
                        key={step.id}
                        variant={selectedStep === step.id ? "default" : "ghost"}
                        className={`w-full justify-start h-auto p-3 rounded-lg transition-all duration-200 ${
                          selectedStep === step.id 
                            ? 'bg-gradient-to-r bg-primary text-white shadow-lg' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                        }`}
                        onClick={() => setSelectedStep(step.id)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex-shrink-0">
                            {completedSteps.has(step.id) ? (
                              <div className="p-1 bg-green-100 rounded-full">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </div>
                            ) : (
                              <div className={`p-1 rounded-full ${
                                selectedStep === step.id 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                              }`}>
                                {step.icon}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-sm">{step.title}</div>
                            <div className={`text-xs mt-1 ${
                              selectedStep === step.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                            }`}>{step.description}</div>
                          </div>
                          <div className={`text-xs font-bold ${
                            selectedStep === step.id ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              {currentStep && (
                <div className="max-w-4xl mx-auto">
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r bg-primary text-white">
                      <div className="flex items-center gap-4">
                        <div className="p-2 md:p-3 bg-white/20 rounded-lg">
                          {currentStep.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg md:text-xl">{currentStep.title}</CardTitle>
                          <p className="text-white/90 mt-1 text-sm md:text-base">{currentStep.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-4 md:space-y-6">
                        {/* Step-by-step Instructions */}
                        <div>
                          <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
                            <Target className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                            Step-by-step Instructions
                          </h3>
                          <div className="space-y-3">
                            {currentStep.steps.map((step, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/30 dark:border-primary/40">
                                <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
                                  {index + 1}
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 pt-1 text-sm md:text-base">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tips & Best Practices */}
                        {currentStep.tips && (
                          <div>
                            <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
                              Tips & Best Practices
                            </h3>
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <ul className="space-y-2">
                                {currentStep.tips.map((tip, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <Lightbulb className="h-3 w-3 md:h-4 md:w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300 text-sm md:text-base">{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Action Buttons */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            {currentStep.id === 'step-by-step' ? (
                              <Button
                                onClick={() => setShowStepGuide(true)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg w-full md:w-auto text-lg py-3 px-6"
                              >
                                <Target className="h-5 w-5 mr-2" />
                                Start Step-by-Step Guide
                              </Button>
                            ) : (
                              <Button
                                onClick={() => markAsComplete(currentStep.id)}
                                disabled={completedSteps.has(currentStep.id)}
                                className={`${
                                  completedSteps.has(currentStep.id) 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'bg-green-600 hover:bg-green-700'
                                } shadow-md w-full md:w-auto`}
                              >
                                {completedSteps.has(currentStep.id) ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Completed
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Complete
                                  </>
                                )}
                              </Button>
                            )}

                            <div className="flex items-center gap-3 w-full md:w-auto">
                              {selectedStep !== 'step-by-step' && (
                                <Button
                                  variant="outline"
                                  className="border-purple-300 text-primary hover:bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-900/20 flex-1 md:flex-none"
                                  onClick={() => {
                                    const currentIndex = guideSteps.findIndex(s => s.id === selectedStep);
                                    if (currentIndex > 0) {
                                      setSelectedStep(guideSteps[currentIndex - 1].id);
                                    }
                                  }}
                                >
                                  Previous
                                </Button>
                              )}
                              
                              {selectedStep !== 'beta-timeline' && (
                                <Button
                                  className="bg-primary hover:bg-purple-700 shadow-md flex-1 md:flex-none"
                                  onClick={() => {
                                    const currentIndex = guideSteps.findIndex(s => s.id === selectedStep);
                                    if (currentIndex < guideSteps.length - 1) {
                                      setSelectedStep(guideSteps[currentIndex + 1].id);
                                    }
                                  }}
                                >
                                  Next
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isMobile && <MobileNav />}
    </div>
  );
}