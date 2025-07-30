import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, Music, Play, Trophy } from "lucide-react";

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

      {/* Video and CTA Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-12">
            <Link href="/signup">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-4 text-lg mb-8">
                Free Trial
              </Button>
            </Link>
          </div>
          
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Automate contracts and invoice generation
            </h3>
          </div>

          <div className="max-w-3xl mx-auto mb-12">
            <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-600 rounded">
                <Play className="h-16 w-16 text-purple-600" />
                <span className="ml-4 text-lg text-gray-600 dark:text-gray-300">Main video (5 mins)</span>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Reclaim evenings from admin chaos
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
              <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-600 rounded mb-4">
                <Play className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Contracts Explained</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">VIDEO</p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
              <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-600 rounded mb-4">
                <Play className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Invoices Explained</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">VIDEO</p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
              <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-600 rounded mb-4">
                <Play className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Email to Bookings Explained</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">VIDEO</p>
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Professional gig management for UK musicians - Less admin, more music
            </h3>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-12">
            <Link href="/signup">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-4 text-lg mb-8">
                Free Trial
              </Button>
            </Link>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Professional gig management from £9.99/month
            </h3>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                Save 10+ hours weekly on admin tasks while earning more through professional contracts and faster payments. 
                That's less than what you charge for 30 minutes of performance time.
              </p>
              <p>Cancel anytime with one click - no contracts, no hassles, no questions asked</p>
              <p>One missed gig due to poor admin costs more than an entire year of MusoBuddy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">FAQ Section</h3>
          
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Q: I'm not tech-savvy - will this be complicated to set up?
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                A: Not at all. Most musicians create their first professional contract within 10 minutes of signing up. 
                If you can send an email, you can use MusoBuddy. No training required, no complicated setup - just enter 
                your gig details and watch professional documents appear.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Q: How quickly will I see results?
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                A: Immediately. Your first contract looks professional from day one, and clients notice the difference 
                right away. Most musicians report feeling more organized within their first week and see improved payment 
                times within their first month.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Q: Is my client data secure?
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                A: Absolutely. We use bank-level encryption and UK-based secure servers. Your contracts are stored on 
                enterprise-grade cloud storage with 24/7 accessibility. We never share your data with anyone, and you 
                own all your information completely.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Q: What if I need to cancel?
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                A: Cancel anytime with one click - no contracts, no cancellation fees, no questions asked. 
                You keep access until your current billing period ends, and you can export all your data before leaving. 
                We make it easy to leave because we're confident you'll want to stay.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Q: What support do you offer?
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                A: Email support typically responds within hours during UK business hours. We also have comprehensive 
                help guides and video tutorials. Since the system is designed to be intuitive, most musicians rarely 
                need support after their first few days.
              </p>
            </div>
          </div>

          <div className="text-center mt-12 bg-white dark:bg-gray-700 p-8 rounded-lg">
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              Getting started takes less time than setting up your equipment. Enter your details, create your first 
              contract, and send it to a client - all in under 10 minutes. No complicated setup, no learning curve, 
              just immediate professional results. Try free for 14 days and see why musicians say it's the easiest 
              business decision they've ever made.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-4 text-lg">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-8">
            <Music className="h-8 w-8 text-purple-400 mr-2" />
            <span className="text-xl font-bold">MusoBuddy</span>
          </div>
          <div className="text-center text-gray-400">
            <p>&copy; 2025 MusoBuddy. Professional gig management for UK musicians.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}