<?php
/**
 * Plugin Name:       Lupa Zoom
 * Plugin URI:        https://github.com/agenciaRSE/lupa-zoom
 * Description:       WooCommerce-style hover zoom for any image in any theme. Add the <code>lupa</code> CSS class to the image or to the block that wraps it (Elementor widget, WPBakery element, etc.).
 * Version:           1.2.0
 * Requires at least: 5.6
 * Requires PHP:      7.2
 * Author:            AGENCIA RSE
 * Author URI:        https://agenciarse.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       lupa-zoom
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'LUPA_ZOOM_VERSION', '1.2.0' );
define( 'LUPA_ZOOM_FILE', __FILE__ );
define( 'LUPA_ZOOM_URL', plugin_dir_url( __FILE__ ) );
define( 'LUPA_ZOOM_PATH', plugin_dir_path( __FILE__ ) );

final class Lupa_Zoom {

	const OPTION = 'lupa_zoom_settings';

	/** @var Lupa_Zoom|null */
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ), 20 );
		add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( LUPA_ZOOM_FILE ), array( $this, 'action_links' ) );
		add_shortcode( 'lupa_zoom', array( $this, 'shortcode' ) );
	}

	/* ---------------------------------------------------------------------
	 * Ajustes
	 * ------------------------------------------------------------------- */

	public static function defaults() {
		return array(
			'selector'     => '.lupa',
			'mode'         => 'inner',   // inner | lens
			'zoom'         => 0,         // 0 = automático (según resolución del original)
			'min_zoom'     => 1.5,
			'max_zoom'     => 6,
			'lens_size'    => 180,
			'panel_width'  => 400,
			'fade'         => 150,
			'touch'        => 0,
			'woo_gallery'  => 0,         // aplicar también a la galería de producto WooCommerce
			'woo_disable'  => 0,         // desactivar el zoom nativo de WooCommerce
		);
	}

	public static function get_settings() {
		$saved = get_option( self::OPTION, array() );
		if ( ! is_array( $saved ) ) {
			$saved = array();
		}
		return wp_parse_args( $saved, self::defaults() );
	}

	public function register_settings() {
		register_setting(
			'lupa_zoom_group',
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize' ),
				'default'           => self::defaults(),
			)
		);
	}

	public function sanitize( $input ) {
		$d   = self::defaults();
		$out = array();

		$selector           = isset( $input['selector'] ) ? trim( wp_strip_all_tags( $input['selector'] ) ) : '';
		$out['selector']    = '' !== $selector ? $selector : $d['selector'];
		$out['mode']        = ( isset( $input['mode'] ) && 'lens' === $input['mode'] ) ? 'lens' : 'inner';
		$out['zoom']        = isset( $input['zoom'] ) ? max( 0, min( 20, (float) $input['zoom'] ) ) : $d['zoom'];
		$out['min_zoom']    = isset( $input['min_zoom'] ) ? max( 1, min( 20, (float) $input['min_zoom'] ) ) : $d['min_zoom'];
		$out['max_zoom']    = isset( $input['max_zoom'] ) ? max( 1, min( 20, (float) $input['max_zoom'] ) ) : $d['max_zoom'];
		$out['lens_size']   = isset( $input['lens_size'] ) ? max( 40, min( 800, (int) $input['lens_size'] ) ) : $d['lens_size'];
		$out['panel_width'] = isset( $input['panel_width'] ) ? max( 120, min( 1200, (int) $input['panel_width'] ) ) : $d['panel_width'];
		$out['fade']        = isset( $input['fade'] ) ? max( 0, min( 2000, (int) $input['fade'] ) ) : $d['fade'];
		$out['touch']       = empty( $input['touch'] ) ? 0 : 1;
		$out['woo_gallery'] = empty( $input['woo_gallery'] ) ? 0 : 1;
		$out['woo_disable'] = empty( $input['woo_disable'] ) ? 0 : 1;

		if ( $out['max_zoom'] < $out['min_zoom'] ) {
			$out['max_zoom'] = $out['min_zoom'];
		}

		return $out;
	}

	public function action_links( $links ) {
		$url = admin_url( 'options-general.php?page=lupa-zoom' );
		array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'lupa-zoom' ) . '</a>' );
		return $links;
	}

	/* ---------------------------------------------------------------------
	 * Front-end
	 * ------------------------------------------------------------------- */

	public function enqueue_assets() {
		/**
		 * Permite desactivar la carga del plugin en plantillas concretas.
		 *
		 * @param bool $load
		 */
		if ( ! apply_filters( 'lupa_zoom_should_enqueue', true ) ) {
			return;
		}

		$s = self::get_settings();

		$selector = $s['selector'];
		if ( $s['woo_gallery'] ) {
			$selector .= ', .woocommerce-product-gallery__image img, .wp-post-image';
		}

		if ( $s['woo_disable'] ) {
			wp_dequeue_script( 'zoom' );
			wp_deregister_script( 'zoom' );
		}

		wp_enqueue_style(
			'lupa-zoom',
			LUPA_ZOOM_URL . 'assets/css/lupa-zoom.css',
			array(),
			LUPA_ZOOM_VERSION
		);

		wp_enqueue_script(
			'lupa-zoom',
			LUPA_ZOOM_URL . 'assets/js/lupa-zoom.js',
			array(),
			LUPA_ZOOM_VERSION,
			true
		);

		$config = array(
			'selector'   => $selector,
			'mode'       => $s['mode'],
			'zoom'       => (float) $s['zoom'],
			'minZoom'    => (float) $s['min_zoom'],
			'maxZoom'    => (float) $s['max_zoom'],
			'lensSize'   => (int) $s['lens_size'],
			'panelWidth' => (int) $s['panel_width'],
			'fade'       => (int) $s['fade'],
			'touch'      => (bool) $s['touch'],
		);

		/**
		 * Filtra la configuración enviada al JS.
		 *
		 * @param array $config
		 */
		$config = apply_filters( 'lupa_zoom_config', $config );

		wp_add_inline_script(
			'lupa-zoom',
			'window.LupaZoomConfig = ' . wp_json_encode( $config ) . ';',
			'before'
		);
	}

	/**
	 * [lupa_zoom src="..." large="..." alt="" zoom="2.5" mode="inner"]
	 * También acepta un ID de adjunto: [lupa_zoom id="123"]
	 */
	public function shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'id'    => '',
				'src'   => '',
				'large' => '',
				'alt'   => '',
				'zoom'  => '',
				'mode'  => '',
				'class' => '',
				'size'  => 'large',
			),
			$atts,
			'lupa_zoom'
		);

		$src   = $atts['src'];
		$large = $atts['large'];

		if ( $atts['id'] ) {
			$id  = absint( $atts['id'] );
			$img = wp_get_attachment_image_src( $id, $atts['size'] );
			$ful = wp_get_attachment_image_src( $id, 'full' );
			if ( $img ) {
				$src = $img[0];
			}
			if ( $ful ) {
				$large = $ful[0];
			}
			if ( ! $atts['alt'] ) {
				$atts['alt'] = (string) get_post_meta( $id, '_wp_attachment_image_alt', true );
			}
		}

		if ( ! $src ) {
			return '';
		}

		$attrs = array(
			'src'       => esc_url( $src ),
			'alt'       => esc_attr( $atts['alt'] ),
			'class'     => esc_attr( trim( 'lupa ' . $atts['class'] ) ),
			'loading'   => 'lazy',
			'decoding'  => 'async',
		);

		if ( $large ) {
			$attrs['data-lupa-src'] = esc_url( $large );
		}
		if ( $atts['zoom'] ) {
			$attrs['data-lupa-zoom'] = esc_attr( $atts['zoom'] );
		}
		if ( $atts['mode'] ) {
			$attrs['data-lupa-mode'] = esc_attr( $atts['mode'] );
		}

		$html = '<img';
		foreach ( $attrs as $k => $v ) {
			$html .= ' ' . $k . '="' . $v . '"';
		}
		$html .= ' />';

		return $html;
	}

	/* ---------------------------------------------------------------------
	 * Página de ajustes
	 * ------------------------------------------------------------------- */

	public function add_settings_page() {
		add_options_page(
			__( 'Lupa Zoom', 'lupa-zoom' ),
			__( 'Lupa Zoom', 'lupa-zoom' ),
			'manage_options',
			'lupa-zoom',
			array( $this, 'render_settings_page' )
		);
	}

	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$s = self::get_settings();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Lupa Zoom', 'lupa-zoom' ); ?></h1>
			<p>
				<?php
				printf(
					/* translators: %s: CSS class */
					esc_html__( 'Add the %s class to turn on hover zoom.', 'lupa-zoom' ),
					'<code>lupa</code>'
				);
				?>
			</p>
			<p class="description">
				<?php esc_html_e( 'The class can go on the image itself or on any block that wraps it: an Elementor widget, a WPBakery element, a figure, a link… It also works on elements whose image is a CSS background-image.', 'lupa-zoom' ); ?>
			</p>

			<form method="post" action="options.php">
				<?php settings_fields( 'lupa_zoom_group' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="lz-selector"><?php esc_html_e( 'CSS selector', 'lupa-zoom' ); ?></label></th>
						<td>
							<input type="text" id="lz-selector" class="regular-text code" name="<?php echo esc_attr( self::OPTION ); ?>[selector]" value="<?php echo esc_attr( $s['selector'] ); ?>" />
							<p class="description"><?php esc_html_e( 'Images it applies to. Separate several selectors with commas. Default: .lupa', 'lupa-zoom' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="lz-mode"><?php esc_html_e( 'Mode', 'lupa-zoom' ); ?></label></th>
						<td>
							<select id="lz-mode" name="<?php echo esc_attr( self::OPTION ); ?>[mode]">
								<option value="inner" <?php selected( $s['mode'], 'inner' ); ?>><?php esc_html_e( 'Inner zoom (like WooCommerce)', 'lupa-zoom' ); ?></option>
								<option value="lens" <?php selected( $s['mode'], 'lens' ); ?>><?php esc_html_e( 'Lens + side panel', 'lupa-zoom' ); ?></option>
							</select>
							<p class="description"><?php esc_html_e( 'Override it per image with data-lupa-mode="lens".', 'lupa-zoom' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="lz-zoom"><?php esc_html_e( 'Zoom level', 'lupa-zoom' ); ?></label></th>
						<td>
							<input type="number" step="0.1" min="0" max="20" id="lz-zoom" name="<?php echo esc_attr( self::OPTION ); ?>[zoom]" value="<?php echo esc_attr( $s['zoom'] ); ?>" />
							<p class="description"><?php esc_html_e( '0 = automatic (uses the real resolution of the original file). Override it per image with data-lupa-zoom="2.5".', 'lupa-zoom' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Automatic zoom limits', 'lupa-zoom' ); ?></th>
						<td>
							<label><?php esc_html_e( 'Minimum', 'lupa-zoom' ); ?>
								<input type="number" step="0.1" min="1" max="20" name="<?php echo esc_attr( self::OPTION ); ?>[min_zoom]" value="<?php echo esc_attr( $s['min_zoom'] ); ?>" />
							</label>
							&nbsp;
							<label><?php esc_html_e( 'Maximum', 'lupa-zoom' ); ?>
								<input type="number" step="0.1" min="1" max="20" name="<?php echo esc_attr( self::OPTION ); ?>[max_zoom]" value="<?php echo esc_attr( $s['max_zoom'] ); ?>" />
							</label>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="lz-lens"><?php esc_html_e( 'Lens size (px)', 'lupa-zoom' ); ?></label></th>
						<td>
							<input type="number" min="40" max="800" id="lz-lens" name="<?php echo esc_attr( self::OPTION ); ?>[lens_size]" value="<?php echo esc_attr( $s['lens_size'] ); ?>" />
							<p class="description"><?php esc_html_e( 'Only in "Lens + side panel" mode.', 'lupa-zoom' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="lz-panel"><?php esc_html_e( 'Panel width (px)', 'lupa-zoom' ); ?></label></th>
						<td>
							<input type="number" min="120" max="1200" id="lz-panel" name="<?php echo esc_attr( self::OPTION ); ?>[panel_width]" value="<?php echo esc_attr( $s['panel_width'] ); ?>" />
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="lz-fade"><?php esc_html_e( 'Fade (ms)', 'lupa-zoom' ); ?></label></th>
						<td>
							<input type="number" min="0" max="2000" id="lz-fade" name="<?php echo esc_attr( self::OPTION ); ?>[fade]" value="<?php echo esc_attr( $s['fade'] ); ?>" />
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Touch', 'lupa-zoom' ); ?></th>
						<td>
							<label>
								<input type="checkbox" value="1" name="<?php echo esc_attr( self::OPTION ); ?>[touch]" <?php checked( $s['touch'], 1 ); ?> />
								<?php esc_html_e( 'Also on phones and tablets (press and drag)', 'lupa-zoom' ); ?>
							</label>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'WooCommerce', 'lupa-zoom' ); ?></th>
						<td>
							<label>
								<input type="checkbox" value="1" name="<?php echo esc_attr( self::OPTION ); ?>[woo_gallery]" <?php checked( $s['woo_gallery'], 1 ); ?> />
								<?php esc_html_e( 'Also apply to the product gallery images', 'lupa-zoom' ); ?>
							</label><br />
							<label>
								<input type="checkbox" value="1" name="<?php echo esc_attr( self::OPTION ); ?>[woo_disable]" <?php checked( $s['woo_disable'], 1 ); ?> />
								<?php esc_html_e( 'Turn off the WooCommerce zoom (avoids a double zoom)', 'lupa-zoom' ); ?>
							</label>
						</td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>

			<hr />
			<h2><?php esc_html_e( 'Usage', 'lupa-zoom' ); ?></h2>
			<p><strong><?php esc_html_e( 'HTML / editor:', 'lupa-zoom' ); ?></strong></p>
			<pre style="background:#fff;padding:12px;border:1px solid #dcdcde;overflow:auto;">&lt;img src="photo-800.jpg" data-lupa-src="photo-2000.jpg" class="lupa" alt="" /&gt;</pre>
			<p><strong><?php esc_html_e( 'Page builder (class on the widget):', 'lupa-zoom' ); ?></strong></p>
			<pre style="background:#fff;padding:12px;border:1px solid #dcdcde;overflow:auto;">&lt;div class="elementor-widget-image lupa"&gt;
    &lt;div class="elementor-widget-container"&gt;&lt;img src="photo.jpg" /&gt;&lt;/div&gt;
&lt;/div&gt;</pre>
			<p class="description"><?php esc_html_e( 'Elementor: Advanced tab → CSS Classes → lupa. WPBakery: Extra class name → lupa.', 'lupa-zoom' ); ?></p>
			<p><strong><?php esc_html_e( 'Shortcode:', 'lupa-zoom' ); ?></strong></p>
			<pre style="background:#fff;padding:12px;border:1px solid #dcdcde;overflow:auto;">[lupa_zoom id="123"]
[lupa_zoom src="/wp-content/uploads/photo.jpg" large="/wp-content/uploads/photo-full.jpg" zoom="3"]</pre>
			<p><strong><?php esc_html_e( 'Per-image attributes:', 'lupa-zoom' ); ?></strong></p>
			<ul style="list-style:disc;padding-left:20px;">
				<li><code>data-lupa-src</code> — <?php esc_html_e( 'URL of the high-resolution image (otherwise the srcset or src is used).', 'lupa-zoom' ); ?></li>
				<li><code>data-lupa-zoom</code> — <?php esc_html_e( 'A fixed zoom level, e.g. 2.5', 'lupa-zoom' ); ?></li>
				<li><code>data-lupa-mode</code> — <code>inner</code> | <code>lens</code></li>
				<li><code>data-lupa-lens</code> — <?php esc_html_e( 'Lens size in px (lens mode).', 'lupa-zoom' ); ?></li>
			</ul>
		</div>
		<?php
	}
}

Lupa_Zoom::instance();
