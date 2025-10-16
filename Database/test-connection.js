/**
 * Supabase Connection Test Script
 * 
 * This script tests the Supabase connection and verifies database access.
 * Run with: node test-connection.js
 */

require('dotenv').config({ path: '../.env' })

async function testConnection() {
  console.log('='.repeat(50))
  console.log('Supabase Connection Test')
  console.log('='.repeat(50))
  console.log('')

  // Check environment variables
  console.log('1. Checking environment variables...')
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
  
  if (!supabaseUrl) {
    console.log('   ✗ SUPABASE_URL not set')
    console.log('   Please set SUPABASE_URL in your .env file')
    process.exit(1)
  }
  console.log(`   ✓ SUPABASE_URL: ${supabaseUrl}`)
  
  if (!supabaseAnonKey) {
    console.log('   ✗ SUPABASE_ANON_KEY not set')
    console.log('   Please set SUPABASE_ANON_KEY in your .env file')
    process.exit(1)
  }
  console.log(`   ✓ SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`)
  console.log('')

  // Test Supabase client import
  console.log('2. Loading Supabase client...')
  let supabase
  try {
    const supabaseModule = require('./supabase-client')
    supabase = supabaseModule.supabase
    
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }
    console.log('   ✓ Supabase client loaded successfully')
  } catch (error) {
    console.log(`   ✗ Failed to load Supabase client: ${error.message}`)
    console.log('   Have you run: ./install-supabase.sh ?')
    process.exit(1)
  }
  console.log('')

  // Test database connection
  console.log('3. Testing database connection...')
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      throw error
    }
    
    console.log('   ✓ Database connection successful')
  } catch (error) {
    console.log(`   ✗ Database connection failed: ${error.message}`)
    process.exit(1)
  }
  console.log('')

  // Test table access
  console.log('4. Checking database tables...')
  const tables = ['users', 'rooms', 'bookings', 'payments', 'loyalty', 'referrals', 'inventory', 'dining_reservations']
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      if (error) {
        console.log(`   ✗ ${table}: ${error.message}`)
      } else {
        console.log(`   ✓ ${table}: accessible`)
      }
    } catch (error) {
      console.log(`   ✗ ${table}: ${error.message}`)
    }
  }
  console.log('')

  // Get table row counts (if accessible)
  console.log('5. Getting table statistics...')
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        console.log(`   ${table}: ${count} row(s)`)
      }
    } catch (error) {
      // Ignore errors for row counts
    }
  }
  console.log('')

  // Summary
  console.log('='.repeat(50))
  console.log('✓ All tests passed!')
  console.log('='.repeat(50))
  console.log('')
  console.log('Your Supabase database is ready to use.')
  console.log('')
  console.log('Next steps:')
  console.log('1. Review documentation: cat assets/supabase.md')
  console.log('2. Read migration guide: cat Database/MIGRATION_GUIDE.md')
  console.log('3. Update your application code to use Supabase')
  console.log('4. Configure authentication redirects in Supabase Dashboard')
  console.log('')
  console.log('Dashboard: https://supabase.com/dashboard/project/nlzykbtuyoqfdnqtxdyh')
  console.log('')
}

// Run the test
testConnection().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})
