import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logoImage from "/musobuddy-logo-purple.png";

export default function LandingPage() {
  const handleLogin = () => {
    // Navigate to Replit OAuth login
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="MusoBuddy" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-purple-800 dark:text-purple-200">
            Welcome to MusoBuddy
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Your complete music business management platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>✓ Manage bookings and contracts</p>
            <p>✓ Generate professional invoices</p>
            <p>✓ Track compliance documents</p>
            <p>✓ AI-powered workflow optimization</p>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            Login with Replit
          </Button>
          
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Secure authentication powered by Replit
          </p>
        </CardContent>
      </Card>
    </div>
  );
}