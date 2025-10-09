# MusoBuddy AI Services Registry

This directory contains the official registry of all AI API usage across the MusoBuddy platform.

## 🎯 Purpose

The AI Registry helps us:
- Track all AI models and providers in use
- Monitor costs and optimize spending
- Identify inconsistencies across services
- Plan model upgrades and migrations
- Ensure compliance with usage policies

## 📁 Files

- `registry.yaml` - The complete registry of all AI services
- `README.md` - This documentation

## 🔄 Updating the Registry

**⚠️ IMPORTANT**: Always update the registry when making AI-related changes!

### When to Update

Update the registry whenever you:
- Add a new AI service or endpoint
- Change AI models (e.g., GPT-4 → GPT-4o mini)
- Modify API parameters (temperature, max_tokens, etc.)
- Switch providers (OpenAI → Anthropic)
- Add/remove environment variables
- Update cost estimates

### How to Update

1. **Edit registry.yaml**:
   ```yaml
   # Update the relevant service entry
   services:
     your_service:
       model: "new-model-name"  # Update model
       last_reviewed: "2025-09-10"  # Update date
   ```

2. **Add changelog entry**:
   ```yaml
   changelog:
     - date: "2025-09-10"
       changes:
         - "Updated email parsing model from X to Y"
       author: "your-name"
   ```

3. **Update cost estimates** if the change affects pricing

## 📊 Cost Optimization Guidelines

### Model Selection Strategy

**Use GPT-5 nano for:**
- Email/widget parsing (input-heavy, short output)
- Data extraction and classification
- Simple summarization tasks

**Use GPT-4o mini for:**
- Email response generation (balanced cost/quality)
- Medium complexity text generation
- JSON API responses

**Use Claude Sonnet/GPT-4o for:**
- Complex contract generation
- High-quality long-form content
- Critical business communications

### Cost Monitoring

Current cost targets:
- Email parsing: < $0.001 per call
- AI responses: < $0.001 per call
- PDF optimization: < $0.005 per call

## 🔍 Registry Schema

### Service Entry Schema

```yaml
service_name:
  id: "unique-identifier"
  feature: "Human readable description"
  file_path: "relative/path/to/file.ts"
  runtime: "server|client"
  provider: "openai|anthropic|google"
  model: "exact-model-name"
  endpoint: "api-endpoint-path"
  parameters:
    max_tokens: number
    temperature: number
    response_format: "json_object|text"
  triggers:
    - "What triggers this service"
  volume_estimate: "calls per day estimate"
  env_keys: ["REQUIRED_ENV_VARS"]
  cost_profile:
    input_cost_per_1M: "$X.XX"
    output_cost_per_1M: "$X.XX"
    typical_input_tokens: number
    typical_output_tokens: number
    est_cost_per_call: "$X.XXXX"
  owner: "team-responsible"
  last_reviewed: "YYYY-MM-DD"
  status: "active|deprecated|experimental"
  notes: "Any important notes"
```

## 🚨 Current Issues & Opportunities

### High Priority
- **Event matching using expensive GPT-4o** - Switch to GPT-4o mini
- **PDF optimization using two different models** - Consolidate

### Medium Priority
- **Missing Anthropic pricing data** - Need to research and update
- **Email parsing could use nano** - Test quality vs cost savings

## 🔧 Maintenance

### Monthly Review
- [ ] Verify all models are still available
- [ ] Update cost estimates with actual usage
- [ ] Review optimization opportunities
- [ ] Check for new model releases

### After Each Migration
- [ ] Update registry.yaml
- [ ] Add changelog entry
- [ ] Test affected functionality
- [ ] Monitor costs for unexpected changes

## 📞 Support

For questions about the AI registry:
- Check existing entries for examples
- Review the optimization guidelines
- Update the registry with any changes
- Document lessons learned in notes

---

**Remember**: This registry is our single source of truth for AI usage. Keep it updated! 🎯