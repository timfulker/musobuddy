# Jack GPT's Supabase Auth Trigger Setup Guide

## Context
During today's session, we discovered that the authentication system was missing database triggers to automatically create user records in `public.users` when users sign up via Supabase Auth.

Jack GPT offered a comprehensive step-by-step guide with:
- Copy-paste SQL for triggers
- Front-end code for proper signup flow
- RLS policy setup
- Troubleshooting guide
- Tailored trigger based on our specific `public.users` columns

## Our Current Schema
Based on investigation, our `public.users` table has these columns:

```sql
id, email, first_name, last_name, profile_image_url, is_admin,
is_assigned, is_beta_tester, trial_ends_at, has_paid,
onboarding_completed, account_notes, stripe_customer_id,
stripe_subscription_id, email_prefix, quick_add_token,
widget_url, widget_qr_code, phone_number, firebase_uid,
supabase_uid, is_active, last_login_at, last_login_ip,
login_attempts, locked_until, created_at, updated_at
```

## Current Status
- **Problem**: User existed in `auth.users` but not in `public.users`
- **Temporary Fix**: Manually created user record and linked via `supabase_uid`
- **Missing**: Proper database trigger for automatic user creation on signup

## Next Steps
1. Get Jack GPT's complete setup guide
2. Implement proper trigger function
3. Set up RLS policies correctly
4. Test end-to-end signup flow
5. Ensure future signups work automatically

## Jack GPT's Original Offer
> "I've put a step-by-step guide in the canvas with copy-paste SQL and front-end code so your signup creates an Auth user and immediately inserts a row into public.users, plus RLS and troubleshooting.
>
> If you want, tell me your exact public.users columns and I'll tailor the trigger to populate sensible defaults (e.g., business fields) from options.data at signup."

## Implementation Priority
- **High**: Get Jack GPT's guide and implement proper triggers
- **Medium**: Test with real signup flow
- **Low**: Add business logic defaults in trigger

---
*Created: September 18, 2025*
*Status: Pending implementation*