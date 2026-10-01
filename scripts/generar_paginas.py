#!/usr/bin/env python3
"""
generar_paginas.py — Páginas que Google puede indexar, una por TIPO de equipo.

La web principal vive en direcciones con «#/» (#/catalogo, #/equipo/...), que
para Google son todas la misma página. Este script escribe páginas estáticas
de verdad:

    alquiler/index.html                         todos los tipos
    alquiler/<tipo>/index.html                  un tipo, con todos sus modelos
    sitemap.xml, robots.txt
    index.html: window.PAGINA_TIPO (a qué página va cada equipo del catálogo)

Por tipo y no por modelo: la gente busca «alquiler de analizador de
seguridad eléctrica», no «ESA620». Y si mañana hay dos analizadores, los dos
salen en la misma página, que no cambia de dirección.

Lee
    data/seo-tipos.json   textos de cada tipo (se editan a mano)
    data/catalogo.json    equipos; o el JSON en vivo del Apps Script con
                          --datos <archivo> (lo usa la actualización diaria)

Uso
    python3 scripts/generar_paginas.py
    python3 scripts/generar_paginas.py --datos /tmp/vivo.json

Correrlo dos veces sin cambios en los datos no cambia ningún archivo.
"""
import argparse
import datetime
import html
import json
import os
import re
import sys
import unicodedata
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITIO = 'https://sinergiabiomedica.pe'
TIPOS = os.path.join(ROOT, 'data', 'seo-tipos.json')
CATALOGO = os.path.join(ROOT, 'data', 'catalogo.json')
CONFIG = os.path.join(ROOT, 'js', '00-config.js')
INDEX = os.path.join(ROOT, 'index.html')
SITEMAP = os.path.join(ROOT, 'sitemap.xml')

e = html.escape


# ─────────────────────────── datos ───────────────────────────

def leer_json(ruta):
    with open(ruta, encoding='utf-8') as f:
        return json.load(f)


def config_sitio():
    """Teléfono, WhatsApp, correo y MOSTRAR_PRECIOS, de js/00-config.js."""
    txt = open(CONFIG, encoding='utf-8').read()
    def campo(nombre, defecto=''):
        m = re.search(nombre + r'\s*:\s*"([^"]*)"', txt)
        return m.group(1) if m else defecto
    precios = re.search(r'MOSTRAR_PRECIOS\s*:\s*(true|false)', txt)
    return {
        'telefono': campo('telefono', '+51 908 704 131'),
        'whatsapp': campo('whatsapp', '51908704131'),
        'email': campo('email', 'logistica@sinergiabiomedica.pe'),
        'precios': bool(precios and precios.group(1) == 'true'),
    }


def slugify(txt):
    t = unicodedata.normalize('NFKD', txt).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')


RE_ID = re.compile(r'(?:/d/|id=)([A-Za-z0-9_-]{20,})')


def foto_local(url, locales, ligera=True):
    """La foto servida desde el sitio (WebP ligera), o None si no hay copia."""
    if not url:
        return None
    m = RE_ID.search(url)
    ruta = locales.get(m.group(1)) if m else None
    if not ruta:
        return None
    base, _ = os.path.splitext(ruta)
    for cand in ([base + '-m.webp', base + '.webp'] if ligera else [base + '.webp']) + [ruta]:
        if os.path.exists(os.path.join(ROOT, cand)):
            return '/' + cand
    return None


def fotos_de(eq, locales):
    urls = eq.get('fotos') or ([eq['photo']] if eq.get('photo') else [])
    out = []
    for u in urls:
        f = foto_local(u, locales)
        if f and f not in out:
            out.append(f)
    return out


# ─────────────────────────── plantilla ───────────────────────────

GALERIA_JS = r'''
(function(){
  var V=document.getElementById('visor'), VI=V&&V.querySelector('img'), VN=V&&V.querySelector('.v-n'), actual=null;
  function mostrar(g,i){
    var f=JSON.parse(g.dataset.fotos), n=f.length; i=(i+n)%n; g.dataset.i=i;
    g.querySelector('.gal-main img').src=f[i];
    var c=g.querySelector('.gal-n'); if(c) c.textContent=(i+1)+' / '+n;
    g.querySelectorAll('.gal-minis button').forEach(function(b,k){b.classList.toggle('on',k===i);});
    if(actual===g) abrir(g);
  }
  function abrir(g){
    var G=JSON.parse(g.dataset.grandes), i=+g.dataset.i||0; actual=g;
    VI.src=G[i]; VN.textContent=G.length>1?(i+1)+' / '+G.length:'';
    V.classList.toggle('una',G.length<2); V.hidden=false; document.body.style.overflow='hidden';
  }
  function cerrar(){ V.hidden=true; actual=null; document.body.style.overflow=''; }
  document.querySelectorAll('.gal[data-fotos]').forEach(function(g){
    g.dataset.i=0;
    g.addEventListener('click',function(ev){
      var b=ev.target.closest('button');
      if(b&&b.dataset.i!=null) return mostrar(g,+b.dataset.i);
      if(b&&b.classList.contains('izq')) return mostrar(g,(+g.dataset.i)-1);
      if(b&&b.classList.contains('der')) return mostrar(g,(+g.dataset.i)+1);
      if(ev.target.closest('.gal-main')) abrir(g);
    });
  });
  if(!V) return;
  V.addEventListener('click',function(ev){
    var b=ev.target.closest('button');
    if(b&&b.classList.contains('izq')) return mostrar(actual,(+actual.dataset.i)-1);
    if(b&&b.classList.contains('der')) return mostrar(actual,(+actual.dataset.i)+1);
    if(ev.target!==VI) cerrar();
  });
  document.addEventListener('keydown',function(ev){
    if(V.hidden) return;
    if(ev.key==='Escape') cerrar();
    if(ev.key==='ArrowLeft') mostrar(actual,(+actual.dataset.i)-1);
    if(ev.key==='ArrowRight') mostrar(actual,(+actual.dataset.i)+1);
  });
})();
'''

LOGO = '''<svg class="logo" viewBox="0 0 880 240" role="img" aria-label="Sinergia Biomédica">
      <text x="40" y="208" font-weight="700" font-size="212" textLength="252" lengthAdjust="spacingAndGlyphs"><tspan fill="#9A7F4E">S</tspan><tspan fill="#2A2D33">B</tspan></text>
      <text x="342" y="158" font-weight="700" font-size="100" fill="#17191D" textLength="498" lengthAdjust="spacingAndGlyphs">SINERGIA</text>
      <text x="342" y="212" font-weight="600" font-size="52" fill="#2A2D33" textLength="498" lengthAdjust="spacingAndGlyphs">BIOMÉDICA</text>
      <rect x="342" y="228" width="498" height="3" fill="#9A7F4E"/>
    </svg>'''

ICONO = '''<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>'''


def negocio(cfg):
    return {
        '@type': 'LocalBusiness',
        '@id': SITIO + '/#negocio',
        'name': 'Sinergia Biomédica',
        'legalName': 'Servicios Integrales Sinergia S.A.C.',
        'url': SITIO + '/',
        'email': cfg['email'],
        'telephone': cfg['telefono'],
        'address': {'@type': 'PostalAddress', 'addressLocality': 'Pueblo Libre',
                    'addressRegion': 'Lima', 'addressCountry': 'PE'},
        'areaServed': 'Perú',
    }


def pagina(cfg, *, ruta, title, descripcion, migas, cuerpo, jsonld, imagen=None):
    """Documento completo. «ruta» es la dirección canónica, con / final."""
    url = SITIO + ruta
    og_img = SITIO + (imagen or '/img/catalogo/defib-05.jpg')
    wa = 'https://wa.me/%s?text=%s' % (cfg['whatsapp'], urllib.parse.quote(
        'Hola Sinergia Biomédica, quiero cotizar un alquiler.'))
    graph = {'@context': 'https://schema.org', '@graph': [negocio(cfg)] + jsonld + [{
        '@type': 'BreadcrumbList',
        'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n,
                             'item': SITIO + r} for i, (n, r) in enumerate(migas)],
    }]}
    visible = {'/alquiler/': '/#/catalogo'}
    migas_html = ' <span>/</span> '.join(
        ('<a href="%s">%s</a>' % (visible.get(r, r), e(n))) if i < len(migas) - 1 else '<span>%s</span>' % e(n)
        for i, (n, r) in enumerate(migas))
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(descripcion)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#17191D">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_PE">
<meta property="og:site_name" content="Sinergia Biomédica">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(descripcion)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og_img}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/img/icons/favicon-32.png">
<link rel="apple-touch-icon" href="/img/icons/apple-touch-icon.png">
<link rel="stylesheet" href="/css/00-fuentes.css">
<link rel="stylesheet" href="/css/alquiler.css">
<script type="application/ld+json">{json.dumps(graph, ensure_ascii=False)}</script>
</head>
<body>
<!-- Generado por scripts/generar_paginas.py a partir de data/seo-tipos.json
     y del catálogo. No editar a mano: se sobrescribe. -->
<header class="top"><div class="wrap">
  <a href="/" aria-label="Sinergia Biomédica — inicio">{LOGO}</a>
  <nav>
    <a href="/">Inicio</a>
    <a href="/#/servicios">Servicios</a>
    <a href="/#/catalogo" class="on">Catálogo</a>
    <a href="/#/talleres">Talleres</a>
    <a href="/#/clientes">Clientes</a>
    <a href="/#/contacto">Contacto</a>
  </nav>
</div></header>
<main class="wrap">
  <nav class="migas" aria-label="Estás en">{migas_html}</nav>
{cuerpo}
</main>
<footer class="pie"><div class="wrap">
  <div><b>Sinergia Biomédica</b><br>Servicios Integrales Sinergia S.A.C. · RUC 20615862682<br>Pueblo Libre, Lima — Perú</div>
  <div><a href="mailto:{e(cfg['email'])}">{e(cfg['email'])}</a><br>
    <a href="{wa}" target="_blank" rel="noopener">WhatsApp {e(cfg['telefono'])}</a></div>
</div></footer>
<a class="wafab" href="{wa}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
  <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.8 5 2.3 7L4 29l7.3-2.2c1.9 1 4 1.6 6.2 1.6h.1c6.6 0 12-5.3 12-11.9 0-3.2-1.3-6.2-3.5-8.4A12 12 0 0 0 16 3zm7 16.9c-.3.8-1.7 1.6-2.4 1.7-.6.1-1.4.2-2.2-.1-.5-.2-1.2-.4-2-.8-3.6-1.5-5.9-5.1-6.1-5.4-.2-.2-1.4-1.9-1.4-3.7s.9-2.6 1.3-3c.3-.3.7-.4 1-.4h.7c.2 0 .5-.1.8.6l1.1 2.7c.1.2.2.5 0 .7l-.4.7-.6.6c-.2.2-.4.4-.2.8.2.3 1 1.6 2.1 2.6 1.5 1.3 2.7 1.7 3 1.9.4.2.6.1.8-.1l1.2-1.4c.3-.3.5-.2.8-.1l2.6 1.2c.4.2.6.3.7.5.1.1.1.8-.2 1.6z"/></svg>
</a>
<div class="visor" id="visor" hidden><button type="button" class="v-x" aria-label="Cerrar">&#10005;</button><button type="button" class="v-f izq" aria-label="Anterior">&#8249;</button><img alt=""><button type="button" class="v-f der" aria-label="Siguiente">&#8250;</button><span class="v-n"></span></div>
<script>{GALERIA_JS}</script>
</body>
</html>
'''


def tarjeta_equipo(eq, tipo, cfg, locales, primera=False):
    fotos = fotos_de(eq, locales)
    alt = e(eq['nom'] + ' — ' + eq.get('marca', ''))
    n = len(fotos)
    if fotos:
        # Galería: la foto ligera se ve en la ficha; la grande, al ampliar.
        # Sin JavaScript se ve la primera foto; con él, flechas, miniaturas
        # y visor a pantalla completa (script al final de la página).
        grandes = [f.replace('-m.webp', '.webp') for f in fotos]
        minis = ''.join('<button type="button" class="%s" data-i="%d" aria-label="Foto %d">'
                        '<img src="%s" alt="" loading="lazy" decoding="async" width="120" height="90"></button>'
                        % ('on' if k == 0 else '', k, k + 1, f) for k, f in enumerate(fotos)) if n > 1 else ''
        galeria = f'''
      <div class="gal" data-fotos="{e(json.dumps(fotos))}" data-grandes="{e(json.dumps(grandes))}">
        <div class="gal-main">
          <img src="{fotos[0]}" alt="{alt}" {'fetchpriority="high"' if primera else 'loading="lazy"'} decoding="async" width="700" height="525">
          {'<button type="button" class="gal-f izq" aria-label="Foto anterior">&#8249;</button><button type="button" class="gal-f der" aria-label="Foto siguiente">&#8250;</button><span class="gal-n">1 / %d</span>' % n if n > 1 else ''}
          <span class="gal-zoom" aria-hidden="true">Ampliar</span>
        </div>
        {('<div class="gal-minis">' + minis + '</div>') if minis else ''}
      </div>'''
    else:
        galeria = '<div class="gal"><div class="gal-main sinfoto">%s</div></div>' % ICONO

    specs = ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (e(k), e(str(v)))
                    for k, v in (eq.get('specs') or {}).items())
    texto = 'Hola Sinergia Biomédica, quiero cotizar el alquiler del %s (%s).' % (
        eq['nom'].lower(), eq.get('marca', '').split('·')[0].strip())
    wa = 'https://wa.me/%s?text=%s' % (cfg['whatsapp'], urllib.parse.quote(texto))
    correo = 'mailto:%s?subject=%s&body=%s' % (cfg['email'], urllib.parse.quote(
        'Cotización: ' + eq['nom']), urllib.parse.quote(texto))
    enl = []
    if eq.get('cal_fin'):
        enl.append('<span class="cal">Calibración vigente hasta %s</span>' % e(eq['cal_fin']))
    if eq.get('cal_pdf'):
        enl.append('<a href="%s" target="_blank" rel="noopener">Certificado de calibración (PDF)</a>' % e(eq['cal_pdf']))
    if eq.get('ficha'):
        enl.append('<a href="%s" target="_blank" rel="noopener">Ficha técnica (PDF)</a>' % e(eq['ficha']))
    docs = ('<div class="docs">%s</div>' % ''.join(enl)) if enl else ''
    if cfg['precios'] and eq.get('dia'):
        precio = '<div class="tarifa"><b>Desde S/ %s</b> por día<small>IGV incluido · también por hora, semana o mes</small></div>' % eq['dia']
    else:
        precio = '<div class="tarifa"><b>Consultar tarifa</b><small>Te respondemos con precio y disponibilidad</small></div>'
    tier = ('<span class="tier">%s</span>' % e(eq['tier'])) if eq.get('tier') else ''
    return f'''
    <article class="equipo" id="{e(eq['id'])}">
      {galeria}
      <div class="info">
        <div class="chips-eq"><span class="disp">Disponible</span>{tier}</div>
        <div class="k">{e(eq.get('cat', ''))}</div>
        <h2>{e(eq['nom'])}</h2>
        <div class="marca">{e(eq.get('marca', ''))}</div>
        <p class="desc">{e(eq.get('desc', ''))}</p>
        {('<dl class="specs">' + specs + '</dl>') if specs else ''}
        {docs}
        <div class="cta">
          {precio}
          <div class="btns">
            <a class="btn fill" href="{wa}" target="_blank" rel="noopener">Cotizar por WhatsApp</a>
            <a class="btn" href="{correo}">Cotizar por correo</a>
          </div>
        </div>
        <ul class="garantias">
          <li>Por hora, día o mes</li>
          <li>Técnico opcional</li>
          <li>Lima y provincias</li>
        </ul>
      </div>
    </article>'''


def pagina_tipo(t, equipos, todos, cfg, locales):
    ruta = '/alquiler/%s/' % t['slug']
    n = len(equipos)
    usos = ''.join('<li>%s</li>' % e(u) for u in t.get('usos', []))
    faq = ''.join('<details><summary>%s</summary><p>%s</p></details>' % (e(p), e(r))
                  for p, r in t.get('faq', []))
    otros = ''.join('<a href="/alquiler/%s/">%s</a>' % (o['slug'], e(o['nombre']))
                    for o in todos if o['slug'] != t['slug'])
    fotos = fotos_de(equipos[0], locales) if equipos else []
    cuerpo = f'''
  <section class="cabeza">
    <div class="eyebrow">Alquiler · Lima y provincias</div>
    <h1>{e(t['h1'])}</h1>
    <p class="cuantos">{n} {"modelo disponible" if n == 1 else "modelos disponibles"} · por hora, día, semana o mes · técnico instrumentista opcional</p>
  </section>

  <section class="productos">
    {''.join(tarjeta_equipo(x, t, cfg, locales, primera=(k == 0)) for k, x in enumerate(equipos))}
  </section>

  <section class="que-es">
    <h2>¿Qué es y para qué se usa?</h2>
    <p class="lead">{e(t['intro'])}</p>
    {f'<ul class="usos">{usos}</ul>' if usos else ''}
  </section>

  <section class="pasos">
    <h2>Cómo funciona el alquiler</h2>
    <ol>
      <li><b>Eliges el equipo</b> y nos dices las fechas o las horas que lo necesitas.</li>
      <li><b>Te enviamos la cotización</b> con la disponibilidad, con IGV incluido.</li>
      <li><b>Coordinamos la entrega</b> en Lima o provincias, con técnico si lo pides.</li>
    </ol>
  </section>

  {f"""<section class="faq">
    <h2>Preguntas frecuentes</h2>
    {faq}
  </section>""" if faq else ''}

  <section class="otros">
    <h2>Otros equipos en alquiler</h2>
    <div class="chips">{otros}</div>
  </section>'''
    jsonld = [{
        '@type': 'Service',
        'name': t['h1'],
        'serviceType': t['h1'],
        'description': t['descripcion'],
        'provider': {'@id': SITIO + '/#negocio'},
        'areaServed': {'@type': 'Country', 'name': 'Perú'},
        'url': SITIO + ruta,
    }]
    migas = [('Inicio', '/'), ('Catálogo', '/alquiler/'), (t['nombre'], ruta)]
    return ruta, pagina(cfg, ruta=ruta, title=t['title'], descripcion=t['descripcion'],
                        migas=migas, cuerpo=cuerpo, jsonld=jsonld,
                        imagen=fotos[0] if fotos else None)


def pagina_hub(hub, publicados, cfg, locales):
    ruta = '/%s/' % hub['slug']
    tarjetas = []
    for t, eqs in publicados:
        fotos = []
        for x in eqs:
            fotos = fotos_de(x, locales)
            if fotos:
                break
        img = ('<img src="%s" alt="%s" loading="lazy" decoding="async" width="700" height="525">'
               % (fotos[0], e(t['nombre']))) if fotos else '<div class="sinfoto">%s</div>' % ICONO
        n = len(eqs)
        tarjetas.append(f'''
    <a class="tipo" href="/alquiler/{t['slug']}/">
      <div class="foto">{img}</div>
      <div class="info"><h3>{e(t['nombre'])}</h3>
        <p>{e(t['descripcion'].split('.')[0])}.</p>
        <span class="ir">{n} {"modelo" if n == 1 else "modelos"} →</span></div>
    </a>''')
    cuerpo = f'''
  <section class="cabeza">
    <div class="eyebrow">Metrología biomédica · Lima y provincias</div>
    <h1>{e(hub['h1'])}</h1>
    <p class="lead">{e(hub['intro'])}</p>
  </section>
  <section>
    <h2>Elige el tipo de equipo</h2>
    <div class="tipos">{''.join(tarjetas)}</div>
  </section>
  <section class="pasos">
    <h2>Cómo funciona el alquiler</h2>
    <ol>
      <li><b>Eliges el equipo</b> y nos dices las fechas o las horas que lo necesitas.</li>
      <li><b>Te enviamos la cotización</b> con la disponibilidad, con IGV incluido.</li>
      <li><b>Coordinamos la entrega</b> en Lima o provincias, con técnico si lo pides.</li>
    </ol>
    <p><a class="btn fill" href="/#/catalogo/paquetes">Ver paquetes por tipo de equipo médico →</a></p>
  </section>'''
    jsonld = [{
        '@type': 'ItemList',
        'name': hub['h1'],
        'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': t['nombre'],
                             'url': SITIO + '/alquiler/%s/' % t['slug']}
                            for i, (t, _) in enumerate(publicados)],
    }]
    return ruta, pagina(cfg, ruta=ruta, title=hub['title'], descripcion=hub['descripcion'],
                        migas=[('Inicio', '/'), ('Catálogo', ruta)], cuerpo=cuerpo, jsonld=jsonld)


# ─────────────────────────── escritura ───────────────────────────

def escribir(ruta_rel, contenido, cambios):
    ruta = os.path.join(ROOT, ruta_rel)
    viejo = open(ruta, encoding='utf-8').read() if os.path.exists(ruta) else None
    if viejo == contenido:
        return False
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, 'w', encoding='utf-8') as f:
        f.write(contenido)
    cambios.append(ruta_rel)
    return True


def fechas_previas():
    """lastmod de cada URL en el sitemap actual, para no moverlo sin motivo."""
    if not os.path.exists(SITEMAP):
        return {}
    txt = open(SITEMAP, encoding='utf-8').read()
    return dict(re.findall(r'<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>', txt))


def mapa_portada(publicados, cambios):
    """window.PAGINA_TIPO = {id_equipo: '/alquiler/<tipo>/#<id>'} en index.html:
    el catálogo lo usa para que el clic en un equipo abra su página."""
    txt = open(INDEX, encoding='utf-8').read()
    ini, fin = '<!--TIPOS-URL-INICIO-->', '<!--TIPOS-URL-FIN-->'
    if ini not in txt or fin not in txt:
        print('aviso: index.html no tiene los marcadores %s … %s' % (ini, fin))
        return
    # Con un solo modelo se abre la página desde arriba (se ve el título);
    # con varios, se salta al modelo pulsado.
    mapa = {x['id']: '/alquiler/%s/%s' % (t['slug'], '#' + x['id'] if len(eqs) > 1 else '')
            for t, eqs in publicados for x in eqs}
    js = '<script>window.PAGINA_TIPO=%s;</script>' % json.dumps(mapa, ensure_ascii=False, sort_keys=True)
    nuevo = re.sub(re.escape(ini) + '.*?' + re.escape(fin),
                   lambda m: ini + js + fin, txt, flags=re.S)
    escribir('index.html', nuevo, cambios)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--datos', help='JSON del catálogo (por defecto data/catalogo.json)')
    args = ap.parse_args()

    cfg = config_sitio()
    seo = leer_json(TIPOS)
    datos = leer_json(args.datos or CATALOGO)
    # Las fotos locales (id de Drive -> archivo del sitio) viven en el
    # catálogo del repositorio; el JSON en vivo puede no traerlas.
    locales = dict(leer_json(CATALOGO).get('local') or {})
    locales.update(datos.get('local') or {})

    equipos = [x for x in datos.get('equipos', [])
               if x.get('id') and x.get('nom') and not x.get('apoyo')]
    if not equipos:
        sys.exit('No hay equipos en los datos: no se genera nada.')

    # Cada equipo a su tipo; una categoría sin tipo definido recibe uno
    # genérico para que ningún equipo quede sin página (y se avisa).
    tipos = list(seo['tipos'])
    por_cat = {c.lower(): t for t in tipos for c in t['categorias']}
    for x in equipos:
        cat = (x.get('cat') or '').strip()
        if cat.lower() not in por_cat:
            print('aviso: la categoría «%s» (%s) no está en data/seo-tipos.json; '
                  'se genera una página con texto genérico' % (cat, x['id']))
            t = {'slug': slugify(cat), 'categorias': [cat], 'nombre': cat,
                 'title': 'Alquiler de %s en Lima | Sinergia Biomédica' % cat.lower(),
                 'h1': 'Alquiler de %s' % cat.lower(),
                 'descripcion': 'Alquila %s por hora, día o semana para mantenimiento biomédico. Lima y provincias.' % cat.lower(),
                 'intro': 'Alquiler de %s para mantenimiento y verificación de equipos médicos.' % cat.lower()}
            tipos.append(t)
            por_cat[cat.lower()] = t

    publicados = []
    for t in tipos:
        eqs = [x for x in equipos if (x.get('cat') or '').strip().lower() in
               [c.lower() for c in t['categorias']]]
        if eqs:
            publicados.append((t, eqs))
    todos = [t for t, _ in publicados]

    cambios, paginas = [], []
    ruta, doc = pagina_hub(seo['hub'], publicados, cfg, locales)
    escribir('alquiler/index.html', doc, cambios)
    paginas.append((ruta, 'alquiler/index.html'))
    for t, eqs in publicados:
        ruta, doc = pagina_tipo(t, eqs, todos, cfg, locales)
        rel = 'alquiler/%s/index.html' % t['slug']
        escribir(rel, doc, cambios)
        paginas.append((ruta, rel))

    # Tipos que se quedaron sin equipos: su página se borra.
    vigentes = {t['slug'] for t in todos}
    base = os.path.join(ROOT, 'alquiler')
    for d in sorted(os.listdir(base)):
        if os.path.isdir(os.path.join(base, d)) and d not in vigentes:
            os.remove(os.path.join(base, d, 'index.html'))
            os.rmdir(os.path.join(base, d))
            cambios.append('alquiler/%s/ (borrada)' % d)

    mapa_portada(publicados, cambios)

    hoy = datetime.date.today().isoformat()
    previas = fechas_previas()
    urls = [('/', 'index.html')] + paginas
    filas = []
    for ruta, rel in urls:
        loc = SITIO + ruta
        fecha = hoy if (rel in cambios or loc not in previas) else previas[loc]
        filas.append('  <url><loc>%s</loc><lastmod>%s</lastmod></url>' % (loc, fecha))
    escribir('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n'
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
             + '\n'.join(filas) + '\n</urlset>\n', cambios)
    escribir('robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n' % SITIO, cambios)

    print('%d tipos con página, %d equipos.' % (len(publicados), len(equipos)))
    print('Cambiaron: ' + (', '.join(cambios) if cambios else 'nada'))


if __name__ == '__main__':
    main()
