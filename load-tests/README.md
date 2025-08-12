# MusoBuddy Load Testing with K6

This directory contains K6 load testing scripts for MusoBuddy application.

## Test Types

### 1. Auth Flow Test (`auth-flow-test.js`)
- Tests complete user authentication flow
- Simulates realistic user journey through main features
- **Usage**: `k6 run load-tests/auth-flow-test.js`
- **Load**: 10-20 concurrent users
- **Duration**: ~16 minutes

### 2. Stress Test (`stress-test.js`)
- High-load testing to find breaking points
- Tests system behavior under extreme load
- **Usage**: `k6 run load-tests/stress-test.js`
- **Load**: Up to 200 concurrent users
- **Duration**: ~16 minutes

### 3. Spike Test (`spike-test.js`)
- Tests sudden traffic spikes
- Simulates viral social media mentions or news coverage
- **Usage**: `k6 run load-tests/spike-test.js`
- **Load**: Spike to 500 users in 30 seconds
- **Duration**: ~5 minutes

### 4. Booking Workflow Test (`booking-workflow-test.js`)
- Tests specific booking creation workflow
- Focuses on core business functionality
- **Usage**: `k6 run load-tests/booking-workflow-test.js`
- **Load**: 5 concurrent users
- **Duration**: ~5 minutes

## Prerequisites

1. **Valid Test User**: Update `TEST_USER` credentials in scripts
2. **Environment**: Update `BASE_URL` if testing different environment
3. **Authentication**: Some tests require valid login credentials

## Running Tests

### Basic Commands

```bash
# Run a simple test
k6 run load-tests/auth-flow-test.js

# Run with custom duration/users
k6 run --duration 30s --vus 10 load-tests/stress-test.js

# Output results to JSON
k6 run --out json=results.json load-tests/auth-flow-test.js

# Run with specific stages
k6 run --stage 1m:10,5m:20,1m:0 load-tests/stress-test.js
```

### Advanced Options

```bash
# Run with cloud output (requires K6 Cloud account)
k6 run --out cloud load-tests/auth-flow-test.js

# Run with InfluxDB output
k6 run --out influxdb=http://localhost:8086/mydb load-tests/auth-flow-test.js

# Set custom thresholds
k6 run --threshold http_req_duration=p(95)<1000 load-tests/auth-flow-test.js
```

## Key Metrics to Monitor

- **http_req_duration**: Response time percentiles
- **http_req_failed**: Failed request rate
- **http_reqs**: Total requests per second
- **vus**: Virtual users (concurrent users)
- **errors**: Custom error rate

## Interpreting Results

### Good Performance Indicators
- P95 response time < 2 seconds
- Error rate < 5%
- No failed requests during normal load

### Warning Signs
- P95 response time > 5 seconds
- Error rate > 10%
- Memory/CPU usage spiking
- Database connection errors

### Failure Indicators
- Frequent 500 errors
- Timeouts
- Complete system unresponsiveness

## Test Scenarios by Business Need

### Before Production Launch
```bash
k6 run load-tests/auth-flow-test.js
k6 run load-tests/booking-workflow-test.js
```

### After Marketing Campaign
```bash
k6 run load-tests/spike-test.js
```

### Regular Performance Monitoring
```bash
k6 run load-tests/stress-test.js
```

## Customization

Update these variables in each script:
- `BASE_URL`: Your application URL
- `TEST_USER`: Valid test credentials
- `stages`: Load patterns
- `thresholds`: Performance requirements

## Integration with CI/CD

Add to GitHub Actions or similar:

```yaml
- name: Run K6 Load Tests
  run: |
    k6 run --quiet --no-color --out json=results.json load-tests/auth-flow-test.js
    # Parse results and fail if thresholds not met
```

## Security Notes

- Never commit real user credentials
- Use dedicated test accounts
- Run against staging/test environments first
- Monitor production resources during tests