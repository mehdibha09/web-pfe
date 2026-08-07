FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml ./
COPY src src
RUN mvn clean package -DskipTests -q

FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update -qq && apt-get install -y -qq curl gnupg openssh-client && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/*.jar /app/app.jar

EXPOSE 8081
ENV SPRING_PROFILES_ACTIVE=prod

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
