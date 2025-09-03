#!/bin/bash

echo "=== RESPONSIVENESS CHECK REPORT ==="
echo "Checking all pages for responsive design patterns..."
echo ""

# List of pages to check
pages=(
  "landing.tsx"
  "auth/login.tsx"
  "auth/signup.tsx"
  "auth/forgot-password.tsx"
  "auth/reset-password.tsx"
  "dashboard.tsx"
  "bookings.tsx"
  "contracts.tsx"
  "invoices.tsx"
  "compliance.tsx"
  "Settings.tsx"
  "templates.tsx"
  "address-book.tsx"
  "messages.tsx"
  "user-guide.tsx"
  "admin.tsx"
  "system-health.tsx"
  "terms-and-conditions.tsx"
  "start-trial.tsx"
  "email-setup.tsx"
  "new-booking.tsx"
  "client-portal.tsx"
  "feedback.tsx"
  "mobile-bookings.tsx"
  "mobile-invoice-sender.tsx"
)

issues_found=0
pages_checked=0

for page in "${pages[@]}"; do
  filepath="/home/runner/workspace/client/src/pages/$page"
  
  if [ -f "$filepath" ]; then
    pages_checked=$((pages_checked + 1))
    echo "Checking: $page"
    
    # Check for responsive classes (sm:, md:, lg:, xl:)
    responsive_count=$(grep -o 'sm:\|md:\|lg:\|xl:' "$filepath" 2>/dev/null | wc -l)
    
    # Check for grid classes
    grid_count=$(grep -o 'grid\|flex' "$filepath" 2>/dev/null | wc -l)
    
    # Check for fixed widths that might cause issues
    fixed_width=$(grep -E 'w-\[.*px\]|width:.*px' "$filepath" 2>/dev/null | grep -v 'max-w' | wc -l)
    
    # Check for overflow handling
    overflow_handling=$(grep -o 'overflow-\|scrollbar' "$filepath" 2>/dev/null | wc -l)
    
    if [ $responsive_count -lt 2 ] && [ $grid_count -gt 0 ]; then
      echo "  ⚠️  Low responsive class usage (only $responsive_count responsive modifiers)"
      issues_found=$((issues_found + 1))
    fi
    
    if [ $fixed_width -gt 3 ]; then
      echo "  ⚠️  Multiple fixed widths detected ($fixed_width instances) - might cause mobile issues"
      issues_found=$((issues_found + 1))
    fi
    
    if [ $responsive_count -gt 0 ] || [ $overflow_handling -gt 0 ]; then
      echo "  ✓ Has responsive design elements"
    fi
    
    echo ""
  fi
done

echo "=== SUMMARY ==="
echo "Pages checked: $pages_checked"
echo "Potential issues found: $issues_found"

# Check for mobile-specific utilities
echo ""
echo "=== MOBILE UTILITIES CHECK ==="
if [ -f "/home/runner/workspace/client/src/hooks/use-mobile.tsx" ]; then
  echo "✓ Mobile detection hook found"
fi

# Check for responsive components
echo ""
echo "=== RESPONSIVE COMPONENTS CHECK ==="
for component in "responsive-button" "mobile-navigation-wrapper" "mobile-feature-guard"; do
  if [ -f "/home/runner/workspace/client/src/components/$component.tsx" ]; then
    echo "✓ $component.tsx found"
  fi
done