# Group Chat

A self-hosted group chat template built with Java 25, Spring Boot, and PostgreSQL.
Download or fork the project, run your own chat, and adapt the code to your needs.

## Current features

- One shared chat room with a browser interface.
- Join by entering a display name; the browser session identifies you.
- Send text messages and view message history with names and timestamps.
- View registered participants. This is not an online presence indicator.
- Messages and participants refresh every two seconds.
- Store messages and participants in PostgreSQL.

The current version has no password-based accounts, private rooms, or access control.
Anyone who can reach the application can join and read the chat. Use it on a trusted
network or put access control in front of it before sharing it publicly.

## Quick start with Docker

Install Docker with the Compose plugin (Docker Desktop includes both) and start Docker.
You do not need to install Java, Gradle, or PostgreSQL on your computer for this option.

1. Download and extract the repository ZIP, or clone it:

   ```bash
   git clone https://github.com/alex-lib/group-chat.git
   cd group-chat
   ```

2. Copy the example configuration:

   ```bash
   cp .env.example .env
   ```

   In Windows PowerShell, use `Copy-Item .env.example .env`.
   Edit `.env` and replace `DB_PASSWORD` with your own password. Leave `CHAT_PORT=8080`
   or choose another available port. The `.env` file is ignored by Git.

3. Build and start the chat and database:

   ```bash
   docker compose up -d --build
   docker compose logs -f app
   ```

   The first build downloads the Java images, Gradle, and dependencies and may take a few minutes.
   Wait for `Started Application` in the log. Press `Ctrl+C` to stop following the log;
   the containers keep running.

4. Open http://localhost:8080 (or your configured port) and enter a display name.
   To try a second participant, use another browser or a private browsing window.
   Another device on the same network can use `http://<server-address>:8080` if the firewall allows it.

The database is available only inside the Compose network. The app waits for the database
health check before starting, and Hibernate creates or updates the tables automatically.
The browser needs internet access to load jQuery from its CDN.

## Stop, restart, and keep your data

```bash
docker compose down
docker compose up -d
```

Messages and participants are stored in the named `postgres-data` volume and survive
container restarts, rebuilds, and `docker compose down`. Do not add `--volumes` to `down`
unless you intend to delete the chat data. A volume is not a backup.

Browser sessions are kept in application memory. After an application restart or session
expiration, enter your name again; the previous messages remain in the database.

After changing source code, rebuild with `docker compose up -d --build`.
To inspect the running services, use `docker compose ps` or `docker compose logs -f app db`.

## Run with a local JDK

Use this option when developing the chat in your IDE or connecting to an existing database.
Install JDK 25 and PostgreSQL. The Docker setup uses PostgreSQL 19.0.
Gradle is provided by the checked-in Wrapper.

Create the database and user using an administrative PostgreSQL connection:

```sql
CREATE USER chat WITH PASSWORD 'your-database-password';
CREATE DATABASE chat OWNER chat;
```

Set the connection variables and start the application:

```bash
export DB_URL='jdbc:postgresql://localhost:5432/chat'
export DB_USERNAME='chat'
export DB_PASSWORD='your-database-password'
./gradlew bootRun
```

On Windows PowerShell:

```powershell
$env:DB_URL = 'jdbc:postgresql://localhost:5432/chat'
$env:DB_USERNAME = 'chat'
$env:DB_PASSWORD = 'your-database-password'
.\gradlew.bat bootRun
```

Open http://localhost:8080. The `.env` file is read by Docker Compose; local Java and Gradle
runs need the environment variables above or equivalent IDE run configuration settings.

To build and run the executable JAR instead:

```bash
./gradlew bootJar
java -jar build/libs/group-chat-1.0-SNAPSHOT.jar
```

The JAR uses the same environment variables. Set `SERVER_PORT` to change the port for a local run.
In IntelliJ IDEA, import the project as Gradle and select JDK 25 as the Gradle JVM.

## Configuration

| Variable | Default | Used by |
| --- | --- | --- |
| `DB_PASSWORD` | Required for Docker; empty for local runs | PostgreSQL credentials |
| `CHAT_PORT` | `8080` | Docker Compose host port |
| `DB_URL` | `jdbc:postgresql://localhost:5432/chat` | Local Java runs; Compose sets the internal address |
| `DB_USERNAME` | `chat` | Local Java runs; Compose uses `chat` |
| `SERVER_PORT` | `8080` | Local Java HTTP port |

PostgreSQL initializes the user and password only when its data volume is empty.
Changing `DB_PASSWORD` in `.env` later does not change an existing database user's password;
update the password in PostgreSQL as well before restarting the app.

This setup starts a PostgreSQL database; it does not migrate data from the earlier MySQL version.

## Customize the template

- Page structure: `src/main/resources/static/index.html`
- Appearance: `src/main/resources/static/css/styles.css`
- Browser behavior: `src/main/resources/static/js/chat.js`
- Chat endpoints: `src/main/java/org/my/controllers/ChatController.java`
- Application configuration: `src/main/resources/application.properties`

For feature requests or questions: docode@inbox.ru / tg: @exceedspace.
