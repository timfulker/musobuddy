import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="mb-6">
            <Link href="/login" className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms & Conditions</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Last updated: August 4, 2025</p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2>1. Service Overview</h2>
            <p>MusoBuddy provides music business management services including contract creation, invoice generation, booking management, and document storage through our cloud-based platform.</p>

            <h2>2. Data Collection and Processing</h2>
            <h3>2.1 Information We Collect</h3>
            <p>We collect and process the following types of information:</p>
            <ul>
              <li><strong>Account Information:</strong> Email address, business name, contact details</li>
              <li><strong>Business Data:</strong> Client information, booking details, financial records</li>
              <li><strong>Document Content:</strong> Contracts, invoices, and related business documents</li>
              <li><strong>Usage Data:</strong> Platform interactions, feature usage, and system logs</li>
            </ul>

            <h3>2.2 How We Use Your Information</h3>
            <p>Your information is used to:</p>
            <ul>
              <li>Provide core platform services (document generation, storage, management)</li>
              <li>Facilitate communication between you and your clients</li>
              <li>Generate professional contracts and invoices</li>
              <li>Maintain platform security and functionality</li>
              <li>Provide customer support and platform improvements</li>
            </ul>

            <h2>3. Document Storage and Access</h2>
            <h3>3.1 Cloud Storage</h3>
            <p>Documents generated through our platform (contracts, invoices) are stored using Cloudflare R2 cloud storage services. This ensures:</p>
            <ul>
              <li>Reliable document preservation and access</li>
              <li>Global availability and fast loading times</li>
              <li>Professional document delivery to your clients</li>
            </ul>

            <h3>3.2 Document Access</h3>
            <p>Generated documents are accessible through direct cloud storage URLs to ensure:</p>
            <ul>
              <li>Permanent availability for legal and business purposes</li>
              <li>Client access independent of platform availability</li>
              <li>Compliance with business document retention requirements</li>
            </ul>

            <h3>3.3 Client Data in Documents</h3>
            <p>When you create contracts or invoices containing client information (names, addresses, contact details), this information becomes part of the generated document. By using our service, you confirm that:</p>
            <ul>
              <li>You have appropriate consent to include client data in business documents</li>
              <li>You understand that documents may be shared with relevant parties as part of normal business operations</li>
              <li>Client data in documents is necessary for legitimate business purposes</li>
            </ul>

            <h2>4. Data Protection and Privacy Rights</h2>
            <h3>4.1 Your Rights</h3>
            <p>Under data protection regulations, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request copies of your data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data (subject to business retention requirements)</li>
              <li><strong>Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Restriction:</strong> Request limitation of data processing</li>
              <li><strong>Objection:</strong> Object to certain types of data processing</li>
            </ul>

            <h3>4.2 Data Retention</h3>
            <p>We retain your data for as long as necessary to provide services and comply with legal obligations. Business documents (contracts, invoices) may be retained permanently for legal and regulatory compliance.</p>

            <h2>5. Security Measures</h2>
            <p>We implement appropriate technical and organizational measures to protect your data, including:</p>
            <ul>
              <li>Encrypted data transmission and storage</li>
              <li>Access controls and authentication systems</li>
              <li>Regular security monitoring and updates</li>
              <li>Secure cloud infrastructure with enterprise-grade providers</li>
            </ul>

            <h2>6. Third-Party Services</h2>
            <p>Our platform integrates with trusted third-party services:</p>
            <ul>
              <li><strong>Cloudflare R2:</strong> Document storage and delivery</li>
              <li><strong>Mailgun:</strong> Email delivery services</li>
              <li><strong>Neon Database:</strong> Secure data storage</li>
              <li><strong>Replit:</strong> Platform hosting and authentication</li>
            </ul>
            <p>These services are selected for their security standards and compliance with data protection regulations.</p>

            <h2>7. International Data Transfers</h2>
            <p>Your data may be processed in countries outside your jurisdiction. We ensure appropriate safeguards are in place for any international data transfers, including adequate protection measures and compliance with applicable data protection laws.</p>

            <h2>8. Changes to Terms</h2>
            <p>We may update these terms periodically. Significant changes will be communicated through the platform or via email. Continued use of the service constitutes acceptance of updated terms.</p>

            <h2>9. Contact Information</h2>
            <p>For questions about these terms, data protection matters, or to exercise your rights, please contact us through the platform's support system or email support.</p>

            <h2>10. Governing Law</h2>
            <p>These terms are governed by applicable data protection laws including GDPR where applicable, and the laws of the jurisdiction where the service is provided.</p>

            <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">Important Notice</h3>
              <p className="text-purple-700 dark:text-purple-300">
                By using MusoBuddy, you acknowledge that you understand how your data is processed and stored. 
                You confirm that you have appropriate consent for any client data included in generated documents, 
                and you accept the cloud-based nature of document storage for business continuity and accessibility.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}