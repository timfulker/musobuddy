interface NotificationBadgeProps {
  count: number | undefined;
  maxDisplay?: number;
}

export function NotificationBadge({ count, maxDisplay = 99 }: NotificationBadgeProps) {
  // Handle undefined count gracefully
  if (!count || count === 0) return null;

  const displayCount = count > maxDisplay ? `${maxDisplay}+` : count.toString();

  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
      {displayCount}
    </span>
  );
}