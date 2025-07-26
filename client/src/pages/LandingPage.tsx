import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CreditCard, 
  Users, 
  Shield, 
  CheckCircle, 
  Star,
  ArrowRight,
  Music,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function LandingPage() {
  const [email, setEmail] = useState('');

  const features = [
    {
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      title: "Smart Contracts",
      description: "Generate professional contracts with digital signatures and cloud storage."
    },
    {
      icon: <CreditCard className="h-8 w-8 text-green-600" />,
      title: "Professional Invoicing", 
      description: "Create beautiful invoices with payment tracking and automated reminders."
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: "Client Management",
      description: "Comprehensive address book with booking history and contact management."
    },
    {
      icon: <Calendar className="h-8 w-8 text-orange-600" />,
      title: "Booking Management",
      description: "Track enquiries, manage conflicts, and convert bookings seamlessly."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Compliance Tracking",
      description: "Monitor insurance, PAT testing, and licensing requirements."
    },
    {
      icon: <DollarSign className="h-8 w-8 text-indigo-600" />,
      title: "Payment Tracking",
      description: "Track payments, manage overdue invoices, and monitor cash flow."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Wedding Singer",
      content: "MusoBuddy transformed my business. Professional contracts and invoices in minutes!",
      rating: 5
    },
    {
      name: "Mike Thompson", 
      role: "Session Musician",
      content: "The booking management system caught three conflicts that could have been disasters.",
      rating: 5
    },
    {
      name: "Emma Williams",
      role: "Band Manager", 
      content: "Finally, a platform built specifically for musicians. Game changer for our workflow.",
      rating: 5
    }
  ];

  const pricing = [
    {
      name: "Demo",
      price: "Free",
      description: "Explore all features",
      features: [
        "Explore all interfaces",
        "Test all features", 
        "Preview functionality",
        "No sending capability"
      ],
      cta: "Try Demo",
      link: "/signup"
    },
    {
      name: "Core",
      price: "£9.99",
      period: "/month",
      description: "Perfect for working musicians",
      features: [
        "Unlimited bookings & contracts",
        "Professional invoicing",
        "Client address book",
        "Email sending & templates",
        "Compliance documents",
        "Cloud document storage"
      ],
      cta: "Start Free Trial",
      link: "/signup",
      popular: true
    },
    {
      name: "Premium",
      price: "Coming Soon",
      description: "Advanced features for professionals",
      features: [
        "Advanced booking analytics",
        "Calendar integrations", 
        "Client booking portal",
        "Enhanced AI parsing",
        "Priority support"
      ],
      cta: "Notify Me",
      link: "/signup"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">MusoBuddy</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Reviews</a>
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto max-w-4xl">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
            Trusted by 500+ Musicians
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            The Complete Music Business
            <span className="text-blue-600"> Management Platform</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Professional contracts, invoicing, and client management designed specifically for freelance musicians and music professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              Watch Demo
            </Button>
          </div>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              No credit card required
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              14-day free trial
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Music Business
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From booking management to payment tracking, MusoBuddy handles the business side so you can focus on making music.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by Musicians Everywhere
            </h2>
            <p className="text-xl text-gray-600">
              Join hundreds of musicians who've transformed their business with MusoBuddy
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that's right for your music business
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pricing.map((plan, index) => (
              <Card key={index} className={`relative border-2 ${plan.popular ? 'border-blue-500 shadow-xl' : 'border-gray-200'}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-gray-500">{plan.period}</span>}
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.link}>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Music Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of musicians already using MusoBuddy to manage their professional careers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Input 
              type="email" 
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white"
            />
            <Link href="/signup">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Music className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold">MusoBuddy</span>
              </div>
              <p className="text-gray-400">
                The complete business management platform for musicians and music professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 MusoBuddy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}