# Imágenes — convención de carpetas y nombres

**Regla de oro: el nombre del archivo NUNCA cambia.** Para poner una foto real,
reemplaza el archivo de muestra por tu foto **con el mismo nombre**, y listo:
la web, el Excel y el JSON ya apuntan ahí.

| Carpeta | Qué va | Nombre del archivo |
|---|---|---|
| `tienda/` | Fotos de los equipos del catálogo | **= id del equipo** (ej. `esa620.jpg`, `defib.jpg`, `ms400.jpg`) |
| `proyectos/` | Fotos de la sección Nuestros clientes | **= id del proyecto** (ej. `clinica-monitores.jpg`) |
| `carrusel/` | Fotos grandes para portada/galerías futuras | `carrusel-01.jpg`, `carrusel-02.jpg`, … (16:9) |
| `logos/` | Logos SVG de la marca (referencia para otros materiales) | `logo-header.svg`, `logo-footer.svg` |
| `icons/` | Favicons PNG (16/32/180/192/512) — variante C crema | no renombrar |
| `otros/` | Cualquier imagen suelta | libre |

## Estado actual

- **Fotos reales:** `tienda/esa620.jpg` (Fluke ESA620) y `tienda/sp-sim.jpg` (Rigel SP-SiM).
- **Muestras** (marcadas "IMAGEN DE MUESTRA"): el resto de equipos, `proyectos/taller-inhouse.jpg` y el carrusel.
- Las tarjetas del catálogo muestran el **ícono SVG** hasta que actives la foto: reemplaza la muestra por la foto real y escribe `img/tienda/<id>.jpg` en la columna `foto` de la hoja **Equipos**.

## Recomendaciones de foto

- Equipos: fondo claro/neutro, equipo centrado, mínimo 1200×900 (4:3), JPG.
- Proyectos: foto del servicio en sitio, mínimo 1200×900.
- Carrusel: horizontal 1600×900 (16:9).
- Peso ideal < 400 KB por imagen (exporta a calidad 80–85%).

## Nota sobre `favicon.ico`

El `favicon.ico` vive en la **raíz** del sitio (no en `img/icons/`) porque los
buscadores y navegadores lo piden por convención en `/favicon.ico`. Todos los
demás formatos del ícono sí están en `img/icons/`.
