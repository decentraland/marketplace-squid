#!/bin/sh

# Generate a unique schema name and user credentials using a timestamp
NEW_SCHEMA_NAME="marketplace_squid_$(date +%s)"
NEW_DB_USER="marketplace_squid_user_$(date +%s)"

# Check if required environment variables are set
if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
  echo "Error: Required environment variables are not set."
  echo "Ensure DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, and DB_PORT are set."
  exit 1
fi

# Log the generated variables
echo "Generated schema name: $NEW_SCHEMA_NAME"
echo "Generated user: $NEW_DB_USER"

# Connect to the database and create the new schema and user
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" --host "$DB_HOST" --port "$DB_PORT" <<-EOSQL
  CREATE SCHEMA $NEW_SCHEMA_NAME;
  CREATE USER $NEW_DB_USER WITH PASSWORD '$DB_PASSWORD';
  GRANT ALL PRIVILEGES ON SCHEMA $NEW_SCHEMA_NAME TO $NEW_DB_USER;
  ALTER USER $NEW_DB_USER SET search_path TO $NEW_SCHEMA_NAME;
  GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $NEW_DB_USER;
EOSQL

# Construct the DB_URL with the new user
export DB_URL=postgresql://$NEW_DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
export DB_SCHEMA=$NEW_SCHEMA_NAME

# Log the constructed DB_URL
echo "Exported DB_SCHEMA: $DB_SCHEMA"

# Build the squid
echo "Building squid..."
sqd build

# Start the processor service and the GraphQL server
echo "Starting squid services..."
sqd run .
