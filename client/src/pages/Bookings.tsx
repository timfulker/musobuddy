import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Search, Filter, MapPin, Clock, User, DollarSign } from 'lucide-react';

const fetchBookings = async () => {
  const response = await fetch('/api/bookings');
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return response.json();
};

const createBooking = async (booking: any) => {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  if (!response.ok) throw new Error('Failed to create booking');
  return response.json();
};

const updateBooking = async ({ id, ...updates }: any) => {
  const response = await fetch(`/api/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update booking');
  return response.json();
};

const Bookings = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    contractId: '',
    eventDate: '',
    eventTime: '',
    venue: '',
    venueAddress: '',
    clientName: '',
    clientContact: '',
    fee: '',
    notes: '',
    equipmentList: [''],
    travelTime: '',
    setupNotes: ''
  });

  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading, error } = useQuery({
    queryKey: ['bookings'],
    queryFn: fetchBookings,
  });

  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowAddForm(false);
      setFormData({
        contractId: '',
        eventDate: '',
        eventTime: '',
        venue: '',
        venueAddress: '',
        clientName: '',
        clientContact: '',
        fee: '',
        notes: '',
        equipmentList: [''],
        travelTime: '',
        setupNotes: ''
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      equipmentList: formData.equipmentList.filter(item => item.trim() !== '')
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    const updates: any = { id, status };
    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    }
    updateMutation.mutate(updates);
  };

  const addEquipmentItem = () => {
    setFormData({
      ...formData,
      equipmentList: [...formData.equipmentList, '']
    });
  };

  const updateEquipmentItem = (index: number, value: string) => {
    const newList = [...formData.equipmentList];
    newList[index] = value;
    setFormData({ ...formData, equipmentList: newList });
  };

  const removeEquipmentItem = (index: number) => {
    const newList = formData.equipmentList.filter((_, i) => i !== index);
    setFormData({ ...formData, equipmentList: newList });
  };

  const filteredBookings = bookings.filter((booking: any) => {
    const matchesSearch = booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.venue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'confirmed', label: 'Confirmed', color: 'status-confirmed' },
    { value: 'completed', label: 'Completed', color: 'status-completed' },
    { value: 'cancelled', label: 'Cancelled', color: 'status-cancelled' },
  ];

  // Sort bookings by event date
  const sortedBookings = filteredBookings.sort((a: any, b: any) => 
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );

  // Separate upcoming and past bookings
  const now = new Date();
  const upcomingBookings = sortedBookings.filter((booking: any) => 
    new Date(booking.eventDate) >= now && booking.status === 'confirmed'
  );
  const pastBookings = sortedBookings.filter((booking: any) => 
    new Date(booking.eventDate) < now || booking.status === 'completed'
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 shadow-sm">
              <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
              <div className="h-6 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Bookings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your confirmed gigs and performances
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Booking
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Upcoming Gigs</p>
              <p className="text-2xl font-bold text-green-600">{upcomingBookings.length}</p>
            </div>
            <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed Gigs</p>
              <p className="text-2xl font-bold text-blue-600">{pastBookings.filter((b: any) => b.status === 'completed').length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                £{pastBookings
                  .filter((b: any) => b.status === 'completed')
                  .reduce((sum: number, b: any) => sum + parseFloat(b.fee || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg shadow-sm">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Booking Form */}
      {showAddForm && (
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Add New Booking</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Client Name *</label>
              <input
                type="text"
                required
                value={formData.clientName}
                onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Client Contact</label>
              <input
                type="text"
                value={formData.clientContact}
                onChange={(e) => setFormData({...formData, clientContact: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Event Date *</label>
              <input
                type="date"
                required
                value={formData.eventDate}
                onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Event Time</label>
              <input
                type="time"
                step="300"
                value={formData.eventTime}
                onChange={(e) => setFormData({...formData, eventTime: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Venue *</label>
              <input
                type="text"
                required
                value={formData.venue}
                onChange={(e) => setFormData({...formData, venue: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Venue Address</label>
              <input
                type="text"
                value={formData.venueAddress}
                onChange={(e) => setFormData({...formData, venueAddress: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Fee (£) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.fee}
                onChange={(e) => setFormData({...formData, fee: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Travel Time</label>
              <input
                type="text"
                value={formData.travelTime}
                onChange={(e) => setFormData({...formData, travelTime: e.target.value})}
                placeholder="e.g., 45 minutes"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Equipment List</label>
              {formData.equipmentList.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateEquipmentItem(index, e.target.value)}
                    placeholder="Equipment item"
                    className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {formData.equipmentList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEquipmentItem(index)}
                      className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addEquipmentItem}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                + Add Equipment Item
              </button>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Setup Notes</label>
              <textarea
                value={formData.setupNotes}
                onChange={(e) => setFormData({...formData, setupNotes: e.target.value})}
                rows={2}
                placeholder="Setup requirements, load-in details, etc."
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Additional notes about this booking"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Booking'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Upcoming Gigs</h2>
          {upcomingBookings.map((booking: any) => (
            <div key={booking.id} className="bg-card rounded-lg p-6 shadow-sm border border-green-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{booking.clientName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium status-${booking.status}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(booking.eventDate).toLocaleDateString()}</span>
                      {booking.eventTime && <span>at {booking.eventTime}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{booking.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>£{booking.fee}</span>
                    </div>
                    {booking.travelTime && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{booking.travelTime} travel</span>
                      </div>
                    )}
                  </div>
                  {booking.notes && (
                    <p className="text-muted-foreground mt-3 text-sm">{booking.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <select
                    value={booking.status}
                    onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                    className="text-sm px-2 py-1 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Bookings */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">All Bookings</h2>
        {sortedBookings.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No bookings found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first booking to get started'
              }
            </p>
          </div>
        ) : (
          sortedBookings.map((booking: any) => {
            const isUpcoming = new Date(booking.eventDate) >= now && booking.status === 'confirmed';
            return (
              <div key={booking.id} className={`bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow ${
                isUpcoming ? 'border-green-200' : ''
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{booking.clientName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium status-${booking.status}`}>
                        {booking.status}
                      </span>
                      {isUpcoming && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Upcoming
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(booking.eventDate).toLocaleDateString()}</span>
                        {booking.eventTime && <span>at {booking.eventTime}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{booking.venue}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>£{booking.fee}</span>
                      </div>
                      {booking.travelTime && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{booking.travelTime} travel</span>
                        </div>
                      )}
                    </div>
                    {booking.notes && (
                      <p className="text-muted-foreground mt-3 text-sm">{booking.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                      className="text-sm px-2 py-1 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Bookings;