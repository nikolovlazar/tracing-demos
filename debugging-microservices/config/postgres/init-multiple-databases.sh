#!/bin/bash

set -e
set -u

function create_user_and_database() {
	local database=$1
	echo "Creating database '$database'"
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
	    CREATE DATABASE $database;
	    GRANT ALL PRIVILEGES ON DATABASE $database TO app_user;
EOSQL

	# Set up schema permissions for app_user
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database" <<-EOSQL
	    CREATE SCHEMA IF NOT EXISTS public;
	    GRANT ALL ON SCHEMA public TO app_user;
	    GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
	    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_user;
	    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO app_user;
	    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
	    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;
	    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO app_user;
EOSQL
}

# Create Kong database and user with proper permissions first
echo "Creating Kong database and user"

# Create Kong user if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    DO
    \$do\$
    BEGIN
       IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kong') THEN
          CREATE USER kong WITH PASSWORD 'kong';
       END IF;
    END
    \$do\$;
EOSQL

# Create app_user if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    DO
    \$do\$
    BEGIN
       IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
          CREATE USER app_user WITH PASSWORD '$POSTGRES_PASSWORD_APP';
       END IF;
    END
    \$do\$;
EOSQL

# Create Kong database if it doesn't exist
if ! psql -lqt | cut -d \| -f 1 | grep -qw kong; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE DATABASE kong;
        GRANT ALL PRIVILEGES ON DATABASE kong TO kong;
EOSQL
fi

# Now set up Kong schema permissions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "kong" <<-EOSQL
    CREATE SCHEMA IF NOT EXISTS public;
    GRANT ALL ON SCHEMA public TO kong;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO kong;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO kong;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO kong;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kong;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kong;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO kong;
EOSQL
echo "Kong database and user created with proper permissions"

# Create other databases
if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
	echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
	for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
		# Skip kong as it's already created
		if [ "$db" != "kong" ]; then
			create_user_and_database $db
		fi
	done
	echo "Multiple databases created"
fi