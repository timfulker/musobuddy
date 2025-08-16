interface NotificationBadgeProps {
  count: number | undefined;
  maxDisplay?: number;
}

export function NotificationBadge({ count, maxDisplay = 99 }: NotificationBadgeProps) {
  // Only show badge if count is greater than 0
  if (!count || count <= 0) return null;

  const displayCount = count > maxDisplay ? `${maxDisplay}+` : count.toString();

  return (
    <span className="absolute top-1/2 -translate-y-1/2 right-3 min-w-[18px] h-[18px] bg-green-500 text-black text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
      {displayCount}
    </span>
  );
}