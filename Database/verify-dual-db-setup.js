#!/usr/bin/env node
/**
 * Dual-Database Setup Verification Script
 * 
 * This script checks if the dual-database setup is correctly configured.
 * Run with: node verify-dual-db-setup.js
 */

const fs = require('fs')
const path = require('path')

console.log('='.repeat(60))
console.log('Dual-Database Setup Verification')
console.log('='.repeat(60))
console.log('')

let allChecksPassed = true

// Check 1: Files exist
console.log('1. Checking required files...')
const requiredFiles = [
  'config/db-switch.js',
  'daos/loyaltyDao.js',
  'daos/referralsDao.js',
  'test-supabase-loyalty-referrals.js',
  'supabase-client.js',
  '../.env.example'
]

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${file}`)
  } else {
    console.log(`   ✗ ${file} - MISSING`)
    allChecksPassed = false
  }
})
console.log('')

// Check 2: Dependencies installed
console.log('2. Checking dependencies...')
const packageJsonPath = path.join(__dirname, 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
  
  const requiredDeps = ['pg', 'dotenv', '@supabase/supabase-js']
  requiredDeps.forEach(dep => {
    if (deps[dep] || fs.existsSync(path.join(__dirname, 'node_modules', dep))) {
      console.log(`   ✓ ${dep}`)
    } else {
      console.log(`   ✗ ${dep} - NOT INSTALLED`)
      allChecksPassed = false
    }
  })
} else {
  console.log('   ℹ No package.json found, checking node_modules...')
  const requiredDeps = ['pg', 'dotenv', '@supabase/supabase-js']
  requiredDeps.forEach(dep => {
    if (fs.existsSync(path.join(__dirname, 'node_modules', dep))) {
      console.log(`   ✓ ${dep}`)
    } else {
      console.log(`   ⚠ ${dep} - May not be installed`)
    }
  })
}
console.log('')

// Check 3: Module loading
console.log('3. Testing module loading...')
try {
  const dbSwitch = require('./config/db-switch')
  console.log('   ✓ config/db-switch.js loads correctly')
} catch (error) {
  console.log(`   ✗ config/db-switch.js failed: ${error.message}`)
  allChecksPassed = false
}

try {
  const loyaltyDao = require('./daos/loyaltyDao')
  console.log('   ✓ daos/loyaltyDao.js loads correctly')
} catch (error) {
  console.log(`   ✗ daos/loyaltyDao.js failed: ${error.message}`)
  allChecksPassed = false
}

try {
  const referralsDao = require('./daos/referralsDao')
  console.log('   ✓ daos/referralsDao.js loads correctly')
} catch (error) {
  console.log(`   ✗ daos/referralsDao.js failed: ${error.message}`)
  allChecksPassed = false
}
console.log('')

// Check 4: Configuration
console.log('4. Checking configuration...')
try {
  const { getConfigSummary, validateConfig } = require('./config/db-switch')
  
  const summary = getConfigSummary()
  console.log('   ✓ Configuration loaded')
  console.log(`   Master switch: ${summary.masterSwitch}`)
  console.log(`   Loyalty: ${summary.modules.loyalty.database}`)
  console.log(`   Referrals: ${summary.modules.referrals.database}`)
  
  const validation = validateConfig()
  if (validation.valid) {
    console.log('   ✓ Configuration valid')
  } else {
    console.log('   ⚠ Configuration warnings:')
    validation.warnings.forEach(w => console.log(`     - ${w}`))
  }
} catch (error) {
  console.log(`   ✗ Configuration check failed: ${error.message}`)
  allChecksPassed = false
}
console.log('')

// Check 5: Environment file
console.log('5. Checking environment configuration...')
const envExamplePath = path.join(__dirname, '../.env.example')
if (fs.existsSync(envExamplePath)) {
  const envContent = fs.readFileSync(envExamplePath, 'utf8')
  
  const requiredVars = [
    'SUPABASE_ENABLED',
    'SUPABASE_LOYALTY_ENABLED',
    'SUPABASE_REFERRALS_ENABLED',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ]
  
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`   ✓ ${varName} documented in .env.example`)
    } else {
      console.log(`   ✗ ${varName} missing from .env.example`)
      allChecksPassed = false
    }
  })
  
  const envPath = path.join(__dirname, '../.env')
  if (fs.existsSync(envPath)) {
    console.log('   ✓ .env file exists')
  } else {
    console.log('   ℹ .env file not found (copy from .env.example)')
  }
} else {
  console.log('   ✗ .env.example not found')
  allChecksPassed = false
}
console.log('')

// Check 6: Documentation
console.log('6. Checking documentation...')
const docFiles = [
  'MIGRATION_GUIDE_DUAL_DB.md',
  'README_DUAL_DB.md',
  'DUAL_DB_IMPLEMENTATION_SUMMARY.md'
]

docFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${file}`)
  } else {
    console.log(`   ⚠ ${file} - Optional documentation missing`)
  }
})
console.log('')

// Summary
console.log('='.repeat(60))
if (allChecksPassed) {
  console.log('✅ ALL CHECKS PASSED')
  console.log('')
  console.log('Your dual-database setup is ready!')
  console.log('')
  console.log('Next steps:')
  console.log('1. Copy .env.example to .env and configure credentials')
  console.log('2. Run test suite: node test-supabase-loyalty-referrals.js')
  console.log('3. Integrate DAOs into your backend API')
  console.log('4. Review documentation in MIGRATION_GUIDE_DUAL_DB.md')
} else {
  console.log('⚠️  SOME CHECKS FAILED')
  console.log('')
  console.log('Please review the failures above and:')
  console.log('1. Ensure all files are present')
  console.log('2. Install missing dependencies: npm install')
  console.log('3. Check for any error messages')
}
console.log('='.repeat(60))
console.log('')

process.exit(allChecksPassed ? 0 : 1)
