import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function AcceptableUsePolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4" data-testid="back-to-dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Acceptable Use Policy</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Last updated: September 11, 2025</p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2>1. Purpose</h2>
            <p>This Acceptable Use Policy governs your use of MusoBuddy's services and defines what constitutes appropriate and inappropriate use of our platform. This policy applies to all users and all activities conducted through our service.</p>

            <h2>2. Permitted Uses</h2>
            <p>MusoBuddy may be used for:</p>
            <ul>
              <li>Managing music business bookings, contracts, and invoices</li>
              <li>Professional communication with clients and event organizers</li>
              <li>Storing and organizing business documents and media</li>
              <li>Conducting legitimate music business activities</li>
              <li>Creating and managing professional music industry contracts</li>
              <li>Processing payments and managing business finances</li>
            </ul>

            <h2>3. Prohibited Activities</h2>
            <p>You agree not to use MusoBuddy for any of the following:</p>

            <h3>3.1 Illegal Activities</h3>
            <ul>
              <li>Any activity that violates applicable laws or regulations</li>
              <li>Fraudulent activities or financial crimes</li>
              <li>Money laundering or tax evasion</li>
              <li>Copyright infringement or intellectual property theft</li>
              <li>Identity theft or impersonation</li>
            </ul>

            <h3>3.2 Spam and Unsolicited Communications</h3>
            <ul>
              <li>Sending spam or unsolicited marketing emails</li>
              <li>Mass mailing to purchased or rented email lists</li>
              <li>Automated messaging or bulk communications</li>
              <li>Distribution of malware, viruses, or harmful content</li>
            </ul>

            <h3>3.3 Abuse and Harassment</h3>
            <ul>
              <li>Harassment, threats, or intimidation of other users</li>
              <li>Defamatory, discriminatory, or hate speech content</li>
              <li>Sharing personal information without consent</li>
              <li>Stalking or persistent unwanted contact</li>
            </ul>

            <h3>3.4 Technical Misuse</h3>
            <ul>
              <li>Attempting to hack, disrupt, or compromise system security</li>
              <li>Reverse engineering or decompiling our software</li>
              <li>Circumventing access controls or security measures</li>
              <li>Overloading systems or causing performance issues</li>
              <li>Attempting to gain unauthorized access to other accounts</li>
            </ul>

            <h3>3.5 Content Violations</h3>
            <ul>
              <li>Uploading or sharing illegal, offensive, or inappropriate content</li>
              <li>Adult content, pornography, or sexually explicit material</li>
              <li>Content promoting violence, terrorism, or illegal activities</li>
              <li>Copyrighted material without proper authorization</li>
              <li>False or misleading information</li>
            </ul>

            <h3>3.6 Business Fraud</h3>
            <ul>
              <li>Creating false contracts or fraudulent invoices</li>
              <li>Misrepresenting services or business capabilities</li>
              <li>Engaging in payment fraud or chargeback abuse</li>
              <li>Using the platform for pyramid schemes or scams</li>
            </ul>

            <h2>4. Account Responsibility</h2>
            <p>Users are responsible for:</p>
            <ul>
              <li>All activities conducted through their account</li>
              <li>Maintaining the security of login credentials</li>
              <li>Monitoring and controlling access to their account</li>
              <li>Reporting unauthorized use immediately</li>
              <li>Ensuring compliance with this policy by any team members</li>
            </ul>

            <h2>5. Content Standards</h2>
            <p>All content uploaded to MusoBuddy must:</p>
            <ul>
              <li>Be relevant to legitimate music business activities</li>
              <li>Comply with applicable copyright and intellectual property laws</li>
              <li>Be accurate and truthful</li>
              <li>Not contain malicious code or harmful elements</li>
              <li>Respect the privacy and rights of others</li>
            </ul>

            <h2>6. Reporting Violations</h2>
            <p>To report suspected violations of this policy:</p>
            <ul>
              <li>Email us immediately at <a href="mailto:timfulkermusic@gmail.com" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">timfulkermusic@gmail.com</a></li>
              <li>Include specific details of the violation</li>
              <li>Provide evidence where possible (screenshots, URLs, etc.)</li>
              <li>Include your contact information for follow-up</li>
            </ul>

            <h2>7. Enforcement</h2>
            <p>Violations of this policy may result in:</p>
            <ul>
              <li><strong>Warning:</strong> Notice of policy violation with opportunity to correct</li>
              <li><strong>Temporary Suspension:</strong> Temporary restriction of account access</li>
              <li><strong>Account Termination:</strong> Permanent closure of account</li>
              <li><strong>Legal Action:</strong> Referral to law enforcement if appropriate</li>
              <li><strong>Data Deletion:</strong> Removal of violating content or data</li>
            </ul>

            <h2>8. Investigation Process</h2>
            <p>When violations are reported, we will:</p>
            <ul>
              <li>Investigate the reported activity promptly</li>
              <li>Take temporary protective measures if necessary</li>
              <li>Notify the account holder of any violations found</li>
              <li>Provide opportunity for explanation or correction where appropriate</li>
              <li>Take appropriate enforcement action</li>
            </ul>

            <h2>9. Appeals Process</h2>
            <p>If you believe enforcement action was taken in error:</p>
            <ul>
              <li>Contact us at <a href="mailto:timfulkermusic@gmail.com" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">timfulkermusic@gmail.com</a> within 7 days</li>
              <li>Provide detailed explanation of why you believe the action was incorrect</li>
              <li>Include any supporting evidence</li>
              <li>We will review your appeal and respond within 5 business days</li>
            </ul>

            <h2>10. Updates to This Policy</h2>
            <p>We may update this Acceptable Use Policy to reflect changes in technology, law, or business practices. Updated policies will be posted on our platform and users will be notified of material changes.</p>

            <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">Community Standards</h3>
              <p className="text-purple-700 dark:text-purple-300">
                These policies help maintain a safe, professional environment for all music industry professionals 
                using MusoBuddy. We appreciate your cooperation in following these guidelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}