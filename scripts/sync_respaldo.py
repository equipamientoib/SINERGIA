#!/usr/bin/env python3
"""
sync_respaldo.py — Copia el catálogo de data/catalogo.json dentro de
js/02-datos.js (los arreglos EQUIPOS y PAQUETES).

Para qué sirve
--------------
js/02-datos.js es el respaldo que usa la web si no responde ni el archivo
del repositorio ni el Apps Script. Si ese respaldo tiene datos viejos y
alguna vez llega a pintarse, el cliente ve equipos o precios que ya no
existen. Este script lo deja siempre como un espejo exacto.

Cuándo ejecutarlo
-----------------
Cada vez que cambie data/catalogo.json:

    python3 scripts/build_catalogo.py     # hoja -> data/catalogo.json
    python3 scripts/sync_respaldo.py      # data/catalogo.json -> js/02-datos.js

Luego se suben los dos archivos juntos.
"""
import json, os, sys

ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT   = os.path.join(ROOT, "data", "catalogo.json")
DATOS = os.path.join(ROOT, "js", "02-datos.js")

CABECERA = """/* =====================================================================
   02-datos.js — DATOS DE RESPALDO
   ---------------------------------------------------------------------
   Este archivo es SOLO el último recurso: se usa si no responde ni
   data/catalogo.json ni el Apps Script de Google Sheets.

   NO SE EDITA A MANO. Es un espejo de data/catalogo.json y se regenera
   con:  python3 scripts/sync_respaldo.py
   ===================================================================== */
"""


def arreglo(items):
    return "[\n" + ",\n".join("  " + json.dumps(x, ensure_ascii=False) for x in items) + "\n]"


def main():
    if not os.path.exists(CAT):
        sys.exit("No encuentro data/catalogo.json. Ejecuta antes build_catalogo.py")

    cat = json.load(open(CAT, encoding="utf-8"))
    equipos, paquetes = cat.get("equipos", []), cat.get("paquetes", [])
    if not equipos or not paquetes:
        sys.exit("catalogo.json viene vacío: no se toca el respaldo por seguridad.")

    src = open(DATOS, encoding="utf-8").read()

    # Se conserva todo lo que viene después de los dos arreglos (APOYO, KIT,
    # parámetros del modelo y las funciones de dibujo).
    try:
        i_apoyo = src.index("const APOYO")
        i_pkg   = src.index("let PAQUETES")
        i_model = src.index("/* Parámetros del modelo")
    except ValueError:
        sys.exit("No reconozco la estructura de js/02-datos.js. Revísalo a mano.")

    apoyo_kit = src[i_apoyo:i_pkg].rstrip("\n")
    cola      = src[i_model:]

    nuevo = "%s\nlet EQUIPOS = %s;\n\n%s\n\nlet PAQUETES = %s;\n\n%s" % (
        CABECERA, arreglo(equipos), apoyo_kit, arreglo(paquetes), cola)

    open(DATOS, "w", encoding="utf-8").write(nuevo)
    print("OK respaldo sincronizado: %d equipos, %d paquetes" % (len(equipos), len(paquetes)))


if __name__ == "__main__":
    main()
