import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="mb-6">
            <Link href="/settings" className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4" data-testid="back-to-legal">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Legal
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Disclaimer</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Last updated: September 11, 2025</p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2>1. General Disclaimer</h2>
            <p>The information provided by MusoBuddy ("we," "us," or "our") on our platform and through our services is for general informational purposes only. All information is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the platform.</p>

            <h2>2. Service Disclaimer</h2>
            <h3>2.1 "As Is" Basis</h3>
            <p>MusoBuddy services are provided on an "as is" and "as available" basis without warranties of any kind, either express or implied, including but not limited to:</p>
            <ul>
              <li>Implied warranties of merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
              <li>Accuracy or completeness</li>
              <li>Uninterrupted or error-free operation</li>
            </ul>

            <h3>2.2 Platform Availability</h3>
            <p>We do not warrant that:</p>
            <ul>
              <li>The service will be available at all times</li>
              <li>The platform will be free from interruptions, delays, or errors</li>
              <li>All features will work as expected in all circumstances</li>
              <li>Data will never be lost or corrupted</li>
              <li>Third-party integrations will always function properly</li>
            </ul>

            <h2>3. Legal Document Disclaimer</h2>
            <h3>3.1 Not Legal Advice</h3>
            <p>The contracts, templates, and legal documents generated through MusoBuddy:</p>
            <ul>
              <li>Are provided for informational purposes only</li>
              <li>Do not constitute legal advice</li>
              <li>Should be reviewed by qualified legal professionals</li>
              <li>May not be suitable for all circumstances</li>
              <li>Should be customized for specific situations</li>
            </ul>

            <h3>3.2 Legal Responsibility</h3>
            <ul>
              <li>Users are responsible for ensuring legal compliance</li>
              <li>We recommend consulting with qualified attorneys</li>
              <li>Legal requirements vary by jurisdiction</li>
              <li>Users must verify applicable laws and regulations</li>
              <li>MusoBuddy assumes no liability for legal adequacy</li>
            </ul>

            <h2>4. Business and Financial Disclaimers</h2>
            <h3>4.1 Business Results</h3>
            <p>MusoBuddy does not guarantee:</p>
            <ul>
              <li>Increased bookings or business success</li>
              <li>Faster payment collection from clients</li>
              <li>Specific financial outcomes or results</li>
              <li>Professional success or career advancement</li>
              <li>Resolution of business disputes</li>
            </ul>

            <h3>4.2 Financial Information</h3>
            <ul>
              <li>Pricing guidance is for reference only</li>
              <li>Market rates vary by location and circumstances</li>
              <li>Users should research local market conditions</li>
              <li>Financial decisions are user's responsibility</li>
              <li>Tax implications should be verified with professionals</li>
            </ul>

            <h2>5. Third-Party Services Disclaimer</h2>
            <p>MusoBuddy integrates with third-party services including:</p>
            <ul>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Mailgun:</strong> Email delivery</li>
              <li><strong>Cloudflare:</strong> Cloud storage and security</li>
              <li><strong>Google Services:</strong> Calendar and authentication</li>
            </ul>

            <p>We disclaim responsibility for:</p>
            <ul>
              <li>Third-party service availability or performance</li>
              <li>Changes to third-party terms or pricing</li>
              <li>Data handling by third-party providers</li>
              <li>Service interruptions caused by external providers</li>
              <li>Third-party security breaches or data loss</li>
            </ul>

            <h2>6. Data and Privacy Disclaimers</h2>
            <h3>6.1 Data Accuracy</h3>
            <ul>
              <li>Users are responsible for data accuracy</li>
              <li>We cannot verify the correctness of user-provided information</li>
              <li>Data loss may occur despite security measures</li>
              <li>Regular backups are recommended</li>
              <li>Users should maintain their own records</li>
            </ul>

            <h3>6.2 Privacy and Security</h3>
            <ul>
              <li>No system is completely secure</li>
              <li>Internet transmission carries inherent risks</li>
              <li>Users should protect their login credentials</li>
              <li>We implement reasonable security measures but cannot guarantee absolute security</li>
            </ul>

            <h2>7. Professional Services Disclaimer</h2>
            <p>MusoBuddy is a technology platform and does not provide:</p>
            <ul>
              <li>Legal services or advice</li>
              <li>Accounting or tax services</li>
              <li>Business consulting or management services</li>
              <li>Professional music industry advice</li>
              <li>Investment or financial planning services</li>
            </ul>

            <h2>8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law:</p>
            <ul>
              <li>MusoBuddy shall not be liable for any indirect, incidental, special, or consequential damages</li>
              <li>Our total liability is limited to the amount paid by you in the 12 months preceding the claim</li>
              <li>We are not liable for business losses, lost profits, or missed opportunities</li>
              <li>Users assume full risk for use of the platform</li>
            </ul>

            <h2>9. Force Majeure</h2>
            <p>MusoBuddy is not liable for any failure or delay in performance due to:</p>
            <ul>
              <li>Acts of God, natural disasters, or severe weather</li>
              <li>War, terrorism, or civil unrest</li>
              <li>Government actions or regulations</li>
              <li>Internet or infrastructure failures</li>
              <li>Pandemics or public health emergencies</li>
              <li>Other circumstances beyond our reasonable control</li>
            </ul>

            <h2>10. User Responsibility</h2>
            <p>Users acknowledge responsibility for:</p>
            <ul>
              <li>Complying with applicable laws and regulations</li>
              <li>Obtaining appropriate professional advice</li>
              <li>Verifying the accuracy of generated documents</li>
              <li>Maintaining appropriate insurance coverage</li>
              <li>Regular data backups and security practices</li>
              <li>Understanding platform limitations</li>
            </ul>

            <h2>11. Updates and Changes</h2>
            <p>This disclaimer may be updated periodically to reflect:</p>
            <ul>
              <li>Changes in services or features</li>
              <li>Legal or regulatory requirements</li>
              <li>Industry best practices</li>
              <li>User feedback and platform improvements</li>
            </ul>

            <h2>12. Contact Information</h2>
            <p>For questions about this disclaimer or our services, contact us at: <a href="mailto:timfulkermusic@gmail.com" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">timfulkermusic@gmail.com</a></p>

            <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">Important Notice</h3>
              <p className="text-purple-700 dark:text-purple-300">
                This disclaimer is designed to protect both MusoBuddy and our users by clearly outlining the limitations 
                and responsibilities associated with using our platform. Please read carefully and contact us with any questions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}