# Monitoring & Alerting Setup for Auth System

This guide explains how to set up comprehensive monitoring and alerting for the auth-system deployed on Cloud Run.

## Quick Setup

### 1. Enable Required APIs
```bash
gcloud services enable monitoring.googleapis.com \
  logging.googleapis.com \
  cloudtrace.googleapis.com
```

### 2. Create Email Notification Channel
```bash
# Update YOUR-EMAIL@example.com with your actual email
gcloud alpha monitoring channels create \
  --display-name="Auth System Alerts" \
  --type=email \
  --channel-labels=email_address=YOUR-EMAIL@example.com
```

### 3. View Real-time Logs
```bash
# Stream live logs from your auth service
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=webroot-auth-api" --region=us-central1

# View last 100 log entries
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=webroot-auth-api" --limit=100

# Filter for errors only
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=webroot-auth-api AND severity>=ERROR" --limit=50
```

### 4. Check Service Metrics

**Via Web Console:**
1. Go to https://console.cloud.google.com/run
2. Click on `webroot-auth-api` service
3. Navigate to **Metrics** tab
4. View graphs for:
   - Request count
   - Request latency
   - Container instance count
   - CPU/Memory utilization

**Via CLI:**
```bash
# Get service metrics summary
gcloud run services describe webroot-auth-api \
  --region=us-central1 \
  --format="table(status.url,status.traffic,status.conditions)"
```

### 5. Monitor Authentication Success/Failure Rates

**View successful logins:**
```bash
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=webroot-auth-api \
  AND textPayload=~\"authentication.*success\"" \
  --limit=20 \
  --format=json
```

**View failed logins:**
```bash
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=webroot-auth-api \
  AND (textPayload=~\"authentication.*failed\" OR httpRequest.status>=400)" \
  --limit=20 \
  --format=json
```

### 6. Monitor CORS Blocking

**View blocked CORS requests:**
```bash
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=webroot-auth-api \
  AND textPayload=~\"Blocked CORS request\"" \
  --limit=20
```

### 7. Monitor Rate Limiting

**View rate-limited requests (HTTP 429):**
```bash
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=webroot-auth-api \
  AND httpRequest.status=429" \
  --limit=20 \
  --format=json
```

## Advanced Monitoring

### Create Custom Dashboard

1. Go to https://console.cloud.google.com/monitoring/dashboards
2. Click **Create Dashboard**
3. Add these charts:

**Chart 1: Request Rate**
- Resource: Cloud Run Revision
- Metric: Request count
- Group by: response_code_class
- Aggregation: Rate

**Chart 2: Response Latency**
- Resource: Cloud Run Revision
- Metric: Request latencies
- Percentile: 50th, 95th, 99th

**Chart 3: Error Rate**
- Resource: Cloud Run Revision
- Metric: Request count
- Filter: response_code >= 400

**Chart 4: Active Connections**
- Resource: Cloud Run Revision
- Metric: Container instance count

### Set Up Log-Based Metrics

**Metric 1: Failed Login Attempts**
```bash
gcloud logging metrics create auth_failed_logins \
  --description="Failed authentication attempts" \
  --log-filter='resource.type="cloud_run_revision"
    AND resource.labels.service_name="webroot-auth-api"
    AND (textPayload=~"authentication.*failed" OR httpRequest.status>=400)'
```

**Metric 2: Successful Logins**
```bash
gcloud logging metrics create auth_successful_logins \
  --description="Successful authentication attempts" \
  --log-filter='resource.type="cloud_run_revision"
    AND resource.labels.service_name="webroot-auth-api"
    AND textPayload=~"authentication.*success"'
```

**Metric 3: Rate Limit Hits**
```bash
gcloud logging metrics create auth_rate_limit_hits \
  --description="Requests blocked by rate limiting" \
  --log-filter='resource.type="cloud_run_revision"
    AND resource.labels.service_name="webroot-auth-api"
    AND httpRequest.status=429'
```

### Create Alert Policies

**Alert 1: High Failed Login Rate**
```bash
# This will send an alert if >50 failed logins in 5 minutes
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Auth - High Failed Login Rate" \
  --condition-display-name="Failed logins > 50 in 5 min" \
  --condition-threshold-value=50 \
  --condition-threshold-duration=300s \
  --condition-filter='resource.type="cloud_run_revision"
    AND resource.labels.service_name="webroot-auth-api"
    AND metric.type="logging.googleapis.com/user/auth_failed_logins"'
```

**Alert 2: Service Error Rate**
```bash
# Alert if error rate exceeds 10%
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Auth - High Error Rate" \
  --condition-display-name="Error rate > 10%" \
  --condition-threshold-value=0.10 \
  --condition-filter='resource.type="cloud_run_revision"
    AND resource.labels.service_name="webroot-auth-api"
    AND metric.type="run.googleapis.com/request_count"'
```

## Security Monitoring Checklist

### Daily Checks
- [ ] Review error logs for unusual patterns
- [ ] Check for spikes in failed authentication attempts
- [ ] Verify no unexpected CORS blocking
- [ ] Monitor request rate for DDoS indicators

### Weekly Checks
- [ ] Review authentication success/failure rates
- [ ] Check rate limiting effectiveness
- [ ] Analyze traffic patterns for anomalies
- [ ] Review Cloud Run resource usage

### Monthly Checks
- [ ] Audit OAuth provider configurations
- [ ] Review and rotate secrets if needed
- [ ] Check for security updates in dependencies
- [ ] Update monitoring thresholds based on traffic patterns

## Key Metrics to Monitor

| Metric | Normal Range | Alert Threshold | Action |
|--------|--------------|-----------------|--------|
| Request rate | < 100/min | > 1000/min | Check for DDoS or viral growth |
| Error rate | < 1% | > 10% | Investigate errors, consider rollback |
| Response latency (P95) | < 500ms | > 2000ms | Scale up or optimize |
| Failed logins | < 10/hour | > 50 in 5min | Possible brute force attack |
| Rate limit hits | < 5/hour | > 100/hour | Investigate source IPs |

## Useful Log Queries

### Authentication Events
```bash
# All auth events (success and failure)
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=webroot-auth-api \
  AND textPayload=~\"authentication\"" \
  --limit=50 \
  --format=json
```

### Security Events
```bash
# CORS blocks, rate limits, and auth failures
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=webroot-auth-api \
  AND (
    textPayload=~\"Blocked CORS\" OR
    httpRequest.status=429 OR
    textPayload=~\"authentication.*failed\"
  )" \
  --limit=50
```

### Performance Issues
```bash
# Slow requests (>1 second)
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=webroot-auth-api \
  AND httpRequest.latency>1s" \
  --limit=20 \
  --format=json
```

### Database Issues
```bash
# Database connection errors
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=webroot-auth-api \
  AND (
    textPayload=~\"database.*error\" OR
    textPayload=~\"PostgreSQL\" OR
    textPayload=~\"ECONNREFUSED\"
  )" \
  --limit=20
```

## Automated Monitoring Script

Save this as `monitor-auth.sh`:

```bash
#!/bin/bash
# Quick health check script for auth system

SERVICE_NAME="webroot-auth-api"
REGION="us-central1"

echo "=== Auth System Health Check ==="
echo ""

# 1. Service status
echo "📊 Service Status:"
gcloud run services describe $SERVICE_NAME --region=$REGION \
  --format="value(status.conditions[0].status,status.conditions[0].message)"
echo ""

# 2. Recent errors (last 5 minutes)
echo "🔴 Recent Errors (last 5 min):"
ERROR_COUNT=$(gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=$SERVICE_NAME \
  AND severity>=ERROR \
  AND timestamp>=\"$(date -u -d '5 minutes ago' --iso-8601=seconds)\"" \
  --limit=1000 --format="value(timestamp)" | wc -l)
echo "   Error count: $ERROR_COUNT"
echo ""

# 3. Failed auth attempts
echo "🔐 Failed Authentication (last 15 min):"
FAILED_AUTH=$(gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=$SERVICE_NAME \
  AND textPayload=~\"authentication.*failed\" \
  AND timestamp>=\"$(date -u -d '15 minutes ago' --iso-8601=seconds)\"" \
  --limit=1000 --format="value(timestamp)" | wc -l)
echo "   Failed attempts: $FAILED_AUTH"
echo ""

# 4. Rate limiting
echo "⏱️  Rate Limited Requests (last hour):"
RATE_LIMITED=$(gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=$SERVICE_NAME \
  AND httpRequest.status=429 \
  AND timestamp>=\"$(date -u -d '1 hour ago' --iso-8601=seconds)\"" \
  --limit=1000 --format="value(timestamp)" | wc -l)
echo "   Blocked requests: $RATE_LIMITED"
echo ""

# 5. Service URL
echo "🌐 Service URL:"
gcloud run services describe $SERVICE_NAME --region=$REGION \
  --format="value(status.url)"
echo ""

echo "=== Health Check Complete ==="
```

Make executable and run:
```bash
chmod +x monitor-auth.sh
./monitor-auth.sh
```

## Troubleshooting

### High CPU/Memory Usage
```bash
# Check container resource limits
gcloud run services describe webroot-auth-api --region=us-central1 \
  --format="value(spec.template.spec.containers[0].resources)"

# Scale up if needed
gcloud run services update webroot-auth-api \
  --region=us-central1 \
  --memory=1Gi \
  --cpu=2
```

### Slow Response Times
1. Check database connection pool settings
2. Review query performance
3. Enable Cloud SQL Insights for database monitoring
4. Consider increasing container concurrency

### Too Many Rate Limit Hits
1. Identify source IPs from logs
2. Check if legitimate traffic spike
3. Adjust rate limits in `src/index.js` if needed
4. Consider implementing IP-based blocking

## Resources

- **Cloud Run Monitoring Docs**: https://cloud.google.com/run/docs/monitoring
- **Cloud Logging Docs**: https://cloud.google.com/logging/docs
- **Alert Policy Reference**: https://cloud.google.com/monitoring/alerts
- **Log Query Language**: https://cloud.google.com/logging/docs/view/logging-query-language
