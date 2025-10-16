# Migration Guide: Local PostgreSQL to Supabase

This guide helps you migrate your application from local PostgreSQL to Supabase.

## Overview

The database has been successfully configured in Supabase with all necessary tables, relationships, triggers, and Row Level Security policies. This guide will help you update your application code to use Supabase instead of the local PostgreSQL instance.

## Pre-Migration Checklist

- [x] Supabase project created
- [x] Database schema migrated (8 tables)
- [x] Foreign key relationships established
- [x] Indexes created for performance
- [x] Triggers and functions configured
- [x] Row Level Security (RLS) enabled and policies created
- [ ] Environment variables configured
- [ ] Supabase client library installed
- [ ] Application code updated
- [ ] Authentication flow updated
- [ ] Testing completed

## Step 1: Install Supabase Client Library

### For Node.js/Backend
```bash
npm install @supabase/supabase-js
```

### For React Native
```bash
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
```

## Step 2: Configure Environment Variables

### Update .env file

Replace the old PostgreSQL variables with Supabase variables:

```bash
# Remove these (legacy local PostgreSQL)
# POSTGRES_URL=postgresql://localhost:5000/myapp
# POSTGRES_USER=appuser
# POSTGRES_PASSWORD=dbuser123
# POSTGRES_DB=myapp
# POSTGRES_PORT=5000

# Add these (new Supabase)
SUPABASE_URL=https://nlzykbtuyoqfdnqtxdyh.supabase.co
SUPABASE_ANON_KEY=<your_anon_key_from_dashboard>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key_from_dashboard>
SITE_URL=http://localhost:3000
```

### Get API Keys from Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `nlzykbtuyoqfdnqtxdyh`
3. Go to Settings > API
4. Copy:
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Update Database Connection Code

### Old Code (pg library)
```javascript
const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5000,
  user: 'appuser',
  password: 'dbuser123',
  database: 'myapp'
})

// Query
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
```

### New Code (Supabase)
```javascript
const { supabase } = require('./supabase-client')

// Query
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()
```

## Step 4: Update CRUD Operations

### SELECT Operations

**Old (SQL)**
```javascript
const result = await pool.query('SELECT * FROM bookings WHERE user_id = $1', [userId])
const bookings = result.rows
```

**New (Supabase)**
```javascript
const { data: bookings, error } = await supabase
  .from('bookings')
  .select('*')
  .eq('user_id', userId)
```

### INSERT Operations

**Old (SQL)**
```javascript
const result = await pool.query(
  'INSERT INTO bookings (user_id, room_id, start_date, end_date, total_amount, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
  [userId, roomId, startDate, endDate, amount, 'pending']
)
const booking = result.rows[0]
```

**New (Supabase)**
```javascript
const { data: booking, error } = await supabase
  .from('bookings')
  .insert({
    user_id: userId,
    room_id: roomId,
    start_date: startDate,
    end_date: endDate,
    total_amount: amount,
    status: 'pending'
  })
  .select()
  .single()
```

### UPDATE Operations

**Old (SQL)**
```javascript
const result = await pool.query(
  'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
  ['confirmed', bookingId]
)
```

**New (Supabase)**
```javascript
const { data, error } = await supabase
  .from('bookings')
  .update({ status: 'confirmed' })
  .eq('id', bookingId)
  .select()
```

### DELETE Operations

**Old (SQL)**
```javascript
await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId])
```

**New (Supabase)**
```javascript
const { error } = await supabase
  .from('bookings')
  .delete()
  .eq('id', bookingId)
```

### JOIN Operations

**Old (SQL)**
```javascript
const result = await pool.query(`
  SELECT b.*, r.room_number, r.room_type 
  FROM bookings b 
  JOIN rooms r ON b.room_id = r.id 
  WHERE b.user_id = $1
`, [userId])
```

**New (Supabase)**
```javascript
const { data, error } = await supabase
  .from('bookings')
  .select(`
    *,
    rooms (
      room_number,
      room_type
    )
  `)
  .eq('user_id', userId)
```

## Step 5: Update Authentication

### Replace Custom JWT Auth with Supabase Auth

**Old Authentication Flow**
```javascript
// Custom JWT implementation
const jwt = require('jsonwebtoken')
const token = jwt.sign({ userId }, SECRET_KEY)
```

**New Authentication Flow**
```javascript
const { authHelpers } = require('./supabase-client')

// Sign up
const { data, error } = await authHelpers.signUp(email, password)

// Sign in
const { data, error } = await authHelpers.signIn(email, password)

// Get current user
const { user, error } = await authHelpers.getUser()

// Sign out
await authHelpers.signOut()
```

### Authentication Middleware

**Old Middleware**
```javascript
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}
```

**New Middleware**
```javascript
const { supabase } = require('./supabase-client')

const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  req.user = user
  next()
}
```

## Step 6: Handle Real-time Updates (New Feature!)

Supabase provides real-time database subscriptions:

```javascript
const { supabase } = require('./supabase-client')

// Subscribe to booking changes
const channel = supabase
  .channel('bookings-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // 'INSERT', 'UPDATE', 'DELETE', or '*' for all
      schema: 'public',
      table: 'bookings',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Booking changed:', payload)
      // Update UI or trigger notifications
    }
  )
  .subscribe()

// Unsubscribe when done
channel.unsubscribe()
```

## Step 7: Update Database Scripts

### Disable Local PostgreSQL Scripts

The following scripts are no longer needed:
- `Database/startup.sh` - Local PostgreSQL startup
- `Database/backup_db.sh` - Local backup (use Supabase backups)
- `Database/restore_db.sh` - Local restore

### New Supabase Management

- **Backups**: Automatic daily backups in Supabase Dashboard
- **Monitoring**: Available in Supabase Dashboard > Database > Logs
- **Migrations**: Use Supabase CLI or Dashboard SQL Editor

## Step 8: Testing Checklist

- [ ] User registration and login works
- [ ] User can create bookings
- [ ] User can view their bookings
- [ ] User can update booking status
- [ ] Loyalty points are awarded correctly
- [ ] Referral system functions properly
- [ ] Dining reservations work
- [ ] Inventory queries return correct data
- [ ] RLS policies prevent unauthorized access
- [ ] Real-time subscriptions work (if implemented)

## Step 9: Row Level Security (RLS) Considerations

### Important RLS Notes

1. **Client queries respect RLS** - Users can only access their own data
2. **Admin operations bypass RLS** - Use `supabaseAdmin` client for admin tasks
3. **Auth context required** - Most operations require authenticated user

### Testing RLS Policies

```javascript
// This will only return current user's bookings (RLS enforced)
const { data } = await supabase
  .from('bookings')
  .select('*')

// This can access all bookings (RLS bypassed - use carefully!)
const { data } = await supabaseAdmin
  .from('bookings')
  .select('*')
```

## Step 10: Performance Optimization

### Indexes Already Created

The migration has created indexes for:
- User lookups: `bookings.user_id`, `payments.user_id`
- Date range queries: `bookings.start_date`, `bookings.end_date`
- Status queries: `payments.status`
- Referral codes: `referrals.referral_code`

### Additional Optimizations

1. **Use select() sparingly** - Only fetch columns you need
2. **Limit results** - Use `.limit()` for large tables
3. **Use proper filters** - Filter on indexed columns when possible
4. **Batch operations** - Use bulk inserts/updates when possible

```javascript
// Good - selective columns and limit
const { data } = await supabase
  .from('bookings')
  .select('id, status, created_at')
  .limit(50)

// Better - with proper filtering
const { data } = await supabase
  .from('bookings')
  .select('id, status, created_at')
  .eq('user_id', userId)
  .gte('start_date', new Date())
  .limit(50)
```

## Rollback Plan

If you need to rollback to local PostgreSQL:

1. Keep the old `.env` backup with PostgreSQL variables
2. Keep `Database/startup.sh` and related scripts
3. Restore from `database_backup.sql` if available
4. Revert code changes to use `pg` library

## Common Issues & Solutions

### Issue: "Failed to fetch"
**Solution**: Check SUPABASE_URL and SUPABASE_ANON_KEY are correct

### Issue: "Row level security policy violated"
**Solution**: Ensure user is authenticated or adjust RLS policies

### Issue: "JWT expired"
**Solution**: Implement token refresh logic using `autoRefreshToken: true`

### Issue: "Insert/Update failed silently"
**Solution**: Check RLS policies - user may not have permission

## Additional Resources

- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Migration from PostgreSQL](https://supabase.com/docs/guides/database/migrating-to-supabase)

## Support

For issues or questions:
1. Check Supabase Dashboard logs
2. Review RLS policies in Dashboard > Authentication > Policies
3. Test queries in Dashboard > SQL Editor
4. Contact support via Supabase Dashboard

---

**Migration Status**: Database configured ✅ | Code updates pending ⏳
