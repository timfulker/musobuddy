import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Music, FileText, Mail, Calendar, CreditCard, Shield, Star } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Music className="h-10 w-10 text-purple-600" />
              <h1 className="text-2xl font-bold text-purple-800 dark:text-purple-200">MusoBuddy</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-purple-600 hover:text-purple-700">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Your Complete
              <span className="text-purple-600 block">Music Business</span>
              Management Platform
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12">
              Streamline your music career with intelligent booking management, professional contracts, 
              automated invoicing, and compliance tracking - all in one powerful platform designed for musicians.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/signup">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg">
                Start Your Free Trial
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-4 text-lg">
              See Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">10,000+</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Musicians</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">50K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">£2M+</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">98%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to Run Your Music Business
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            From booking enquiries to payment collection, MusoBuddy handles the business side 
            so you can focus on the music.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <FileText className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Smart Contracts</CardTitle>
              <CardDescription>
                Generate professional contracts with digital signatures and automatic reminders.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CreditCard className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Automated Invoicing</CardTitle>
              <CardDescription>
                Create and send professional invoices with payment tracking and overdue alerts.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Mail className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Email Integration</CardTitle>
              <CardDescription>
                Automatic booking enquiry processing from your personalized email address.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Calendar className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Calendar Management</CardTitle>
              <CardDescription>
                Track all your gigs with conflict detection and calendar integration.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Shield className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Compliance Tracking</CardTitle>
              <CardDescription>
                Manage insurance, licenses, and PAT testing with expiry alerts.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Star className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Client Management</CardTitle>
              <CardDescription>
                Build relationships with automatic client history and repeat booking tracking.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Start with a 14-day free trial. No setup fees, no hidden costs.
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <Card className="border-2 border-purple-200 shadow-xl relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-purple-600 text-white px-4 py-1">Most Popular</Badge>
            </div>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Core Plan</CardTitle>
              <div className="text-5xl font-bold text-purple-600 my-4">
                £9.99
                <span className="text-xl text-gray-500 font-normal">/month</span>
              </div>
              <CardDescription>Everything you need to manage your music business professionally</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited contracts & invoices",
                  "Digital signature collection",
                  "Personalized email address",
                  "Automatic booking processing",
                  "Calendar & conflict detection",
                  "Client management system",
                  "Compliance document tracking",
                  "Cloud storage & backups",
                  "Email support"
                ].map((feature) => (
                  <li key={feature} className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3">
                  Start Your Free Trial
                </Button>
              </Link>
              <p className="text-center text-sm text-gray-500 mt-4">
                14-day free trial • Then £9.99/month
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Trusted by Professional Musicians
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                "MusoBuddy transformed my business. I went from spending hours on admin to having 
                everything automated. My clients love the professional contracts and I get paid faster."
              </p>
              <div className="font-semibold">Sarah Johnson</div>
              <div className="text-sm text-gray-500">Wedding & Event Pianist</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                "The email integration is genius. Enquiries automatically become bookings, and the 
                conflict detection has saved me from double-booking disasters multiple times."
              </p>
              <div className="font-semibold">Mike Davies</div>
              <div className="text-sm text-gray-500">Jazz Trio Leader</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                "Professional, reliable, and exactly what I needed. The compliance tracking alone 
                has saved me thousands in potential insurance issues. Highly recommended."
              </p>
              <div className="font-semibold">Emma Thompson</div>
              <div className="text-sm text-gray-500">Function Band Manager</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center bg-purple-600 text-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Music Business?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of professional musicians who've streamlined their business with MusoBuddy.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
              Start Your Free Trial Today
            </Button>
          </Link>
          <p className="text-sm mt-4 opacity-75">
            14 days free • No commitment • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Music className="h-6 w-6 text-purple-600" />
                <span className="text-xl font-bold">MusoBuddy</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Professional music business management for the modern musician.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-purple-600">Features</a></li>
                <li><a href="#" className="hover:text-purple-600">Pricing</a></li>
                <li><a href="#" className="hover:text-purple-600">Demo</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-purple-600">Help Center</a></li>
                <li><a href="#" className="hover:text-purple-600">Contact</a></li>
                <li><a href="#" className="hover:text-purple-600">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-purple-600">Privacy</a></li>
                <li><a href="#" className="hover:text-purple-600">Terms</a></li>
                <li><a href="#" className="hover:text-purple-600">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2025 MusoBuddy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}