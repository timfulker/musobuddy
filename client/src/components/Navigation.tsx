import { Link, useLocation } from 'wouter';
import { 
  Home, 
  MessageCircle, 
  FileText, 
  Receipt, 
  Calendar, 
  ShieldCheck,
  Music,
  Crown,
  Settings as SettingsIcon,
  ChevronDown,
  FileType,
  UserCog
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Navigation = () => {
  const [location] = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/bookings', label: 'Bookings', icon: MessageCircle },
    { path: '/contracts', label: 'Contracts', icon: FileText },
    { path: '/invoices', label: 'Invoices', icon: Receipt },
  ];

  const settingsItems = [
    { path: '/settings', label: 'User Settings', icon: UserCog },
    { path: '/templates', label: 'Templates', icon: FileType },
    { path: '/compliance', label: 'Compliance', icon: ShieldCheck },
  ];

  // Check if any settings page is active
  const isSettingsActive = settingsItems.some(item => location === item.path);

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
                      : 'text-muted-foreground hover:text-primary-foreground hover:bg-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isSettingsActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-primary-foreground hover:bg-primary'
                  }`}
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span>Settings</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  return (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link
                        href={item.path}
                        className={`flex items-center space-x-2 w-full cursor-pointer ${
                          isActive ? 'bg-accent' : ''
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
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