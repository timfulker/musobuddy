import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Phone, Mail, Calendar, MapPin, Loader2, User } from 'lucide-react';
import { Link } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';

export default function MobileClientLookup() {
  const [searchTerm, setSearchTerm] = useState('');
  const isMobile = useIsMobile();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients'],
    select: (data: any[]) => data || []
  });

  // Filter clients based on search
  const filteredClients = clients?.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  ) || [];

  if (!isMobile) {
    // Redirect to regular address book on desktop
    window.location.href = '/address-book';
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg p-4">
        <h1 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
          Client Lookup
        </h1>
        <p className="text-sm text-green-700 dark:text-green-300">
          Find client contact details quickly
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-lg"
              autoFocus
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-500">Loading clients...</p>
          </div>
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))
        ) : searchTerm ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm text-gray-500">No clients match your search</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm text-gray-500">
              Start typing to search your clients
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ClientCardProps {
  client: any;
}

function ClientCard({ client }: ClientCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {client.name || 'Unnamed Client'}
            </h3>
            {client.company && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {client.company}
              </p>
            )}
          </div>
          <Badge variant="outline" className="ml-2">
            {client.bookingCount || 0} booking{client.bookingCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          {client.email && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Mail className="w-4 h-4 mr-3 flex-shrink-0" />
              <a 
                href={`mailto:${client.email}`}
                className="text-blue-600 dark:text-blue-400 hover:underline truncate"
              >
                {client.email}
              </a>
            </div>
          )}
          
          {client.phone && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Phone className="w-4 h-4 mr-3 flex-shrink-0" />
              <a 
                href={`tel:${client.phone}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {client.phone}
              </a>
            </div>
          )}

          {client.address && (
            <div className="flex items-start text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 mr-3 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{client.address}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/conversation?clientEmail=${client.email}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              Message
            </Button>
          </Link>
          
          <Link href={`/address-book?search=${client.email}`} className="flex-1">
            <Button variant="default" size="sm" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}