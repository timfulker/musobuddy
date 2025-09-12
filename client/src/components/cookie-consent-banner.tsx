import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Link } from 'wouter';
import { 
  Cookie, 
  Settings, 
  Shield, 
  BarChart3, 
  Target,
  X,
  ChevronDown,
  ChevronUp 
} from 'lucide-react';
import {
  hasConsentDecision,
  acceptAllCookies,
  rejectNonEssentialCookies,
  saveConsentPreferences,
  getConsentPreferences,
  type CookieConsent
} from '@/lib/cookies';

interface CookieConsentBannerProps {
  className?: string;
}

export default function CookieConsentBanner({ className = '' }: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a consent decision
    if (!hasConsentDecision()) {
      setIsVisible(true);
    }

    // Load existing preferences if they exist
    const existingConsent = getConsentPreferences();
    if (existingConsent) {
      setPreferences({
        necessary: existingConsent.necessary,
        functional: existingConsent.functional,
        analytics: existingConsent.analytics,
        marketing: existingConsent.marketing
      });
    }
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    rejectNonEssentialCookies();
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    saveConsentPreferences(preferences);
    setIsVisible(false);
  };

  const handlePreferenceChange = (category: keyof typeof preferences, value: boolean) => {
    if (category === 'necessary') return; // Can't change necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleClose = () => {
    // If they close without deciding, treat as reject all
    rejectNonEssentialCookies();
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed inset-x-0 bottom-0 z-50 p-4 ${className}`}>
      <Card className="mx-auto max-w-4xl border-indigo-200 bg-white/95 backdrop-blur-sm shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Cookie className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Cookie Preferences</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                We use cookies to enhance your experience, provide essential functionality, and analyze our traffic. 
                You can customize your preferences below or accept all cookies to continue.{' '}
                <Link href="/cookie-policy" className="text-indigo-600 hover:text-indigo-700 underline">
                  Learn more
                </Link>
              </p>

              {showDetails && (
                <div className="space-y-4 mb-4">
                  <Separator />
                  
                  {/* Necessary Cookies */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-green-600" />
                        <Label className="text-sm font-medium text-gray-900">Necessary</Label>
                        <Badge variant="secondary" className="text-xs">Always Active</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Essential for website functionality, authentication, and security.
                      </p>
                    </div>
                    <Switch
                      checked={true}
                      disabled={true}
                      className="mt-1"
                    />
                  </div>

                  {/* Functional Cookies */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Settings className="h-4 w-4 text-blue-600" />
                        <Label className="text-sm font-medium text-gray-900">Functional</Label>
                      </div>
                      <p className="text-xs text-gray-500">
                        Remember your preferences and settings for a personalized experience.
                      </p>
                    </div>
                    <Switch
                      checked={preferences.functional}
                      onCheckedChange={(checked) => handlePreferenceChange('functional', checked)}
                      className="mt-1"
                    />
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="h-4 w-4 text-orange-600" />
                        <Label className="text-sm font-medium text-gray-900">Analytics</Label>
                      </div>
                      <p className="text-xs text-gray-500">
                        Help us understand how our website is used to improve performance.
                      </p>
                    </div>
                    <Switch
                      checked={preferences.analytics}
                      onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
                      className="mt-1"
                    />
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-purple-600" />
                        <Label className="text-sm font-medium text-gray-900">Marketing</Label>
                      </div>
                      <p className="text-xs text-gray-500">
                        Used to show relevant advertisements and measure campaign effectiveness.
                      </p>
                    </div>
                    <Switch
                      checked={preferences.marketing}
                      onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleAcceptAll}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white hover:text-white"
                >
                  Accept All
                </Button>
                
                <Button
                  onClick={handleRejectAll}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Reject All
                </Button>

                {showDetails && (
                  <Button
                    onClick={handleSavePreferences}
                    variant="outline"
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  >
                    Save Preferences
                  </Button>
                )}

                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800"
                >
                  {showDetails ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Customize
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600 shrink-0 mt-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}