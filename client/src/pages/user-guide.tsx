import React, { useState } from 'react';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import { useResponsive } from '@/hooks/useResponsive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  FileText, 
  DollarSign, 
  Calendar, 
  Settings,
  Users,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  BookOpen,
  Lightbulb,
  Target,
  Menu
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

const guideSteps: GuideStep[] = [
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
      'Signing links expire after 30 days for security',
      'No account creation required for clients',
      'Digital signatures meet UK legal requirements',
      'Both parties get immediate email confirmation'
    ]
  },
  {
    id: 'invoice-management',
    title: 'Invoice Creation & Tracking',
    description: 'Professional invoicing and payment tracking',
    icon: <DollarSign className="h-5 w-5" />,
    steps: [
      'Create invoices from contracts or manually',
      'Set payment terms and due dates (default in Settings)',
      'Generate professional PDF invoices with your branding',
      'Email invoices directly to clients',
      'Track payment status: Sent → Paid → Overdue'
    ],
    tips: [
      'Include performance date and deposit information',
      'Set up automatic payment reminders in Settings',
      'Export invoices for accounting software integration',
      'Mark invoices as paid when payment received'
    ]
  },
  {
    id: 'calendar-integration',
    title: 'Calendar Integration',
    description: 'Sync your bookings with external calendars',
    icon: <Calendar className="h-5 w-5" />,
    steps: [
      'Navigate to Settings → Calendar Integration',
      'Generate your unique calendar feed URL',
      'Subscribe to this feed in your preferred calendar app',
      'All confirmed bookings sync automatically',
      'Updates appear in real-time across all devices'
    ],
    tips: [
      'Works with Google Calendar, Apple Calendar, Outlook',
      'Only confirmed bookings appear in external calendar',
      'Calendar events include client name, venue, and time',
      'Private feed URL - keep it secure'
    ]
  },
  {
    id: 'settings-customization',
    title: 'Settings & Customization',
    description: 'Personalize your MusoBuddy experience',
    icon: <Settings className="h-5 w-5" />,
    steps: [
      'Add your business name, address, and contact details',
      'Set default payment terms and invoice due days',
      'Configure email templates for contracts and invoices',
      'Add custom gig types for your specific services',
      'Set up calendar integration and notification preferences'
    ],
    tips: [
      'Business details appear on all contracts and invoices',
      'Save time by setting sensible defaults',
      'Email templates can be customized with personal touch',
      'Custom gig types help with filtering and organization'
    ]
  }
];

export default function UserGuide() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string>('getting-started');
  const { isDesktop } = useResponsive();

  const currentStep = guideSteps.find(step => step.id === selectedStep) || guideSteps[0];

  const GuideContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Guide</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Learn how to make the most of your MusoBuddy account
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:flex">
          Version 2.0
        </Badge>
      </div>

      {/* Quick Start */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Target className="h-5 w-5" />
            Quick Start Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Set up your business details in Settings</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Forward your first client email to leads@musobuddy.com</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Create and send your first contract</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Generate your first professional invoice</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guide Steps Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {guideSteps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setSelectedStep(step.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-l-2 ${
                      selectedStep === step.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'border-transparent text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded ${selectedStep === step.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                        {step.icon}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{step.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{step.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Selected Step Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentStep.icon}
                {currentStep.title}
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-300">{currentStep.description}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Steps */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Step-by-Step Instructions
                </h3>
                <div className="space-y-3">
                  {currentStep.steps.map((step, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              {currentStep.tips && currentStep.tips.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Pro Tips
                    </h3>
                    <div className="space-y-2">
                      {currentStep.tips.map((tip, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Help */}
      <Card>
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Mail className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <h3 className="font-semibold mb-1">Email Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Get help from our support team
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <h3 className="font-semibold mb-1">Community Forum</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Connect with other musicians
              </p>
              <Button variant="outline" size="sm">
                Join Community
              </Button>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <BookOpen className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <h3 className="font-semibold mb-1">Feature Requests</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Suggest new features
              </p>
              <Button variant="outline" size="sm">
                Submit Idea
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-64 bg-white dark:bg-slate-900 shadow-xl border-r border-gray-200 dark:border-slate-700 fixed left-0 top-0 h-full z-30">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>
        <div className="flex-1 ml-64 min-h-screen">
          <div className="p-6">
            <GuideContent />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileNav />
      
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={`
        fixed left-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl z-50 
        transform transition-transform duration-300 ease-in-out md:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="min-h-screen p-4">
        <GuideContent />
      </div>
    </div>
  );
}