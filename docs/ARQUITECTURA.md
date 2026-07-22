# Arquitectura — fases del proyecto

## Fase 1 — AHORA (este repo): web estática + datos sincronizables

- **Frontend:** un `index.html` (HTML + CSS + JS, sin dependencias).
- **Datos:** `data/catalogo.json` o **Google Sheets en vivo** (Apps Script).
- **Hosting:** Vercel Hobby o GitHub Pages (gratis).
- **Sincroniza:** sí — editas la hoja y la web cambia.
- **Formulario:** Formspree → correo a logística (opcional).

Cubre todo lo necesario para salir a producción con un catálogo que tú administras desde una hoja. **No requiere instalar Node, ni base de datos, ni cuentas de servicio.**

## Fase 2 — FUTURO: versión productiva (modelo RUHA)

Cuando quieras panel propio, guardar reservas en base de datos, control de stock o login de distribuidores:

| Pieza | Servicio | Para qué |
|---|---|---|
| Frontend | **Next.js** | Migrar el HTML a componentes |
| Hosting | **Vercel (Hobby)** | Despliegue automático + dominio |
| Base de datos | **Supabase (free)** | Reservas, formularios, stock |
| Catálogo | **Google Sheets API** | La misma hoja, leída del lado servidor |
| Fotos/fichas | **Google Drive API** | Imágenes y PDFs por equipo |

En Fase 2 la lectura de Sheets/Drive se hace con una **cuenta de servicio** ("robot lector"): un correo al que le compartes la hoja y las carpetas en modo lectura. Las credenciales (JSON) van como variable de entorno en Vercel (`.env.local.example` tiene la plantilla) y **nunca** se suben a GitHub (ya están en `.gitignore`).

### Flujo Fase 2
```
Google Sheets ─┐
Google Drive  ─┤→ cuenta de servicio (lectura) → Next.js (Vercel) → Cliente
Reserva       ─┘→ Supabase (guarda) + correo a logística
```

### Pasos de la cuenta de servicio (cuando lleguemos)
1. Google Cloud Console → nuevo proyecto → habilitar **Sheets API** y **Drive API**.
2. Crear **cuenta de servicio** → descargar el JSON → copiar su correo (`...@...iam.gserviceaccount.com`).
3. **Compartir** la hoja y las carpetas de fotos/fichas con ese correo, en modo **Lector**.
4. Guardar el JSON como variable de entorno en Vercel; nunca subirlo al repo.

> La hoja "Proyección de compras" y la de inversión/retorno son **internas**: no se exponen en la web.
