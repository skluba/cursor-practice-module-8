-- Provision DB role/db for SonarQube CE (runs only on first PostgreSQL data volume init).
-- If your Postgres volume already existed before this script was added, create manually — see README.
CREATE USER sonar WITH PASSWORD 'sonar';
CREATE DATABASE sonar OWNER sonar;
