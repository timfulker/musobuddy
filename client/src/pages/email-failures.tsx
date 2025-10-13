import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, Eye, Trash2, RefreshCcw, CheckCircle, Mail, Calendar, User, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { useLocation } from "wouter";

interface EmailFailure {
  id: number;
  userId: string;
  bookingId?: number;
  recipientEmail: string;
  recipientName?: string;
  emailType: string;
  subject?: string;
  failureType: string;
  failureReason?: string;
  provider?: string;
  retryCount: number;
  priority: string;
  createdAt: string;
  // Booking details from join
  clientName?: string;
  eventDate?: string;
  venue?: string;
}

export default function EmailFailures() {
  const [selectedFailure, setSelectedFailure] = useState<EmailFailure | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Fetch email failures
  const { data: failures = [], isLoading } = useQuery({
    queryKey: ['emailFailures'],
    queryFn: async () => {
      const response = await apiRequest('/api/email-failures');
      const data = await response.json();
      return data.failures || [];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Mark as resolved mutation
  const resolveFailureMutation = useMutation({
    mutationFn: async ({ id, actionTaken }: { id: number; actionTaken?: string }) => {
      const response = await apiRequest(`/api/email-failures/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionTaken })
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailFailures'] });
      queryClient.invalidateQueries({ queryKey: ['emailFailuresCount'] });
      setSelectedFailure(null);
      setActionNotes("");
      toast({
        title: "Failure Resolved",
        description: "Email failure has been marked as resolved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Resolve",
        description: error.message || "Could not mark failure as resolved",
        variant: "destructive"
      });
    }
  });

  // Retry email mutation
  const retryEmailMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/email-failures/${id}/retry`, {
        method: 'POST',
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['emailFailures'] });
      queryClient.invalidateQueries({ queryKey: ['emailFailuresCount'] });
      setSelectedFailure(null);
      toast({
        title: "Email Resent",
        description: data.success ? "Email was successfully resent!" : "Email retry queued",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Retry Failed",
        description: error.message || "Could not retry sending email",
        variant: "destructive"
      });
    }
  });

  // Delete failure mutation
  const deleteFailureMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/email-failures/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailFailures'] });
      queryClient.invalidateQueries({ queryKey: ['emailFailuresCount'] });
      setSelectedFailure(null);
      toast({
        title: "Failure Deleted",
        description: "Email failure record has been removed.",
      });
    },
  });

  const getFailureTypeColor = (failureType: string) => {
    switch (failureType) {
      case 'hard_bounce':
        return 'destructive';
      case 'soft_bounce':
        return 'secondary';
      case 'spam_complaint':
        return 'destructive';
      case 'deferred':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'critical':
        return 'text-red-600';
      case 'medium':
        return 'text-orange-600';
      case 'low':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getFailureTypeLabel = (failureType: string) => {
    switch (failureType) {
      case 'hard_bounce':
        return 'Hard Bounce';
      case 'soft_bounce':
        return 'Soft Bounce';
      case 'spam_complaint':
        return 'Spam Complaint';
      case 'deferred':
        return 'Delivery Delayed';
      default:
        return failureType;
    }
  };

  const highPriorityCount = failures.filter((f: EmailFailure) =>
    f.priority === 'high' || f.priority === 'critical'
  ).length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Mail className="h-8 w-8 text-primary" />
              Email Delivery Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and manage email delivery status
            </p>
          </div>
          <div className="flex items-center gap-3">
            {highPriorityCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {highPriorityCount} need attention
              </Badge>
            )}
            {failures.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {failures.length} unresolved
              </Badge>
            )}
          </div>
        </div>

        {/* Email Delivery Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Delivery Issues
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Emails that require attention or review
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading failures...</p>
              </div>
            ) : failures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p className="font-medium">All Clear!</p>
                <p className="text-sm">No delivery issues to review</p>
              </div>
            ) : (
              <div className="space-y-3">
                {failures.map((failure: EmailFailure) => (
                  <div
                    key={failure.id}
                    className="p-4 border rounded-lg transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedFailure(failure)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getFailureTypeColor(failure.failureType)}>
                            {getFailureTypeLabel(failure.failureType)}
                          </Badge>
                          <Badge variant="outline">
                            {failure.emailType}
                          </Badge>
                          <span className={cn("text-xs font-medium", getPriorityColor(failure.priority))}>
                            {failure.priority} priority
                          </span>
                          {failure.retryCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {failure.retryCount} retries
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3" />
                            <span className="font-medium">
                              {failure.recipientName || failure.recipientEmail}
                            </span>
                            {failure.recipientName && (
                              <span className="text-muted-foreground">({failure.recipientEmail})</span>
                            )}
                          </div>

                          {failure.clientName && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {failure.clientName}
                                {failure.eventDate && ` • ${new Date(failure.eventDate).toLocaleDateString('en-GB', { timeZone: 'UTC' })}`}
                                {failure.venue && ` • ${failure.venue}`}
                              </span>
                            </div>
                          )}

                          {failure.subject && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              Subject: {failure.subject}
                            </p>
                          )}

                          {failure.failureReason && (
                            <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
                              {failure.failureReason}
                            </p>
                          )}

                          <p className="text-xs text-muted-foreground">
                            Failed {new Date(failure.createdAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })} at {new Date(failure.createdAt).toLocaleTimeString('en-GB', { timeZone: 'UTC' })} UTC
                            {failure.provider && ` • via ${failure.provider}`}
                            {failure.bookingId && ` • Booking #${failure.bookingId}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFailure(failure);
                          }}
                          className="h-8"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Issue Detail Dialog */}
        {selectedFailure && (
          <Dialog open={!!selectedFailure} onOpenChange={() => setSelectedFailure(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Delivery Details
                </DialogTitle>
                <DialogDescription>
                  Review delivery status and take action if needed
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Failure Type & Priority */}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={getFailureTypeColor(selectedFailure.failureType)} className="text-sm">
                    {getFailureTypeLabel(selectedFailure.failureType)}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {selectedFailure.emailType}
                  </Badge>
                  <Badge variant="secondary" className={cn("text-sm", getPriorityColor(selectedFailure.priority))}>
                    {selectedFailure.priority} priority
                  </Badge>
                  {selectedFailure.retryCount > 0 && (
                    <Badge variant="secondary" className="text-sm">
                      {selectedFailure.retryCount} retry attempts
                    </Badge>
                  )}
                </div>

                {/* Recipient Info */}
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">Recipient:</label>
                    <p className="text-sm">{selectedFailure.recipientName || selectedFailure.recipientEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email Address:</label>
                    <p className="text-sm text-muted-foreground">{selectedFailure.recipientEmail}</p>
                  </div>
                </div>

                {/* Booking Info */}
                {selectedFailure.bookingId && (
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium">Related Booking:</label>
                    <div className="space-y-1 text-sm">
                      <p>Booking #{selectedFailure.bookingId}</p>
                      {selectedFailure.clientName && <p>Client: {selectedFailure.clientName}</p>}
                      {selectedFailure.eventDate && (
                        <p>Event Date: {new Date(selectedFailure.eventDate).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</p>
                      )}
                      {selectedFailure.venue && <p>Venue: {selectedFailure.venue}</p>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/bookings?highlight=${selectedFailure.bookingId}`)}
                      className="mt-2"
                    >
                      View Booking
                    </Button>
                  </div>
                )}

                {/* Email Info */}
                {selectedFailure.subject && (
                  <div>
                    <label className="text-sm font-medium">Subject:</label>
                    <p className="text-sm text-muted-foreground">{selectedFailure.subject}</p>
                  </div>
                )}

                {/* Failure Details */}
                <div>
                  <label className="text-sm font-medium">Failure Reason:</label>
                  <div className="mt-1 p-3 bg-red-50 dark:bg-red-950/20 rounded-md text-sm">
                    {selectedFailure.failureReason || 'No specific reason provided'}
                  </div>
                </div>

                {/* Provider & Timing */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium">Provider:</label>
                    <p className="text-muted-foreground">{selectedFailure.provider || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="font-medium">Failed At:</label>
                    <p className="text-muted-foreground">
                      {new Date(selectedFailure.createdAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
                    </p>
                  </div>
                </div>

                {/* Action Notes */}
                <div>
                  <label className="text-sm font-medium">Action Notes (Optional):</label>
                  <Textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Describe what action you took to resolve this issue..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => retryEmailMutation.mutate(selectedFailure.id)}
                    disabled={retryEmailMutation.isPending || selectedFailure.retryCount >= 3}
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {retryEmailMutation.isPending ? "Retrying..." : "Retry Send"}
                  </Button>

                  <Button
                    onClick={() => resolveFailureMutation.mutate({
                      id: selectedFailure.id,
                      actionTaken: actionNotes
                    })}
                    disabled={resolveFailureMutation.isPending}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark as Resolved
                  </Button>

                  <Button
                    onClick={() => deleteFailureMutation.mutate(selectedFailure.id)}
                    disabled={deleteFailureMutation.isPending}
                    variant="outline"
                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>

                  <Button
                    onClick={() => setSelectedFailure(null)}
                    variant="outline"
                    className="ml-auto"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Close
                  </Button>
                </div>

                {selectedFailure.retryCount >= 3 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ This email has reached the maximum retry attempts (3). Consider using an alternative contact method.
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
