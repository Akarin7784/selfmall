# Build the JARs with ./mvnw clean verify before building service images.
ARG JAVA_IMAGE=eclipse-temurin:21-jre-jammy
FROM ${JAVA_IMAGE}
ARG SERVICE
WORKDIR /app
RUN groupadd --gid 10001 mall && useradd --uid 10001 --gid mall --create-home mall
COPY --chown=10001:10001 ${SERVICE}/target/${SERVICE}-0.1.0-SNAPSHOT.jar /app/app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
