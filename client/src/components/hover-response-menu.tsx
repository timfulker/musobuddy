import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, DollarSign, ThumbsUp, XCircle, Shield, Upload, MoreHorizontal } from "lucide-react";

interface HoverResponseMenuProps {
  booking: any;
  onAction: (action: string, booking: any) => void;
}

const HoverResponseMenu = ({ booking, onAction }: HoverResponseMenuProps) => {
  const [submenuVisible, setSubmenuVisible] = useState(false);
  const [submenuTimeout, setSubmenuTimeout] = useState<NodeJS.Timeout | null>(null);

  const showSubmenu = () => {
    if (submenuTimeout) {
      clearTimeout(submenuTimeout);
      setSubmenuTimeout(null);
    }
    setSubmenuVisible(true);
  };

  const hideSubmenu = () => {
    const timeout = setTimeout(() => {
      setSubmenuVisible(false);
    }, 200);
    setSubmenuTimeout(timeout);
  };

  const handleAction = (action: string) => {
    setSubmenuVisible(false);
    if (submenuTimeout) {
      clearTimeout(submenuTimeout);
      setSubmenuTimeout(null);
    }
    onAction(action, booking);
  };

  const menuItems = [
    { action: 'respond', label: 'Respond to Client', icon: MessageSquare },
    { action: 'contract', label: 'Issue Contract', icon: FileText },
    { action: 'invoice', label: 'Issue Invoice', icon: DollarSign },
    { action: 'thankyou', label: 'Send Thank You', icon: ThumbsUp },
    { action: 'edit', label: 'Edit Booking', icon: FileText },
    { action: 'send_compliance', label: 'Send Compliance', icon: Shield },
    { action: 'manage_documents', label: 'Manage Documents', icon: Upload },
    { action: 'rejected', label: 'Reject', icon: XCircle, className: 'text-red-600' },
  ];

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="sm"
        onMouseEnter={showSubmenu}
        onMouseLeave={hideSubmenu}
        onClick={(e) => e.stopPropagation()}
        className="relative"
      >
        <MoreHorizontal className="w-4 h-4 mr-1" />
        Respond
      </Button>
      
      {submenuVisible && (
        <div 
          className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[99999999]"
          onMouseEnter={showSubmenu}
          onMouseLeave={hideSubmenu}
          style={{ pointerEvents: 'auto' }}
        >
          {menuItems.map(({ action, label, icon: Icon, className }) => (
            <div
              key={action}
              className={`flex items-center px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${className || ''}`}
              onClick={() => handleAction(action)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HoverResponseMenu;