# Instalación y despliegue

Esta web es **estática**: un `index.html` que lee los datos desde `data/catalogo.json` (o desde Google Sheets en vivo). No necesita servidor propio ni base de datos para funcionar.

---

## 1. Requisitos

- Una cuenta de **GitHub** (gratis).
- Una cuenta de **Vercel** o usar **GitHub Pages** (gratis).
- *(Opcional)* **Python 3** instalado, solo si vas a regenerar `catalogo.json` desde el Excel.
- *(Opcional)* **Git** instalado para subir desde tu PC (también puedes subir por la web de GitHub).

---

## 2. Probar en tu PC

```bash
cd sinergia-biomedica
python3 -m http.server 8080
# abre http://localhost:8080
```

> Si abres `index.html` con doble clic, también se ve, pero usando los **datos integrados de respaldo** (el navegador bloquea leer archivos locales por seguridad). Para ver la versión que lee `catalogo.json`, úsalo servido como arriba.

---

## 3. Subir a GitHub

**Opción por la web (sin instalar nada):** crea un repositorio nuevo en GitHub llamado `sinergia-biomedica` y arrastra todos los archivos de esta carpeta.

**Opción por consola:**

```bash
cd sinergia-biomedica
git init
git add .
git commit -m "Web Sinergia Biomédica (datos sincronizables)"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/sinergia-biomedica.git
git push -u origin main
```

---

## 4. Publicar gratis

### Opción A — Vercel (recomendada para el dominio)
1. Entra a [vercel.com](https://vercel.com) → **Add New → Project** → importa tu repo.
2. Framework Preset: **Other**. Root y Output: por defecto. → **Deploy**.
3. Para usar **sinergiabiomedica.pe**: Project → Settings → Domains → agrega el dominio y apunta los DNS según indique Vercel.

### Opción B — GitHub Pages
1. Repo → **Settings → Pages**.
2. Source: **Deploy from a branch** → `main` / `/ (root)` → **Save**.
3. Queda en `https://TU_USUARIO.github.io/sinergia-biomedica/`.

---

## 5. Editar el catálogo / los precios

### Opción B (archivo) — editar el Excel y regenerar el JSON
1. Abre `data/sinergia-hoja-maestra.xlsx` y edita las hojas **Equipos** y **Paquetes** (las celdas amarillas son precios editables).
2. Regenera el JSON:
   ```bash
   pip install openpyxl        # solo la primera vez
   python3 scripts/build_catalogo.py
   ```
3. Sube los cambios (`git add . && git commit -m "Actualizo precios" && git push`). Vercel/Pages republica solo.

### Opción A (en vivo) — editar Google Sheets
No necesitas regenerar nada: editas el Google Sheet y la web cambia al recargar.
Configúralo una sola vez siguiendo **`GOOGLE-SHEETS.md`**.

---

## 6. Formulario de reserva (correo)

Hoy el formulario de reserva arma la cotización en pantalla. Para **recibir las solicitudes por correo** sin backend, usa **Formspree**:
1. Crea un formulario en [formspree.io](https://formspree.io) apuntando a `logistica@sinergiabiomedica.pe`.
2. Conecta el botón "Enviar solicitud" a ese endpoint (te puedo dejar el código cuando lo definas).

Para guardarlas en base de datos y panel propio, ver la fase productiva en `ARQUITECTURA.md`.

---

## Resumen

| Quiero… | Hago… |
|---|---|
| Ver la web | `python3 -m http.server 8080` |
| Publicarla | Subir a GitHub → Vercel/Pages |
| Cambiar un precio (archivo) | Editar Excel → `build_catalogo.py` → push |
| Cambiar un precio (en vivo) | Editar Google Sheet (ver `GOOGLE-SHEETS.md`) |
| Recibir reservas por correo | Conectar Formspree |
