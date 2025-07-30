import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Music, FileText, Mail, Calendar, CreditCard, Shield, Star, Play, Trophy, Clock, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Announcement Bar */}
      <div className="bg-purple-600 text-white text-center py-3 px-4">
        <p className="text-sm font-medium">
          14-day free trial - Professional gig management starts in minutes
        </p>
      </div>

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Music className="h-10 w-10 text-purple-600" />
              <h1 className="text-2xl font-bold text-purple-800 dark:text-purple-200">MusoBuddy</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-purple-600">How it works</a>
              <a href="#features" className="text-gray-600 hover:text-purple-600">For Musicians</a>
              <a href="#success-stories" className="text-gray-600 hover:text-purple-600">Success Stories</a>
              <a href="#pricing" className="text-gray-600 hover:text-purple-600">Pricing</a>
              <Link href="/login">
                <Button variant="ghost" className="text-purple-600 hover:text-purple-700">
                  Login
                </Button>
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link href="/signup">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Professional gig management for UK musicians - Less admin, more music
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto mb-12">
              Professional gig management made ridiculously simple for UK musicians
            </p>
            
            <Link href="/signup">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-4 text-lg mb-8">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join 500+ UK musicians already saving 10+ hours weekly on admin tasks and earning more through professional workflows.
          </p>
          <div className="flex items-center justify-center mb-8">
            <Trophy className="h-6 w-6 text-yellow-500 mr-2" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Recommended by music industry professionals for serious freelancers
            </p>
          </div>
        </div>
      </section>

      {/* Feature Section 1: Professional Contract Generation */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Feature Section 1: Professional Contract Generation
              </h3>
              <h4 className="text-xl font-semibold text-purple-600 mb-4">
                Section A: Main Feature Focus - Never chase contract signatures again
              </h4>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Professional PDF contracts generate instantly from your booking details and get signed digitally within hours, not days. 
                Your clients receive beautiful, branded documents that make you look like the serious professional you are.
              </p>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                  <strong>Use case:</strong> Wedding band books Saturday ceremony Friday morning - contract sent, 
                  signed, and filed before lunch.
                </p>
              </div>
              
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Section B: Supporting Features List
              </h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600 dark:text-gray-300">Instant PDF generation → Professional impression in minutes</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600 dark:text-gray-300">Digital signatures → Faster bookings, fewer delays</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600 dark:text-gray-300">Cloud hosting → Clients access contracts 24/7 anywhere</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600 dark:text-gray-300">Custom branding → Your logo makes every document yours</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-600 dark:text-gray-300">Automatic filing → Never lose important contracts again</span>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-600 rounded">
                <Play className="h-16 w-16 text-purple-600" />
                <span className="ml-4 text-lg text-gray-600 dark:text-gray-300">Explainer Video</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections 2 & 3 */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Feature Section 2: Booking Management */}
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Feature Section 2: Booking Management System
              </h3>
              <h4 className="text-lg font-semibold text-purple-600 mb-4">
                Section A: Main Feature Focus - End double-booking disasters forever
              </h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Smart calendar instantly spots conflicts before they happen and keeps your gig schedule perfectly organized. 
                No more embarrassing calls explaining why you can't make a confirmed booking.
              </p>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                  <strong>Use case:</strong> Private party books same Saturday as existing wedding - system flags conflict immediately, saving your reputation.
                </p>
              </div>
              
              <div className="space-y-2 text-sm">
                <p>✓ Conflict detection → Sleep peacefully knowing schedule is safe</p>
                <p>✓ Visual calendar → See your month at a glance</p>
                <p>✓ Status tracking → Know exactly where each booking stands</p>
                <p>✓ Gig type selection → 30 common types ready to choose</p>
                <p>✓ History tracking → Remember every detail from past events</p>
              </div>
            </div>

            {/* Feature Section 3: Professional Invoice System */}
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Feature Section 3: Professional Invoice System
              </h3>
              <h4 className="text-lg font-semibold text-purple-600 mb-4">
                Section A: Main Feature Focus - Get paid faster with zero chasing
              </h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Beautiful invoices generate automatically after each gig and track payments so you know exactly who 
                owes what. Professional presentation means clients pay promptly and respect your business.
              </p>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                  <strong>Use case:</strong> Wedding gig finishes Sunday, invoice arrives Monday morning, payment clears Wednesday - all without you lifting a finger.
                </p>
              </div>
              
              <div className="space-y-2 text-sm">
                <p>✓ Automatic generation → Invoice ready before you pack equipment</p>
                <p>✓ Payment tracking → Always know who owes what amount</p>
                <p>✓ Cloud accessibility → Clients can view and pay anywhere</p>
                <p>✓ Professional design → Commands respect and prompt payment</p>
                <p>✓ Payment history → Complete financial record for tax time</p>
              </div>
            </div>
          </div>
        </div>
      </section>
            
            <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Shield className="h-12 w-12 text-red-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Compliance Tracking</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Manage insurance, licenses, and PAT testing with expiry alerts and automated compliance sharing.
              </p>
            </div>
            
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <Star className="h-12 w-12 text-indigo-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Client Management</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Build relationships with automatic client history, repeat booking tracking, and professional communication.
              </p>
            </div>
          </div>
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