import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeSelector } from '@/components/theme-selector';
import { ArrowLeft, Calendar, DollarSign, FileText, Users } from 'lucide-react';
import { Link } from 'wouter';

export default function ThemePreview() {
  const [selectedCard, setSelectedCard] = useState<string>('');

  const stats = [
    {
      title: "Total Revenue",
      value: "£12,450",
      change: "+12.5%",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Active Contracts",
      value: "24",
      change: "+3",
      icon: FileText,
      color: "text-blue-600"
    },
    {
      title: "Upcoming Gigs",
      value: "8",
      change: "+2",
      icon: Calendar,
      color: "text-purple-600"
    },
    {
      title: "New Enquiries",
      value: "15",
      change: "+5",
      icon: Users,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Theme Preview</h1>
            </div>
            <ThemeSelector />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Theme Info */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Theme Selector</CardTitle>
            <CardDescription>
              Choose from professionally designed themes inspired by modern business applications.
              Each theme is optimized for the music industry workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {['Classic', 'Superhuman', 'Framer', 'Linear', 'Soundtrap', 'Bandzoogle'].map((theme) => (
                <div key={theme} className="text-center">
                  <div className="h-16 bg-gradient-to-br from-primary to-primary/80 rounded-lg mb-2" />
                  <div className="text-sm font-medium">{theme}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card 
              key={stat.title}
              className={`transition-all cursor-pointer ${
                selectedCard === stat.title ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedCard(selectedCard === stat.title ? '' : stat.title)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${stat.color}`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Form Elements Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Preview of form styling in the selected theme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="client-name">Client Name</Label>
                  <Input id="client-name" placeholder="Enter client name" />
                </div>
                <div>
                  <Label htmlFor="event-date">Event Date</Label>
                  <Input id="event-date" type="date" />
                </div>
                <div>
                  <Label htmlFor="fee">Performance Fee</Label>
                  <Input id="fee" placeholder="£500" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="default">Primary Action</Button>
                  <Button variant="outline">Secondary</Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm">Delete</Button>
                  <Button variant="ghost" size="sm">Cancel</Button>
                </div>
                <div className="flex gap-2">
                  <Badge variant="default">Active</Badge>
                  <Badge variant="secondary">Pending</Badge>
                  <Badge variant="outline">Draft</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Invoice List</CardTitle>
            <CardDescription>How your invoices will look in the selected theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: 'INV-001', client: 'Sarah Johnson', amount: '£650', status: 'Paid', date: '2024-01-15' },
                { id: 'INV-002', client: 'Wedding Bells Ltd', amount: '£1,200', status: 'Sent', date: '2024-01-18' },
                { id: 'INV-003', client: 'Corporate Events Co', amount: '£800', status: 'Overdue', date: '2024-01-10' },
                { id: 'INV-004', client: 'Music Festival', amount: '£2,500', status: 'Draft', date: '2024-01-20' },
              ].map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="font-medium">{invoice.id}</div>
                    <div className="text-muted-foreground">{invoice.client}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-medium">{invoice.amount}</div>
                    <Badge 
                      variant={
                        invoice.status === 'Paid' ? 'default' : 
                        invoice.status === 'Sent' ? 'secondary' : 
                        invoice.status === 'Overdue' ? 'destructive' : 'outline'
                      }
                    >
                      {invoice.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground">{invoice.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}