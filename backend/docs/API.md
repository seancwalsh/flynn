# Flynn AAC API Reference

## Base URL
```
/api/v1
```

## Authentication
All endpoints require a valid Clerk JWT token:
```
Authorization: Bearer <clerk-jwt-token>
```

## Authorization
Users can only access resources within their family. The API automatically scopes queries.

---

## Families

### List Families
```
GET /families
```
Returns all families the user has access to.

### Create Family
```
POST /families
Content-Type: application/json

{
  "name": "Smith Family"
}
```

### Get Family
```
GET /families/:id
```

---

## Children

### List Children
```
GET /children
GET /children?familyId=<uuid>
```

### Create Child
```
POST /children
Content-Type: application/json

{
  "familyId": "uuid",
  "name": "Flynn",
  "birthDate": "2020-04-26"
}
```

### Get Child
```
GET /children/:id
```

### Update Child
```
PUT /children/:id
Content-Type: application/json

{
  "name": "Flynn Smith",
  "birthDate": "2020-04-26"
}
```

### Delete Child
```
DELETE /children/:id
```

---

## Usage Logs

### List Usage Logs
```
GET /usage-logs?childId=<uuid>
GET /usage-logs?childId=<uuid>&startDate=2024-01-01&endDate=2024-01-31
GET /usage-logs?childId=<uuid>&limit=100
```

### Create Usage Log
```
POST /usage-logs
Content-Type: application/json

{
  "childId": "uuid",
  "symbolId": "arasaac:12345",
  "timestamp": "2024-01-15T10:30:00Z",
  "sessionId": "uuid"  // optional
}
```

### Batch Create (iOS Sync)
```
POST /usage-logs/batch
Content-Type: application/json

{
  "logs": [
    { "childId": "uuid", "symbolId": "arasaac:123", "timestamp": "..." },
    { "childId": "uuid", "symbolId": "arasaac:456", "timestamp": "..." }
  ]
}
```

Response:
```json
{ "created": 10, "failed": 0 }
```

---

## Insights

### List Insights
```
GET /insights
GET /insights?childId=<uuid>
GET /insights?type=daily_digest
GET /insights?unreadOnly=true
GET /insights?limit=50
```

Response:
```json
{
  "insights": [...],
  "total": 42
}
```

### Mark as Read
```
POST /insights/:id/read
```

### Dismiss
```
POST /insights/:id/dismiss
```

### Bulk Mark as Read
```
POST /insights/bulk-read
Content-Type: application/json

{
  "insightIds": ["uuid1", "uuid2"]
}
```

### Get Unread Count
```
GET /insights/unread-count
GET /insights/unread-count?childId=<uuid>
```

Response:
```json
{ "unreadCount": 5 }
```

---

## Conversations (AI Chat)

### List Conversations
```
GET /conversations
GET /conversations?childId=<uuid>
```

### Create Conversation
```
POST /conversations
Content-Type: application/json

{
  "childId": "uuid",  // optional - context for AI
  "title": "Weekly Check-in"
}
```

### Get Conversation (with messages)
```
GET /conversations/:id
```

### Send Message
```
POST /conversations/:id/messages
Content-Type: application/json

{
  "content": "How is Flynn's vocabulary progressing this week?"
}
```

Response includes AI assistant's reply.

### Delete Conversation
```
DELETE /conversations/:id
```

---

## Notifications

### Get Preferences
```
GET /notifications/preferences
```

Response:
```json
{
  "enabled": true,
  "typeSettings": {
    "daily_digest": true,
    "regression_alert": true,
    "milestone": true
  },
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00",
  "timezone": "America/New_York",
  "maxPerHour": 5,
  "maxPerDay": 20
}
```

### Update Preferences
```
PUT /notifications/preferences
Content-Type: application/json

{
  "enabled": true,
  "quietHoursEnabled": false
}
```

### Register Device
```
POST /notifications/devices
Content-Type: application/json

{
  "deviceToken": "apns-token-here",
  "platform": "ios"
}
```

---

## Caregivers

### List Caregivers
```
GET /caregivers
GET /caregivers?familyId=<uuid>
```

### Create Caregiver
```
POST /caregivers
Content-Type: application/json

{
  "familyId": "uuid",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "parent"
}
```
Roles: `parent`, `guardian`, `grandparent`, `nanny`, `other`

### Get Caregiver
```
GET /caregivers/:id
```

### Update Caregiver
```
PUT /caregivers/:id
Content-Type: application/json

{
  "name": "Jane Doe",
  "role": "guardian"
}
```

### Delete Caregiver
```
DELETE /caregivers/:id
```

---

## Therapists

### List Therapists
```
GET /therapists
```
Returns therapists with access to children in your family.

### Create Therapist
```
POST /therapists
Content-Type: application/json

{
  "name": "Dr. Sarah Johnson",
  "email": "sarah@therapy.com"
}
```

### Grant Access to Child
```
POST /therapists/:id/clients
Content-Type: application/json

{
  "childId": "uuid"
}
```

### Revoke Access
```
DELETE /therapists/:id/clients
Content-Type: application/json

{
  "childId": "uuid"
}
```

---

## Error Responses

All errors return:
```json
{
  "error": "Error message",
  "details": "Additional context"  // optional
}
```

### Common Status Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (no access to resource)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limits
- 100 requests per minute per user
- 1000 requests per minute per IP

---

## Webhooks

### Clerk Auth Webhook
```
POST /auth/webhook
```
Handles Clerk user creation/update/deletion events.
Requires valid Svix signature.
