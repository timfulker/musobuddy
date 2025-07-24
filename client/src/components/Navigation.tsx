import { Link, useLocation } from 'wouter';
import { 
  Home, 
  MessageCircle, 
  FileText, 
  Receipt, 
  Calendar, 
  ShieldCheck,
  Music,
  Crown
} from 'lucide-react';

const Navigation = () => {
  const [location] = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/enquiries', label: 'Enquiries', icon: MessageCircle },
    { path: '/contracts', label: 'Contracts', icon: FileText },
    { path: '/invoices', label: 'Invoices', icon: Receipt },
    { path: '/bookings', label: 'Bookings', icon: Calendar },
    { path: '/compliance', label: 'Compliance', icon: ShieldCheck },
    { path: '/pricing', label: 'Upgrade', icon: Crown },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl text-foreground">MusoBuddy</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button (simplified for now) */}
          <div className="md:hidden">
            <Link href="/" className="text-foreground">
              Menu
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;