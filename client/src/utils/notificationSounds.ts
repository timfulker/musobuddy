// Notification Sound System for MusoBuddy
// Plays audio alerts for new bookings and messages

class NotificationSoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // Initialize with stored preferences
    const stored = localStorage.getItem('notificationSounds');
    if (stored) {
      const settings = JSON.parse(stored);
      this.enabled = settings.enabled ?? true;
      this.volume = settings.volume ?? 0.5;
    }

    // Pre-load sounds
    this.loadSounds();
  }

  private loadSounds() {
    // Cash register "ker-ching" sound for new bookings
    const bookingSound = new Audio();
    // Simple cash register sound using frequencies that create a "ching" effect
    bookingSound.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zPDTljgKHmS46+mhTRUKTKXh8bllIAU+kMzn1Is3CRlps+3roFIIFGCm6OexYCEGO5TI9OKSUAolX8Dl3nV0VoqprqOObHZxqKe1tJ6DeWJ1oaSqtLOklu91clmFg5CalJ6Yq/LsJiwAAACgp4krALTUu1Ugl5vtmgAQI4CJmWKPuPLxqCH7AAAAAMd3ah4ApqepdwCvAAAAlHSRAKNzhAEAy5bPLyrAAAA6lHk5AGNuAAAAtgAAAK5uAAAAgWIAAMUAANiFdwAAaKIAAFizPSgAAHV1AEQAAIC0AAAACy8AClmPAAAAqQC9dwAhAAAABQ0AAAAEAAAAAAAAAIAAAAAAAAAAAAABAADDFQAA';
    bookingSound.volume = this.volume;
    this.sounds.set('booking', bookingSound);

    // Soft ding for new message (shorter, lower pitch)
    const messageSound = new Audio();
    messageSound.src = 'data:audio/wav;base64,UklGRiQDAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQADAACAAAAAgAAAAICAAAAAAAAAgAAAAICAAAAAgAAAAICAAAAAAAAAgAAAAICAgICAgAAAAICAAAAAgAAAAIAAAACAAAAAgAAAAICAAAAAgAAAAICAAAAAAAAAgAAAAICAAAAAgAAAAICAAAAAAAAAgAAAAICAAAAAgICAgICAAAAAAAAAgAAAAIAAAACAAAAAgAAAAICAAAAAgAAAAICAgICAgAAAAICAAAAAAAAAgAAAAIAAAACAAAAAgAAAAICAAAAAgAAAAICAAAAAAAAAgAAAAICAAAAAgAAAAIAAAACAAAAAgAAAAICAAAAAgAAAAICAAAAAAAAAgAAAAICAAAAAAAAAgICAgIAAAACAAAAAgAAAAICAAAAAgAAAAICAgICAAAAAAAAAgAAAAICAAAAAgAAAAICAAAAAAAAAgAAAAICAgICAgAAAAICAAAAAAAAAgAAAAIAAAACAAAAAgAAAAICAAAAAgAAAAICAAAAAAAAAgAAAAICAAAAAgAAAAICAAAAAAAAAgICAgICAAAAAgAAAAICAAAAAAAAAgAAAAICAAAAAgAAAAIAAAACAAAAAgAAAAA==';
    messageSound.volume = this.volume * 0.7; // Slightly quieter
    this.sounds.set('message', messageSound);

    // Error/alert sound (sharper, attention-getting)
    const alertSound = new Audio();
    alertSound.src = 'data:audio/wav;base64,UklGRpIDAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YW4DAAB/f39/f39/f39/f39/f4CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAf39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f4CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAf39+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn6AgICAgICAgICAgICAgICAgICAgIGBgYGBgYGBgYGBgYF/f35+fn5+fn5+fn5+fn19fX19fX19fX19fX6AgICAgICAgICAgYGBgYGBgYGCgoKCgoKCgoKCgoKCf399fX19fX19fHx8fHx8fHx8fHx8fHx8fHx8fH+AgICAgICBgYGBgYGBgYKCgoKCgoKCgoKDg4ODg4N/fHx8fHx8fHt7e3t7e3t7e3t7e3t7e3t7e3t+gICAgICAgIGBgYGBgoKCgoKCgoKDg4ODg4ODg4SEfnt7e3t7e3t6enp6enp6enp6enp6enp6enp6foCAgICAgIGBgYGBgoKCgoKCg4ODg4ODg4SEhISEhH16enp6enp5eXl5eXl5eXl5eXl5eXl5eXl5eX+AgICAgIGBgYGCgoKCgoKDg4ODg4OEhISEhISEhYV5eXl5eXl5eHh4eHh4eHh4eHh4eHh4d3d3d3d/gICAgIGBgYGCgoKCgoODg4ODhISEhISEhIWFhYWFdnd3d3d3d3Z2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2foGBgYGBgoKCgoKDg4ODg4SEhISEhISFhYWFhYWGhoZ2dnZ2dnZ2dXV1dXV1dXV1dXV1dXV0dHR0dICBgYGCgoKCgoODg4ODhISEhISFhYWFhYWGhoaGhod0dHR0dHR0c3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc4CBgoKCgoKDg4ODg4SEhISEhYWFhYWGhoaGhoaHh4dzcnJycnJycnJycnJycnJycnJxcXFxcXFxcQ==';
    alertSound.volume = this.volume;
    this.sounds.set('alert', alertSound);
  }

  // Play a specific sound
  play(type: 'booking' | 'message' | 'alert') {
    if (!this.enabled) return;

    const sound = this.sounds.get(type);
    if (sound) {
      // Clone the audio to allow overlapping sounds
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.volume = this.volume;
      clone.play().catch(err => {
        // Browser may block autoplay - this is normal
        console.log('Sound playback blocked by browser:', err.message);
      });
    }
  }

  // Enable/disable sounds
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.saveSettings();
  }

  // Set volume (0-1)
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
    this.saveSettings();
  }

  // Get current settings
  getSettings() {
    return {
      enabled: this.enabled,
      volume: this.volume
    };
  }

  // Save settings to localStorage
  private saveSettings() {
    localStorage.setItem('notificationSounds', JSON.stringify({
      enabled: this.enabled,
      volume: this.volume
    }));
  }

  // Test a sound (for settings page)
  test(type: 'booking' | 'message' | 'alert' = 'message') {
    const originalEnabled = this.enabled;
    this.enabled = true;
    this.play(type);
    this.enabled = originalEnabled;
  }
}

// Create singleton instance
export const notificationSounds = new NotificationSoundManager();