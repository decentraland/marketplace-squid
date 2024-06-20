#!/bin/sh

# Generate a unique schema name and user credentials using a timestamp
SCHEMA_NAME="schema_$(date +%s)"
NEW_DB_USER="user_$(date +%s)"

# Connect to the database and create the new schema and user
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_PASSWORD" <<-EOSQL
  CREATE SCHEMA $SCHEMA_NAME;
  CREATE USER $NEW_DB_USER WITH PASSWORD '$DB_PASSWORD';
  GRANT ALL PRIVILEGES ON SCHEMA $SCHEMA_NAME TO $NEW_DB_USER;
  ALTER USER $NEW_DB_USER SET search_path TO $SCHEMA_NAME;
EOSQL

# Construct the DB_URL with the new user
export DB_URL=postgresql://$NEW_DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Build the squid
sqd build

# Start the processor service and the GraphQL server
sqd run . &

