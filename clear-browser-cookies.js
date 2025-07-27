// Clear browser cookies script
console.log('🧹 Clear browser cookies by running this in browser console:');
console.log('');
console.log('document.cookie.split(";").forEach(function(c) { ');
console.log('  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); ');
console.log('});');
console.log('');
console.log('Then refresh the page to clear session conflicts.');