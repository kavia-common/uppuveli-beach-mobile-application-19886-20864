#!/bin/bash

# Supabase Client Library Installation Script
# This script installs the Supabase JavaScript client library

echo "======================================"
echo "Supabase Client Library Installation"
echo "======================================"
echo ""

# Check if we're in a Node.js project
if [ ! -f "package.json" ]; then
    echo "⚠️  No package.json found in current directory"
    echo "Creating a basic package.json..."
    
    cat > package.json << 'EOF'
{
  "name": "uppuveli-beach-database",
  "version": "1.0.0",
  "description": "Database utilities and Supabase integration for Uppuveli Beach",
  "main": "supabase-client.js",
  "scripts": {
    "test": "echo \"No tests specified\""
  },
  "keywords": ["supabase", "database", "hotel"],
  "author": "",
  "license": "ISC"
}
EOF
    echo "✓ package.json created"
    echo ""
fi

# Install Supabase client
echo "Installing @supabase/supabase-js..."
npm install @supabase/supabase-js

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Supabase client library installed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Add your Supabase credentials to .env file:"
    echo "   SUPABASE_URL=https://nlzykbtuyoqfdnqtxdyh.supabase.co"
    echo "   SUPABASE_ANON_KEY=<your_anon_key>"
    echo "   SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>"
    echo ""
    echo "2. Get your API keys from:"
    echo "   https://supabase.com/dashboard/project/nlzykbtuyoqfdnqtxdyh/settings/api"
    echo ""
    echo "3. Use the client in your code:"
    echo "   const { supabase } = require('./supabase-client')"
    echo ""
    echo "4. Review the migration guide:"
    echo "   cat MIGRATION_GUIDE.md"
    echo ""
else
    echo "✗ Installation failed!"
    echo "Please check your internet connection and try again."
    exit 1
fi
