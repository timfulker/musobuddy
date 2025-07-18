import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, Send, DollarSign, CreditCard } from "lucide-react";

interface BookingProgressTagsProps {
  booking: {
    contractSent?: boolean;
    contractSigned?: boolean;
    invoiceSent?: boolean;
    paidInFull?: boolean;
    depositPaid?: boolean;
    status: string;
  };
  size?: "sm" | "md" | "lg";
}

export default function BookingProgressTags({ booking, size = "sm" }: BookingProgressTagsProps) {
  const tags = [];

  // Contract Sent
  if (booking.contractSent) {
    tags.push({
      label: "Contract Sent",
      icon: Send,
      color: "bg-blue-100 text-blue-800 border-blue-200",
      emoji: "📤"
    });
  }

  // Contract Signed
  if (booking.contractSigned) {
    tags.push({
      label: "Contract Signed",
      icon: CheckCircle,
      color: "bg-green-100 text-green-800 border-green-200",
      emoji: "🖋️"
    });
  }

  // Invoice Sent
  if (booking.invoiceSent) {
    tags.push({
      label: "Invoice Sent",
      icon: FileText,
      color: "bg-purple-100 text-purple-800 border-purple-200",
      emoji: "💸"
    });
  }

  // Deposit Paid
  if (booking.depositPaid) {
    tags.push({
      label: "Deposit Paid",
      icon: CreditCard,
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      emoji: "💳"
    });
  }

  // Paid in Full
  if (booking.paidInFull) {
    tags.push({
      label: "Paid in Full",
      icon: DollarSign,
      color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      emoji: "💰"
    });
  }

  if (tags.length === 0) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2"
  };

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag, index) => {
        const Icon = tag.icon;
        return (
          <Badge
            key={index}
            variant="secondary"
            className={`${tag.color} ${sizeClasses[size]} border flex items-center gap-1`}
          >
            <span className="text-xs">{tag.emoji}</span>
            {size !== "sm" && <Icon className="w-3 h-3" />}
            <span>{tag.label}</span>
          </Badge>
        );
      })}
    </div>
  );
}

// Helper function to get status color for the main status badge
export function getStatusColor(status: string) {
  switch (status) {
    case 'enquiry':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'quoted':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'confirmed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

// Helper function to get status icon
export function getStatusIcon(status: string) {
  switch (status) {
    case 'enquiry':
      return '📧';
    case 'quoted':
      return '💬';
    case 'confirmed':
      return '✅';
    case 'completed':
      return '🎉';
    case 'cancelled':
      return '❌';
    default:
      return '📋';
  }
}