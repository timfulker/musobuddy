import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, DollarSign, ThumbsUp, XCircle, Shield, Upload, MoreHorizontal } from "lucide-react";

interface HoverResponseMenuProps {
  booking: any;
  onAction: (action: string, booking: any) => void;
}

const HoverResponseMenu = ({ booking, onAction }: HoverResponseMenuProps) => {
  const [submenuVisible, setSubmenuVisible] = useState(false);
  const [submenuTimeout, setSubmenuTimeout] = useState<NodeJS.Timeout | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState<'bottom' | 'top'>('bottom');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  const showSubmenu = () => {
    if (submenuTimeout) {
      clearTimeout(submenuTimeout);
      setSubmenuTimeout(null);
    }
    setSubmenuVisible(true);
    
    // Calculate positioning after showing
    setTimeout(() => {
      if (buttonRef.current && submenuRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const submenuHeight = submenuRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;
        
        // If submenu would go off the bottom, show it above the button
        if (buttonRect.bottom + submenuHeight > viewportHeight - 20) {
          setSubmenuPosition('top');
        } else {
          setSubmenuPosition('bottom');
        }
      }
    }, 10);
  };

  const hideSubmenu = () => {
    const timeout = setTimeout(() => {
      setSubmenuVisible(false);
    }, 300); // Longer delay to allow for clicking
    setSubmenuTimeout(timeout);
  };

  const handleAction = (action: string, event?: React.MouseEvent) => {
    console.log('HoverResponseMenu handleAction called with:', action);
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setSubmenuVisible(false);
    if (submenuTimeout) {
      clearTimeout(submenuTimeout);
      setSubmenuTimeout(null);
    }
    console.log('About to call onAction with:', action, booking);
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
        ref={buttonRef}
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
          ref={submenuRef}
          className={`absolute left-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[99999999] ${
            submenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          onMouseEnter={showSubmenu}
          onMouseLeave={hideSubmenu}
          style={{ pointerEvents: 'auto' }}
          onMouseDown={(e) => {
            // Prevent the menu from closing when starting to click
            e.preventDefault();
            if (submenuTimeout) {
              clearTimeout(submenuTimeout);
              setSubmenuTimeout(null);
            }
          }}
        >
          {menuItems.map(({ action, label, icon: Icon, className }) => (
            <div
              key={action}
              className={`flex items-center px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${className || ''}`}
              onMouseDown={(e) => {
                console.log('Mouse down on menu item:', action);
                // Use mousedown instead of click for more reliable triggering
                handleAction(action, e);
              }}
              onClick={(e) => {
                console.log('Menu item clicked:', action);
                // Backup click handler
                e.preventDefault();
                e.stopPropagation();
              }}
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