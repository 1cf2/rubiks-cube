# Environment Setup Guide

This guide explains how to configure environment variables for different deployment environments.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update the variables in `.env.local` for your local development setup.

## Environment Files

### `.env.example`
Template file showing all available environment variables with example values.

### `.env.development` 
Default configuration for development environment.

### `.env.staging`
Configuration for staging/testing environment.

### `.env.production`
Configuration for production environment.

### `.env.local` (gitignored)
Local overrides for development. This file is not committed to version control.

## Environment Variables

### Frontend Configuration
- `REACT_APP_API_BASE_URL`: API server base URL
- `REACT_APP_ENABLE_PERFORMANCE_MONITORING`: Enable performance monitoring
- `REACT_APP_CUBE_ANIMATION_DURATION`: Animation duration in milliseconds
- `REACT_APP_THREE_JS_DEBUG`: Enable Three.js debugging

### API Server Configuration
- `API_PORT`: Port for the API server
- `API_HOST`: Host binding for the API server
- `API_CORS_ORIGIN`: Allowed CORS origin

### Database Configuration
- `DATABASE_URL`: Full PostgreSQL connection string
- `POSTGRES_HOST`: PostgreSQL host
- `POSTGRES_PORT`: PostgreSQL port
- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password

### Redis Configuration
- `REDIS_URL`: Full Redis connection string
- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port
- `REDIS_PASSWORD`: Redis password (if required)

### Security
- `JWT_SECRET`: Secret key for JWT token signing
- `SESSION_SECRET`: Secret key for session management

### Feature Flags
- `ENABLE_MULTIPLAYER`: Enable multiplayer functionality
- `ENABLE_LEADERBOARD`: Enable leaderboard features
- `ENABLE_ANALYTICS`: Enable analytics tracking
- `ENABLE_SCRAMBLE_GENERATOR`: Enable scramble generation

### Performance Settings
- `CUBE_RENDER_QUALITY`: Rendering quality (low/medium/high)
- `MAX_CUBE_HISTORY`: Maximum number of moves to store in history
- `ANIMATION_FPS_TARGET`: Target FPS for animations

## Environment Precedence

Environment variables are loaded in the following order (later sources override earlier ones):

1. `.env.development` / `.env.staging` / `.env.production` (based on NODE_ENV)
2. `.env.local`
3. System environment variables

## Security Notes

- Never commit `.env.local` or any file containing real secrets
- Use environment-specific secrets in staging and production
- Rotate secrets regularly
- Use strong, randomly generated secrets for JWT and sessions

## Development Setup

For local development:

1. Set up PostgreSQL and Redis locally, or use Docker:
   ```bash
   docker run -d --name postgres -p 5432:5432 -e POSTGRES_DB=rubiks_cube_dev -e POSTGRES_USER=rubiks_cube_user -e POSTGRES_PASSWORD=password postgres:15
   docker run -d --name redis -p 6379:6379 redis:7
   ```

2. Update `.env.local` with your local database credentials

3. Start the development servers:
   ```bash
   npm run dev      # Frontend
   npm run dev:api  # Backend (in separate terminal)
   ```

## Production Deployment

For production deployment:

1. Set environment variables through your hosting platform
2. Ensure all required secrets are configured
3. Verify database and Redis connections
4. Test the deployment in staging first