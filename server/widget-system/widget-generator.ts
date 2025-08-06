import { storage } from "../core/storage";

export async function generateWidgetHTML(userId: string, token: string): Promise<string> {
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
    <title>Book ${businessName} - Quick Booking</title>
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
            max-width: 500px;
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
            min-height: 100px;
        }
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
        .contact-info {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #718096;
            font-size: 14px;
        }
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
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">MB</div>
            <h1>Quick Booking</h1>
            <p class="subtitle">Book ${businessName} for your event</p>
        </div>

        <div id="success-message" class="success-message" style="display:none;">
            <strong>Thank you!</strong> Your booking request has been received. We'll get back to you soon.
        </div>

        <div id="error-message" class="error-message" style="display:none;">
            There was an error sending your request. Please try again or contact us directly.
        </div>

        <form id="booking-form">
            <div class="form-group">
                <label for="name">Your Name <span class="required">*</span></label>
                <input type="text" id="name" name="name" required>
            </div>

            <div class="form-group">
                <label for="email">Email Address <span class="required">*</span></label>
                <input type="email" id="email" name="email" required>
            </div>

            <div class="form-group">
                <label for="phone">Phone Number</label>
                <input type="tel" id="phone" name="phone">
            </div>

            <div class="form-group">
                <label for="eventDate">Event Date <span class="required">*</span></label>
                <input type="date" id="eventDate" name="eventDate" required min="${new Date().toISOString().split('T')[0]}">
            </div>

            <div class="form-group">
                <label for="eventTime">Event Time</label>
                <input type="time" id="eventTime" name="eventTime">
            </div>

            <div class="form-group">
                <label for="venue">Venue/Location</label>
                <input type="text" id="venue" name="venue" placeholder="Where is your event?">
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
                    <option value="other">Other</option>
                </select>
            </div>

            <div class="form-group">
                <label for="message">Additional Details</label>
                <textarea id="message" name="message" placeholder="Tell us about your event, budget, special requirements, etc."></textarea>
            </div>

            <button type="submit" class="submit-btn">Send Booking Request</button>
        </form>

        <div class="loading" id="loading">
            Sending your request...
        </div>

        <div class="contact-info">
            <p><strong>Direct Contact:</strong></p>
            ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
            ${phone ? `<p>Phone: ${phone}</p>` : ''}
        </div>
    </div>

    <script>
        document.getElementById('booking-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const form = e.target;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.token = '${token}';
            
            // Show loading state
            document.getElementById('loading').style.display = 'block';
            document.querySelector('.submit-btn').disabled = true;
            document.getElementById('success-message').style.display = 'none';
            document.getElementById('error-message').style.display = 'none';
            
            try {
                const response = await fetch('https://musobuddy.replit.app/api/widget/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    document.getElementById('success-message').style.display = 'block';
                    form.reset();
                    form.style.display = 'none';
                } else {
                    throw new Error('Request failed');
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('error-message').style.display = 'block';
            } finally {
                document.getElementById('loading').style.display = 'none';
                document.querySelector('.submit-btn').disabled = false;
            }
        });
    </script>
</body>
</html>`;
}