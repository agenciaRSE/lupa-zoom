=== Lupa Zoom ===
Contributors: dmeijide
Tags: image zoom, magnifier, hover zoom, woocommerce, elementor
Requires at least: 5.6
Tested up to: 7.1
Requires PHP: 7.2
Stable tag: 1.2.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WooCommerce-style hover zoom for any image in any theme. Add the lupa class and the image zooms in under the cursor.

== Description ==

Add the `lupa` CSS class and, on hover, the image zooms in on the area under the
cursor and follows it across the image. It is the same behaviour as the
WooCommerce product zoom, without depending on WooCommerce or on the theme.

* The class works on the `<img>` itself **or on any block that wraps it**: an
  Elementor widget, a WPBakery element, a figure, a link…
* It also works on elements whose image is a CSS `background-image`.
* It respects `object-fit: cover/contain` and the fixed-ratio boxes that page
  builders create: it zooms into exactly the crop you see.
* No jQuery and no external libraries (about 7 KB gzipped).
* Two modes: inner zoom (default) or lens with a side panel.
* Automatic zoom level based on the real resolution of the original file.
* Works with lazy loading (it waits for the placeholder to be replaced).
* Works with content loaded by AJAX, sliders and Elementor (MutationObserver).
* Optional on touch screens: press and drag.
* Settings in *Settings > Lupa Zoom*.

"Lupa" is Spanish for magnifying glass.

= Usage =

HTML:

    <img src="photo-800.jpg" data-lupa-src="photo-2000.jpg" class="lupa" alt="" />

Page builders: put the class on the widget and the image stays inside it.

* Elementor: *Advanced > CSS Classes >* `lupa`
* WPBakery: *Extra class name >* `lupa`

Shortcode:

    [lupa_zoom id="123"]
    [lupa_zoom src="photo.jpg" large="photo-full.jpg" zoom="3" mode="lens"]

Per-image attributes: `data-lupa-src`, `data-lupa-zoom`, `data-lupa-mode`,
`data-lupa-lens`.

JavaScript API: `LupaZoom.refresh()`, `LupaZoom.destroyAll()` and the
`lupa:refresh` event (`document.dispatchEvent(new CustomEvent('lupa:refresh'))`).

PHP filters: `lupa_zoom_should_enqueue`, `lupa_zoom_config`.

The plugin makes no external requests and stores no visitor data.

== Installation ==

1. Install the plugin from *Plugins > Add New*, or upload the `lupa-zoom` folder to `/wp-content/plugins/`.
2. Activate it.
3. Add the `lupa` class to an image or to the block that wraps it.
4. Optional: adjust the mode and zoom level in *Settings > Lupa Zoom*.

== Frequently Asked Questions ==

= Does it need WooCommerce? =

No. It works on any image. With WooCommerce you can also apply it to the product
gallery and turn off the built-in zoom to avoid a double zoom.

= Which image does it zoom into? =

The one in `data-lupa-src` if present. Otherwise it picks the largest image in the
`srcset`, and if there is none, the `src`.

= How do I load it only on some pages? =

Return `false` from the `lupa_zoom_should_enqueue` filter on the pages where you
don't need it.

== Changelog ==

= 1.2.0 =
* Settings screen in English, with every string translatable.
* The shortcode is now `[lupa_zoom]`, prefixed to avoid clashes with other plugins.
* Settings are removed when the plugin is deleted.

= 1.1.0 =
* The class can go on the widget's wrapper, not only on the `<img>`.
* Support for elements with a CSS `background-image`.
* Geometry is measured on the real image, not on the wrapper.
* `object-fit` and `object-position` are respected.
* Works with lazy loading and with WooCommerce `data-large_image`.

= 1.0.0 =
* Initial release.
