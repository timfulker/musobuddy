import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Bug, Lightbulb, Settings, AlertCircle, Plus } from "lucide-react";

interface Feedback {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  page?: string;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  userName?: string;
  userEmail?: string;
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Access control - only beta testers can access this page
  if (!user?.isBetaTester && !user?.isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Beta Tester Access Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              This feedback system is currently available to beta testers only. 
              Contact the administrator for beta testing access.
            </p>
          </div>
        </div>
      </Layout>
    );
  }
  
  const [newFeedbackOpen, setNewFeedbackOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: "bug",
    title: "",
    description: "",
    priority: "medium",
    page: window.location.pathname,
  });

  // Fetch feedback
  const { data: feedback, isLoading: feedbackLoading } = useQuery<Feedback[]>({
    queryKey: ['/api/feedback'],
  });

  // Create feedback mutation
  const createFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: any) => {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create feedback');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Feedback submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      setNewFeedbackOpen(false);
      setFeedbackForm({
        type: "bug",
        title: "",
        description: "",
        priority: "medium",
        page: window.location.pathname,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  // Update feedback status (admin only)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const response = await fetch(`/api/feedback/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update feedback status');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Feedback status updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update feedback status",
        variant: "destructive",
      });
    },
  });

  const handleSubmitFeedback = () => {
    if (!feedbackForm.title || !feedbackForm.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    createFeedbackMutation.mutate(feedbackForm);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug className="h-4 w-4" />;
      case 'feature': return <Lightbulb className="h-4 w-4" />;
      case 'improvement': return <Settings className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Beta Feedback System</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {user?.isAdmin 
                ? "View and manage all beta tester feedback submissions"
                : "Help us improve MusoBuddy by reporting bugs and suggesting features during your beta testing period"
              }
            </p>
          </div>
          
          <Dialog open={newFeedbackOpen} onOpenChange={setNewFeedbackOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                New Feedback
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Submit Feedback</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={feedbackForm.type} onValueChange={(value) => setFeedbackForm({...feedbackForm, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="improvement">Improvement</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={feedbackForm.priority} onValueChange={(value) => setFeedbackForm({...feedbackForm, priority: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={feedbackForm.title}
                    onChange={(e) => setFeedbackForm({...feedbackForm, title: e.target.value})}
                    placeholder="Brief description of the issue or suggestion"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={feedbackForm.description}
                    onChange={(e) => setFeedbackForm({...feedbackForm, description: e.target.value})}
                    placeholder="Detailed description, steps to reproduce (for bugs), or explanation of the feature/improvement"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="page">Page (optional)</Label>
                  <Input
                    id="page"
                    value={feedbackForm.page}
                    onChange={(e) => setFeedbackForm({...feedbackForm, page: e.target.value})}
                    placeholder="Page where the issue occurred"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setNewFeedbackOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitFeedback}
                  disabled={createFeedbackMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {createFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Feedback List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {user?.isAdmin ? "All Beta Tester Feedback" : "Your Feedback"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedbackLoading ? (
              <p>Loading feedback...</p>
            ) : !feedback || feedback.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No feedback submitted yet. Click "New Feedback" to get started!
              </p>
            ) : (
              <div className="space-y-4">
                {feedback.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(item.type)}
                        <h3 className="font-medium">{item.title}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                    
                    {item.page && (
                      <p className="text-sm text-gray-500">
                        Page: {item.page}
                      </p>
                    )}
                    
                    {item.adminNotes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Admin Notes:
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {item.adminNotes}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        Submitted: {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      {user?.isAdmin && (
                        <div className="flex items-center space-x-2">
                          <span>by {item.userName} ({item.userEmail})</span>
                          <Select
                            value={item.status}
                            onValueChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}