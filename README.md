<div align="center">

# 🔍 Lupa Zoom

**El zoom de producto de WooCommerce, en cualquier imagen de cualquier tema de WordPress.**
Añade la clase `lupa` y, al pasar el ratón, la imagen se amplía siguiendo el cursor. Sin jQuery, sin librerías, unos 9 KB.

[![WordPress 5.6+](https://img.shields.io/badge/WordPress-5.6%2B-21759B?style=for-the-badge&logo=wordpress&logoColor=white)](readme.txt)
[![PHP 7.2+](https://img.shields.io/badge/PHP-7.2%2B-777BB4?style=for-the-badge&logo=php&logoColor=white)](lupa-zoom.php)
[![Versión 1.1.0](https://img.shields.io/badge/versión-1.1.0-0a0a0a?style=for-the-badge)](readme.txt)
[![Licencia GPLv2+](https://img.shields.io/badge/licencia-GPLv2%2B-a855f7?style=for-the-badge)](LICENSE)

[Demo](#-pruébalo-en-local) · [Uso](#-uso) · [English](#-in-english) · [Contribuir](#-contribuir)

</div>

---

## ¿Por qué?

El zoom de las fichas de WooCommerce es justo lo que quieres en un catálogo, un portfolio o una galería… pero solo existe en la ficha de producto y depende del tema. **Lupa Zoom** lleva ese mismo comportamiento a cualquier imagen de la web, con una clase CSS.

## ✨ Qué hace

- 🎯 **Una clase y listo:** vale en la propia `<img>` **o en cualquier contenedor** (widget de Elementor, elemento de WPBakery, `figure`, enlace…).
- 🖼️ **También con `background-image`** de CSS.
- 📐 **Respeta `object-fit` y `object-position`:** amplía justo el recorte que se ve, también en las cajas con proporción fija de los constructores.
- 🔎 **Dos modos:** zoom interno (por defecto) o lupa con panel lateral.
- 🧮 **Zoom automático** según la resolución real del archivo original.
- 💤 **Compatible con lazy-load:** espera a que se cargue la imagen buena.
- 🔄 **Contenido dinámico:** funciona con AJAX, sliders y Elementor (`MutationObserver`).
- 📱 **Táctil opcional:** mantener el dedo y arrastrar.
- ⚙️ **Ajustes** en *Ajustes → Lupa Zoom*.
- 🪶 **Ligero:** JavaScript propio, sin jQuery ni dependencias.

## 📦 Instalación

1. Descarga el repositorio: **Code → Download ZIP**.
2. Descomprime y renombra la carpeta a `lupa-zoom`.
3. Súbela a `wp-content/plugins/` (o sube el ZIP desde *Plugins → Añadir nuevo → Subir plugin*).
4. Actívalo y revisa las opciones en *Ajustes → Lupa Zoom*.

## 🛠️ Uso

**HTML:**

```html
<img src="foto-800.jpg" data-lupa-src="foto-2000.jpg" class="lupa" alt="Descripción de la foto">
```

**Constructores visuales:** la clase va en el widget y la imagen queda dentro.

- Elementor: *Avanzado → Clases CSS →* `lupa`
- WPBakery: *Extra class name →* `lupa`

**Shortcode:**

```text
[lupa id="123"]
[lupa src="foto.jpg" large="foto-full.jpg" zoom="3" mode="lens"]
```

**Atributos por imagen:** `data-lupa-src`, `data-lupa-zoom`, `data-lupa-mode`, `data-lupa-lens`.

### Para desarrolladores

```js
LupaZoom.refresh();      // vuelve a buscar imágenes nuevas
LupaZoom.destroyAll();   // quita todos los zooms
document.dispatchEvent(new CustomEvent('lupa:refresh'));
```

Filtros PHP: `lupa_zoom_should_enqueue` (cargar o no los assets en una página) y `lupa_zoom_config` (cambiar la configuración que llega al JS).

## 🧪 Pruébalo en local

Abre [`demo.html`](demo.html) en el navegador: no necesita WordPress.

## 🤝 Contribuir

¿Lo usas en tu web? **Nos encantaría que ayudes a mejorarlo:**

- 🧱 **Constructores y temas:** si en Bricks, Breakdance, Divi u otro constructor el zoom se descuadra, abre un issue con el HTML del contenedor.
- ♿ **Accesibilidad:** el zoom con teclado es un buen reto para una primera contribución.
- 🌍 **Traducciones:** el plugin usa el text domain `lupa-zoom`.
- 🐛 **Errores:** abre un [issue](https://github.com/agenciaRSE/lupa-zoom/issues) con la versión de WordPress, el tema y una URL o captura.

Los pull requests son bienvenidos: pequeños, con una explicación del porqué y siguiendo los estándares de código de WordPress.

## 🇬🇧 In English

**Lupa Zoom** brings WooCommerce-style hover zoom to any image in any WordPress theme. Add the `lupa` class to an image or to the block that wraps it (Elementor, WPBakery, figures, links…) and the image zooms in under the cursor. It works with CSS background images, respects `object-fit`, supports lazy-load and dynamic content, offers an inner-zoom or lens-plus-panel mode, and ships with no jQuery or dependencies (~9 KB). Shortcode: `[lupa id="123"]`. Contributions are welcome: open an issue or a pull request.

## 📄 Licencia

[GPLv2 o posterior](LICENSE) © Diego Meijide · Hecho por [AGENCIA RSE](https://agenciarse.com/estudio/), estudio de diseño y desarrollo WordPress de A Coruña.
