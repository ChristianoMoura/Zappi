# Imagem do backend para o Render (Web Service Docker, plano gratuito: 0,1 CPU e 512 MB).

# Etapa 1: compila o backend.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# As dependências ficam em uma camada própria: só são baixadas de novo quando o pom.xml muda.
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY src/ src/
# Os testes rodam no CI (ZAP-81); aqui só se gera o .jar.
RUN mvn -B -q -DskipTests package

# Etapa 2: só o Java necessário para rodar a aplicação.
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S zappi && adduser -S zappi -G zappi
COPY --from=build /app/target/*.jar app.jar
USER zappi

ENV SPRING_PROFILES_ACTIVE=prod
# Memória e inicialização ajustadas para 512 MB e pouca CPU:
# heap de até 60% da memória, coletor de lixo simples e compilação mais leve.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
