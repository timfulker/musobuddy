import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Crown, Info, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function DemoBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Only show for non-subscribed users
  if (!user || user.isSubscribed || user.isLifetime || user.isAdmin || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-400 p-4 mb-6 rounded-lg relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-orange-100 transition-colors"
      >
        <X className="w-4 h-4 text-orange-600" />
      </button>
      
      <div className="flex items-start space-x-3">
        <Info className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="flex-grow">
          <h3 className="font-semibold text-orange-800 mb-2">
            You're exploring MusoBuddy Demo Mode
          </h3>
          <p className="text-orange-700 text-sm mb-3">
            You can browse all features and create test data, but some actions (like sending invoices to clients) 
            require a paid subscription. This ensures you can fully explore the platform before upgrading.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/pricing">
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                <Crown className="w-4 h-4 mr-1" />
                View Pricing Plans
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDismissed(true)}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              Continue Exploring
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}