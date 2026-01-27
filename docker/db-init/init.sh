#!/bin/sh
set -e

echo "=== Agent UI Database Initialization ==="

# Validate environment
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is required"
  echo "Example: postgresql://user:password@host:5432/agent_ui"
  exit 1
fi

# Wait for database to be ready
echo "Waiting for database to be ready..."
MAX_RETRIES=${DB_MAX_RETRIES:-30}
RETRY_INTERVAL=${DB_RETRY_INTERVAL:-2}

for i in $(seq 1 $MAX_RETRIES); do
  if node -e "
    const postgres = require('postgres');
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });
    sql\`SELECT 1\`.then(() => { sql.end(); process.exit(0); }).catch(() => process.exit(1));
  " 2>/dev/null; then
    echo "Database is ready!"
    break
  fi

  if [ $i -eq $MAX_RETRIES ]; then
    echo "ERROR: Database not ready after $MAX_RETRIES attempts"
    exit 1
  fi

  echo "Attempt $i/$MAX_RETRIES - Database not ready, waiting ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

# Check if extensions exist (should be created by init-shared.sql)
echo "Verifying required extensions..."
node -e "
  const postgres = require('postgres');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  async function checkExtensions() {
    const extensions = await sql\`SELECT extname FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp')\`;
    const found = extensions.map(e => e.extname);

    if (!found.includes('vector')) {
      console.log('Creating vector extension...');
      await sql\`CREATE EXTENSION IF NOT EXISTS vector\`;
    }
    if (!found.includes('uuid-ossp')) {
      console.log('Creating uuid-ossp extension...');
      await sql\`CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"\`;
    }

    await sql.end();
    console.log('Extensions verified: vector, uuid-ossp');
  }

  checkExtensions().catch(e => { console.error(e); process.exit(1); });
"

# Run Drizzle push to sync schema
echo "Pushing database schema..."
npx drizzle-kit push --force

echo "=== Database initialization complete ==="
