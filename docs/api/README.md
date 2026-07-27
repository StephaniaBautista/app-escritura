# API Documentation

Documentacion de la API de Escritura.

## Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesion
- `POST /api/auth/logout` - Cerrar sesion
- `GET /api/auth/session` - Obtener sesion actual
- `POST /api/auth/forgot-password` - Solicitar reset de contrasena
- `POST /api/auth/reset-password` - Restablecer contrasena

### Documents
- `GET /api/documents` - Listar documentos
- `POST /api/documents` - Crear documento
- `GET /api/documents/:id` - Obtener documento
- `PATCH /api/documents/:id` - Actualizar documento
- `DELETE /api/documents/:id` - Eliminar documento

### Characters
- `GET /api/characters` - Listar personajes
- `POST /api/characters` - Crear personaje
- `GET /api/characters/:id` - Obtener personaje
- `PATCH /api/characters/:id` - Actualizar personaje
- `DELETE /api/characters/:id` - Eliminar personaje

## Autenticacion

Todos los endpoints (excepto auth) requieren un token JWT en el header:

```
Authorization: Bearer <token>
```

## Swagger UI

La documentacion interactiva esta disponible en:

```
http://localhost:3001/docs
```
