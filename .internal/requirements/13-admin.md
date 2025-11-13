# Admin & Debug Features

**Part**: 12 of 14
**User Stories**: UC85-89
**Related**: [Commands](./08-commands.md), [Testing](./99-testing.md)

---

## Problem Statement

Administrators and developers need:
1. **System statistics** for monitoring
2. **Health checks** for uptime monitoring
3. **Debug logs** for troubleshooting
4. **Dangerous operations** (delete all, reset)

---

## User Stories

### UC85: Delete All Sessions

**As an** administrator
**I want to** delete all sessions at once
**So that** I can reset the system

**Acceptance Criteria**:
- Admin-only operation
- Confirmation required (dangerous)
- Cascades to all related data
- Broadcasts event to all clients

**Priority**: P3 (Low)

---

### UC86: System Statistics

**As an** administrator
**I want to** view system statistics
**So that** I can monitor usage

**Statistics**:
- Total sessions
- Total messages
- Active sessions
- Storage usage

**Acceptance Criteria**:
- Fast query (< 100ms)
- Real-time updates
- Export to JSON

**Priority**: P3 (Low)

---

### UC87: Health Check

**As a** monitoring system
**I want to** check application health
**So that** I can detect outages

**Health Metrics**:
- Server uptime
- Memory usage
- Database connectivity
- Event stream status

**Acceptance Criteria**:
- HTTP endpoint `/api/health`
- Returns 200 if healthy
- Returns 503 if degraded
- Includes metrics in response

**Priority**: P2 (Medium)

---

### UC88: API Inventory

**As a** security auditor
**I want to** view all API endpoints
**So that** I can assess attack surface

**Acceptance Criteria**:
- Lists all tRPC endpoints
- Shows procedure type (query/mutation/subscription)
- Shows input/output schemas
- OWASP API9 compliance (API Inventory)

**Priority**: P3 (Low)

---

### UC89: Debug Logs Viewer

**As a** developer
**I want to** view application logs
**So that** I can troubleshoot issues

**Acceptance Criteria**:
- Tail recent logs (last 100 lines)
- Filter by level (debug/info/warn/error)
- Search log content
- Auto-refresh option

**Priority**: P2 (Medium)

**Related**: See [UC62: `/logs` Command](./08-commands.md#uc62-logs---debug-logs)

---

## Admin Operations

### System Reset

```
DELETE /api/admin/reset
  → Confirm operation (requires password/token)
  → Delete all sessions
  → Delete all messages
  → Clear event log
  → Reset configuration (optional)
  → Return success/failure
```

### Statistics Endpoint

```
GET /api/admin/stats
  → Return JSON:
  {
    "sessions": {
      "total": 150,
      "active": 3
    },
    "messages": {
      "total": 2500,
      "averagePerSession": 16.7
    },
    "storage": {
      "databaseSize": "45.2 MB",
      "frozenFilesSize": "120.5 MB"
    },
    "uptime": "5 days, 3 hours, 22 minutes"
  }
```

### Health Check Endpoint

```
GET /api/health
  → Return 200 OK:
  {
    "status": "healthy",
    "uptime": 442920,
    "memory": {
      "used": "250 MB",
      "total": "4 GB"
    },
    "database": "connected",
    "eventStream": "active"
  }

  → Return 503 Service Unavailable:
  {
    "status": "degraded",
    "reason": "Database connection lost",
    "uptime": 442920
  }
```

---

## Debug Features

### Log Levels

- **DEBUG**: Verbose information for development
- **INFO**: General informational messages
- **WARN**: Warning messages (potential issues)
- **ERROR**: Error messages (actual failures)

### Log Format

```
[2025-01-15T10:30:45.123Z] [INFO] [SessionService] Session created: sess-abc123
[2025-01-15T10:30:46.456Z] [DEBUG] [TokenCalculator] Calculating tokens for session: sess-abc123
[2025-01-15T10:30:47.789Z] [ERROR] [ProviderService] API call failed: Rate limit exceeded
```

### Log Viewing

- **CLI**: `/logs` command (UC62)
- **Web**: Admin dashboard (future)
- **File**: `logs/app.log` (rotating, 7 days retention)

---

## Security Considerations

### Admin Authentication

- Admin endpoints require authentication (future)
- Rate limiting on admin endpoints
- Audit log for admin operations

### Sensitive Data

- API keys never logged
- User messages never logged (privacy)
- Only metadata logged (session IDs, counts, etc.)

---

## Monitoring Integration

### Prometheus Metrics (Future)

```
# Sessions
sessions_total{status="active"} 3
sessions_total{status="all"} 150

# Messages
messages_total 2500
messages_created_total 15 # Counter (rate)

# Streaming
streaming_active_count 1
streaming_latency_ms{quantile="0.95"} 120

# Token Calculation
token_calculation_duration_ms{quantile="0.95"} 85
```

### Log Aggregation (Future)

- Support for structured logging (JSON)
- Integration with ELK stack, Splunk, etc.
- Log shipping via syslog or HTTP

---

## Related Sections

- [Commands](./08-commands.md) - `/logs` command (UC62)
- [Testing](./99-testing.md) - Performance metrics (PR-1 to PR-4)
- [Advanced Features](./14-advanced.md) - Rate limiting (UC91)
