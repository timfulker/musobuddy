import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, Play, Trophy } from "lucide-react";
import { MetronomeLogo } from "@/components/MetronomeLogo";

export default function LandingPage() {
  return (
    <div className="min-h-screen theme-midnight-blue" style={{backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)'}}>
      {/* Announcement Bar */}
      <div className="bg-primary text-white text-center py-3 px-4">
        <p className="text-sm font-medium">
          30-day free trial - Professional gig management starts in minutes
        </p>
      </div>

      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 z-50" style={{backgroundColor: 'var(--theme-surface)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <MetronomeLogo size="small" />
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
                <Button className="bg-primary hover:bg-primary/90 px-6 py-2 font-medium" style={{backgroundColor: 'var(--theme-primary)', color: 'white'}}>
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-blue-50/30 to-white">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-16">
            <p className="text-sm md:text-base text-primary font-semibold mb-6 uppercase tracking-wider">
              For Freelance Musicians
            </p>
            <h2 className="text-6xl md:text-7xl font-extrabold text-gray-900 mb-8 leading-tight tracking-tight">
              Book Gigs, Create Contracts, Send Invoices
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              Professional gig management made ridiculously simple for UK musicians. <span className="font-bold">Less admin, more music.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link href="/signup">
                <Button size="lg" className="bg-primary hover:bg-primary/90 px-10 py-6 text-xl font-semibold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105" style={{backgroundColor: 'var(--theme-primary)', color: 'white'}}>
                  Start Free Trial →
                </Button>
              </Link>
              <p className="text-sm text-gray-500">30-day free trial</p>
            </div>

            {/* Video Section */}
            <div className="max-w-4xl mx-auto mt-16">
              <video
                className="w-full rounded-2xl shadow-2xl border-2 border-gray-100"
                controls
                preload="metadata"
                playsInline
                controlsList="nodownload"
                onError={(e) => {
                  console.error('Video failed to load:', e);
                  const video = e.currentTarget;
                  console.error('Video error details:', {
                    src: video.currentSrc,
                    error: video.error,
                    networkState: video.networkState,
                    readyState: video.readyState
                  });
                }}
              >
                <source src="/videos/main-promo.mov" type="video/quicktime" />
                <source src="/videos/main-promo.mov" type="video/mp4" />
                Your browser does not support the video tag or this video format.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-2xl md:text-3xl text-gray-800 mb-6 font-medium leading-relaxed">
            Join UK musicians saving <span className="text-primary font-bold">10+ hours weekly</span> on admin tasks
          </p>
          <p className="text-lg text-gray-600 font-light">
            Trusted by music industry professionals for serious freelancers
          </p>
        </div>
      </section>

      {/* Feature Section 1: Professional Contract Generation */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 items-center">
            <div>
              <h3 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-10 leading-tight">
                From gig details to signed contract — in seconds
              </h3>
              <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed font-light">
                Professional PDF contracts generate instantly from your booking details and get signed digitally within hours, not days.
                Your clients receive beautiful, branded documents that make you look like the serious professional you are.
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-primary p-8 mb-10 rounded-r-lg shadow-sm">
                <p className="text-gray-700 italic text-lg">
                  <strong className="text-primary">Real example:</strong> Wedding band books Saturday ceremony Friday morning — contract sent,
                  signed, and filed before lunch.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Instant PDF generation → Professional impression in seconds</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Digital signatures → Faster bookings, fewer delays</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Cloud hosting → Clients access contracts 24/7 anywhere</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Custom branding → Your logo makes every document yours</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Automatic filing → Never lose important contracts again</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 p-6 rounded-2xl shadow-lg">
              <video
                className="w-full aspect-video bg-black rounded border border-gray-200"
                controls
                preload="metadata"
                playsInline
                controlsList="nodownload"
                onError={(e) => console.error('Video error:', e)}
                onLoadStart={() => console.log('Video loading started')}
                onCanPlay={() => console.log('Video can play')}
              >
                <source src="/videos/contract-demo.mov" type="video/quicktime" />
                <source src="/videos/contract-demo.mov" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2: Professional Invoice System */}
      <section className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-12 items-center">
            {/* Video on the left */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 p-6 rounded-2xl shadow-lg">
              <div className="w-full aspect-video bg-gray-800 rounded border border-gray-200 flex items-center justify-center text-gray-400">
                <p className="text-center">Invoice Demo Video<br/>Coming Soon</p>
              </div>
            </div>

            {/* Text on the right */}
            <div>
              <h3 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-10 leading-tight">
                Get paid faster with zero chasing
              </h3>
              <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed font-light">
                Beautiful invoices generate automatically after each gig and track payments so you know exactly who
                owes what. Professional presentation means clients pay promptly and respect your business.
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-primary p-8 mb-10 rounded-r-lg shadow-sm">
                <p className="text-gray-700 italic text-lg">
                  <strong className="text-primary">Real example:</strong> Wedding gig finishes Sunday, invoice arrives Monday morning, payment clears Wednesday - all without you lifting a finger.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Automatic generation → Invoice ready before you pack equipment</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Cloud accessibility → Clients can view and pay anywhere</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Professional design → Commands respect and prompt payment</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Payment history → Complete financial record for tax time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 3: Booking Management */}
      <section className="py-24 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 items-center">
            {/* Text on the left */}
            <div>
              <h3 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-10 leading-tight">
                End double-booking disasters forever
              </h3>
              <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed font-light">
                Smart calendar instantly spots conflicts before they happen and keeps your gig schedule perfectly organized.
                No more embarrassing calls explaining why you can't make a confirmed booking.
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-primary p-8 mb-10 rounded-r-lg shadow-sm">
                <p className="text-gray-700 italic text-lg">
                  <strong className="text-primary">Real example:</strong> Private party books same Saturday as existing wedding - system flags conflict immediately, saving your reputation.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Conflict detection → Sleep peacefully knowing schedule is safe</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Visual calendar → See your month at a glance</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Status tracking → Know exactly where each booking stands</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Gig type selection → 30 common types ready to choose</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">History tracking → Remember every detail from past events</span>
                </div>
              </div>
            </div>

            {/* Video on the right */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 p-6 rounded-2xl shadow-lg">
              <div className="w-full aspect-video bg-gray-800 rounded border border-gray-200 flex items-center justify-center text-gray-400">
                <p className="text-center">Booking Demo Video<br/>Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section: QR Booking System */}
      <section className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-12 items-center">
            {/* Video on the left */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 p-6 rounded-2xl shadow-lg">
              <div className="w-full aspect-video bg-gray-800 rounded border border-gray-200 flex items-center justify-center text-gray-400">
                <p className="text-center">QR Booking Demo Video<br/>Coming Soon</p>
              </div>
            </div>

            {/* Text on the right */}
            <div>
              <h3 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-10 leading-tight">
                Get booked instantly — just by scanning a QR code
              </h3>
              <p className="text-xl md:text-2xl text-gray-600 mb-6 leading-relaxed font-light">
                MusoBuddy gives every musician a unique QR code linked to a simple booking form. Stick it on your socials, business card, WhatsApp message — anywhere.
              </p>
              <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed font-light">
                As soon as a client fills out the form, the enquiry is parsed and turned into a real booking inside your dashboard — with zero manual input.
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-primary p-8 mb-10 rounded-r-lg shadow-sm">
                <p className="text-gray-700 italic text-lg">
                  <strong className="text-primary">Real example:</strong> A pub owner scans your QR from a flyer → sends inquiry at 2:43 PM → contract generated and sent by 2:46 PM.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Static HTML booking form — opens instantly, works everywhere</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Embedded into QR → Perfect for posters, cards, set lists, or WhatsApp</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Enquiries instantly parsed into real bookings</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Customise your widget with pre-filled options (e.g. gig types)</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Boost response rate with a no-fuss enquiry process</span>
                </div>
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
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg font-medium mb-8">
                Start Free Trial
              </Button>
            </Link>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <div className="bg-gray-50 border border-gray-200 p-8">
              <video 
                className="w-full h-80 bg-black rounded border border-gray-200" 
                controls 
                preload="metadata"
                playsInline
                controlsList="nodownload"
                onError={(e) => console.error('Video error:', e)}
                onLoadStart={() => console.log('Video loading started')}
                onCanPlay={() => console.log('Video can play')}
              >
                <source src="/videos/musobuddy-demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
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
      <section id="pricing" className="py-28 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Simple pricing that makes sense
          </h3>
          <p className="text-xl text-gray-600 mb-16 font-light">Less than 30 minutes of performance time per month</p>

          <div className="bg-white border-2 border-gray-200 p-16 mb-10 rounded-3xl shadow-2xl hover:shadow-3xl transition-shadow">
            <div className="text-7xl font-extrabold text-gray-900 mb-2">£9.99</div>
            <div className="text-2xl text-gray-600 mb-10 font-light">per month</div>
            <div className="text-xl text-gray-700 mb-12 max-w-2xl mx-auto leading-relaxed">
              Save 10+ hours weekly on admin tasks while earning more through professional contracts and faster payments.
            </div>
            <Link href="/signup">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-12 py-7 text-xl font-semibold mb-6 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
                Try it free for 30 days →
              </Button>
            </Link>
            <p className="text-gray-500 text-lg">Cancel anytime with one click • No contracts • No hassles</p>
          </div>

          <p className="text-xl text-gray-700 font-medium">
            💡 One missed gig due to poor admin costs more than an entire year of MusoBuddy
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
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg font-medium">
                Try it free for 30 days
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
            <h4 className="text-2xl font-semibold mb-6 text-gray-200">About Us</h4>
            <p className="text-xl text-gray-200 leading-relaxed max-w-3xl mx-auto">
              MusoBuddy was built by people who understand that musicians should spend time 
              making music, not wrestling with paperwork. We're a UK-based team dedicated to 
              giving freelance musicians the professional tools they deserve at a price that 
              makes sense. Your success is our mission.
            </p>
          </div>

          {/* Contact Information */}
          <div className="text-center mb-12">
            <h4 className="text-xl font-semibold mb-4 text-gray-200">Get in Touch</h4>
            <p className="text-gray-200 mb-2 text-lg">
              📧 <a href="mailto:hello@musobuddy.com" className="text-yellow-400 hover:text-yellow-300">hello@musobuddy.com</a>
            </p>
            <p className="text-gray-200 mb-2 text-lg">📍 United Kingdom</p>
            <p className="text-gray-200 mb-4 text-lg">🕒 Support: Monday-Friday, 9 AM - 6 PM GMT</p>
            <p className="text-yellow-400 italic">We actually respond to emails - usually within hours, not days.</p>
          </div>

          {/* Legal Links */}
          <div className="text-center mb-12">
            <h4 className="text-xl font-semibold mb-6 text-gray-200">Legal Documents</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div>
                <Link href="/terms-and-conditions">
                  <h5 className="font-semibold mb-2 text-yellow-400 hover:text-yellow-300 cursor-pointer">Terms of Service</h5>
                </Link>
                <p className="text-sm text-gray-300">Fair, straightforward terms written in plain English</p>
              </div>
              <div>
                <Link href="/privacy-policy">
                  <h5 className="font-semibold mb-2 text-yellow-400 hover:text-yellow-300 cursor-pointer">Privacy Policy</h5>
                </Link>
                <p className="text-sm text-gray-300">How we protect your data (spoiler: very seriously)</p>
              </div>
              <div>
                <Link href="/cookie-policy">
                  <h5 className="font-semibold mb-2 text-yellow-400 hover:text-yellow-300 cursor-pointer">Cookie Policy</h5>
                </Link>
                <p className="text-sm text-gray-300">How we use cookies and tracking</p>
              </div>
              <div>
                <Link href="/refund-policy">
                  <h5 className="font-semibold mb-2 text-yellow-400 hover:text-yellow-300 cursor-pointer">Refund Policy</h5>
                </Link>
                <p className="text-sm text-gray-300">Clear cancellation and refund terms</p>
              </div>
              <div>
                <Link href="/acceptable-use-policy">
                  <h5 className="font-semibold mb-2 text-yellow-400 hover:text-yellow-300 cursor-pointer">Acceptable Use</h5>
                </Link>
                <p className="text-sm text-gray-300">Platform usage guidelines and restrictions</p>
              </div>
              <div>
                <Link href="/data-processing-agreement">
                  <h5 className="font-semibold mb-2 text-yellow-400 hover:text-yellow-300 cursor-pointer">Data Processing</h5>
                </Link>
                <p className="text-sm text-gray-300">GDPR-compliant data processing terms</p>
              </div>
              <div>
                <Link href="/disclaimer">
                  <h5 className="font-semibold mb-2 text-yellow-400 hover:text-yellow-300 cursor-pointer">Disclaimer</h5>
                </Link>
                <p className="text-sm text-gray-300">Service limitations and liability information</p>
              </div>
              <div>
                <h5 className="font-semibold mb-2 text-gray-200">GDPR Compliance</h5>
                <p className="text-sm text-gray-300">Your data rights respected and protected</p>
              </div>
            </div>
          </div>

          {/* Trust Signals */}
          <div className="text-center mb-12">
            <h4 className="text-xl font-semibold mb-6 text-gray-200">Trust Signals</h4>
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center">
                <Check className="h-5 w-5 text-primary/50 mr-3" />
                <span className="text-gray-200"><strong>UK-Based & Compliant</strong> - Built for UK musicians, by UK musicians</span>
              </div>
              <div className="flex items-center justify-center">
                <Check className="h-5 w-5 text-primary/50 mr-3" />
                <span className="text-gray-200"><strong>Secure Cloud Storage</strong> - Enterprise-grade protection, 24/7 accessibility</span>
              </div>
              <div className="flex items-center justify-center">
                <Check className="h-5 w-5 text-primary/50 mr-3" />
                <span className="text-gray-200"><strong>No Long-Term Contracts</strong> - Cancel anytime, keep your data</span>
              </div>
              <div className="flex items-center justify-center">
                <Check className="h-5 w-5 text-primary/50 mr-3" />
                <span className="text-gray-200"><strong>Musician-Focused</strong> - Purpose-built for gig management, not generic business tools</span>
              </div>
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="text-center mb-8 bg-gray-800 p-8 rounded-lg">
            <h4 className="text-xl font-semibold mb-4 text-gray-200">Still deciding?</h4>
            <p className="text-gray-200 mb-6 text-lg">
              Download our free "Professional Musician's Admin Checklist" and see how 
              MusoBuddy handles every item automatically.
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-white px-6 py-3">
              Download Free Checklist
            </Button>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-800 pt-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <MetronomeLogo size="small" className="[&_.text-\\[\\#191970\\]]:text-white" />
            </div>
            <p className="text-gray-300">&copy; 2025 MusoBuddy. Professional gig management for UK musicians.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}