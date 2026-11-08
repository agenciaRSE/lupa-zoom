"""
Builds the es_ES .po to import into translate.wordpress.org (project lupa-zoom, "Stable" code strings).

    python wporg-i18n/build_po.py

Every msgid must match the English source exactly; the script aborts if lupa-zoom.php
has a translatable string with no translation here.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

T = {
    'Lupa Zoom': 'Lupa Zoom',
    'WooCommerce-style hover zoom for any image in any theme. Add the <code>lupa</code> CSS class to the image or to the block that wraps it (Elementor widget, WPBakery element, etc.).':
        'Efecto lupa (zoom al pasar el ratón) tipo WooCommerce para cualquier imagen de cualquier tema. Basta con añadir la clase CSS <code>lupa</code> a la imagen o al contenedor que la envuelve (widget de Elementor, elemento de WPBakery, etc.).',
    'AGENCIA RSE': 'AGENCIA RSE',
    'https://agenciarse.com/': 'https://agenciarse.com/',
    'https://github.com/agenciaRSE/lupa-zoom': 'https://github.com/agenciaRSE/lupa-zoom',
    'Settings': 'Ajustes',
    'Add the %s class to turn on hover zoom.': 'Añade la clase %s para activar el zoom al pasar el ratón.',
    'The class can go on the image itself or on any block that wraps it: an Elementor widget, a WPBakery element, a figure, a link… It also works on elements whose image is a CSS background-image.':
        'La clase puede ir en la propia imagen o en cualquier contenedor: un widget de Elementor, un elemento de WPBakery, un figure, un enlace… También funciona en elementos cuya imagen es un background-image de CSS.',
    'CSS selector': 'Selector CSS',
    'Images it applies to. Separate several selectors with commas. Default: .lupa':
        'Imágenes a las que se aplica. Se admiten varios selectores separados por comas. Por defecto: .lupa',
    'Mode': 'Modo',
    'Inner zoom (like WooCommerce)': 'Zoom interno (como WooCommerce)',
    'Lens + side panel': 'Lupa + panel lateral',
    'Override it per image with data-lupa-mode="lens".': 'Se puede sobrescribir por imagen con data-lupa-mode="lens".',
    'Zoom level': 'Nivel de zoom',
    '0 = automatic (uses the real resolution of the original file). Override it per image with data-lupa-zoom="2.5".':
        '0 = automático (usa la resolución real del archivo original). Se puede sobrescribir con data-lupa-zoom="2.5".',
    'Automatic zoom limits': 'Límites del zoom automático',
    'Minimum': 'Mínimo',
    'Maximum': 'Máximo',
    'Lens size (px)': 'Tamaño de la lupa (px)',
    'Only in "Lens + side panel" mode.': 'Solo en modo «Lupa + panel lateral».',
    'Panel width (px)': 'Ancho del panel (px)',
    'Fade (ms)': 'Transición (ms)',
    'Touch': 'Táctil',
    'Also on phones and tablets (press and drag)': 'Activar también en móvil y tablet (mantener el dedo y arrastrar)',
    'WooCommerce': 'WooCommerce',
    'Also apply to the product gallery images': 'Aplicar también a las imágenes de la galería de producto',
    'Turn off the WooCommerce zoom (avoids a double zoom)': 'Desactivar el zoom nativo de WooCommerce (evita duplicados)',
    'Usage': 'Uso',
    'HTML / editor:': 'HTML / editor:',
    'Page builder (class on the widget):': 'Constructor visual (clase en el widget):',
    'Elementor: Advanced tab → CSS Classes → lupa. WPBakery: Extra class name → lupa.':
        'En Elementor: pestaña Avanzado → Clases CSS → lupa. En WPBakery: Extra class name → lupa.',
    'Shortcode:': 'Shortcode:',
    'Per-image attributes:': 'Atributos por imagen:',
    'URL of the high-resolution image (otherwise the srcset or src is used).':
        'URL de la imagen en alta resolución (si no, se usa el srcset o el src).',
    'A fixed zoom level, e.g. 2.5': 'Nivel de zoom concreto, p. ej. 2.5',
    'Lens size in px (lens mode).': 'Tamaño de la lupa en px (modo lens).',
}

src = (ROOT / 'lupa-zoom.php').read_text(encoding='utf-8')
found = {m.replace("\\'", "'") for m in re.findall(
    r"(?:esc_html_e|esc_html__|esc_attr_e|esc_attr__|_e|__)\(\s*'((?:[^'\\]|\\.)*)'", src)}
missing = found - set(T)
if missing:
    raise SystemExit('Missing translations: %r' % sorted(missing))


def q(text):
    return '"' + text.replace('\\', '\\\\').replace('"', '\\"') + '"'


lines = [
    'msgid ""', 'msgstr ""',
    '"Project-Id-Version: Lupa Zoom\\n"',
    '"Language: es_ES\\n"',
    '"MIME-Version: 1.0\\n"',
    '"Content-Type: text/plain; charset=UTF-8\\n"',
    '"Content-Transfer-Encoding: 8bit\\n"',
    '"Plural-Forms: nplurals=2; plural=n != 1;\\n"',
    '',
]
for msgid, msgstr in T.items():
    lines += ['msgid ' + q(msgid), 'msgstr ' + q(msgstr), '']

out = Path(__file__).resolve().parent / 'lupa-zoom-es_ES-code.po'
out.write_text('\n'.join(lines), encoding='utf-8', newline='\n')
print('%d strings in the code, all translated -> %s' % (len(found), out.name))
