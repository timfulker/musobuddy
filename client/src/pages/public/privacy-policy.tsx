import { Link } from 'wouter';

export default function PublicPrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Last updated: September 11, 2025</p>
            <Link href="/" className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mt-4">
              ← Back to MusoBuddy
            </Link>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2>1. Introduction</h2>
            <p>MusoBuddy ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our music business management platform.</p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Personal Information</h3>
            <ul>
              <li><strong>Account Information:</strong> Email address, name, business name, contact details</li>
              <li><strong>Business Information:</strong> Client details, booking information, financial records</li>
              <li><strong>Payment Information:</strong> Payment card details (processed securely via Stripe)</li>
              <li><strong>Communication Data:</strong> Messages, emails, and correspondence through our platform</li>
            </ul>

            <h3>2.2 Usage Information</h3>
            <ul>
              <li>Platform interactions and feature usage</li>
              <li>Device information, IP addresses, and browser type</li>
              <li>Login timestamps and system logs</li>
              <li>Performance analytics and error reports</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and maintain the MusoBuddy service</li>
              <li>Process payments and manage subscriptions</li>
              <li>Generate contracts, invoices, and business documents</li>
              <li>Facilitate communication between you and your clients</li>
              <li>Provide customer support and technical assistance</li>
              <li>Improve our platform and develop new features</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>4. Information Sharing and Disclosure</h2>
            <h3>4.1 Third-Party Service Providers</h3>
            <p>We may share information with trusted service providers:</p>
            <ul>
              <li><strong>Cloudflare R2:</strong> Document storage and delivery</li>
              <li><strong>Mailgun:</strong> Email delivery services</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Neon Database:</strong> Secure data storage</li>
              <li><strong>Replit:</strong> Platform hosting and infrastructure</li>
            </ul>

            <h3>4.2 Business Documents</h3>
            <p>Documents you create (contracts, invoices) may contain client information and are shared as part of normal business operations when you send them to clients or relevant parties.</p>

            <h3>4.3 Legal Requirements</h3>
            <p>We may disclose information if required by law, court order, or to protect our rights and safety.</p>

            <h2>5. Data Security</h2>
            <p>We implement robust security measures including:</p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security monitoring and updates</li>
              <li>Industry-standard security practices</li>
              <li>Limited access to personal information on a need-to-know basis</li>
            </ul>

            <h2>6. Your Privacy Rights</h2>
            <p>Under applicable data protection laws, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request copies of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate information</li>
              <li><strong>Erasure:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Restriction:</strong> Request limitation of processing</li>
              <li><strong>Objection:</strong> Object to certain types of processing</li>
              <li><strong>Withdraw Consent:</strong> Where processing is based on consent</li>
            </ul>

            <h2>7. Data Retention</h2>
            <p>We retain your information for as long as necessary to provide services and comply with legal obligations. Business documents may be retained permanently for legal and regulatory compliance purposes.</p>

            <h2>8. International Data Transfers</h2>
            <p>Your information may be processed in countries outside your jurisdiction. We ensure appropriate safeguards are in place for international transfers, including adequate protection measures.</p>

            <h2>9. Children's Privacy</h2>
            <p>Our service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children under 18.</p>

            <h2>10. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. Continued use of the service after changes constitutes acceptance.</p>

            <h2>11. Contact Information</h2>
            <p>For questions about this Privacy Policy or to exercise your privacy rights, please contact us at:</p>
            <ul>
              <li>Email: support@musobuddy.com</li>
              <li>Website: https://musobuddy.com</li>
            </ul>

            <h2>12. Supervisory Authority</h2>
            <p>If you are in the European Economic Area, you have the right to lodge a complaint with your local supervisory authority regarding our processing of personal data.</p>
          </div>
        </div>
      </div>
    </div>
  );
}