import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function DataProcessingAgreement() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4" data-testid="back-to-musobuddy">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ← Back to MusoBuddy
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Processing Agreement</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Last updated: September 11, 2025</p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2>1. Introduction</h2>
            <p>This Data Processing Agreement ("DPA") forms part of the Terms of Service between MusoBuddy ("Data Processor") and you ("Data Controller") regarding the processing of personal data in connection with our music business management services.</p>

            <h2>2. Definitions</h2>
            <ul>
              <li><strong>Personal Data:</strong> Any information relating to an identified or identifiable natural person as defined by applicable data protection laws</li>
              <li><strong>Data Controller:</strong> The musician, band, or business entity that determines the purposes and means of processing personal data</li>
              <li><strong>Data Processor:</strong> MusoBuddy, which processes personal data on behalf of the Data Controller</li>
              <li><strong>Data Subject:</strong> The individual whose personal data is being processed (e.g., clients, audience members)</li>
              <li><strong>Processing:</strong> Any operation performed on personal data including collection, storage, organization, use, disclosure, or deletion</li>
            </ul>

            <h2>3. Scope of Processing</h2>
            <h3>3.1 Categories of Personal Data</h3>
            <p>MusoBuddy may process the following categories of personal data on your behalf:</p>
            <ul>
              <li>Contact information (names, email addresses, phone numbers)</li>
              <li>Business information (company names, addresses)</li>
              <li>Financial data (payment details, invoice information)</li>
              <li>Event details (booking information, venue details)</li>
              <li>Communication records (messages, emails, correspondence)</li>
              <li>Contract and agreement data</li>
            </ul>

            <h3>3.2 Categories of Data Subjects</h3>
            <ul>
              <li>Event organizers and clients</li>
              <li>Venue representatives</li>
              <li>Business contacts and partners</li>
              <li>Suppliers and service providers</li>
              <li>End users of music services</li>
            </ul>

            <h3>3.3 Purposes of Processing</h3>
            <p>Personal data is processed for the following purposes:</p>
            <ul>
              <li>Managing bookings and events</li>
              <li>Creating and managing contracts</li>
              <li>Processing payments and invoicing</li>
              <li>Facilitating communication</li>
              <li>Maintaining business records</li>
              <li>Providing platform services and support</li>
            </ul>

            <h2>4. Data Controller Obligations</h2>
            <p>As the Data Controller, you warrant that:</p>
            <ul>
              <li>You have a lawful basis for processing all personal data</li>
              <li>You have obtained necessary consents from data subjects</li>
              <li>You have provided required privacy notices to data subjects</li>
              <li>You will only share personal data necessary for the specified purposes</li>
              <li>You will promptly notify MusoBuddy of any data subject requests</li>
              <li>You will comply with all applicable data protection laws</li>
            </ul>

            <h2>5. Data Processor Obligations</h2>
            <p>MusoBuddy undertakes to:</p>
            <ul>
              <li>Process personal data only on your documented instructions</li>
              <li>Implement appropriate technical and organizational security measures</li>
              <li>Ensure confidentiality of personal data</li>
              <li>Assist with data subject rights requests</li>
              <li>Notify you of any personal data breaches without undue delay</li>
              <li>Delete or return personal data upon termination of services</li>
              <li>Only engage sub-processors with appropriate safeguards</li>
            </ul>

            <h2>6. Security Measures</h2>
            <p>MusoBuddy implements the following security measures:</p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Access controls and authentication systems</li>
              <li>Regular security monitoring and auditing</li>
              <li>Employee training on data protection</li>
              <li>Incident response and breach notification procedures</li>
              <li>Regular security assessments and updates</li>
            </ul>

            <h2>7. Sub-Processors</h2>
            <h3>7.1 Authorized Sub-Processors</h3>
            <p>MusoBuddy may engage the following sub-processors:</p>
            <ul>
              <li><strong>Cloudflare R2:</strong> Document storage and delivery</li>
              <li><strong>Mailgun:</strong> Email delivery services</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Neon Database:</strong> Database hosting</li>
              <li><strong>Replit:</strong> Platform infrastructure</li>
            </ul>

            <h3>7.2 Sub-Processor Changes</h3>
            <p>We will notify you of any changes to sub-processors with at least 30 days notice. You may object to new sub-processors if they do not provide adequate protection.</p>

            <h2>8. Data Subject Rights</h2>
            <p>MusoBuddy will assist you in responding to data subject requests including:</p>
            <ul>
              <li>Access requests (providing copies of personal data)</li>
              <li>Rectification requests (correcting inaccurate data)</li>
              <li>Erasure requests (deleting personal data)</li>
              <li>Portability requests (providing data in structured format)</li>
              <li>Restriction requests (limiting processing)</li>
              <li>Objection requests (ceasing certain processing activities)</li>
            </ul>

            <h2>9. Data Breach Procedures</h2>
            <p>In the event of a personal data breach:</p>
            <ul>
              <li>MusoBuddy will notify you without undue delay (within 72 hours)</li>
              <li>Notification will include nature of breach, categories and numbers affected</li>
              <li>We will provide ongoing updates as investigation progresses</li>
              <li>We will assist with regulatory notifications if required</li>
              <li>Remedial actions will be taken to contain and resolve the breach</li>
            </ul>

            <h2>10. International Data Transfers</h2>
            <p>Where personal data is transferred outside the UK/EEA:</p>
            <ul>
              <li>Transfers will only occur to countries with adequacy decisions</li>
              <li>Or appropriate safeguards will be implemented (e.g., Standard Contractual Clauses)</li>
              <li>We will inform you of any international transfers</li>
              <li>Additional protections may be implemented as required</li>
            </ul>

            <h2>11. Data Retention and Deletion</h2>
            <p>Personal data will be:</p>
            <ul>
              <li>Retained only for as long as necessary for the specified purposes</li>
              <li>Deleted or anonymized when no longer required</li>
              <li>Returned or deleted upon termination of services</li>
              <li>Subject to any legal retention requirements</li>
            </ul>

            <h2>12. Audit and Compliance</h2>
            <p>MusoBuddy will:</p>
            <ul>
              <li>Maintain records of processing activities</li>
              <li>Provide information necessary for demonstrating compliance</li>
              <li>Allow for and contribute to audits conducted by you or your appointed auditor</li>
              <li>Implement recommendations arising from audits</li>
            </ul>

            <h2>13. Termination</h2>
            <p>Upon termination of services:</p>
            <ul>
              <li>All personal data will be returned or deleted as instructed</li>
              <li>Deletion will be confirmed in writing</li>
              <li>Copies may be retained only as required by law</li>
              <li>Access to personal data will be immediately revoked</li>
            </ul>

            <h2>14. Contact Information</h2>
            <p>For questions about data processing or to exercise data subject rights, contact us at: <a href="mailto:timfulkermusic@gmail.com" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">timfulkermusic@gmail.com</a></p>

            <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">Data Protection Commitment</h3>
              <p className="text-purple-700 dark:text-purple-300">
                MusoBuddy is committed to protecting personal data and ensuring compliance with applicable data protection laws. 
                This DPA ensures transparency in our data processing relationship.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}