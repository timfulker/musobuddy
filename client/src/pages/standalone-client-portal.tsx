import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from '@/lib/queryClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Music, MapPin, Calendar, Clock, Users, DollarSign } from "lucide-react";

interface ClientPortalData {
  contract?: any;
  booking?: any;
  settings?: any;
}

export default function StandaloneClientPortal() {
  const { contractId } = useParams();
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Force hide any navigation that might appear
  useEffect(() => {
    // Remove all existing navigation elements
    const removeNavElements = () => {
      const navs = document.querySelectorAll('[data-mobile-nav], .mobile-nav, nav.fixed.bottom-0, .fixed.bottom-0');
      navs.forEach(nav => {
        nav.remove();
      });
    };

    // Force body styles
    document.body.style.cssText = `
      overflow: auto !important;
      height: auto !important;
      min-height: 100vh !important;
      padding-bottom: 100px !important;
      margin: 0 !important;
      position: relative !important;
    `;

    document.documentElement.style.cssText = `
      overflow: auto !important;
      height: auto !important;
    `;

    // Remove navigation immediately and on interval
    removeNavElements();
    const interval = setInterval(removeNavElements, 100);

    return () => {
      clearInterval(interval);
      document.body.style.cssText = '';
      document.documentElement.style.cssText = '';
    };
  }, []);

  // Fetch client portal data
  const { data: clientData, isLoading } = useQuery({
    queryKey: ['/api/client-portal', contractId],
    enabled: !!contractId,
  });

  // Update portal mutation
  const updatePortalMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/client-portal/${contractId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  });

  const handleSave = () => {
    updatePortalMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading your event portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #f3e8ff 100%)',
      paddingBottom: '120px'
    }}>
      {/* Global styles to absolutely prevent navigation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        [data-mobile-nav],
        .mobile-nav,
        nav.fixed.bottom-0,
        .fixed.bottom-0:not(.client-portal-save-btn) {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          left: -99999px !important;
          top: -99999px !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        body {
          overflow: auto !important;
          height: auto !important;
          min-height: 100vh !important;
          padding-bottom: 120px !important;
        }
        
        html {
          overflow: auto !important;
          height: auto !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.8)', 
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e0e7ff',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              padding: '12px', 
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <Music style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e1b4b', margin: 0 }}>
                Your Event Portal
              </h1>
              <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
                Help us plan your perfect event
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '32px 16px' }}>
        <Card style={{ boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar style={{ width: '20px', height: '20px' }} />
              Event Details
            </CardTitle>
            <CardDescription>
              Please provide additional details to help us prepare for your event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="venue" style={{ width: '100%' }}>
              <TabsList style={{ display: 'grid', width: '100%', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <TabsTrigger value="venue">Venue Details</TabsTrigger>
                <TabsTrigger value="preferences">Music Preferences</TabsTrigger>
                <TabsTrigger value="logistics">Event Logistics</TabsTrigger>
              </TabsList>

              <TabsContent value="venue" style={{ marginTop: '24px' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Venue Contact Person
                    </label>
                    <Input
                      placeholder="Primary contact at the venue"
                      value={formData.venueContact || ''}
                      onChange={(e) => handleInputChange('venueContact', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Venue Contact Phone
                    </label>
                    <Input
                      placeholder="Phone number for venue contact"
                      value={formData.venuePhone || ''}
                      onChange={(e) => handleInputChange('venuePhone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Load-in Instructions
                    </label>
                    <Textarea
                      placeholder="Special instructions for equipment load-in..."
                      rows={3}
                      value={formData.loadInInstructions || ''}
                      onChange={(e) => handleInputChange('loadInInstructions', e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preferences" style={{ marginTop: '24px' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Special Song Requests
                    </label>
                    <Textarea
                      placeholder="Any specific songs you'd like us to play..."
                      rows={3}
                      value={formData.songRequests || ''}
                      onChange={(e) => handleInputChange('songRequests', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Music to Avoid
                    </label>
                    <Textarea
                      placeholder="Any songs or genres to avoid..."
                      rows={2}
                      value={formData.musicToAvoid || ''}
                      onChange={(e) => handleInputChange('musicToAvoid', e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="logistics" style={{ marginTop: '24px' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Event Timeline
                    </label>
                    <Textarea
                      placeholder="Key moments during the event (speeches, cake cutting, etc.)..."
                      rows={3}
                      value={formData.eventTimeline || ''}
                      onChange={(e) => handleInputChange('eventTimeline', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Special Requirements
                    </label>
                    <Textarea
                      placeholder="Any special requirements or considerations..."
                      rows={3}
                      value={formData.specialRequirements || ''}
                      onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Desktop save button */}
            <div style={{ display: 'none', marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  onClick={handleSave}
                  disabled={updatePortalMutation.isPending}
                  style={{ 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: 'white'
                  }}
                >
                  <Save style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  {updatePortalMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile fixed save button */}
      <div 
        className="client-portal-save-btn"
        style={{ 
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          background: 'white',
          borderTop: '1px solid #e5e7eb',
          padding: '16px',
          zIndex: 10000,
          boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Button
          onClick={handleSave}
          disabled={updatePortalMutation.isPending}
          style={{ 
            width: '100%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: 'white',
            padding: '12px',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          <Save style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          {updatePortalMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        {Object.keys(formData).length > 0 && (
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0' }}>
            You have unsaved changes
          </p>
        )}
      </div>
    </div>
  );
}