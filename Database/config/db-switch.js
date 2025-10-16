/**
 * Database Switch Configuration
 * 
 * This module manages feature flags for dual-database routing:
 * - Loyalty and Referrals modules can route to Supabase
 * - Other modules (Users, Bookings, Payments, Inventory) remain on local PostgreSQL
 * 
 * Environment Variables:
 * - SUPABASE_ENABLED: Master switch for Supabase (default: false)
 * - SUPABASE_LOYALTY_ENABLED: Route loyalty operations to Supabase (default: true if SUPABASE_ENABLED)
 * - SUPABASE_REFERRALS_ENABLED: Route referrals operations to Supabase (default: true if SUPABASE_ENABLED)
 */

// Load environment variables
const SUPABASE_ENABLED = process.env.SUPABASE_ENABLED === 'true'
const SUPABASE_LOYALTY_ENABLED = process.env.SUPABASE_LOYALTY_ENABLED === 'true' || SUPABASE_ENABLED
const SUPABASE_REFERRALS_ENABLED = process.env.SUPABASE_REFERRALS_ENABLED === 'true' || SUPABASE_ENABLED

/**
 * Configuration object for database routing
 */
const dbConfig = {
  // Master switch
  supabaseEnabled: SUPABASE_ENABLED,
  
  // Module-specific switches
  modules: {
    loyalty: {
      useSupabase: SUPABASE_LOYALTY_ENABLED,
      description: 'Loyalty points and tier management'
    },
    referrals: {
      useSupabase: SUPABASE_REFERRALS_ENABLED,
      description: 'Referral code and reward tracking'
    },
    // These remain on local PostgreSQL
    users: {
      useSupabase: false,
      description: 'User profiles and authentication (PostgreSQL only)'
    },
    bookings: {
      useSupabase: false,
      description: 'Room reservations (PostgreSQL only)'
    },
    payments: {
      useSupabase: false,
      description: 'Payment transactions (PostgreSQL only)'
    },
    inventory: {
      useSupabase: false,
      description: 'Boutique/gift shop items (PostgreSQL only)'
    }
  }
}

/**
 * Helper function to check if a module uses Supabase
 * @param {string} moduleName - Name of the module (e.g., 'loyalty', 'referrals')
 * @returns {boolean} - True if module should use Supabase
 */
function useSupabaseFor(moduleName) {
  const module = dbConfig.modules[moduleName]
  if (!module) {
    console.warn(`Unknown module: ${moduleName}. Defaulting to PostgreSQL.`)
    return false
  }
  return module.useSupabase === true
}

/**
 * Get current database configuration summary
 * @returns {object} - Configuration summary
 */
function getConfigSummary() {
  const summary = {
    masterSwitch: dbConfig.supabaseEnabled,
    modules: {}
  }
  
  for (const [name, config] of Object.entries(dbConfig.modules)) {
    summary.modules[name] = {
      database: config.useSupabase ? 'Supabase' : 'PostgreSQL',
      description: config.description
    }
  }
  
  return summary
}

/**
 * Validate configuration
 * @returns {object} - Validation result with warnings
 */
function validateConfig() {
  const warnings = []
  
  // Check if Supabase modules are enabled but credentials are missing
  if (dbConfig.modules.loyalty.useSupabase || dbConfig.modules.referrals.useSupabase) {
    if (!process.env.SUPABASE_URL) {
      warnings.push('SUPABASE_URL is not set. Supabase operations will fail.')
    }
    if (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_KEY) {
      warnings.push('SUPABASE_ANON_KEY is not set. Supabase operations may fail.')
    }
  }
  
  // Check if PostgreSQL modules need PostgreSQL connection
  const postgresModules = Object.entries(dbConfig.modules)
    .filter(([_, config]) => !config.useSupabase)
    .map(([name]) => name)
  
  if (postgresModules.length > 0 && !process.env.POSTGRES_URL) {
    warnings.push(`PostgreSQL connection not configured. Modules requiring PostgreSQL: ${postgresModules.join(', ')}`)
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  }
}

// Log configuration on module load
if (process.env.NODE_ENV !== 'test') {
  console.log('Database Switch Configuration Loaded:')
  console.log(`  Master Switch (SUPABASE_ENABLED): ${dbConfig.supabaseEnabled}`)
  console.log(`  Loyalty -> ${dbConfig.modules.loyalty.useSupabase ? 'Supabase' : 'PostgreSQL'}`)
  console.log(`  Referrals -> ${dbConfig.modules.referrals.useSupabase ? 'Supabase' : 'PostgreSQL'}`)
  console.log(`  Users -> PostgreSQL`)
  console.log(`  Bookings -> PostgreSQL`)
  console.log(`  Payments -> PostgreSQL`)
  console.log(`  Inventory -> PostgreSQL`)
  
  const validation = validateConfig()
  if (!validation.valid) {
    console.warn('Configuration warnings:')
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
}

module.exports = {
  dbConfig,
  useSupabaseFor,
  getConfigSummary,
  validateConfig
}
