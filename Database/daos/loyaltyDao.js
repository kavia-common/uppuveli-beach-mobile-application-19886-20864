/**
 * Loyalty Data Access Object (DAO)
 * 
 * Provides CRUD operations for loyalty points and tier management.
 * Routes operations to either Supabase or local PostgreSQL based on feature flags.
 */

const { useSupabaseFor } = require('../config/db-switch')
const { supabase, supabaseAdmin } = require('../supabase-client')

// Lazy-load PostgreSQL pool to avoid errors if not needed
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
 * Tier thresholds
 */
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 1000,
  gold: 5000,
  platinum: 10000
}

/**
 * Determine tier based on points
 * @param {number} points - Loyalty points
 * @returns {string} - Tier name
 */
function calculateTier(points) {
  if (points >= TIER_THRESHOLDS.platinum) return 'platinum'
  if (points >= TIER_THRESHOLDS.gold) return 'gold'
  if (points >= TIER_THRESHOLDS.silver) return 'silver'
  return 'bronze'
}

// PUBLIC_INTERFACE
/**
 * Get loyalty information for a user
 * @param {number} userId - User ID
 * @returns {Promise<object|null>} - Loyalty record or null if not found
 */
async function getLoyaltyByUser(userId) {
  const useSupabase = useSupabaseFor('loyalty')
  
  if (useSupabase) {
    // Supabase path
    if (!supabase) {
      throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY.')
    }
    
    const { data, error } = await supabase
      .from('loyalty')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    return data
  } else {
    // PostgreSQL path
    const pool = getPostgresPool()
    const result = await pool.query(
      'SELECT * FROM loyalty WHERE user_id = $1',
      [userId]
    )
    return result.rows.length > 0 ? result.rows[0] : null
  }
}

// PUBLIC_INTERFACE
/**
 * Create loyalty record for a new user
 * @param {number} userId - User ID
 * @param {number} initialPoints - Initial points (default: 0)
 * @returns {Promise<object>} - Created loyalty record
 */
async function createLoyalty(userId, initialPoints = 0) {
  const useSupabase = useSupabaseFor('loyalty')
  const tier = calculateTier(initialPoints)
  
  if (useSupabase) {
    // Supabase path
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.')
    }
    
    const { data, error } = await supabaseAdmin
      .from('loyalty')
      .insert({
        user_id: userId,
        points: initialPoints,
        tier: tier
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
      'INSERT INTO loyalty (user_id, points, tier) VALUES ($1, $2, $3) RETURNING *',
      [userId, initialPoints, tier]
    )
    return result.rows[0]
  }
}

// PUBLIC_INTERFACE
/**
 * Add points to a user's loyalty account
 * @param {number} userId - User ID
 * @param {number} points - Points to add
 * @returns {Promise<object>} - Updated loyalty record
 */
async function addPoints(userId, points) {
  const useSupabase = useSupabaseFor('loyalty')
  
  if (useSupabase) {
    // Supabase path: Get current points, calculate new total and tier
    const current = await getLoyaltyByUser(userId)
    if (!current) {
      throw new Error(`Loyalty record not found for user ${userId}`)
    }
    
    const newPoints = current.points + points
    const newTier = calculateTier(newPoints)
    
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.')
    }
    
    const { data, error } = await supabaseAdmin
      .from('loyalty')
      .update({
        points: newPoints,
        tier: newTier,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
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
      `UPDATE loyalty 
       SET points = points + $1, 
           tier = CASE 
             WHEN points + $1 >= 10000 THEN 'platinum'
             WHEN points + $1 >= 5000 THEN 'gold'
             WHEN points + $1 >= 1000 THEN 'silver'
             ELSE 'bronze'
           END,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [points, userId]
    )
    
    if (result.rows.length === 0) {
      throw new Error(`Loyalty record not found for user ${userId}`)
    }
    
    return result.rows[0]
  }
}

// PUBLIC_INTERFACE
/**
 * Set user's tier manually (admin operation)
 * @param {number} userId - User ID
 * @param {string} tier - Tier name (bronze, silver, gold, platinum)
 * @returns {Promise<object>} - Updated loyalty record
 */
async function setTier(userId, tier) {
  const validTiers = ['bronze', 'silver', 'gold', 'platinum']
  if (!validTiers.includes(tier)) {
    throw new Error(`Invalid tier: ${tier}. Must be one of: ${validTiers.join(', ')}`)
  }
  
  const useSupabase = useSupabaseFor('loyalty')
  
  if (useSupabase) {
    // Supabase path
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.')
    }
    
    const { data, error } = await supabaseAdmin
      .from('loyalty')
      .update({
        tier: tier,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
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
      'UPDATE loyalty SET tier = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
      [tier, userId]
    )
    
    if (result.rows.length === 0) {
      throw new Error(`Loyalty record not found for user ${userId}`)
    }
    
    return result.rows[0]
  }
}

// PUBLIC_INTERFACE
/**
 * Upsert loyalty record (create if not exists, update if exists)
 * @param {number} userId - User ID
 * @param {number} points - Points to set
 * @param {string} tier - Tier to set (optional, will be calculated if not provided)
 * @returns {Promise<object>} - Loyalty record
 */
async function upsertLoyalty(userId, points, tier = null) {
  const calculatedTier = tier || calculateTier(points)
  const useSupabase = useSupabaseFor('loyalty')
  
  if (useSupabase) {
    // Supabase path: Use upsert
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.')
    }
    
    const { data, error } = await supabaseAdmin
      .from('loyalty')
      .upsert({
        user_id: userId,
        points: points,
        tier: calculatedTier,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    return data
  } else {
    // PostgreSQL path: Use INSERT ... ON CONFLICT
    const pool = getPostgresPool()
    const result = await pool.query(
      `INSERT INTO loyalty (user_id, points, tier)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         points = $2,
         tier = $3,
         updated_at = NOW()
       RETURNING *`,
      [userId, points, calculatedTier]
    )
    
    return result.rows[0]
  }
}

// PUBLIC_INTERFACE
/**
 * Get all loyalty records with pagination
 * @param {number} limit - Max records to return (default: 50)
 * @param {number} offset - Number of records to skip (default: 0)
 * @returns {Promise<Array>} - Array of loyalty records
 */
async function getAllLoyalty(limit = 50, offset = 0) {
  const useSupabase = useSupabaseFor('loyalty')
  
  if (useSupabase) {
    // Supabase path
    if (!supabase) {
      throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY.')
    }
    
    const { data, error } = await supabase
      .from('loyalty')
      .select('*')
      .order('points', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    return data || []
  } else {
    // PostgreSQL path
    const pool = getPostgresPool()
    const result = await pool.query(
      'SELECT * FROM loyalty ORDER BY points DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    )
    return result.rows
  }
}

module.exports = {
  getLoyaltyByUser,
  createLoyalty,
  addPoints,
  setTier,
  upsertLoyalty,
  getAllLoyalty,
  calculateTier,
  TIER_THRESHOLDS
}
