#!/usr/bin/env python3
"""bajar_fotos_venta.py — Trae a nuestro dominio las fotos del proveedor.

Las fotos llegan de la hoja como enlaces de Google Drive. Servidas desde
ahí, Google las rastrea peor y la pestaña de Imágenes no las asocia a
sinergiabiomedica.pe, así que se guardan en img/venta/ como:

    <id>.jpg      hasta 1200 px      <id>.webp
    <id>-m.jpg    hasta  700 px      <id>-m.webp

No se agranda ninguna foto: si el proveedor la publicó pequeña, se guarda
pequeña (inventar píxeles la deja borrosa). El sitio ya las encaja con
object-fit: contain, así que no hace falta rellenar con blanco.

Uso:  python3 scripts/bajar_fotos_venta.py [--rehacer]
Correrlo dos veces no cambia nada: salta las que ya están.
"""
import io
import json
import re
import os
import subprocess
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(RAIZ, 'img', 'venta')
CACHE = '/tmp/fotos-proveedor'
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120 Safari/537.36')


def bajar(url, pid):
    """La foto original del proveedor, lo más grande que la entregue."""
    guardado = os.path.join(CACHE, pid + '.bin')
    if os.path.exists(guardado) and os.path.getsize(guardado) > 2000:
        return open(guardado, 'rb').read()
    grande = url.replace('sz=w800', 'sz=w1600').replace('sz=w700', 'sz=w1600')
    d = subprocess.run(['curl', '-sL', '--max-time', '60', '-A', UA, grande],
                       capture_output=True).stdout
    if len(d) > 2000:
        os.makedirs(CACHE, exist_ok=True)
        open(guardado, 'wb').write(d)
    return d


def guardar(im, destino, tope):
    copia = im.copy()
    copia.thumbnail((tope, tope), Image.LANCZOS)     # nunca agranda
    copia.save(destino + '.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
    copia.save(destino + '.webp', 'WEBP', quality=82, method=5)
    return copia.size


def main():
    vivo = json.load(open(os.path.join(RAIZ, 'data/venta-vivo.json')))
    pend = [p for p in vivo['productos']
            if str((p.get('fotos') or [''])[0]).startswith('https://drive')]
    print('%d equipos con la foto en Drive' % len(pend))
    os.makedirs(DEST, exist_ok=True)
    rehacer = '--rehacer' in sys.argv
    hechas, chicas, fallan = [], [], []
    for i, p in enumerate(pend, 1):
        pid = p['id']
        guardada = os.path.join(DEST, pid + '.jpg')
        if os.path.exists(guardada) and not rehacer:
            hechas.append(pid)
            with Image.open(guardada) as y:          # para el informe de abajo
                if y.width < 600:
                    chicas.append((pid, y.width, y.height))
            continue
        d = bajar(p['fotos'][0], pid)
        if not d:
            fallan.append(pid)
            print('%3d/%d  %-30s NO SE PUDO BAJAR' % (i, len(pend), pid))
            continue
        try:
            im = Image.open(io.BytesIO(d)).convert('RGB')
            ancho, alto = guardar(im, os.path.join(DEST, pid), 1200)
            guardar(im, os.path.join(DEST, pid + '-m'), 700)
        except Exception as exc:                      # foto rota o formato raro
            fallan.append(pid)
            print('%3d/%d  %-30s ERROR %s' % (i, len(pend), pid, exc))
            continue
        hechas.append(pid)
        if ancho < 600:
            chicas.append((pid, ancho, alto))
        print('%3d/%d  %-30s %4dx%-4d' % (i, len(pend), pid, ancho, alto))
    print('\nguardadas: %d · fallaron: %d' % (len(hechas), len(fallan)))
    if chicas:
        print('De ésas, %d llegan chicas del proveedor (menos de 600 px de ancho):' % len(chicas))
        for pid, a, b in chicas:
            print('   %-30s %dx%d' % (pid, a, b))
    if fallan:
        print('fallaron:', ', '.join(fallan))
    # La lista va dentro de data/venta.json: es la que leen la tienda y el
    # generador de páginas para preferir la copia propia a la de Drive.
    ruta = os.path.join(RAIZ, 'data/venta.json')
    texto = open(ruta, encoding='utf-8').read()
    lista = ',\n'.join('    "%s"' % x for x in sorted(hechas))
    bloque = ('  "fotosLocales": [\n%s\n  ],\n' % lista)
    quitar = re.search(r'  "fotosLocales": \[.*?\n  \],\n', texto, re.S)
    if quitar:
        texto = texto[:quitar.start()] + bloque + texto[quitar.end():]
    else:
        texto = texto.replace('  "categorias": [', bloque + '  "categorias": [', 1)
    open(ruta, 'w', encoding='utf-8').write(texto)
    print('data/venta.json → fotosLocales con %d equipos' % len(hechas))


main()
