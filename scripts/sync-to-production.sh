#!/bin/bash
# Script to export data from localhost and import to production
# Usage: ./scripts/sync-to-production.sh

set -e

echo "🔄 Syncing data from localhost to production..."
echo ""

# Step 1: Export from localhost
echo "📦 Step 1: Exporting data from localhost database..."
echo "   (Using localhost:5432/fullstori)"

# Use local database URL
export DATABASE_URL="postgresql://tatenda@localhost:5432/fullstori"
npm run db:export

if [ ! -f "prisma/data-export.json" ]; then
    echo "❌ Export file not created. Aborting."
    exit 1
fi

echo ""
echo "✅ Export completed"
echo ""

# Step 2: Import to production
echo "📥 Step 2: Importing data to production database..."
echo "   (Using DATABASE_URL from .env.production)"

# Load production DATABASE_URL
export $(grep -v '^#' .env.production | grep DATABASE_URL | head -1 | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in .env.production"
    echo "   Run: vercel env pull .env.production --environment=production"
    exit 1
fi

echo "   Database: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/g')"
echo ""
read -p "⚠️  This will DELETE all existing data in production. Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
fi

npm run db:import

echo ""
echo "✅ Data sync completed successfully!"
echo ""
echo "You can verify by:"
echo "  1. Checking your Vercel deployment"
echo "  2. Running: DATABASE_URL='your-prod-url' npx prisma studio"
