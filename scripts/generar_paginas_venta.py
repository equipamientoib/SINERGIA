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
    return 'S/ {:,.0f}'.format(n)


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
    sv = repo.get('stockVisible') or {}
    st = q.get('stock')
    if isinstance(st, (int, float)) and st > 0:
        q['stock'] = min(sv.get('maximo', 10), max(1, int(st * sv.get('porcentaje', 30) // 100)))
    for k, v in ((repo.get('datosFijos') or {}).get(q['id']) or {}).items():
        if not q.get(k):
            q[k] = v
    if not q.get('clave'):
        q['clave'] = (repo.get('codigosNTS') or {}).get(q['id'], '')
    if q.get('clave') and not q.get('expediente'):
        q['expediente'] = (repo.get('nombresNTS') or {}).get(q['clave'], '')
    return q


def aplicar_promos(productos, promos):
    """Deja el precio de oferta como precio del equipo, y el de la hoja
    guardado en «precioLista» para tacharlo.

    Se hace una sola vez, aquí: así la ficha, la tienda, el carrito, la
    cotización y el feed de Google cobran todos lo mismo, sin que cada
    uno tenga que acordarse de la promoción.
    """
    hoy = datetime.date.today()
    for p in productos:
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
    return productos


def promo(p, promos=None):
    """Lo que hay que mostrar de la promoción de un equipo, o None."""
    if not p.get('precioLista'):
        return None
    return {'antes': p['precioLista'], 'fin': p['promoFin'],
            'baja': int(round((1 - p['precio'] / p['precioLista']) * 100)),
            'ahorro': int(round(p['precioLista'] - p['precio']))}


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


def boton_carrito(p, foto):
    """Botón «Agregar al carrito» con los datos del equipo: la página suelta
    no carga el catálogo, así que los lleva encima."""
    return ('<button type="button" class="btn fill" data-add="%s" data-nom="%s" data-mm="%s" '
            'data-nts="%s" data-precio="%s" data-foto="%s">Agregar al carrito</button>'
            % (e(p['id']), e(p['nom']),
               e(' '.join(x for x in (p.get('marca'), p.get('modelo')) if x)),
               e(p.get('clave') or ''), int(p.get('precio') or 0), e(foto or '')))


def ficha_venta(pid):
    ruta = os.path.join(FICHAS_VENTA, pid + '.json')
    return gp.leer_json(ruta) if os.path.exists(ruta) else None


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
    doc = doc.replace('</body>', '<script defer src="/js/carrito.js?v=%s"></script>\n'
                      '<script defer src="/js/promo-ventana.js?v=%s"></script>\n</body>'
                      % (sello_js('carrito.js'), sello_js('promo-ventana.js')), 1)
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
    alt = e(' '.join(x for x in (p['nom'], p.get('marca', ''), p.get('modelo', '')) if x))
    if not fts:
        return '<div class="gal una"><div class="gal-main sinfoto">%s</div></div>' % gp.ICONO
    lig = [a for a, _ in fts]
    gra = [b for _, b in fts]
    n = len(lig)
    minis = ''.join('<button type="button" class="%s" data-i="%d" aria-label="Foto %d">'
                    '<img src="%s" alt="" loading="lazy" decoding="async" width="120" height="90"></button>'
                    % ('on' if k == 0 else '', k, k + 1, f) for k, f in enumerate(lig)) if n > 1 else ''
    flechas = ('<button type="button" class="gal-f izq" aria-label="Foto anterior">&#8249;</button>'
               '<button type="button" class="gal-f der" aria-label="Foto siguiente">&#8250;</button>'
               '<span class="gal-n">1 / %d</span>' % n) if n > 1 else ''
    return f'''<div class="gal{' una' if n < 2 else ''}" data-fotos="{e(json.dumps(lig))}" data-grandes="{e(json.dumps(gra))}">
        {('<div class="gal-minis">' + minis + '</div>') if minis else ''}
        <div class="gal-main">
          <img src="{lig[0]}" alt="{alt}" {'fetchpriority="high"' if primera else 'loading="lazy"'} decoding="async" width="700" height="525">
          {flechas}
        </div>
      </div>'''


def franja(p):
    d = [(k, c, p.get(c)) for k, c in (('Marca', 'marca'), ('Modelo', 'modelo'), ('Origen', 'origen'),
                                       ('Código NTS', 'clave')) if p.get(c)]
    if not d:
        return ''
    return '<dl class="ft">%s</dl>' % ''.join(
        '<div class="ft-%s"><dt>%s</dt><dd>%s</dd></div>' % (c, k, e(v)) for k, c, v in d)


def producto(p, cat, cfg, fts, promos, vig, prev, sig, mismos):
    texto = 'Hola Sinergia Biomédica, quiero cotizar: %s%s%s.' % (
        p['nom'], ' ' + p['marca'] if p.get('marca') else '', ' ' + p['modelo'] if p.get('modelo') else '')
    wa = 'https://wa.me/%s?text=%s' % (cfg['whatsapp'], urllib.parse.quote(texto))
    correo = 'mailto:%s?subject=%s&body=%s' % (cfg['email'], urllib.parse.quote('Cotización: ' + p['nom']),
                                                urllib.parse.quote(texto))
    add = boton_carrito(p, fts[0][0] if fts else '')
    # Precio con vigencia (14 días desde la última actualización con el proveedor)
    caja = ''
    stock = p.get('stock')
    badge = ('<span class="st si">En stock · %d %s</span>' % (stock, 'unidad' if stock == 1 else 'unidades')
             if isinstance(stock, (int, float)) and stock > 0 else '')
    of = promo(p, promos)
    if p.get('precio'):
        nota = ('Incluye IGV · <span>Precio vigente hasta el <b data-vig="%s">%s</b> · se confirma en la cotización</span>'
                % (vig.isoformat(), vig.strftime('%d/%m/%Y'))) if vig else 'Incluye IGV · Precio referencial, se confirma en la cotización'
        if of:
            nota = ('Incluye IGV · <b>Promoción válida hasta el %s</b> · se confirma en la cotización'
                    % of['fin'].strftime('%d/%m/%Y'))
        antes = ('<s class="pc-antes">%s</s><span class="pc-baja">−%d %%</span>' % (soles(of['antes']), of['baja'])) if of else ''
        caja = f'''<div class="precio{' con-promo' if of else ''}"><div class="pc-fila"><b class="pc-monto">{soles(p['precio'])}</b>{antes}{badge}</div>
          <small class="pc-nota">{nota}</small></div>'''
    elif badge:
        caja = '<div class="precio"><div class="pc-fila"><b class="pc-monto consulta">Consultar precio</b>%s</div></div>' % badge
    # Ficha técnica: activa si ya existe el PDF; si no, el espacio listo
    pdf = pdf_venta(p['id'])
    ruta_pdf = os.path.join(ROOT, pdf.lstrip('/'))
    if os.path.exists(ruta_pdf):
        kb = max(1, round(os.path.getsize(ruta_pdf) / 1024))
        doc = f'''<div class="doc">
          <span class="doc-ico" aria-hidden="true">PDF</span>
          <span class="doc-txt"><b>Ficha técnica</b><small>PDF · {kb} KB</small></span>
          <button type="button" class="btn doc-ver" data-ver="{pdf}" data-pdf="{pdf}" data-titulo="Ficha técnica — {e(p['nom'])}">Ver</button>
          <a class="btn fill doc-dl" href="{pdf}" download>Descargar</a>
        </div>'''
    else:
        wa_f = 'https://wa.me/%s?text=%s' % (cfg['whatsapp'], urllib.parse.quote(
            'Hola Sinergia Biomédica, me envían la ficha técnica de: %s %s %s' % (p['nom'], p.get('marca', ''), p.get('modelo', ''))))
        doc = f'''<p class="doc-linea"><span class="doc-mini" aria-hidden="true">PDF</span>
          Ficha técnica en preparación · <a href="{wa_f}" target="_blank" rel="noopener">pídela por WhatsApp</a></p>'''

    # Pestañas: Descripción · Parámetros técnicos · Código NTS
    areas = ''.join('<li>%s</li>' % e(a) for a in p.get('areas') or [])
    desc = '<p>%s</p>' % e(p.get('resumen') or '')
    if areas:
        desc += '<p class="nota-p"><b>Se usa en:</b></p><ul>%s</ul>' % areas
    desc += ('<p class="nota-p">Incluye asesoría para elegir el modelo, entrega en Lima y provincias '
             'y mantenimiento después de la venta.</p>')
    f = ficha_venta(p['id'])
    if f:
        filas = ''.join('<tr class="g"><th colspan="2">%s</th></tr>' % e(g['titulo'])
                        + ''.join('<tr><th>%s</th><td>%s</td></tr>' % (e(a), e(b)) for a, b in g['filas'])
                        for g in f['secciones'])
        pie = '<p class="nota-p fuente">Fuente: %s. Especificaciones sujetas a cambios del fabricante.</p>' % e(f.get('fuente', 'fabricante'))
    else:
        ident = [('Equipo', p['nom']), ('Marca', p.get('marca')), ('Modelo', p.get('modelo')),
                 ('Procedencia', p.get('origen')), ('Categoría', cat)]
        filas = '<tr class="g"><th colspan="2">Identificación</th></tr>' + ''.join(
            '<tr><th>%s</th><td>%s</td></tr>' % (k, e(v)) for k, v in ident if v)
        car = p.get('caracteristicas') or []
        if car:
            filas += '<tr class="g"><th colspan="2">Características principales</th></tr>' + ''.join(
                '<tr><td colspan="2" class="car">%s</td></tr>' % e(c) for c in car)
        pie = ('<p class="nota-p fuente">Los parámetros completos del fabricante van en la ficha técnica, '
               'que te enviamos con la cotización.</p>')
    pest = [('Descripción', desc), ('Parámetros técnicos', '<table>%s</table>%s' % (filas, pie))]
    if p.get('expediente') or p.get('clave'):
        exp = '<table>'
        if p.get('clave'):
            exp += ('<tr><th>Código NTS</th><td><b>%s</b> (NTS 113-MINSA) · <a href="/venta/codigos-nts/#%s">otros equipos con este código</a></td></tr>'
                    % (e(p['clave']), e(p['clave'])))
        if p.get('expediente'):
            exp += '<tr><th>Nombre oficial</th><td>%s</td></tr>' % e(p['expediente'])
        exp += '<tr><th>Modelo ofertado</th><td>%s</td></tr></table>' % e(' '.join(x for x in (p.get('marca'), p.get('modelo')) if x))
        exp += ('<p class="nota-p">Envíanos la ficha técnica de tu expediente y te devolvemos el cuadro de '
                'cumplimiento, punto por punto, con el modelo ofertado.</p>')
        pest.append(('Código NTS', exp))
    tabs = ''.join('<button type="button" class="tab%s" role="tab">%s</button>' % (' on' if k == 0 else '', e(n))
                   for k, (n, _) in enumerate(pest))
    panels = ''.join('<div class="panel" role="tabpanel"%s>%s</div>' % ('' if k == 0 else ' hidden', c)
                     for k, (_, c) in enumerate(pest))
    # Anterior / Siguiente (orden de la tienda) y otros de la categoría
    nav = '<nav class="sig" aria-label="Más equipos">%s%s</nav>' % (
        ('<a class="ant" href="/venta/%s/"><small>‹ Anterior</small><b>%s</b></a>' % (prev['id'], e(prev['nom']))) if prev else '<span></span>',
        ('<a class="pos" href="/venta/%s/"><small>Siguiente ›</small><b>%s</b></a>' % (sig['id'], e(sig['nom']))) if sig else '<span></span>')
    otros = ''.join('<a href="/venta/%s/">%s</a>' % (o['id'], e(o['nom'] + (' ' + o['modelo'] if o.get('modelo') else '')))
                    for o in mismos[:12])
    return f'''
    <button type="button" class="sb-atras" onclick="sbAtras()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
      Seguir viendo equipos</button>
    <article class="prod venta" id="{e(p['id'])}">
      {galeria(p, fts)}
      <div class="prod-info">
        <div class="k">{e(cat)}</div>
        <h1 class="prod-h1">{e(p['nom'])}</h1>
        <p class="prod-desc">{e(p.get('resumen') or '')}</p>
        {franja(p)}
        {caja}
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
    {nav}
    {f"""<section class="otros">
    <h2>Más en {e(cat)}</h2>
    <div class="chips">{otros}</div>
  </section>""" if otros else ''}
  <p class="volver"><a class="btn" href="/#/venta/tienda">← Ver toda la tienda</a></p>'''


VIG_JS = '''<script>
  /* Si la página se generó hace tiempo y la vigencia ya pasó, no se muestra vencida. */
  document.querySelectorAll('[data-vig]').forEach(function(b){
    if(new Date(b.dataset.vig + 'T23:59:59') < new Date()) b.parentNode.textContent = 'Precio referencial, por confirmar en la cotización';
  });
</script>'''


def pagina_producto(p, cats, cfg, base, fijas, locales, promos, vig, prev, sig, mismos):
    cat = cats.get(p.get('cat'), '')
    fts = fotos(p, base, fijas, locales)
    ruta = '/venta/%s/' % p['id']
    nombre = ' '.join(x for x in (p['nom'], p.get('marca'), p.get('modelo')) if x)
    nts = ('Código NTS %s' % p['clave']) if p.get('clave') else ''
    title = '%s%s | Venta en Lima — Sinergia Biomédica' % (nombre, ' · ' + nts if nts else '')
    descripcion = '%s %s%s Venta con ficha técnica, entrega en Lima y provincias y mantenimiento.' % (
        nombre + '.', (p.get('resumen') or '').rstrip('.') + '. ' if p.get('resumen') else '',
        ('%s (%s, NTS 113-MINSA).' % (nts, p['expediente'])) if nts and p.get('expediente') else (nts + '.' if nts else ''))
    cuerpo = producto(p, cat, cfg, fts, promos, vig, prev, sig, mismos) + VIG_JS
    oferta = {'@type': 'Offer', 'priceCurrency': 'PEN', 'url': SITIO + ruta,
              'availability': 'https://schema.org/InStock' if (p.get('stock') or 0) > 0 else 'https://schema.org/PreOrder',
              'seller': {'@id': SITIO + '/#negocio'}}
    if p.get('precio'):
        oferta['price'] = str(int(round(p['precio'])))
        if vig:
            oferta['priceValidUntil'] = vig.isoformat()
    jsonld = [{'@type': 'Product', 'name': nombre, 'description': p.get('resumen') or nombre,
               **({'additionalProperty': [{'@type': 'PropertyValue', 'name': 'Código NTS 113-MINSA',
                                                             'value': '%s %s' % (p['clave'], p.get('expediente') or '')}]}
                  if p.get('clave') else {}),
               'brand': {'@type': 'Brand', 'name': p.get('marca') or 'Sinergia Biomédica'},
               'model': p.get('modelo') or '', 'category': cat,
               # La grande (no la ligera): Google pide la mayor resolución
               # disponible para mostrar la ficha con foto y precio.
               'image': [SITIO + b if b.startswith('/') else b for _, b in fts][:3],
               'offers': oferta}]
    migas = [('Inicio', '/'), ('Venta', '/venta/'), (cat or 'Equipos', '/venta/#' + (p.get('cat') or '')),
             (p['nom'], ruta)]
    img = fts[0][0] if fts and fts[0][0].startswith('/') else None
    return ruta, pagina(cfg, ruta=ruta, title=title, descripcion=descripcion, migas=migas,
                        cuerpo=cuerpo, jsonld=jsonld, imagen=img)


def promo_item(p, base, fijas, locales):
    """Lo que necesita la ventana flotante de un equipo en remate."""
    fts = fotos(p, base, fijas, locales)
    of = promo(p)
    return {'id': p['id'], 'nom': p['nom'],
            'mm': ' · '.join(x for x in (p.get('marca'), p.get('modelo')) if x),
            'precio': p['precio'], 'antes': of['antes'] if of else 0,
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
               '<span class="vt-of">OFERTA</span>' if of else '',
               e(p['nom']), e(' · '.join(x for x in (p.get('marca'), p.get('modelo')) if x)),
               precio_tarjeta(p, promos)))


def precio_tarjeta(p, promos):
    """El precio de la tarjeta; en promoción, con el de antes tachado."""
    if not p.get('precio'):
        return ''
    of = promo(p, promos)
    if not of:
        return '<i>%s</i>' % soles(p['precio'])
    return ('<i class="oferta">%s <s>%s</s><em>−%d %%</em></i>'
            % (soles(p['precio']), soles(of['antes']), of['baja']))


def pagina_hub(productos, cats_orden, cats, cfg, base, fijas, locales, promos):
    ruta = '/venta/'
    secciones = []
    for cid in cats_orden:
        ps = [p for p in productos if p.get('cat') == cid]
        if not ps:
            continue
        tarjetas = ''.join(tarjeta_venta(p, base, fijas, locales, promos) for p in ps)
        secciones.append('<section class="vcat" id="%s"><h2>%s <small>%d</small></h2><div class="vts">%s</div></section>'
                         % (e(cid), e(cats.get(cid, cid)), len(ps), tarjetas))
    # Franja de promociones: va arriba de todo, antes de las categorías.
    enof = [p for p in productos if promo(p, promos)]
    franja_promo = ''
    if enof:
        hasta = min(promo(p, promos)['fin'] for p in enof)
        franja_promo = (
            '<section class="vpromo" id="promociones">'
            '<h2>En promoción <small>%d</small></h2>'
            '<p class="vpromo-n">Precios rebajados hasta el %s. Después vuelven a su precio de lista.</p>'
            '<div class="vts">%s</div></section>'
            % (len(enof), hasta.strftime('%d/%m/%Y'),
               ''.join(tarjeta_venta(p, base, fijas, locales, promos) for p in enof)))
        # La ventana flotante de bienvenida lee esto (js/promo-ventana.js).
        franja_promo += ('<script>window.SB_PROMOS=%s</script>'
                         % json.dumps({'hasta': hasta.isoformat(),
                                       'lista': [promo_item(p, base, fijas, locales) for p in enof]},
                                      ensure_ascii=False))

    cuerpo = f'''
  <section class="cabeza">
    <div class="eyebrow">Venta · Equipamiento biomédico · Lima y provincias</div>
    <h1>Venta de equipos médicos</h1>
    <p class="lead">{len(productos)} equipos con stock para hospitales, clínicas y obras de equipamiento: ficha técnica, código NTS y mantenimiento después de la venta.</p>
    <p><a class="btn fill" href="/#/venta/tienda">Abrir la tienda con filtros →</a> <a class="btn" href="/venta/codigos-nts/">Buscar por código NTS</a></p>
  </section>
  {franja_promo}
  {''.join(secciones)}'''
    jsonld = [{'@type': 'ItemList', 'name': 'Venta de equipos médicos',
               'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': p['nom'],
                                    'url': SITIO + '/venta/%s/' % p['id']} for i, p in enumerate(productos)]}]
    return ruta, pagina(cfg, ruta=ruta, title='Venta de equipos médicos en Lima y provincias | Sinergia Biomédica',
                        descripcion='Equipos médicos con stock: monitores, electrocardiógrafos, autoclaves, desfibriladores, '
                                    'ecógrafos y más, con ficha técnica y mantenimiento. Lima y provincias.',
                        migas=[('Inicio', '/'), ('Venta', ruta)], cuerpo=cuerpo, jsonld=jsonld)


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
    txt = open(gp.INDEX, encoding='utf-8').read()
    ini, fin = '<!--VENTA-URL-INICIO-->', '<!--VENTA-URL-FIN-->'
    js = '<script>window.PAGINA_VENTA=%s;</script>' % json.dumps(
        {p['id']: '/venta/%s/' % p['id'] for p in productos}, ensure_ascii=False, sort_keys=True)
    if ini not in txt:
        txt = txt.replace('<!--TIPOS-URL-FIN-->', '<!--TIPOS-URL-FIN-->\n' + ini + fin, 1)
    nuevo = re.sub(re.escape(ini) + '.*?' + re.escape(fin), lambda m: ini + js + fin, txt, flags=re.S)
    gp.escribir('index.html', nuevo, cambios)


def sitemap(paginas, cambios):
    """Agrega/actualiza las URL de /venta/ sin tocar las demás."""
    txt = open(gp.SITEMAP, encoding='utf-8').read() if os.path.exists(gp.SITEMAP) else ''
    previas = gp.fechas_previas()
    otras = [u for u in re.findall(r'  <url>.*?</url>', txt) if '/venta/' not in u]
    hoy = datetime.date.today().isoformat()
    nuevas = []
    for ruta, rel in paginas:
        loc = SITIO + ruta
        fecha = hoy if (rel in cambios or loc not in previas) else previas[loc]
        nuevas.append('  <url><loc>%s</loc><lastmod>%s</lastmod></url>' % (loc, fecha))
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
        if p.get('clave'):
            desc += ' Código NTS %s.' % p['clave']
        filas.append(
            '  <item>\n'
            '    <g:id>%s</g:id>\n'
            '    <title>%s</title>\n'
            '    <description>%s</description>\n'
            '    <link>%s/venta/%s/</link>\n'
            '    <g:image_link>%s</g:image_link>\n'
            '    <g:availability>%s</g:availability>\n'
            '    <g:price>%d PEN</g:price>\n'
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
                int(round(of['antes'] if of else p['precio'])),
                ('    <g:sale_price>%d PEN</g:sale_price>\n'
                 '    <g:sale_price_effective_date>%sT00:00:00-0500/%sT23:59:59-0500</g:sale_price_effective_date>\n'
                 % (int(round(p['precio'])), datetime.date.today().isoformat(), of['fin'].isoformat())) if of else '',
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
    fuera = [p['id'] for p in vivo.get('productos', []) if p.get('id') in bloq]
    if fuera:
        print('Retirados a mano (noPublicar): %s' % ', '.join(sorted(fuera)))
    if not productos:
        sys.exit('No hay equipos en los datos: no se genera nada.')
    cats = {c['id']: c['nombre'] for c in repo.get('categorias', [])}
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
    ruta, doc = pagina_hub(orden, cats_orden, cats, cfg, base, fijas, locales, promos)
    gp.escribir('venta/index.html', doc, cambios)
    paginas.append((ruta, 'venta/index.html'))
    ruta, doc = pagina_nts(orden, cfg)
    gp.escribir('venta/codigos-nts/index.html', doc, cambios)
    paginas.append((ruta, 'venta/codigos-nts/index.html'))
    for i, p in enumerate(orden):
        prev = orden[i - 1] if i > 0 else None
        sig = orden[i + 1] if i + 1 < len(orden) else None
        mismos = [o for o in orden if o.get('cat') == p.get('cat') and o['id'] != p['id']]
        ruta, doc = pagina_producto(p, cats, cfg, base, fijas, locales, promos, vig, prev, sig, mismos)
        rel = 'venta/%s/index.html' % p['id']
        gp.escribir(rel, doc, cambios)
        paginas.append((ruta, rel))

    # Equipos que ya no se publican (sin stock o despublicados): su página se borra.
    vigentes = {p['id'] for p in productos} | {'codigos-nts'}
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
