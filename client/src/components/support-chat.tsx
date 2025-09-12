import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MessageCircle, Send, X, Minimize2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { apiRequest } from '@/lib/queryClient';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface SupportChatProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const defaultMessages: Message[] = [
  {
    id: '1',
    text: 'Hello! I\'m your MusoBuddy assistant. I can help you with contracts, invoices, bookings, and any questions about using the platform. How can I assist you today?',
    sender: 'bot',
    timestamp: new Date()
  }
];

export default function SupportChat({ isOpen: externalIsOpen, onClose }: SupportChatProps = {}) {
  // Use external control if provided, otherwise fall back to internal state
  const [internalIsOpen, setInternalIsOpen] = useState(() => {
    const saved = localStorage.getItem('musobuddy-chat-open');
    return saved ? JSON.parse(saved) : false;
  });
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('musobuddy-chat-minimized');
    return saved ? JSON.parse(saved) : false;
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('musobuddy-chat-messages');
    return saved ? JSON.parse(saved) : defaultMessages;
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('musobuddy-chat-position');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();

  // Save state to localStorage (only for internal state)
  useEffect(() => {
    if (externalIsOpen === undefined) {
      localStorage.setItem('musobuddy-chat-open', JSON.stringify(internalIsOpen));
    }
  }, [internalIsOpen, externalIsOpen]);

  useEffect(() => {
    localStorage.setItem('musobuddy-chat-minimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    localStorage.setItem('musobuddy-chat-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('musobuddy-chat-position', JSON.stringify(position));
  }, [position]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Check authentication
    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use the support chat.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiRequest('/api/support-chat', {
        method: 'POST',
        body: { message: messageToSend },
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Support chat error:', error);
      
      // Handle specific authentication errors
      if (error.message.includes('session has expired') || error.message.includes('401')) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again to continue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to get response. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - 320; // 320px is chat width
    const maxY = window.innerHeight - (isMinimized ? 48 : 384); // 384px is chat height
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const sendSupportEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) return;
    
    // Check authentication
    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send support emails.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await apiRequest('/api/support/email', {
        method: 'POST',
        body: JSON.stringify({
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
        }),
      });

      if (response.success) {
        toast({
          title: "Email Sent Successfully",
          description: "Your message has been sent to our support team. We'll get back to you soon!",
        });
        
        // Clear the form and close dialog
        setEmailSubject('');
        setEmailMessage('');
        setEmailDialogOpen(false);
      } else {
        throw new Error(response.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Failed to send support email:', error);
      toast({
        title: "Failed to Send Email",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => externalIsOpen !== undefined ? {} : setInternalIsOpen(true)}
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl hover:shadow-primary/25 z-50 transition-all duration-300 hover:scale-105"
        size="icon"
        data-testid="button-open-support-chat"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <div
      className="fixed z-50"
      style={{
        left: position.x || 'calc(100vw - 320px - 24px)',
        top: position.y || 'calc(100vh - 80px - 384px)',
        transform: position.x || position.y ? 'none' : 'translateY(0)'
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Card className={`w-80 shadow-2xl border-0 bg-white/95 backdrop-blur-sm rounded-2xl transition-all duration-300 ${isMinimized ? 'h-12' : 'h-96'} ${isDragging ? 'cursor-grabbing' : ''}`}>
      <CardHeader 
        className="pb-3 flex flex-row items-center justify-between cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <CardTitle className="text-sm font-semibold" data-testid="text-support-chat-title">MusoBuddy Support</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6"
            data-testid="button-minimize-support-chat"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => externalIsOpen !== undefined ? onClose?.() : setInternalIsOpen(false)}
            className="h-6 w-6"
            data-testid="button-close-support-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="flex flex-col h-full pb-4">
          <div className="flex-1 overflow-y-auto mb-4 space-y-3" data-testid="chat-messages-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${message.sender}-${message.id}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                    message.sender === 'user'
                      ? ''
                      : 'bg-gray-100 text-gray-900'
                  }`}
                  style={message.sender === 'user' ? {
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-primary-text)'
                  } : {}}
                  data-testid={`text-message-content-${message.id}`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start" data-testid="chat-loading-indicator">
                <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            {!isAuthenticated && (
              <div className="flex justify-center" data-testid="chat-auth-warning">
                <div className="bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg text-sm text-yellow-800">
                  Please log in to use the support chat feature.
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isAuthenticated ? "Type your message..." : "Please log in to chat..."}
                disabled={isLoading || !isAuthenticated}
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim() || !isAuthenticated}
                size="icon"
                className="bg-primary hover:bg-primary/90"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex justify-center pt-2 border-t">
              <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2"
                    disabled={!isAuthenticated}
                    data-testid="button-email-support"
                  >
                    <Mail className="h-4 w-4" />
                    Email Support
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Email Support Team</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-subject">Subject</Label>
                      <Input
                        id="email-subject"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Brief description of your issue..."
                        data-testid="input-email-subject"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-message">Message</Label>
                      <Textarea
                        id="email-message"
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Describe your issue or question in detail..."
                        rows={6}
                        data-testid="textarea-email-message"
                      />
                    </div>
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEmailDialogOpen(false);
                          setEmailSubject('');
                          setEmailMessage('');
                        }}
                        data-testid="button-cancel-email"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={sendSupportEmail}
                        disabled={isSendingEmail || !emailSubject.trim() || !emailMessage.trim()}
                        data-testid="button-send-email"
                      >
                        {isSendingEmail ? 'Sending...' : 'Send Email'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
    </div>
  );
}