import { useState } from 'react';
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
  Target
} from 'lucide-react';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import { useResponsive } from '@/hooks/useResponsive';

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
    id: 'email-setup',
    title: 'Email Forwarding Setup',
    description: 'Set up automatic enquiry creation from your email',
    icon: <Mail className="h-5 w-5" />,
    steps: [
      'Forward any enquiry emails to leads@musobuddy.com',
      'The system will automatically parse client details, dates, and venues',
      'New enquiries appear in your dashboard within minutes',
      'Respond to enquiries directly from the platform'
    ],
    tips: [
      'Works with WhatsApp screenshots, phone conversation notes, and any text format',
      'AI extracts phone numbers, event dates, and venue information automatically',
      'Encore musician alerts are automatically processed with Apply Now buttons'
    ]
  },
  {
    id: 'contract-management',
    title: 'Digital Contract System',
    description: 'Create, send, and manage professional contracts',
    icon: <FileText className="h-5 w-5" />,
    steps: [
      'Create contracts from enquiries or standalone',
      'Customize contract terms and performance details',
      'Enable automatic reminders (1, 3, or 5 days)',
      'Send contracts to clients via email',
      'Clients sign digitally on any device',
      'Download signed contracts as professional PDFs'
    ],
    tips: [
      'Contract signing works 24/7 even if the app is offline',
      'URLs automatically regenerate every 6 days to prevent expiration',
      'Include custom messages with contract emails for personal touch'
    ]
  },
  {
    id: 'invoice-system',
    title: 'Invoice Management',
    description: 'Professional invoicing with automated features',
    icon: <DollarSign className="h-5 w-5" />,
    steps: [
      'Create invoices from contracts or standalone',
      'Auto-fill client details and performance information',
      'Sequential invoice numbering for legal compliance',
      'Send invoices via email with PDF attachments',
      'Track payment status (sent, overdue, paid)',
      'Send payment reminders and overdue notices'
    ],
    tips: [
      'Invoice amounts automatically calculate (performance fee minus deposit)',
      'UK tax compliance with VAT status declarations',
      'Bulk actions for managing multiple invoices efficiently'
    ]
  },
  {
    id: 'calendar-bookings',
    title: 'Calendar & Booking Management',
    description: 'Schedule and track your performances',
    icon: <Calendar className="h-5 w-5" />,
    steps: [
      'View all confirmed bookings in calendar format',
      'Import existing calendar events via .ics files',
      'Export bookings to Google Calendar, Apple Calendar, or Outlook',
      'Block dates for unavailability',
      'Track booking conflicts automatically',
      'Monitor upcoming gigs from dashboard'
    ],
    tips: [
      'Calendar works with all major calendar applications',
      'Expired enquiries are filtered out automatically',
      'Color-coded status system for easy visualization'
    ]
  },
  {
    id: 'settings-configuration',
    title: 'Business Settings',
    description: 'Configure your business profile and preferences',
    icon: <Settings className="h-5 w-5" />,
    steps: [
      'Add business name, address, and contact details',
      'Set up bank account information for invoices',
      'Configure default payment terms',
      'Customize email branding with your business name',
      'Set invoice numbering sequence',
      'Configure conflict detection settings'
    ],
    tips: [
      'Business details auto-populate on all invoices and contracts',
      'Email branding maintains professional appearance',
      'Invoice numbering ensures legal compliance'
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
  }
];

export default function UserGuide() {
  const [selectedStep, setSelectedStep] = useState<string>('email-setup');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const { isMobile } = useResponsive();

  const currentStep = guideSteps.find(step => step.id === selectedStep);

  const markAsComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const resetProgress = () => {
    setCompletedSteps(new Set());
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        {isMobile && (
          <header className="bg-white shadow-sm border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MobileNav />
                <div className="ml-12 md:ml-0">
                  <h1 className="text-xl font-semibold">User Guide</h1>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">User Guide</h1>
                <p className="text-gray-600">Complete step-by-step guide to using MusoBuddy</p>
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
          </header>
        )}

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Guide Navigation */}
            <div className="w-80 bg-white border-r overflow-y-auto">
              <div className="p-4">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Getting Started
                </h2>
                <div className="space-y-2">
                  {guideSteps.map((step) => (
                    <Button
                      key={step.id}
                      variant={selectedStep === step.id ? "default" : "ghost"}
                      className={`w-full justify-start h-auto p-3 ${
                        selectedStep === step.id ? 'bg-purple-600' : ''
                      }`}
                      onClick={() => setSelectedStep(step.id)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-shrink-0">
                          {completedSteps.has(step.id) ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="text-gray-400">{step.icon}</div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">{step.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{step.description}</div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Guide Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {currentStep && (
                <div className="max-w-4xl mx-auto">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                          {currentStep.icon}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{currentStep.title}</CardTitle>
                          <p className="text-gray-600 mt-1">{currentStep.description}</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-6">
                        {/* Video Tutorial */}
                        {currentStep.videoUrl && (
                          <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                              <PlayCircle className="h-4 w-4" />
                              Video Tutorial
                            </h3>
                            <div className="bg-gray-100 rounded-lg p-8 text-center">
                              <PlayCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                              <p className="text-gray-600">Video tutorial coming soon</p>
                            </div>
                          </div>
                        )}

                        {/* Step-by-step Instructions */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Step-by-step Instructions
                          </h3>
                          <div className="space-y-3">
                            {currentStep.steps.map((step, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600 mt-0.5">
                                  {index + 1}
                                </div>
                                <p className="text-gray-700">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tips & Best Practices */}
                        {currentStep.tips && (
                          <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                              <Lightbulb className="h-4 w-4" />
                              Tips & Best Practices
                            </h3>
                            <div className="bg-blue-50 rounded-lg p-4">
                              <ul className="space-y-2">
                                {currentStep.tips.map((tip, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-blue-800">{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                          <Button
                            onClick={() => markAsComplete(currentStep.id)}
                            disabled={completedSteps.has(currentStep.id)}
                            className="bg-green-600 hover:bg-green-700"
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

                          <div className="flex items-center gap-2">
                            {selectedStep !== 'email-setup' && (
                              <Button
                                variant="outline"
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
                            
                            {selectedStep !== 'client-management' && (
                              <Button
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
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}