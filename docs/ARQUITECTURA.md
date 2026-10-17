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

## Archivos generados y conflictos al fusionar

GitHub Pages sirve lo que hay en `main` tal cual, así que el HTML generado
está versionado. Además, dos robots lo regeneran y lo empujan a `main`
todos los días:

| Robot | Hora (Lima) | Qué PUBLICA (lo que entra en su commit) |
|---|---|---|
| `.github/workflows/paginas-alquiler.yml` | 06:00 | `alquiler/`, `sitemap.xml` |
| `.github/workflows/paginas-venta.yml` | 06:20 | `venta/`, `sitemap.xml`, `index.html`, `data/venta-vivo.json` |

**Los dos generan más de lo que publican.** `feed-google.xml`,
`promociones/index.html` y las hojas A4 de `fichas/venta/` se vuelven a
escribir en cada corrida pero **no entran en el `git add` del robot**, así
que no se publican solos. Consecuencia real, vista el 17/10/2026: el feed
de Google Merchant seguía anunciando dos equipos dados de baja, con enlace
a una página que ya no existía. Si se da de baja un equipo, hay que
regenerar y publicar el feed a mano, o arreglar el `git add` del robot.

Por eso **cualquier rama que viva más de un día choca con ellos**. El
14/10/2026 fueron 165 conflictos de una vez, todos en archivos que nadie
había editado a mano.

### Qué es fuente y qué es generado

| Archivo | Qué es | ¿`merge=ours`? |
|---|---|---|
| `venta/**/index.html` | generado por `generar_paginas_venta.py` | sí |
| `alquiler/**/index.html` | generado por `generar_paginas.py` | sí |
| `sitemap.xml` | lo escriben los dos generadores | sí |
| `css/app.css` | **generado entero**: `empaquetar_web.py` une los CSS sueltos | sí |
| `js/app.js` | **generado entero**: une los JS sueltos, separados por `;` | sí |
| `index.html` | **FUENTE, escrito a mano** (la portada), con tres trozos generados entre marcas (`TIPOS-URL`, `VENTA-URL`, `MAPA-PIE`) y los sellos `?v=` | **no**, se perdería un cambio hecho a mano |
| `data/**`, `scripts/**`, `css/*.css` sueltos, `js/*.js` sueltos | fuente | no |

### Qué hacer después de un merge con conflicto

**Nunca** resolver el HTML a mano. Tomar cualquiera de los dos lados y
volver a generar: la fuente son los datos y los generadores, y al
regenerar se recupera lo de los dos lados.

```bash
git merge origin/main                 # o rebase
git checkout --theirs -- $(git diff --name-only --diff-filter=U)
git add -- $(git diff --name-only --diff-filter=U)

# OJO con el de alquiler: ver el aviso de abajo antes de correrlo.
python3 scripts/generar_paginas.py --datos /tmp/vivo.json
python3 scripts/generar_paginas_venta.py --datos data/venta-vivo.json
python3 scripts/empaquetar_web.py

git add -A && git commit
```

#### AVISO: el generador de alquiler, sin `--datos`, retrocede la hoja

`generar_paginas.py` sin `--datos` lee `data/catalogo.json`, que es una
**copia vieja** del catálogo y **no tiene las columnas que se llenan en la
hoja**, como `cal_pdf` (el certificado de calibración). El robot, en cambio,
corre siempre con el catálogo EN VIVO y nunca publica `data/catalogo.json`.

Resultado: regenerar en local con la copia del repositorio **borra de las
páginas lo que el robot acaba de publicar desde la hoja**. Pasó el
17/10/2026 con los certificados de calibración de siete instrumentos.

Para regenerar alquiler de verdad, hay que traer el catálogo en vivo, igual
que el robot:

```bash
URL=$(grep -oE 'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec' js/00-config.js | head -1)
curl -sSL --max-time 90 -o /tmp/vivo.json "$URL"
python3 scripts/generar_paginas.py --datos /tmp/vivo.json
```

Y después comparar contra `main`: si cambia alguna página de alquiler que
no se estaba tocando, algo se perdió.

```bash
git diff --name-only origin/main -- alquiler/
```

### Los PDF de las fichas técnicas: revisar SIEMPRE qué sale modificado

`scripts/generar_pdf_fichas.js` convierte cada hoja A4 (`fichas/<id>/` y
`fichas/venta/<id>/`) en su PDF. Compara los bytes antes de escribir y se
salta el archivo si son idénticos, pero **eso no basta**:

> **Un PDF puede salir distinto aunque su contenido no haya cambiado ni una
> letra.** Basta con que el navegador que lo genera sea de otra versión:
> cambian el subconjunto de fuentes incrustado y el orden interno de los
> objetos, y los bytes ya no coinciden. El 17/10/2026 una corrida reescribió
> **98 PDF** cuyo contenido era el mismo; solo dos habían cambiado de verdad.

Por eso, **antes de hacer commit después de correr ese script**:

```bash
git status --short fichas/            # ¿qué salió modificado?
```

Si aparecen archivos de equipos que no se tocaron, hay que devolverlos:

```bash
git status --porcelain fichas/ | awk '$1=="M" && $2 ~ /\.pdf$/ {print $2}' \
  | grep -v <el id que sí cambió> | xargs -r git checkout --
git status --porcelain fichas/ | awk '$1=="??"{print $2}' | xargs -r rm -f
```

Cada PDF pesa unos 180 KB: publicar 150 sin motivo son 27 MB de basura en
el historial del repositorio, que ya no se pueden quitar.

### Una vez por copia del repositorio

`merge=ours` necesita que el driver esté declarado; git no lo trae de
serie:

```bash
git config merge.ours.driver true
```

Sin eso no se rompe nada: git simplemente vuelve a avisar del conflicto,
como antes.
