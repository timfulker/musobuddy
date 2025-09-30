import React, { useState } from 'react';
import { PromoMetronome } from '@/components/PromoMetronome';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function PromoMetronomePage() {
  const [size, setSize] = useState(400);
  const [speed, setSpeed] = useState(1.0);
  const [showBackground, setShowBackground] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const presets = [
    { name: 'Small Preview', size: 200, speed: 1.2 },
    { name: 'Medium', size: 300, speed: 1.0 },
    { name: 'Large Video', size: 400, speed: 0.8 },
    { name: 'Extra Large', size: 500, speed: 0.6 },
    { name: 'Massive', size: 600, speed: 1.0 }
  ];

  if (isFullscreen) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
        onClick={toggleFullscreen}
      >
        <PromoMetronome
          size={Math.min(size, Math.min(window.innerWidth, window.innerHeight) * 0.8)}
          speed={speed}
          backgroundColor="transparent"
          showBackground={showBackground}
        />
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          color: '#666',
          fontSize: 14
        }}>
          Click anywhere to exit fullscreen
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#191970'
        }}>
          🎼 Promo Video Metronome
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
          {/* Preview Area */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: backgroundColor,
            borderRadius: '12px',
            padding: '2rem',
            minHeight: '600px',
            justifyContent: 'center',
            border: '2px dashed #cbd5e1'
          }}>
            <PromoMetronome
              size={Math.min(size, 500)} // Limit preview size
              speed={speed}
              backgroundColor="transparent"
              showBackground={showBackground}
            />

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Button
                onClick={toggleFullscreen}
                style={{
                  fontSize: '1.1rem',
                  padding: '12px 24px',
                  backgroundColor: '#191970',
                  color: 'white'
                }}
              >
                🎬 Open Fullscreen for Recording
              </Button>
              <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                Perfect for screen recording your promo video
              </p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Presets */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Presets</CardTitle>
              </CardHeader>
              <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => {
                      setSize(preset.size);
                      setSpeed(preset.speed);
                    }}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    {preset.name} ({preset.size}px, {preset.speed}s)
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Size Control */}
            <Card>
              <CardHeader>
                <CardTitle>Size: {size}px</CardTitle>
              </CardHeader>
              <CardContent>
                <Slider
                  value={[size]}
                  onValueChange={(value) => setSize(value[0])}
                  min={100}
                  max={800}
                  step={10}
                />
              </CardContent>
            </Card>

            {/* Speed Control */}
            <Card>
              <CardHeader>
                <CardTitle>Animation Speed: {speed}s</CardTitle>
              </CardHeader>
              <CardContent>
                <Slider
                  value={[speed]}
                  onValueChange={(value) => setSpeed(value[0])}
                  min={0.3}
                  max={3.0}
                  step={0.1}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                  <span>Fast (0.3s)</span>
                  <span>Slow (3.0s)</span>
                </div>
              </CardContent>
            </Card>

            {/* Background Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Background</CardTitle>
              </CardHeader>
              <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Switch
                    checked={showBackground}
                    onCheckedChange={setShowBackground}
                  />
                  <Label>Show blue circle background</Label>
                </div>

                <div>
                  <Label htmlFor="bg-color">Page Background Color</Label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <Input
                      id="bg-color"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      style={{ width: '60px', height: '40px', padding: '2px' }}
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* Common background presets */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { name: 'White', color: '#ffffff' },
                    { name: 'Black', color: '#000000' },
                    { name: 'Blue', color: '#3b82f6' },
                    { name: 'Gray', color: '#64748b' },
                    { name: 'Transparent', color: 'transparent' }
                  ].map((bg) => (
                    <Button
                      key={bg.name}
                      variant="outline"
                      size="sm"
                      onClick={() => setBackgroundColor(bg.color)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      {bg.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>📹 Video Recording Tips</CardTitle>
              </CardHeader>
              <CardContent style={{ fontSize: '0.9rem', color: '#64748b' }}>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                  <li>Click "Open Fullscreen" for clean recording</li>
                  <li>Adjust size and speed before going fullscreen</li>
                  <li>Choose background color that contrasts well</li>
                  <li>Let it swing for a few cycles for smooth loops</li>
                  <li>Click anywhere in fullscreen to exit</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}