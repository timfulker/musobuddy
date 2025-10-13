import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4" data-testid="back-to-musobuddy">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ← Back to MusoBuddy
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Refund & Cancellation Policy</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Last updated: September 11, 2025</p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2>1. Subscription Plans</h2>
            <p>MusoBuddy offers the following subscription plans:</p>
            <ul>
              <li><strong>Standard Plan:</strong> £9.99 per month</li>
              <li><strong>Premium Plan:</strong> £13.99 per month</li>
              <li><strong>Free Trial:</strong> 30-day trial period (where applicable)</li>
            </ul>

            <h2>2. Free Trial Period</h2>
            <h3>2.1 Trial Terms</h3>
            <ul>
              <li>New users may be eligible for a 30-day free trial</li>
              <li>No payment required during the trial period</li>
              <li>Full access to platform features during trial</li>
              <li>Trial automatically converts to paid subscription unless cancelled</li>
            </ul>

            <h3>2.2 Trial Cancellation</h3>
            <ul>
              <li>Cancel anytime during the trial period to avoid charges</li>
              <li>Cancellation takes effect immediately</li>
              <li>No fees or penalties for trial cancellation</li>
              <li>Data is retained for 30 days after cancellation</li>
            </ul>

            <h2>3. Subscription Billing</h2>
            <h3>3.1 Billing Cycle</h3>
            <ul>
              <li>Subscriptions are billed monthly in advance</li>
              <li>Billing occurs on the same date each month</li>
              <li>Payments are processed via Stripe</li>
              <li>Payment failure may result in account suspension</li>
            </ul>

            <h3>3.2 Payment Failure</h3>
            <ul>
              <li>If payment fails, we will attempt to collect payment for up to 48 hours</li>
              <li>Account access is suspended if payment cannot be collected</li>
              <li>Data is preserved during suspension period</li>
              <li>Account is restored immediately upon successful payment</li>
            </ul>

            <h2>4. Cancellation Policy</h2>
            <h3>4.1 How to Cancel</h3>
            <ul>
              <li>Cancel anytime through your account settings</li>
              <li>No cancellation fees or penalties</li>
              <li>No questions asked cancellation process</li>
              <li>Cancellation confirmation sent via email</li>
            </ul>

            <h3>4.2 Cancellation Effects</h3>
            <ul>
              <li>Service continues until the end of current billing period</li>
              <li>No additional charges after cancellation</li>
              <li>Data access maintained until period expires</li>
              <li>Can reactivate subscription at any time</li>
            </ul>

            <h2>5. Refund Policy</h2>
            <h3>5.1 General Refund Terms</h3>
            <ul>
              <li>No refunds for partially used billing periods</li>
              <li>Monthly subscriptions are non-refundable once the billing period begins</li>
              <li>Free trial periods are not subject to refunds as no payment is taken</li>
            </ul>

            <h3>5.2 Exceptional Circumstances</h3>
            <p>Refunds may be considered in exceptional circumstances:</p>
            <ul>
              <li>Technical issues preventing platform use for extended periods</li>
              <li>Billing errors or unauthorized charges</li>
              <li>Service not delivered due to platform failure</li>
              <li>Legal requirements under consumer protection laws</li>
            </ul>

            <h3>5.3 UK Consumer Rights</h3>
            <p>Under the UK Consumer Rights Act 2015:</p>
            <ul>
              <li>You may be entitled to a refund if services are not as described</li>
              <li>Refunds may be available if services are not performed with reasonable skill and care</li>
              <li>Consumer rights cannot be waived by these terms</li>
              <li>Contact us if you believe you have a valid consumer rights claim</li>
            </ul>

            <h2>6. Data Retention After Cancellation</h2>
            <h3>6.1 Immediate Cancellation</h3>
            <ul>
              <li>Account access continues until end of billing period</li>
              <li>All data remains accessible during this time</li>
              <li>Documents and files can be downloaded/exported</li>
            </ul>

            <h3>6.2 Post-Cancellation</h3>
            <ul>
              <li>Data is retained for 30 days after account expiry</li>
              <li>Reactivation possible within 30-day period</li>
              <li>After 30 days, account data may be permanently deleted</li>
              <li>Business documents may be retained longer for legal compliance</li>
            </ul>

            <h2>7. Requesting a Refund</h2>
            <p>To request a refund in exceptional circumstances:</p>
            <ul>
              <li>Contact us at <a href="mailto:timfulkermusic@gmail.com" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">timfulkermusic@gmail.com</a></li>
              <li>Include your account email and reason for refund request</li>
              <li>Provide details of the issue or exceptional circumstance</li>
              <li>Allow up to 5 business days for response</li>
            </ul>

            <h2>8. Contact Information</h2>
            <p>For questions about cancellations, refunds, or billing issues, please contact us at: <a href="mailto:timfulkermusic@gmail.com" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">timfulkermusic@gmail.com</a></p>

            <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">Fair and Transparent</h3>
              <p className="text-purple-700 dark:text-purple-300">
                We strive to be fair and transparent with our billing and cancellation policies. 
                If you have any concerns or questions, please don't hesitate to contact us directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}