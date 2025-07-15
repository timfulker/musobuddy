import { useState } from 'react';
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
    id: 'email-setup',
    title: 'Email Forwarding Setup',
    description: 'Automatically convert emails to enquiries',
    icon: <Mail className="h-5 w-5" />,
    steps: [
      'Forward client emails to leads@musobuddy.com',
      'AI automatically extracts client details, dates, and venues',
      'Enquiries appear instantly in your dashboard',
      'No manual data entry required'
    ],
    tips: [
      'Works with any email provider (Gmail, Outlook, etc.)',
      'Forward voice message transcripts for phone enquiries',
      'Perfect for WhatsApp and SMS screenshots'
    ]
  },
  {
    id: 'contract-management',
    title: 'Digital Contracts',
    description: 'Professional contract creation and signing',
    icon: <FileText className="h-5 w-5" />,
    steps: [
      'Create contracts from enquiries or manually',
      'Professional PDF generation with your branding',
      'Send contracts via email with signing links',
      'Clients sign digitally on any device',
      'Both parties receive signed contract copies'
    ],
    tips: [
      'Contracts work even if MusoBuddy is offline',
      'Digital signatures are legally binding',
      'Automatic reminders for unsigned contracts'
    ]
  },
  {
    id: 'invoice-system',
    title: 'Invoice Management',
    description: 'Streamlined invoicing and payment tracking',
    icon: <DollarSign className="h-5 w-5" />,
    steps: [
      'Create invoices from contracts or standalone',
      'Auto-generated sequential invoice numbers',
      'Professional PDF invoices with UK tax compliance',
      'Email invoices with online viewing links',
      'Track payments and send reminders'
    ],
    tips: [
      'Invoice amounts auto-calculate from contract fees',
      'Automatic overdue detection and reminders',
      'Professional branding on all invoices'
    ]
  },
  {
    id: 'calendar-system',
    title: 'Calendar & Booking Management',
    description: 'Track gigs and manage your schedule',
    icon: <Calendar className="h-5 w-5" />,
    steps: [
      'View all bookings in calendar format',
      'Import .ics files from Google Calendar/Apple Calendar',
      'Conflict detection for overlapping bookings',
      'Mark dates as unavailable',
      'Export calendar files for external calendars'
    ],
    tips: [
      'Calendar shows confirmed gigs, potential bookings, and conflicts',
      'Expired enquiries are hidden to keep calendar clean',
      'Works with all major calendar applications'
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile } = useResponsive();

  const currentStep = guideSteps.find(step => step.id === selectedStep);

  const markAsComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const resetProgress = () => {
    setCompletedSteps(new Set());
  };

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
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">User Guide</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 hidden md:block">Complete step-by-step guide to using MusoBuddy</p>
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
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  Getting Started
                </h2>
                <div className="space-y-3">
                  {guideSteps.map((step, index) => (
                    <Button
                      key={step.id}
                      variant={selectedStep === step.id ? "default" : "ghost"}
                      className={`w-full justify-start h-auto p-4 rounded-lg transition-all duration-200 ${
                        selectedStep === step.id 
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
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
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    Getting Started
                  </h2>
                  <div className="space-y-2">
                    {guideSteps.map((step, index) => (
                      <Button
                        key={step.id}
                        variant={selectedStep === step.id ? "default" : "ghost"}
                        className={`w-full justify-start h-auto p-3 rounded-lg transition-all duration-200 ${
                          selectedStep === step.id 
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
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
                    <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
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
                            <Target className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                            Step-by-step Instructions
                          </h3>
                          <div className="space-y-3">
                            {currentStep.steps.map((step, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
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

                            <div className="flex items-center gap-3 w-full md:w-auto">
                              {selectedStep !== 'email-setup' && (
                                <Button
                                  variant="outline"
                                  className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-900/20 flex-1 md:flex-none"
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
                                  className="bg-purple-600 hover:bg-purple-700 shadow-md flex-1 md:flex-none"
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