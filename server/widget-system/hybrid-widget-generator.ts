import { storage } from "../core/storage";

export async function generateHybridWidgetHTML(userId: string, token: string): Promise<string> {
  const user = await storage.getUserById(userId);
  const userSettings = await storage.getSettings(userId);
  
  const businessName = userSettings?.businessName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'MusoBuddy';
  const businessEmail = userSettings?.businessEmail || user?.email || '';
  const phone = userSettings?.phone || '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book ${businessName} - Hybrid Booking</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 32px;
            width: 100%;
            max-width: 600px;
        }
        .header {
            text-align: center;
            margin-bottom: 24px;
        }
        .logo {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 12px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }
        h1 {
            color: #1a202c;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .subtitle {
            color: #718096;
            margin-bottom: 24px;
        }
        
        /* Mode Toggle */
        .mode-toggle {
            display: flex;
            background: #f7fafc;
            border-radius: 12px;
            padding: 4px;
            margin-bottom: 24px;
        }
        .mode-button {
            flex: 1;
            padding: 12px 16px;
            border: none;
            background: transparent;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #4a5568;
            transition: all 0.2s;
        }
        .mode-button.active {
            background: white;
            color: #667eea;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .mode-button:hover:not(.active) {
            color: #2d3748;
        }
        
        /* Forms */
        .form-container {
            min-height: 400px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            color: #4a5568;
            font-weight: 500;
            margin-bottom: 6px;
        }
        .required { color: #e53e3e; }
        input, textarea, select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.2s;
        }
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        textarea {
            resize: vertical;
            min-height: 140px;
        }
        .textarea-large {
            min-height: 180px;
        }
        
        /* Buttons */
        .submit-btn {
            width: 100%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 14px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }
        .submit-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.2);
        }
        .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        /* Messages */
        .success-message, .error-message {
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        .success-message {
            background: #f0fff4;
            color: #22543d;
            border: 1px solid #9ae6b4;
        }
        .error-message {
            background: #fed7d7;
            color: #742a2a;
            border: 1px solid #fc8181;
        }
        .loading {
            display: none;
            text-align: center;
            color: #718096;
            margin-top: 10px;
        }
        
        /* Hidden forms */
        .form-mode {
            display: none;
        }
        .form-mode.active {
            display: block;
        }
        
        /* Help text */
        .help-text {
            font-size: 14px;
            color: #718096;
            margin-top: 6px;
            line-height: 1.4;
        }
        
        /* Quick message examples */
        .examples {
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 16px;
        }
        .examples h4 {
            color: #4a5568;
            font-size: 14px;
            margin-bottom: 8px;
        }
        .example-item {
            font-size: 13px;
            color: #718096;
            margin-bottom: 4px;
            font-style: italic;
        }
        
        /* Contact info */
        .contact-info {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #718096;
            font-size: 14px;
        }
        
        /* Two column grid for structured form */
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .form-grid .form-group {
            margin-bottom: 16px;
        }
        
        @media (max-width: 600px) {
            .form-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">MB</div>
            <h1>Book ${businessName}</h1>
            <p class="subtitle">Choose your preferred way to send a booking request</p>
        </div>

        <div id="success-message" class="success-message" style="display:none;">
            <strong>Thank you!</strong> Your booking request has been received. We'll get back to you soon.
        </div>

        <div id="error-message" class="error-message" style="display:none;">
            There was an error sending your request. Please try again or contact us directly.
        </div>

        <!-- Mode Toggle -->
        <div class="mode-toggle">
            <button class="mode-button active" onclick="switchMode('quick')" id="quick-btn">
                💬 Quick Message
            </button>
            <button class="mode-button" onclick="switchMode('detailed')" id="detailed-btn">
                📋 Detailed Form
            </button>
        </div>

        <div class="form-container">
            <!-- Quick Message Mode -->
            <div id="quick-mode" class="form-mode active">
                <div class="examples">
                    <h4>💡 Just tell us about your event in your own words:</h4>
                    <div class="example-item">"Hi, are you available for our wedding on June 16th in Manchester?"</div>
                    <div class="example-item">"Looking for a musician for a corporate event next month in London"</div>
                    <div class="example-item">"Private party on Saturday evening, budget around £300"</div>
                </div>
                
                <form id="quick-form">
                    <div class="form-group">
                        <label for="quick-message">Your Message <span class="required">*</span></label>
                        <textarea 
                            id="quick-message" 
                            name="messageText" 
                            class="textarea-large"
                            placeholder="Tell us about your event - date, location, type of event, budget, etc. Just write naturally!"
                            required
                        ></textarea>
                        <div class="help-text">
                            Our AI will extract the details from your message. Include as much or as little as you want!
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="quick-contact">Your Name & Contact <span class="required">*</span></label>
                        <input 
                            type="text" 
                            id="quick-contact" 
                            name="clientContact" 
                            placeholder="Your name and email or phone number"
                            required
                        >
                    </div>

                    <button type="submit" class="submit-btn" id="quick-submit">
                        🚀 Send Quick Message
                    </button>
                </form>
            </div>

            <!-- Detailed Form Mode -->
            <div id="detailed-mode" class="form-mode">
                <p style="color: #718096; margin-bottom: 20px; font-size: 14px;">
                    Fill in as many details as you can. All fields except name and email are optional.
                </p>
                
                <form id="detailed-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="name">Your Name <span class="required">*</span></label>
                            <input type="text" id="name" name="name" required>
                        </div>

                        <div class="form-group">
                            <label for="email">Email Address <span class="required">*</span></label>
                            <input type="email" id="email" name="email" required>
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label for="phone">Phone Number</label>
                            <input type="tel" id="phone" name="phone">
                        </div>

                        <div class="form-group">
                            <label for="eventType">Event Type</label>
                            <select id="eventType" name="eventType">
                                <option value="">Select event type</option>
                                <option value="wedding">Wedding</option>
                                <option value="party">Private Party</option>
                                <option value="corporate">Corporate Event</option>
                                <option value="pub">Pub/Bar</option>
                                <option value="restaurant">Restaurant</option>
                                <option value="festival">Festival</option>
                                <option value="birthday">Birthday Party</option>
                                <option value="anniversary">Anniversary</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label for="eventDate">Event Date</label>
                            <input type="date" id="eventDate" name="eventDate" min="${new Date().toISOString().split('T')[0]}">
                        </div>

                        <div class="form-group">
                            <label for="eventTime">Event Time</label>
                            <input type="time" id="eventTime" name="eventTime">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="venue">Venue/Location</label>
                        <input type="text" id="venue" name="venue" placeholder="Where is your event?">
                    </div>

                    <div class="form-group">
                        <label for="message">Additional Details & Special Requirements</label>
                        <textarea 
                            id="message" 
                            name="message" 
                            placeholder="Budget, special requirements, music preferences, etc."
                        ></textarea>
                    </div>

                    <button type="submit" class="submit-btn" id="detailed-submit">
                        📋 Send Detailed Request
                    </button>
                </form>
            </div>
        </div>

        <div class="loading" id="loading">
            Processing your request...
        </div>

        <div class="contact-info">
            <p><strong>Direct Contact:</strong></p>
            ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
            ${phone ? `<p>Phone: ${phone}</p>` : ''}
        </div>
    </div>

    <script>
        let currentMode = 'quick';
        
        function switchMode(mode) {
            currentMode = mode;
            
            // Update buttons
            document.getElementById('quick-btn').classList.toggle('active', mode === 'quick');
            document.getElementById('detailed-btn').classList.toggle('active', mode === 'detailed');
            
            // Update forms
            document.getElementById('quick-mode').classList.toggle('active', mode === 'quick');
            document.getElementById('detailed-mode').classList.toggle('active', mode === 'detailed');
            
            // Clear any previous messages
            document.getElementById('success-message').style.display = 'none';
            document.getElementById('error-message').style.display = 'none';
        }

        async function submitForm(formData, isQuickMode) {
            try {
                const endpoint = isQuickMode ? '/api/widget/parse-message' : '/api/widget/submit';
                formData.token = '${token}';
                formData.mode = isQuickMode ? 'quick' : 'detailed';
                
                const response = await fetch('https://musobuddy.replit.app' + endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    document.getElementById('success-message').style.display = 'block';
                    document.getElementById('quick-mode').style.display = 'none';
                    document.getElementById('detailed-mode').style.display = 'none';
                    document.querySelector('.mode-toggle').style.display = 'none';
                } else {
                    throw new Error('Request failed');
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('error-message').style.display = 'block';
            }
        }

        // Quick form handler
        document.getElementById('quick-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            // Show loading
            document.getElementById('loading').style.display = 'block';
            document.getElementById('quick-submit').disabled = true;
            document.getElementById('success-message').style.display = 'none';
            document.getElementById('error-message').style.display = 'none';
            
            await submitForm(data, true);
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('quick-submit').disabled = false;
        });

        // Detailed form handler  
        document.getElementById('detailed-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            // Show loading
            document.getElementById('loading').style.display = 'block';
            document.getElementById('detailed-submit').disabled = true;
            document.getElementById('success-message').style.display = 'none';
            document.getElementById('error-message').style.display = 'none';
            
            await submitForm(data, false);
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('detailed-submit').disabled = false;
        });
    </script>
</body>
</html>`;
}