# TRASPASO — Sinergia Biomédica

**Escrito el 7 de noviembre de 2026.** Para alguien que no vio nada de la
conversación anterior y tiene que poder seguir sin preguntar.

Lo que no esté seguro va marcado **DUDOSO**.

---

## 1. QUÉ ES ESTO

### El negocio

**Servicios Integrales Sinergia S.A.C.** (RUC 20615862682), de Lima, Perú.
Av. Simón Bolívar 2150, Pueblo Libre. Teléfono **+51 908 704 131**, correo
`logistica@sinergiabiomedica.pe`.

Hace dos cosas:

1. **Vende equipamiento biomédico** — autoclaves, monitores, ecógrafos,
   desfibriladores, equipos de laboratorio. Unos 195 equipos publicados.
   Casi todos los compra a un distribuidor, **ATL / altokelite.com**, y
   algunos son stock propio.
2. **Alquila instrumentos de metrología** con certificado de calibración
   vigente — sonómetros, luxómetros, analizadores de seguridad eléctrica.

El dueño se llama **Luis Salcedo**. Firma así las cotizaciones y los
correos. No es técnico: hay que escribirle en **español simple, paso a
paso, y corto**. Pide explícitamente mensajes más cortos cuando se alargan.

### El proyecto

Es el sitio web **sinergiabiomedica.pe** y las herramientas que lo
alimentan. Sirve para:

- Publicar el catálogo con **precios visibles** (ver §7, es su ventaja
  competitiva)
- Generar las fichas técnicas en PDF con el logo de la casa
- Armar las cotizaciones formales que manda a los clientes
- Bajar automáticamente precios, stock, fotos y documentos del portal del
  proveedor

### Repositorio

| | |
|---|---|
| Ruta local | `/home/user/SINERGIA` |
| Remoto | `https://github.com/equipamientoib/SINERGIA` |
| Rama de trabajo | `claude/hopeful-mendel-35f7u9-codcot` |
| Rama publicada | `main` — GitHub Pages sirve `main` directo |

**`main` ES el sitio en producción.** No hay build ni deploy: lo que entra
a `main` está publicado en minutos.

---

## 2. CÓMO SE CORRE

### Qué hay que tener

- **Python 3** (hay 3.11) — para los generadores de páginas
- **Node 22** — para los generadores de PDF
- **Playwright + Chromium** — ya instalado en
  `/opt/node22/lib/node_modules/playwright`. El Chromium está en
  `/opt/pw-browsers/chromium`. **No reinstalar Playwright**: otra versión
  no encuentra ese navegador.
- **poppler-utils** — `pdfunite`, `pdftotext`, `pdftocairo`, `pdfinfo`,
  `pdfseparate`, `pdfimages`. Todos disponibles.
- **Pillow** — NO está en el sistema. En la sesión anterior se instaló en
  el scratchpad y se usaba con
  `sys.path.insert(0, '<scratchpad>/pil/ext')`. **En una sesión nueva hay
  que volver a instalarlo** si se necesita tocar imágenes.
- **NO hay** tesseract, qpdf ni pdftk.

### Regenerar las páginas de venta

```bash
cd /home/user/SINERGIA

# 1. bajar el catálogo en vivo del Apps Script de venta
URL=$(grep -oE 'VENTA_URL:\s*"https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec"' js/00-config.js | grep -oE 'https://[^"]+')
curl -sSL --max-time 90 -A "Mozilla/5.0" -o /tmp/venta.json "$URL"

# 2. generar las 195 páginas + sitemap + feed de Google
python3 scripts/generar_paginas_venta.py --datos /tmp/venta.json

# 3. rehacer los PDF A4 de las fichas que cambiaron
#    (necesita el sitio servido en 8765)
python3 -m http.server 8765 &
node scripts/generar_pdf_fichas.js       # --todos para rehacer los 206
pkill -f "http.server 8765"

# 4. reempaquetar JS y CSS, y poner el sello ?v= nuevo
python3 scripts/empaquetar_web.py
```

**Importante:** `?refrescar=1` en la URL salta la caché de 10 minutos del
Apps Script. El separador es `?`, no `&`: la URL termina en `/exec` sin
query. (Me equivoqué con esto y la respuesta vino vacía.)

### Regenerar las páginas de alquiler

```bash
python3 scripts/generar_paginas.py      # usa CL_URL, el otro Apps Script
```

### Armar una cotización

```bash
cd /home/user/SINERGIA
python3 -m http.server 8765 &
node scripts/generar_cotizacion.js data/cotizaciones/COT-SB-1126-012.json
pkill -f "http.server 8765"
```

El PDF sale en la raíz del repositorio con el nombre que diga `salida`.
**Muévelo fuera del repositorio**: los PDF de cotizaciones no se commitean.

### Los bots automáticos

Dos GitHub Actions, ya configurados, corren solos:

| Workflow | Hora (Lima) | Qué hace |
|---|---|---|
| `.github/workflows/paginas-alquiler.yml` | 06:00 | Regenera alquiler |
| `.github/workflows/paginas-venta.yml` | 06:20 | Regenera venta |

Ambos corren y terminan bien. El de alquiler casi nunca commitea porque
los precios de alquiler salen de `data/tarifas-alquiler.json`, no de la
hoja, y ese archivo no cambia solo.

### Credenciales — ninguna va en el repositorio

| Clave | Dónde va | Para qué |
|---|---|---|
| `ATL_CLAVE` | Apps Script de venta → Propiedades del script | Autentica el favorito contra el Apps Script |
| `COT_CLAVE` | Apps Script de venta → Propiedades del script | Pantalla `#/emitir`. **TODAVÍA NO ESTÁ PUESTA** |
| `DOCS_CARPETA` | Apps Script, se crea sola | ID de la carpeta de documentos en Drive |
| `FOTOS_CARPETA` | Apps Script, se crea sola | ID de la carpeta de fotos en Drive |

**Nunca pidas ni manejes las credenciales del portal del proveedor.** Luis
lo dijo expresamente: *«No me mandes tu usuario ni tu clave: no los
necesito.»*

**La `ATL_CLAVE` no se lee, no se copia, no se edita y no se repite.**

---

## 3. GLOSARIO DE LO NUESTRO

### El portal del proveedor

**altokelite.com** (lo llamamos «ATL»). Es el sitio del distribuidor donde
Luis compra. Entra con su usuario de distribuidor y ve precios de
distribuidor, stock y documentos de cada equipo.

Cada equipo tiene un **código de proveedor** con formato `095.247` — tres
dígitos, punto, tres dígitos. Ese código es la llave que une todo: la hoja,
Drive y los nombres de archivo.

Cada equipo en el portal tiene una pestaña **«Ficha técnica»** con hasta
seis documentos:

- CATÁLOGO TRADUCIDO (al español)
- CATÁLOGO ORIGINAL (normalmente en inglés)
- MANUALES
- REGISTRO SANITARIO
- EE.TT. COMPLETA MARCA
- EE.TT. BÁSICA MARCA

### «El favorito»

Es un **bookmarklet**: un botón que Luis tiene en la barra de marcadores
de su navegador. Lo creó la función `crearBotonProveedor()` de
`google-apps-script/Venta.gs`.

**Cómo se corre:** Luis entra al portal del proveedor con su sesión
iniciada, va a la lista de productos, y toca el botón. El bookmarklet
carga `https://sinergiabiomedica.pe/js/proveedor-atl.js` y empieza a
trabajar dentro de esa pestaña, usando la sesión de Luis.

**Importante:** carga el script **desde la web en producción**, o sea
desde `main`. Si un arreglo está en una rama sin fusionar, **el favorito
no lo tiene**.

**Qué hace, en orden:**

1. Lee el catálogo entero del proveedor — unos 800 equipos
2. Casa cada uno con los equipos publicados de Luis, por código o por
   marca y modelo
3. Manda precios y stock a la hoja de venta
4. Ofrece copiar a Drive las fotos que falten
5. Ofrece buscar documentos, **de 20 en 20 equipos**

**Cuánto tarda:** la lectura del catálogo, unos 4 bloques de 200 equipos,
tarda del orden de **1 a 2 minutos**. La tanda de documentos de 20 equipos
tarda **unos 2 minutos** (pausa de ~2 segundos por equipo, más 1,5 s por
cada documento que baja).

**Qué deja como resultado:**

- Precios y stock actualizados en la hoja «Venta»
- El catálogo completo del proveedor en la hoja «Proveedor», con el
  **enlace a la ficha** de cada equipo (sin ese enlace no se pueden buscar
  documentos después)
- Los PDF nuevos en la carpeta de Drive, nombrados `<código> - <tipo>.pdf`
- Una fila por documento en la hoja «Documentos»
- Una fila de marca (`NINGUNO` o `REVISADO`) por cada equipo revisado
- Un panel en pantalla con el resumen

**Las fotos y documentos que sube el favorito quedan compartidos
«cualquiera con el enlace».** Los que se suben a mano a Drive, no. Eso
importa (ver §9).

### Las marcas: «NINGUNO» y «REVISADO»

Son **filas en la hoja «Documentos»** con el código en la columna A, la
palabra en la columna B, y las columnas de nombre y enlace **vacías**.

Las escribe el favorito al terminar de revisar un equipo:

| Marca | Significa exactamente |
|---|---|
| `NINGUNO` | «lo miré todo y no tiene ningún documento» |
| `REVISADO` | «lo miré todo y lo que había ya está guardado» |

**Las dos cierran el equipo.** La función `docsVistos_()` de `Venta.gs`
devuelve los códigos que tienen cualquiera de las dos, y
`atlDocsPendientes_()` los excluye de la cola.

### Qué significa que un equipo quede «cerrado»

**Que el favorito no lo vuelve a consultar nunca más.**

No hay fecha de caducidad ni reintento. Si mañana el proveedor le sube la
ficha técnica a ese equipo, Luis no se entera.

**Quién lo cierra:** el favorito, al escribir la marca. Se deshace
borrando la fila de la hoja «Documentos» — vuelve solo a la cola.

**Por qué importa tanto:** una marca `NINGUNO` falsa es una pérdida
silenciosa y permanente. Ya pasó una vez con 16 equipos, entre ellos el
Mindray BA-88A, que sí tenía dos catálogos.

### El error del contador

El portal tiene una llamada, `countArchivosProd`, que dice cuántos
documentos tiene un equipo. El favorito la usa porque el bloque de
documentos de la página **se rellena por JavaScript al pulsar la pestaña**,
así que la página recién pedida puede venir vacía aunque el equipo tenga
seis.

Cuando esa llamada falla, el código devuelve **−1**, que significa
**«no sé»**.

**El error:** la versión publicada trata el −1 igual que un **0**, que
significa «no tiene ninguno», y cierra el equipo.

**El arreglo** está hecho y commiteado, pero **en la rama sin fusionar**.
Son 17 líneas en `js/proveedor-atl.js`, commit `486da6ee`.

### «La ficha»

Palabra con tres significados distintos. Hay que fijarse en el contexto:

1. **La ficha del equipo en el portal** — la página del proveedor
2. **La ficha de fabricante** — `data/fichas-venta/<id>.json`, los
   parámetros técnicos que Sinergia transcribe de los catálogos del
   fabricante. De ahí sale la pestaña «Parámetros técnicos» de la web.
3. **La hoja A4** — `fichas/venta/ficha-tecnica-<id>.pdf`, el PDF con el
   logo de Sinergia que se descarga de la página.

### «La hoja»

El Google Sheet. Ver §4.

### «Equipos propios»

Los que Luis tiene en stock sin pasar por el proveedor. Viven en
`data/venta.json` → `equiposPropios.equipos`. Hoy son los cuatro
autoclaves Biobase. No tienen código de proveedor.

### «Cotización formal»

El PDF con membrete que se le manda al cliente. Lo numera
`COT-SB-1126-0XX`. **Esa numeración es inventada** (ver §9).

---

## 4. LOS DATOS

### Google Sheet de venta

**ID:** `11fnh5teSU1ysJUpUiq-hYgmqVUoj4Dq9wnWWT_XybyY`
**Nombre:** «Sinergia - Venta (catálogo en vivo)»

| Hoja | sheetId | Qué tiene |
|---|---|---|
| `Venta` | 633394644 | El catálogo de Luis. La cabecera está en la **fila 4**; los datos empiezan en la 5 |
| `Documentos` | 985311110 | Un documento por fila, y las marcas NINGUNO/REVISADO |
| `Fotos` | 2024040497 | Fotos copiadas a Drive |
| `Para revisar (aplicado 01/10)` | 59512506 | Histórico, no se usa |
| `Proveedor` | 465515710 | El catálogo completo del proveedor, ~800 filas, con el enlace a cada ficha |

**Columnas de la hoja `Venta`** (fila 4 es la cabecera):

```
A id              B publicar       C destacado    D categoria
E nombre          F marca          G modelo       H origen
I precio_proveedor (FÓRMULA)       J precio_publicado (FÓRMULA)
K stock_proveedor L stock_sinergia M resumen      N caracteristicas
O expediente      P clave          Q areas        R fotos
S ficha_pdf       T codigo_proveedor              U descripcion_proveedor
V notas           W precio_proveedor_usd          X coincidencia
Y ranking
```

**Las fórmulas, muy importante:**

- `W` (precio_proveedor_usd) es el **dato tecleado**: el precio en dólares
- `I` = W × tipo de cambio
- `J` = I × (1 + margen)

**Las celdas B1, B2, B3 de la hoja `Venta` tienen la configuración:**

| Celda | Valor hoy | Qué es |
|---|---|---|
| `B1` | `35` | **El margen, en %**. «% que se suma al precio del proveedor» |
| `B2` | fecha | Última actualización de precios y stock |
| `B3` | `NO` | «solo con stock» — NO = los agotados siguen publicados |

**El margen del 35 % es global para los 191 equipos.** No hay forma hoy de
darle a un equipo un margen distinto. Esto salió como pedido y quedó sin
hacer (ver §8).

**Columnas de la hoja `Documentos`:**

```
A codigo    B tipo    C nombre    D enlace    E fecha
```

Los tipos: `RGS` registro sanitario, `COR` catálogo original,
`CTR` catálogo traducido, `ETT` especificaciones técnicas,
`OTR` otro, más las marcas `NINGUNO` y `REVISADO`.

**El código se escribe como TEXTO con apóstrofo:** `'085.729`. Si se
escribe como número, Sheets se come el cero de la izquierda y queda
`85.729`. La función `codAtl_()` lo tolera —normaliza a 6 dígitos— pero
queda feo y confunde al leer. (Me pasó; ver §9.)

### Google Sheet de alquiler

**ID:** `1cwZrVZIHJFBttN1Uf1GhrYnlWsOgIWIJUn-wO_mchys`
**Hojas:** Instrucciones · Listas · Equipos · Unidades · Calibraciones ·
Proyectos · Paquetes · Referencia

**DUDOSO:** no revisé esta hoja en esta sesión. Los datos vienen de la
sesión anterior.

### Carpetas de Drive

| Carpeta | ID | Qué tiene |
|---|---|---|
| Documentos ORIGINALES (proveedor) | `1e28N276S5iBgPoraULCEXgN1IVV4IdMm` | 34 PDF del proveedor, nombrados `<código> - <tipo>.pdf` |
| Catálogos de fabricante (stock propio) | `1M3eXQiM9k92Eq0KzV-OQVy047ez8vxE9` | 4 PDF — Biobase y Tuttnauer |
| Cotizaciones enviadas | `1VgHgwMhqjY5Jt2qsnGGCdLBRvJ8l2Ye0` | Creada, **DUDOSO si tiene algo** |
| Fotos venta | `1zUf9NBgL_LksjF5Og1UoCOhQgeXsXSKc` | |
| Fotos de proyectos | `1GGdGlConDIl3uXWMdGGL5rzQsIXCbJWI` | |
| FOTOS ALQUILER | `1A2lS7GyJ9-aSr3mfMGtNT7yU-YaQP88u` | |
| (carpeta madre) | `1_HOUO1Txc7mI9lsdupIrgM_YzdKCWWKz` | Contiene las anteriores |

### Archivos de datos del repositorio

| Archivo | Qué es |
|---|---|
| `data/venta.json` | Equipos propios, promociones, textos de ficha, códigos NTS, fotos fijas |
| `data/venta-nuevos.json` | Equipos que NO están en la hoja. Aquí vive el `codigo` de proveedor de cada uno |
| `data/venta-vivo.json` | Copia cacheada del feed |
| `data/fichas-venta/<id>.json` | Parámetros del fabricante, uno por equipo |
| `data/documentos.json` | **NUEVO.** Índice de documentos: 24 códigos, 34 documentos, con el ID de Drive de cada uno |
| `data/cotizaciones/<num>.json` | **NUEVO.** Una solicitud de cotización por archivo |
| `data/tarifas-alquiler.json` | **Los precios de alquiler de verdad.** Pisa lo que diga la hoja |
| `data/terminos-venta.json` | Los términos de las cotizaciones |
| `data/catalogo.json` | Catálogo de alquiler |
| `data/seo-tipos.json` | Textos y preguntas frecuentes de las 11 páginas de categoría |

### Apps Script

Dos proyectos distintos, los dos se editan pegando a mano:

| Archivo en el repo | Nombre del proyecto | Ojo |
|---|---|---|
| `google-apps-script/Codigo.gs` | «SINERGIA — CL» (alquiler) | |
| `google-apps-script/Venta.gs` | «SINERGIA - TIENDA» | **El archivo dentro del proyecto se llama `Code.gs`, no `Venta.gs`** |

**Para publicar un cambio:** pegar el código, luego «Gestionar
implementaciones» → lápiz → Nueva versión. **Va por la versión 9.**

---

## 5. DÓNDE QUEDÓ TODO

### La rama

**`claude/hopeful-mendel-35f7u9-codcot`**, con **18 commits** por encima
de `main`, **49 archivos**, +1931 / −175 líneas.

**NO está fusionada. NO hay Pull Request abierto.** Lo comprobé: la lista
de PRs abiertos del repositorio está vacía.

**Luis dio una instrucción explícita y la repitió varias veces:**

> *«aun no funsones haremos un solo pedido al final ok?»*
> *«PERO DEJEMOS PARA EL FINAL, CUANDO ACABEMOS AHÍ RECIÉN MANDAMOS UN
> REQUEST»*

**No abras un PR sin que él lo pida.**

### Los 18 commits

```
34e6a741  06/11  Cotizacion del DEA para SG Natclar
1e0bec61  05/11  Una cotizacion puede llevar su propia ficha tecnica
b7d74753  05/11  La foto de un item se guarda en el repositorio
ca2086a9  05/11  Una cotizacion puede reemplazar los terminos que no le apliquen
da4c4206  05/11  La pestana de parametros se ve igual en los 195 equipos
30831edc  05/11  El membrete lleva el telefono bueno: 908 704 131
a523b9ac  05/11  La cotizacion se arma sola y se lleva el documento pegado
131ef314  05/11  Los importes llevan separador de miles
1efd0405  04/11  El alquiler se cobra por adelantado, no contra entrega
9b15a007  04/11  Los repuestos salen de «Accesorios estandar» en 18 y 23 L
c8dfa4ac  04/11  La cotizacion distingue DNI de RUC
f875e7e2  04/11  El cuadro de la cotizacion dice que trae cada equipo
4ac91123  04/11  Ficha de fabricante del HEINE mini 3000 LED
a3d31cf0  03/11  Comparar nombres de documento sin tildes
9b37ec79  03/11  Ficha de fabricante del CA-MI New Askir 230 12V BR
486da6ee  03/11  El favorito ya no cierra un equipo cuando no sabe   ← EL IMPORTANTE
7c185816  03/11  Fichas de fabricante del Mindray BA-88A y el Meling XC-630L
3598eeca  02/11  El codigo del proveedor en la pantalla de emision
```

### El push está intermitente

El último commit, `34e6a741`, **está guardado en local pero NO subido**.
Los 17 anteriores sí están en el remoto.

El sistema de permisos de la sesión bloqueó `git push` unas siete veces,
se destrabó solo una vez, y volvió a bloquear. **No insistas por rutas
alternativas** (no uses las herramientas de GitHub para esquivarlo): si
está bloqueado, díselo a Luis y que lo habilite.

### Qué se probó

| Qué | Cómo se probó | Resultado |
|---|---|---|
| El arreglo del favorito (`sinCerteza`) | Se extrajo la función real y se corrió contra 4 escenarios, comparando con el commit anterior | 4 de 4 |
| Las 4 fichas de fabricante nuevas | Se generaron las páginas y los PDF A4 y se miraron | Bien |
| El separador de miles | Se regeneró una cotización de 5 cifras y se leyó el PDF | `50,081.36` |
| El teléfono del membrete | Se regeneró una cotización y se miró la cabecera | `T. 908 704 131` |
| Las páginas de parámetros iguales | Se contaron tarjetas y acordeones en los 195 archivos, y se verificó que las 8 filas de tiempos del 45 L seguían completas | Bien |
| Que no cambiara ninguna URL | Se comparó el sitemap entero, URL por URL, antes y después | 0 cambios |
| El motor de cotizaciones | Se usó para 4 cotizaciones reales | Bien |
| La ficha dentro de la cotización | Se generó y se miró el PDF | Bien |

### Qué NO se probó

- **El adjunto automático desde Drive nunca funcionó.** Ver §9.
- **El arreglo del favorito nunca corrió en el portal de verdad.** Está
  probado contra escenarios simulados, no contra ATL.
- **El motor de cotizaciones nunca corrió en la máquina de Luis**, solo
  en el contenedor.
- **La pantalla `#/emitir` no se probó**: necesita `COT_CLAVE`, que no
  está puesta.
- **Las fichas de los 4 equipos nuevos no están publicadas**, así que
  nadie las ha visto en la web real.

---

## 6. LAS 15 FILAS

### Qué eran

El 6 de noviembre, a las 7:24 de la mañana, Luis corrió el favorito. La
tanda de documentos revisó 20 equipos y escribió 20 marcas en la hoja
«Documentos»: **15 `NINGUNO` y 5 `REVISADO`**.

Las 15 `NINGUNO`, en el orden en que entraron:

```
030.203   072.210   101.477   101.127   090.352
102.141   091.592   101.128   100.986   100.984
093.683   100.985   101.614   101.132   097.072
```

Están en las **filas 36 a 50** de la hoja «Documentos».

Las 5 `REVISADO` (filas 51 a 55) son `100.874`, `089.540`, `089.544`,
`089.538` y `094.407`.

### Por qué estaban en duda

**Una de ellas es demostrablemente falsa:** el **097.072**, que es el
**Mindray BA-88A**. Ese equipo tiene **dos catálogos guardados en Drive**
—catálogo traducido y catálogo original— registrados en las filas 23 y 24
de esa misma hoja. Debió salir `REVISADO`, no `NINGUNO`.

**La causa está confirmada leyendo el código**, no suponiendo. Bajé el
archivo que la web sirve ahora mismo y lo comparé con el de la rama:

```
Publicado (main):              Arreglado (rama):
if (!hallados.length) {        if (!hallados.length) {
  sin++;                         if (dice !== 0) {
  marcar NINGUNO                   sinCerteza++;
}                                  vuelve a la cola
                                 }
                                 sin++;
                                 marcar NINGUNO
                               }
```

`dice` es lo que contesta el contador del portal. Vale **−1** cuando no
contestó. El código publicado no distingue −1 de 0.

**Las otras 14 pueden ser legítimas o no.** Desde fuera no hay forma de
distinguir un «no tiene ninguno» verdadero de un «el contador falló». La
hoja guarda el resultado, no el motivo.

### Las 5 REVISADO están BIEN

Me equivoqué al principio y le dije a Luis que 2 de 16 marcas eran falsas,
contando una `REVISADO` como error. **Lo corregí leyendo el código:**
`REVISADO` significa «lo que había ya está guardado», que es exactamente
lo correcto para esos 5 equipos, que ya tienen su registro sanitario.

**La única marca mala es el 097.072.**

### Qué se decidió

Recomendé **borrar las 15 filas `NINGUNO`**, no solo la del Mindray:

- No se puede distinguir cuáles son legítimas
- El costo de equivocarse es cerrar un equipo para siempre
- El costo de borrarlas de más es que se revisen otra vez, que no es nada

### Si se llegaron a borrar: **NO**

**Lo verifiqué hoy, 7 de noviembre: las 15 filas siguen ahí.**

Luis nunca contestó a la pregunta «¿borro las 15 filas?». La conversación
siguió con otras cotizaciones y quedó sin responder.

**Pendiente de decisión suya.** No borrar sin que él lo diga.

---

## 7. DECISIONES Y POR QUÉ

Esto es lo que no está en el código. Son reglas de Luis y criterios que
fuimos adoptando.

### Reglas que puso Luis — no negociables

**«Si un dato no está en la fuente, simplemente NO se menciona.»**
Literal: *«Ni la fila, ni una nota, ni una explicación de por qué falta.
El cliente solo ve lo que sí sé. Lo que no sé se queda en el campo
"revisar", que es interno.»* Por eso cada ficha de fabricante tiene un
array `revisar` que no se publica nunca.

**No inventar datos técnicos, precios, marcas, modelos ni referencias
normativas.** Si no está en los documentos, se dice que no se tiene. Esta
regla se aplicó varias veces: no se armó la ficha del DEA con datos de
páginas de distribuidores de internet que se contradecían entre ellas
(unas decían 150 J fijos, otras 150 J adulto / 50 J pediátrico).

**No publicar el costo ni el margen.** La web solo ve el precio de venta.

**Nada de precios tachados ni la palabra «remate».**

**Los documentos del proveedor NO se publican en la web.** Llevan el
membrete del proveedor. Van en la cotización, donde se sabe a quién le
llega, y en Drive como referencia. En la web va la ficha propia de
Sinergia, con su logo.

**Los avisos de `aggregateRating` y `review` de Search Console no se
tocan.** Literal: *«No tengo reseñas reales y no las voy a inventar.»*

**«Merchant listings» no se revisa todavía.** «Fragmentos de producto» sí
está permitido — son cosas distintas.

**No tocar la tienda con buscador y filtros** (`#/venta/tienda`).

**Los textos de la hoja los corrige él**, no nosotros.

**No inferir códigos NTS para equipos que no los tengan.**
`/venta/codigos-nts/` no se toca.

**Los certificados de calibración no se publican** — van a nombre de su
empresa. La vigencia se muestra como **mes y año**, nunca el día, nunca
la fecha de inicio, nunca el laboratorio, y nada si ya venció.

### Criterios que adoptamos, con el motivo

**El precio de la cotización iguala al de la web, nunca lo supera.**
El 6 de noviembre bajó el dólar y el DEA pasó de S/ 5,981 a S/ 5,955.
Luis ya le había dicho a un cliente que 5,981 estaba vigente. Se cotizó
**5,955**. *El cliente llegó por la web y puede volver a ella; una
cotización por encima del precio publicado es de las pocas cosas que no se
pueden explicar después. Al revés no hay problema.*

**Si el repuesto no es el original, la cotización lo dice.** Un cliente
pidió una lámpara por su código de manual de servicio (K05 009 00). Lo que
se conseguía era un equivalente. La nota lo dice con todas sus letras y
ofrece gestionar el original aparte. *Quien lee el código de parte en un
manual se da cuenta igual, y es mejor que se entere por la cotización.*

**Si el proveedor no dice que algo viene incluido, no se promete.**
El brochure del lavador desinfector muestra 4 configuraciones de cestas
pero no dice cuál trae el equipo. La cotización dice que la configuración
se define con la orden de compra. *Si prometes cestas y no vienen, las
pagas tú.*

**Los términos que no aplican se reemplazan.** Una cotización de un
colchón de S/ 200 no puede ofrecer «capacitación de uso» ni garantía «con
atención en nuestro taller». *Queda ridícula delante de un comprador.*

**El alquiler se cobra por adelantado.** Antes decía «íntegro a la
entrega». *Eso dejaba el instrumento saliendo de la oficina sin un sol
cobrado: si el cliente no aparece, se pierde el día de alquiler y el
instrumento quedó bloqueado para otro. La garantía en depósito cubre el
equipo, no el alquiler.* Se dejó la salvedad «salvo acuerdo distinto por
escrito» para poder dar crédito a un cliente conocido.

**Los importes llevan separador de miles.** `toFixed(2)` imprimía
`50000.00`. *En una columna de cifras eso se confunde con `5000.00`: un
cero de diferencia en lo que el cliente paga.*

**Un descuento se muestra después del total y en bruto.** Precio de lista
con IGV → descuento con IGV → total a pagar. *El cliente ve el precio
real, cuánto se le baja y cuánto paga, en ese orden.*

**Un descuento siempre lleva su asterisco diciendo que es solo para esa
cotización.** *Si no, el cliente lo toma como tu precio nuevo y te lo
exige en la siguiente compra.*

**Todas las fichas se ven igual.** Hubo un intento de darle a los
autoclaves cinco tarjetas destacadas arriba. *Esos nombres de campo son de
autoclave: una refrigeradora de banco de sangre no tiene «ciclo más corto».
Resultado: cuatro fichas con cinco tarjetas, dos con una o dos, y las
otras doscientas con ninguna. La misma tienda con tres diseños distintos
según el equipo que abrieras.* Si algún día conviene destacar datos, que
los elija cada ficha en su archivo, no el generador adivinando.

**Antes de tocar nada que Google haya indexado, se verifica el sitemap
URL por URL.** Luis lo pidió: *«ten cuidado con los links que ya tienes
indexados.»* Un cambio de dirección borra el historial que esa página ganó.

**Los PDF que se le mandan a Luis van al scratchpad, no al repositorio.**

**Las fotos de ítems de cotización SÍ van al repositorio**, en
`img/cotizacion/items/`. *La primera vez quedó apuntando a
`http://localhost:8765/foto.jpg`, un archivo de la sesión. En otra máquina
esa cotización sale sin foto y nadie se entera hasta que el cliente abre
el PDF.*

**Si un documento no se puede bajar, la cotización sale igual, sin
adjunto, y lo dice.** El motor comprueba que lo que llegó empiece por
`%PDF`. *Drive contesta una página de inicio de sesión cuando el archivo
es privado, y sin esa comprobación esa página se habría pegado al final de
la cotización que ve el cliente.*

### Lo que Search Console dijo, y lo que significa

Datos de 3 meses: **186 clics, 3.05K impresiones, CTR 6.1 %, posición
media 7.8, 239 búsquedas distintas.** 111 páginas indexadas, 81 no.

**La estrategia de publicar precios funciona.** La página de autoclaves
creció **203 %** en impresiones. De sus 26 búsquedas, **23 contienen
«precio», «cuánto cuesta», «valores» o «costos»**. Es la **única de las 11
categorías** que tiene la pregunta «¿Cuánto cuesta…?» respondida con un
rango real (S/ 8,000 a S/ 52,005).

**El grupo de refrigeración son 148 impresiones con 1 clic.** Revisé la
página palabra por palabra: dice «refrigeradora» 19 veces, y **«nevera» 0,
«refrigerador» en masculino 0, «farmacéutico» 0, «hospital» 0**. Google la
muestra, pero el cliente que buscó «nevera para farmacia» no reconoce que
es él.

**El alquiler también está invisible:** 41 impresiones, 0 clics, en
«analizador de seguridad eléctrica», «sonómetro fluke», «alquiler de
luxómetro», «equipos médicos alquiler con calibración».

**Propuse cambiar el título de la página de refrigeradoras** añadiendo
«Neveras y…» sin tocar la URL. **Luis no contestó. No está hecho.**

---

## 8. QUÉ FALTA

En orden de urgencia.

### 1. Fusionar la rama — 18 commits

**Es lo más urgente y Luis lo sabe.** El motivo más concreto: mientras no
se publique, cada tanda del favorito puede cerrar mal algún equipo. Ya
cerró mal el Mindray el 6 de noviembre.

Lo que se publica con la fusión, por orden de impacto para él:

- El arreglo del favorito
- El teléfono bueno en el membrete
- Las 4 fichas de fabricante que hoy no se ven en la web
- Los miles en las cotizaciones
- El pago adelantado en alquiler
- Las fichas de parámetros iguales

**Espera a que él lo pida.**

### 2. Subir el commit `34e6a741`

Está en local. El push estaba bloqueado al cerrar la sesión.

### 3. Decidir qué pasa con las 15 filas NINGUNO

Ver §6. Recomendación: borrarlas. **Falta su respuesta.**

### 4. Ejecutar `compartirDocumentos()` en Apps Script

Está escrita y commiteada en `Venta.gs`. Se ejecuta **una vez** desde el
editor con el botón ▶.

**Sin eso, el motor de cotizaciones no puede adjuntar documentos del
proveedor**, porque los que se subieron a mano a Drive están privados.
Comprobado: el `uc?export=download` de esos archivos devuelve HTML, no PDF.
Los que sube el favorito sí funcionan (probé el `1CKnSFLcx1M3…` y devuelve
`%PDF`).

Intenté cambiar el permiso por la API de Drive y **el sistema me lo
bloqueó**, con razón: es un cambio de permisos en sus archivos.

### 5. El correlativo real de cotizaciones

**Todos los números `COT-SB-1126-001` a `012` me los inventé yo.** Luis lo
sabe, se lo dije varias veces, y nunca pasó el correlativo real de su
sistema. **Hay cotizaciones ya enviadas a clientes con numeración
inventada.**

### 6. Margen por equipo

Luis pidió bajar el precio del lavador desinfector solo a él, al 25 %. **No
se puede hoy:** el margen del 35 % está en una celda y vale para los 191.
Se le ofrecieron dos caminos:

- **A)** No tocar la web y cotizar más bajo. *Se hizo esto.*
- **B)** Agregar margen por equipo en Apps Script. **No contestó.**

No se usó el sistema de promociones porque saca precio tachado y la
etiqueta «PROMOCIÓN», que él prohibió.

### 7. La lámpara de Harold Alemán — decisión pendiente

Cliente: Harold Alemán, +51 982 096 925. Pidió la lámpara de la cuna de
calor radiante **David HKN-93**, código original **K05 009 00 (Cold Lamp)**
según el manual de servicio.

Hay **dos caminos** y falta que Luis elija:

| | eBay (cotizado) | Proveedor ATL |
|---|---|---|
| Marca | Genérico | **DAVID — el original** |
| Código | — | **095.341** |
| Costo | US$ 126.99 (38.99 + 60 envío + 28 aduana) | **US$ 50.40** con IGV |
| Precio | S/ 578 (cotizado) | **S/ 237** al 35 % |
| Stock | eBay, 60-90 días | **Agotado** |
| Ficha técnica | La armé con los datos del anuncio | **El portal no tiene ninguna** |

**Recomendación dada: el del proveedor.** Es el original, cuesta menos de
la mitad y es lo que el cliente pidió.

**Falta preguntarle al proveedor:** el plazo real, y si esa lámpara es
14,5 V / 50 W con código K05 009 00. El portal no lo dice.

**La cotización COT-SB-1126-011 ya enviada a Luis usa el camino de eBay.**

### 8. Las tres preguntas abiertas con Bruno López (Policlínico Peruano Japonés)

Cotizaciones **007** (autoclave Biobase BKM-Z45B, S/ 24,050, enviada por
correo) y **008** (lavador Tuttnauer TIVA2-H, S/ 54,719, **DUDOSO si la
envió**).

Falta:

- **El RUC y la razón social.** El correo es `@apj.org.pe` — Asociación
  Peruano Japonesa. La razón social de la factura probablemente sea la
  asociación, no «Policlínico Peruano Japonés».
- **El plazo de entrega del TIVA2-H.** El proveedor marca stock agotado.
- **Si el Part Number ATS238-0313 incluye la conexión de agua caliente y
  desmineralizada.** En el brochure de Tuttnauer esa fila está marcada
  **`+` = OPCIONAL** para el TIVA2-H. **La cotización ya le promete al
  cliente que él pone el agua osmotizada.** Si el equipo no la puede
  recibir de fábrica, se cae en la instalación. **Este es el riesgo más
  caro que quedó abierto.**
- **Si la cesta va incluida en el precio.**
- **Si Bruno quería un ultrasónico y no un desinfector térmico.** Él
  escribió «lavador ultrasónico» y se le cotizó un desinfector de
  S/ 54,719. El correo se lo aclara.
- **La selladora de bolsas.** Sigue sin cotizar, y **Sinergia no tiene
  ninguna en catálogo.**

### 9. La razón social del alquiler ya resuelta

La cotización **005** del sonómetro Fluke 945 quedó completa:
ALVARADO MAURIOLA FERNANDO SEBASTIAN, RUC 10745607093, S/ 80 + S/ 200 de
garantía. **DUDOSO si la envió.**

### 10. Los documentos que faltan bajar del portal

El panel del favorito dijo el 6 de noviembre: quedan **523 equipos** a los
que no se les han buscado documentos. Va de 20 en 20.

**El Edan SD-5 (075.554) es la prueba pendiente:** el portal le muestra
**6 documentos**, en Drive hay **1**, y **no tiene marca de cerrado**, así
que sigue en la cola con prioridad 1 por ser equipo publicado. Cuando le
toque, se sabrá si el favorito trae los 6 o solo uno.

### 11. Pendientes largos heredados de antes

- Los 11 PDF de alquiler
- `abrirConReintento_`
- Unificar el llenado de placeholders
- El desborde de 26 px de la cabecera a 320 px — lo causan `nav` +
  `button.sb-cart-btn`, que suman 346 px. Solo afecta a las páginas
  estáticas generadas, no a la SPA.
- Una nota en el repositorio diciendo que `Venta.gs` se llama `Code.gs`
  dentro de Apps Script
- `Unidades!serie` está vacío para el Fluke 945 — no hay número de serie
  que reportar si un alquiler no vuelve
- Páginas duplicadas: `edan-h100b` / `edan-h100b-2`, y tres
  `riester-big-ben`
- **5 páginas con el título repetido:** tres lámparas KLS Martin comparten
  «Lámpara quirúrgica LED KLS Martin marLED E3»
  (`kls-martin-084199`, `kls-martin-087352`, `kls-martin-095440`) y dos
  sets HEINE comparten «Set Heine BETA 200S LED / BETA 200 LED»
  (`heine-beta-200s-led-beta-200-led` y el `-2`). Google elige una y
  descarta las otras: son candidatas directas a las 80 no indexadas.
- **1 página con error 404.** No se identificó cuál.
- **80 páginas «descubiertas, sin indexar».** No se vio el listado.

---

## 9. TRAMPAS

Cosas que ya fallaron. No repetirlas.

### El favorito carga desde producción

`https://sinergiabiomedica.pe/js/proveedor-atl.js`, que es `main`. **Un
arreglo en una rama sin fusionar no existe para el favorito.** Esto es lo
que hizo que el error del contador siguiera activo después de arreglarlo.

### Los ZIP y las tildes

La primera vez se armó un ZIP con una herramienta que no marca UTF-8 y en
Windows los nombres salieron `Cat├ílogo`, `t├®cnica`, `b├ísica`. Hubo que
renombrar 5 archivos en Drive a mano.

**Siempre con `zipfile` de Python**, que marca el bit 11. Y **verificar**
contando nombres con `�` o `Ã` antes de mandarlo.

### Drive no sirve PDF por el enlace `/view`

Hay que pedirlo por `uc?export=download&id=…`. Y **comprobar que empieza
por `%PDF`**: si el archivo es privado, Drive devuelve una página HTML de
inicio de sesión, y sin esa comprobación se pega al final de la cotización
del cliente.

### Los códigos en Sheets pierden el cero

Escribir `085.729` como número lo convierte en `85.729`. **Siempre con
apóstrofo:** `'085.729`. Me pasó y lo tuve que corregir.

### eBay bloquea

`WebFetch` a `ebay.com` devuelve **403**. No se puede leer un anuncio desde
aquí. Hay que pedirle a Luis una captura.

### No reinstalar Playwright

El Chromium está en `/opt/pw-browsers/chromium` y una instalación nueva no
lo encuentra. Si otra herramienta necesita Chrome, apuntarla a esa ruta con
`--headless --no-sandbox`.

### El precio del alquiler sale de un archivo, no de la hoja

`data/tarifas-alquiler.json` **pisa** lo que diga la hoja, vía
`aplicar_tarifas()` en `generar_paginas.py`.

**Me equivoqué con esto:** dije que el Fluke 945 costaba S/ 108 el día
porque lo leí de la hoja. Luis me mostró su propia página diciendo S/ 80.
El 108 es el precio de referencia de mercado; **el que cobra es el 80**.
Llegué a generar una cotización con el precio malo.

### El `?` del Apps Script

La URL termina en `/exec` sin query. Para refrescar es `?refrescar=1`, no
`&refrescar=1`. Con el `&` la respuesta viene vacía y el JSON no parsea.

### Hay DOS endpoints de Apps Script

`CL_URL` es alquiler, `VENTA_URL` es venta. **Me equivoqué y pedí el de
alquiler buscando el catálogo de venta**: devolvió `equipos`, no
`productos`, y el conteo dio 0.

### El push se bloquea

El clasificador de permisos de la sesión bloqueó `git push` repetidamente,
con el motivo «Out-of-Place Publication». **No intentes rodearlo** usando
las herramientas de GitHub u otra ruta: avísale a Luis y que lo habilite.

Un detalle: cuando el comando combinado `git add && git commit && git push`
se bloquea, **no se ejecuta nada**, ni siquiera el commit. Hay que
separarlos.

### No decidas sus términos comerciales

Precios, plazos, garantías y descuentos son suyos. Se le propone con el
cálculo a la vista y se espera. **Excepción razonable:** cuando el costo es
trivial y el cliente lo pidió expresamente —las 4 pilas AA del set HEINE—
se incluyó, se dijo claramente, y se le ofreció revertirlo en una línea.

### Cuidado con el tono de los mensajes a clientes

Una vez se propuso una frase que hizo que la clienta se disculpara
(«creo que se le escapó un dígito al escribirlo» → *«si recién me doy
cuenta del dígito, disculpe»*). Luis dijo **«quítale eso»**. No pongas al
cliente en posición de pedir perdón.

### Verifica antes de afirmar

Varias veces afirmé algo de memoria y estaba mal. Lo que funcionó fue:
leer el archivo, comparar contra el remoto, contar en los 195 archivos,
bajar el archivo que la web sirve de verdad.

Dos ejemplos de esta sesión:

- Dije que el favorito «no puede bajar fichas ni catálogos». **Falso:**
  puede desde el 31 de octubre. Lo que es cierto es que todos los
  documentos que guardó son anteriores a ese arreglo y no se ha vuelto a
  topar con un equipo que tenga documentos sin guardar.
- Dije que 2 de 16 marcas eran falsas. **Era 1.** `REVISADO` es correcto
  para un equipo cuyos documentos ya están guardados.

**Corrige en cuanto lo sepas, con una línea, sin dramatizar.**

### Cosas que ya se borraron y no hay que volver a buscar

- Dos fichas propias de Sinergia que estaban por error en la carpeta de
  documentos del proveedor — Luis pidió mandarlas a la papelera
- 16 filas `NINGUNO` + 4 `REVISADO` de una tanda anterior

---

## ARCHIVOS CREADOS O MODIFICADOS EN ESTA SESIÓN

### Creados

| Archivo | Qué hace |
|---|---|
| `scripts/generar_cotizacion.js` | **El motor de cotizaciones.** Lee una solicitud JSON, dibuja la hoja con `cotHTML()` —la misma función del sitio—, opcionalmente dibuja una ficha A4 propia, busca el documento del fabricante por el código del equipo, lo baja de Drive y lo pega al final |
| `data/documentos.json` | Índice de documentos del proveedor: 24 códigos, 34 documentos, con tipo, nombre e ID de Drive. Copiado de la hoja «Documentos». Lo usa el motor para saber qué adjuntar |
| `data/cotizaciones/COT-SB-1126-009.json` | Solicitud del DEA CU-SP1 para QHSE Energy Services |
| `data/cotizaciones/COT-SB-1126-010.json` | Solicitud del colchón a medida para SHENKA. Primer caso de términos reemplazados |
| `data/cotizaciones/COT-SB-1126-011.json` | Solicitud de la lámpara del HKN-93 para Harold Alemán. Lleva el bloque `ficha` con 14 parámetros |
| `data/cotizaciones/COT-SB-1126-012.json` | Solicitud del DEA para SG Natclar. **Commiteada pero sin subir** |
| `data/fichas-venta/mindray-ba88a.json` | Ficha del analizador bioquímico: 7 secciones, 37 parámetros |
| `data/fichas-venta/meling-xc-630l.json` | Ficha de la refrigeradora de banco de sangre: 7 secciones, 46 parámetros |
| `data/fichas-venta/ca-mi-new-askir-230-12v-br.json` | Ficha del aspirador de secreciones |
| `data/fichas-venta/heine-mini-3000-led.json` | Ficha del set de diagnóstico de bolsillo |
| `img/cotizacion/items/lampara-hkn93.jpg` | Foto de la lámpara, recortada de una captura del anuncio y con las flechas de eBay borradas |
| `TRASPASO.md` | Este documento |

### Modificados

| Archivo | Qué cambió |
|---|---|
| `js/proveedor-atl.js` | **El arreglo del favorito.** 17 líneas: no marca «sin documentos» si el contador del portal no contestó. Y el panel informa aparte cuántos quedaron sin certeza |
| `js/13-cotizador.js` | Se agregó `mil()`, que imprime los importes con separador de miles; se aplicó a los 15 `toFixed(2)` del documento. Más la línea «Incluye» en el cuadro y la etiqueta DNI/RUC según el documento |
| `js/14-venta-cot.js` | Un importe más pasado por `mil()` |
| `scripts/generar_paginas_venta.py` | `parametros()` reescrita: todas las fichas se dibujan igual, un bloque plegable por grupo, el primero abierto. Se quitaron las cinco tarjetas destacadas y la tabla de tiempos abierta |
| `google-apps-script/Venta.gs` | El endpoint privado `cot=codigos`; `nrmDoc_()` para comparar nombres sin tildes; y `compartirDocumentos()`, que deja compartidos por enlace los documentos subidos a mano. **Hay que pegarlo en Apps Script y redesplegar** |
| `img/cotizacion/membrete.png` | El teléfono pasó de `T. 956 614 346` a `T. 908 704 131`. Dibujado con la fuente real del sitio (Titillium Web 300) y el color exacto del original, no imitado |
| `data/fichas-venta/biobase-bkm-za.json` | Fuera «Empaque de puerta de repuesto» y «Fusible de repuesto» de lo que incluye |
| `data/fichas-venta/biobase-bkm-zb.json` | Lo mismo |
| `js/app.js`, `index.html`, `js/06-portal.js`, `css/app.css`, `css/18-cotizador.css` | Regenerados por `empaquetar_web.py`. Sello actual `?v=8268b308` |
| `venta/*/index.html` (9 páginas) | Regeneradas |
| `fichas/venta/*` (PDF y HTML) | Regeneradas las que cambiaron |
| `sitemap.xml`, `feed-google.xml` | Regenerados. **Solo cambió `lastmod`; ninguna URL se movió** |
