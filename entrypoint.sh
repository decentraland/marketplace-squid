# Generate a unique schema name using a timestamp
SCHEMA_NAME="schema_$(date +%s)"

# Connect to the database and create the new schema, and set it for squid-writer
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_PASSWORD" <<-EOSQL
  CREATE SCHEMA $SCHEMA_NAME;
  ALTER USER squid-writer SET search_path TO $SCHEMA_NAME;
EOSQL

# Construct the DB_URL with the squid-writer user
export DB_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Build the squid
sqd build

# Start the processor service and the GraphQL server
sqd run . &

# Wait for all background processes to finish
wait -n

# Exit with the status of the first failed process
exit $?