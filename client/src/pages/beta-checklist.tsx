import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BookOpen, 
  Menu, 
  RotateCcw, 
  CheckCircle2,
  Calendar,
  FileText,
  DollarSign,
  MessageSquare,
  Users,
  Settings,
  Smartphone,
  Globe,
  Shield,
  Zap
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  critical?: boolean;
}

interface ChecklistSection {
  id: string;
  title: string;
  icon: JSX.Element;
  description: string;
  items: ChecklistItem[];
}

const checklistSections: ChecklistSection[] = [
  {
    id: 'account-setup',
    title: 'Account & Setup',
    icon: <Settings className="h-5 w-5" />,
    description: 'Initial account configuration and basic settings',
    items: [
      {
        id: 'login-signup',
        title: 'Login & Signup Process',
        description: 'Test account creation, email verification, and login flow',
        critical: true
      },
      {
        id: 'profile-setup',
        title: 'Profile Information',
        description: 'Update personal details, business information, and contact preferences'
      },
      {
        id: 'theme-settings',
        title: 'Theme & Appearance',
        description: 'Test different color themes and verify PDF branding consistency'
      },
      {
        id: 'notification-settings',
        title: 'Notification Preferences',
        description: 'Configure email notifications and test SMS settings (Premium only)'
      }
    ]
  },
  {
    id: 'booking-management',
    title: 'Booking Management',
    icon: <Calendar className="h-5 w-5" />,
    description: 'Core booking creation, editing, and management features',
    items: [
      {
        id: 'create-booking',
        title: 'Create New Booking',
        description: 'Add new booking with all details including dates, fees, venue information',
        critical: true
      },
      {
        id: 'edit-booking',
        title: 'Edit Existing Booking',
        description: 'Modify booking details and verify changes save correctly'
      },
      {
        id: 'booking-status',
        title: 'Booking Status Updates',
        description: 'Test status changes (confirmed, completed, cancelled) and Encore toggles'
      },
      {
        id: 'calendar-sync',
        title: 'Google Calendar Sync',
        description: 'Connect Google Calendar and verify bookings sync correctly'
      },
      {
        id: 'venue-autocomplete',
        title: 'Venue Auto-complete',
        description: 'Test venue name suggestions and address auto-fill functionality'
      },
      {
        id: 'travel-expenses',
        title: 'Travel Expenses & Fees',
        description: 'Verify performance fees display correctly and travel expenses integrate properly'
      }
    ]
  },
  {
    id: 'contracts-invoices',
    title: 'Contracts & Invoices',
    icon: <FileText className="h-5 w-5" />,
    description: 'Document generation, signing, and payment processing',
    items: [
      {
        id: 'contract-generation',
        title: 'Contract Creation',
        description: 'Generate contracts from bookings with correct details and formatting',
        critical: true
      },
      {
        id: 'contract-signing',
        title: 'Digital Contract Signing',
        description: 'Test client portal contract signing process and email notifications'
      },
      {
        id: 'invoice-creation',
        title: 'Invoice Generation',
        description: 'Create invoices with correct amounts, including travel expenses if applicable'
      },
      {
        id: 'invoice-payment',
        title: 'Payment Processing',
        description: 'Test Stripe payment integration and payment status updates'
      },
      {
        id: 'pdf-themes',
        title: 'PDF Theme Consistency',
        description: 'Verify PDFs match selected theme colors and maintain professional appearance'
      },
      {
        id: 'document-storage',
        title: 'Document Storage & Access',
        description: 'Upload documents, set expiry dates, and test secure access links'
      }
    ]
  },
  {
    id: 'client-communication',
    title: 'Client Communication',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Email processing, conversations, and client interactions',
    items: [
      {
        id: 'email-parsing',
        title: 'Email Parsing & AI Processing',
        description: 'Send test emails and verify AI correctly extracts booking information',
        critical: true
      },
      {
        id: 'conversation-management',
        title: 'Client Conversations',
        description: 'Test conversation threads, reply functionality, and message history'
      },
      {
        id: 'client-portal',
        title: 'Client Portal Experience',
        description: 'Test client portal access, contract signing, and collaborative planning forms'
      },
      {
        id: 'email-templates',
        title: 'Email Template Rendering',
        description: 'Verify HTML emails display correctly in different email clients'
      },
      {
        id: 'notification-delivery',
        title: 'Notification Delivery',
        description: 'Test email notifications for contracts, invoices, and booking updates'
      }
    ]
  },
  {
    id: 'address-book',
    title: 'Address Book & Clients',
    icon: <Users className="h-5 w-5" />,
    description: 'Client management and contact organization',
    items: [
      {
        id: 'client-profiles',
        title: 'Client Profile Management',
        description: 'Add, edit, and organize client contact information'
      },
      {
        id: 'booking-history',
        title: 'Client Booking History',
        description: 'View past and upcoming bookings for specific clients'
      },
      {
        id: 'client-search',
        title: 'Client Search & Filtering',
        description: 'Test search functionality and filtering options in address book'
      },
      {
        id: 'duplicate-detection',
        title: 'Duplicate Client Detection',
        description: 'Verify system detects and handles duplicate client entries'
      }
    ]
  },
  {
    id: 'mobile-responsive',
    title: 'Mobile & Responsive Design',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'Mobile device compatibility and responsive layouts',
    items: [
      {
        id: 'mobile-navigation',
        title: 'Mobile Navigation',
        description: 'Test sidebar menu, navigation, and mobile-specific layouts'
      },
      {
        id: 'mobile-booking-entry',
        title: 'Mobile Booking Entry',
        description: 'Create and edit bookings on mobile devices'
      },
      {
        id: 'mobile-invoice-sending',
        title: 'Mobile Invoice Sending',
        description: 'Test mobile invoice sender and client lookup functionality'
      },
      {
        id: 'tablet-layout',
        title: 'Tablet Layout Testing',
        description: 'Verify layouts work correctly on tablet-sized screens'
      }
    ]
  },
  {
    id: 'browser-compatibility',
    title: 'Browser & Platform Testing',
    icon: <Globe className="h-5 w-5" />,
    description: 'Cross-browser compatibility and platform testing',
    items: [
      {
        id: 'chrome-testing',
        title: 'Chrome Browser Testing',
        description: 'Test all functionality in Google Chrome'
      },
      {
        id: 'safari-testing',
        title: 'Safari Browser Testing',
        description: 'Test all functionality in Safari (Mac/iOS)'
      },
      {
        id: 'firefox-testing',
        title: 'Firefox Browser Testing',
        description: 'Test all functionality in Mozilla Firefox'
      },
      {
        id: 'edge-testing',
        title: 'Edge Browser Testing',
        description: 'Test all functionality in Microsoft Edge'
      }
    ]
  },
  {
    id: 'stress-testing',
    title: 'Stress & Edge Case Testing',
    icon: <Zap className="h-5 w-5" />,
    description: 'Test system limits and unusual scenarios',
    items: [
      {
        id: 'large-data-sets',
        title: 'Large Data Sets',
        description: 'Test with many bookings, clients, and documents to check performance'
      },
      {
        id: 'special-characters',
        title: 'Special Characters & Formatting',
        description: 'Test with unusual characters, long text, and special formatting'
      },
      {
        id: 'network-interruption',
        title: 'Network Interruption',
        description: 'Test behavior when internet connection is lost and restored'
      },
      {
        id: 'concurrent-users',
        title: 'Multiple Browser Tabs',
        description: 'Test opening multiple tabs and simultaneous operations'
      },
      {
        id: 'error-scenarios',
        title: 'Error Handling',
        description: 'Test invalid inputs, failed API calls, and error message clarity'
      }
    ]
  },
  {
    id: 'security-privacy',
    title: 'Security & Privacy',
    icon: <Shield className="h-5 w-5" />,
    description: 'Data protection and security verification',
    items: [
      {
        id: 'data-encryption',
        title: 'Data Encryption',
        description: 'Verify sensitive data is properly encrypted and secure'
      },
      {
        id: 'access-control',
        title: 'Access Control',
        description: 'Test that users can only access their own data'
      },
      {
        id: 'logout-security',
        title: 'Logout & Session Security',
        description: 'Verify proper logout and session timeout behavior'
      },
      {
        id: 'file-security',
        title: 'File Upload Security',
        description: 'Test file upload restrictions and secure document access'
      }
    ]
  }
];

export default function BetaChecklist() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile } = useResponsive();
  const { user } = useAuthContext();

  // Load checked items from localStorage on component mount
  useEffect(() => {
    const savedCheckedItems = localStorage.getItem('beta-checklist-checked');
    if (savedCheckedItems) {
      try {
        const parsed = JSON.parse(savedCheckedItems);
        setCheckedItems(new Set(parsed));
      } catch (error) {
        console.error('Error loading checklist state:', error);
      }
    }
  }, []);

  // Save checked items to localStorage whenever checkedItems changes
  useEffect(() => {
    localStorage.setItem('beta-checklist-checked', JSON.stringify(Array.from(checkedItems)));
  }, [checkedItems]);

  const handleItemCheck = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const resetProgress = () => {
    setCheckedItems(new Set());
  };

  const getTotalItems = () => {
    return checklistSections.reduce((total, section) => total + section.items.length, 0);
  };

  const getCompletedItems = () => {
    return checkedItems.size;
  };

  const getProgressPercentage = () => {
    const total = getTotalItems();
    const completed = getCompletedItems();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getSectionProgress = (section: ChecklistSection) => {
    const sectionItems = section.items.map(item => item.id);
    const completedInSection = sectionItems.filter(itemId => checkedItems.has(itemId)).length;
    return {
      completed: completedInSection,
      total: section.items.length,
      percentage: Math.round((completedInSection / section.items.length) * 100)
    };
  };

  if (!user?.is_beta_tester && !user?.isBetaTester) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-500" />
              Beta Access Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300">
              This checklist is only available to beta testers. Contact support if you believe you should have access.
            </p>
          </CardContent>
        </Card>
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
                <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
                Beta Testing Checklist
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 hidden md:block">
                Comprehensive testing checklist for MusoBuddy beta testers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-green-600 border-green-600">
              {getCompletedItems()} / {getTotalItems()} completed
            </Badge>
            <Button
              variant="outline"
              onClick={resetProgress}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Progress
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Overall Progress
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {getProgressPercentage()}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  Testing Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">How to Use This Checklist:</h4>
                    <ul className="space-y-1">
                      <li>• Work through each section systematically</li>
                      <li>• Check off items as you test them</li>
                      <li>• Focus on critical items first (marked with red badges)</li>
                      <li>• Your progress is automatically saved</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">When You Find Issues:</h4>
                    <ul className="space-y-1">
                      <li>• Use the Beta Feedback page to report bugs</li>
                      <li>• Include screenshots when possible</li>
                      <li>• Note browser and device information</li>
                      <li>• Describe steps to reproduce the issue</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checklist Sections */}
            {checklistSections.map((section) => {
              const progress = getSectionProgress(section);
              return (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {section.icon}
                        {section.title}
                      </CardTitle>
                      <Badge 
                        variant={progress.percentage === 100 ? "default" : "outline"}
                        className={progress.percentage === 100 ? "bg-green-500 text-white" : ""}
                      >
                        {progress.completed}/{progress.total}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {section.description}
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {section.items.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Checkbox
                            checked={checkedItems.has(item.id)}
                            onCheckedChange={(checked) => handleItemCheck(item.id, checked as boolean)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {item.title}
                              </h4>
                              {item.critical && (
                                <Badge variant="destructive" className="text-xs">
                                  Critical
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Completion Message */}
            {getProgressPercentage() === 100 && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CardContent className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                    Congratulations! Testing Complete
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    You've completed all testing items. Thank you for your thorough beta testing! 
                    Don't forget to submit any feedback through the Beta Feedback page.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}