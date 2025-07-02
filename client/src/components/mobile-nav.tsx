import { Home, Inbox, Calendar, DollarSign, User } from "lucide-react";

export default function MobileNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
      <div className="flex justify-around">
        <button className="flex flex-col items-center space-y-1 py-2 text-purple-600">
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">Dashboard</span>
        </button>
        <button className="flex flex-col items-center space-y-1 py-2 text-gray-400">
          <Inbox className="w-6 h-6" />
          <span className="text-xs">Enquiries</span>
        </button>
        <button className="flex flex-col items-center space-y-1 py-2 text-gray-400">
          <Calendar className="w-6 h-6" />
          <span className="text-xs">Calendar</span>
        </button>
        <button className="flex flex-col items-center space-y-1 py-2 text-gray-400">
          <DollarSign className="w-6 h-6" />
          <span className="text-xs">Invoices</span>
        </button>
        <button className="flex flex-col items-center space-y-1 py-2 text-gray-400">
          <User className="w-6 h-6" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  );
}
