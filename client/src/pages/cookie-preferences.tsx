import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'wouter';
import { 
  Cookie, 
  Settings, 
  Shield, 
  BarChart3, 
  Target,
  ArrowLeft,
  Check,
  Info
} from 'lucide-react';
import {
  getConsentPreferences,
  saveConsentPreferences,
  clearNonEssentialCookies,
  hasConsentDecision,
  type CookieConsent
} from '@/lib/cookies';

export default function CookiePreferences() {
  const [preferences, setPreferences] = useState({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false
  });
  
  const [saved, setSaved] = useState(false);
  const [hasExistingConsent, setHasExistingConsent] = useState(false);

  useEffect(() => {
    // Load existing preferences
    const existingConsent = getConsentPreferences();
    const hasDecision = hasConsentDecision();
    
    setHasExistingConsent(hasDecision);
    
    if (existingConsent) {
      setPreferences({
        necessary: existingConsent.necessary,
        functional: existingConsent.functional,
        analytics: existingConsent.analytics,
        marketing: existingConsent.marketing
      });
    }
  }, []);

  const handlePreferenceChange = (category: keyof typeof preferences, value: boolean) => {
    if (category === 'necessary') return; // Can't change necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [category]: value
    }));
    setSaved(false);
  };

  const handleSave = () => {
    saveConsentPreferences(preferences);
    
    // If user disabled some categories, clear those cookies
    const existingConsent = getConsentPreferences();
    if (existingConsent) {
      const disabledCategories = [];
      if (existingConsent.functional && !preferences.functional) disabledCategories.push('functional');
      if (existingConsent.analytics && !preferences.analytics) disabledCategories.push('analytics');
      if (existingConsent.marketing && !preferences.marketing) disabledCategories.push('marketing');
      
      if (disabledCategories.length > 0) {
        clearNonEssentialCookies();
      }
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const cookieCategories = [
    {
      id: 'necessary' as const,
      icon: Shield,
      color: 'text-green-600',
      title: 'Necessary Cookies',
      description: 'These cookies are essential for the website to function properly. They enable core functionality such as security, network management, and accessibility.',
      alwaysActive: true,
      examples: [
        'Authentication and session management',
        'Security and fraud prevention',
        'Load balancing and performance',
        'Cookie consent preferences'
      ]
    },
    {
      id: 'functional' as const,
      icon: Settings,
      color: 'text-blue-600',
      title: 'Functional Cookies',
      description: 'These cookies allow the website to remember choices you make and provide enhanced, more personal features.',
      alwaysActive: false,
      examples: [
        'Language and region preferences',
        'User interface customizations',
        'Form auto-fill preferences',
        'Accessibility settings'
      ]
    },
    {
      id: 'analytics' as const,
      icon: BarChart3,
      color: 'text-orange-600',
      title: 'Analytics Cookies',
      description: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.',
      alwaysActive: false,
      examples: [
        'Page views and user journeys',
        'Performance and error monitoring',
        'Feature usage statistics',
        'A/B testing data'
      ]
    },
    {
      id: 'marketing' as const,
      icon: Target,
      color: 'text-purple-600',
      title: 'Marketing Cookies',
      description: 'These cookies are used to track visitors across websites to display relevant advertisements and measure campaign effectiveness.',
      alwaysActive: false,
      examples: [
        'Targeted advertising',
        'Social media integration',
        'Campaign tracking',
        'Retargeting pixels'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to MusoBuddy
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cookie Preferences</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your cookie preferences and understand how we use different types of cookies.
          </p>
        </div>

        {!hasExistingConsent && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You haven't set your cookie preferences yet. Please review the options below and save your preferences.
            </AlertDescription>
          </Alert>
        )}

        {saved && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your cookie preferences have been saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {cookieCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.id} className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className={`h-6 w-6 ${category.color} mt-1`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg text-gray-900 dark:text-white">
                            {category.title}
                          </CardTitle>
                          {category.alwaysActive && (
                            <Badge variant="secondary" className="text-xs">
                              Always Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences[category.id]}
                      onCheckedChange={(checked) => handlePreferenceChange(category.id, checked)}
                      disabled={category.alwaysActive}
                      className="mt-1"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Examples of {category.title.toLowerCase()}:
                    </Label>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {category.examples.map((example, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0 mt-2" />
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator className="my-8" />

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Learn more about how we use cookies in our{' '}
              <Link href="/cookie-policy" className="text-purple-600 hover:text-purple-700 underline">
                Cookie Policy
              </Link>
            </p>
          </div>
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Cookie className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}