/**
 * Navigation Fix Verification Script
 * Run this in the browser console when on the client portal page
 */

console.log('=== MOBILE NAV HIDING VERIFICATION ===\n');

// Test 1: Check body classes
console.log('1. Body Classes:');
const hasClientPortalClass = document.body.classList.contains('client-portal-active');
const hasNoMobileNavClass = document.body.classList.contains('no-mobile-nav');
console.log('   client-portal-active:', hasClientPortalClass ? '✅' : '❌');
console.log('   no-mobile-nav:', hasNoMobileNavClass ? '✅' : '❌');

// Test 2: Check for navigation elements
console.log('\n2. Navigation Elements:');
const navSelectors = [
    '[data-mobile-nav]',
    '#mobile-nav-main',
    '.mobile-nav-component',
    '.mobile-nav',
    'nav[role="navigation"]'
];

let navFound = false;
navSelectors.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) {
        const styles = window.getComputedStyle(el);
        const isHidden = styles.display === 'none' ||
                        styles.visibility === 'hidden' ||
                        styles.left === '-99999px';
        console.log(`   ${selector}:`, isHidden ? '✅ Hidden' : '❌ VISIBLE!');
        if (!isHidden) navFound = true;
    } else {
        console.log(`   ${selector}: ✅ Not found (good!)`)
    }
});

// Test 3: Check for fixed bottom elements
console.log('\n3. Fixed Bottom Elements:');
const bottomElements = Array.from(document.querySelectorAll('.fixed.bottom-0, [class*="bottom-0"]'))
    .filter(el => {
        if (el.classList.contains('client-portal-allowed')) return false;
        const styles = window.getComputedStyle(el);
        return styles.display !== 'none' && styles.visibility !== 'hidden';
    });

if (bottomElements.length > 0) {
    console.log('   ❌ Found', bottomElements.length, 'visible fixed bottom elements:');
    bottomElements.forEach(el => {
        console.log('     -', el.className || el.tagName, el.id ? `#${el.id}` : '');
    });
} else {
    console.log('   ✅ No unwanted fixed bottom elements found');
}

// Test 4: Check emergency styles
console.log('\n4. Emergency Styles:');
const emergencyStyles = document.getElementById('client-portal-emergency-styles');
console.log('   Emergency styles injected:', emergencyStyles ? '✅' : '❌');

// Test 5: Check for elements hidden by portal
console.log('\n5. Portal-Hidden Elements:');
const portalHidden = document.querySelectorAll('[data-hidden-by-client-portal="true"]');
console.log('   Elements hidden by portal:', portalHidden.length);
portalHidden.forEach(el => {
    console.log('     -', el.className || el.tagName);
});

// Test 6: Look for navigation icons
console.log('\n6. Navigation Icons Check:');
const suspiciousIcons = Array.from(document.querySelectorAll('svg')).filter(svg => {
    const parent = svg.closest('.fixed.bottom-0, [class*="bottom-0"]');
    if (!parent) return false;
    const styles = window.getComputedStyle(parent);
    return styles.display !== 'none' && !parent.classList.contains('client-portal-allowed');
});

if (suspiciousIcons.length > 0) {
    console.log('   ❌ Found', suspiciousIcons.length, 'potentially visible navigation icons');
} else {
    console.log('   ✅ No visible navigation icons detected');
}

// Final summary
console.log('\n=== SUMMARY ===');
const allGood = hasClientPortalClass &&
                hasNoMobileNavClass &&
                !navFound &&
                bottomElements.length === 0 &&
                emergencyStyles &&
                suspiciousIcons.length === 0;

if (allGood) {
    console.log('✅ ALL CHECKS PASSED - Navigation should be hidden!');
} else {
    console.log('❌ SOME CHECKS FAILED - Navigation may still be visible');
    console.log('\nTo force hide any remaining navigation, run:');
    console.log(`
document.querySelectorAll('[data-mobile-nav], .mobile-nav, nav, .fixed.bottom-0').forEach(el => {
    if (!el.classList.contains('client-portal-allowed')) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.position = 'fixed';
        el.style.left = '-99999px';
        console.log('Force hidden:', el);
    }
});`);
}

// Export results for testing
window.__navTestResults = {
    bodyClasses: { hasClientPortalClass, hasNoMobileNavClass },
    navFound,
    bottomElements: bottomElements.length,
    emergencyStyles: !!emergencyStyles,
    portalHidden: portalHidden.length,
    suspiciousIcons: suspiciousIcons.length,
    allGood
};