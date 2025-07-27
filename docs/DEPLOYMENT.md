# Deployment Guide

This document outlines the deployment process for Range Trainer.

## Environment Setup

### Development

```bash
# Clone and setup
git clone https://github.com/your-username/range-trainer.git
cd range-trainer
pnpm install

# Environment configuration
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
pnpm dev
```

### Production

Range Trainer is optimized for deployment on Vercel with Supabase as the backend.

## Vercel Deployment

### 1. Automatic Deployment (Recommended)

1. **Connect Repository**
   - Import your GitHub repository to Vercel
   - Vercel will automatically detect Next.js configuration

2. **Environment Variables**
   ```bash
   # Add these in Vercel dashboard
   NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   ```

3. **Deploy**
   - Push to main branch triggers automatic deployment
   - Preview deployments for pull requests

### 2. Manual Deployment

```bash
# Build the application
pnpm build

# Deploy using Vercel CLI
npx vercel --prod
```

## Supabase Setup

### 1. Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project
3. Choose region closest to your users
4. Note down project URL and API keys

### 2. Database Setup

```sql
-- Run the following migrations in order:
-- 1. Basic schema
\i src/lib/database/schema.sql

-- 2. Anki system
\i src/lib/database/migration-anki.sql

-- 3. Scenario system
\i src/lib/database/scenarios.sql

-- 4. Session tracking
\i src/lib/database/migration-sessions.sql

-- 5. Tag system
\i src/lib/database/migration-anki-tags.sql

-- 6. Additional features
\i src/lib/database/migration-pomodoro.sql
\i src/lib/database/migration-add-editor-data.sql
```

### 3. Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE anki_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Example policies
CREATE POLICY "Users can access their own decks"
ON anki_decks FOR ALL
TO authenticated
USING (user_id = auth.uid());
```

### 4. Authentication Configuration

1. **Email Settings** (optional)
   - Configure SMTP for email confirmations
   - Set up email templates

2. **OAuth Providers** (optional)
   - Google OAuth
   - GitHub OAuth
   - Discord OAuth

## Environment Variables

### Required Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application (Required)
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Optional Variables

```env
# Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
NEXT_PUBLIC_GTM_ID=your_gtm_id

# Error Tracking
SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project

# Email (if using custom SMTP)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run linting
        run: pnpm lint
      
      - name: Run type checking
        run: pnpm type-check
      
      - name: Run tests
        run: pnpm test
      
      - name: Build application
        run: pnpm build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Quality Gates

```yaml
# Additional quality checks
- name: Bundle Analysis
  run: pnpm analyze

- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    configPath: './lighthouse.config.js'

- name: Security Audit
  run: pnpm audit --audit-level moderate
```

## Performance Optimization

### Build Optimization

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  },
  
  // Compression
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400
  },
  
  // Bundle analyzer (development only)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(new BundleAnalyzerPlugin())
      return config
    }
  })
}

module.exports = nextConfig
```

### CDN Configuration

```javascript
// Vercel automatically provides CDN
// Additional CDN setup for static assets
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    }
  ]
})

module.exports = withPWA(nextConfig)
```

## Monitoring and Observability

### Error Tracking

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/your-domain\.com/]
    })
  ]
})
```

### Analytics

```typescript
// lib/analytics.ts
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  )
}
```

### Health Checks

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Check database connection
    const { error } = await supabase.from('anki_decks').select('count').limit(1)
    if (error) throw error
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        api: 'up'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    )
  }
}
```

## Security Considerations

### Content Security Policy

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.app",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' *.supabase.co wss://*.supabase.co"
    ].join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ]
  }
}
```

### Environment Security

```bash
# Never commit these to version control
.env.local
.env.production

# Use Vercel's environment variables UI
# Enable "Sensitive" flag for secrets
```

## Backup and Recovery

### Database Backups

```sql
-- Automated backups via Supabase
-- Manual backup commands
pg_dump --host=db.your-project.supabase.co \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --format=custom \
        --file=backup_$(date +%Y%m%d_%H%M%S).sql
```

### Code Backups

- Git repository serves as primary backup
- Multiple remotes recommended (GitHub + GitLab)
- Regular release tags for stable versions

## Scaling Considerations

### Database Scaling

1. **Connection Pooling**
   - Supabase provides built-in pooling
   - Configure pool size based on usage

2. **Read Replicas**
   - Available on Pro+ plans
   - Route read queries to replicas

3. **Caching Layers**
   - Redis for session data
   - CDN for static assets

### Application Scaling

1. **Vercel Scaling**
   - Automatic scaling based on traffic
   - Edge functions for global performance

2. **Database Optimization**
   - Query optimization
   - Index management
   - Materialized views for complex queries

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   pnpm build
   
   # Check for TypeScript errors
   pnpm type-check
   ```

2. **Database Connection Issues**
   ```typescript
   // Check connection
   const { data, error } = await supabase
     .from('anki_decks')
     .select('count')
     .limit(1)
   
   if (error) {
     console.error('Database connection failed:', error)
   }
   ```

3. **Authentication Issues**
   ```typescript
   // Verify auth state
   const { data: { session } } = await supabase.auth.getSession()
   console.log('Current session:', session)
   ```

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development pnpm dev

# Database query logging
NEXT_PUBLIC_SUPABASE_DEBUG=true pnpm dev
```

### Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- Project Discord/GitHub Issues for community support