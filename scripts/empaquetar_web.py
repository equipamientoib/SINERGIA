#!/usr/bin/env python3
"""Une los CSS y JS sueltos en css/app.css y js/app.js, y pone el sello ?v=.

Los archivos sueltos son los que se editan. La lista y el orden viven en los
comentarios <!--PAQUETE-CSS ...--> y <!--PAQUETE-JS ...--> de index.html.

El sello es una huella de todo lo que el navegador descarga con ?v=: el
paquete y los módulos del portal que 06-portal.js pide aparte. Se calcula
ignorando los ?v= ya puestos, así que correrlo dos veces sin cambios deja
todo igual.

Uso:  python3 scripts/empaquetar_web.py
"""
import hashlib
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SELLO = re.compile(r'\?v=[0-9a-f]+')
# Los que 06-portal.js carga aparte, fuera del paquete.
PORTAL = ['css/13-clientes.css', 'css/15-expediente.css', 'css/16-pme.css',
          'js/06-expediente.js', 'js/06-tablero.js', 'js/06-pme.js', 'js/06-clientes.js']
# Sueltos: index.html los pide con su propia etiqueta, fuera del paquete,
# porque las páginas estáticas también los usan. Entran igual en el sello y
# se les pone el ?v= en index.html; si no, un cambio en ellos no llega nunca
# al navegador de quien ya visitó el sitio.
SUELTOS = ['css/carrito.css', 'css/promo-ventana.css',
           'js/carrito.js', 'js/promo-ventana.js']


def leer(ruta):
    return (RAIZ / ruta).read_text(encoding='utf-8')


def escribir(ruta, texto):
    p = RAIZ / ruta
    if p.read_text(encoding='utf-8') != texto:
        p.write_text(texto, encoding='utf-8')
        print('  escrito', ruta)


def lista(html, tipo):
    m = re.search(r'<!--PAQUETE-' + tipo + r'\n(.*?)-->', html, re.S)
    return m.group(1).split()


def unir(archivos, sep):
    return sep.join('/* ===== %s ===== */\n%s' % (f, leer(f).rstrip('\n') + '\n')
                    for f in archivos)


def revisar_js(rutas):
    """Un .js con un error de sintaxis se empaqueta igual y deja la
    página en blanco, sin aviso hasta que alguien la abre. Si hay node,
    se comprueba antes de tocar nada. Sin node, se sigue: es una red de
    seguridad, no un requisito."""
    import shutil
    import subprocess
    node = shutil.which('node')
    if not node:
        print('  (sin node: no se comprueba la sintaxis de los JS)')
        return
    salto = chr(10)
    malos = []
    for r in rutas:
        f = RAIZ / r
        if f.suffix != '.js' or not f.exists():
            continue
        p = subprocess.run([node, '--check', str(f)], capture_output=True, text=True)
        if p.returncode:
            detalle = (p.stderr or '').strip().split(salto)[:3]
            malos.append(r + salto + (salto + '      ').join([''] + detalle))
    if malos:
        raise SystemExit('ERROR de sintaxis, no se empaqueta nada:'
                         + salto + '  · ' + (salto + '  · ').join(malos))
    print('  sintaxis de los JS: bien')


def main():
    html = leer('index.html')
    css, js = lista(html, 'CSS'), lista(html, 'JS')

    revisar_js(js + PORTAL + SUELTOS)

    h = hashlib.sha256()
    for f in css + js + PORTAL + SUELTOS:
        h.update(f.encode())
        h.update(SELLO.sub('', leer(f)).encode())
    v = '?v=' + h.hexdigest()[:8]
    print('sello', v)

    for f in js + PORTAL:
        escribir(f, SELLO.sub(v, leer(f)))

    escribir('css/app.css', unir(css, '\n'))
    # El ';' separa los guiones por si uno termina sin punto y coma.
    escribir('js/app.js', unir(js, '\n;\n'))
    sueltos = '|'.join(re.escape(f) for f in SUELTOS)
    html = re.sub(r'((?:css/app\.css|js/app\.js|%s))(\?v=[0-9a-f]+)?' % sueltos,
                  lambda m: m.group(1) + v, html)
    escribir('index.html', html)


if __name__ == '__main__':
    main()
