import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Music, Trophy, Star, Award, Crown, Target } from 'lucide-react';

interface ProgressTrackerProps {
  userStats: {
    totalBookings: number;
    totalContracts: number;
    totalInvoices: number;
    totalEarnings: number;
    accountAge: number; // in days
  };
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  requirement: number;
  type: 'bookings' | 'contracts' | 'invoices' | 'earnings' | 'experience';
  color: string;
  achieved: boolean;
  progress: number;
}

const milestones: Omit<Milestone, 'achieved' | 'progress'>[] = [
  {
    id: 'first-gig',
    title: 'First Performance',
    description: 'Complete your first booking',
    icon: Music,
    requirement: 1,
    type: 'bookings',
    color: 'bg-blue-500'
  },
  {
    id: 'rising-star',
    title: 'Rising Star',
    description: 'Complete 5 successful bookings',
    icon: Star,
    requirement: 5,
    type: 'bookings',
    color: 'bg-purple-500'
  },
  {
    id: 'professional',
    title: 'Professional Performer',
    description: 'Complete 25 bookings',
    icon: Award,
    requirement: 25,
    type: 'bookings',
    color: 'bg-green-500'
  },
  {
    id: 'elite-performer',
    title: 'Elite Performer',
    description: 'Complete 100 bookings',
    icon: Crown,
    requirement: 100,
    type: 'bookings',
    color: 'bg-yellow-500'
  },
  {
    id: 'contract-master',
    title: 'Contract Master',
    description: 'Send 10 professional contracts',
    icon: Target,
    requirement: 10,
    type: 'contracts',
    color: 'bg-indigo-500'
  },
  {
    id: 'business-pro',
    title: 'Business Professional',
    description: 'Generate £1,000 in total earnings',
    icon: Trophy,
    requirement: 1000,
    type: 'earnings',
    color: 'bg-emerald-500'
  },
  {
    id: 'high-earner',
    title: 'High Earner',
    description: 'Generate £5,000 in total earnings',
    icon: Crown,
    requirement: 5000,
    type: 'earnings',
    color: 'bg-orange-500'
  }
];

export function ProgressTracker({ userStats }: ProgressTrackerProps) {
  const calculateMilestoneProgress = (milestone: Omit<Milestone, 'achieved' | 'progress'>): Milestone => {
    let current = 0;
    
    switch (milestone.type) {
      case 'bookings':
        current = userStats.totalBookings;
        break;
      case 'contracts':
        current = userStats.totalContracts;
        break;
      case 'invoices':
        current = userStats.totalInvoices;
        break;
      case 'earnings':
        current = userStats.totalEarnings;
        break;
      case 'experience':
        current = userStats.accountAge;
        break;
    }
    
    const progress = Math.min((current / milestone.requirement) * 100, 100);
    const achieved = current >= milestone.requirement;
    
    return {
      ...milestone,
      achieved,
      progress
    };
  };

  const processedMilestones = milestones.map(calculateMilestoneProgress);
  const achievedCount = processedMilestones.filter(m => m.achieved).length;
  const overallProgress = (achievedCount / milestones.length) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Musical Journey Progress
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Overall Progress</span>
            <span>{achievedCount} / {milestones.length} milestones</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedMilestones.map((milestone) => {
            const IconComponent = milestone.icon;
            return (
              <div
                key={milestone.id}
                className={`relative rounded-lg border p-4 transition-all hover:shadow-md ${
                  milestone.achieved
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                    : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      milestone.achieved ? milestone.color : 'bg-gray-300'
                    } text-white`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm leading-tight">
                        {milestone.title}
                      </h3>
                      {milestone.achieved && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-2 py-0">
                          ✓
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {milestone.description}
                    </p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>
                          {milestone.type === 'earnings' ? '£' : ''}{' '}
                          {milestone.type === 'earnings' 
                            ? userStats.totalEarnings.toLocaleString()
                            : milestone.type === 'bookings' 
                              ? userStats.totalBookings
                              : milestone.type === 'contracts'
                                ? userStats.totalContracts
                                : userStats.totalInvoices
                          } / {milestone.type === 'earnings' ? '£' : ''}{milestone.requirement.toLocaleString()}
                        </span>
                      </div>
                      <Progress 
                        value={milestone.progress} 
                        className={`h-1.5 ${milestone.achieved ? 'bg-green-100' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}