# Supabase Configuration Documentation

## Project Information

- **Project URL**: `https://nlzykbtuyoqfdnqtxdyh.supabase.co`
- **Project Reference**: `nlzykbtuyoqfdnqtxdyh`
- **Region**: Auto-detected by Supabase
- **Database**: PostgreSQL 15+ (Supabase-managed)

## Environment Variables

### Required for Client Applications (Anon/Public Access)
```bash
SUPABASE_URL=https://nlzykbtuyoqfdnqtxdyh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Required for Backend/Server Applications (Admin Access)
```bash
SUPABASE_URL=https://nlzykbtuyoqfdnqtxdyh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_placeholder>
```

**Note**: The `SUPABASE_SERVICE_ROLE_KEY` should be obtained from Supabase Dashboard > Settings > API > service_role key. This key bypasses Row Level Security and should only be used in secure backend environments.

## Database Schema

### Tables Created

1. **users** - Guest profiles and authentication
   - id (bigserial, PK)
   - name (text)
   - email (text, unique)
   - phone (text)
   - loyalty_points (integer, default: 0)
   - created_at (timestamptz)
   - updated_at (timestamptz)

2. **rooms** - Hotel room inventory
   - id (bigserial, PK)
   - room_number (text, unique)
   - room_type (text)
   - price_per_night (numeric)
   - capacity (integer)
   - amenities (jsonb)
   - is_available (boolean, default: true)
   - created_at (timestamptz)

3. **bookings** - Room reservations
   - id (bigserial, PK)
   - user_id (bigint, FK -> users)
   - room_id (bigint, FK -> rooms)
   - start_date (date)
   - end_date (date)
   - status (text, default: 'pending')
   - total_amount (numeric)
   - created_at (timestamptz)
   - updated_at (timestamptz)

4. **payments** - Transaction records
   - id (bigserial, PK)
   - user_id (bigint, FK -> users)
   - booking_id (bigint, FK -> bookings)
   - amount (numeric)
   - currency (text, default: 'USD')
   - status (text, default: 'pending')
   - payment_method (text)
   - transaction_id (text)
   - created_at (timestamptz)

5. **loyalty** - Rewards program
   - id (bigserial, PK)
   - user_id (bigint, FK -> users, unique)
   - points (integer, default: 0)
   - tier (text, default: 'bronze')
   - created_at (timestamptz)
   - updated_at (timestamptz)

6. **referrals** - Viral referral system
   - id (bigserial, PK)
   - user_id (bigint, FK -> users)
   - referral_code (text, unique)
   - referred_user_id (bigint, FK -> users)
   - status (text, default: 'pending')
   - reward_points (integer)
   - created_at (timestamptz)

7. **inventory** - Boutique/gift shop items
   - id (bigserial, PK)
   - item_name (text)
   - description (text)
   - quantity (integer, default: 0)
   - price (numeric)
   - category (text)
   - image_url (text)
   - created_at (timestamptz)
   - updated_at (timestamptz)

8. **dining_reservations** - Restaurant bookings
   - id (bigserial, PK)
   - user_id (bigint, FK -> users)
   - reservation_date (date)
   - reservation_time (time)
   - party_size (integer)
   - status (text, default: 'pending')
   - special_requests (text)
   - created_at (timestamptz)
   - updated_at (timestamptz)

### Automated Triggers & Functions

1. **Auto-create loyalty record** - Automatically creates a loyalty record when a new user is registered
2. **Auto-update loyalty tier** - Updates tier (bronze/silver/gold/platinum) based on points:
   - Bronze: 0-999 points
   - Silver: 1,000-4,999 points
   - Gold: 5,000-9,999 points
   - Platinum: 10,000+ points
3. **Sync loyalty points** - Syncs loyalty points to users.loyalty_points field
4. **Award booking points** - Awards 10% of booking amount as loyalty points on completion
5. **Award referral rewards** - Awards referral points when referral status becomes 'completed'
6. **Auto-update timestamps** - Automatically updates updated_at fields

### Row Level Security (RLS) Policies

All tables have RLS enabled with the following policies:

- **users**: Users can view/update their own profile
- **rooms**: Public read access
- **bookings**: Users can view/create/update their own bookings
- **payments**: Users can view/create their own payments
- **loyalty**: Users can view their own loyalty data
- **referrals**: Users can view/create their own referrals
- **inventory**: Public read access
- **dining_reservations**: Users can view/create/update their own reservations

## Connection Patterns

### Client-Side Connection (React Native, Web)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Server-Side Connection (Backend API, Admin)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
```

### Direct PostgreSQL Connection (Optional, for migrations or admin tasks)

Supabase provides direct PostgreSQL access via:

```
Connection String (from Supabase Dashboard > Settings > Database):
postgresql://postgres:[YOUR-PASSWORD]@db.nlzykbtuyoqfdnqtxdyh.supabase.co:5432/postgres
```

**Note**: Direct database connections should only be used for administrative tasks, migrations, or when Supabase client libraries cannot be used.

## Authentication Integration

### Supabase Auth Setup

Supabase provides built-in authentication with support for:
- Email/Password
- Magic Links
- OAuth (Google, Facebook, Apple, etc.)
- Phone/SMS

### Important Configuration

**Site URL Configuration** (Required for email links and OAuth redirects):
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Set **Site URL** to your production domain (e.g., `https://yourapp.com`)
3. Add **Redirect URLs**:
   - Development: `http://localhost:3000/**`
   - Production: `https://yourapp.com/**`

### Example Auth Implementation

```javascript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    emailRedirectTo: `${getURL()}auth/callback`,
  }
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
})

// Sign out
await supabase.auth.signOut()

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

## Migration from Local PostgreSQL

### Key Changes

1. **Connection String**: Replace local PostgreSQL connection strings with Supabase URL
2. **Authentication**: Use Supabase Auth instead of custom JWT implementation
3. **API Keys**: Use `SUPABASE_ANON_KEY` for client access, `SUPABASE_SERVICE_ROLE_KEY` for admin
4. **RLS**: All data access is controlled by Row Level Security policies
5. **Real-time**: Supabase provides real-time subscriptions for database changes

### Environment Variable Mapping

| Old (Local PostgreSQL) | New (Supabase) |
|------------------------|----------------|
| POSTGRES_URL | SUPABASE_URL |
| POSTGRES_USER | N/A (handled by Supabase) |
| POSTGRES_PASSWORD | N/A (handled by Supabase) |
| POSTGRES_DB | N/A (handled by Supabase) |
| POSTGRES_PORT | N/A (handled by Supabase) |
| N/A | SUPABASE_ANON_KEY |
| N/A | SUPABASE_SERVICE_ROLE_KEY |

## Data Access Examples

### Query Data

```javascript
// Get all available rooms
const { data, error } = await supabase
  .from('rooms')
  .select('*')
  .eq('is_available', true)

// Get user bookings
const { data, error } = await supabase
  .from('bookings')
  .select(`
    *,
    rooms(*)
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

### Insert Data

```javascript
// Create a booking
const { data, error } = await supabase
  .from('bookings')
  .insert({
    user_id: userId,
    room_id: roomId,
    start_date: '2024-06-01',
    end_date: '2024-06-05',
    total_amount: 1200.00,
    status: 'pending'
  })
  .select()
```

### Update Data

```javascript
// Update booking status
const { data, error } = await supabase
  .from('bookings')
  .update({ status: 'confirmed' })
  .eq('id', bookingId)
  .select()
```

### Real-time Subscriptions

```javascript
// Subscribe to booking changes
const channel = supabase
  .channel('bookings-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'bookings',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Booking changed:', payload)
    }
  )
  .subscribe()
```

## Security Best Practices

1. **Never expose** `SUPABASE_SERVICE_ROLE_KEY` in client-side code
2. **Use RLS policies** to restrict data access based on authenticated users
3. **Enable MFA** for admin accounts in Supabase Dashboard
4. **Regularly rotate** API keys in production
5. **Use environment variables** for all sensitive configuration
6. **Enable SSL/TLS** for all database connections (enabled by default in Supabase)
7. **Implement rate limiting** for API endpoints
8. **Audit RLS policies** regularly to ensure proper access control

## Monitoring & Maintenance

- **Database Logs**: Available in Supabase Dashboard > Database > Logs
- **API Logs**: Available in Supabase Dashboard > API > Logs
- **Usage Metrics**: Available in Supabase Dashboard > Settings > Usage
- **Backups**: Automatic daily backups (retained based on plan)
- **Health Check**: Monitor via Supabase Dashboard or API health endpoint

## Support & Resources

- **Supabase Documentation**: https://supabase.com/docs
- **API Reference**: https://supabase.com/docs/reference/javascript
- **Community**: https://github.com/supabase/supabase/discussions
- **Status Page**: https://status.supabase.com

## Next Steps

1. ✅ Database schema created and configured
2. ✅ RLS policies enabled
3. ✅ Triggers and functions set up
4. ⏳ Install Supabase client libraries in application
5. ⏳ Update application code to use Supabase connection
6. ⏳ Configure authentication flow
7. ⏳ Test all CRUD operations
8. ⏳ Deploy and monitor

---

**Last Updated**: $(date)
**Configuration Status**: Complete
**Tables**: 8 core tables with relationships and triggers
**RLS**: Enabled on all tables
