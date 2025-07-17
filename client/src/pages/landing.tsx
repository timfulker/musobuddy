import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Calendar, FileText, PoundSterling, Shield, BarChart3, CheckCircle, Star, Zap, Users, CreditCard, Smartphone, Brain } from "lucide-react";
import logoImage from "/musobuddy-logo-purple.png";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between" role="navigation" aria-label="Main navigation">
          <div className="flex items-center space-x-3">
            <img src={logoImage} alt="MusoBuddy Logo - Professional Music Business Management" className="w-12 h-12 rounded-xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MusoBuddy</h1>
              <p className="text-sm text-gray-600">Professional Music Business Management</p>
            </div>
          </div>
          <Button onClick={handleLogin} size="lg" className="bg-purple-600 hover:bg-purple-700" aria-label="Get started with MusoBuddy">
            Get Started Free
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main>
        <section className="container mx-auto px-6 py-16 text-center" aria-labelledby="hero-heading">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mb-6">
            <Star className="w-4 h-4" />
            <span className="font-semibold">Production Ready - Live Now</span>
          </div>
          <h2 id="hero-heading" className="text-5xl font-bold text-gray-900 mb-6">
            Complete Music Business Management Platform for Freelance Musicians
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            MusoBuddy is the complete booking management platform for freelance musicians. 
            Manage enquiries, generate contracts, track invoices, and handle compliance - 
            all in one professional system that saves you 70% of your admin time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleLogin} size="lg" className="bg-purple-600 hover:bg-purple-700 px-8" aria-label="Start using MusoBuddy for free">
              Start Using MusoBuddy Free
            </Button>
            <Button variant="outline" size="lg" className="px-8" aria-label="View all features">
              View All Features
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-6 py-16" aria-labelledby="features-heading">
          <h3 id="features-heading" className="text-3xl font-bold text-center text-gray-900 mb-4">
            Complete Music Business Management Features
          </h3>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            All core features are live and ready to use. Start managing your music business professionally today with our comprehensive booking management system.
          </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Smart Enquiry Tracking</h4>
              <p className="text-gray-600">
                Capture and manage leads from multiple sources with automated follow-ups and status tracking.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Contract Generation</h4>
              <p className="text-gray-600">
                Auto-generate professional contracts from enquiry data with customizable templates and e-signatures.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <PoundSterling className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Invoice Management</h4>
              <p className="text-gray-600">
                Create and track invoices with payment reminders, multiple payment methods, and reconciliation.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Calendar Integration</h4>
              <p className="text-gray-600">
                Import calendar events from Google Calendar, Apple Calendar, and Outlook with conflict detection.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Compliance Tracking</h4>
              <p className="text-gray-600">
                Automated reminders for insurance, certifications, and industry requirements with document storage.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Business Dashboard</h4>
              <p className="text-gray-600">
                Monitor monthly revenue, active bookings, pending invoices, and enquiries requiring attention.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Future Enhancements Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Future Enhancements Coming Soon
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Advanced Automation */}
            <Card className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">Advanced Automation</h4>
                    <p className="text-sm text-blue-600 font-medium">Coming Soon</p>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-500" />
                    <span>AI-powered email responses and client communication</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>Smart scheduling with availability optimization</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Automated contract terms based on gig type</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span>Advanced analytics and business insights</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Email client integration for seamless communication</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Marketplace & Growth */}
            <Card className="border-2 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">Marketplace & Growth</h4>
                    <p className="text-sm text-purple-600 font-medium">Coming Soon</p>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-500" />
                    <span>Integrated payment processing and escrow</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-purple-500" />
                    <span>Native mobile app for iOS and Android</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>Client portal for bookings and payments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-500" />
                    <span>Musician marketplace and referral system</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>Google Maps integration for multi-event per day feasibility</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Built Specifically for Musicians
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Reduce admin time by 70%</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Increase booking conversion rates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Professional client presentation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Mobile-first responsive design</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">GDPR compliant and secure</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <blockquote className="text-lg text-gray-700 italic mb-4">
                "MusoBuddy has transformed how I manage my music business. I used to spend hours each week on admin - now it's all automated and professional."
              </blockquote>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Sarah Johnson</p>
                  <p className="text-sm text-gray-600">Wedding Saxophonist</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-16" aria-labelledby="faq-heading">
        <div className="container mx-auto px-6">
          <h3 id="faq-heading" className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h3>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Is MusoBuddy free to use?</h4>
                <p className="text-gray-600 mb-4">Yes, MusoBuddy is currently free to use with all core features available. We're focused on helping musicians streamline their business operations.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">What types of musicians can use MusoBuddy?</h4>
                <p className="text-gray-600 mb-4">MusoBuddy is designed for all freelance musicians - wedding performers, session musicians, music teachers, bands, and solo artists who handle their own bookings.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Do I need technical skills to use MusoBuddy?</h4>
                <p className="text-gray-600 mb-4">No technical skills required. MusoBuddy is designed to be intuitive and user-friendly, with a simple interface that any musician can use immediately.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Can I integrate with my existing calendar?</h4>
                <p className="text-gray-600 mb-4">Yes, MusoBuddy supports calendar import from Google Calendar, Apple Calendar, and Outlook with automatic conflict detection for double bookings.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">How secure is my data?</h4>
                <p className="text-gray-600 mb-4">MusoBuddy uses enterprise-grade security with encrypted data storage, secure authentication, and is fully GDPR compliant to protect your business information.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Can clients sign contracts digitally?</h4>
                <p className="text-gray-600 mb-4">Yes, MusoBuddy includes digital signature capabilities, allowing clients to sign contracts online with legally binding electronic signatures.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 py-16" aria-labelledby="cta-heading">
        <div className="container mx-auto px-6 text-center">
          <h3 id="cta-heading" className="text-3xl font-bold text-white mb-6">
            Ready to Transform Your Music Business?
          </h3>
          <p className="text-xl text-purple-100 mb-8">
            MusoBuddy is complete and ready to use. Start managing your bookings, contracts, 
            and invoices professionally today.
          </p>
          <Button onClick={handleLogin} size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8" aria-label="Get started with MusoBuddy now">
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <img src={logoImage} alt="MusoBuddy Logo" className="w-10 h-10 rounded-lg" />
            <span className="text-xl font-bold">MusoBuddy</span>
          </div>
          <p className="text-center text-gray-400">
            © 2025 MusoBuddy. All rights reserved. Made with ♪ for musicians.
          </p>
        </div>
      </footer>
      </main>
    </div>
  );
}
