import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function GoogleCalendarCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          // Handle OAuth error
          if (window.opener) {
            window.opener.postMessage({
              type: 'GOOGLE_CALENDAR_ERROR',
              message: 'Authorization was cancelled or failed'
            }, window.location.origin);
          }
          window.close();
          return;
        }

        if (code) {
          // Exchange code for tokens
          const response = await apiRequest('/api/google-calendar/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          if (response.ok) {
            // Success - notify parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_CALENDAR_SUCCESS'
              }, window.location.origin);
            }
            window.close();
          } else {
            throw new Error('Failed to connect Google Calendar');
          }
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_CALENDAR_ERROR',
            message: error.message || 'Failed to connect Google Calendar'
          }, window.location.origin);
        }
        
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Please wait while we complete the connection...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}