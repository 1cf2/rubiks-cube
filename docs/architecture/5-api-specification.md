# 5. API Specification

## REST API Endpoints

```typescript
// Statistics and Progress API
POST   /api/sessions                    // Create new session
GET    /api/sessions/:id               // Get session state
PUT    /api/sessions/:id               // Update session progress
DELETE /api/sessions/:id               // End session

POST   /api/statistics/solve           // Record solve completion
GET    /api/statistics/personal-bests  // Get user's best times
GET    /api/statistics/leaderboard     // Get global leaderboard

// Configuration and Preferences
GET    /api/preferences                // Get user preferences
PUT    /api/preferences                // Update preferences

// Cube Generation and Validation
POST   /api/cube/scramble              // Generate scrambled cube
POST   /api/cube/validate              // Validate cube state
GET    /api/cube/solve-hint            // Get solving hint

// Health and Monitoring
GET    /api/health                     // Health check
GET    /api/metrics                    // Performance metrics
```

## WebSocket Events (Future Enhancement)
```typescript
// Real-time features for multiplayer/collaborative solving
'session:start'     // Session initialization
'cube:move'         // Move synchronization
'session:complete'  // Solve completion
'hint:request'      // Real-time hint requests
```

---
