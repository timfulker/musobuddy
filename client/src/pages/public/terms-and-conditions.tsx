import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4" data-testid="back-to-musobuddy">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ← Back to MusoBuddy
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Last updated: September 11, 2025</p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2>1. Introduction</h2>
            <p>Welcome to MusoBuddy ("we", "our", "us"). By creating an account or using our platform (the "Service"), you agree to these Terms of Service. Please read them carefully. If you do not agree, do not use the Service.</p>

            <h2>2. Definitions</h2>
            <ul>
              <li><strong>Service:</strong> The MusoBuddy app, website, and related tools (bookings, contracts, invoices, email integrations, client portal).</li>
              <li><strong>User:</strong> Any individual or business registering for and using the Service (musicians, DJs, bands, event clients).</li>
              <li><strong>Subscription:</strong> Paid plans offered by MusoBuddy (Standard £9.99/month, Premium £13.99/month).</li>
              <li><strong>Beta Tester:</strong> A user invited by MusoBuddy to use the Service for free during a testing period.</li>
            </ul>

            <h2>3. Eligibility</h2>
            <ul>
              <li>You must be at least 18 years old to use MusoBuddy.</li>
              <li>If you are using the Service on behalf of a business, you confirm you have authority to bind that business.</li>
            </ul>

            <h2>4. Accounts & Security</h2>
            <ul>
              <li>You agree to provide accurate, complete, and updated information.</li>
              <li>You are responsible for maintaining the confidentiality of your account login details.</li>
              <li>You must notify us immediately if you suspect unauthorised use of your account.</li>
            </ul>

            <h2>5. Subscriptions & Payments</h2>
            <ul>
              <li><strong>Pricing:</strong> Standard plan £9.99/month, Premium plan £13.99/month.</li>
              <li><strong>Billing:</strong> Subscriptions renew automatically each month until cancelled.</li>
              <li><strong>Trials:</strong> We may offer a 30-day free trial. If payment fails after 48 hours at renewal, your account will be suspended.</li>
              <li>Payments are processed via Stripe. We do not store your full payment card details.</li>
            </ul>

            <h2>6. Cancellations & Refunds</h2>
            <ul>
              <li>You can cancel anytime via your account settings.</li>
              <li>No refunds for partially used billing periods unless required by law (e.g. UK Consumer Rights Act).</li>
            </ul>

            <h2>7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for spam or unsolicited marketing emails.</li>
              <li>Upload unlawful, defamatory, or infringing content.</li>
              <li>Misuse or attempt to hack, reverse engineer, or disrupt the Service.</li>
              <li>Circumvent billing or attempt to use the Service without payment (except during an authorised trial or beta period).</li>
            </ul>

            <h2>8. Intellectual Property</h2>
            <ul>
              <li>MusoBuddy owns all intellectual property in the platform, brand, and software.</li>
              <li>You retain ownership of your own content (e.g., contracts, invoices, media files), but grant us a licence to host and display it within the Service.</li>
            </ul>

            <h2>9. Service Availability</h2>
            <ul>
              <li>We aim for high uptime but do not guarantee uninterrupted access.</li>
              <li>We are not liable for downtime caused by third-party providers (e.g., Mailgun, Stripe, Google).</li>
            </ul>

            <h2>10. Termination</h2>
            <p>We may suspend or terminate your account if you breach these Terms or misuse the Service.</p>

            <h2>11. Limitation of Liability</h2>
            <ul>
              <li>The Service is provided "as is" without warranties.</li>
              <li>We are not liable for loss of income, business, or data except where required by law.</li>
              <li>Nothing in these Terms limits liability for fraud, death, or personal injury caused by negligence.</li>
            </ul>

            <h2>12. Governing Law</h2>
            <p>These Terms are governed by the laws of England and Wales, and disputes will be resolved exclusively in the courts of England and Wales.</p>

            <h2>13. Contact</h2>
            <p>For questions, please email: <a href="mailto:timfulkermusic@gmail.com" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">timfulkermusic@gmail.com</a></p>

            <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">Important Notice</h3>
              <p className="text-purple-700 dark:text-purple-300">
                By using MusoBuddy, you acknowledge and agree to these Terms of Service. 
                Please read them carefully and contact us if you have any questions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}