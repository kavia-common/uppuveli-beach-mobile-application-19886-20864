/**
 * Referrals Data Access Object (DAO)
 * 
 * Provides CRUD operations for referral code management and reward tracking.
 * Routes operations to either Supabase or local PostgreSQL based on feature flags.
 */

const { useSupabaseFor } = require('../config/db-switch')
const { supabase, supabaseAdmin } = require('../supabase-client')
const crypto = require('crypto')

// Lazy-load PostgreSQL pool
let pgPool = null
function getPostgresPool() {
  if (!pgPool) {
    const { Pool } = require('pg')
    const connectionString = process.env.POSTGRES_URL || 
                            `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`
    pgPool = new Pool({ connectionString })
  }
  return pgPool
}

/**
 * Generate a unique referral code
 * @param {number} userId - User ID
 * @returns {string} - Unique referral code
 */
function generateReferralCode(userId) {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `REF${userId}${timestamp}${random}`.substring(0, 16)
}

// PUBLIC_INTERFACE
/**
 * Get all referrals for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Array of referral records
 */
async function getReferralsByUser(userId) {
  const useSupabase = useSupabaseFor('referrals')
  
  if (useSupabase) {
    // Supabase path
    if (!supabase) {
      throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY.')
    }
    
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    return data || []
  } else {
    // PostgreSQL path
    const pool = getPostgresPool()
    const result = await pool.query(
      'SELECT * FROM referrals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    return result.rows
  }
}

// PUBLIC_INTERFACE
/**
 * Get a referral by its code
 * @param {string} referralCode - Referral code
 * @returns {Promise<object|null>} - Referral record or null if not found
 */
async function getReferralByCode(referralCode) {
  const useSupabase = useSupabaseFor('referrals')
  
  if (useSupabase) {
    // Supabase path
    if (!supabase) {
      throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY.')
    }
    
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referral_code', referralCode)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    return data
  } else {
    // PostgreSQL path
    const pool = getPostgresPool()
    const result = await pool.query(
      'SELECT * FROM referrals WHERE referral_code = $1',
      [referralCode]
    )
    return result.rows.length > 0 ? result.rows[0] : null
  }
}

// PUBLIC_INTERFACE
/**
 * Create a new referral
 * @param {number} userId - User ID (referrer)
 * @param {number} rewardPoints - Points to award on completion (default: 100)
 * @returns {Promise<object>} - Created referral record
 */
async function createReferral(userId, rewardPoints = 100) {
  const useSupabase = useSupabaseFor('referrals')
  const referralCode = generateReferralCode(userId)
  
  if (useSupabase) {
    // Supabase path
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.')
    }
    
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .insert({
        user_id: userId,
        referral_code: referralCode,
        status: 'pending',
        reward_points: rewardPoints
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    return data
  } else {
    // PostgreSQL path
    const pool = getPostgresPool()
    const result = await pool.query(
      `INSERT INTO referrals (user_id, referral_code, status, reward_points)
       VALUES ($1, $2, 'pending', $3)
       RETURNING *`,
      [userId, referralCode, rewardPoints]
    )
    return result.rows[0]
  }
}

// PUBLIC_INTERFACE
/**
 * Update referral status and optionally set referred user
 * @param {number} referralId - Referral ID
 * @param {string} status - New status (pending, completed, expired)
 * @param {number} referredUserId - ID of referred user (optional)
 * @returns {Promise<object>} - Updated referral record
 */
async function updateReferralStatus(referralId, status, referredUserId = null) {
  const validStatuses = ['pending', 'completed', 'expired']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
  }
  
  const useSupabase = useSupabaseFor('referrals')
  
  if (useSupabase) {
    // Supabase path
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.')
    }
    
    const updateData = { status }
    if (referredUserId !== null) {
      updateData.referred_user_id = referredUserId
    }
    
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .update(updateData)
      .eq('id', referralId)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    return data
  } else {
    // PostgreSQL path
    const pool = getPostgresPool()
    
    let query
    let params
    
    if (referredUserId !== null) {
      query = 'UPDATE referrals SET status = $1, referred_user_id = $2 WHERE id = $3 RETURNING *'
      params = [status, referredUserId, referralId]
    } else {
      query = 'UPDATE referrals SET status = $1 WHERE id = $2 RETURNING *'
      params = [status, referralId]
    }
    
    const result = await pool.query(query, params)
    
    if (result.rows.length === 0) {
      throw new Error(`Referral not found with ID ${referralId}`)
    }
    
    return result.rows[0]
  }
}

// PUBLIC_INTERFACE
/**
 * Complete a referral by code (when a new user signs up using the code)
 * @param {string} referralCode - Referral code
 * @param {number} newUserId - ID of the new user who used the code
 * @returns {Promise<object>} - Updated referral record
 */
async function completeReferralByCode(referralCode, newUserId) {
  const useSupabase = useSupabaseFor('referrals')
  
  if (useSupabase) {
    // Supabase path
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.')
    }
    
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .update({
        status: 'completed',
        referred_user_id: newUserId
      })
      .eq('referral_code', referralCode)
      .eq('status', 'pending') // Only update if still pending
      .select()
      .single()
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    return data
  } else {
    // PostgreSQL path
    const pool = getPostgresPool()
    const result = await pool.query(
      `UPDATE referrals 
       SET status = 'completed', referred_user_id = $1
       WHERE referral_code = $2 AND status = 'pending'
       RETURNING *`,
      [newUserId, referralCode]
    )
    
    if (result.rows.length === 0) {
      throw new Error(`No pending referral found with code ${referralCode}`)
    }
    
    return result.rows[0]
  }
}

// PUBLIC_INTERFACE
/**
 * Get referral statistics for a user
 * @param {number} userId - User ID
 * @returns {Promise<object>} - Statistics object
 */
async function getReferralStats(userId) {
  const useSupabase = useSupabaseFor('referrals')
  
  if (useSupabase) {
    // Supabase path
    if (!supabase) {
      throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY.')
    }
    
    const { data, error } = await supabase
      .from('referrals')
      .select('status, reward_points')
      .eq('user_id', userId)
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      completed: data.filter(r => r.status === 'completed').length,
      expired: data.filter(r => r.status === 'expired').length,
      totalPointsEarned: data
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + (r.reward_points || 0), 0)
    }
    
    return stats
  } else {
    // PostgreSQL path
    const pool = getPostgresPool()
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'expired') as expired,
         COALESCE(SUM(reward_points) FILTER (WHERE status = 'completed'), 0) as total_points_earned
       FROM referrals
       WHERE user_id = $1`,
      [userId]
    )
    
    const row = result.rows[0]
    return {
      total: parseInt(row.total),
      pending: parseInt(row.pending),
      completed: parseInt(row.completed),
      expired: parseInt(row.expired),
      totalPointsEarned: parseInt(row.total_points_earned)
    }
  }
}

// PUBLIC_INTERFACE
/**
 * List all referrals with pagination
 * @param {number} limit - Max records to return (default: 50)
 * @param {number} offset - Number of records to skip (default: 0)
 * @returns {Promise<Array>} - Array of referral records
 */
async function getAllReferrals(limit = 50, offset = 0) {
  const useSupabase = useSupabaseFor('referrals')
  
  if (useSupabase) {
    // Supabase path
    if (!supabase) {
      throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY.')
    }
    
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    return data || []
  } else {
    // PostgreSQL path
    const pool = getPostgresPool()
    const result = await pool.query(
      'SELECT * FROM referrals ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    )
    return result.rows
  }
}

module.exports = {
  getReferralsByUser,
  getReferralByCode,
  createReferral,
  updateReferralStatus,
  completeReferralByCode,
  getReferralStats,
  getAllReferrals,
  generateReferralCode
}
