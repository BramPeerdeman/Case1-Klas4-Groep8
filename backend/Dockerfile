# Builden
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Kopieer eerst alleen de project file en restore de dependencies (voor betere caching)
COPY ["backend.csproj", "./"]
RUN dotnet restore "backend.csproj"

# Kopieer nu de rest van de code en bouw de app
COPY . .
RUN dotnet publish "backend.csproj" -c Release -o /app/publish

# De Runtime (het pakketje dat we echt gaan draaien)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "backend.dll"]