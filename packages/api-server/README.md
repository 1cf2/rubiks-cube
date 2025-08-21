# @rubiks-cube/api-server

Node.js backend server for the Rubik's Cube game. Provides API endpoints for user statistics, game sessions, and future multiplayer functionality.

## Overview

This package contains the backend infrastructure for the Rubik's Cube game. Currently in placeholder stage, it's designed to support future features like user accounts, statistics tracking, multiplayer games, and leaderboards.

## Features (Planned)

- **RESTful API** - Clean API design for game data
- **User Management** - Account creation and authentication
- **Statistics Tracking** - Solve times, move counts, progress tracking
- **Session Management** - Game session persistence
- **Multiplayer Support** - Real-time multiplayer cube races
- **Leaderboards** - Global and local ranking systems

## Current Status

⚠️ **This package is currently a placeholder structure**

The API server is prepared for future development but not yet implemented. The web application currently works entirely client-side without requiring a backend.

## Planned Architecture

### Technology Stack
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT tokens
- **Real-time**: Socket.io for multiplayer
- **Caching**: Redis for session storage

### API Structure

#### Authentication Endpoints
```typescript
// Planned authentication API
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/profile
```

#### Game Statistics
```typescript
// Planned statistics API
GET    /api/stats/user/:userId
POST   /api/stats/solve
GET    /api/stats/leaderboard
GET    /api/stats/personal-bests
```

#### Game Sessions
```typescript
// Planned session API
POST   /api/sessions/start
PUT    /api/sessions/:sessionId
GET    /api/sessions/:sessionId
DELETE /api/sessions/:sessionId
```

#### Multiplayer (Future)
```typescript
// Planned multiplayer API
POST   /api/multiplayer/rooms
GET    /api/multiplayer/rooms
JOIN   /api/multiplayer/rooms/:roomId
LEAVE  /api/multiplayer/rooms/:roomId
```

## Data Models (Planned)

### User Model
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  lastLogin: Date;
  statistics: UserStatistics;
}

interface UserStatistics {
  totalSolves: number;
  bestTime: number;
  averageTime: number;
  totalMoves: number;
  currentStreak: number;
  longestStreak: number;
}
```

### Game Session Model
```typescript
interface GameSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  scrambleSequence: Move[];
  solutionSequence: Move[];
  totalMoves: number;
  solveTime: number;
  isCompleted: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
```

### Multiplayer Room Model
```typescript
interface MultiplayerRoom {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  gameState: 'waiting' | 'starting' | 'active' | 'finished';
  scramble: Move[];
  startTime: Date;
  settings: RoomSettings;
}

interface Player {
  id: string;
  username: string;
  isReady: boolean;
  currentMoves: number;
  solveTime?: number;
  isFinished: boolean;
}
```

## Development Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Redis (for caching)

### Installation (Future)
```bash
cd packages/api-server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Environment Configuration (Planned)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rubiks_cube
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development

# External Services
CORS_ORIGIN=http://localhost:8082
```

## API Documentation (Planned)

### Authentication Flow
```typescript
// User registration
POST /api/auth/register
{
  "username": "cuber123",
  "email": "user@example.com", 
  "password": "securepassword"
}

// Response
{
  "success": true,
  "user": { "id": "...", "username": "cuber123" },
  "token": "jwt-token-here"
}
```

### Statistics Tracking
```typescript
// Submit solve result
POST /api/stats/solve
Authorization: Bearer jwt-token
{
  "sessionId": "session-uuid",
  "solveTime": 45.23,
  "moveCount": 67,
  "scramble": ["F", "R", "U", "R'", "U'", "F'"],
  "solution": ["F", "U", "R", "U'", "R'", "F'"]
}

// Get user statistics
GET /api/stats/user/me
Authorization: Bearer jwt-token

// Response
{
  "totalSolves": 234,
  "bestTime": 23.45,
  "averageTime": 45.67,
  "averageOf5": 43.21,
  "averageOf12": 44.89,
  "personalBests": [...],
  "recentSolves": [...]
}
```

### Leaderboards
```typescript
// Global leaderboard
GET /api/stats/leaderboard?timeframe=week&limit=50

// Response
{
  "leaderboard": [
    {
      "rank": 1,
      "username": "speedcuber",
      "bestTime": 8.24,
      "averageTime": 12.45,
      "solveCount": 1250
    }
  ],
  "userRank": 42,
  "totalUsers": 1500
}
```

## Database Schema (Planned)

### Tables Structure
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Game sessions table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  scramble_sequence TEXT[],
  solution_sequence TEXT[],
  total_moves INTEGER,
  solve_time DECIMAL(10,3),
  is_completed BOOLEAN DEFAULT false,
  difficulty VARCHAR(20)
);

-- User statistics table
CREATE TABLE user_statistics (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  total_solves INTEGER DEFAULT 0,
  best_time DECIMAL(10,3),
  average_time DECIMAL(10,3),
  total_moves BIGINT DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

### Indexes and Performance
```sql
-- Performance indexes
CREATE INDEX idx_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_sessions_solve_time ON game_sessions(solve_time);
CREATE INDEX idx_sessions_created_at ON game_sessions(start_time);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

## Testing (Planned)

### Test Structure
```bash
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # API endpoint testing
├── performance/    # Load testing and benchmarks
└── e2e/           # End-to-end testing
```

### Test Examples
```typescript
// API endpoint test
describe('POST /api/stats/solve', () => {
  it('should record solve statistics', async () => {
    const response = await request(app)
      .post('/api/stats/solve')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sessionId: 'test-session',
        solveTime: 45.23,
        moveCount: 67
      });
      
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

## Security Considerations

### Authentication Security
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Password Hashing**: bcrypt with salt rounds for secure password storage
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Configurable CORS for frontend integration

### Data Protection
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries with TypeORM
- **XSS Prevention**: Input sanitization and output encoding
- **HTTPS Enforcement**: TLS termination and secure headers

## Deployment (Planned)

### Production Setup
```bash
# Build for production
npm run build

# Run migrations
npm run migrate:prod

# Start production server
npm start
```

### Docker Configuration
```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables
```yaml
# Production environment
NODE_ENV: production
DATABASE_URL: ${DATABASE_URL}
REDIS_URL: ${REDIS_URL}
JWT_SECRET: ${JWT_SECRET}
PORT: 3001
```

## Integration with Frontend

### API Client (Planned)
```typescript
// Frontend API integration
import { ApiClient } from '@rubiks-cube/api-client';

const api = new ApiClient(process.env.REACT_APP_API_URL);

// Submit solve result
const result = await api.submitSolve({
  solveTime: 45.23,
  moveCount: 67,
  scramble: ['F', 'R', 'U'],
  solution: ['F\'', 'R\'', 'U\'']
});

// Get user statistics
const stats = await api.getUserStats();
```

### Real-time Integration
```typescript
// WebSocket connection for multiplayer
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL);

socket.on('room-update', (roomState) => {
  // Update multiplayer room state
});

socket.emit('player-move', { move: 'F', timestamp: Date.now() });
```

## Roadmap

### Phase 1: Basic API
- [ ] User authentication system
- [ ] Basic statistics tracking
- [ ] Session management
- [ ] RESTful API structure

### Phase 2: Enhanced Features
- [ ] Leaderboards and rankings
- [ ] Advanced statistics analysis
- [ ] User profiles and preferences
- [ ] API rate limiting and caching

### Phase 3: Multiplayer
- [ ] Real-time multiplayer rooms
- [ ] Tournament system
- [ ] Spectator mode
- [ ] Live competitions

### Phase 4: Advanced Features
- [ ] AI opponent modes
- [ ] Training programs
- [ ] Achievement system
- [ ] Social features

## Contributing

Currently, this package is in planning stage. Future contributions will include:

- API endpoint implementation
- Database schema design
- Authentication system
- Real-time multiplayer features
- Performance optimization

## License

ISC License - Part of the Rubik's Cube monorepo project.