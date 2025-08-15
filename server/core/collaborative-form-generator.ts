import { clientPortalService } from './client-portal.js';
import { uploadToCloudflareR2 } from './cloud-storage.js';
import { randomBytes } from 'crypto';

interface BookingData {
  id: number;
  contractId: number;
  clientName: string;
  venue: string;
  eventDate: string;
  eventTime?: string;
  eventEndTime?: string;
  performanceDuration?: string;
  // All collaborative fields
  venueContact?: string;
  soundTechContact?: string;
  stageSize?: string;
  powerEquipment?: string;
  styleMood?: string;
  mustPlaySongs?: string;
  avoidSongs?: string;
  setOrder?: string;
  firstDanceSong?: string;
  processionalSong?: string;
  signingRegisterSong?: string;
  recessionalSong?: string;
  specialDedications?: string;
  guestAnnouncements?: string;
  loadInInfo?: string;
  soundCheckTime?: string;
  weatherContingency?: string;
  parkingPermitRequired?: boolean;
  mealProvided?: boolean;
  dietaryRequirements?: string;
  sharedNotes?: string;
  referenceTracks?: string;
  photoPermission?: boolean;
  encoreAllowed?: boolean;
  encoreSuggestions?: string;
}

interface FieldLockSettings {
  [fieldName: string]: {
    locked: boolean;
    lockedBy: 'user' | 'client';
  };
}

class CollaborativeFormGenerator {
  generateStandaloneForm(
    bookingData: BookingData, 
    apiEndpoint: string, 
    portalToken: string,
    fieldLocks: FieldLockSettings = {}
  ): string {
    const formHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Collaborative Event Planning - ${bookingData.clientName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <style>
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .tab-button.active {
            background: linear-gradient(to right, #191970, #4338ca);
            color: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .locked-field {
            background-color: #fef3c7 !important;
            border-color: #f59e0b !important;
            color: #92400e !important;
            cursor: not-allowed !important;
            opacity: 0.8 !important;
        }
        .locked-field:hover {
            background-color: #fde68a !important;
        }
        .lock-indicator {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: #f59e0b;
            font-size: 14px;
            pointer-events: none;
            z-index: 10;
        }
    </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
    <!-- Header -->
    <div class="bg-white/80 backdrop-blur-sm border-b border-indigo-100 shadow-sm sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <!-- MusoBuddy Logo -->
                    <div class="p-3 bg-gradient-to-r from-[#191970] to-[#4338ca] rounded-xl shadow-lg">
                        <i data-lucide="music" class="w-6 h-6 text-white"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-[#191970]">
                            Collaborative Event Planning
                        </h1>
                        <p class="text-slate-600 mt-1 flex items-center">
                            <i data-lucide="calendar" class="w-4 h-4 mr-1 text-[#191970]"></i>
                            ${bookingData.clientName} • ${new Date(bookingData.eventDate).toLocaleDateString('en-GB')}
                        </p>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <div class="bg-green-50 text-green-700 border border-green-200 px-3 py-1 font-medium rounded-md">
                        ✓ Contract Signed
                    </div>
                    <div class="text-sm text-slate-500">
                        Last saved: <span id="last-saved">Never</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8">
        <!-- Event Overview -->
        <div class="mb-8 bg-gradient-to-r from-[#191970]/10 to-indigo-50 border border-[#191970]/20 rounded-lg p-6">
            <div class="flex items-center text-[#191970] mb-4">
                <div class="p-2 bg-[#191970]/10 rounded-lg mr-3">
                    <i data-lucide="calendar" class="w-5 h-5 text-[#191970]"></i>
                </div>
                <h2 class="text-xl font-semibold">Event Overview</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white rounded-lg p-4 shadow-sm border border-[#191970]/10">
                    <div class="text-sm font-medium text-[#191970] flex items-center mb-2">
                        <i data-lucide="calendar" class="w-4 h-4 mr-1"></i>
                        Date
                    </div>
                    <p class="text-xl font-bold text-slate-900">${new Date(bookingData.eventDate).toLocaleDateString('en-GB')}</p>
                </div>
                <div class="bg-white rounded-lg p-4 shadow-sm border border-[#191970]/10">
                    <div class="text-sm font-medium text-[#191970] flex items-center mb-2">
                        <i data-lucide="clock" class="w-4 h-4 mr-1"></i>
                        Time
                    </div>
                    <p class="text-xl font-bold text-slate-900">
                        ${bookingData.eventTime || 'TBC'} ${bookingData.eventEndTime ? `- ${bookingData.eventEndTime}` : ''}
                    </p>
                    ${bookingData.performanceDuration ? `
                        <p class="text-sm text-[#191970] mt-1 flex items-center">
                            <i data-lucide="mic-2" class="w-3 h-3 mr-1"></i>
                            Performance: ${bookingData.performanceDuration}
                        </p>
                    ` : ''}
                </div>
                <div class="bg-white rounded-lg p-4 shadow-sm border border-[#191970]/10">
                    <div class="text-sm font-medium text-[#191970] flex items-center mb-2">
                        <i data-lucide="map-pin" class="w-4 h-4 mr-1"></i>
                        Venue
                    </div>
                    <p class="text-xl font-bold text-slate-900">${bookingData.venue || 'TBC'}</p>
                </div>
            </div>
        </div>

        <!-- Collaborative Portal -->
        <div class="shadow-lg border border-[#191970]/10 rounded-lg overflow-hidden">
            <div class="bg-gradient-to-r from-[#191970] to-indigo-600 text-white p-6">
                <div class="text-xl font-semibold flex items-center">
                    <i data-lucide="users" class="w-6 h-6 mr-2"></i>
                    Collaborative Event Planning
                </div>
                <p class="text-indigo-100 opacity-90 mt-2">
                    Both client and performer can edit these details. Changes save in real-time and both parties are notified.
                </p>
                <div class="mt-4 flex items-center space-x-4 text-sm">
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                        <span>🔒 User can lock fields to prevent editing</span>
                    </div>
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                        <span>Auto-saves every change</span>
                    </div>
                </div>
            </div>
            
            <div class="p-6">
                <!-- Tabs -->
                <div class="flex flex-wrap bg-indigo-50 p-1 rounded-lg mb-6">
                    <button class="tab-button flex-1 flex items-center justify-center text-sm py-3 px-4 rounded transition-all duration-200" data-tab="technical">
                        <i data-lucide="settings" class="w-4 h-4 mr-2"></i>
                        Technical Details
                    </button>
                    <button class="tab-button flex-1 flex items-center justify-center text-sm py-3 px-4 rounded transition-all duration-200" data-tab="music">
                        <i data-lucide="volume-2" class="w-4 h-4 mr-2"></i>
                        Music Preferences
                    </button>
                    <button class="tab-button flex-1 flex items-center justify-center text-sm py-3 px-4 rounded transition-all duration-200" data-tab="special">
                        <i data-lucide="heart" class="w-4 h-4 mr-2"></i>
                        Special Moments
                    </button>
                    <button class="tab-button flex-1 flex items-center justify-center text-sm py-3 px-4 rounded transition-all duration-200" data-tab="logistics">
                        <i data-lucide="map-pin" class="w-4 h-4 mr-2"></i>
                        Logistics
                    </button>
                </div>

                <!-- Technical Details Tab -->
                <div id="technical" class="tab-content space-y-6">
                    ${this.generateFormSection('Technical Setup', [
                      { name: 'venueContact', label: 'Venue On-Day Contact', type: 'text', placeholder: 'Emergency contact number', value: bookingData.venueContact },
                      { name: 'soundTechContact', label: 'Sound Tech Contact', type: 'text', placeholder: 'Sound engineer contact', value: bookingData.soundTechContact },
                      { name: 'stageSize', label: 'Stage/Performance Area Size', type: 'select', options: [
                        { value: 'small', label: 'Small (up to 3x3m)' },
                        { value: 'medium', label: 'Medium (3x3m to 5x5m)' },
                        { value: 'large', label: 'Large (5x5m+)' },
                        { value: 'no-stage', label: 'No designated stage' }
                      ], value: bookingData.stageSize },
                      { name: 'soundCheckTime', label: 'Preferred Sound Check Time', type: 'text', placeholder: 'e.g., 2 hours before event', value: bookingData.soundCheckTime }
                    ], fieldLocks)}
                    ${this.generateFormSection('Power & Equipment', [
                      { name: 'powerEquipment', label: 'Power & Equipment Availability', type: 'textarea', placeholder: 'Number of sockets, voltage, noise limiter restrictions...', value: bookingData.powerEquipment },
                      { name: 'loadInInfo', label: 'Load-in Instructions', type: 'textarea', placeholder: 'How to access performance area, best entrance...', value: bookingData.loadInInfo }
                    ], fieldLocks)}
                </div>

                <!-- Music Preferences Tab -->
                <div id="music" class="tab-content space-y-6">
                    ${this.generateFormSection('Music Style & Mood', [
                      { name: 'styleMood', label: 'Style/Mood Preference', type: 'select', options: [
                        { value: 'upbeat', label: '🎉 Upbeat & Energetic' },
                        { value: 'jazzy', label: '🎷 Jazz & Swing' },
                        { value: 'romantic', label: '💕 Romantic & Intimate' },
                        { value: 'background', label: '🎵 Background/Ambient' },
                        { value: 'mixed', label: '🎭 Mixed Styles' }
                      ], value: bookingData.styleMood },
                      { name: 'setOrder', label: 'Set Order Preferences', type: 'select', options: [
                        { value: 'upbeat-first', label: '⚡ Start upbeat, slow later' },
                        { value: 'slow-first', label: '🌅 Start slow, build energy' },
                        { value: 'mixed', label: '🎪 Mixed throughout' },
                        { value: 'no-preference', label: '🤷 No preference' }
                      ], value: bookingData.setOrder }
                    ], fieldLocks)}
                    ${this.generateFormSection('Song Requests', [
                      { name: 'mustPlaySongs', label: 'Must-Play Songs (up to 6)', type: 'textarea', placeholder: 'List your favourite songs (artist - song title)', value: bookingData.mustPlaySongs },
                      { name: 'avoidSongs', label: 'Songs to Avoid', type: 'textarea', placeholder: 'Any songs or genres you prefer we avoid', value: bookingData.avoidSongs },
                      { name: 'referenceTracks', label: 'Reference Tracks/Examples', type: 'text', placeholder: 'YouTube links or examples of desired style', value: bookingData.referenceTracks }
                    ], fieldLocks)}
                </div>

                <!-- Special Moments Tab -->
                <div id="special" class="tab-content space-y-6">
                    ${this.generateFormSection('Wedding Music (if applicable)', [
                      { name: 'firstDanceSong', label: 'First Dance Song', type: 'text', placeholder: 'Artist - Song Title', value: bookingData.firstDanceSong },
                      { name: 'processionalSong', label: 'Processional Music', type: 'text', placeholder: 'Walking down the aisle', value: bookingData.processionalSong },
                      { name: 'signingRegisterSong', label: 'Register Signing Music', type: 'text', placeholder: 'Background music for signing', value: bookingData.signingRegisterSong },
                      { name: 'recessionalSong', label: 'Recessional Music', type: 'text', placeholder: 'Walking back up the aisle', value: bookingData.recessionalSong }
                    ], fieldLocks)}
                    ${this.generateFormSection('Special Announcements', [
                      { name: 'specialDedications', label: 'Special Dedications', type: 'textarea', placeholder: 'Any songs to dedicate to special people', value: bookingData.specialDedications },
                      { name: 'guestAnnouncements', label: 'Guest Announcements', type: 'textarea', placeholder: 'Any announcements to make during event', value: bookingData.guestAnnouncements }
                    ], fieldLocks)}
                </div>

                <!-- Logistics Tab -->
                <div id="logistics" class="tab-content space-y-6">
                    ${this.generateFormSection('Event Logistics', [
                      { name: 'weatherContingency', label: 'Weather Contingency Plan', type: 'textarea', placeholder: 'Backup plan for outdoor events', value: bookingData.weatherContingency },
                      { name: 'dietaryRequirements', label: 'Dietary Requirements', type: 'text', placeholder: 'If meal provided, any dietary needs', value: bookingData.dietaryRequirements }
                    ], fieldLocks)}
                    ${this.generateFormSection('Shared Planning Notes', [
                      { name: 'sharedNotes', label: 'Additional Notes & Requests', type: 'textarea', placeholder: 'Any other important details or special requests...', value: bookingData.sharedNotes }
                    ], fieldLocks)}
                </div>

                <!-- Save Section -->
                <div class="bg-gradient-to-r from-[#191970]/5 to-indigo-50 rounded-lg p-6 border border-[#191970]/20 mt-8">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="p-3 bg-[#191970]/10 rounded-lg">
                                <i data-lucide="clock" class="w-5 h-5 text-[#191970]"></i>
                            </div>
                            <div>
                                <p class="text-lg font-medium text-slate-700">Auto-Save Status</p>
                                <p id="save-status" class="text-sm text-slate-500">Ready to save changes</p>
                            </div>
                        </div>
                        <button id="manual-save-btn" onclick="saveAllChanges()" class="flex items-center bg-gradient-to-r from-[#191970] to-indigo-600 hover:from-[#191970]/90 hover:to-indigo-700 shadow-lg text-white px-6 py-3 rounded-lg transition-all duration-200">
                            <i data-lucide="save" class="w-5 h-5 mr-2"></i>
                            <span>Save All Changes</span>
                        </button>
                    </div>
                </div>

                <!-- Status Messages -->
                <div id="status-message" class="mt-6 hidden"></div>
            </div>
        </div>

        <!-- Footer -->
        <div class="mt-12 text-center">
            <div class="bg-gradient-to-r from-[#191970] to-indigo-600 rounded-lg p-6 text-white">
                <div class="flex items-center justify-center mb-3">
                    <i data-lucide="music" class="w-6 h-6 mr-2"></i>
                    <h3 class="text-lg font-semibold">Collaborative Event Planning</h3>
                </div>
                <p class="text-indigo-100 mb-2">This form is shared between you and your performer.</p>
                <p class="text-indigo-100">All changes are saved automatically and both parties are notified.</p>
                <div class="mt-4 pt-4 border-t border-indigo-400">
                    <p class="text-xs text-indigo-200">
                        Powered by MusoBuddy • Professional Music Business Management
                    </p>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Configuration
        const BOOKING_ID = ${bookingData.id};
        const CONTRACT_ID = ${bookingData.contractId};
        const PORTAL_TOKEN = "${portalToken}";
        const API_BASE = "${apiEndpoint}";
        
        let fieldLocks = ${JSON.stringify(fieldLocks)};
        let hasUnsavedChanges = false;

        // Initialize Lucide icons
        lucide.createIcons();

        document.addEventListener('DOMContentLoaded', function() {
            initializeTabs();
            initializeFieldLocks();
            initializeAutoSave();
        });

        function initializeTabs() {
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');
            
            // Set first tab as active
            tabButtons[0].classList.add('active');
            tabContents[0].classList.add('active');
            
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetTab = button.getAttribute('data-tab');
                    
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));
                    
                    button.classList.add('active');
                    document.getElementById(targetTab).classList.add('active');
                });
            });
        }

        function initializeFieldLocks() {
            // Apply lock styling to locked fields (client view only)
            document.querySelectorAll('input, textarea, select').forEach(field => {
                if (field.name && fieldLocks[field.name]?.locked) {
                    // Add lock styling and make field read-only
                    field.classList.add('locked-field');
                    field.disabled = true;
                    field.style.cursor = 'not-allowed';
                    field.title = 'This field has been pre-filled by the performer and cannot be edited';
                    
                    // Add visual lock icon
                    const wrapper = field.parentNode;
                    if (wrapper && !wrapper.querySelector('.lock-indicator')) {
                        const lockIcon = document.createElement('div');
                        lockIcon.className = 'lock-indicator absolute right-2 top-2 text-amber-600';
                        lockIcon.innerHTML = '🔒';
                        lockIcon.title = 'This field is locked by the performer';
                        lockIcon.style.cssText = 'position: absolute; right: 8px; top: 8px; z-index: 10; pointer-events: none;';
                        
                        // Make wrapper relative if it's not already
                        if (window.getComputedStyle(wrapper).position === 'static') {
                            wrapper.style.position = 'relative';
                        }
                        
                        wrapper.appendChild(lockIcon);
                    }
                }
            });
        }

        // Field locks are controlled by the performer only
        // This form respects locked fields as read-only

        function initializeAutoSave() {
            let saveTimeout;
            
            document.querySelectorAll('input, textarea, select').forEach(field => {
                field.addEventListener('input', () => {
                    hasUnsavedChanges = true;
                    clearTimeout(saveTimeout);
                    
                    // Auto-save after 2 seconds of no changes
                    saveTimeout = setTimeout(() => {
                        saveAllChanges(true);
                    }, 2000);
                    
                    updateSaveStatus('Typing... (will auto-save)');
                });
            });
        }

        async function saveAllChanges(autoSave = false) {
            const saveBtn = document.getElementById('manual-save-btn');
            const statusEl = document.getElementById('save-status');
            
            if (!autoSave) {
                saveBtn.disabled = true;
                saveBtn.querySelector('span').textContent = 'Saving...';
            }
            
            updateSaveStatus('Saving changes...');
            
            try {
                // Use traditional form submission to bypass CORS
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = \`\${API_BASE}/api/collaborative-form/\${BOOKING_ID}/update\`;
                form.target = 'save-frame';
                form.style.display = 'none';
                
                // Add token
                const tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = 'token';
                tokenInput.value = PORTAL_TOKEN;
                form.appendChild(tokenInput);
                
                // Add form data
                document.querySelectorAll('input, textarea, select').forEach(field => {
                    if (field.name && field.value) {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = field.name;
                        input.value = field.value;
                        form.appendChild(input);
                    }
                });
                
                // Add field locks
                const locksInput = document.createElement('input');
                locksInput.type = 'hidden';
                locksInput.name = 'fieldLocks';
                locksInput.value = JSON.stringify(fieldLocks);
                form.appendChild(locksInput);
                
                document.body.appendChild(form);
                
                // Create hidden iframe for response
                let iframe = document.getElementById('save-frame');
                if (!iframe) {
                    iframe = document.createElement('iframe');
                    iframe.id = 'save-frame';
                    iframe.name = 'save-frame';
                    iframe.style.display = 'none';
                    document.body.appendChild(iframe);
                }
                
                // Listen for iframe response
                iframe.onload = function() {
                    try {
                        // Form submitted successfully
                        hasUnsavedChanges = false;
                        const now = new Date().toLocaleString('en-GB');
                        document.getElementById('last-saved').textContent = now;
                        updateSaveStatus(\`Last saved: \${now}\`);
                        
                        if (!autoSave) {
                            showStatusMessage('All changes saved successfully! Other parties have been notified.', 'success');
                            saveBtn.disabled = false;
                            saveBtn.querySelector('span').textContent = 'Save All Changes';
                        }
                    } catch (e) {
                        console.error('Error processing form response:', e);
                        updateSaveStatus('Save failed - will retry');
                        if (!autoSave) {
                            saveBtn.disabled = false;
                            saveBtn.querySelector('span').textContent = 'Save All Changes';
                        }
                    }
                };
                
                // Submit form
                form.submit();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(form);
                }, 1000);
                
            } catch (error) {
                console.error('Error saving changes:', error);
                updateSaveStatus('Save failed - will retry');
                showStatusMessage('Failed to save changes. Please try again.', 'error');
                
                if (!autoSave) {
                    saveBtn.disabled = false;
                    saveBtn.querySelector('span').textContent = 'Save All Changes';
                }
            }
        }

        async function saveLockSettings() {
            try {
                await fetch(\`\${API_BASE}/api/collaborative-form/\${BOOKING_ID}/locks\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token: PORTAL_TOKEN,
                        fieldLocks: fieldLocks
                    })
                });
            } catch (error) {
                console.error('Error saving lock settings:', error);
            }
        }

        function updateSaveStatus(message) {
            document.getElementById('save-status').textContent = message;
        }

        function showStatusMessage(message, type) {
            const statusDiv = document.getElementById('status-message');
            statusDiv.className = \`mt-6 p-4 rounded-lg border \${
                type === 'success' 
                    ? 'border-green-200 bg-green-50 text-green-800' 
                    : 'border-red-200 bg-red-50 text-red-800'
            }\`;
            statusDiv.innerHTML = \`
                <div class="flex items-center">
                    <i data-lucide="\${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4 mr-2"></i>
                    \${message}
                </div>
            \`;
            statusDiv.classList.remove('hidden');
            lucide.createIcons();
            
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 5000);
        }

        // Prevent accidental page close with unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    </script>
</body>
</html>`;

    return formHtml;
  }

  private generateFormSection(title: string, fields: any[], fieldLocks: FieldLockSettings): string {
    const fieldsHtml = fields.map(field => {
      const isLocked = fieldLocks[field.name]?.locked || false;
      const lockClass = isLocked ? 'locked-field' : '';
      
      if (field.type === 'select') {
        const options = field.options.map(opt => 
          `<option value="${opt.value}" ${field.value === opt.value ? 'selected' : ''}>${opt.label}</option>`
        ).join('');
        
        return `
          <div class="space-y-2">
            <label class="text-slate-700 font-medium flex items-center">
              <i data-lucide="settings" class="w-4 h-4 mr-2 text-[#191970]"></i>
              ${field.label}
            </label>
            <select name="${field.name}" class="w-full border border-indigo-200 focus:border-[#191970] focus:ring-[#191970]/20 rounded-md px-3 py-2 ${lockClass}" ${isLocked ? 'disabled' : ''}>
              <option value="">Select...</option>
              ${options}
            </select>
          </div>
        `;
      } else if (field.type === 'textarea') {
        return `
          <div class="space-y-2">
            <label class="text-slate-700 font-medium flex items-center">
              <i data-lucide="edit" class="w-4 h-4 mr-2 text-[#191970]"></i>
              ${field.label}
            </label>
            <textarea name="${field.name}" rows="3" placeholder="${field.placeholder || ''}" class="w-full border border-indigo-200 focus:border-[#191970] focus:ring-[#191970]/20 rounded-md px-3 py-2 ${lockClass}" ${isLocked ? 'disabled' : ''}>${field.value || ''}</textarea>
          </div>
        `;
      } else {
        return `
          <div class="space-y-2">
            <label class="text-slate-700 font-medium flex items-center">
              <i data-lucide="type" class="w-4 h-4 mr-2 text-[#191970]"></i>
              ${field.label}
            </label>
            <input type="text" name="${field.name}" placeholder="${field.placeholder || ''}" value="${field.value || ''}" class="w-full border border-indigo-200 focus:border-[#191970] focus:ring-[#191970]/20 rounded-md px-3 py-2 ${lockClass}" ${isLocked ? 'disabled' : ''}>
          </div>
        `;
      }
    }).join('');

    return `
      <div class="bg-white rounded-lg p-6 border border-[#191970]/10">
        <h3 class="text-lg font-semibold text-[#191970] mb-4 pb-2 border-b border-[#191970]/20">
          ${title}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${fieldsHtml}
        </div>
      </div>
    `;
  }

  async uploadCollaborativeForm(
    bookingData: BookingData, 
    apiEndpoint: string, 
    fieldLocks: FieldLockSettings = {}
  ): Promise<{ url: string; token: string }> {
    // Generate portal token
    const portalToken = clientPortalService.generatePortalToken();
    
    // Generate the HTML form
    const formHtml = this.generateStandaloneForm(bookingData, apiEndpoint, portalToken, fieldLocks);
    
    // Create unique filename
    const formKey = `collaborative-forms/booking-${bookingData.id}-${Date.now()}.html`;
    
    // Upload to Cloudflare R2
    const uploadResult = await uploadToCloudflareR2(
      Buffer.from(formHtml, 'utf8'),
      formKey,
      'text/html'
    );
    
    return {
      url: uploadResult.url,
      token: portalToken
    };
  }
}

export const collaborativeFormGenerator = new CollaborativeFormGenerator();

// Export standalone function for direct use
export function generateCollaborativeForm(
  contract: any,
  bookingData: any = null,
  portalToken: string
): string {
  // Convert contract to booking data format
  const formData = {
    id: contract.enquiryId || contract.id,
    contractId: contract.id,
    clientName: contract.clientName,
    venue: contract.venue,
    eventDate: contract.eventDate,
    eventTime: contract.eventTime,
    eventEndTime: contract.eventEndTime,
    performanceDuration: contract.performanceDuration,
    // Include existing booking data if available
    ...bookingData
  };

  const apiEndpoint = process.env.NODE_ENV === 'production' 
    ? 'https://musobuddy.replit.app' 
    : 'http://localhost:5000';

  return collaborativeFormGenerator.generateStandaloneForm(
    formData,
    apiEndpoint,
    portalToken
  );
}