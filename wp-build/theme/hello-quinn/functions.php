<?php
/**
 * Hello Quinn: child theme for The Quinn Group (Anne & Sean).
 *
 * Loads the brand stylesheet, self-hosted fonts and the small front-end script used by the
 * Elementor build. Hello's own reset/theme CSS is switched off because quinn.css carries its
 * own reset, and Elementor's Google Fonts are off because the fonts are self-hosted.
 */

if (!defined('ABSPATH')) {
	exit;
}

add_filter('hello_elementor_enqueue_style', '__return_false');
add_filter('hello_elementor_enqueue_theme_style', '__return_false');
add_filter('elementor/frontend/print_google_fonts', '__return_false');
// Yoast SEO writes the meta description; Hello's own tag would duplicate it.
add_filter('hello_elementor_description_meta_tag', '__return_false');

add_action('wp_enqueue_scripts', function () {
	$dir  = get_stylesheet_directory_uri() . '/assets';
	$path = get_stylesheet_directory() . '/assets';
	// File modification times as versions, so browsers pick up edits without a manual bump.
	wp_enqueue_style('qg-fonts', $dir . '/fonts/local.css', [], (string) filemtime($path . '/fonts/local.css'));
	wp_enqueue_style('qg', $dir . '/quinn.css', ['qg-fonts'], (string) filemtime($path . '/quinn.css'));
	wp_enqueue_script('qg', $dir . '/quinn.js', [], (string) filemtime($path . '/quinn.js'), true);
}, 20);

add_action('wp_head', function () {
	$fonts = get_stylesheet_directory_uri() . '/assets/fonts/';
	echo "<script>document.documentElement.classList.add('js');</script>\n";
	foreach (['f3.woff2', 'f5.woff2'] as $file) {
		printf('<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url($fonts . $file));
	}
}, 1);

add_filter('body_class', function ($classes) {
	$classes[] = 'qg';
	return $classes;
});
