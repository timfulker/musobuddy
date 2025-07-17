import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { MessageSquare, Bug, Lightbulb, Settings, AlertCircle } from "lucide-react";

interface QuickFeedbackProps {
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
  buttonSize?: "sm" | "default" | "lg";
}

export default function QuickFeedback({ 
  buttonText = "Send Feedback", 
  buttonVariant = "outline",
  buttonSize = "sm"
}: QuickFeedbackProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: "bug",
    title: "",
    description: "",
    priority: "medium",
    page: typeof window !== 'undefined' ? window.location.pathname : '',
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
        description: "Thank you for your feedback! We'll review it soon.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      setIsOpen(false);
      setFeedbackForm({
        type: "bug",
        title: "",
        description: "",
        priority: "medium",
        page: typeof window !== 'undefined' ? window.location.pathname : '',
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          <MessageSquare className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Feedback</DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Help us improve MusoBuddy by reporting bugs or suggesting improvements
          </p>
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
                  <SelectItem value="bug">
                    <div className="flex items-center space-x-2">
                      <Bug className="h-4 w-4" />
                      <span>Bug Report</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="feature">
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="h-4 w-4" />
                      <span>Feature Request</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="improvement">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Improvement</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Other</span>
                    </div>
                  </SelectItem>
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
                  <SelectItem value="critical">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span>Critical</span>
                    </div>
                  </SelectItem>
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
            <Label htmlFor="page">Page</Label>
            <Input
              id="page"
              value={feedbackForm.page}
              onChange={(e) => setFeedbackForm({...feedbackForm, page: e.target.value})}
              placeholder="Current page (auto-filled)"
              className="text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
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
  );
}