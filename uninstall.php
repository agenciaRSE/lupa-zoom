<?php
/**
 * Removes the plugin settings when the plugin is deleted from the Plugins screen.
 *
 * @package Lupa_Zoom
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'lupa_zoom_settings' );
