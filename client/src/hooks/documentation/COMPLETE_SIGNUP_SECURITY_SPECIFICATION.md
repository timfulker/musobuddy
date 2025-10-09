# Complete SaaS Signup & Security Specification for MusoBuddy

## Overview

This document outlines the complete user registration, onboarding, and security implementation for MusoBuddy's transformation into a standard SaaS application with 30-day free trials and comprehensive fraud prevention.

## 1. User Journey Flow

### Phase 1: Landing Page & Discovery
```
Public Landing Page (musobuddy.com)
├── Hero section with value proposition
├── Feature showcase
├── Pricing tiers (Free 30-day trial, Core £9.99/month, Premium £13.99/month)
├── Testimonials/social proof
├── Call-to-action: "Start Free Trial"
└── Login link for existing users
```

### Phase 2: Account Creation
```
Registration Form
├── Email address (required)
├── Password (required, 8+ characters)
├── Full name (required)
├── Phone number (required for verification)
├── Terms & Privacy checkbox (required)
└── "Create Account" button
```

### Phase 3: Phone Verification
```
SMS Verification Screen
├── 6-digit code sent to provided phone number
├── Code input field
├── "Verify" button
├── "Resend code" option (rate-limited)
└── Phone number change option (resets process)
```

### Phase 4: Email Confirmation
```
Email Verification
├── Verification email sent automatically
├── User clicks verification link
├── Account status updated to "verified"
└── Redirects to onboarding
```

### Phase 5: Onboarding Wizard
```
Step 1: Professional Email Setup
├── Choose custom email prefix (permanent)
├── Real-time availability checking
├── Prefix validation and suggestions
└── Activation: leads+customprefix@mg.musobuddy.com

Step 2: Basic Settings
├── Business name/stage name
├── Location (city, country)
├── Music genres/specialties
├── Contact preferences
└── Profile setup

Step 3: Quick Tour
├── Dashboard overview
├── How to receive client emails
├── Key feature highlights
└── "Start Using MusoBuddy" button
```

### Phase 6: Trial Period
```
30-Day Free Trial
├── Full access to Core tier features
├── Trial countdown visible in UI
├── Upgrade prompts (non-intrusive)
├── Usage tracking and onboarding emails
└── Pre-expiration upgrade reminders
```

## 2. Security Implementation

### 2.1 Phone Verification System

**Primary Fraud Prevention Method**

**Implementation Requirements:**
- **SMS Provider:** Twilio or AWS SNS
- **Phone Validation:** International format validation
- **VOIP Detection:** Block virtual/temporary numbers
- **Rate Limiting:** Max 3 SMS per phone number per hour
- **Verification Window:** 10-minute code expiration
- **Retry Logic:** Maximum 3 attempts per code

**Database Schema:**
```sql
phone_verifications (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  verification_code VARCHAR(6),
  verified_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
)

users (
  ...existing fields...
  phone_number VARCHAR(20) UNIQUE,
  phone_verified BOOLEAN DEFAULT FALSE,
  phone_verified_at TIMESTAMP
)
```

**Security Rules:**
- One account per phone number (lifetime)
- Block known VOIP/virtual number ranges
- Detect suspicious patterns (rapid signup attempts)
- Store phone numbers permanently for blacklist checking

### 2.2 Email Verification System

**Secondary Security Layer**

**Implementation:**
- **Token Generation:** Cryptographically secure random tokens
- **Expiration:** 24-hour verification window
- **Template:** Professional branded email
- **Fallback:** Manual verification option for delivery issues

**Security Features:**
- Rate limiting: Max 3 verification emails per hour
- Token invalidation after use
- Account restrictions until verified
- Suspicious email domain detection

### 2.3 Multi-Layer Fraud Prevention

**Layer 1: Phone Verification (Primary)**
- Strongest barrier against repeat signups
- Permanent phone number database
- VOIP number blocking

**Layer 2: Device Fingerprinting**
- Browser fingerprint collection
- Device ID tracking (without cookies)
- Suspicious pattern detection
- Cross-reference with existing accounts

**Layer 3: Behavioral Analysis**
- Signup timing patterns
- IP geolocation analysis
- Usage pattern recognition
- Manual review triggers

**Layer 4: Optional Enhanced Security**
- Credit card verification (not charged)
- Social media account linking
- Business verification for premium features
- Identity document verification (enterprise only)

## 3. Trial Management System

### 3.1 Trial Lifecycle

**Trial Activation:**
```
- Starts: After phone + email verification
- Duration: 30 days from activation
- Access: Full Core tier features
- Limitations: Clearly communicated upfront
```

**Trial Monitoring:**
```
- Daily countdown in dashboard
- Usage tracking and analytics
- Engagement scoring
- Automated email sequences
```

**Trial Expiration:**
```
- Grace period: 7 days with limited access
- Data retention: 60 days before deletion
- Upgrade prompts: Progressive frequency
- Account suspension: Graceful degradation
```

### 3.2 Database Schema Extensions

```sql
users (
  ...existing fields...
  trial_started_at TIMESTAMP,
  trial_expires_at TIMESTAMP,
  trial_status ENUM('active', 'expired', 'converted', 'cancelled') DEFAULT 'active',
  signup_ip_address INET,
  device_fingerprint TEXT,
  fraud_score INTEGER DEFAULT 0,
  manual_review_required BOOLEAN DEFAULT FALSE
)

trial_usage_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  feature_used VARCHAR(100),
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP DEFAULT NOW()
)

fraud_prevention_log (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20),
  email_address VARCHAR(255),
  ip_address INET,
  device_fingerprint TEXT,
  action_taken VARCHAR(100),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)
```

## 4. Technical Implementation Architecture

### 4.1 Frontend Components

**New Components Required:**
```
/pages/landing.tsx          - Public marketing page
/pages/signup.tsx           - Registration form
/pages/verify-phone.tsx     - SMS verification
/pages/verify-email.tsx     - Email confirmation
/components/onboarding-wizard.tsx - Multi-step onboarding
/components/trial-status.tsx      - Trial countdown UI
/components/pricing-tiers.tsx     - Subscription options
```

**Enhanced Components:**
```
/components/onboarding-email-setup.tsx (existing, enhanced)
/pages/email-setup.tsx (existing, trial-aware)
/components/sidebar.tsx (trial status integration)
```

### 4.2 Backend Implementation

**New API Endpoints:**
```
POST /api/auth/register           - Account creation
POST /api/auth/send-phone-code    - SMS verification
POST /api/auth/verify-phone       - Code confirmation
POST /api/auth/send-email-verify  - Email verification
GET  /api/auth/verify-email/:token - Email confirmation
POST /api/onboarding/complete     - Onboarding completion
GET  /api/trial/status            - Trial information
POST /api/trial/extend            - Manual trial extension
```

**Enhanced Endpoints:**
```
POST /api/email/assign-prefix (enhanced with trial checks)
GET  /api/user/profile (trial status included)
POST /api/auth/login (trial expiration checks)
```

**New Services:**
```
/server/core/phone-verification.ts  - SMS handling
/server/core/email-verification.ts  - Email confirmation
/server/core/fraud-prevention.ts    - Security analysis
/server/core/trial-management.ts    - Trial lifecycle
/server/core/device-fingerprint.ts  - Browser fingerprinting
```

### 4.3 External Service Integration

**Twilio SMS Service:**
- Account SID and Auth Token required
- Phone number validation API
- SMS delivery webhooks
- International number support

**Email Service Enhancement:**
- Verification email templates
- Delivery tracking
- Bounce handling
- Reputation management

**Optional Security Services:**
- VOIP number detection API
- Fraud scoring services
- Device fingerprinting libraries
- Geolocation services

## 5. Security Monitoring & Analytics

### 5.1 Fraud Detection Metrics

**Real-time Monitoring:**
- Signup velocity (accounts per hour/day)
- Phone verification failure rates
- Suspicious email patterns
- Geographic distribution anomalies
- Device fingerprint clustering

**Alert Triggers:**
- Multiple signups from same phone
- High verification failure rates
- Rapid signup patterns
- Known fraud indicators
- Manual review requirements

### 5.2 Trial Conversion Tracking

**Key Metrics:**
- Trial signup rate from landing page
- Phone verification completion rate
- Email verification completion rate
- Onboarding completion rate
- Trial-to-paid conversion rate
- Trial engagement scores

**Optimization Points:**
- Landing page conversion
- Verification flow friction
- Onboarding drop-off points
- Trial usage patterns
- Upgrade prompt effectiveness

## 6. Compliance & Legal Considerations

### 6.1 Data Protection

**GDPR Compliance:**
- Explicit consent for phone number storage
- Right to data deletion
- Data processing justification
- Privacy policy updates

**Phone Number Handling:**
- Secure storage encryption
- Limited retention periods
- Access logging
- Third-party sharing restrictions

### 6.2 Terms of Service Updates

**Trial Terms:**
- Clear trial duration limits
- Feature access definitions
- Data retention policies
- Account suspension procedures
- Upgrade requirement notifications

**Fraud Prevention:**
- Phone verification requirements
- Account limitation policies
- Suspension and termination rights
- Appeal processes

## 7. Implementation Priority & Timeline

### Phase 1: Core Infrastructure (Week 1)
1. Database schema updates
2. Phone verification service integration
3. Basic registration flow
4. Trial management system

### Phase 2: User Experience (Week 2)
1. Landing page development
2. Registration and verification UI
3. Onboarding wizard implementation
4. Trial status integration

### Phase 3: Security Enhancement (Week 3)
1. Fraud prevention system
2. Device fingerprinting
3. Monitoring and alerting
4. Security testing

### Phase 4: Optimization (Week 4)
1. Conversion rate optimization
2. Performance improvements
3. Analytics implementation
4. Legal compliance review

## 8. Success Metrics

### 8.1 Security Effectiveness
- **Target:** <1% fraudulent signups
- **Measure:** Phone verification blocking rate
- **Monitor:** Repeat signup attempts per phone

### 8.2 User Experience
- **Target:** >90% verification completion rate
- **Measure:** Drop-off at each onboarding step
- **Monitor:** Time to complete full signup

### 8.3 Business Impact
- **Target:** >15% trial-to-paid conversion
- **Measure:** Monthly recurring revenue growth
- **Monitor:** Customer acquisition cost vs lifetime value

This comprehensive specification provides the foundation for transforming MusoBuddy into a professional SaaS application with industry-standard security and user experience.