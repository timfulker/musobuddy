import { useState } from "react";
import { useLocation } from "wouter";
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
import { useAuthContext } from "@/contexts/AuthContext";
import { MessageSquare, Bug, Lightbulb, Settings, AlertCircle, Plus, Trash2, Upload, X, FileText, Image } from "lucide-react";

interface Feedback {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  page?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  userName?: string;
  userEmail?: string;
}

export default function FeedbackPage() {
  const { user, isLoading: userLoading } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newFeedbackOpen, setNewFeedbackOpen] = useState(false);
  const [adminReplyOpen, setAdminReplyOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminReply, setAdminReply] = useState("");
  const [feedbackForm, setFeedbackForm] = useState({
    type: "bug",
    title: "",
    description: "",
    priority: "medium",
    page: typeof window !== 'undefined' ? window.location.pathname : '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Fetch feedback
  const { data: feedback, isLoading: feedbackLoading } = useQuery<Feedback[]>({
    queryKey: ['/api/feedback'],
    queryFn: async () => {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/feedback', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }
      return response.json();
    },
  });

  // Create feedback mutation
  const createFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: any) => {
      // Get auth token
      const token = await (async () => {
        // Check if we have Supabase auth
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          return session.access_token;
        }

        // Fallback to Firebase if needed
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        return await auth.currentUser?.getIdToken();
      })();

      // First, upload any attachments
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        setUploadingFiles(true);
        const formData = new FormData();
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        const uploadResponse = await fetch('/api/feedback/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          setUploadingFiles(false);
          const error = await uploadResponse.json();
          throw new Error(error.message || 'Failed to upload attachments');
        }

        const uploadResult = await uploadResponse.json();
        attachmentUrls = uploadResult.urls || [];
        setUploadingFiles(false);
      }

      // Then create the feedback with attachment URLs
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...feedbackData,
          attachments: attachmentUrls
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Feedback submission failed:', error);
        throw new Error(error.details || error.message || `Failed to create feedback (${response.status})`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you for your feedback! 🎉",
        description: "Your feedback has been submitted successfully and will help us improve MusoBuddy. We'll review it and get back to you if needed.",
        duration: 6000, // Show for 6 seconds
      });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      setNewFeedbackOpen(false);
      setFeedbackForm({
        type: "bug",
        title: "",
        description: "",
        priority: "medium",
        page: typeof window !== 'undefined' ? window.location.pathname : '',
      });
      setAttachments([]);
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
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch(`/api/feedback/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        description: adminReply ? "Admin response added successfully" : "Feedback status updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      setAdminReplyOpen(false);
      setSelectedFeedback(null);
      setAdminReply("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update feedback status",
        variant: "destructive",
      });
    },
  });

  // Delete feedback mutation (admin only)
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete feedback');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('🗑️ Frontend: Delete success response:', data);
      toast({
        title: "Success",
        description: data?.message || "Feedback deleted successfully",
      });
      // Force a hard refresh of the feedback data
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      queryClient.refetchQueries({ queryKey: ['/api/feedback'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete feedback",
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 10MB limit`,
          variant: "destructive",
        });
        continue;
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setAttachments([...attachments, ...validFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const handleAdminReply = () => {
    if (!selectedFeedback || !adminReply.trim()) {
      toast({
        title: "Error",
        description: "Please provide a response message",
        variant: "destructive",
      });
      return;
    }

    updateStatusMutation.mutate({
      id: selectedFeedback.id,
      status: selectedFeedback.status, // Keep current status
      adminNotes: adminReply.trim()
    });
  };

  const openAdminReply = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setAdminReply(feedback.adminNotes || "");
    setAdminReplyOpen(true);
  };

  const handleDeleteFeedback = (feedbackId: string, feedbackTitle: string) => {
    if (confirm(`Are you sure you want to delete the feedback "${feedbackTitle}"? This action cannot be undone.`)) {
      deleteFeedbackMutation.mutate(feedbackId);
    }
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

  // Show loading state while user data is being fetched
  if (userLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {user?.isAdmin ? "Feedback Management" : "Beta Feedback System"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {user?.isAdmin 
                ? "View and manage all beta tester feedback submissions"
                : "Help us improve MusoBuddy by reporting bugs and suggesting features during your beta testing period"
              }
            </p>
          </div>
          
          {/* Only show "New Feedback" button for non-admin users */}
          {!user?.isAdmin && (
            <Dialog open={newFeedbackOpen} onOpenChange={setNewFeedbackOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
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
                <div>
                  <Label htmlFor="attachments">Attachments (optional)</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Images, PDFs, or documents (max 10MB)
                          </p>
                        </div>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </div>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Selected files:</p>
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-2">
                              {getFileIcon(file)}
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setNewFeedbackOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={createFeedbackMutation.isPending || uploadingFiles}
                  className="bg-primary hover:bg-primary/90"
                >
                  {uploadingFiles ? "Uploading files..." : createFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Admin Reply Dialog */}
        <Dialog open={adminReplyOpen} onOpenChange={setAdminReplyOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Reply to Feedback</DialogTitle>
            </DialogHeader>
            {selectedFeedback && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    {getTypeIcon(selectedFeedback.type)}
                    <h3 className="font-medium">{selectedFeedback.title}</h3>
                    <Badge className={getPriorityColor(selectedFeedback.priority)}>
                      {selectedFeedback.priority}
                    </Badge>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedFeedback.description}
                  </p>
                </div>
                <div>
                  <Label htmlFor="adminReply">Your Response</Label>
                  <Textarea
                    id="adminReply"
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    placeholder="Type your response to the beta tester..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setAdminReplyOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAdminReply}
                    disabled={updateStatusMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {updateStatusMutation.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                {user?.isAdmin 
                  ? "No feedback submitted by beta testers yet."
                  : "No feedback submitted yet. Click \"New Feedback\" to get started!"
                }
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

                    {item.attachments && item.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.attachments.map((url, idx) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                              {isImage ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                              <span className="text-xs">Attachment {idx + 1}</span>
                            </a>
                          );
                        })}
                      </div>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAdminReply(item)}
                            className="text-sm"
                          >
                            Reply
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFeedback(item.id, item.title)}
                            className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteFeedbackMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
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