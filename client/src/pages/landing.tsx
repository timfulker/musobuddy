import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Calendar, FileText, DollarSign, Shield, BarChart3, CheckCircle } from "lucide-react";
import logoImage from "/musobuddy-logo-purple.png";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={logoImage} alt="MusoBuddy" className="w-12 h-12 rounded-xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MusoBuddy</h1>
              <p className="text-sm text-gray-600">Admin made easy</p>
            </div>
          </div>
          <Button onClick={handleLogin} size="lg" className="bg-purple-600 hover:bg-purple-700">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          Streamline Your Music Business
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          MusoBuddy is the all-in-one platform for freelance musicians to automate admin workflows, 
          from enquiry to payment. Reduce admin time by 70% and increase booking conversion rates.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={handleLogin} size="lg" className="bg-purple-600 hover:bg-purple-700 px-8">
            Start Free Trial
          </Button>
          <Button variant="outline" size="lg" className="px-8">
            Watch Demo
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Manage Your Music Business
        </h3>
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
                <DollarSign className="w-6 h-6 text-green-600" />
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
                Two-way Google Calendar sync with availability checking and color-coded status indicators.
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
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Analytics Dashboard</h4>
              <p className="text-gray-600">
                Track revenue, conversion rates, and booking trends with comprehensive business insights.
              </p>
            </CardContent>
          </Card>
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

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Streamline Your Music Business?
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of musicians who have already transformed their admin workflows.
          </p>
          <Button onClick={handleLogin} size="lg" className="bg-purple-600 hover:bg-purple-700 px-8">
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <img src={logoImage} alt="MusoBuddy" className="w-10 h-10 rounded-lg" />
            <span className="text-xl font-bold">MusoBuddy</span>
          </div>
          <p className="text-center text-gray-400">
            © 2025 MusoBuddy. All rights reserved. Made with ♪ for musicians.
          </p>
        </div>
      </footer>
    </div>
  );
}
