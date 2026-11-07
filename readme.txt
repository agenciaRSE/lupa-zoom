=== Lupa Zoom ===
Contributors: dmeijide
Tags: zoom, lupa, imagen, woocommerce, magnifier
Requires at least: 5.6
Tested up to: 6.8
Requires PHP: 7.2
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Efecto lupa tipo WooCommerce (zoom al pasar el ratón) para cualquier imagen de cualquier tema de WordPress.

== Description ==

Añade la clase `lupa` y al pasar el ratón se amplía la zona bajo el cursor,
siguiéndolo por toda la imagen — el mismo comportamiento que el zoom de producto
de WooCommerce, pero sin depender ni de WooCommerce ni del tema.

* La clase vale en la propia `<img>` **o en cualquier contenedor**: widget de
  Elementor, elemento de WPBakery, figure, enlace…
* También funciona en elementos cuya imagen es un `background-image` de CSS.
* Respeta `object-fit: cover/contain` y las cajas con proporción fija que
  generan los constructores: amplía justo el recorte que se está viendo.
* Sin jQuery ni librerías externas (~9 KB).
* Dos modos: zoom interno (por defecto) o lupa + panel lateral.
* Nivel de zoom automático según la resolución real del archivo original.
* Compatible con lazy-load (espera a que se sustituya el placeholder).
* Funciona con contenido cargado por AJAX, sliders y Elementor (MutationObserver).
* Opcional en táctil: mantener el dedo y arrastrar.
* Página de ajustes en Ajustes → Lupa Zoom.

== Uso ==

HTML:

    <img src="foto-800.jpg" data-lupa-src="foto-2000.jpg" class="lupa" alt="" />

Constructor visual — la clase va en el widget, la imagen queda dentro:

    <div class="elementor-widget-image lupa">
        <div class="elementor-widget-container"><img src="foto.jpg" /></div>
    </div>

En Elementor: Avanzado → Clases CSS → `lupa`.
En WPBakery: Extra class name → `lupa`.

Shortcode:

    [lupa id="123"]
    [lupa src="foto.jpg" large="foto-full.jpg" zoom="3" mode="lens"]

Atributos por imagen: `data-lupa-src`, `data-lupa-zoom`, `data-lupa-mode`,
`data-lupa-lens`.

API JS: `LupaZoom.refresh()`, `LupaZoom.destroyAll()`, evento
`document.dispatchEvent(new CustomEvent('lupa:refresh'))`.

Filtros PHP: `lupa_zoom_should_enqueue`, `lupa_zoom_config`.

== Changelog ==

= 1.1.0 =
* La clase se puede aplicar al contenedor del widget, no solo a la `<img>`.
* Soporte para elementos con `background-image` de CSS.
* La geometría se mide sobre la imagen real, no sobre el wrapper: el zoom ya no
  se descuadra cuando el contenedor es mayor que la imagen.
* Se respetan `object-fit` y `object-position` (recortes tipo cover).
* Compatibilidad con lazy-load y con `data-large_image` de WooCommerce.
* Se reutiliza el contenedor existente en vez de inyectar un wrapper cuando es
  posible, para no romper los estilos del constructor.

= 1.0.0 =
* Versión inicial.
