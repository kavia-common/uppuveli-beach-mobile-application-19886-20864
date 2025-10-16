# Uppuveli Beach Mobile Application

A state-of-the-art mobile application for Uppuveli Beach by DSK, designed to deliver a unified, intelligent guest experience.

## Overview

This application integrates:
- Room bookings and reservations
- Secure payment processing
- Dining reservations
- Loyalty rewards program
- Viral referral system
- Boutique/gift shop inventory
- Admin web panel for hotel staff

## Architecture

### Database (Supabase - PostgreSQL)

The application uses **Supabase** as its backend database and authentication provider.

- **Platform**: Supabase (Managed PostgreSQL 15+)
- **Project URL**: https://nlzykbtuyoqfdnqtxdyh.supabase.co
- **Project Ref**: nlzykbtuyoqfdnqtxdyh

#### Database Schema

8 core tables with relationships:
- `users` - Guest profiles and authentication
- `rooms` - Hotel room inventory
- `bookings` - Room reservations
- `payments` - Transaction records (PCI DSS compliant)
- `loyalty` - Rewards program with automatic tier management
- `referrals` - Viral referral system
- `inventory` - Boutique/gift shop items
- `dining_reservations` - Restaurant bookings

**Features**:
- Row Level Security (RLS) enabled on all tables
- Automated triggers for loyalty points and tier updates
- Foreign key constraints for data integrity
- Optimized indexes for performance
- Real-time subscriptions support

#### Documentation

- **Setup Guide**: `assets/supabase.md` - Complete Supabase configuration documentation
- **Migration Guide**: `Database/MIGRATION_GUIDE.md` - Step-by-step guide for transitioning from local PostgreSQL
- **Client Library**: `Database/supabase-client.js` - Pre-configured Supabase client with helpers

## Getting Started

### Prerequisites

- Node.js 14+ (for backend/utilities)
- npm or yarn
- Supabase account (free tier available)

### Environment Setup

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Configure Supabase credentials**:
   
   Get your API keys from [Supabase Dashboard](https://supabase.com/dashboard/project/nlzykbtuyoqfdnqtxdyh/settings/api):
   
   ```bash
   SUPABASE_URL=https://nlzykbtuyoqfdnqtxdyh.supabase.co
   SUPABASE_ANON_KEY=<your_anon_key>
   SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
   SITE_URL=http://localhost:3000
   ```

3. **Install dependencies**:
   ```bash
   cd Database
   chmod +x install-supabase.sh
   ./install-supabase.sh
   ```

### Database Access

#### Via Supabase Client (Recommended)

```javascript
const { supabase, authHelpers, dbHelpers } = require('./Database/supabase-client')

// Authentication
const { data, error } = await authHelpers.signIn(email, password)

// Query data
const { data: rooms } = await dbHelpers.getAvailableRooms()

// Create booking
const { data: booking } = await dbHelpers.createBooking({
  user_id: userId,
  room_id: roomId,
  start_date: '2024-06-01',
  end_date: '2024-06-05',
  total_amount: 1200.00
})
```

#### Via Supabase Dashboard

- **SQL Editor**: https://supabase.com/dashboard/project/nlzykbtuyoqfdnqtxdyh/editor
- **Table Editor**: https://supabase.com/dashboard/project/nlzykbtuyoqfdnqtxdyh/editor
- **Database Logs**: https://supabase.com/dashboard/project/nlzykbtuyoqfdnqtxdyh/logs

#### Direct PostgreSQL Connection (Advanced)

For migrations or admin tasks:
```bash
# Get connection string from Supabase Dashboard > Settings > Database
psql "postgresql://postgres:[PASSWORD]@db.nlzykbtuyoqfdnqtxdyh.supabase.co:5432/postgres"
```

### Authentication Setup

**Important**: Configure redirect URLs in Supabase Dashboard

1. Go to: **Authentication > URL Configuration**
2. Set **Site URL**: `http://localhost:3000` (dev) or `https://yourapp.com` (prod)
3. Add **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://yourapp.com/**`

## Features

### Loyalty Program

- **Automatic tier assignment** based on points:
  - Bronze: 0-999 points
  - Silver: 1,000-4,999 points
  - Gold: 5,000-9,999 points
  - Platinum: 10,000+ points
- **Earn points**: 10% of booking amount on completion
- **Real-time updates**: Loyalty record created automatically on user registration

### Referral System

- Unique referral codes for each user
- Reward points awarded when referral is completed
- Viral sharing capabilities

### Security

- **Row Level Security (RLS)**: Users can only access their own data
- **Encrypted connections**: All data transmitted over SSL/TLS
- **Secure authentication**: Powered by Supabase Auth
- **PCI DSS considerations**: Payment data properly secured
- **GDPR compliant**: User data management and deletion

### Real-time Features

- Live booking updates
- Real-time inventory changes
- Instant loyalty point updates
- Live dining reservation status

## Development

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development
npm run dev
```

### Testing Database Connection

```javascript
const { supabase } = require('./Database/supabase-client')

// Test query
const { data, error } = await supabase
  .from('rooms')
  .select('count(*)')

console.log(data ? 'Connection successful!' : 'Connection failed:', error)
```

### Database Management

- **Backups**: Automatic daily backups (Supabase Dashboard)
- **Migrations**: Use Supabase Dashboard SQL Editor or CLI
- **Monitoring**: Real-time logs and metrics in Supabase Dashboard
- **Scaling**: Automatic scaling with Supabase Pro/Team plans

## Project Structure

```
uppuveli-beach-mobile-application-19886-20864/
├── README.md                           # This file
├── .env.example                        # Environment variables template
├── assets/
│   └── supabase.md                     # Supabase configuration docs
├── Database/
│   ├── supabase-client.js              # Supabase client initialization
│   ├── MIGRATION_GUIDE.md              # PostgreSQL to Supabase migration guide
│   ├── install-supabase.sh             # Dependency installation script
│   ├── backup_db.sh                    # Legacy (use Supabase backups)
│   ├── restore_db.sh                   # Legacy (use Supabase restore)
│   └── db_visualizer/                  # Legacy database viewer (optional)
```

## Migration from Local PostgreSQL

If migrating from local PostgreSQL setup:

1. Read `Database/MIGRATION_GUIDE.md` for detailed instructions
2. Database schema has been migrated to Supabase
3. Update environment variables from PostgreSQL to Supabase
4. Install Supabase client library
5. Update application code to use Supabase queries
6. Test all functionality with RLS policies

**Database is already configured** in Supabase with:
- ✅ All tables created
- ✅ Relationships and constraints set
- ✅ RLS policies enabled
- ✅ Triggers and functions configured
- ✅ Indexes optimized

## Resources

- **Supabase Documentation**: https://supabase.com/docs
- **API Reference**: https://supabase.com/docs/reference/javascript
- **Dashboard**: https://supabase.com/dashboard/project/nlzykbtuyoqfdnqtxdyh
- **Status**: https://status.supabase.com

## Support

For issues or questions:
1. Check Supabase Dashboard logs
2. Review `assets/supabase.md` for configuration details
3. Consult `Database/MIGRATION_GUIDE.md` for code examples
4. Test queries in Supabase SQL Editor

## License

Proprietary - Uppuveli Beach by DSK

---

**Database Status**: ✅ Configured and ready  
**Tables**: 8 core tables with relationships  
**Security**: RLS enabled on all tables  
**Backups**: Automatic daily backups  
**Next Step**: Install Supabase client and update application code
