# Group Chat

A self-hosted group chat template built with Java 25, Spring Boot, and PostgreSQL.
Download or fork the project, run your own chat, and adapt the code to your needs.

## Current features

- One shared chat room with a browser interface.
- Join with a display name and the shared password set by the chat owner.
- Sign out and join again from another browser or device without creating an account.
- Send text messages and view message history with names and timestamps.
- View participants who have joined the chat. This is not an online presence indicator.
- Messages and participants refresh every two seconds.
- Store messages and participants in PostgreSQL.

Messages and participants are visible only after entering the shared chat password.
Anyone who knows this password can join the shared room. There are no personal accounts,
private rooms, or verified identities. Use HTTPS when exposing the chat outside a trusted
local environment; passwords must not travel over public HTTP connections.

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
   Edit `.env`: replace `DB_PASSWORD` with your database password and set `CHAT_PASSWORD`
   to a different shared chat password of at least 12 characters. Give only `CHAT_PASSWORD`
   to participants. Leave `CHAT_PORT=8080` or choose another available port.
   The `.env` file is ignored by Git.

3. Build and start the chat and database:

   ```bash
   docker compose up -d --build
   docker compose logs -f app
   ```

   The first build downloads the Java images, Gradle, and dependencies and may take a few minutes.
   Wait for `Started Application` in the log. Press `Ctrl+C` to stop following the log;
   the containers keep running.

4. Open http://localhost:8080 (or your configured port), enter a display name and the
   shared chat password, then choose **Join chat**.
   To try a second participant, use a private browsing window and the same chat password.
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
expiration, enter a display name and the chat password again; messages remain in the database.

## Shared chat password

The owner sets `CHAT_PASSWORD` in `.env` for Docker or as an environment variable for a
local Java run. There is no default password. Startup fails if the password is missing,
blank, shorter than 12 characters, or longer than 72 UTF-8 bytes. Non-ASCII characters
may reach the limit sooner. The app hashes the configured password in memory and does
not save it in participant records.

Participants choose a display name of 1–32 characters and enter the same shared password.
Names are labels, not accounts: different participants may use the same name. Each successful
login creates a participant associated with that browser session. **Sign out** ends the
current session without affecting other participants. There is no registration or personal
password recovery.

To change the shared password, edit `CHAT_PASSWORD` in `.env`, then recreate the app:

```bash
docker compose up -d --force-recreate app
```

Recreating the app ends existing browser sessions. Participants must join again with the
new password. Messages and participant history remain in PostgreSQL. `docker compose restart`
alone does not reload changed environment variables. For a local Java run, restart the
application with the new `CHAT_PASSWORD` value.

The application uses Spring Security sessions and CSRF protection. Spring Security issues
an `XSRF-TOKEN` cookie; the browser sends it in the `X-XSRF-TOKEN` header with login, logout
and message requests. The session cookie remains inaccessible to JavaScript.
Chat endpoints return `401` when the session is not authenticated.

When deploying behind HTTPS, set `SERVER_SERVLET_SESSION_COOKIE_SECURE=true` in the app
container's environment so that its session cookie is sent only over HTTPS.

### Upgrading an existing chat

Existing messages and participant records are preserved. Set `CHAT_PASSWORD` before starting
the updated app, then join with that password. Earlier personal-account passwords are no
longer used. Database tables are updated automatically; no data volume reset is required.

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
export CHAT_PASSWORD='your-shared-chat-password'
./gradlew bootRun
```

On Windows PowerShell:

```powershell
$env:DB_URL = 'jdbc:postgresql://localhost:5432/chat'
$env:DB_USERNAME = 'chat'
$env:DB_PASSWORD = 'your-database-password'
$env:CHAT_PASSWORD = 'your-shared-chat-password'
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
| `CHAT_PASSWORD` | Required; no default | Shared password for all chat participants |
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
- Chat logic: `src/main/java/org/my/services/ChatService.java`
- Chat access and participants: `src/main/java/org/my/services/ChatUserService.java`
- Access rules: `src/main/java/org/my/configurations/SecurityConfiguration.java`
- Application configuration: `src/main/resources/application.yaml`

For feature requests or questions: docode@inbox.ru / tg: @exceedspace.
