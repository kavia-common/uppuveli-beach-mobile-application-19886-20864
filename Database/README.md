# Database Container (PostgreSQL)

This folder contains assets and helper scripts to run and manage the PostgreSQL database for the Uppuveli Beach project.

Key points:
- Default PostgreSQL port for this project is 5001
- Core env vars: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT
- You can apply schema and seed files via psql

## 1) Environment Variables

Create a `.env` file based on `.env.example`:

Required variables:
- POSTGRES_DB: Database name (e.g., myapp)
- POSTGRES_USER: Username (e.g., appuser)
- POSTGRES_PASSWORD: User password
- POSTGRES_PORT: Port to run PostgreSQL on (default: 5001)

Example:
```
POSTGRES_DB=myapp
POSTGRES_USER=appuser
POSTGRES_PASSWORD=dbuser123
POSTGRES_PORT=5001
```

Note:
- Some helper scripts included in this repo historically used port 5000. The canonical default for this project is 5001. Ensure your scripts/services use the same port consistently.

## 2) Starting PostgreSQL

This repository includes helper scripts (e.g., `startup.sh`) that may be used in certain environments to bootstrap a local PostgreSQL instance. If you are running this in Docker or a managed Postgres service, follow your platform’s standard steps using the `.env` variables above.

Generic local steps (one of the following):

- Using Docker (recommended for local dev):
```
# ensure .env is present
# You can also set POSTGRES_HOST_AUTH_METHOD=trust for local-only setups (not recommended for prod)
docker run --name uppuveli-db \
  -e POSTGRES_DB=${POSTGRES_DB} \
  -e POSTGRES_USER=${POSTGRES_USER} \
  -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
  -p ${POSTGRES_PORT}:5432 \
  -d postgres:16
```

- Using a local Postgres installation:
  - Ensure Postgres is installed and running
  - Create the database and user per your `.env` values if needed

## 3) Connecting with psql

Once PostgreSQL is running, you can connect using:
```
psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"
```

Or:
```
psql -h localhost -U ${POSTGRES_USER} -d ${POSTGRES_DB} -p ${POSTGRES_PORT}
```

If prompted for a password, enter `POSTGRES_PASSWORD`.

## 4) Applying schema.sql and seed.sql

If you have `schema.sql` and/or `seed.sql` files in this folder (or another known location), you can apply them with `psql`.

- Apply schema.sql:
```
psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}" -f schema.sql
```

- Apply seed.sql:
```
psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}" -f seed.sql
```

Alternatively, using psql flags:
```
psql -h localhost -U ${POSTGRES_USER} -d ${POSTGRES_DB} -p ${POSTGRES_PORT} -f schema.sql
psql -h localhost -U ${POSTGRES_USER} -d ${POSTGRES_DB} -p ${POSTGRES_PORT} -f seed.sql
```

Order matters: run `schema.sql` first to create objects, then `seed.sql` to populate data.

## 5) Verifying

After applying schema/seed:
```
psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}" -c "\dt"
psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}" -c "SELECT * FROM <your_table> LIMIT 5;"
```

## 6) Troubleshooting

- Port conflicts: Ensure nothing else is using `${POSTGRES_PORT}` (default 5001). Change the port in `.env` if needed.
- Authentication failures: Verify `POSTGRES_USER` and `POSTGRES_PASSWORD` are correct and that the DB is reachable on `localhost:${POSTGRES_PORT}`.
- Applying SQL files: Make sure your current working directory is where `schema.sql` and `seed.sql` reside, or pass absolute paths to `-f`.

## 7) Security Note

Do not commit your actual `.env` file to source control. Use `.env.example` as a template and keep secrets in your local `.env` or your deployment platform’s secret manager.
