import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function GoogleCalendarCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // This component should not handle the OAuth callback
    // The callback is handled by the server route at /api/google-calendar/callback
    // This page should only be reached if something went wrong
    
    const handleCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const code = urlParams.get('code');

      if (error) {
        // Handle OAuth error
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_CALENDAR_ERROR',
            message: 'Authorization was cancelled or failed'
          }, window.location.origin);
        }
        setTimeout(() => window.close(), 2000);
        return;
      }

      if (code) {
        // If we get here with a code, redirect to the server callback
        // which will handle the token exchange and show the success page
        const userId = urlParams.get('state');
        window.location.href = `/api/google-calendar/callback?code=${code}&state=${userId}`;
        return;
      }

      // If we're here without code or error, something went wrong
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_CALENDAR_ERROR',
          message: 'Invalid callback - missing authorization code'
        }, window.location.origin);
      }
      setTimeout(() => window.close(), 2000);
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