import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface QuickFeedbackProps {
  buttonText?: string;
  buttonSize?: "sm" | "default" | "lg";
  buttonVariant?: "default" | "outline" | "ghost";
}

export default function QuickFeedback({ 
  buttonText = "Feedback", 
  buttonSize = "default",
  buttonVariant = "default" 
}: QuickFeedbackProps) {
  const handleFeedbackClick = () => {
    // Navigate to feedback page
    window.location.href = "/feedback";
  };

  return (
    <Button
      onClick={handleFeedbackClick}
      size={buttonSize}
      variant={buttonVariant}
      className="gap-2"
    >
      <MessageSquare className="h-4 w-4" />
      {buttonText}
    </Button>
  );
}