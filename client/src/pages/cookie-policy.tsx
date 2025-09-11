import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="mb-6">
            <Link href="/settings" className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4" data-testid="back-to-legal">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Legal
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cookie Policy</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Last updated: September 11, 2025</p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2>1. What Are Cookies</h2>
            <p>Cookies are small text files that are stored on your device when you visit a website. They help websites remember information about your visit, which can both make it easier to visit the site again and make the site more useful to you.</p>

            <h2>2. How MusoBuddy Uses Cookies</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul>
              <li>Keep you logged in to your account</li>
              <li>Remember your preferences and settings</li>
              <li>Ensure the security of your account</li>
              <li>Analyze how our platform is used to improve our services</li>
              <li>Provide essential platform functionality</li>
            </ul>

            <h2>3. Types of Cookies We Use</h2>
            
            <h3>3.1 Essential Cookies</h3>
            <p>These cookies are necessary for the platform to function properly and cannot be disabled:</p>
            <ul>
              <li><strong>Authentication Cookies:</strong> Keep you logged in securely</li>
              <li><strong>Security Cookies:</strong> Protect against unauthorized access</li>
              <li><strong>Session Cookies:</strong> Remember your current session state</li>
            </ul>

            <h3>3.2 Functional Cookies</h3>
            <p>These cookies enhance your experience by remembering your choices:</p>
            <ul>
              <li><strong>Theme Preferences:</strong> Remember your dark/light mode choice</li>
              <li><strong>Language Settings:</strong> Store your preferred language</li>
              <li><strong>User Interface:</strong> Remember layout and display preferences</li>
            </ul>

            <h3>3.3 Analytics Cookies</h3>
            <p>These cookies help us understand how you use our platform:</p>
            <ul>
              <li><strong>Usage Analytics:</strong> Track which features are most used</li>
              <li><strong>Performance Monitoring:</strong> Identify and fix technical issues</li>
              <li><strong>Error Tracking:</strong> Monitor system errors and bugs</li>
            </ul>

            <h2>4. Third-Party Cookies</h2>
            <p>Some cookies are set by third-party services we use:</p>
            
            <h3>4.1 Stripe (Payment Processing)</h3>
            <p>Stripe sets cookies to securely process payments and prevent fraud. These are essential for payment functionality.</p>

            <h3>4.2 Cloudflare (Security and Performance)</h3>
            <p>Cloudflare uses cookies to provide security protection and improve performance.</p>

            <h3>4.3 Replit (Platform Infrastructure)</h3>
            <p>Replit may set cookies for platform hosting and authentication services.</p>

            <h2>5. Managing Your Cookie Preferences</h2>
            
            <h3>5.1 Browser Settings</h3>
            <p>You can control cookies through your browser settings:</p>
            <ul>
              <li>Block all cookies (may affect platform functionality)</li>
              <li>Delete existing cookies</li>
              <li>Set preferences for future cookies</li>
              <li>Receive notifications when cookies are set</li>
            </ul>

            <h3>5.2 Essential Cookies Notice</h3>
            <p>Please note that disabling essential cookies will prevent core platform functionality including login, security features, and data storage.</p>

            <h2>6. Cookie Retention</h2>
            <p>Different cookies have different lifespans:</p>
            <ul>
              <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
              <li><strong>Persistent Cookies:</strong> Remain until their expiry date or manual deletion</li>
              <li><strong>Authentication Cookies:</strong> Typically expire after 30 days of inactivity</li>
            </ul>

            <h2>7. Updates to This Cookie Policy</h2>
            <p>We may update this Cookie Policy to reflect changes in our practices or applicable laws. We will notify you of any material changes through the platform or via email.</p>

            <h2>8. Contact Information</h2>
            <p>If you have questions about our use of cookies, please contact us at: <a href="mailto:timfulkermusic@gmail.com" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">timfulkermusic@gmail.com</a></p>

            <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">Cookie Transparency</h3>
              <p className="text-purple-700 dark:text-purple-300">
                We believe in being transparent about how we use cookies. Most cookies we use are essential for 
                providing you with a secure and functional music business management platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}