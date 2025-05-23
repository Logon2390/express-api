# Discord AI Bot

Un bot de Discord que integra una API de IA personalizada para responder preguntas de los usuarios a través del comando `/ask`.

## 🚀 Características

- **Bot de Discord** con comando slash `/ask`
- **API Express** con endpoints RESTful
- **Integración con Chroma-API personalizada** a través de HTTP requests
- **Configuración basada en variables de entorno**
- **Logging completo** para debugging y monitoreo
- **Manejo de errores robusto**
- **CORS configurado** para seguridad
- **TypeScript** para type safety

## 📋 Requisitos Previos

- Node.js 16.x o superior
- npm o yarn
- Token de bot de Discord
- API de Chroma ejecutándose

## 🛠️ Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/Logon2390/express-api.git
   cd express-api
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env
   ```
   
   Edita el archivo `.env` con tus configuraciones:
   ```env
   # Discord Bot Configuration
   DISCORD_TOKEN=
   DISCORD_CLIENT_ID=
   
   # External AI API Configuration
   CHROMA_API_URL=http://localhost:9000/api/V1/
   CHROMA_API_TIMEOUT=30000
   
   # Express Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

4. **Construir el proyecto (para producción)**
   ```bash
   npm run build
   ```

## 🎮 Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## 🔧 Configuración del Bot de Discord

1. **Crear una aplicación en Discord Developer Portal**
   - Ve a https://discord.com/developers/applications
   - Crea una nueva aplicación
   - Ve a la sección "Bot" y crea un bot
   - Copia el token y úsalo como `DISCORD_TOKEN`
   - Copia el Application ID y úsalo como `DISCORD_CLIENT_ID`

2. **Permisos requeridos**
   - `applications.commands` (para slash commands)
   - `bot` (para funcionalidad básica del bot)

3. **Invitar el bot a tu servidor**
   - Genera una URL de invitación con los permisos necesarios
   - Usa el Discord Developer Portal o genera manualmente:
   ```
   https://discord.com/api/oauth2/authorize?client_id=TU_CLIENT_ID&permissions=2048&scope=bot%20applications.commands
   ```

## 📡 API Endpoints

### Base URL: `http://localhost:3000`

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Health check básico |
| GET | `/api/health` | Estado detallado del servicio |
| GET | `/api/status` | Información del sistema |
| POST | `/api/ask` | Enviar pregunta a la IA |

### Ejemplo de uso de la API

**POST `/api/ask`**
```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "¿Cuál es la capital de Francia?"}'
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "question": "¿Cuál es la capital de Francia?",
    "answer": "La capital de Francia es París.",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🤖 Comandos de Discord

### `/ask`
Envía una pregunta a la IA y recibe una respuesta.

**Uso:**
```
/ask question: ¿Cómo funciona la fotosíntesis?
```

**Respuesta del bot:**
```
Question: ¿Cómo funciona la fotosíntesis?

Answer: La fotosíntesis es el proceso por el cual las plantas...
```

## 🏗️ Arquitectura

El proyecto sigue los principios SOLID y utiliza inyección de dependencias:

```
src/
├── bot/                 # Discord bot logic
│   ├── client.ts       # Discord client service
│   └── commands.ts     # Slash commands implementation
├── core/               # Core application configuration
│   ├── config.ts       # Environment configuration
│   └── logger.ts       # Logging service
├── models/             # Type definitions and interfaces
│   └── types.ts        # TypeScript interfaces
├── routes/             # Express API routes
│   └── api.ts          # API endpoints and middleware
├── services/           # Business logic services
│   └── ai-service.ts   # AI API integration
├── server.ts           # Express server setup
└── index.ts            # Application entry point
```

## 🔒 Seguridad

- **CORS configurado** para controlar acceso
- **Validación de entrada** en todos los endpoints
- **Rate limiting** (recomendado para producción)
- **Headers de seguridad** incluidos
- **Manejo seguro de tokens** a través de variables de entorno

## 📊 Logging

El sistema incluye logging completo:

- **Requests HTTP** con tiempo de respuesta
- **Comandos de Discord** con información de usuario
- **Errores detallados** con stack traces
- **Estados de servicios** para monitoreo

## 🚨 Manejo de Errores

- **Errores de API**: Timeout, conexión, respuestas inválidas
- **Errores de Discord**: Comandos fallidos, permisos
- **Validación**: Entrada de usuario inválida
- **Sistema**: Errores no capturados, shutdown graceful

## 🔧 Desarrollo

### Estructura de Comandos
Para agregar nuevos comandos:

1. Crear comando en `src/bot/commands.ts`
2. Implementar la interfaz `Command`
3. Agregar al array en `createCommands()`
