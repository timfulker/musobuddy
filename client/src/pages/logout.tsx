import { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function LogoutPage() {
  const { logout } = useAuthContext();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    const performLogout = async () => {
      await logout();
      // Redirect directly to login page after logout
      setLocation('/login');
    };
    
    performLogout();
  }, [logout, setLocation]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Logging out...</p>
      </div>
    </div>
  );
}