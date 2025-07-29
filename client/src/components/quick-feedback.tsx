import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function QuickFeedback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Help us improve MusoBuddy with your feedback
        </p>
        <Button variant="outline" size="sm">
          Send Feedback
        </Button>
      </CardContent>
    </Card>
  );
}

export default QuickFeedback;