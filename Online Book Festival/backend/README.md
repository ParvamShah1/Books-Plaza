# Books Plaza Backend Deployment Guide

## Railways.app Deployment Instructions

1. Create a Railways.app account at https://railways.app

2. Install Railways CLI:
```bash
npm install -g @railway/cli
```

3. Login to Railways:
```bash
railway login
```

4. Initialize Railways project:
```bash
railway init
```

5. Create a PostgreSQL database in Railways dashboard

6. Set up environment variables in Railways dashboard:
   - Copy variables from .env.example
   - Update DATABASE_URL (provided by Railways)
   - Set NODE_ENV to "production"
   - Update other sensitive credentials

7. Deploy the application:
```bash
railway up
```

## Local Development

1. Copy .env.example to .env
2. Update environment variables
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`

## Environment Variables

Refer to .env.example for required environment variables.

## Database Configuration

The application supports both local PostgreSQL and Railways.app PostgreSQL connections.

## Important Notes

- Ensure all environment variables are properly set
- Database migrations will run automatically
- SSL is enabled for Railways.app PostgreSQL connection