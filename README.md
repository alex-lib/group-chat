# Group Chat

A self-hosted group chat template built with Java 25, Spring Boot, and PostgreSQL.
Download or fork the project, run your own chat, and adapt the code to your needs.

## Current features

- One shared chat room with a browser interface.
- Register an account with a name and password, then sign in.
- Sign out and sign back in from another browser or device.
- Send text messages and view message history with names and timestamps.
- View registered participants. This is not an online presence indicator.
- Messages and participants refresh every two seconds.
- Store messages and participants in PostgreSQL.

Messages and participants are visible only after signing in. Registration is open:
anyone who can reach the application can create an account and join the shared room.
There are no private rooms or administrator approval. Use HTTPS when exposing the chat
outside a trusted local environment; passwords must not travel over public HTTP connections.

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

4. Open http://localhost:8080 (or your configured port), choose **Create an account**,
   and register a name and password. Then sign in with the same credentials.
   To try a second participant, register another account in a private browsing window.
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
expiration, sign in again with your existing account; accounts and messages remain in the database.

## Accounts and passwords

Names contain 3–32 letters, numbers, underscores or hyphens. Names are case-insensitive
when signing in and must be unique. Passwords are case-sensitive and require at least
12 characters. The maximum is 72 UTF-8 bytes, so non-ASCII characters may reach the limit sooner.
Passwords are stored as salted bcrypt hashes, never as plain text.

Use **Sign out** to end the current browser session. The same account can sign in from
multiple devices. Password reset and account deletion are not implemented yet.

The application uses Spring Security sessions and CSRF protection. Spring Security issues
an `XSRF-TOKEN` cookie; the browser sends it in the `X-XSRF-TOKEN` header with registration,
login, logout and message requests. The session cookie remains inaccessible to JavaScript.
Chat endpoints return `401` when the session is not authenticated.

When deploying behind HTTPS, set `SERVER_SERVLET_SESSION_COOKIE_SECURE=true` in the app
container's environment so that its session cookie is sent only over HTTPS.

### Upgrading from the version without passwords

Existing messages and participant records are preserved, including duplicate old names.
Old records without passwords cannot sign in and cannot be claimed by registering the
same name. Register a new account with a different name. Database tables are updated
automatically; no data volume reset is required.

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
- Chat logic: `src/main/java/org/my/services/ChatService.java`
- Account registration: `src/main/java/org/my/services/ChatUserService.java`
- Access rules: `src/main/java/org/my/configurations/SecurityConfiguration.java`
- Application configuration: `src/main/resources/application.yaml`

For feature requests or questions: docode@inbox.ru / tg: @exceedspace.
