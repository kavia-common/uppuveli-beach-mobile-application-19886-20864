/**
 * Supabase Loyalty and Referrals Test Script
 * 
 * This script tests the dual-database integration for loyalty and referrals modules.
 * It exercises both Supabase and PostgreSQL paths based on feature flags.
 * 
 * Run with: node test-supabase-loyalty-referrals.js
 */

require('dotenv').config({ path: '.env' })

const { dbConfig, useSupabaseFor, getConfigSummary, validateConfig } = require('./config/db-switch')
const loyaltyDao = require('./daos/loyaltyDao')
const referralsDao = require('./daos/referralsDao')

// Test user ID (use a high number to avoid conflicts)
const TEST_USER_ID = 999999

/**
 * Print section header
 */
function printSection(title) {
  console.log('\n' + '='.repeat(60))
  console.log(title)
  console.log('='.repeat(60))
}

/**
 * Print test result
 */
function printResult(testName, passed, details = '') {
  const symbol = passed ? '✓' : '✗'
  const status = passed ? 'PASS' : 'FAIL'
  console.log(`${symbol} ${testName}: ${status}`)
  if (details) {
    console.log(`  ${details}`)
  }
}

/**
 * Main test function
 */
async function runTests() {
  printSection('Supabase Loyalty and Referrals Test Suite')
  
  console.log('\nTest Configuration:')
  console.log(`  Test User ID: ${TEST_USER_ID}`)
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('')
  
  // Step 1: Check configuration
  printSection('1. Configuration Check')
  
  const summary = getConfigSummary()
  console.log('\nDatabase Routing:')
  for (const [module, config] of Object.entries(summary.modules)) {
    console.log(`  ${module}: ${config.database}`)
  }
  
  const validation = validateConfig()
  if (validation.valid) {
    printResult('Configuration validation', true, 'No warnings')
  } else {
    printResult('Configuration validation', false, 'Warnings found:')
    validation.warnings.forEach(w => console.log(`    - ${w}`))
  }
  
  // Step 2: Test Loyalty Module
  printSection('2. Loyalty Module Tests')
  
  const usingSupabaseForLoyalty = useSupabaseFor('loyalty')
  console.log(`\nUsing ${usingSupabaseForLoyalty ? 'Supabase' : 'PostgreSQL'} for loyalty operations\n`)
  
  try {
    // Test 2.1: Create loyalty record
    console.log('Test 2.1: Create loyalty record')
    const newLoyalty = await loyaltyDao.createLoyalty(TEST_USER_ID, 500)
    printResult('Create loyalty record', newLoyalty && newLoyalty.user_id === TEST_USER_ID, 
                `Points: ${newLoyalty.points}, Tier: ${newLoyalty.tier}`)
    
    // Test 2.2: Get loyalty by user
    console.log('\nTest 2.2: Get loyalty by user')
    const fetchedLoyalty = await loyaltyDao.getLoyaltyByUser(TEST_USER_ID)
    printResult('Get loyalty by user', fetchedLoyalty && fetchedLoyalty.points === 500,
                `Retrieved record with ${fetchedLoyalty.points} points`)
    
    // Test 2.3: Add points
    console.log('\nTest 2.3: Add points')
    const updatedLoyalty = await loyaltyDao.addPoints(TEST_USER_ID, 600)
    printResult('Add points', updatedLoyalty && updatedLoyalty.points === 1100,
                `New total: ${updatedLoyalty.points} points, Tier: ${updatedLoyalty.tier}`)
    
    // Test 2.4: Set tier
    console.log('\nTest 2.4: Set tier manually')
    const tierUpdated = await loyaltyDao.setTier(TEST_USER_ID, 'gold')
    printResult('Set tier', tierUpdated && tierUpdated.tier === 'gold',
                `Tier updated to: ${tierUpdated.tier}`)
    
    // Test 2.5: Upsert (update existing)
    console.log('\nTest 2.5: Upsert loyalty record')
    const upserted = await loyaltyDao.upsertLoyalty(TEST_USER_ID, 5500)
    printResult('Upsert loyalty', upserted && upserted.points === 5500,
                `Points: ${upserted.points}, Tier: ${upserted.tier}`)
    
  } catch (error) {
    printResult('Loyalty module tests', false, `Error: ${error.message}`)
    console.error(error)
  }
  
  // Step 3: Test Referrals Module
  printSection('3. Referrals Module Tests')
  
  const usingSupabaseForReferrals = useSupabaseFor('referrals')
  console.log(`\nUsing ${usingSupabaseForReferrals ? 'Supabase' : 'PostgreSQL'} for referrals operations\n`)
  
  let testReferralId = null
  let testReferralCode = null
  
  try {
    // Test 3.1: Create referral
    console.log('Test 3.1: Create referral')
    const newReferral = await referralsDao.createReferral(TEST_USER_ID, 150)
    testReferralId = newReferral.id
    testReferralCode = newReferral.referral_code
    printResult('Create referral', newReferral && newReferral.user_id === TEST_USER_ID,
                `Code: ${newReferral.referral_code}, Reward: ${newReferral.reward_points} points`)
    
    // Test 3.2: Get referrals by user
    console.log('\nTest 3.2: Get referrals by user')
    const userReferrals = await referralsDao.getReferralsByUser(TEST_USER_ID)
    printResult('Get referrals by user', userReferrals && userReferrals.length > 0,
                `Found ${userReferrals.length} referral(s)`)
    
    // Test 3.3: Get referral by code
    console.log('\nTest 3.3: Get referral by code')
    const referralByCode = await referralsDao.getReferralByCode(testReferralCode)
    printResult('Get referral by code', referralByCode && referralByCode.referral_code === testReferralCode,
                `Status: ${referralByCode.status}`)
    
    // Test 3.4: Update referral status
    console.log('\nTest 3.4: Update referral status')
    const updatedReferral = await referralsDao.updateReferralStatus(testReferralId, 'completed', TEST_USER_ID + 1)
    printResult('Update referral status', updatedReferral && updatedReferral.status === 'completed',
                `New status: ${updatedReferral.status}`)
    
    // Test 3.5: Get referral stats
    console.log('\nTest 3.5: Get referral statistics')
    const stats = await referralsDao.getReferralStats(TEST_USER_ID)
    printResult('Get referral stats', stats && stats.completed === 1,
                `Total: ${stats.total}, Completed: ${stats.completed}, Points earned: ${stats.totalPointsEarned}`)
    
  } catch (error) {
    printResult('Referrals module tests', false, `Error: ${error.message}`)
    console.error(error)
  }
  
  // Step 4: Cleanup
  printSection('4. Cleanup')
  
  try {
    console.log('\nCleaning up test data...')
    
    // Delete test loyalty record
    if (usingSupabaseForLoyalty) {
      const { supabaseAdmin } = require('./supabase-client')
      if (supabaseAdmin) {
        await supabaseAdmin.from('loyalty').delete().eq('user_id', TEST_USER_ID)
        printResult('Delete test loyalty record', true)
      }
    } else {
      const { Pool } = require('pg')
      const connectionString = process.env.POSTGRES_URL || 
                              `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`
      const pool = new Pool({ connectionString })
      await pool.query('DELETE FROM loyalty WHERE user_id = $1', [TEST_USER_ID])
      await pool.end()
      printResult('Delete test loyalty record', true)
    }
    
    // Delete test referral records
    if (usingSupabaseForReferrals) {
      const { supabaseAdmin } = require('./supabase-client')
      if (supabaseAdmin) {
        await supabaseAdmin.from('referrals').delete().eq('user_id', TEST_USER_ID)
        printResult('Delete test referral records', true)
      }
    } else {
      const { Pool } = require('pg')
      const connectionString = process.env.POSTGRES_URL || 
                              `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`
      const pool = new Pool({ connectionString })
      await pool.query('DELETE FROM referrals WHERE user_id = $1', [TEST_USER_ID])
      await pool.end()
      printResult('Delete test referral records', true)
    }
    
  } catch (error) {
    printResult('Cleanup', false, `Error: ${error.message}`)
    console.error(error)
  }
  
  // Summary
  printSection('Test Summary')
  console.log('\nAll tests completed!')
  console.log('\nNext steps:')
  console.log('1. Review test results above')
  console.log('2. Check Database/MIGRATION_GUIDE.md for usage instructions')
  console.log('3. Update .env file with appropriate feature flags')
  console.log('4. Integrate DAOs into your backend API')
  console.log('')
}

// Run tests
runTests()
  .then(() => {
    console.log('Test suite finished.')
    process.exit(0)
  })
  .catch(error => {
    console.error('\nFatal error:', error)
    process.exit(1)
  })
