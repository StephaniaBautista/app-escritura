# Guias

Documentacion de guias para desarrolladores.

## Inicio Rapido

### Requisitos
- Node.js >= 20
- pnpm >= 9
- Cuenta de Supabase

### Instalacion

```bash
# Clonar repositorio
git clone https://github.com/StephaniaBautista/app-escritura.git
cd app-escritura

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales

# Ejecutar migraciones
cd backend
pnpm prisma migrate dev

# Iniciar desarrollo
cd ..
pnpm dev
```

### Variables de Entorno

| Variable | Descripcion | Requerida |
|----------|-------------|-----------|
| DATABASE_URL | URL de conexion a PostgreSQL | Si |
| BETTER_AUTH_SECRET | Secret para JWT | Si |
| BETTER_AUTH_URL | URL del backend | Si |
| SMTP_HOST | Servidor SMTP | No |
| SMTP_USER | Usuario SMTP | No |
| SMTP_PASS | Contrasena SMTP | No |
| GOOGLE_CLIENT_ID | Client ID de Google OAuth | No |
| GOOGLE_CLIENT_SECRET | Client Secret de Google OAuth | No |
| DEEPSEEK_API_KEY | API key de DeepSeek | No |

## Guia de Contribucion

1. Fork el repositorio
2. Crear rama feature/mi-feature
3. Hacer commits atomicos
4. Crear Pull Request
5. Esperar review

## Convenciones de Codigo

- camelCase para variables/functions
- PascalCase para componentes/types
- UPPER_SNAKE para constantes
- No `any` sin justificacion
- No comentarios salvo que se pidan
