import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Music,
  FileText,
  CreditCard,
  Calendar,
  Users,
  Settings,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Target,
  Clock,
  Zap
} from "lucide-react";

interface WelcomePageProps {
  onComplete: () => void;
  user: any;
}

export default function WelcomePage({ onComplete, user }: WelcomePageProps) {
  const [, setLocation] = useLocation();

  // Fetch settings to calculate completion percentage
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: !!user,
  });

  // Calculate settings completion percentage
  const calculateCompletionPercentage = () => {
    if (!settings) return 0;
    
    const requiredFields = [
      'primaryInstrument',
      'addressLine1',
      'city',
      'postcode',
      'businessEmail',
      'emailPrefix',
      'bankDetails'
    ];
    
    const completedFields = requiredFields.filter(field => {
      if (field === 'bankDetails') {
        return settings.bankDetails && Object.keys(settings.bankDetails).length > 0;
      }
      return settings[field] && settings[field].trim() !== '';
    });
    
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();

  const handleProceedToSettings = () => {
    onComplete();
    setLocation('/settings');
  };

  const handleProceedToDashboard = () => {
    onComplete();
    setLocation('/dashboard');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-blue-900/20 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-4xl w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-2xl border-0 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-400/20 to-purple-400/20 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-400/20 to-orange-400/20 rounded-full translate-y-24 -translate-x-24"></div>
          
          <CardContent className="p-8 relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <Sparkles className="w-6 h-6 text-yellow-500 ml-2 animate-pulse" />
              </div>
              
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Welcome to MusoBuddy!
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                Less admin, more music
              </p>
            </div>

            {/* Main content grid */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Left side - App overview */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                    <Target className="w-6 h-6 mr-2 text-blue-500" />
                    What MusoBuddy Does
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Booking Management</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Track gigs, manage client communications, and never miss a booking</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <FileText className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Professional Contracts</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Generate and send professional contracts with digital signatures</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <CreditCard className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Invoice & Payments</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Create invoices, track payments, and manage your finances</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <Users className="w-5 h-5 text-orange-500 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Client Management</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Maintain client details, conversation history, and relationship management</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Settings completion */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                    <Zap className="w-6 h-6 mr-2 text-yellow-500" />
                    Get the Most Out of MusoBuddy
                  </h2>
                  
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Settings className="w-5 h-5 text-yellow-600 mr-2" />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">Settings Completion</span>
                      </div>
                      <span className="text-2xl font-bold text-yellow-600">{completionPercentage}%</span>
                    </div>
                    
                    <Progress value={completionPercentage} className="mb-4" />
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <Clock className="w-4 h-4 mr-2 text-blue-500" />
                        <span>Complete your settings to unlock all features</span>
                      </div>
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        <span>Set up email integration for automatic booking processing</span>
                      </div>
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        <span>Configure bank details for invoice generation</span>
                      </div>
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        <span>Customize your professional branding</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick tip */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Pro Tip
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You can explore all features immediately, but completing your settings ensures MusoBuddy works perfectly with your workflow and generates professional documents with your branding.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleProceedToSettings}
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Settings className="w-5 h-5 mr-2" />
                Complete Settings First
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button 
                onClick={handleProceedToDashboard}
                variant="outline"
                size="lg"
                className="border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 font-semibold px-8 py-3 rounded-lg transition-all duration-200"
              >
                <Music className="w-5 h-5 mr-2" />
                Explore Dashboard
              </Button>
            </div>

            {/* Footer note */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Welcome aboard! You can access settings anytime from the sidebar menu.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}