import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, Music, Play, Trophy } from "lucide-react";

export default function LandingPageBasecampGreen() {
  return (
    <div className="min-h-screen bg-white">
      {/* Announcement Bar */}
      <div className="bg-green-600 text-white text-center py-3 px-4">
        <p className="text-sm font-medium">
          14-day free trial - Professional gig management starts in minutes
        </p>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Music className="h-8 w-8 text-gray-800" />
              <h1 className="text-2xl font-semibold text-gray-900">MusoBuddy</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-700 hover:text-gray-900 font-medium">How it works</a>
              <a href="#features" className="text-gray-700 hover:text-gray-900 font-medium">For Musicians</a>
              <a href="#success-stories" className="text-gray-700 hover:text-gray-900 font-medium">Success Stories</a>
              <a href="#pricing" className="text-gray-700 hover:text-gray-900 font-medium">Pricing</a>
              <Link href="/login">
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                  Login
                </Button>
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link href="/signup">
                <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 font-medium">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
              Professional gig management for UK musicians
            </h2>
            <p className="text-2xl text-gray-700 max-w-3xl mx-auto mb-12 leading-relaxed">
              Less admin, more music. Professional gig management made ridiculously simple for UK musicians.
            </p>
            
            <Link href="/signup">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-medium mb-8">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-gray-50 border-t border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xl text-gray-700 mb-6">
            Join 500+ UK musicians already saving 10+ hours weekly on admin tasks and earning more through professional workflows.
          </p>
          <p className="text-lg text-gray-600">
            Recommended by music industry professionals for serious freelancers
          </p>
        </div>
      </section>

      {/* Feature Section 1: Professional Contract Generation */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-4xl font-bold text-gray-900 mb-8">
                Never chase contract signatures again
              </h3>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Professional PDF contracts generate instantly from your booking details and get signed digitally within hours, not days. 
                Your clients receive beautiful, branded documents that make you look like the serious professional you are.
              </p>
              
              <div className="bg-gray-50 border-l-4 border-green-600 p-6 mb-8">
                <p className="text-gray-700 italic">
                  <strong>Real example:</strong> Wedding band books Saturday ceremony Friday morning - contract sent, 
                  signed, and filed before lunch.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Instant PDF generation → Professional impression in minutes</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Digital signatures → Faster bookings, fewer delays</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Cloud hosting → Clients access contracts 24/7 anywhere</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Custom branding → Your logo makes every document yours</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Automatic filing → Never lose important contracts again</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-8 rounded">
              <div className="flex items-center justify-center h-64 bg-white border border-gray-200 rounded">
                <Play className="h-16 w-16 text-gray-400" />
                <span className="ml-4 text-lg text-gray-600">Contract Demo Video</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections 2 & 3 */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Feature Section 2: Booking Management */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                End double-booking disasters forever
              </h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Smart calendar instantly spots conflicts before they happen and keeps your gig schedule perfectly organized. 
                No more embarrassing calls explaining why you can't make a confirmed booking.
              </p>
              
              <div className="bg-white border-l-4 border-green-600 p-6 mb-6">
                <p className="text-gray-700 italic">
                  <strong>Real example:</strong> Private party books same Saturday as existing wedding - system flags conflict immediately, saving your reputation.
                </p>
              </div>
              
              <div className="space-y-3">
                <p className="text-gray-700">• Conflict detection → Sleep peacefully knowing schedule is safe</p>
                <p className="text-gray-700">• Visual calendar → See your month at a glance</p>
                <p className="text-gray-700">• Status tracking → Know exactly where each booking stands</p>
                <p className="text-gray-700">• Gig type selection → 30 common types ready to choose</p>
                <p className="text-gray-700">• History tracking → Remember every detail from past events</p>
              </div>
            </div>

            {/* Feature Section 3: Professional Invoice System */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Get paid faster with zero chasing
              </h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Beautiful invoices generate automatically after each gig and track payments so you know exactly who 
                owes what. Professional presentation means clients pay promptly and respect your business.
              </p>
              
              <div className="bg-white border-l-4 border-green-600 p-6 mb-6">
                <p className="text-gray-700 italic">
                  <strong>Real example:</strong> Wedding gig finishes Sunday, invoice arrives Monday morning, payment clears Wednesday - all without you lifting a finger.
                </p>
              </div>
              
              <div className="space-y-3">
                <p className="text-gray-700">• Automatic generation → Invoice ready before you pack equipment</p>
                <p className="text-gray-700">• Payment tracking → Always know who owes what amount</p>
                <p className="text-gray-700">• Cloud accessibility → Clients can view and pay anywhere</p>
                <p className="text-gray-700">• Professional design → Commands respect and prompt payment</p>
                <p className="text-gray-700">• Payment history → Complete financial record for tax time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video and CTA Section */}
      <section className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-8">
              See how MusoBuddy works
            </h3>
            <Link href="/signup">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-medium mb-8">
                Start Free Trial
              </Button>
            </Link>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <div className="bg-gray-50 border border-gray-200 p-8">
              <div className="flex items-center justify-center h-64 bg-white border border-gray-200">
                <Play className="h-16 w-16 text-gray-400" />
                <span className="ml-4 text-lg text-gray-600">Watch the 5-minute overview</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-gray-50 border border-gray-200 p-6">
              <div className="flex items-center justify-center h-32 bg-white border border-gray-200 mb-4">
                <Play className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Contract Generation</h4>
              <p className="text-sm text-gray-600">See contracts in action</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-6">
              <div className="flex items-center justify-center h-32 bg-white border border-gray-200 mb-4">
                <Play className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Invoice Automation</h4>
              <p className="text-sm text-gray-600">Getting paid made simple</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-6">
              <div className="flex items-center justify-center h-32 bg-white border border-gray-200 mb-4">
                <Play className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Email Integration</h4>
              <p className="text-sm text-gray-600">Bookings from emails</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-4xl font-bold text-gray-900 mb-8">
            Simple pricing that makes sense
          </h3>
          
          <div className="bg-white border border-gray-200 p-12 mb-8">
            <div className="text-5xl font-bold text-gray-900 mb-4">£9.99</div>
            <div className="text-xl text-gray-700 mb-8">per month</div>
            <div className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
              Save 10+ hours weekly on admin tasks while earning more through professional contracts and faster payments. 
              That's less than what you charge for 30 minutes of performance time.
            </div>
            <Link href="/signup">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-medium mb-6">
                Try it free for 14 days
              </Button>
            </Link>
            <p className="text-gray-600">Cancel anytime with one click - no contracts, no hassles, no questions asked</p>
          </div>
          
          <p className="text-lg text-gray-700">
            One missed gig due to poor admin costs more than an entire year of MusoBuddy.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-center text-gray-900 mb-16">Frequently Asked Questions</h3>
          
          <div className="space-y-12">
            <div>
              <h4 className="text-2xl font-semibold text-gray-900 mb-4">
                I'm not tech-savvy - will this be complicated to set up?
              </h4>
              <p className="text-lg text-gray-700 leading-relaxed">
                Not at all. Most musicians create their first professional contract within 10 minutes of signing up. 
                If you can send an email, you can use MusoBuddy. No training required, no complicated setup - just enter 
                your gig details and watch professional documents appear.
              </p>
            </div>

            <div>
              <h4 className="text-2xl font-semibold text-gray-900 mb-4">
                How quickly will I see results?
              </h4>
              <p className="text-lg text-gray-700 leading-relaxed">
                Immediately. Your first contract looks professional from day one, and clients notice the difference 
                right away. Most musicians report feeling more organized within their first week and see improved payment 
                times within their first month.
              </p>
            </div>

            <div>
              <h4 className="text-2xl font-semibold text-gray-900 mb-4">
                Is my client data secure?
              </h4>
              <p className="text-lg text-gray-700 leading-relaxed">
                Absolutely. We use bank-level encryption and UK-based secure servers. Your contracts are stored on 
                enterprise-grade cloud storage with 24/7 accessibility. We never share your data with anyone, and you 
                own all your information completely.
              </p>
            </div>

            <div>
              <h4 className="text-2xl font-semibold text-gray-900 mb-4">
                What if I need to cancel?
              </h4>
              <p className="text-lg text-gray-700 leading-relaxed">
                Cancel anytime with one click - no contracts, no cancellation fees, no questions asked. 
                You keep access until your current billing period ends, and you can export all your data before leaving. 
                We make it easy to leave because we're confident you'll want to stay.
              </p>
            </div>

            <div>
              <h4 className="text-2xl font-semibold text-gray-900 mb-4">
                What support do you offer?
              </h4>
              <p className="text-lg text-gray-700 leading-relaxed">
                Email support typically responds within hours during UK business hours. We also have comprehensive 
                help guides and video tutorials. Since the system is designed to be intuitive, most musicians rarely 
                need support after their first few days.
              </p>
            </div>
          </div>

          <div className="text-center mt-16 bg-gray-50 border border-gray-200 p-12">
            <h4 className="text-2xl font-semibold text-gray-900 mb-6">Still deciding?</h4>
            <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
              Getting started takes less time than setting up your equipment. Enter your details, create your first 
              contract, and send it to a client - all in under 10 minutes. No complicated setup, no learning curve, 
              just immediate professional results.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-medium">
                Try it free for 14 days
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* About Us Statement */}
          <div className="text-center mb-12">
            <h4 className="text-2xl font-semibold mb-6">About Us</h4>
            <p className="text-lg text-gray-300 leading-relaxed max-w-3xl mx-auto">
              MusoBuddy was built by people who understand that musicians should spend time 
              making music, not wrestling with paperwork. We're a UK-based team dedicated to 
              giving freelance musicians the professional tools they deserve at a price that 
              makes sense. Your success is our mission.
            </p>
          </div>

          {/* Contact Information */}
          <div className="text-center mb-12">
            <h4 className="text-xl font-semibold mb-4">Get in Touch</h4>
            <p className="text-gray-300 mb-2">
              📧 <a href="mailto:hello@musobuddy.com" className="text-green-400 hover:text-green-300">hello@musobuddy.com</a>
            </p>
            <p className="text-gray-300 mb-2">📍 United Kingdom</p>
            <p className="text-gray-300 mb-4">🕒 Support: Monday-Friday, 9 AM - 6 PM GMT</p>
            <p className="text-green-400 italic">We actually respond to emails - usually within hours, not days.</p>
          </div>

          {/* Legal Links */}
          <div className="text-center mb-12">
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div>
                <h5 className="font-semibold mb-2">Privacy Policy</h5>
                <p className="text-sm text-gray-400">How we protect your data (spoiler: very seriously)</p>
              </div>
              <div>
                <h5 className="font-semibold mb-2">Terms of Service</h5>
                <p className="text-sm text-gray-400">Fair, straightforward terms written in plain English</p>
              </div>
              <div>
                <h5 className="font-semibold mb-2">Security</h5>
                <p className="text-sm text-gray-400">Bank-level protection for your business information</p>
              </div>
              <div>
                <h5 className="font-semibold mb-2">GDPR Compliance</h5>
                <p className="text-sm text-gray-400">Your data rights respected and protected</p>
              </div>
            </div>
          </div>

          {/* Trust Signals */}
          <div className="text-center mb-12">
            <h4 className="text-xl font-semibold mb-6">Trust Signals</h4>
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-300"><strong>UK-Based & Compliant</strong> - Built for UK musicians, by UK musicians</span>
              </div>
              <div className="flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-300"><strong>Secure Cloud Storage</strong> - Enterprise-grade protection, 24/7 accessibility</span>
              </div>
              <div className="flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-300"><strong>No Long-Term Contracts</strong> - Cancel anytime, keep your data</span>
              </div>
              <div className="flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-300"><strong>Musician-Focused</strong> - Purpose-built for gig management, not generic business tools</span>
              </div>
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="text-center mb-8 bg-gray-800 p-8 rounded-lg">
            <h4 className="text-xl font-semibold mb-4">Still deciding?</h4>
            <p className="text-gray-300 mb-6">
              Download our free "Professional Musician's Admin Checklist" and see how 
              MusoBuddy handles every item automatically.
            </p>
            <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3">
              Download Free Checklist
            </Button>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-800 pt-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Music className="h-6 w-6 text-white mr-2" />
              <span className="text-lg font-semibold">MusoBuddy</span>
            </div>
            <p className="text-gray-400">&copy; 2025 MusoBuddy. Professional gig management for UK musicians.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}