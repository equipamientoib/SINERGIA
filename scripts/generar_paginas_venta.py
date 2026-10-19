#!/usr/bin/env python3
"""
generar_paginas_venta.py — Una página de verdad por cada equipo de VENTA.

La tienda vive en direcciones con «#/» (#/venta/p/<id>), que para Google son
todas la misma página. Este script escribe, con el mismo formato que las
páginas de alquiler (galería, datos, ficha técnica, pestañas):

    venta/index.html            todos los equipos, por categoría
    venta/<id>/index.html       un equipo
    sitemap.xml                 agrega las páginas de venta (las de alquiler
                                las pone scripts/generar_paginas.py)
    index.html: window.PAGINA_VENTA (a qué página va cada equipo de la tienda)

Ficha técnica: si existe fichas/venta/ficha-tecnica-<id>.pdf se puede ver y
descargar; si no, queda el espacio con «Pídela por WhatsApp». Parámetros:
si existe data/fichas-venta/<id>.json (mismo formato que data/fichas/) se
usa su tabla; si no, la identificación y las características de la hoja.

Lee
    --datos <archivo>   JSON en vivo del Apps Script de venta (VENTA_URL)
    data/venta.json     categorías, fotos fijas y fotos antiguas de respaldo

Uso
    python3 scripts/generar_paginas_venta.py --datos /tmp/venta.json

Correrlo dos veces sin cambios en los datos no cambia ningún archivo.
"""
import argparse
import datetime
import json
import os
import re
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generar_paginas as gp  # noqa: E402  (plantilla, logo, galería y escritura compartidas)

ROOT = gp.ROOT
SITIO = gp.SITIO
e = gp.e
VENTA = os.path.join(ROOT, 'data', 'venta.json')
FICHAS_VENTA = os.path.join(ROOT, 'data', 'fichas-venta')

VIGENCIA_DIAS = 14
TRAMOS = [(2000, 'Hasta S/ 2 000'), (6000, 'S/ 2 000 – 6 000'), (15000, 'S/ 6 000 – 15 000'),
          (40000, 'S/ 15 000 – 40 000'), (100000, 'S/ 40 000 – 100 000'), (float('inf'), 'Más de S/ 100 000')]


# ─────────────────────────── datos ───────────────────────────

def soles(n):
    """El precio como lo escribe una factura peruana: S/ 8,000.00

    Con los dos decimales. Sin ellos, «S/ 8,000» es ambiguo para quien lo
    lee a máquina: en medio mundo la coma es el separador decimal, así que
    ocho mil soles se leen como ocho. Con el punto decimal delante de los
    céntimos, la coma solo puede ser separador de miles.

    Esta es la ÚNICA función que escribe un precio para personas: la caja
    del precio, las tarjetas, la meta descripción, las páginas de familia,
    el hueco {precio} de los textos largos y la hoja A4. El precio para
    máquinas —el JSON-LD y el feed— se escribe aparte y SIN separador de
    miles, que es como lo quiere Google.
    """
    return 'S/ {:,.2f}'.format(n)


def tramo(p):
    pr = p.get('precio') or 0
    if not pr:
        return len(TRAMOS)
    return next(i for i, (tope, _) in enumerate(TRAMOS) if pr <= tope)


def ordenar(productos):
    """Mismo orden que la tienda: tramo de precio, puesto en el estudio, precio."""
    return sorted(productos, key=lambda p: (tramo(p), p.get('ranking') or 999,
                                            0 if p.get('destacado') else 1, p.get('precio') or 1e12, p['nom']))


def vigencia(actualizado):
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', actualizado or '')
    if not m:
        return None
    d = datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    return d + datetime.timedelta(days=VIGENCIA_DIAS)


def ajustar(p, repo):
    """Stock visible (30 % del proveedor, mínimo 1, máximo 10) y código NTS
    con su nombre oficial si la hoja aún no lo tiene (data/venta.json)."""
    q = dict(p)
    # El stock que viaja por dentro es el REAL. Antes aquí se recortaba al
    # 30 % con tope 10, y ese número recortado era el que llegaba al
    # cotizador y a todo lo demás: un equipo con 13 unidades se cotizaba
    # como si tuviera 3. El recorte ahora se hace solo al MOSTRAR
    # (stock_etiqueta), que es donde importa que no se vea el inventario.
    for k, v in ((repo.get('datosFijos') or {}).get(q['id']) or {}).items():
        if not q.get(k):
            q[k] = v
    if not q.get('clave'):
        q['clave'] = (repo.get('codigosNTS') or {}).get(q['id'], '')
    if q.get('clave') and not q.get('expediente'):
        q['expediente'] = (repo.get('nombresNTS') or {}).get(q['clave'], '')
    return q


def aplicar_promos(productos, promos):
    """Deja el precio de oferta como precio del equipo y el de lista en
    «precioLista», para tacharlo.

    La promoción puede venir de dos sitios: de la hoja (columnas
    precio_promo, promo_hasta y remate, que es lo normal) o de
    data/venta.json › promociones, para cargarla desde aquí. Si están las
    dos, manda la hoja.

    Se hace una sola vez, aquí: así la ficha, la tienda, el carrito, la
    cotización, la ventana de remates y el feed de Google cobran todos lo
    mismo, sin que cada uno tenga que acordarse de la promoción.
    """
    hoy = datetime.date.today()
    for p in productos:
        if p.get('remate') and p.get('promoHasta') and not p.get('promoFin'):
            try:                                      # remate con fecha de fin
                fin = datetime.date.fromisoformat(p['promoHasta'])
                if fin < hoy:
                    p.pop('remate', None)
                else:
                    p['promoFin'] = fin
            except ValueError:
                p.pop('promoHasta', None)
        if p.get('precioLista'):                      # ya viene resuelta de la hoja
            try:
                p['promoFin'] = datetime.date.fromisoformat(p.get('promoHasta') or '')
            except ValueError:
                p.pop('precioLista', None)
            continue
        d = (promos or {}).get(p['id'])
        if not isinstance(d, dict) or not p.get('precio'):
            continue
        ahora = d.get('ahora') or 0
        try:
            fin = datetime.date.fromisoformat(d.get('hasta') or '')
        except ValueError:
            continue
        if not (0 < ahora < p['precio']) or fin < hoy:
            continue
        p['precioLista'] = p['precio']
        p['precio'] = ahora
        p['promoFin'] = fin
        if d.get('remate'):
            p['remate'] = 1
    return productos


def promo(p, promos=None):
    """Lo que hay que mostrar de la promoción de un equipo, o None.

    Un REMATE no necesita descuento: son equipos de stock propio que se
    quieren sacar, y su precio ya es el de remate. Una PROMOCIÓN sí: es un
    equipo del catálogo al que se le bajó el precio.
    """
    rebaja = bool(p.get('precioLista') and p.get('promoFin'))
    if not rebaja and not p.get('remate'):
        return None
    return {'antes': p.get('precioLista') or 0, 'fin': p.get('promoFin'),
            'remate': bool(p.get('remate')), 'rebaja': rebaja,
            'baja': int(round((1 - p['precio'] / p['precioLista']) * 100)) if rebaja else 0}


def fotos(p, base, fijas, locales=()):
    """[(ligera, grande)] por orden: fija › copia propia › hoja/proveedor › antigua.

    La copia propia (img/venta/<id>.jpg, la deja scripts/bajar_fotos_venta.py)
    va antes que el enlace de Drive: servida desde nuestro dominio, Google la
    rastrea e indexa, y además carga más rápido."""
    propia = ['img/venta/%s.jpg' % p['id']] if p['id'] in locales else []
    urls = fijas.get(p['id']) or propia or p.get('fotos') or (base.get(p['id']) or {}).get('fotosSitio') or []
    out = []
    for u in urls:
        if u.lstrip('/').startswith('img/'):
            lig = gp.foto_local(u, {}, ligera=True)
            gra = gp.foto_local(u, {}, ligera=False)
            if lig:
                out.append((lig, gra or lig))
        elif 'drive.google.com/thumbnail' in u:
            out.append((re.sub(r'sz=w\d+', 'sz=w700', u), re.sub(r'sz=w\d+', 'sz=w1600', u)))
        elif u.startswith('http'):
            out.append((u, u))
    return out


def boton_carrito(p, foto, clase='btn fill', texto='Agregar a mi cotización'):
    """Botón de la cotización con los datos del equipo: la página suelta
    no carga el catálogo, así que los lleva encima.

    Dice «Agregar a mi cotización» y no «Agregar al carrito»: quien compra
    para un hospital no llena un carrito, arma una cotización para su
    expediente, y la palabra «carrito» hacía pensar en una tienda de ropa.
    """
    return ('<button type="button" class="%s" data-add="%s" data-nom="%s" data-mm="%s" '
            'data-nts="%s" data-precio="%s" data-foto="%s">%s</button>'
            % (clase, e(p['id']), e(p['nom']),
               e(' '.join(x for x in (p.get('marca'), p.get('modelo')) if x)),
               e(p.get('clave') or ''), int(p.get('precio') or 0), e(foto or ''), texto))


def barra_movil(p, wa, foto):
    """Barra fija al pie, solo en el celular.

    En un celular de 664 px de alto, el precio y los botones de la ficha
    quedaban a 840 px: había que bajar casi una pantalla entera para
    encontrar cómo contactar. Esta barra los deja siempre a la vista y se
    esconde sola mientras los botones de verdad están en pantalla.
    """
    precio = ('<span class="pbar-p"><b>%s</b><small>IGV incl.</small></span>' % soles(p['precio'])) \
        if p.get('precio') else '<span class="pbar-p"><b>Consultar</b><small>precio</small></span>'
    return ('<div class="pbar" id="pbar" aria-hidden="true">%s%s'
            '<a class="pbar-wa" href="%s" target="_blank" rel="noopener" aria-label="Preguntar por WhatsApp">'
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">'
            '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 '
            '4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.17c-.25.69-1.44 1.32-1.99 '
            '1.37-.51.05-1.16.07-1.87-.12-.43-.12-.99-.3-1.7-.61-2.99-1.29-4.94-4.3-5.09-4.5-.15-.2-1.22-1.62-1.22-3.09 '
            '0-1.47.77-2.19 1.04-2.49.27-.3.59-.37.79-.37.2 0 .4 0 .57.01.18.01.43-.07.67.51.25.59.84 2.06.91 2.21.07.15.12.32.02.52'
            '-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.3.31-.13.61.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 '
            '1.46.3.15.47.12.65-.07.17-.2.74-.87.94-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.5.22.57.35.07.12.07.72-.18 1.41z"/>'
            '</svg></a></div>'
            % (precio, boton_carrito(p, foto, 'pbar-add', 'Agregar a mi cotización'), wa))


def parametros(p, grupos, ce):
    """La pestaña de parámetros, en tres niveles en vez de una lista plana.

    Antes eran cuarenta filas seguidas, todas con el mismo peso: el fusible
    al lado de la capacidad. Quien compara equipos se perdía.

    Ahora: arriba las cinco cosas que deciden la compra, en tarjetas;
    debajo los tiempos de ciclo abiertos, que es el argumento que ningún
    competidor publica; y el resto plegado, un bloque por grupo.

    Lo plegado va en <details>, que es el elemento del navegador para esto:
    el texto está en el HTML —Google lo lee igual— y se abre aunque el
    JavaScript falle. No es el display:none de la tienda.
    """
    def dato(gt, et):
        for t, filas, _ in grupos:
            if not t.lower().startswith(gt):
                continue
            for k, v in filas:
                if k.lower().startswith(et):
                    return v
        return None
    tiempos = next((g for g in grupos if g[0].lower().startswith('tiempo total')), None)
    primer_ciclo = None
    if tiempos and tiempos[1]:
        k, v = tiempos[1][0]
        primer_ciclo = '%s · %s' % (v, k.split('·')[0].strip().lower())
    alim = (dato('instalaci', 'alimentaci') or '').split(';')[0].split('(')[0].strip()
    destacados = [('Capacidad', ce.get('capacidad')),
                  ('Ciclo más corto', primer_ciclo),
                  ('Medidas externas', dato('medidas', 'dimensiones externas')),
                  ('Peso neto', dato('medidas', 'peso neto')),
                  ('Alimentación', alim)]
    destacados = [(k, v) for k, v in destacados if v]
    html = ''
    if destacados:
        html += '<div class="pt-dest">%s</div>' % ''.join(
            '<div><span>%s</span><b>%s</b></div>' % (e(k), v) for k, v in destacados)

    def tabla(filas, nota):
        cuerpo = ''.join(('<tr><td colspan="2" class="car">%s</td></tr>' % v) if not k
                         else ('<tr><th>%s</th><td>%s</td></tr>' % (k, v)) for k, v in filas)
        pie_n = ('<p class="pt-nota">%s</p>' % e(nota)) if nota else ''
        return '<table class="pt-tabla">%s</table>%s' % (cuerpo, pie_n)

    # Si no hay tabla de tiempos, el primer bloque se abre solo. Si no, los
    # equipos sin parámetros del fabricante —que son casi todos— abrirían la
    # pestaña y verían dos barras cerradas y nada más: justo el problema que
    # esto venía a arreglar.
    # Los tiempos van ARRIBA del todo, debajo de las tarjetas, no en el
    # orden en que estén escritos en el archivo: son el argumento de venta
    # y tienen que verse sin abrir nada.
    if tiempos and tiempos[1]:
        html += '<h3 class="pt-h">%s</h3>%s' % (e(tiempos[0]), tabla(tiempos[1], tiempos[2]))
    abrir = tiempos is None
    for titulo, filas, nota in grupos:
        if not filas or titulo.lower().startswith('tiempo total'):
            continue
        html += ('<details class="pt"%s><summary>%s</summary>%s</details>'
                 % (' open' if abrir else '', e(titulo), tabla(filas, nota)))
        abrir = False
    return html


def ficha_venta(pid):
    ruta = os.path.join(FICHAS_VENTA, pid + '.json')
    return gp.leer_json(ruta) if os.path.exists(ruta) else None


NOMBRE_DOC = {'CTR': 'Ficha técnica', 'COR': 'Catálogo del fabricante',
              'RGS': 'Registro sanitario', 'OTR': 'Registro sanitario'}


TERMINOS = {}
try:
    with open(os.path.join(ROOT, 'data', 'terminos-venta.json'), encoding='utf-8') as _f:
        TERMINOS = json.load(_f)
except Exception:
    TERMINOS = {'garantiaMeses': 12, 'plazoStock': 'de 2 a 5 días hábiles',
                'plazoPedido': 'se confirma al emitir la cotización',
                'pago': '50 % con la orden de compra y 50 % contra entrega.',
                'incluye': 'Manual de usuario, certificado de garantía y capacitación de uso.'}


def condiciones(p):
    """Garantía, entrega, pago y qué incluye, como una pestaña más.

    Estos datos ya estaban en data/terminos-venta.json, pero solo se veían
    dentro de la cotización: es decir, después de que el cliente se
    decidiera a escribir. Quien compara proveedores no llega hasta ahí.

    Van en una pestaña y no en la columna del precio: ahí alargaban la
    primera pantalla y empujaban las pestañas y los equipos de abajo,
    repitiendo el mismo espacio dos veces.
    """
    con_stock = isinstance(p.get('stock'), (int, float)) and p['stock'] > 0
    filas = [
        ('Garantía', '%s meses del fabricante' % TERMINOS.get('garantiaMeses', 12)),
        ('Entrega', (TERMINOS.get('plazoStock') or '') if con_stock else (TERMINOS.get('plazoPedido') or '')),
        ('Pago', TERMINOS.get('pago') or ''),
        ('Incluye', TERMINOS.get('incluye') or ''),
    ]
    cuerpo = ''.join('<tr><th>%s</th><td>%s</td></tr>' % (e(k), e(v)) for k, v in filas if v)
    if not cuerpo:
        return ''
    return ('<table>%s</table>'
            '<p class="nota-p">Las condiciones definitivas van escritas en la cotización, '
            'con el plazo contado desde la orden de compra.</p>' % cuerpo)


def mensaje_wa(p):
    """El mensaje que el comprador manda por WhatsApp desde la ficha.

    Antes llegaba solo «quiero cotizar: <equipo>» y había que buscar el
    equipo a mano en la web para saber precio, código y stock. Ahora
    lleva esos datos y, sobre todo, el enlace que abre el cotizador con
    ese equipo ya puesto: de ahí sale la cotización formal sin buscar
    nada.
    """
    linea = ' · '.join(x for x in (p.get('marca'), p.get('modelo'),
                                   cod_texto(p),
                                   soles(p['precio']) if p.get('precio') else '') if x)
    partes = ['Hola Sinergia Biomédica, quiero cotizar:', '', p['nom']]
    if linea:
        partes.append(linea)
    partes += ['', SITIO + '/#/cotizar-venta/' + p['id']]
    return '\n'.join(partes)


def instalacion_incluida(p):
    """Etiqueta «instalación y capacitación incluidas», en los equipos que
    pasan el monto de data/terminos-venta.json › instalacionIncluida.

    Hoy Sinergia ya lo hace y nadie se entera: no estaba escrito en
    ninguna parte. En un equipo de este tamaño es lo que inclina la
    decisión frente a un proveedor que cobra el viaje aparte.
    """
    R = TERMINOS.get('instalacionIncluida') or {}
    desde = R.get('desde') or 0
    if not desde or not p.get('precio'):
        return ''
    # La hoja ya decidió el escalón con la utilidad del equipo (inst = 0, 1
    # o 2) y manda solo ese número. Si no viene (despliegue viejo o fila sin
    # precio de proveedor), se usa la regla de siempre por monto.
    inst = p.get('inst')
    if inst is None:
        if p['precio'] < desde:
            return ''
        completo = p['precio'] >= (R.get('desdePasajeCompleto') or 10 ** 12)
    else:
        if not inst:
            return ''
        completo = inst >= 2
    detalle = ('viaje, viáticos y pasaje aéreo incluidos'
               if completo else
               'incluye el viaje y hasta S/ %s de pasaje' % format(R.get('topePasaje') or 0, ','))
    return ('<p class="inst-inc"><span aria-hidden="true">✓</span> '
            '<b>Instalación y capacitación incluidas</b>, también fuera de Lima '
            '<small>(%s · %s %s en sitio)</small></p>'
            % (e(detalle), R.get('diasIncluidos') or 1,
               'día' if (R.get('diasIncluidos') or 1) == 1 else 'días'))


def pdf_venta(pid):
    return '/fichas/venta/ficha-tecnica-%s.pdf' % pid


# ─────────────────────────── plantilla ───────────────────────────

def pagina(cfg, *, ruta, title, descripcion, migas, cuerpo, jsonld, imagen=None):
    """Igual que la de alquiler, con la cabecera en modo Venta."""
    doc = gp.pagina(cfg, ruta=ruta, title=title, descripcion=descripcion, migas=migas,
                    cuerpo=cuerpo, jsonld=jsonld, imagen=imagen)
    nav_alq = re.search(r'<nav>\s*<span class="modo-sw".*?</nav>', doc, re.S).group(0)
    nav_venta = '''<nav>
    <span class="modo-sw" role="group" aria-label="Sección"><a class="on" href="/#/venta">Venta</a><a href="/#/alquiler">Alquiler</a></span>
    <a href="/#/venta">Inicio</a>
    <a href="/#/venta/tienda" class="on">Tienda</a>
    <a href="/promociones/">Promociones</a>
    <a href="/#/servicios">Servicios</a>
    <a href="/#/clientes">Clientes</a>
    <a href="/#/contacto">Contacto</a>
  </nav>'''
    doc = doc.replace(nav_alq, nav_venta)
    doc = doc.replace('quiero%20cotizar%20un%20alquiler.', 'quiero%20cotizar%20un%20equipo.')
    doc = doc.replace('scripts/generar_paginas.py a partir de data/seo-tipos.json\n     y del catálogo',
                      'scripts/generar_paginas_venta.py a partir de la hoja de venta')
    doc = doc.replace('</head>', '<link rel="stylesheet" href="/css/venta-paginas.css?v=%s">\n'
                      '<link rel="stylesheet" href="/css/carrito.css?v=%s">\n'
                      '<link rel="stylesheet" href="/css/promo-ventana.css?v=%s">\n</head>'
                      % (sello('venta-paginas.css'), sello('carrito.css'), sello('promo-ventana.css')), 1)
    # whatsapp.js va primero: los demás guiones pueden pedirle que abra un chat.
    doc = doc.replace('</body>', '<script defer src="/js/whatsapp.js?v=%s"></script>\n'
                      '<script defer src="/js/carrito.js?v=%s"></script>\n'
                      '<script defer src="/js/promo-ventana.js?v=%s"></script>\n</body>'
                      % (sello_js('whatsapp.js'), sello_js('carrito.js'),
                         sello_js('promo-ventana.js')), 1)
    return doc


def sello(css):
    return _sello(os.path.join(ROOT, 'css', css))


def sello_js(js):
    return _sello(os.path.join(ROOT, 'js', js))


def _sello(ruta):
    import hashlib
    with open(ruta, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:8]


def galeria(p, fts, primera=True):
    """La galería de un equipo de venta: las fotos vienen ya emparejadas
    (ligera y grande). El HTML lo arma gp.galeria_html, el mismo de alquiler."""
    return gp.galeria_html(e(' '.join(x for x in (p['nom'], p.get('marca', ''), p.get('modelo', '')) if x)),
                           [a for a, _ in fts], [b for _, b in fts], primera)

def franja(p):
    d = [(k, c, p.get(c)) for k, c in (('Marca', 'marca'), ('Modelo', 'modelo'), ('Origen', 'origen')) if p.get(c)]
    if cod_de(p):
        d.append(('Código', 'clave', cod_de(p)))
    if not d:
        return ''
    return '<dl class="ft">%s</dl>' % ''.join(
        '<div class="ft-%s"><dt>%s</dt><dd>%s</dd></div>' % (c, k, e(v)) for k, c, v in d)


def producto(p, cat, cfg, fts, promos, vig, prev, sig, mismos, base, fijas, locales):
    texto = mensaje_wa(p)
    wa = 'https://wa.me/%s?text=%s' % (cfg['whatsapp'], urllib.parse.quote(texto))
    correo = 'mailto:%s?subject=%s&body=%s' % (cfg['email'], urllib.parse.quote('Cotización: ' + p['nom']),
                                                urllib.parse.quote(texto))
    add = boton_carrito(p, fts[0][0] if fts else '')
    # Precio con vigencia (14 días desde la última actualización con el proveedor)
    caja = ''
    stock = p.get('stock')
    et = stock_etiqueta(p, detalle=True)
    badge = ('<span class="st %s">%s</span>'
             % ('si' if isinstance(stock, (int, float)) and stock > 0 else 'agotado', e(et))) if et else ''
    of = promo(p, promos)
    if p.get('precio'):
        nota = ('Incluye IGV · <span>Precio vigente hasta el <b data-vig="%s">%s</b> · se confirma en la cotización</span>'
                % (vig.isoformat(), vig.strftime('%d/%m/%Y'))) if vig else 'Incluye IGV · Precio referencial, se confirma en la cotización'
        if of:
            nota = ('Incluye IGV · <b>%s hasta el %s</b> · se confirma en la cotización'
                    % ('Promoción válida',
                       of['fin'].strftime('%d/%m/%Y'))) if of['fin'] else (
                   'Incluye IGV · <b>%s, hasta agotar stock</b> · se confirma en la cotización'
                    % 'Precio especial')
        # Nunca se muestra el precio anterior ni el porcentaje: el cliente
        # de este negocio vuelve a comprar y negocia, y anunciar la rebaja
        # deja la sensación de que el precio de lista estaba inflado.
        antes = '<span class="pc-of">Precio especial</span>' if of else ''
        caja = f'''<div class="precio{' con-promo' if of else ''}"><div class="pc-fila"><b class="pc-monto">{soles(p['precio'])}</b>{antes}{badge}</div>
          <small class="pc-nota">{nota}</small></div>'''
    elif badge:
        caja = '<div class="precio"><div class="pc-fila"><b class="pc-monto consulta">Consultar precio</b>%s</div></div>' % badge
    # Ficha técnica en PDF: se ofrece EQUIPO POR EQUIPO, solo si ese equipo
    # tiene cargados los parámetros del fabricante (data/fichas-venta/<id>.json).
    # Antes era un interruptor global, y estaba apagado con razón: sin
    # parámetros, la hoja repetía lo que el cliente ya había visto en la
    # página y descargarla no le aportaba nada. Así, el día que entre el
    # catálogo de otro equipo, su botón aparece solo, sin tocar código.
    f = ficha_venta(p['id'])
    pdf = pdf_venta(p['id'])
    ruta_pdf = os.path.join(ROOT, pdf.lstrip('/'))
    if f and os.path.exists(ruta_pdf):
        kb = max(1, round(os.path.getsize(ruta_pdf) / 1024))
        doc = f'''<div class="doc">
          <span class="doc-ico" aria-hidden="true">PDF</span>
          <span class="doc-txt"><b>Ficha técnica</b><small>PDF · {kb} KB</small></span>
          <button type="button" class="btn doc-ver" data-ver="{pdf}" data-pdf="{pdf}" data-titulo="Ficha técnica — {e(p['nom'])}">Ver</button>
          <a class="btn fill doc-dl" href="{pdf}" download>Descargar</a>
        </div>'''
    else:
        doc = ''

    # Pestañas: Descripción · Garantía y entrega · Parámetros técnicos · Código
    #
    # El texto largo, si el equipo lo tiene, va DENTRO de las pestañas, cada
    # sección en la suya. Antes se pintaba suelto debajo y las pestañas se
    # quedaban con un resumen de tres líneas.
    txt = texto_ficha(p)[0]
    areas = ''.join('<li>%s</li>' % e(a) for a in p.get('areas') or [])
    desc = '<p>%s</p>' % e(p.get('resumen') or '')
    # Con texto largo, la lista «Se usa en» sobra: el texto ya trae su
    # propia sección de dónde se usa, escrita y no en viñetas.
    if areas and not txt.get('descripcion'):
        desc += '<p class="nota-p"><b>Se usa en:</b></p><ul>%s</ul>' % areas
    desc += txt.get('descripcion') or ''
    desc += ('<p class="nota-p">Incluye asesoría para elegir el modelo, entrega en Lima y provincias '
             'y mantenimiento después de la venta.</p>')
    # La identificación va SIEMPRE, con o sin parámetros del fabricante.
    # Antes, el equipo que tenía ficha del fabricante perdía este bloque
    # entero y se llevaba con él el código, que es justo el dato que busca
    # el comprador del Estado. Ahora: identificación arriba, parámetros del
    # fabricante debajo.
    #
    # «Código» y la capacidad salen de data/venta.json › codigosEquipo,
    # escritos a mano equipo por equipo. No se infiere ninguno: si un
    # equipo no está en esa lista, no lleva código. Sin citar norma ni
    # listado, y solo aquí: ni en el texto ni en la meta-descripción.
    ce = (CODIGOS_EQUIPO or {}).get(p['id']) or {}
    ident = [('Equipo', p['nom']), ('Marca', p.get('marca')), ('Modelo', p.get('modelo')),
             ('Capacidad', ce.get('capacidad')), ('Código', cod_de(p)),
             ('Procedencia', p.get('origen')), ('Categoría', cat)]
    grupos = [('Identificación', [(k, e(v)) for k, v in ident if v], None)]
    if f:
        # Con los parámetros del fabricante no se repiten las cuatro o cinco
        # características del catálogo: las mismas («45 litros», «220 V»)
        # saldrían otra vez dos filas más abajo, y con menos detalle.
        grupos += [(g['titulo'], [(e(a_), e(b_)) for a_, b_ in g['filas']], g.get('nota'))
                   for g in f.get('secciones') or []]
        pie = ('<p class="nota-p fuente">Fuente: %s. Especificaciones sujetas a cambios del '
               'fabricante.</p>' % e(f.get('fuente', 'fabricante')))
    else:
        car = p.get('caracteristicas') or []
        if car:
            grupos.append(('Características principales', [('', e(c)) for c in car], None))
        pie = ('<p class="nota-p fuente">Los parámetros completos del fabricante van en la ficha técnica, '
               'que te enviamos con la cotización.</p>')
    pest = [('Descripción', desc)]
    # Garantía y entrega: si el texto largo trae su propia sección, esa
    # manda y la tabla de tres filas no se pinta. Decían lo mismo, y la
    # tabla decía menos: dos versiones del mismo dato en la misma página
    # es la forma más segura de que una se quede vieja.
    cond = txt.get('garantia') or condiciones(p)
    if cond:
        pest.append(('Garantía y entrega', cond))
    pest.append(('Parámetros técnicos', parametros(p, grupos, ce) + pie))
    if p.get('expediente') or p.get('clave'):
        exp = '<table>'
        if p.get('clave'):
            exp += ('<tr><th>Código</th><td><b>%s</b> · <a href="/venta/codigos-nts/#%s">otros equipos con este código</a></td></tr>'
                    % (e(p['clave']), e(p['clave'])))
        if p.get('expediente'):
            exp += '<tr><th>Nombre oficial</th><td>%s</td></tr>' % e(p['expediente'])
        exp += '<tr><th>Modelo ofertado</th><td>%s</td></tr></table>' % e(' '.join(x for x in (p.get('marca'), p.get('modelo')) if x))
        exp += ('<p class="nota-p">Envíanos la ficha técnica de tu expediente y te devolvemos el cuadro de '
                'cumplimiento, punto por punto, con el modelo ofertado.</p>')
        pest.append(('Código', exp))
    tabs = ''.join('<button type="button" class="tab%s" role="tab">%s</button>' % (' on' if k == 0 else '', e(n))
                   for k, (n, _) in enumerate(pest))
    panels = ''.join('<div class="panel" role="tabpanel"%s>%s</div>' % ('' if k == 0 else ' hidden', c)
                     for k, (_, c) in enumerate(pest))
    # Anterior / Siguiente (orden de la tienda) y otros de la categoría
    nav = '<nav class="sig" aria-label="Más equipos">%s%s</nav>' % (
        ('<a class="ant" href="/venta/%s/"><small>‹ Anterior</small><b>%s</b></a>' % (prev['id'], e(prev['nom']))) if prev else '<span></span>',
        ('<a class="pos" href="/venta/%s/"><small>Siguiente ›</small><b>%s</b></a>' % (sig['id'], e(sig['nom']))) if sig else '<span></span>')
    # Con foto y precio, no como lista de nombres: es el sitio donde el
    # cliente que ya se decidió por un equipo descubre que necesita otro.
    # Se usa la misma tarjeta de la tienda, para que se vean iguales.
    otros = ''.join(tarjeta_venta(o, base, fijas, locales, promos) for o in mismos[:6])
    # Botón ESTÁTICO a la página de la familia. El de la tienda va a una
    # ruta con almohadilla, que Google no sigue: sin este, la ficha no
    # devolvía ningún enlace rastreable hacia arriba más que la miga.
    # Debajo de las pestañas solo quedan las preguntas frecuentes. Sin
    # ellas no se deja ni una línea en blanco: las páginas sin texto salen
    # byte por byte iguales.
    largo = texto_ficha(p)[0].get('faq') or ''
    txt_largo = ('\n    ' + largo) if largo else ''
    lnd = (LANDINGS or {}).get(p.get('cat') or '')
    fam_btn = ('<a class="btn fill" href="/venta/%s/">Ver todos los de %s</a> '
               % (e(lnd['slug']), e((cat or 'esta familia').lower()))) if (lnd and lnd.get('slug')) else ''
    return f'''
    <button type="button" class="sb-atras" onclick="sbAtras()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
      Seguir viendo equipos</button>
    <article class="prod venta" id="{e(p['id'])}">
      {galeria(p, fts + ([aviso_foto(p)] if aviso_foto(p) else []))}
      <div class="prod-info">
        <div class="k">{e(cat)}</div>
        <h1 class="prod-h1">{e(p['nom'])}</h1>
        <p class="prod-desc">{e(p.get('resumen') or '')}</p>
        {franja(p)}
        {caja}
        {instalacion_incluida(p)}
        <div class="prod-btns">
          {add}
          <a class="btn" href="{wa}" target="_blank" rel="noopener">Preguntar por WhatsApp</a>
        </div>
        {doc}
      </div>
    </article>
    <div class="pest" data-tabs>
      <div class="tabs" role="tablist">{tabs}</div>
      {panels}
    </div>
    {barra_movil(p, wa, fts[0][0] if fts else '')}{txt_largo}
    {nav}
    {f"""<section class="otros">
    <h2>Más en {e(cat)}</h2>
    <div class="vts">{otros}</div>
  </section>""" if otros else ''}
  <p class="volver">{fam_btn}<a class="btn" href="/#/venta/tienda">← Ver toda la tienda</a></p>'''


VIG_JS = '''<script>
  /* Si la página se generó hace tiempo y la vigencia ya pasó, no se muestra vencida. */
  document.querySelectorAll('[data-vig]').forEach(function(b){
    if(new Date(b.dataset.vig + 'T23:59:59') < new Date()) b.parentNode.textContent = 'Precio referencial, por confirmar en la cotización';
  });
  /* La barra del celular se esconde mientras los botones de verdad están
     en pantalla: así no los tapa ni se repite al pie de la ficha.

     El margen de abajo es 0 y no -70: con -70, los últimos 70 px de la
     pantalla no contaban como «visible», así que en cuanto el botón de
     verdad entraba por abajo la barra ya se había encendido ENCIMA de él.
     Medido: 62 px de solape, con los dos botones «Agregar a mi
     cotización» pisados uno sobre otro. Con 0, la barra solo sale cuando
     el botón se ha ido del todo. */
  (function(){
    var bar = document.getElementById('pbar'), btns = document.querySelector('.prod-btns');
    if(!bar || !btns) return;
    bar.removeAttribute('aria-hidden');
    if(!('IntersectionObserver' in window)){ bar.classList.add('on'); return; }
    new IntersectionObserver(function(e){
      bar.classList.toggle('on', !e[0].isIntersecting);
    }, {rootMargin: '-10px 0px 0px 0px'}).observe(btns);
  })();
</script>'''


COLA_TITLE = ' | Precio Perú'
LARGO_TITLE = 60
LARGO_DESC = 155


# Palabras que no pueden quedar al final de un título recortado: solas no
# dicen nada y se leen como un error («… clase», «Desfibrilador con monitor y»).
COLGANTES = {'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'con', 'sin',
             'y', 'o', 'para', 'por', 'en', 'a', 'al', 'tipo', 'clase', 'más'}
# Relleno que se tira PRIMERO cuando el título no entra: dice dónde se apoya
# el equipo, no qué es. Antes de perder «clase B» o los litros, se pierde esto.
RELLENO = ('de sobremesa', 'de mesa', 'de pedestal')


def _recortar(txt, tope):
    """Corta por palabras, nunca a mitad de una, y no deja colgando una
    palabra que sola no significa nada. Sin puntos suspensivos: en un
    título de Google quedan feos y gastan dos caracteres."""
    txt = ' '.join(txt.split())
    if len(txt) <= tope:
        return txt
    pal = txt.split()
    while len(pal) > 1 and len(' '.join(pal)) > tope:
        pal.pop()
    # Y tampoco un número suelto: «Monitor multiparámetro de 15" de 8» es
    # lo que queda de «… de 8 parámetros», y se lee peor que no decirlo.
    while len(pal) > 1 and (pal[-1].lower().strip(',') in COLGANTES
                            or pal[-1].strip(',').isdigit()):
        pal.pop()
    corto = ' '.join(pal)
    return corto if len(corto) <= tope else corto[:tope].rstrip()


def _nombre_corto(nom, hueco):
    """El nombre del equipo dentro del hueco que queda.

    Primero suelta el relleno («de mesa»), que es lo que menos aporta: así
    «Autoclave de mesa 60 L clase B» entra entero como «Autoclave 60 L
    clase B» en vez de quedar cortado en «Autoclave de mesa 60 L clase».
    """
    nom = ' '.join(nom.split())
    for r in RELLENO:
        if len(nom) <= hueco:
            break
        nom = ' '.join(nom.replace(r, ' ').split())
    return _recortar(nom, hueco)


def titulo_ficha(p):
    """«<equipo> <marca> <modelo> | Precio Perú», máximo 60 caracteres.

    Antes salían de 97 de media (máximo 136) y Google los cortaba a la
    mitad. Lo que NO se recorta nunca es la marca y el modelo: las únicas
    búsquedas de venta que traen visitas hoy son «mindray a7» y
    «surtron 200», o sea marca y modelo. Si no entra todo, se acorta el
    nombre del equipo por el final, que es la parte genérica.
    """
    mm = ' '.join(x for x in (p.get('marca'), p.get('modelo')) if x)
    hueco = LARGO_TITLE - len(COLA_TITLE) - (len(mm) + 1 if mm else 0)
    nom = _nombre_corto(p['nom'], max(hueco, 12))
    t = (nom + (' ' + mm if mm else '')) + COLA_TITLE
    return t if len(t) <= LARGO_TITLE else _recortar(t, LARGO_TITLE)


def descripcion_ficha(p):
    """Una sola frase, con el precio adentro, máximo 155 caracteres.

    Antes eran de 222 de media, repetían el nombre y el resumen, y 81 de
    las 174 traían un espacio doble porque se concatenaba un resumen que
    ya terminaba en punto. Google las cortaba igual.
    """
    nombre = ' '.join(x for x in (p['nom'], p.get('marca'), p.get('modelo')) if x)
    precio = (' a %s con IGV' % soles(p['precio'])) if p.get('precio') else ''
    cola = '. Venta en Lima y provincias, con garantía y entrega a todo el país.'
    base = nombre + precio
    if len(base) + len(cola) > LARGO_DESC:
        cola = '. Venta en Lima y provincias.'
    if len(base) + len(cola) > LARGO_DESC:
        base = _recortar(base, LARGO_DESC - len(cola))
    return ' '.join((base + cola).split())


def pagina_producto(p, cats, cfg, base, fijas, locales, promos, vig, prev, sig, mismos):
    cat = cats.get(p.get('cat'), '')
    fts = fotos(p, base, fijas, locales)
    ruta = '/venta/%s/' % p['id']
    nombre = ' '.join(x for x in (p['nom'], p.get('marca'), p.get('modelo')) if x)
    title = titulo_ficha(p)
    descripcion = descripcion_ficha(p)
    cuerpo = producto(p, cat, cfg, fts, promos, vig, prev, sig, mismos, base, fijas, locales) + VIG_JS
    oferta = {'@type': 'Offer', 'priceCurrency': 'PEN', 'url': SITIO + ruta,
              'availability': 'https://schema.org/InStock' if (p.get('stock') or 0) > 0 else 'https://schema.org/OutOfStock',
              'seller': {'@id': SITIO + '/#negocio'}}
    if p.get('precio'):
        # «8000.00», nunca «8,000»: sin separador de miles y con los dos
        # decimales, que es el formato que pide Google para este campo.
        oferta['price'] = '%.2f' % p['precio']
        if vig:
            oferta['priceValidUntil'] = vig.isoformat()
    jsonld = [{'@type': 'Product', 'name': nombre, 'description': p.get('resumen') or nombre,
               **({'additionalProperty': [{'@type': 'PropertyValue', 'name': 'Código',
                                           'value': cod_de(p)}]}
                  if cod_de(p) else {}),
               'brand': {'@type': 'Brand', 'name': p.get('marca') or 'Sinergia Biomédica'},
               'model': p.get('modelo') or '', 'category': cat,
               # La grande (no la ligera): Google pide la mayor resolución
               # disponible para mostrar la ficha con foto y precio.
               'image': [SITIO + b if b.startswith('/') else b for _, b in fts][:3],
               'offers': oferta}]
    # Las preguntas de la ficha, para que Google pueda mostrarlas debajo
    # del resultado. Son las mismas que ve el cliente en la página: si no
    # estuvieran visibles no se podrían publicar así.
    faq = texto_ficha(p)[1]
    if faq:
        jsonld.append({'@type': 'FAQPage',
                       'mainEntity': [{'@type': 'Question', 'name': q,
                                       'acceptedAnswer': {'@type': 'Answer', 'text': r}}
                                      for q, r in faq]})
    # Si la familia tiene página propia, la miga apunta ahí y no al ancla de
    # la tienda: son 13 enlaces internos hacia la página que queremos que
    # Google entienda como la principal de autoclaves.
    lnd = (LANDINGS or {}).get(p.get('cat') or '')
    destino_cat = ('/venta/%s/' % lnd['slug']) if (lnd and lnd.get('slug')) else \
                  ('/venta/#' + (p.get('cat') or ''))
    migas = [('Inicio', '/'), ('Venta', '/venta/'), (cat or 'Equipos', destino_cat),
             (p['nom'], ruta)]
    img = fts[0][0] if fts and fts[0][0].startswith('/') else None
    return ruta, pagina(cfg, ruta=ruta, title=title, descripcion=descripcion, migas=migas,
                        cuerpo=cuerpo, jsonld=jsonld, imagen=img)


def promo_item(p, base, fijas, locales):
    """Lo que necesita la ventana flotante de un equipo en remate."""
    fts = fotos(p, base, fijas, locales)
    return {'id': p['id'], 'nom': p['nom'],
            'mm': ' · '.join(x for x in (p.get('marca'), p.get('modelo')) if x),
            'precio': p['precio'], 'aviso': aviso_de(p),
            'foto': fts[0][0] if fts else '', 'url': '/venta/%s/' % p['id']}


def tarjeta_venta(p, base, fijas, locales, promos):
    """La tarjeta de un equipo en /venta/ (la usan las categorías y la franja
    de promociones, para que se vean iguales)."""
    fts = fotos(p, base, fijas, locales)
    img = ('<img src="%s" alt="%s" loading="lazy" decoding="async">'
           % (fts[0][0], e(' '.join(x for x in (p['nom'], p.get('marca'), p.get('modelo')) if x)))) if fts else gp.ICONO
    of = promo(p, promos)
    return ('<a class="vt%s" href="/venta/%s/"><span class="vt-f">%s%s</span>'
            '<span class="vt-t"><b>%s</b><small>%s</small>%s</span></a>'
            % (' en-oferta' if of else '', p['id'], img,
               ('<span class="vt-of%s">PROMOCIÓN</span>' % (' es-remate' if of['remate'] else '')) if of else '',
               e(p['nom']), e(' · '.join(x for x in (p.get('marca'), p.get('modelo')) if x)),
               precio_tarjeta(p, promos)))


def precio_tarjeta(p, promos):
    """El precio de la tarjeta; en promoción, con el de antes tachado."""
    if not p.get('precio'):
        return ''
    of = promo(p, promos)
    if not of:
        return '<i>%s</i>' % soles(p['precio'])
    return ('<i class="oferta">%s <em>%s</em></i>'
            % (soles(p['precio']), 'Precio especial'))


def pagina_hub(productos, cats_orden, cats, catsx, cfg, promos, base, fijas, locales):
    """/venta/ es el índice de las familias, no la lista de los 163 equipos.

    Antes esta página los mostraba todos juntos, en secciones con ancla
    (/venta/#esterilizacion). Un ancla no es una página: para Google todo
    eso era UNA sola página que hablaba de estetoscopios, ecógrafos,
    autoclaves y camas a la vez, así que no podía ganar ninguna búsqueda
    concreta. Ahora cada familia tiene su página de verdad y esta es la
    puerta que lleva a ellas. Las anclas viejas siguen funcionando: cada
    tarjeta conserva el id de su familia.

    Quien quiere buscar un equipo suelto tiene la tienda con buscador y
    filtros, que no cambia.
    """
    ruta = '/venta/'
    tarjetas = []
    for cid in cats_orden:
        ps = [p for p in productos if p.get('cat') == cid]
        L = (LANDINGS or {}).get(cid)
        if not ps or not L:
            continue
        precios = sorted(p['precio'] for p in ps if p.get('precio'))
        desde = ('<span class="fam-d">desde %s</span>' % soles(precios[0])) if precios else ''
        tarjetas.append(
            '<a class="fam" id="%s" href="/venta/%s/">'
            '<h2>%s</h2><p>%s</p>'
            '<span class="fam-n">%d equipos</span>%s<span class="fam-ir">Ver precios <i>→</i></span></a>'
            % (e(cid), e(L['slug']), e(cats.get(cid, cid)),
               e(catsx.get(cid, '')), len(ps), desde))

    enof = [p for p in productos if promo(p)]
    franja_promo = ''
    rem = [p for p in enof if promo(p)['remate']]
    if rem:
        fr = [promo(p)['fin'] for p in rem if promo(p)['fin']]
        franja_promo = ('<script>window.SB_PROMOS=%s</script>'
                        % json.dumps({'hasta': min(fr).isoformat() if fr else '',
                                      'lista': [promo_item(p, base, fijas, locales) for p in rem]},
                                     ensure_ascii=False))

    cuerpo = f'''
  <section class="cabeza">
    <div class="eyebrow">Venta · Equipamiento biomédico · Lima y provincias</div>
    <h1>Venta de equipos médicos</h1>
    <p class="lead">{len(productos)} equipos con stock para hospitales, clínicas y obras de equipamiento: ficha técnica, código NTS y mantenimiento después de la venta.</p>
    <p><a class="btn fill" href="/#/venta/tienda">Buscar un equipo →</a> <a class="btn" href="/venta/codigos-nts/">Buscar por código NTS</a></p>
  </section>
  {franja_promo}
  <section class="lp-s">
    <h2>Qué vendemos</h2>
    <div class="fams">{''.join(tarjetas)}</div>
  </section>'''
    jsonld = [{'@type': 'ItemList', 'name': 'Familias de equipos médicos',
               'itemListElement': [{'@type': 'ListItem', 'position': i + 1,
                                    'name': cats.get(c, c),
                                    'url': SITIO + '/venta/%s/' % LANDINGS[c]['slug']}
                                   for i, c in enumerate(
                                       [c for c in cats_orden
                                        if (LANDINGS or {}).get(c)
                                        and any(p.get('cat') == c for p in productos)])]}]
    return ruta, pagina(cfg, ruta=ruta, title='Venta de equipos médicos en Lima y provincias | Sinergia Biomédica',
                        descripcion='Equipos médicos con stock: monitores, electrocardiógrafos, autoclaves, desfibriladores, '
                                    'ecógrafos y más, con ficha técnica y mantenimiento. Lima y provincias.',
                        migas=[('Inicio', '/'), ('Venta', ruta)], cuerpo=cuerpo, jsonld=jsonld)


# ── Páginas de aterrizaje por categoría ─────────────────────────────────
# Una ficha de producto se llama «Autoclave de mesa 60 L clase B Biobase
# BKM-Z60B»: perfecta para quien ya sabe qué modelo quiere, inútil para
# quien escribe «autoclave de vapor precio» en Google, que es casi todo el
# mundo. Esta página es la puerta de entrada de esa búsqueda: reúne la
# familia entera y explica cómo elegir. El texto vive en
# data/venta.json › landings; aquí solo se arma.
#
# AQUÍ NO VA UN CUADRO DE PRECIOS, en ninguna forma: ni tabla, ni lista
# ordenada por precio, ni «comparativa». Lo hubo y se quitó por decisión
# del dueño, por tres razones que siguen valiendo:
#   1. Se veía mal: una tabla densa justo debajo de tarjetas con foto
#      rompe el ritmo de la página.
#   2. Repetía lo de arriba: el cliente ya vio esos equipos con su precio
#      en las tarjetas.
#   3. La de fondo: ponía equipos propios y de otras marcas en la misma
#      tabla ordenados por precio. Eso invita a comparar precio contra
#      precio entre equipos que no son comparables, y hace que el negocio
#      compita consigo mismo en su propia web.
# La promoción sí se conserva, pero con el lenguaje visual de la tarjeta
# (etiqueta roja PROMOCIÓN y «Precio especial» en rojo al lado del
# precio), no como nota al pie en gris.


def pagina_categoria(cid, L, ps, cats, cfg, promos, base, fijas, locales):
    """La página de una familia: tarjetas arriba, guía y preguntas abajo.

    Las tarjetas son las mismas de la tienda, para que el cliente reconozca
    dónde está; cada una lleva su precio y, si está en promoción, su
    etiqueta roja. La guía y las preguntas son opcionales: una familia sin
    texto propio igual tiene su página con sus equipos.

    Entre las tarjetas y la guía no va nada: ver el comentario de arriba
    sobre el cuadro de precios que se quitó.
    """
    ruta = '/venta/%s/' % L['slug']
    precios = sorted(p['precio'] for p in ps if p.get('precio'))
    rango = {'min': soles(precios[0]) if precios else '',
             'max': soles(precios[-1]) if precios else '',
             'plazo': TERMINOS.get('plazoStock') or 'pocos días',
             'garantia': str(TERMINOS.get('garantiaMeses') or 12)}
    guia = ''.join('<section class="lp-g"><h2>%s</h2><p>%s</p></section>' % (e(g['h']), g['p'])
                   for g in (L.get('guia') or []))
    faq = L.get('faq') or []
    for f in faq:
        f['r_'] = f['r'].format(**rango)
    bloque_faq = ('<section class="lp-s"><h2>Preguntas frecuentes</h2>%s</section>' % ''.join(
        '<details class="lp-faq"><summary>%s</summary><p>%s</p></details>' % (e(f['q']), e(f['r_']))
        for f in faq)) if faq else ''
    desde = ''
    if len(precios) > 1:
        desde = ('<p class="lp-desde">Desde <b>%s</b> hasta <b>%s</b>, con IGV incluido.</p>'
                 % (rango['min'], rango['max']))
    elif precios:
        desde = '<p class="lp-desde"><b>%s</b>, con IGV incluido.</p>' % rango['min']
    tarjetas = ''.join(tarjeta_venta(p, base, fijas, locales, promos) for p in ordenar(ps))
    nts = [p for p in ps if p.get('clave')]
    enlace_nts = (' <a class="btn" href="/venta/codigos-nts/">Buscar por código NTS</a>') if nts else ''
    cuerpo = f'''
  <section class="cabeza">
    <div class="eyebrow">Venta · {e(cats.get(cid, ''))} · Lima y provincias</div>
    <h1>{e(L['h1'])}</h1>
    <p class="lead">{L['entrada']}</p>
    {desde}
    <p><a class="btn fill" href="/#/cotizar-venta">Armar mi cotización →</a>{enlace_nts}</p>
  </section>
  <section class="lp-s">
    <h2>{len(ps)} equipos</h2>
    <div class="vts">{tarjetas}</div>
  </section>
  {guia}
  {bloque_faq}
  <section class="lp-cta">
    <h2>¿Te ayudamos a elegir?</h2>
    <p>Dinos para qué lo necesitas y te recomendamos el modelo que te conviene, sin compromiso. Si es
    para una licitación, mándanos la ficha técnica del expediente y te devolvemos el cuadro de
    cumplimiento punto por punto con el equipo que ofertamos.</p>
    <p><a class="btn fill" href="/#/cotizar-venta">Armar mi cotización →</a>
       <a class="btn" href="/#/contacto">Escríbenos</a></p>
  </section>'''
    jsonld = [
        {'@type': 'ItemList', 'name': L['h1'],
         'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': p['nom'],
                              'url': SITIO + '/venta/%s/' % p['id']} for i, p in enumerate(ps)]},
    ]
    if faq:
        jsonld.append({'@type': 'FAQPage',
                       'mainEntity': [{'@type': 'Question', 'name': f['q'],
                                       'acceptedAnswer': {'@type': 'Answer', 'text': f['r_']}}
                                      for f in faq]})
    return ruta, pagina(cfg, ruta=ruta, title='%s | Sinergia Biomédica' % L['titulo'],
                        descripcion=L['descripcion'],
                        migas=[('Inicio', '/'), ('Venta', '/venta/'), (L['h1'], ruta)],
                        cuerpo=cuerpo, jsonld=jsonld)


CODIGOS_EQUIPO = {}        # lo llena main(): equipo → {codigo, capacidad}


STOCK_TOPE = 3


def stock_txt(n):
    """La cantidad como la ve el público: nunca el número real por encima
    de 3. De 4 para arriba, «3+ unidades».

    La cantidad se muestra porque da credibilidad, pero el stock equipo
    por equipo es la posición de inventario del negocio y la web es
    pública. El número real sigue entero en la hoja y en el catálogo, que
    es lo que usan el cotizador y el portal.
    """
    if n <= 0:
        return ''
    if n > STOCK_TOPE:
        return '%d+ unidades' % STOCK_TOPE
    return '%d %s' % (n, 'unidad' if n == 1 else 'unidades')


def stock_etiqueta(p, detalle=False):
    """«En stock · 2 unidades», «En stock · 3+ unidades» o «Stock agotado».

    Con 0 la página no desaparece: se queda diciendo que está agotado, para
    no perder lo ganado en Google mientras vuelve el lote.
    """
    n = p.get('stock')
    if not isinstance(n, (int, float)):
        return ''
    if n > 0:
        return 'En stock · ' + stock_txt(int(n))
    return 'Stock agotado' + (' · consultar plazo de nuevo lote' if detalle else '')


def cod_de(p):
    """El código que se muestra, con el prefijo «Cod.».

    Sale de data/venta.json › codigosEquipo (escrito a mano, equipo por
    equipo) o, si no está ahí, de la columna «clave» de la hoja. Nunca se
    infiere: el equipo que no tenga ninguno de los dos, no lleva código.
    """
    c = ((CODIGOS_EQUIPO or {}).get(p.get('id')) or {}).get('codigo') or p.get('clave') or ''
    return c.strip()


def cod_texto(p):
    c = cod_de(p)
    return ('Cod. ' + c) if c else ''
TEXTOS = {}                # lo llena main(): equipo → {guia, faq} de data/venta.json


def datos_texto(p):
    """Los huecos entre llaves que puede usar el texto de una ficha.

    Se rellenan al generar la página, no se escriben a mano en los datos:
    así el precio del texto no se queda viejo cuando cambia el de la hoja,
    que es exactamente lo que pasaría con un número escrito a mano.
    """
    ce = (CODIGOS_EQUIPO or {}).get(p['id']) or {}
    return {'precio': soles(p['precio']) if p.get('precio') else 'consultar',
            'plazo': TERMINOS.get('plazoStock') or 'pocos días',
            'garantia': str(TERMINOS.get('garantiaMeses') or 12),
            'pago': TERMINOS.get('pago') or '',
            'codigo': cod_de(p) or '',
            'capacidad': ce.get('capacidad') or '',
            # La marca y el modelo faltaban en esta lista, así que el texto
            # largo los llevaba escritos a mano. El día que el fabricante
            # cambia cómo escribe un modelo hay que corregirlo en dos sitios,
            # y el segundo se olvida: la ficha acaba diciendo «BKMZA» arriba
            # y «BKM-ZA» tres párrafos más abajo.
            'marca': p.get('marca') or '',
            'modelo': p.get('modelo') or ''}


def texto_ficha(p):
    """El texto largo de la ficha: guía y preguntas frecuentes.

    Va debajo de las pestañas, con el mismo aspecto que la guía de las
    páginas de familia, para que el cliente reconozca dónde está. Arriba
    no cambia nada: foto, precio y botones se quedan igual.

    Devuelve el HTML y la lista de preguntas, que el llamador necesita
    aparte para publicarlas como datos estructurados.
    """
    T = (TEXTOS or {}).get(p['id']) or {}
    if not T:
        return {}, []
    d = datos_texto(p)
    # El relleno llega también al TÍTULO y a la PREGUNTA, no solo al párrafo
    # y a la respuesta. Antes se quedaban fuera, y justo la pregunta
    # «¿Cuánto cuesta el autoclave Biobase BKM-ZA en Perú?» es uno de los
    # sitios donde el modelo estaba escrito a mano. Un hueco que no se
    # rellena en todos los campos del mismo texto es un hueco a medias.
    # El orden importa: primero se rellena y después se escapa, nunca al
    # revés, o las comillas del valor saldrían escapadas dos veces.
    def rell(t):
        return str(t or '').format(**d)
    # Cada sección dice en qué pestaña va («pestana»): sin marca, en
    # «Descripción». Antes el texto entero se pintaba SUELTO debajo de las
    # pestañas, así que el cliente abría «Descripción» y leía tres líneas
    # mientras la descripción de verdad —setecientas palabras— estaba más
    # abajo, fuera de la pestaña. La marca va en los datos y no se adivina
    # por el título: un título se reescribe cualquier día.
    por_pest = {}
    for g in T.get('guia') or []:
        html = ('<section class="lp-g"><h2>%s</h2><p>%s</p></section>'
                % (e(rell(g['h'])), rell(g['p'])))
        por_pest.setdefault(g.get('pestana') or 'descripcion', []).append(html)
    texto = {k: ''.join(v) for k, v in por_pest.items()}
    faq = [(rell(f['q']), rell(f['r'])) for f in T.get('faq') or []]
    # Las preguntas frecuentes se quedan FUERA de las pestañas, abajo: ahí
    # funcionan, y además son las que Google lee como FAQPage.
    texto['faq'] = ('<div class="ficha-texto"><section class="lp-s"><h2>Preguntas frecuentes</h2>%s'
                    '</section></div>' % ''.join(
                        '<details class="lp-faq"><summary>%s</summary><p>%s</p></details>' % (e(q), r)
                        for q, r in faq)) if faq else ''
    return texto, faq


LANDINGS = {}              # lo llena main(): categoría → su página de aterrizaje
TODOS_PUBLICADOS = []      # lo llena main(), para el texto de «no hay promociones»


def pm_tarjeta(p, cfg, base, fijas, locales, promos):
    """Una tarjeta de /promociones/: el aviso diseñado y nada más.

    El aviso ya lleva impreso el nombre, la marca, el modelo, la capacidad,
    el precio, el stock y el teléfono. Repetir todo eso al costado hacía la
    página redundante: el visitante leía dos veces lo mismo. Aquí se
    muestra el aviso entero y, al tocarlo, se abre la ficha con la
    descripción, las características y los botones de compra.

    El nombre oficial va en el «alt» de la imagen, no a la vista: quien no
    puede ver la imagen (un lector de pantalla, o Google) sí lo necesita.

    Si un equipo no tiene aviso diseñado se arma una tarjeta con su foto,
    nombre y precio, porque sin imagen no habría nada que mirar.
    """
    of = promo(p, promos) or {}
    av = aviso_de(p)
    alt = e(' '.join(x for x in (p['nom'], p.get('marca'), p.get('modelo')) if x))
    pie = '<span class="pm-ir">Ver el equipo <i>→</i></span>'
    if av:
        return ('<a class="pm-c con-aviso" href="/venta/%s/">'
                '<img class="pm-aviso" src="%s" alt="%s" loading="lazy" decoding="async">'
                '%s</a>' % (p['id'], av, alt, pie))
    # Sin aviso: la tarjeta de siempre, que sí necesita texto.
    fts = fotos(p, base, fijas, locales)
    img = ('<img class="pm-foto" src="%s" alt="%s" loading="lazy" decoding="async">' % (fts[0][0], alt)) if fts \
        else '<span class="pm-foto pm-sinfoto">%s</span>' % gp.ICONO
    stock = p.get('stock')
    chip = ('<span class="pm-st">%s</span>' % e(stock_etiqueta(p))) if stock_etiqueta(p) else ''
    mm = ' · '.join(x for x in (p.get('marca'), p.get('modelo')) if x)
    return ('<a class="pm-c sin-aviso" href="/venta/%s/">%s'
            '<span class="pm-d"><span class="pm-cat">Precio especial</span>'
            '<b>%s</b>%s<span class="pm-p">%s%s</span>%s</span></a>'
            % (p['id'], img, e(p['nom']),
               ('<span class="pm-mm">%s</span>' % e(mm)) if mm else '',
               soles(p['precio']) if p.get('precio') else '', chip, pie))


def ficha_a4_venta(p, cfg, base, fijas, locales):
    """La ficha técnica de Sinergia, en A4, lista para imprimir o guardar.

    Se arma con los datos propios —nombre, marca, modelo, origen, código
    NTS, características y áreas de uso— y lleva el logo de la casa. Los
    documentos del proveedor NO se publican: llevan su logo y su marca, y
    quedan en Drive solo como material de consulta. Esta es la que ve el
    cliente, igual que las once del lado de alquiler.

    De aquí sale el PDF: scripts/generar_pdf_fichas.js la convierte.
    """
    fts = fotos(p, base, fijas, locales)
    foto = fts[0][0] if fts else ''
    datos = [(k, v) for k, v in (('Marca', p.get('marca')), ('Modelo', p.get('modelo')),
                                 ('Origen', p.get('origen')), ('Código', cod_de(p))) if v]
    tabla = ''.join('<tr><th>%s</th><td>%s</td></tr>' % (e(k), e(v)) for k, v in datos)
    cars = ''.join('<tr><th>%s</th><td></td></tr>' % e(c) for c in (p.get('caracteristicas') or []))
    areas = ''.join('<li>%s</li>' % e(a) for a in (p.get('areas') or []))
    grupos = '<div class="g"><h4>Identificación</h4><table>%s</table></div>' % tabla if tabla else ''
    # Con parámetros del fabricante cargados, la hoja los lleva: es lo que
    # convierte este PDF en un documento que vale la pena descargar. Sin
    # ellos, la hoja se queda con las características del catálogo.
    fch = ficha_venta(p['id'])
    fuente_pie = ('<br>Fuente: ' + e(fch.get('fuente', 'fabricante'))
                  + '. Especificaciones sujetas a cambios del fabricante.') if fch else ''
    if fch:
        grupos += ''.join(
            '<div class="g"><h4>%s</h4><table>%s</table>%s</div>'
            % (e(g['titulo']), ''.join('<tr><th>%s</th><td>%s</td></tr>' % (e(a), e(b))
                                       for a, b in g['filas']),
               ('<p style="font-size:7.6pt;color:#6E727A;line-height:1.35;padding:1.5mm 2.5mm 0">'
                '%s</p>' % e(g['nota'])) if g.get('nota') else '')
            for g in fch.get('secciones') or [])
        inc = fch.get('incluye') or []
        if inc:
            grupos += ('<div class="g"><h4>Accesorios estándar</h4><table>%s</table></div>'
                       % ''.join('<tr><td colspan="2">%s</td></tr>' % e(x) for x in inc))
    elif p.get('caracteristicas'):
        grupos += ('<div class="g"><h4>Características</h4><table>%s</table></div>'
                   % ''.join('<tr><td colspan="2">%s</td></tr>' % e(c) for c in p['caracteristicas']))
    return f'''<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ficha técnica — {e(p['nom'])} | Sinergia Biomédica</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="/css/00-fuentes.css">
<style>
  @page{{size:A4;margin:0}}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:'Titillium Web',system-ui,sans-serif;color:#17191D;background:#e9e7e2;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  .hoja{{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:14mm 14mm 12mm;display:flex;flex-direction:column}}
  @media screen{{.hoja{{margin:16px auto;box-shadow:0 10px 40px -12px rgba(0,0,0,.3)}}}}
  header{{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #9A7F4E;padding-bottom:6mm}}
  .logo{{height:13mm}}.logo text{{font-family:'Chakra Petch',sans-serif}}
  .tag{{font-family:'Chakra Petch',sans-serif;font-weight:600;letter-spacing:3px;font-size:9pt;color:#9A7F4E;text-align:right}}
  .tag b{{display:block;font-size:15pt;letter-spacing:1px;color:#17191D}}
  .top{{display:grid;grid-template-columns:62mm 1fr;gap:7mm;margin-top:7mm}}
  .foto{{border:1px solid #e3e0d8;border-radius:3mm;height:52mm;display:flex;align-items:center;justify-content:center;overflow:hidden}}
  .foto img{{max-width:100%;max-height:100%;object-fit:contain}}
  h1{{font-family:'Chakra Petch',sans-serif;font-size:17pt;line-height:1.15}}
  .marca{{color:#6E727A;font-size:10pt;margin-top:1mm}}
  .resumen{{font-size:9.5pt;line-height:1.5;margin-top:3mm}}
  .grupos{{columns:2;column-gap:7mm;margin-top:6mm}}
  .g{{break-inside:avoid;margin-bottom:4.5mm}}
  h4{{font-family:'Chakra Petch',sans-serif;font-size:9pt;letter-spacing:1px;text-transform:uppercase;color:#fff;background:#17191D;padding:1.6mm 2.5mm;border-radius:1.5mm 1.5mm 0 0}}
  table{{width:100%;border-collapse:collapse;font-size:8.6pt}}
  th,td{{padding:1.5mm 2.5mm;border-bottom:1px solid #ebe8e1;vertical-align:top;text-align:left}}
  th{{font-weight:400;color:#6E727A}}td{{font-weight:600}}
  .g:first-child th{{width:44%}}
  tr:nth-child(even) th,tr:nth-child(even) td{{background:#FBFAF6}}
  .incluye{{margin-top:2mm;border:1px solid #e3e0d8;border-radius:2mm;padding:3mm 4mm;font-size:9pt}}
  .incluye b{{font-family:'Chakra Petch',sans-serif;font-size:9pt;letter-spacing:1px;text-transform:uppercase;color:#9A7F4E}}
  .incluye ul{{columns:2;margin-top:1.5mm;padding-left:4mm}}
  footer{{margin-top:auto;padding-top:5mm;border-top:1px solid #e3e0d8;display:flex;justify-content:space-between;gap:6mm;font-size:8pt;color:#6E727A}}
  footer b{{color:#17191D}}
  .boton{{position:fixed;right:20px;bottom:20px;font-family:'Chakra Petch',sans-serif;font-weight:600;background:#17191D;color:#fff;border:0;border-radius:10px;padding:12px 18px;cursor:pointer}}
  @media print{{.boton{{display:none}}}}
</style></head>
<body>
<div class="hoja">
  <header>{gp.LOGO}<div class="tag">FICHA TÉCNICA<b>Venta de equipamiento</b></div></header>
  <div class="top">
    <div class="foto">{f'<img src="{foto}" alt="">' if foto else ''}</div>
    <div>
      <h1>{e(p['nom'])}</h1>
      <div class="marca">{e(' · '.join(x for x in (p.get('marca'), p.get('modelo')) if x))}</div>
      <p class="resumen">{e(p.get('resumen') or '')}</p>
    </div>
  </div>
  <div class="grupos">{grupos}</div>
  {f'<div class="incluye"><b>Se usa en</b><ul>{areas}</ul></div>' if areas else ''}
  <footer>
    <div><b>Sinergia Biomédica</b> · Servicios Integrales Sinergia S.A.C. · RUC 20615862682<br>Pueblo Libre, Lima — Perú · {e(cfg['email'])} · {e(cfg['telefono'])}</div>
    <div style="text-align:right">sinergiabiomedica.pe<br>Precio y disponibilidad: consultar{fuente_pie}</div>
  </footer>
</div>
<button class="boton" onclick="print()">Guardar como PDF</button>
<script>
  if (window.self !== window.top) document.querySelector('.boton').style.display = 'none';
  function ajustar(){{ var w = document.documentElement.clientWidth, a4 = 210 * 96 / 25.4 + 32;
    document.body.style.zoom = w < a4 ? (w / a4) : ''; }}
  ajustar(); addEventListener('resize', ajustar);
</script>
</body></html>
'''


def pagina_promos(enof, cfg, base, fijas, locales, promos):
    """/promociones/: los equipos rebajados, en su propia página.

    Va aparte de la tienda a propósito: así se puede enlazar desde el menú
    y desde la ventana de bienvenida, y la tienda no se llena de avisos.
    """
    ruta = '/promociones/'
    if not enof:
        cuerpo = '''
  <section class="cabeza">
    <div class="eyebrow">Venta · Promociones</div>
    <h1>Por ahora no hay equipos en promoción</h1>
    <p class="lead">Cuando rebajemos algún equipo aparecerá aquí. Mientras tanto, en la tienda
      están los %d equipos con su precio y su stock al día.</p>
    <p><a class="btn fill" href="/venta/">Ver toda la tienda →</a></p>
  </section>''' % len(TODOS_PUBLICADOS)
        return ruta, pagina(cfg, ruta=ruta,
                            title='Promociones | Sinergia Biomédica',
                            descripcion='Equipos médicos a precio especial. Por ahora no hay '
                                        'promociones activas; mira la tienda completa.',
                            migas=[('Inicio', '/'), ('Promociones', ruta)], cuerpo=cuerpo, jsonld=[])
    fechas = [promo(p)['fin'] for p in enof if promo(p)['fin']]
    hasta = min(fechas) if fechas else None
    # Una sola rejilla: el aviso diseñado arriba y, debajo, lo que el
    # comprador necesita para decidir (nombre, marca, precio, stock) y un
    # botón. Antes los mismos cuatro equipos salían dos veces, el aviso sin
    # botón y la tarjeta sin aviso; no ayudaba a nadie.
    tarjetas = ''.join(pm_tarjeta(p, cfg, base, fijas, locales, promos) for p in enof)
    cuerpo = f'''
  <section class="cabeza">
    <div class="eyebrow">Venta · Precio especial</div>
    <h1>Equipos en promoción</h1>
    <p class="lead">{len(enof)} equipos a precio especial{(', hasta el ' + hasta.strftime('%d/%m/%Y')) if hasta else ', hasta agotar stock'}.
      Son unidades contadas: cuando se van, vuelve el precio de siempre.</p>
    <p><a class="btn fill" href="/venta/">Ver toda la tienda →</a></p>
  </section>
  <section class="pm-rejilla">{tarjetas}</section>'''
    jsonld = [{'@type': 'ItemList', 'name': 'Equipos en promoción',
               'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': p['nom'],
                                    'url': SITIO + '/venta/%s/' % p['id']} for i, p in enumerate(enof)]}]
    return ruta, pagina(cfg, ruta=ruta,
                        title='Equipos biomédicos en promoción | Sinergia Biomédica',
                        descripcion='Equipos médicos a precio especial por tiempo limitado: autoclaves, '
                                    'monitores y más, con stock listo para entrega en Lima y provincias.',
                        migas=[('Inicio', '/'), ('Promociones', ruta)], cuerpo=cuerpo, jsonld=jsonld)


def aviso_foto(p):
    """El aviso diseñado, como par (ligera, grande) para la galería.

    Va al final de las fotos, nunca primero: la foto limpia del equipo es la
    que llevan la tienda, el carrito y el feed de Google Shopping, que no
    admite imágenes con precio ni teléfono encima. El aviso se ve como foto
    de apoyo, que es donde ayuda: enseña precio y stock de un vistazo.
    """
    r = (p.get('aviso') or '').lstrip('/')
    if not r or not os.path.exists(os.path.join(gp.ROOT, r)):
        return None
    lig = gp.foto_local(r, {}, ligera=True)
    gra = gp.foto_local(r, {}, ligera=False)
    return (lig, gra or lig) if lig else None


def aviso_de(p):
    """El aviso completo del equipo: el que diga el dato, o el que haya en
    img/promos/<id>.jpg. Vacío si todavía no está hecho."""
    if p.get('aviso'):
        return '/' + str(p['aviso']).lstrip('/')
    return ('/img/promos/%s.jpg' % p['id']) if os.path.exists(
        os.path.join(ROOT, 'img', 'promos', p['id'] + '.jpg')) else ''


def pagina_nts(productos, cfg):
    """/venta/codigos-nts/: cada código NTS 113-MINSA con los equipos que lo cumplen."""
    ruta = '/venta/codigos-nts/'
    grupos = {}
    for p in productos:
        if p.get('clave'):
            grupos.setdefault(p['clave'], []).append(p)
    clave = lambda c: (c.split('-')[0], int(re.sub(r'\D', '', c) or 0))
    filas = ''.join(
        '<tr id="%s"><th>%s</th><td><b>%s</b><div class="nts-eq">%s</div></td></tr>' % (
            e(c), e(c), e(ps[0].get('expediente') or ''),
            ''.join('<a href="/venta/%s/">%s</a>' % (p['id'], e(' '.join(x for x in (p['nom'], p.get('marca'), p.get('modelo')) if x)))
                    for p in ps))
        for c, ps in sorted(grupos.items(), key=lambda kv: clave(kv[0])))
    cuerpo = f'''
  <section class="cabeza">
    <div class="eyebrow">Venta · Expedientes técnicos</div>
    <h1>Equipos por código NTS 113-MINSA</h1>
    <p class="lead">Busca el código del equipo que pide tu expediente técnico (por ejemplo D-1 o D-18) y mira los modelos que tenemos con stock. Te enviamos la ficha técnica y el cuadro de cumplimiento.</p>
  </section>
  <div class="panel nts"><table>{filas}</table></div>
  <p class="volver"><a class="btn" href="/venta/">← Todos los equipos de venta</a></p>'''
    jsonld = [{'@type': 'ItemList', 'name': 'Equipos por código NTS 113-MINSA',
               'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': '%s %s' % (c, ps[0].get('expediente') or ''),
                                    'url': SITIO + ruta + '#' + c}
                                   for i, (c, ps) in enumerate(sorted(grupos.items(), key=lambda kv: clave(kv[0])))]}]
    return ruta, pagina(cfg, ruta=ruta, title='Equipos médicos por código NTS 113-MINSA (D-1, D-18…) | Sinergia Biomédica',
                        descripcion='Lista de códigos NTS 113-MINSA de equipamiento (%s y más) con los modelos en venta, '
                                    'ficha técnica y cuadro de cumplimiento para expedientes técnicos.'
                                    % ', '.join(sorted(grupos, key=clave)[:6]),
                        migas=[('Inicio', '/'), ('Venta', '/venta/'), ('Códigos NTS', ruta)], cuerpo=cuerpo, jsonld=jsonld)


# ─────────────────────────── escritura ───────────────────────────

def mapa_portada(productos, cambios):
    """window.PAGINA_VENTA = {id: '/venta/<id>/'} en index.html: la tienda lo
    usa para abrir la página propia del equipo."""
    js = '<script>window.PAGINA_VENTA=%s;</script>' % json.dumps(
        {p['id']: '/venta/%s/' % p['id'] for p in productos}, ensure_ascii=False, sort_keys=True)
    gp.region_index('<!--VENTA-URL-INICIO-->', '<!--VENTA-URL-FIN-->', js, cambios,
                    ancla='<!--TIPOS-URL-FIN-->')


def mapa_pie_portada(cambios):
    """El mismo mapa del sitio, en el pie de la portada.

    La portada es la página con más autoridad del sitio y hoy no tiene ni
    un solo enlace estático: su menú va todo a rutas #/…, que Google no
    sigue. Sin esto, /venta/ y sus 10 familias no tienen ningún camino de
    entrada desde fuera de su propio barrio.

    Se escribe entre marcas, igual que el resto de lo que la portada
    recibe generado, para que no haya que mantenerlo a mano.
    """
    # FUERA de #page-entrada: ese bloque es display:none hasta que corre el
    # JS, asi que el mapa quedaba invisible para un rastreador que todavia
    # no ha renderizado. Despues de </main> se ve siempre, con JS y sin el.
    gp.region_index('<!--MAPA-PIE-INICIO-->', '<!--MAPA-PIE-FIN-->', gp.mapa_sitio(), cambios,
                    ancla='</main>', sep='\n\n')


def sitemap(paginas, cambios):
    """Agrega/actualiza las URL de /venta/ sin tocar las demás."""
    txt = open(gp.SITEMAP, encoding='utf-8').read() if os.path.exists(gp.SITEMAP) else ''
    previas = gp.fechas_previas()
    otras = [u for u in re.findall(r'  <url>.*?</url>', txt) if '/venta/' not in u]
    hoy = datetime.date.today().isoformat()
    nuevas = []
    mias = set()
    for ruta, rel in paginas:
        loc = SITIO + ruta
        fecha = hoy if (rel in cambios or loc not in previas) else previas[loc]
        nuevas.append('  <url><loc>%s</loc><lastmod>%s</lastmod></url>' % (loc, fecha))
        mias.add('<loc>%s</loc>' % loc)
    # /promociones/ la escribe este generador pero su URL no lleva /venta/,
    # asi que sobrevivia en «otras» y volvia a entrar en «nuevas»: dos veces
    # la misma URL en el sitemap. Se queda la que acabamos de calcular.
    otras = [u for u in otras if not any(m in u for m in mias)]
    gp.escribir('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                + '\n'.join(otras + nuevas) + '\n</urlset>\n', cambios)


def feed_google(productos, cfg, base, fijas, locales, promos, cambios):
    """feed-google.xml — el archivo que lee Google Merchant Center.

    Con él los equipos pueden salir gratis en la pestaña «Compras» con su
    foto, su precio y su stock. En Merchant Center se registra una vez como
    «fuente de datos desde un archivo» apuntando a
    https://sinergiabiomedica.pe/feed-google.xml y Google lo vuelve a leer
    solo. Se regenera con cada extracción, así que el precio nunca se
    queda viejo.
    """
    hoy = datetime.date.today().isoformat()
    filas = []
    for p in productos:
        if not p.get('precio'):
            continue
        fts = fotos(p, base, fijas, locales)
        if not fts:
            continue                      # sin foto no entra: Google la exige
        # JPEG antes que WebP: Merchant Center acepta los dos, pero el
        # JPEG no da problemas con ningún revisor.
        of = promo(p, promos)
        grande = fts[0][1]
        if grande.startswith('/img/') and os.path.exists(
                os.path.join(ROOT, grande.lstrip('/').rsplit('.', 1)[0] + '.jpg')):
            grande = grande.rsplit('.', 1)[0] + '.jpg'
        marca = p.get('marca') or ''
        modelo = p.get('modelo') or ''
        desc = ' '.join(x for x in ([p.get('resumen') or p['nom']] +
                                    list(p.get('caracteristicas') or [])) if x)
        if cod_de(p):
            desc += ' %s.' % cod_texto(p)
        filas.append(
            '  <item>\n'
            '    <g:id>%s</g:id>\n'
            '    <title>%s</title>\n'
            '    <description>%s</description>\n'
            '    <link>%s/venta/%s/</link>\n'
            '    <g:image_link>%s</g:image_link>\n'
            '    <g:availability>%s</g:availability>\n'
            '    <g:price>%.2f PEN</g:price>\n'
            '%s'
            '    <g:condition>new</g:condition>\n'
            '    <g:brand>%s</g:brand>\n'
            '    %s\n'
            '    <g:identifier_exists>no</g:identifier_exists>\n'
            '    <g:product_type>%s</g:product_type>\n'
            '    <g:google_product_category>2496</g:google_product_category>\n'
            '  </item>' % (
                e(p['id']),
                e(' '.join(x for x in (p['nom'], marca, modelo) if x))[:150],
                e(desc)[:4900],
                SITIO.rstrip('/'), e(p['id']),
                e(grande if grande.startswith('http') else SITIO.rstrip('/') + grande),
                'in_stock' if (p.get('stock') or 0) else 'backorder',
                # Solo el precio que se cobra. Si se mandara también el de
                # lista (g:sale_price), Google mostraría el tachado, que es
                # justo lo que no queremos.
                float(p['precio']),
                '',
                e(marca or 'Sinergia Biomédica'),
                ('<g:mpn>%s</g:mpn>' % e(modelo)) if modelo else '',
                e(cfg.get('categorias', {}).get(p.get('cat'), p.get('cat') or ''))))
    doc = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n'
           '<channel>\n'
           '  <title>Sinergia Biomédica — equipos biomédicos</title>\n'
           '  <link>%s</link>\n'
           '  <description>Equipamiento biomédico con precio, stock y código NTS. '
           'Actualizado el %s.</description>\n%s\n</channel>\n</rss>\n'
           % (SITIO.rstrip('/'), hoy, '\n'.join(filas)))
    gp.escribir('feed-google.xml', doc, cambios)
    return len(filas)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--datos', required=True, help='JSON en vivo del Apps Script de venta')
    args = ap.parse_args()
    cfg = gp.config_sitio()
    vivo = gp.leer_json(args.datos)
    repo = gp.leer_json(VENTA)
    # Equipos retirados a mano (venta.json › noPublicar): la hoja los sigue
    # mandando con publicar = SI, pero aquí no se publican ni se cotizan.
    bloq = {k for k in (repo.get('noPublicar') or {}) if k != '_nota'}
    productos = [ajustar(p, repo) for p in vivo.get('productos', [])
                 if p.get('id') and p.get('nom') and p['id'] not in bloq]
    # Equipos de stock propio (data/venta.json › equiposPropios): no vienen
    # del proveedor, así que su precio y su stock van tal cual.
    propios = [p for p in ((repo.get('equiposPropios') or {}).get('equipos') or [])
               if p.get('id') and p.get('nom') and p['id'] not in bloq]
    for q in propios:
        q = dict(q)
        q['propio'] = 1
        if q['id'] not in {x['id'] for x in productos}:
            productos.append(q)
    if propios:
        print('%d equipos de stock propio.' % len(propios))
    fuera = [p['id'] for p in vivo.get('productos', []) if p.get('id') in bloq]
    if fuera:
        print('Retirados a mano (noPublicar): %s' % ', '.join(sorted(fuera)))
    if not productos:
        sys.exit('No hay equipos en los datos: no se genera nada.')
    # Las familias con página propia se resuelven antes de generar nada: el
    # hub y las migas de cada ficha enlazan a ellas.
    # Las familias con página propia se resuelven antes de generar nada: el
    # índice y las migas de cada ficha enlazan a ellas. Una familia con
    # equipos pero sin texto escrito igual tiene su página, con lo mínimo:
    # así el índice nunca lleva a un enlace roto.
    cats = {c['id']: c['nombre'] for c in repo.get('categorias', [])}
    catsx = {c['id']: c.get('ejemplos', '') for c in repo.get('categorias', [])}
    landings = {k: dict(v) for k, v in (repo.get('landings') or {}).items()
                if not k.startswith('_')}
    for cid, nom in cats.items():
        if not any(p.get('cat') == cid for p in productos):
            continue
        L = landings.setdefault(cid, {})
        L.setdefault('slug', cid)
        L.setdefault('h1', nom)
        L.setdefault('titulo', '%s: precios en Perú' % nom)
        L.setdefault('descripcion', '%s con stock en Lima. Precios con IGV y entrega en Lima y '
                                    'provincias.' % (catsx.get(cid) or nom))
        L.setdefault('entrada', catsx.get(cid) or nom)
    # Una familia no puede llamarse como un equipo: las dos viven en
    # /venta/<nombre>/ y la segunda pisaría a la primera.
    choques = sorted({L['slug'] for L in landings.values()} & {p['id'] for p in productos})
    if choques:
        sys.exit('La dirección de estas familias choca con la de un equipo: %s' % ', '.join(choques))
    LANDINGS.update(landings)
    CODIGOS_EQUIPO.update({k: v for k, v in (repo.get('codigosEquipo') or {}).items()
                           if not k.startswith('_')})
    TEXTOS.update({k: v for k, v in (repo.get('textosFicha') or {}).items()
                   if not k.startswith('_')})
    cats_orden = [c['id'] for c in repo.get('categorias', [])]
    base = {p['id']: p for p in repo.get('productos', [])}
    fijas = {k: v for k, v in (repo.get('fotosFijas') or {}).items() if not k.startswith('_')}
    locales = set(repo.get('fotosLocales') or [])   # fotos ya guardadas en el sitio
    promos = {k: v for k, v in (repo.get('promociones') or {}).items()
              if not k.startswith('_')}
    aplicar_promos(productos, promos)      # el precio de oferta manda en todo
    vig = vigencia(vivo.get('actualizado'))

    orden = ordenar(productos)
    cambios, paginas = [], []
    ruta, doc = pagina_hub(orden, cats_orden, cats, catsx, cfg, promos, base, fijas, locales)
    gp.escribir('venta/index.html', doc, cambios)
    paginas.append((ruta, 'venta/index.html'))
    ruta, doc = pagina_nts(orden, cfg)
    gp.escribir('venta/codigos-nts/index.html', doc, cambios)
    paginas.append((ruta, 'venta/codigos-nts/index.html'))
    # Una página de aterrizaje por cada familia con texto escrito
    # (data/venta.json › landings). Sin texto no se genera: una página de
    # categoría vacía no le sirve a nadie y Google la trata como relleno.
    for cid, L in landings.items():
        ps = [q for q in orden if q.get('cat') == cid]
        if not ps or not L.get('slug'):
            continue
        ruta, doc = pagina_categoria(cid, L, ps, cats, cfg, promos, base, fijas, locales)
        rel = 'venta/%s/index.html' % L['slug']
        gp.escribir(rel, doc, cambios)
        paginas.append((ruta, rel))
        print('Página de categoría: %s (%d equipos).' % (ruta, len(ps)))
    # Promociones: página propia, solo si hay algo que mostrar.
    TODOS_PUBLICADOS[:] = orden
    enof = [p for p in orden if promo(p)]
    ruta, doc = pagina_promos(enof, cfg, base, fijas, locales, promos)
    gp.escribir('promociones/index.html', doc, cambios)
    paginas.append((ruta, 'promociones/index.html'))
    for i, p in enumerate(orden):
        prev = orden[i - 1] if i > 0 else None
        sig = orden[i + 1] if i + 1 < len(orden) else None
        mismos = [o for o in orden if o.get('cat') == p.get('cat') and o['id'] != p['id']]
        ruta, doc = pagina_producto(p, cats, cfg, base, fijas, locales, promos, vig, prev, sig, mismos)
        rel = 'venta/%s/index.html' % p['id']
        gp.escribir(rel, doc, cambios)
        paginas.append((ruta, rel))
        # La hoja A4 con el logo de la casa. De aquí sale el PDF que se
        # publica (scripts/generar_pdf_fichas.js). No va al sitemap: es
        # material de apoyo, no una página que Google deba indexar.
        gp.escribir('fichas/venta/%s/index.html' % p['id'],
                    ficha_a4_venta(p, cfg, base, fijas, locales), cambios)

    # Equipos que ya no se publican (sin stock o despublicados): su página se
    # borra. Lo vigente sale de las páginas que esta corrida generó de verdad,
    # no de una lista escrita a mano: así una página nueva de /venta/ (como la
    # de una familia de equipos) no se borra sola por no estar apuntada aquí.
    vigentes = {rel.split('/')[1] for _, rel in paginas
                if rel.startswith('venta/') and rel.count('/') >= 2}
    carpeta = os.path.join(ROOT, 'venta')
    for d in sorted(os.listdir(carpeta)):
        if os.path.isdir(os.path.join(carpeta, d)) and d not in vigentes:
            os.remove(os.path.join(carpeta, d, 'index.html'))
            os.rmdir(os.path.join(carpeta, d))
            cambios.append('venta/%s/ (borrada)' % d)

    # Copia de los datos en vivo para la tienda: abre con esto si Google tarda.
    copia = {'actualizado': vivo.get('actualizado', ''),
             'productos': [p for p in vivo.get('productos', [])
                           if p.get('id') and p.get('nom') and p['id'] not in bloq]}
    gp.escribir('data/venta-vivo.json', json.dumps(copia, ensure_ascii=False, separators=(',', ':')) + '\n', cambios)

    mapa_portada(productos, cambios)
    mapa_pie_portada(cambios)
    sitemap(paginas, cambios)
    vivos = {x['id']: x for x in orden}
    for pid, d in sorted(promos.items()):
        if pid not in vivos:
            print('AVISO: la promoción «%s» no corresponde a ningún equipo publicado.' % pid)
        elif not promo(vivos[pid]):
            print('AVISO: la promoción «%s» no se muestra: la fecha ya pasó, o el precio '
                  'de oferta no es menor que el de la hoja (%s).' % (pid, soles(vivos[pid].get('precio') or 0)))
    activas = [x for x in orden if promo(x)]
    if activas:
        print('%d equipos en promoción: %s' % (len(activas), ', '.join(x['id'] for x in activas)))
    n_feed = feed_google(orden, {'categorias': cats}, base, fijas, locales, promos, cambios)
    print('%d equipos en feed-google.xml (Google Merchant Center).' % n_feed)
    print('%d equipos de venta con página.' % len(productos))
    print('Cambiaron: %d archivos' % len(cambios))


if __name__ == '__main__':
    main()
