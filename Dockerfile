FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

COPY gradle/ gradle/
COPY --chmod=0755 gradlew gradlew
COPY build.gradle.kts settings.gradle.kts ./
COPY src/ src/
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon bootJar

FROM eclipse-temurin:25-jre
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar

USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
