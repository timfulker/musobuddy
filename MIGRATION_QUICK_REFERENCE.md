# 🚀 EMAIL MIGRATION - QUICK REFERENCE CARD

## 🎛️ ESSENTIAL COMMANDS

### Check Status
```bash
curl https://musobuddy.replit.app/api/migration/status -H "x-admin-key: musobuddy-admin-2024"
```

### Migration Steps
```bash
# 1. Start (0% - Safe monitoring)
curl -X POST https://musobuddy.replit.app/api/migration/preset/start -H "x-admin-key: musobuddy-admin-2024"

# 2. Test (10% - Light testing)
curl -X POST https://musobuddy.replit.app/api/migration/preset/test -H "x-admin-key: musobuddy-admin-2024"

# 3. Half (50% - Major testing)
curl -X POST https://musobuddy.replit.app/api/migration/preset/half -H "x-admin-key: musobuddy-admin-2024"

# 4. Complete (100% - Full migration)
curl -X POST https://musobuddy.replit.app/api/migration/preset/complete -H "x-admin-key: musobuddy-admin-2024"
```

### Emergency Rollback
```bash
# API Rollback (to 0%)
curl -X POST https://musobuddy.replit.app/api/migration/rollback -H "x-admin-key: musobuddy-admin-2024"

# Complete Git Rollback
git checkout HEAD~1
```

### Monitor Logs
```bash
tail -f logs/app.log | grep "MIGRATION_LOG"
```

## 📊 WHAT TO WATCH FOR

### Good Signs ✅
- Both systems show similar success rates (90%+)
- Processing times are comparable
- No increase in error messages
- New bookings being created normally

### Warning Signs ⚠️
- Error rate difference >10%
- Processing time >50% slower
- Missing emails or bookings
- Crashes or memory issues

## 🚨 IF THINGS GO WRONG

1. **Immediate**: Use API rollback command above
2. **Severe**: Use git rollback command above
3. **Verify**: Check status shows 0% migration
4. **Test**: Send test email to confirm system works

## 📋 DEPLOYMENT CHECKLIST

- [ ] Deploy code to production
- [ ] Verify `/api/migration/health` responds
- [ ] Start at 0% migration
- [ ] Monitor for identical behavior
- [ ] Gradually increase percentage
- [ ] Monitor at each step

**Full details in: EMAIL_MIGRATION_PROGRESS_TRACKER.md**