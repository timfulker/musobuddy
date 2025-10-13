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

        <!-- Single Unified Form -->
        <div class="form-container">
            <div class="examples">
                <h4>💡 Tell us about your event - as much or as little detail as you like:</h4>
                <div class="example-item">"Hi, are you available for our wedding on June 16th in Manchester?"</div>
                <div class="example-item">"Looking for a musician for a corporate event next month in London"</div>
                <div class="example-item">"Private party on Saturday evening, budget around £300"</div>
            </div>
            
            <form id="booking-form">
                <!-- Primary message area -->
                <div class="form-group">
                    <label for="message-text">Your Event Details <span class="required">*</span></label>
                    <textarea 
                        id="message-text" 
                        name="messageText" 
                        class="textarea-large"
                        placeholder="Tell us about your event - date, location, type of event, budget, special requirements, etc. Write as naturally as you like!"
                        required
                    ></textarea>
                    <div class="help-text">
                        Include whatever details you have. Our system will understand your message and help organize your request.
                    </div>
                </div>

                <!-- Simple contact fields -->
                <div class="form-grid">
                    <div class="form-group">
                        <label for="contact-name">Your Name <span class="required">*</span></label>
                        <input 
                            type="text" 
                            id="contact-name" 
                            name="clientName" 
                            placeholder="Your name"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="contact-info">Email or Phone <span class="required">*</span></label>
                        <input 
                            type="text" 
                            id="contact-info" 
                            name="clientContact" 
                            placeholder="your.email@example.com or phone number"
                            required
                        >
                    </div>
                </div>

                <!-- Optional quick fields -->
                <div class="form-grid">
                    <div class="form-group">
                        <label for="event-date">Event Date (if you know it)</label>
                        <input type="date" id="event-date" name="eventDate" min="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label for="event-location">Location (if you know it)</label>
                        <input type="text" id="event-location" name="venue" placeholder="City or venue name">
                    </div>
                </div>

                <button type="submit" class="submit-btn" id="submit-btn">
                    🚀 Send Booking Request
                </button>
            </form>
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
        // Single form handler
        document.getElementById('booking-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const form = e.target;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.token = '${token}';
            
            // Show loading state
            document.getElementById('loading').style.display = 'block';
            document.getElementById('submit-btn').disabled = true;
            document.getElementById('success-message').style.display = 'none';
            document.getElementById('error-message').style.display = 'none';
            
            try {
                const response = await fetch('${process.env.APP_SERVER_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://www.musobuddy.com')}/api/widget/hybrid-submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    document.getElementById('success-message').style.display = 'block';
                    form.style.display = 'none';
                    document.querySelector('.examples').style.display = 'none';
                } else {
                    throw new Error('Request failed');
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('error-message').style.display = 'block';
            } finally {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('submit-btn').disabled = false;
            }
        });
    </script>
</body>
</html>`;
}