# GlockApps Manual Testing Scripts

## Important: Mailgun Rate Limiting

Your account is limited to 100 messages/hour. Wait for Mailgun to lift restrictions, then run these scripts with proper spacing.

**Recommended Schedule:**
- Script 1: First 25 emails
- Wait 20-30 minutes
- Script 2: Next 25 emails  
- Wait 20-30 minutes
- Script 3: Next 25 emails
- Wait 20-30 minutes
- Script 4: Final 16 emails

## Script 1: Emails 1-25

Copy and paste this into browser console while logged into MusoBuddy:

```javascript
// GlockApps Test Batch 1 - Emails 1-25
async function runGlockAppsBatch1() {
  try {
    console.log('🚀 Starting GlockApps Batch 1 (Emails 1-25)...');
    
    const seedEmails = [
      "elizabeaver@auth.glockdb.com",
      "juliarspivey@aol.com", 
      "davidvcampbell@aol.com",
      "lynettedweyand@protonmail.com",
      "bbarretthenryhe@gmail.com",
      "luisl417@yahoo.com",
      "jerrybrucedath@gmail.com",
      "verify79@web.de",
      "simonetgrimard@laposte.net",
      "irenem@userflowhq.com",
      "comwhitttakarticjt@gmx.de",
      "verifynewssl@zoho.com",
      "yadiraalfordbj@hotmail.com",
      "dannakbond@aol.com",
      "allanb@glockapps.awsapps.com",
      "eliza@spamcombat.com",
      "eugenedandy576@gmail.com",
      "pprestondasavis@gmx.com",
      "alisonnlawrence@gmail.com",
      "verifycom79@gmx.com",
      "b2bdeliver79@mail.com",
      "romanespor11@icloud.com",
      "joereddison@outlook.com",
      "martin@glockapps.tech",
      "verify79@buyemailsoftware.com"
    ];
    
    const templatesResponse = await fetch('/api/templates');
    const templates = await templatesResponse.json();
    
    console.log(`📝 Using template: "${templates[0].name}"`);
    console.log(`📧 Sending to ${seedEmails.length} addresses (Batch 1)...`);
    
    const response = await fetch('/api/test/glockapp-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId: '2025-07-31-batch-1',
        templateId: templates[0].id.toString(),
        seedEmails: seedEmails
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}:`, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Batch 1 COMPLETED!');
    console.log(`📊 Results: ${result.totalSent} sent, ${result.totalFailed} failed`);
    console.log('⏳ Wait 20-30 minutes before running Batch 2');
    
  } catch (error) {
    console.error('❌ Batch 1 failed:', error);
  }
}

runGlockAppsBatch1();
```

## Script 2: Emails 26-50

Copy and paste this into browser console (wait 20-30 minutes after Batch 1):

```javascript
// GlockApps Test Batch 2 - Emails 26-50
async function runGlockAppsBatch2() {
  try {
    console.log('🚀 Starting GlockApps Batch 2 (Emails 26-50)...');
    
    const seedEmails = [
      "gailllitle@att.net",
      "jeffsayerss@yahoo.com",
      "johnnyjonesjake@hotmail.com",
      "heavenpeck@freenet.de",
      "virginia@buyemailsoftware.com",
      "creissantdubois@laposte.net",
      "tristonreevestge@outlook.com.br",
      "irene@postmasterpro.email",
      "jessicalisa6054@gmail.com",
      "blaircourtneye@outlook.com",
      "lashawnrheidrick@yahoo.com",
      "loganalan654@gmail.com",
      "assa@auth.glockdb.com",
      "emilliesunnyk@gmail.com",
      "williamhensley54@yahoo.com",
      "debrajhammons@outlook.com",
      "racheljavierera@hotmail.com",
      "williamhbishopp@yahoo.com",
      "anmeiyudobaihq@gmx.de",
      "cierawilliamsonwq@gmail.com",
      "frankdesalvo@mailo.com",
      "jamesjng@outlook.com",
      "davidkdoyle@hotmail.com",
      "gd@desktopemail.com",
      "bookerttubbs@zohomail.eu"
    ];
    
    const templatesResponse = await fetch('/api/templates');
    const templates = await templatesResponse.json();
    
    console.log(`📝 Using template: "${templates[0].name}"`);
    console.log(`📧 Sending to ${seedEmails.length} addresses (Batch 2)...`);
    
    const response = await fetch('/api/test/glockapp-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId: '2025-07-31-batch-2',
        templateId: templates[0].id.toString(),
        seedEmails: seedEmails
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}:`, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Batch 2 COMPLETED!');
    console.log(`📊 Results: ${result.totalSent} sent, ${result.totalFailed} failed`);
    console.log('⏳ Wait 20-30 minutes before running Batch 3');
    
  } catch (error) {
    console.error('❌ Batch 2 failed:', error);
  }
}

runGlockAppsBatch2();
```

## Script 3: Emails 51-75

Copy and paste this into browser console (wait 20-30 minutes after Batch 2):

```javascript
// GlockApps Test Batch 3 - Emails 51-75
async function runGlockAppsBatch3() {
  try {
    console.log('🚀 Starting GlockApps Batch 3 (Emails 51-75)...');
    
    const seedEmails = [
      "lenorebayerd@gmail.com",
      "taverasbrianvg@gmail.com",
      "johntberman@yahoo.com",
      "raphaelewiley@aol.com",
      "keenanblooms@gmail.com",
      "carollpooool@outlook.com",
      "catherinedwilsonn@aol.com",
      "mbell@fastdirectorysubmitter.com",
      "martinawm@gemings.awsapps.com",
      "luanajortega@yahoo.com",
      "markjenningson@hotmail.com",
      "naomimartinsn@hotmail.com",
      "brittanyrocha@outlook.de",
      "larrycellis@aol.com",
      "madeleinecagleks@gmail.com",
      "geraldmbautista@outlook.com",
      "williamtkozlowsk@gmail.com",
      "aileenjamesua@outlook.com",
      "paul@userflowhq.com",
      "carlbilly605@gmail.com",
      "alfredohoffman@fastdirectorysubmitter.com",
      "tinamallahancr@gmail.com",
      "verifyde79@gmx.de",
      "andrewheggins@mailo.com",
      "johnsimonskh@gmail.com"
    ];
    
    const templatesResponse = await fetch('/api/templates');
    const templates = await templatesResponse.json();
    
    console.log(`📝 Using template: "${templates[0].name}"`);
    console.log(`📧 Sending to ${seedEmails.length} addresses (Batch 3)...`);
    
    const response = await fetch('/api/test/glockapp-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId: '2025-07-31-batch-3',
        templateId: templates[0].id.toString(),
        seedEmails: seedEmails
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}:`, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Batch 3 COMPLETED!');
    console.log(`📊 Results: ${result.totalSent} sent, ${result.totalFailed} failed`);
    console.log('⏳ Wait 20-30 minutes before running Batch 4');
    
  } catch (error) {
    console.error('❌ Batch 3 failed:', error);
  }
}

runGlockAppsBatch3();
```

## Script 4: Emails 76-91 (Final Batch)

Copy and paste this into browser console (wait 20-30 minutes after Batch 3):

```javascript
// GlockApps Test Batch 4 - Emails 76-91 (Final)
async function runGlockAppsBatch4() {
  try {
    console.log('🚀 Starting GlockApps Batch 4 (Final 16 emails)...');
    
    const seedEmails = [
      "jurgeneberhartdd@web.de",
      "bobbybagdgddwins@mailo.com",
      "elizabethbetty6054@gmail.com",
      "deweymadddax@currently.com",
      "leoefraser@yahoo.com",
      "glencabrera@outlook.fr",
      "clyde@trustycheck.pro",
      "candacechall@aol.com",
      "augustinlidermann@t-online.de",
      "wilcoxginax@gmail.com",
      "daishacorwingx@gmail.com",
      "louiepettydr@gmail.com",
      "carloscohenm@freenet.de",
      "michaelrwoodd@yahoo.com",
      "fredmrivenburg@aol.com"
    ];
    
    const templatesResponse = await fetch('/api/templates');
    const templates = await templatesResponse.json();
    
    console.log(`📝 Using template: "${templates[0].name}"`);
    console.log(`📧 Sending to ${seedEmails.length} addresses (Final Batch)...`);
    
    const response = await fetch('/api/test/glockapp-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId: '2025-07-31-batch-4-final',
        templateId: templates[0].id.toString(),
        seedEmails: seedEmails
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}:`, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('🎉 FINAL BATCH COMPLETED!');
    console.log(`📊 Results: ${result.totalSent} sent, ${result.totalFailed} failed`);
    console.log('✅ ALL 91 GLOCKAPP EMAILS SENT!');
    console.log('📧 Check your GlockApps dashboard in 10-15 minutes for complete results');
    
  } catch (error) {
    console.error('❌ Final batch failed:', error);
  }
}

runGlockAppsBatch4();
```

## Summary

- **Total emails:** 91 GlockApps seed addresses
- **Batch 1:** 25 emails
- **Batch 2:** 25 emails  
- **Batch 3:** 25 emails
- **Batch 4:** 16 emails (final)
- **Wait time:** 20-30 minutes between each batch
- **Total time:** Approximately 2 hours for complete test

Wait for Mailgun restrictions to lift, then run these scripts manually with proper spacing to avoid rate limiting.