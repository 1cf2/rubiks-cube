# 9. Database Schema

## PostgreSQL Schema Design

```sql
-- User sessions and progress tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_cube_state JSONB,
    preferences JSONB
);

-- Solve completion records
CREATE TABLE solve_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(id),
    completion_time INTEGER NOT NULL, -- milliseconds
    move_count INTEGER NOT NULL,
    difficulty_level VARCHAR(20) NOT NULL,
    scramble_seed VARCHAR(255),
    solved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cube_state_initial JSONB,
    cube_state_final JSONB
);

-- Performance analytics
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(id),
    metric_type VARCHAR(50) NOT NULL, -- 'frame_rate', 'load_time', 'memory_usage'
    value DECIMAL NOT NULL,
    device_info JSONB,
    browser_info JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Global leaderboards
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(id),
    solve_record_id UUID REFERENCES solve_records(id),
    rank INTEGER,
    difficulty_level VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_solve_records_time ON solve_records(completion_time);
CREATE INDEX idx_solve_records_difficulty ON solve_records(difficulty_level);
CREATE INDEX idx_leaderboard_rank ON leaderboard_entries(difficulty_level, rank);
CREATE INDEX idx_performance_metrics_type ON performance_metrics(metric_type, recorded_at);
```

## Redis Caching Strategy

```typescript
// Cache patterns for performance optimization
interface CacheStrategy {
  // Session data caching (15 minute TTL)
  userSessions: `session:${sessionId}`;
  
  // Leaderboard caching (5 minute TTL)
  globalLeaderboard: `leaderboard:${difficulty}:${limit}`;
  
  // Cube state validation cache (1 hour TTL)
  cubeValidation: `validation:${stateHash}`;
  
  // Performance metrics aggregation (30 minute TTL)
  performanceStats: `perf:${timeWindow}:${deviceType}`;
}
```

---
