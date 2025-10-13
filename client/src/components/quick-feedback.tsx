import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

interface QuickFeedbackProps {
  buttonText?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
}

export function QuickFeedback({ buttonText = "Feedback", buttonVariant = "default", buttonSize = "sm" }: QuickFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    // Check if user has dismissed feedback widget in this session
    return localStorage.getItem('feedback-dismissed') === 'true';
  });

  if (isDismissed) {
    return null;
  }

  if (!isOpen) {
    return (
      <Button 
        variant={buttonVariant} 
        size={buttonSize}
        onClick={() => setIsOpen(true)}
        className="shadow-lg"
      >
        {buttonText}
      </Button>
    );
  }

  return (
    <Card className="w-80 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Quick Feedback</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsDismissed(true);
            localStorage.setItem('feedback-dismissed', 'true');
          }}
          className="h-6 w-6 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Help us improve MusoBuddy with your feedback
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Send Feedback
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuickFeedback;