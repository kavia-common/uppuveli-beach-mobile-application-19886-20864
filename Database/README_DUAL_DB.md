# Dual-Database Configuration Guide

## Quick Start

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Enable Supabase for loyalty and referrals
SUPABASE_ENABLED=true
SUPABASE_LOYALTY_ENABLED=true
SUPABASE_REFERRALS_ENABLED=true

# Supabase credentials
SUPABASE_URL=https://nlzykbtuyoqfdnqtxdyh.supabase.co
SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>

# PostgreSQL (required for other modules)
POSTGRES_URL=postgresql://appuser:dbuser123@localhost:5000/myapp
```

### 2. Install Dependencies

```bash
cd Database
npm install
```

### 3. Test Configuration

```bash
node test-supabase-loyalty-referrals.js
```

### 4. Use in Your Code

```javascript
const loyaltyDao = require('./Database/daos/loyaltyDao')
const referralsDao = require('./Database/daos/referralsDao')

// Operations automatically route to the correct database
const loyalty = await loyaltyDao.getLoyaltyByUser(userId)
const referrals = await referralsDao.getReferralsByUser(userId)
```

## Configuration Options

### All PostgreSQL (Default)
```bash
SUPABASE_ENABLED=false
```

### Loyalty & Referrals on Supabase (Recommended)
```bash
SUPABASE_ENABLED=true
SUPABASE_LOYALTY_ENABLED=true
SUPABASE_REFERRALS_ENABLED=true
```

### Partial Migration
```bash
# Only loyalty on Supabase
SUPABASE_LOYALTY_ENABLED=true
SUPABASE_REFERRALS_ENABLED=false

# Or only referrals on Supabase
SUPABASE_LOYALTY_ENABLED=false
SUPABASE_REFERRALS_ENABLED=true
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Backend API                        │
└──────────────────┬──────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────┐      ┌──────────────┐
│  Loyalty DAO │      │ Referrals DAO│
└──────┬───────┘      └──────┬───────┘
       │                     │
       │  Feature Flags      │
       │  (db-switch.js)     │
       │                     │
   ┌───┴────┐           ┌────┴───┐
   ▼        ▼           ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Supabase│ │Postgres│ │Supabase│ │Postgres│
└────────┘ └────────┘ └────────┘ └────────┘

Other modules (Users, Bookings, Payments, Inventory):
    Always use PostgreSQL
```

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `SUPABASE_ENABLED` | `false` | Master switch |
| `SUPABASE_LOYALTY_ENABLED` | Follows master | Route loyalty to Supabase |
| `SUPABASE_REFERRALS_ENABLED` | Follows master | Route referrals to Supabase |

## Available DAOs

### Loyalty DAO (`Database/daos/loyaltyDao.js`)
- ✅ `getLoyaltyByUser(userId)` - Get loyalty info
- ✅ `createLoyalty(userId, points)` - Create loyalty record
- ✅ `addPoints(userId, points)` - Add loyalty points
- ✅ `setTier(userId, tier)` - Set tier manually
- ✅ `upsertLoyalty(userId, points, tier)` - Create or update
- ✅ `getAllLoyalty(limit, offset)` - List all with pagination

### Referrals DAO (`Database/daos/referralsDao.js`)
- ✅ `getReferralsByUser(userId)` - Get user's referrals
- ✅ `getReferralByCode(code)` - Find by referral code
- ✅ `createReferral(userId, rewardPoints)` - Create new referral
- ✅ `updateReferralStatus(id, status, referredUserId)` - Update status
- ✅ `completeReferralByCode(code, newUserId)` - Complete referral
- ✅ `getReferralStats(userId)` - Get statistics
- ✅ `getAllReferrals(limit, offset)` - List all with pagination

## Usage Examples

### Loyalty Operations

```javascript
const loyaltyDao = require('./Database/daos/loyaltyDao')

// Get user's loyalty info
const loyalty = await loyaltyDao.getLoyaltyByUser(123)
console.log(`Points: ${loyalty.points}, Tier: ${loyalty.tier}`)

// Award points after booking
await loyaltyDao.addPoints(123, 250)

// Check tier thresholds
console.log(loyaltyDao.TIER_THRESHOLDS)
// { bronze: 0, silver: 1000, gold: 5000, platinum: 10000 }
```

### Referrals Operations

```javascript
const referralsDao = require('./Database/daos/referralsDao')

// Create referral code for user
const referral = await referralsDao.createReferral(123, 100)
console.log(`Share this code: ${referral.referral_code}`)

// When someone signs up with code
await referralsDao.completeReferralByCode('REF123ABC', 456)

// Get user's referral stats
const stats = await referralsDao.getReferralStats(123)
console.log(`Completed: ${stats.completed}, Points: ${stats.totalPointsEarned}`)
```

## Testing

### Run Test Suite
```bash
cd Database
node test-supabase-loyalty-referrals.js
```

### Check Configuration
```bash
node -e "console.log(require('./Database/config/db-switch').getConfigSummary())"
```

### Validate Setup
```bash
node -e "console.log(require('./Database/config/db-switch').validateConfig())"
```

## Troubleshooting

### Check Database Connection
```bash
# Test Supabase
node test-connection.js

# Test dual-database setup
node test-supabase-loyalty-referrals.js
```

### Common Issues

**"Supabase client not initialized"**
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Install package if missing
npm install @supabase/supabase-js
```

**"PostgreSQL connection failed"**
```bash
# Verify PostgreSQL is running
psql postgresql://appuser:dbuser123@localhost:5000/myapp

# Check environment
echo $POSTGRES_URL
```

**Wrong database being used**
```bash
# Check feature flags
grep SUPABASE .env

# View current config
node -e "console.log(require('./Database/config/db-switch').getConfigSummary())"
```

## Migration Guide

See detailed migration instructions in:
- `Database/MIGRATION_GUIDE.md` - Main migration guide
- `Database/MIGRATION_GUIDE_DUAL_DB.md` - Dual-database specific guide

## Files Overview

```
Database/
├── config/
│   └── db-switch.js              # Feature flag configuration
├── daos/
│   ├── loyaltyDao.js             # Loyalty data access layer
│   └── referralsDao.js           # Referrals data access layer
├── supabase-client.js            # Supabase client setup
├── test-supabase-loyalty-referrals.js  # Integration tests
├── MIGRATION_GUIDE.md            # Main migration guide
├── MIGRATION_GUIDE_DUAL_DB.md    # Dual-DB specific guide
└── README_DUAL_DB.md             # This file
```

## Next Steps

1. ✅ Configure `.env` with feature flags
2. ✅ Run test suite to verify setup
3. ⏳ Integrate DAOs into your backend API
4. ⏳ Test in development environment
5. ⏳ Deploy with appropriate flags for production

## Support

For issues or questions:
- Check `Database/MIGRATION_GUIDE_DUAL_DB.md` for detailed troubleshooting
- Review `.env.example` for configuration reference
- Run test script to diagnose: `node test-supabase-loyalty-referrals.js`

---

**Status**: ✅ Configured and ready for integration
**Module Routing**: Loyalty & Referrals → Configurable | Other modules → PostgreSQL
