# Dual-Database Integration: Loyalty and Referrals on Supabase

## Overview

The application now supports **dual-database routing** for Loyalty and Referrals modules:
- **Loyalty & Referrals**: Can route to Supabase or local PostgreSQL (configurable via feature flags)
- **Users, Bookings, Payments, Inventory**: Always use local PostgreSQL

This approach allows gradual migration and feature-scoped database selection.

## Feature Flags

Control database routing via environment variables in `.env`:

```bash
# Master switch (default: false)
SUPABASE_ENABLED=false

# Module-specific switches (override master)
SUPABASE_LOYALTY_ENABLED=true
SUPABASE_REFERRALS_ENABLED=true
```

**Configuration scenarios:**

1. **All local PostgreSQL** (default):
   ```bash
   SUPABASE_ENABLED=false
   SUPABASE_LOYALTY_ENABLED=false
   SUPABASE_REFERRALS_ENABLED=false
   ```

2. **Loyalty & Referrals on Supabase** (recommended for new deployments):
   ```bash
   SUPABASE_ENABLED=true
   SUPABASE_LOYALTY_ENABLED=true
   SUPABASE_REFERRALS_ENABLED=true
   ```

3. **Only Loyalty on Supabase**:
   ```bash
   SUPABASE_LOYALTY_ENABLED=true
   SUPABASE_REFERRALS_ENABLED=false
   ```

## Using the Data Access Objects (DAOs)

### Loyalty DAO

```javascript
const loyaltyDao = require('./Database/daos/loyaltyDao')

// Get loyalty info for a user
const loyalty = await loyaltyDao.getLoyaltyByUser(userId)
console.log(`Points: ${loyalty.points}, Tier: ${loyalty.tier}`)

// Create loyalty record for new user
const newLoyalty = await loyaltyDao.createLoyalty(userId, 0)

// Add points (e.g., after booking completion)
const updated = await loyaltyDao.addPoints(userId, 120)
console.log(`New total: ${updated.points} points`)

// Set tier manually (admin operation)
await loyaltyDao.setTier(userId, 'gold')

// Upsert (create or update)
await loyaltyDao.upsertLoyalty(userId, 5000, 'gold')

// Get all loyalty records with pagination
const allLoyalty = await loyaltyDao.getAllLoyalty(50, 0)
```

### Referrals DAO

```javascript
const referralsDao = require('./Database/daos/referralsDao')

// Get all referrals for a user
const referrals = await referralsDao.getReferralsByUser(userId)

// Create new referral code
const newReferral = await referralsDao.createReferral(userId, 100)
console.log(`Referral code: ${newReferral.referral_code}`)

// Get referral by code
const referral = await referralsDao.getReferralByCode('REF123ABC')

// Update referral status
await referralsDao.updateReferralStatus(referralId, 'completed', newUserId)

// Complete referral when someone signs up with code
await referralsDao.completeReferralByCode('REF123ABC', newUserId)

// Get referral statistics
const stats = await referralsDao.getReferralStats(userId)
console.log(`Total: ${stats.total}, Completed: ${stats.completed}`)
console.log(`Points earned: ${stats.totalPointsEarned}`)
```

## Database Routing Logic

The DAOs automatically route operations based on feature flags:

```javascript
const { useSupabaseFor } = require('./Database/config/db-switch')

// Check where loyalty operations will go
if (useSupabaseFor('loyalty')) {
  console.log('Loyalty operations → Supabase')
} else {
  console.log('Loyalty operations → PostgreSQL')
}

// Get configuration summary
const { getConfigSummary } = require('./Database/config/db-switch')
console.log(getConfigSummary())
```

## Testing the Integration

Run the test script to verify both Supabase and PostgreSQL paths:

```bash
cd Database
node test-supabase-loyalty-referrals.js
```

This will:
1. Check configuration and feature flags
2. Test loyalty CRUD operations
3. Test referrals CRUD operations
4. Clean up test data

## Migration Strategy

**For existing applications with data:**

1. **Start with PostgreSQL** (keep existing data):
   ```bash
   SUPABASE_LOYALTY_ENABLED=false
   SUPABASE_REFERRALS_ENABLED=false
   ```

2. **Migrate loyalty data to Supabase**:
   ```bash
   # Export from PostgreSQL
   psql -h localhost -U appuser -d myapp -p 5000 \
     -c "COPY loyalty TO '/tmp/loyalty.csv' CSV HEADER"
   
   # Import to Supabase via SQL Editor in Dashboard
   # Then enable flag:
   SUPABASE_LOYALTY_ENABLED=true
   ```

3. **Migrate referrals data**:
   ```bash
   # Similar process for referrals
   SUPABASE_REFERRALS_ENABLED=true
   ```

4. **Verify and monitor** both paths before full migration.

**For new applications:**

Simply enable Supabase from the start:
```bash
SUPABASE_ENABLED=true
```

## Connection Check Script

The connection test validates:
- Environment variables are set correctly
- Supabase client initializes
- Tables are accessible
- Feature flags are configured properly

```bash
node Database/test-supabase-loyalty-referrals.js
```

## Best Practices

1. **Always use DAOs** - Never query databases directly
2. **Set feature flags in .env** - Never hardcode database selection
3. **Test both paths** - Run tests with different flag configurations
4. **Monitor errors** - Check logs when switching databases
5. **Gradual rollout** - Enable one module at a time in production

## Troubleshooting

**Issue: "Supabase client not initialized"**
- Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env`
- Check that Supabase client library is installed: `npm install @supabase/supabase-js`

**Issue: "PostgreSQL connection failed"**
- Verify `POSTGRES_URL` or individual `POSTGRES_*` variables are set
- Check that PostgreSQL is running: `node Database/test-connection.js`

**Issue: "Row level security policy violated"**
- Use `supabaseAdmin` client for backend operations that bypass RLS
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly

**Issue: Module uses wrong database**
- Check feature flags in `.env`
- Run: `node -e "console.log(require('./Database/config/db-switch').getConfigSummary())"`

## Environment Variable Reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SUPABASE_ENABLED` | No | `false` | Master switch for Supabase |
| `SUPABASE_LOYALTY_ENABLED` | No | `true` if master enabled | Route loyalty to Supabase |
| `SUPABASE_REFERRALS_ENABLED` | No | `true` if master enabled | Route referrals to Supabase |
| `SUPABASE_URL` | Yes (if using Supabase) | - | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes (if using Supabase) | - | Public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (backend) | - | Admin API key |
| `POSTGRES_URL` | Yes (if using PostgreSQL) | - | PostgreSQL connection string |

## DAO API Reference

### Loyalty DAO Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getLoyaltyByUser` | `userId` | `Promise<object\|null>` | Get loyalty record for user |
| `createLoyalty` | `userId, initialPoints=0` | `Promise<object>` | Create new loyalty record |
| `addPoints` | `userId, points` | `Promise<object>` | Add points to user's account |
| `setTier` | `userId, tier` | `Promise<object>` | Set tier manually (bronze/silver/gold/platinum) |
| `upsertLoyalty` | `userId, points, tier=null` | `Promise<object>` | Create or update loyalty record |
| `getAllLoyalty` | `limit=50, offset=0` | `Promise<Array>` | Get all loyalty records with pagination |

### Referrals DAO Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getReferralsByUser` | `userId` | `Promise<Array>` | Get all referrals for user |
| `getReferralByCode` | `referralCode` | `Promise<object\|null>` | Find referral by code |
| `createReferral` | `userId, rewardPoints=100` | `Promise<object>` | Create new referral with unique code |
| `updateReferralStatus` | `referralId, status, referredUserId=null` | `Promise<object>` | Update status (pending/completed/expired) |
| `completeReferralByCode` | `referralCode, newUserId` | `Promise<object>` | Complete referral when someone signs up |
| `getReferralStats` | `userId` | `Promise<object>` | Get referral statistics for user |
| `getAllReferrals` | `limit=50, offset=0` | `Promise<Array>` | Get all referrals with pagination |

---

**Dual-Database Status**: Configured ✅ | Ready for use ✅

**See also**: 
- Main migration guide: `Database/MIGRATION_GUIDE.md`
- Environment setup: `.env.example`
- Test script: `Database/test-supabase-loyalty-referrals.js`
