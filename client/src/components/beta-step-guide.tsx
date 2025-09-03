import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Settings,
  Mail,
  Calendar,
  FileText,
  CreditCard,
  Star,
  Target,
  AlertCircle,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Clock
} from 'lucide-react';

interface StepGuideStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  actions: {
    title: string;
    description: string;
    actionType: 'navigate' | 'input' | 'check' | 'wait';
    targetUrl?: string;
    checkDescription?: string;
  }[];
  tips: string[];
  commonIssues?: {
    issue: string;
    solution: string;
  }[];
}

const stepGuideSteps: StepGuideStep[] = [
  {
    id: 'welcome',
    title: '🎯 Your First Hour with MusoBuddy',
    description: 'Complete your first booking workflow from setup to invoice',
    estimatedTime: '45-60 minutes',
    actions: [
      {
        title: 'Welcome to Beta Testing!',
        description: 'You\'re about to complete your first end-to-end workflow in MusoBuddy. This will take you through everything from initial setup to sending your first invoice.',
        actionType: 'check',
        checkDescription: 'Ready to begin your MusoBuddy journey'
      },
      {
        title: 'What You\'ll Accomplish',
        description: 'By the end of this guide, you\'ll have: ✅ Set up your business profile ✅ Created your first booking ✅ Generated a professional contract ✅ Created and sent an invoice ✅ Learned the core MusoBuddy workflow',
        actionType: 'check',
        checkDescription: 'Understand what we\'ll be doing'
      }
    ],
    tips: [
      'Keep this guide open in a separate tab so you can follow along',
      'Don\'t worry about making mistakes - this is beta testing!',
      'Take screenshots of anything confusing for feedback',
      'The whole process should take about 45-60 minutes'
    ]
  },
  {
    id: 'initial-setup',
    title: '⚙️ Step 1: Complete Your Business Setup',
    description: 'Essential configuration for professional documents',
    estimatedTime: '10-15 minutes',
    actions: [
      {
        title: 'Navigate to Settings',
        description: 'Click "Settings" in the sidebar menu to access your business configuration.',
        actionType: 'navigate',
        targetUrl: '/settings'
      },
      {
        title: 'Fill in Business Details',
        description: 'Complete all the following fields:\n• Business name and address\n• Contact phone and email\n• Your primary instrument\n• Business type (Solo performer, Band, etc.)',
        actionType: 'input',
        checkDescription: 'Business profile is complete'
      },
      {
        title: 'Set Up Bank Details',
        description: 'Add your bank account information:\n• Bank name\n• Account holder name\n• Account number\n• Sort code\nThis appears on your invoices for client payments.',
        actionType: 'input',
        checkDescription: 'Bank details added'
      },
      {
        title: 'Configure Email Settings',
        description: 'Set up your email prefix for receiving enquiries:\n• Choose a unique email prefix\n• This creates your@enquiries.musobuddy.com address\n• This is how clients will send you booking requests',
        actionType: 'input',
        checkDescription: 'Email prefix configured'
      },
      {
        title: 'Check Completion Percentage',
        description: 'Look for the completion percentage at the top of Settings. It should show 80%+ when done.',
        actionType: 'check',
        checkDescription: 'Settings show 80%+ completion'
      }
    ],
    tips: [
      'Your business address appears on all contracts and invoices',
      'Bank details are never shared - only shown on your invoices',
      'Email prefix cannot be changed later, so choose carefully',
      'All fields marked with * are required for document generation'
    ],
    commonIssues: [
      {
        issue: 'Email prefix says "already taken"',
        solution: 'Try adding numbers or your location (e.g., johnsmith123, timmanchester)'
      },
      {
        issue: 'Settings page won\'t save changes',
        solution: 'Check all required fields are filled, then refresh page and try again'
      }
    ]
  },
  {
    id: 'first-booking',
    title: '📅 Step 2: Create Your First Booking',
    description: 'Add a booking to start your workflow',
    estimatedTime: '5-10 minutes',
    actions: [
      {
        title: 'Navigate to Bookings',
        description: 'Click "Bookings" in the sidebar to access the bookings dashboard.',
        actionType: 'navigate',
        targetUrl: '/bookings'
      },
      {
        title: 'Add New Booking',
        description: 'Click the "+ Add Booking" button to create your first booking entry.',
        actionType: 'input',
        checkDescription: 'New booking form is open'
      },
      {
        title: 'Enter Client Information',
        description: 'Fill in the client details:\n• Client name: Use a real or test name\n• Email: Use your own email for testing\n• Phone: Add a contact number',
        actionType: 'input',
        checkDescription: 'Client information entered'
      },
      {
        title: 'Add Event Details',
        description: 'Complete the booking information:\n• Event type: Wedding, corporate, birthday, etc.\n• Date: Choose a future date\n• Time: Start and end times\n• Venue: Add a location name and address\n• Fee: Enter your standard rate',
        actionType: 'input',
        checkDescription: 'Event details completed'
      },
      {
        title: 'Set Booking Status',
        description: 'Change the status from "New" to "Quoted" - this indicates you\'ve provided a quote to the client.',
        actionType: 'input',
        checkDescription: 'Status set to Quoted'
      },
      {
        title: 'Save the Booking',
        description: 'Click "Save Booking" to create your first entry. You should see it appear in your bookings list.',
        actionType: 'check',
        checkDescription: 'Booking appears in the list'
      }
    ],
    tips: [
      'Use realistic data - it makes testing more meaningful',
      'The venue address helps with travel planning later',
      'You can edit any booking details after saving',
      'Status workflow: New → Quoted → Confirmed → Completed'
    ],
    commonIssues: [
      {
        issue: 'Date picker not working',
        solution: 'Try clicking directly on the calendar icon, or type date manually'
      },
      {
        issue: 'Booking not saving',
        solution: 'Ensure all required fields (marked with *) are completed'
      }
    ]
  },
  {
    id: 'generate-contract',
    title: '📄 Step 3: Generate Your First Contract',
    description: 'Create a professional contract from your booking',
    estimatedTime: '8-12 minutes',
    actions: [
      {
        title: 'Navigate to Contracts',
        description: 'Click "Contracts" in the sidebar to access contract management.',
        actionType: 'navigate',
        targetUrl: '/contracts'
      },
      {
        title: 'Create New Contract',
        description: 'Click "+ New Contract" and select "From Booking". Choose the booking you just created.',
        actionType: 'input',
        checkDescription: 'Contract form opens with booking data pre-filled'
      },
      {
        title: 'Review Contract Details',
        description: 'Check that all information is correct:\n• Client details auto-filled\n• Event date, time, and venue\n• Performance fee\n• Your business details from settings',
        actionType: 'check',
        checkDescription: 'All contract details look correct'
      },
      {
        title: 'Add Contract Terms',
        description: 'Review and customize the contract terms:\n• Performance requirements\n• Cancellation policy\n• Payment terms\n• Equipment responsibilities\nDefault terms are Musicians Union compliant.',
        actionType: 'input',
        checkDescription: 'Contract terms reviewed and customized'
      },
      {
        title: 'Generate PDF Preview',
        description: 'Click "Preview Contract" to generate the PDF. This shows exactly what the client will see.',
        actionType: 'check',
        checkDescription: 'PDF preview opens showing professional contract'
      },
      {
        title: 'Save Contract',
        description: 'If the preview looks good, go back and click "Save Contract". The status should show as "Draft".',
        actionType: 'check',
        checkDescription: 'Contract saved with Draft status'
      }
    ],
    tips: [
      'Preview contracts before sending - this catches formatting issues',
      'Default terms are legally sound but you can customize them',
      'Your business branding automatically appears on contracts',
      'Contracts are stored securely in the cloud'
    ],
    commonIssues: [
      {
        issue: 'PDF won\'t generate or shows blank',
        solution: 'Try a different browser (Chrome works best) or disable ad blockers'
      },
      {
        issue: 'Business details missing from contract',
        solution: 'Go back to Settings and ensure all business info is completed'
      }
    ]
  },
  {
    id: 'send-contract',
    title: '📧 Step 4: Send Contract for Signing',
    description: 'Email the contract to your client for digital signature',
    estimatedTime: '3-5 minutes',
    actions: [
      {
        title: 'Open Contract for Sending',
        description: 'From the Contracts page, click on your draft contract to open it.',
        actionType: 'navigate',
        checkDescription: 'Contract details page is open'
      },
      {
        title: 'Send Contract',
        description: 'Click "Send Contract" button. This will email a secure signing link to your client.',
        actionType: 'input',
        checkDescription: 'Send confirmation appears'
      },
      {
        title: 'Check Email Sent',
        description: 'The contract status should change to "Sent". You (as the test client) should receive an email with the signing link.',
        actionType: 'check',
        checkDescription: 'Status shows as Sent and email received'
      },
      {
        title: 'Test Client Signing',
        description: 'Open the email you received and click the signing link. This opens the contract in a new window for digital signing.',
        actionType: 'input',
        checkDescription: 'Contract signing page opens'
      },
      {
        title: 'Complete Digital Signature',
        description: 'As the test client:\n• Review the contract terms\n• Enter your name\n• Draw or type your signature\n• Click "Sign Contract"',
        actionType: 'input',
        checkDescription: 'Contract signed successfully'
      },
      {
        title: 'Verify Signed Status',
        description: 'Return to your MusoBuddy Contracts page. The status should now show "Signed" and both parties should have received copies.',
        actionType: 'check',
        checkDescription: 'Contract status shows as Signed'
      }
    ],
    tips: [
      'Test the client experience - it should be simple and professional',
      'Signed contracts are automatically stored and backed up',
      'Both parties get email copies of the signed contract',
      'Digital signatures are legally binding in the UK'
    ],
    commonIssues: [
      {
        issue: 'Signing link doesn\'t work',
        solution: 'Check spam folder, try copying link directly, or try different browser'
      },
      {
        issue: 'Signature pad not working',
        solution: 'Try using a mouse instead of trackpad, or use "Type Signature" option'
      }
    ]
  },
  {
    id: 'create-invoice',
    title: '💰 Step 5: Generate and Send Invoice',
    description: 'Create a professional invoice from your signed contract',
    estimatedTime: '5-8 minutes',
    actions: [
      {
        title: 'Navigate to Invoices',
        description: 'Click "Invoices" in the sidebar to access invoice management.',
        actionType: 'navigate',
        targetUrl: '/invoices'
      },
      {
        title: 'Create Invoice from Contract',
        description: 'Click "+ New Invoice" and select "From Contract". Choose your signed contract.',
        actionType: 'input',
        checkDescription: 'Invoice form opens with contract data pre-filled'
      },
      {
        title: 'Review Invoice Details',
        description: 'Verify all information is correct:\n• Client details from contract\n• Invoice amount matches contract fee\n• Your business details and bank information\n• Due date (typically 30 days)',
        actionType: 'check',
        checkDescription: 'Invoice details are accurate'
      },
      {
        title: 'Customize Invoice',
        description: 'Add any additional items if needed:\n• Travel expenses\n• Equipment hire\n• Additional services\nOr just use the contract fee as is.',
        actionType: 'input',
        checkDescription: 'Invoice line items finalized'
      },
      {
        title: 'Generate Invoice PDF',
        description: 'Click "Preview Invoice" to see the PDF. It should show professional branding with your business details and bank info for payment.',
        actionType: 'check',
        checkDescription: 'Invoice PDF preview looks professional'
      },
      {
        title: 'Send Invoice',
        description: 'Go back and click "Send Invoice". This emails the invoice to your client with a PDF attachment.',
        actionType: 'input',
        checkDescription: 'Invoice sent and status updated'
      },
      {
        title: 'Test Invoice Receipt',
        description: 'Check your email for the invoice copy. It should include the PDF and payment instructions.',
        actionType: 'check',
        checkDescription: 'Invoice email received with PDF'
      }
    ],
    tips: [
      'Invoice numbers auto-increment to maintain sequence',
      'Bank details on invoices make it easy for clients to pay',
      'You can customize invoice templates in Settings',
      'Track payment status to manage cash flow'
    ],
    commonIssues: [
      {
        issue: 'Bank details not showing on invoice',
        solution: 'Return to Settings and ensure bank details are completely filled in'
      },
      {
        issue: 'PDF generation fails',
        solution: 'Try Chrome browser, disable ad blockers, and ensure popup blocker allows MusoBuddy'
      }
    ]
  },
  {
    id: 'complete-workflow',
    title: '✅ Step 6: Complete the Workflow',
    description: 'Finish your first booking and prepare for real use',
    estimatedTime: '5 minutes',
    actions: [
      {
        title: 'Mark Invoice as Paid',
        description: 'Go back to Invoices, find your test invoice, and mark it as "Paid". This completes the payment tracking.',
        actionType: 'input',
        checkDescription: 'Invoice status shows as Paid'
      },
      {
        title: 'Update Booking Status',
        description: 'Return to Bookings and change your test booking status from "Quoted" to "Confirmed" to reflect the signed contract.',
        actionType: 'input',
        checkDescription: 'Booking status updated to Confirmed'
      },
      {
        title: 'Review Dashboard',
        description: 'Visit the Dashboard to see your stats updated:\n• Monthly revenue should show your test invoice\n• Active bookings count\n• Contract and invoice counts',
        actionType: 'check',
        checkDescription: 'Dashboard reflects your test data'
      },
      {
        title: 'Clean Up Test Data (Optional)',
        description: 'If you want to start fresh, you can delete the test booking, contract, and invoice you created. Or keep them as examples.',
        actionType: 'input',
        checkDescription: 'Decided whether to keep or delete test data'
      }
    ],
    tips: [
      'Congratulations! You\'ve completed your first MusoBuddy workflow',
      'This same process works for all your real bookings',
      'The more you use it, the faster and more natural it becomes',
      'Consider setting up email forwarding next for automatic booking capture'
    ]
  },
  {
    id: 'next-steps',
    title: '🚀 What\'s Next?',
    description: 'Advanced features and real-world usage',
    estimatedTime: 'Ongoing',
    actions: [
      {
        title: 'Set Up Email Forwarding',
        description: 'Forward client emails to your@enquiries.musobuddy.com to automatically create bookings from email enquiries.',
        actionType: 'navigate',
        targetUrl: '/user-guide',
        checkDescription: 'Email forwarding configured'
      },
      {
        title: 'Upload Compliance Documents',
        description: 'Add your insurance certificates, PAT testing, and other professional documents to share with venues.',
        actionType: 'navigate',
        targetUrl: '/compliance',
        checkDescription: 'Compliance documents uploaded'
      },
      {
        title: 'Customize Templates',
        description: 'Personalize your contract and invoice templates to match your business style and requirements.',
        actionType: 'navigate',
        targetUrl: '/templates',
        checkDescription: 'Templates customized'
      },
      {
        title: 'Start Using for Real Bookings',
        description: 'Begin using MusoBuddy for your actual client enquiries, contracts, and invoices. The workflow is exactly the same!',
        actionType: 'check',
        checkDescription: 'Ready to use MusoBuddy for real business'
      },
      {
        title: 'Provide Beta Feedback',
        description: 'Share your experience, report any bugs, and suggest improvements through the Feedback page.',
        actionType: 'navigate',
        targetUrl: '/feedback',
        checkDescription: 'Feedback submitted'
      }
    ],
    tips: [
      'You\'re now ready to use MusoBuddy professionally!',
      'Each feature you tested has more advanced options to explore',
      'Your feedback as a beta tester is invaluable for improving the platform',
      'Welcome to streamlined musician administration!'
    ]
  }
];

interface BetaStepGuideProps {
  onComplete?: () => void;
}

export default function BetaStepGuide({ onComplete }: BetaStepGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  const currentStep = stepGuideSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / stepGuideSteps.length) * 100;

  const markActionComplete = (stepId: string, actionIndex: number) => {
    const actionId = `${stepId}-${actionIndex}`;
    setCompletedActions(prev => new Set([...prev, actionId]));
  };

  const isActionComplete = (stepId: string, actionIndex: number) => {
    const actionId = `${stepId}-${actionIndex}`;
    return completedActions.has(actionId);
  };

  const getStepProgress = (stepId: string, totalActions: number) => {
    const completedCount = Array.from({ length: totalActions }).filter((_, index) =>
      isActionComplete(stepId, index)
    ).length;
    return (completedCount / totalActions) * 100;
  };

  const handleNavigation = (url: string) => {
    setLocation(url);
  };

  const nextStep = () => {
    if (currentStepIndex < stepGuideSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else if (onComplete) {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const resetProgress = () => {
    setCompletedActions(new Set());
    setCurrentStepIndex(0);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="shadow-xl border-2 border-yellow-200 dark:border-yellow-700">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Beta Tester Step-by-Step Guide</CardTitle>
                <p className="text-white/90 text-sm">Your complete MusoBuddy onboarding workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Step {currentStepIndex + 1} of {stepGuideSteps.length}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={resetProgress}
                className="border-white/30 text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="bg-white/20" />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Current Step */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Play className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentStep.title}</h2>
                <p className="text-gray-600 dark:text-gray-300">{currentStep.description}</p>
                <Badge variant="outline" className="mt-2">
                  <Clock className="h-3 w-3 mr-1" />
                  {currentStep.estimatedTime}
                </Badge>
              </div>
            </div>

            {/* Step Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Step Progress</span>
                <span className="text-sm text-gray-500">
                  {Array.from({ length: currentStep.actions.length }).filter((_, index) =>
                    isActionComplete(currentStep.id, index)
                  ).length} of {currentStep.actions.length} completed
                </span>
              </div>
              <Progress value={getStepProgress(currentStep.id, currentStep.actions.length)} className="mb-4" />
            </div>

            {/* Actions */}
            <div className="space-y-4">
              {currentStep.actions.map((action, actionIndex) => {
                const isComplete = isActionComplete(currentStep.id, actionIndex);
                
                return (
                  <div
                    key={actionIndex}
                    className={`p-4 border rounded-lg transition-all duration-200 ${
                      isComplete
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 mt-0.5 ${
                        isComplete ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {isComplete ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-current" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold mb-2 ${
                          isComplete ? 'text-green-800 dark:text-green-200' : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {action.title}
                        </h3>
                        
                        <p className={`text-sm mb-3 whitespace-pre-line ${
                          isComplete ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {action.description}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          {action.actionType === 'navigate' && action.targetUrl && (
                            <Button
                              size="sm"
                              onClick={() => handleNavigation(action.targetUrl!)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Go to {action.targetUrl.replace('/', '').replace('-', ' ')}
                            </Button>
                          )}
                          
                          {!isComplete && (
                            <Button
                              size="sm"
                              variant={isComplete ? "secondary" : "default"}
                              onClick={() => markActionComplete(currentStep.id, actionIndex)}
                              className={isComplete ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {isComplete ? 'Completed' : 'Mark Complete'}
                            </Button>
                          )}
                        </div>
                        
                        {action.checkDescription && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                            ✓ {action.checkDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tips */}
          {currentStep.tips && currentStep.tips.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Star className="h-4 w-4 text-yellow-500" />
                Pro Tips
              </h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <ul className="space-y-2">
                  {currentStep.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                      <Star className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Common Issues */}
          {currentStep.commonIssues && currentStep.commonIssues.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Common Issues & Solutions
              </h3>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                <div className="space-y-3">
                  {currentStep.commonIssues.map((issue, index) => (
                    <div key={index}>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        Problem: {issue.issue}
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300 ml-4">
                        Solution: {issue.solution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous Step
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Step {currentStepIndex + 1} of {stepGuideSteps.length}
              </p>
            </div>

            <Button
              onClick={nextStep}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700"
            >
              {currentStepIndex === stepGuideSteps.length - 1 ? 'Complete Guide' : 'Next Step'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}