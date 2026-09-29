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
PORTAL = ['css/13-clientes.css', 'css/15-expediente.css',
          'js/06-expediente.js', 'js/06-tablero.js', 'js/06-clientes.js']


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


def main():
    html = leer('index.html')
    css, js = lista(html, 'CSS'), lista(html, 'JS')

    h = hashlib.sha256()
    for f in css + js + PORTAL:
        h.update(f.encode())
        h.update(SELLO.sub('', leer(f)).encode())
    v = '?v=' + h.hexdigest()[:8]
    print('sello', v)

    for f in js + PORTAL:
        escribir(f, SELLO.sub(v, leer(f)))

    escribir('css/app.css', unir(css, '\n'))
    # El ';' separa los guiones por si uno termina sin punto y coma.
    escribir('js/app.js', unir(js, '\n;\n'))
    escribir('index.html', re.sub(r'((?:css/app\.css|js/app\.js))\?v=[0-9a-f]+',
                                  lambda m: m.group(1) + v, html))


if __name__ == '__main__':
    main()
