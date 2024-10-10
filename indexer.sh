#!/bin/sh

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Generate a unique schema name and user credentials using a timestamp
CURRENT_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
NEW_SCHEMA_NAME="marketplace_squid_${CURRENT_TIMESTAMP}"
NEW_DB_USER="marketplace_squid_user_${CURRENT_TIMESTAMP}"
SQUID_READER_USER="marketplace_squid_api_reader"
API_READER_USER="dapps_marketplace_user"

# Check if required environment variables are set
if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
  echo "Error: Required environment variables are not set."
  echo "Ensure DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, and DB_PORT are set."
  exit 1
fi

# Log the generated variables
echo "Generated schema name: $NEW_SCHEMA_NAME"
echo "Generated user: $NEW_DB_USER"

# Set PGPASSWORD to handle password prompt
export PGPASSWORD=$DB_PASSWORD

# Connect to the database and create the new schema and user
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" --host "$DB_HOST" --port "$DB_PORT" <<-EOSQL
  CREATE SCHEMA $NEW_SCHEMA_NAME;
  CREATE USER $NEW_DB_USER WITH PASSWORD '$DB_PASSWORD';
  GRANT ALL PRIVILEGES ON SCHEMA $NEW_SCHEMA_NAME TO $NEW_DB_USER;
  GRANT ALL PRIVILEGES ON SCHEMA $NEW_SCHEMA_NAME TO $SQUID_READER_USER;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA $NEW_SCHEMA_NAME TO $SQUID_READER_USER;
  GRANT ALL PRIVILEGES ON SCHEMA $NEW_SCHEMA_NAME TO $API_READER_USER;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA $NEW_SCHEMA_NAME TO $API_READER_USER;
  GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $NEW_DB_USER;
  ALTER USER $NEW_DB_USER SET search_path TO $NEW_SCHEMA_NAME;
EOSQL

# Unset PGPASSWORD
unset PGPASSWORD

# Construct the DB_URL with the new user
export DB_URL=postgresql://$NEW_DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
export DB_SCHEMA=$NEW_SCHEMA_NAME

# Log the constructed DB_URL
echo "Exported DB_SCHEMA: $DB_SCHEMA"

# Start the processor service and the GraphQL server, and write logs to a file
LOG_FILE="sqd_run_log_${CURRENT_TIMESTAMP}.txt"
echo "Starting squid services..."

# Start the squid services and limit the CPU usage to 90% using cpulimit
nohup sqd run:marketplace > "$LOG_FILE" 2>&1 &

echo "Logs are being written to $LOG_FILE"
