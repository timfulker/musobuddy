import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Music, Calendar, MapPin, Users, Clock, Camera, Upload, Save, Sparkles, Heart, Volume2, Mic2, Settings, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';

export default function ClientPortal() {
  const [match, params] = useRoute('/client-portal/:contractId');
  const [token, setToken] = useState<string>('');
  const [formData, setFormData] = useState<any>({});
  const [activeTab, setActiveTab] = useState('event-info');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setToken(urlParams.get('token') || '');
    }
  }, []);

  const contractId = params?.contractId;

  // Fetch contract and client portal data
  const { data: portalData, isLoading, error } = useQuery({
    queryKey: ['client-portal', contractId, token],
    queryFn: () => apiRequest(`/api/client-portal/${contractId}?token=${token}`),
    enabled: !!contractId && !!token
  });

  // Update client portal data
  const updatePortalMutation = useMutation({
    mutationFn: (updates: any) => 
      apiRequest(`/api/client-portal/${contractId}/update`, {
        method: 'POST',
        body: JSON.stringify({ ...updates, token })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-portal', contractId, token] });
    }
  });

  const handleInputChange = (field: string, value: any) => {
    console.log(`Setting ${field} to:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updatePortalMutation.mutateAsync(formData);
      setFormData({});
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your event portal...</p>
        </div>
      </div>
    );
  }

  if (error || !portalData?.contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
              <p className="text-slate-600 mb-4">
                This client portal link is invalid or has expired. Please contact your performer for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contract = portalData.contract;
  const clientData = portalData.clientData || {};
  console.log('Client data received:', clientData);

  const themeColor = '#191970'; // MusoBuddy midnight blue

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <Music className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 bg-clip-text text-transparent">
                  Your Event Portal
                </h1>
                <p className="text-slate-600 mt-1 flex items-center">
                  <Sparkles className="h-4 w-4 mr-1 text-indigo-500" />
                  Contract #{contract.contractNumber} • {contract.clientName}
                </p>
              </div>
            </div>
            <Badge className="bg-green-50 text-green-700 border-green-200 px-3 py-1 font-medium">
              ✓ Contract Signed
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Event Overview */}
        <Card className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-indigo-900">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              Event Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100">
                <Label className="text-sm font-medium text-indigo-600 flex items-center mb-2">
                  <Calendar className="h-4 w-4 mr-1" />
                  Date
                </Label>
                <p className="text-xl font-bold text-slate-900">{new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100">
                <Label className="text-sm font-medium text-indigo-600 flex items-center mb-2">
                  <Clock className="h-4 w-4 mr-1" />
                  Time
                </Label>
                <p className="text-xl font-bold text-slate-900">
                  {contract.eventTime || 'TBC'} {contract.eventEndTime ? `- ${contract.eventEndTime}` : ''}
                </p>
                {contract.performanceDuration && (
                  <p className="text-sm text-purple-600 mt-1 flex items-center">
                    <Mic2 className="h-3 w-3 mr-1" />
                    Performance: {contract.performanceDuration}
                  </p>
                )}
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100">
                <Label className="text-sm font-medium text-indigo-600 flex items-center mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  Venue
                </Label>
                <p className="text-xl font-bold text-slate-900">{contract.venue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collaborative Portal */}
        <Card className="shadow-lg border-indigo-100">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-xl flex items-center">
              <Heart className="h-6 w-6 mr-2" />
              Collaborative Event Planning
            </CardTitle>
            <p className="text-indigo-100 opacity-90">
              Help us make your event perfect by sharing your preferences and requirements
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 bg-indigo-50 p-1 rounded-lg">
                <TabsTrigger 
                  value="event-info" 
                  className="flex items-center text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Event Info
                </TabsTrigger>
                <TabsTrigger 
                  value="music-requests"
                  className="flex items-center text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                >
                  <Volume2 className="h-4 w-4 mr-1" />
                  Music
                </TabsTrigger>
                <TabsTrigger 
                  value="special-moments"
                  className="flex items-center text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                >
                  <Heart className="h-4 w-4 mr-1" />
                  Special
                </TabsTrigger>
                <TabsTrigger 
                  value="logistics"
                  className="flex items-center text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Logistics
                </TabsTrigger>
                <TabsTrigger 
                  value="collaboration"
                  className="flex items-center text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Extras
                </TabsTrigger>
              </TabsList>

              {/* Event Info Tab */}
              <TabsContent value="event-info" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="venue-contact" className="text-slate-700 font-medium flex items-center">
                      <Users className="h-4 w-4 mr-2 text-indigo-500" />
                      Venue Contact Details
                    </Label>
                    <Input
                      id="venue-contact"
                      placeholder="On-the-day contact number"
                      className="border-indigo-200 focus:border-indigo-400 focus:ring-indigo-200"
                      value={formData.venueContact || clientData.venueContact || ''}
                      onChange={(e) => handleInputChange('venueContact', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sound-tech" className="text-slate-700 font-medium flex items-center">
                      <Volume2 className="h-4 w-4 mr-2 text-indigo-500" />
                      Sound Tech Contact
                    </Label>
                    <Input
                      id="sound-tech"
                      placeholder="Sound engineer contact"
                      className="border-indigo-200 focus:border-indigo-400 focus:ring-indigo-200"
                      value={formData.soundTechContact || clientData.soundTechContact || ''}
                      onChange={(e) => handleInputChange('soundTechContact', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stage-size" className="text-slate-700 font-medium flex items-center">
                      <Settings className="h-4 w-4 mr-2 text-indigo-500" />
                      Stage/Performance Area Size
                    </Label>
                    <Select value={formData.stageSize || clientData.stageSize || ''} onValueChange={(value) => handleInputChange('stageSize', value)}>
                      <SelectTrigger className="border-indigo-200 focus:border-indigo-400 focus:ring-indigo-200">
                        <SelectValue placeholder="Select stage size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (up to 3x3m)</SelectItem>
                        <SelectItem value="medium">Medium (3x3m to 5x5m)</SelectItem>
                        <SelectItem value="large">Large (5x5m+)</SelectItem>
                        <SelectItem value="no-stage">No designated stage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dress-code" className="text-slate-700 font-medium flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-indigo-500" />
                      Dress Code Preferences
                    </Label>
                    <Input
                      id="dress-code"
                      placeholder="e.g., formal, casual, black tie, themed"
                      className="border-indigo-200 focus:border-indigo-400 focus:ring-indigo-200"
                      value={formData.dressCode || clientData.dressCode || ''}
                      onChange={(e) => handleInputChange('dressCode', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="power-equipment" className="text-slate-700 font-medium flex items-center">
                    <Settings className="h-4 w-4 mr-2 text-indigo-500" />
                    Power & Equipment Availability
                  </Label>
                  <Textarea
                    id="power-equipment"
                    placeholder="Number of sockets, voltage, any noise limiter restrictions..."
                    className="border-indigo-200 focus:border-indigo-400 focus:ring-indigo-200 min-h-[100px]"
                    value={formData.powerEquipment || clientData.powerEquipment || ''}
                    onChange={(e) => handleInputChange('powerEquipment', e.target.value)}
                  />
                </div>
              </TabsContent>

              {/* Music Requests Tab */}
              <TabsContent value="music-requests" className="space-y-6 mt-6">
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
                    <Volume2 className="h-5 w-5 mr-2" />
                    Music Atmosphere
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="style-mood" className="text-slate-700 font-medium flex items-center">
                        <Music className="h-4 w-4 mr-2 text-purple-500" />
                        Style/Mood Preference
                      </Label>
                      <Select value={formData.styleMood || clientData.styleMood || ''} onValueChange={(value) => handleInputChange('styleMood', value)}>
                        <SelectTrigger className="border-purple-200 focus:border-purple-400 focus:ring-purple-200">
                          <SelectValue placeholder="Select music style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upbeat">🎉 Upbeat & Energetic</SelectItem>
                          <SelectItem value="jazzy">🎷 Jazz & Swing</SelectItem>
                          <SelectItem value="romantic">💕 Romantic & Intimate</SelectItem>
                          <SelectItem value="background">🎵 Background/Ambient</SelectItem>
                          <SelectItem value="mixed">🎭 Mixed Styles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="set-order" className="text-slate-700 font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-purple-500" />
                        Set Order Preferences
                      </Label>
                      <Select value={formData.setOrder || clientData.setOrder || ''} onValueChange={(value) => handleInputChange('setOrder', value)}>
                        <SelectTrigger className="border-purple-200 focus:border-purple-400 focus:ring-purple-200">
                          <SelectValue placeholder="Preferred energy flow" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upbeat-first">⚡ Start upbeat, slow later</SelectItem>
                          <SelectItem value="slow-first">🌅 Start slow, build energy</SelectItem>
                          <SelectItem value="mixed">🎪 Mixed throughout</SelectItem>
                          <SelectItem value="no-preference">🤷 No preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                    <Heart className="h-5 w-5 mr-2" />
                    Song Requests
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="must-play" className="text-slate-700 font-medium flex items-center">
                        <Music className="h-4 w-4 mr-2 text-green-500" />
                        Must-Play Songs (up to 6)
                      </Label>
                      <Textarea
                        id="must-play"
                        placeholder="List your favourite songs you'd love to hear (artist - song title)"
                        className="border-green-200 focus:border-green-400 focus:ring-green-200 min-h-[120px]"
                        value={formData.mustPlaySongs || clientData.mustPlaySongs || ''}
                        onChange={(e) => handleInputChange('mustPlaySongs', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="avoid-songs" className="text-slate-700 font-medium flex items-center">
                        <X className="h-4 w-4 mr-2 text-red-500" />
                        Songs to Avoid
                      </Label>
                      <Textarea
                        id="avoid-songs"
                        placeholder="Any songs or genres you'd prefer we don't play"
                        className="border-green-200 focus:border-green-400 focus:ring-green-200 min-h-[120px]"
                        value={formData.avoidSongs || clientData.avoidSongs || ''}
                        onChange={(e) => handleInputChange('avoidSongs', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Special Moments Tab */}
              <TabsContent value="special-moments" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first-dance">First Dance Song</Label>
                    <Input
                      id="first-dance"
                      placeholder="Artist - Song title"
                      value={formData.firstDanceSong || clientData.firstDanceSong || ''}
                      onChange={(e) => handleInputChange('firstDanceSong', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="processional">Processional Song</Label>
                    <Input
                      id="processional"
                      placeholder="Walking down the aisle"
                      value={formData.processionalSong || clientData.processionalSong || ''}
                      onChange={(e) => handleInputChange('processionalSong', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="signing-register">Signing of Register</Label>
                    <Input
                      id="signing-register"
                      placeholder="During ceremony signing"
                      value={formData.signingRegisterSong || clientData.signingRegisterSong || ''}
                      onChange={(e) => handleInputChange('signingRegisterSong', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="recessional">Recessional Song</Label>
                    <Input
                      id="recessional"
                      placeholder="Walking out together"
                      value={formData.recessionalSong || clientData.recessionalSong || ''}
                      onChange={(e) => handleInputChange('recessionalSong', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="special-dedications">Special Dedications</Label>
                  <Textarea
                    id="special-dedications"
                    placeholder="Songs for speeches, announcements, or tributes..."
                    value={formData.specialDedications || clientData.specialDedications || ''}
                    onChange={(e) => handleInputChange('specialDedications', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="guest-announcements">Guest Announcements</Label>
                  <Textarea
                    id="guest-announcements"
                    placeholder="Names for shout-outs and pronunciations..."
                    value={formData.guestAnnouncements || clientData.guestAnnouncements || ''}
                    onChange={(e) => handleInputChange('guestAnnouncements', e.target.value)}
                  />
                </div>
              </TabsContent>

              {/* Logistics Tab */}
              <TabsContent value="logistics" className="space-y-4">
                <div>
                  <Label htmlFor="load-in">Load-in Access Info</Label>
                  <Textarea
                    id="load-in"
                    placeholder="Parking instructions, nearest entrance, loading restrictions..."
                    value={formData.loadInInfo || clientData.loadInInfo || ''}
                    onChange={(e) => handleInputChange('loadInInfo', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sound-check">Preferred Sound Check Time</Label>
                    <Select value={formData.soundCheckTime || clientData.soundCheckTime || ''} onValueChange={(value) => handleInputChange('soundCheckTime', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2-hours-before">2 hours before event</SelectItem>
                        <SelectItem value="1-hour-before">1 hour before event</SelectItem>
                        <SelectItem value="30-mins-before">30 minutes before</SelectItem>
                        <SelectItem value="flexible">Flexible timing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="weather-contingency">Weather Contingency (if outdoors)</Label>
                    <Input
                      id="weather-contingency"
                      placeholder="Indoor backup plan"
                      value={formData.weatherContingency || clientData.weatherContingency || ''}
                      onChange={(e) => handleInputChange('weatherContingency', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="parking-permit"
                      checked={formData.parkingPermitRequired || clientData.parkingPermitRequired || false}
                      onCheckedChange={(checked) => handleInputChange('parkingPermitRequired', checked)}
                    />
                    <Label htmlFor="parking-permit">Parking permit required</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="meal-provided"
                      checked={formData.mealProvided || clientData.mealProvided || false}
                      onCheckedChange={(checked) => handleInputChange('mealProvided', checked)}
                    />
                    <Label htmlFor="meal-provided">Meal/refreshments will be provided</Label>
                  </div>
                </div>
                {(formData.mealProvided || clientData.mealProvided) && (
                  <div>
                    <Label htmlFor="dietary-requirements">Dietary Requirements</Label>
                    <Textarea
                      id="dietary-requirements"
                      placeholder="Any allergies or dietary requirements..."
                      value={formData.dietaryRequirements || clientData.dietaryRequirements || ''}
                      onChange={(e) => handleInputChange('dietaryRequirements', e.target.value)}
                    />
                  </div>
                )}
              </TabsContent>

              {/* Collaboration Tab */}
              <TabsContent value="collaboration" className="space-y-4">
                <div>
                  <Label htmlFor="shared-notes">Shared Notes & Ideas</Label>
                  <Textarea
                    id="shared-notes"
                    placeholder="Drop any ideas, links, or special requests here..."
                    value={formData.sharedNotes || clientData.sharedNotes || ''}
                    onChange={(e) => handleInputChange('sharedNotes', e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="reference-tracks">Reference Tracks</Label>
                  <Textarea
                    id="reference-tracks"
                    placeholder="YouTube links or song names for inspiration..."
                    value={formData.referenceTracks || clientData.referenceTracks || ''}
                    onChange={(e) => handleInputChange('referenceTracks', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="photo-permission"
                      checked={formData.photoPermission || clientData.photoPermission || false}
                      onCheckedChange={(checked) => handleInputChange('photoPermission', checked)}
                    />
                    <Label htmlFor="photo-permission">Permission to take photos/videos during performance</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="encore-allowed"
                      checked={formData.encoreAllowed || clientData.encoreAllowed || false}
                      onCheckedChange={(checked) => handleInputChange('encoreAllowed', checked)}
                    />
                    <Label htmlFor="encore-allowed">Encore performance welcome</Label>
                  </div>
                </div>
                {(formData.encoreAllowed || clientData.encoreAllowed) && (
                  <div>
                    <Label htmlFor="encore-suggestions">Encore Song Suggestions</Label>
                    <Input
                      id="encore-suggestions"
                      placeholder="Songs you'd love to hear for an encore"
                      value={formData.encoreSuggestions || clientData.encoreSuggestions || ''}
                      onChange={(e) => handleInputChange('encoreSuggestions', e.target.value)}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />

            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 md:p-4 border border-indigo-200 sticky md:static bottom-4 md:bottom-auto z-10 md:z-auto">
              <div className="flex items-center justify-end">
                <Button
                  onClick={handleSave}
                  disabled={updatePortalMutation.isPending || Object.keys(formData).length === 0}
                  className="flex items-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg md:shadow-md text-white font-medium w-full md:w-auto py-3 md:py-2 text-base md:text-sm"
                  data-testid="button-update-portal"
                >
                  <Save className="h-4 w-4 mr-2 text-white" />
                  <span className="text-white">{updatePortalMutation.isPending ? 'Saving...' : 'Update Portal'}</span>
                </Button>
              </div>
            </div>

            {Object.keys(formData).length > 0 && (
              <Alert className="mt-4 border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  You have unsaved changes. Click "Save Changes" to update your event details.
                </AlertDescription>
              </Alert>
            )}

            {updatePortalMutation.isSuccess && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <Sparkles className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your changes have been saved successfully! Your performer will be notified.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-center mb-3">
              <Music className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-semibold">Collaborative Event Planning</h3>
            </div>
            <p className="text-indigo-100 mb-2">This portal allows you to collaborate on your event details.</p>
            <p className="text-indigo-100">Your performer will be notified of any updates you make.</p>
            <div className="mt-4 pt-4 border-t border-indigo-400">
              <p className="text-xs text-indigo-200">
                Powered by MusoBuddy • Professional Music Business Management
              </p>
            </div>
          </div>
        </div>
        
        {/* Mobile bottom spacing - ensures all content is accessible above mobile browser UI */}
        <div className="h-24 md:h-8"></div>
      </div>
    </div>
  );
}