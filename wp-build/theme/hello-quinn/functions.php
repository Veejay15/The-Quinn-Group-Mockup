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
	wp_add_inline_script('qg', 'window.qgLead=' . wp_json_encode(['ajax' => admin_url('admin-ajax.php')]) . ';', 'before');
}, 20);

/*
 * Lead forms (home value, contact) -> GoHighLevel inbound webhook.
 * The webhook URL lives in the qg_ghl_webhook option (wp option update qg_ghl_webhook <url>), so it never appears
 * in page source and can change without a code edit. If delivery fails, the lead is emailed to qg_lead_email.
 */
function qg_lead_payload(string $form, array $f): array {
	$name  = trim((string) ($f['name'] ?? ''));
	$parts = preg_split('/\s+/', $name, 2);
	return [
		'form'             => $form,
		'form_label'       => $form === 'home_value' ? 'Home value request' : 'Contact form',
		'name'             => $name,
		'first_name'       => $parts[0] ?? '',
		'last_name'        => $parts[1] ?? '',
		'email'            => (string) ($f['email'] ?? ''),
		'phone'            => (string) ($f['phone'] ?? ''),
		'property_address' => (string) ($f['property_address'] ?? ''),
		'interest'         => (string) ($f['interest'] ?? ''),
		'message'          => (string) ($f['message'] ?? ''),
		'page_url'         => (string) ($f['page_url'] ?? ''),
		'utm_source'       => (string) ($f['utm_source'] ?? ''),
		'utm_medium'       => (string) ($f['utm_medium'] ?? ''),
		'utm_campaign'     => (string) ($f['utm_campaign'] ?? ''),
		'submitted_at'     => gmdate('c'),
		'site'             => home_url('/'),
	];
}

function qg_send_lead(array $payload): bool {
	$url = (string) get_option('qg_ghl_webhook', '');
	$ok  = false;
	if ($url !== '') {
		$res = wp_remote_post($url, [
			'timeout' => 12,
			'headers' => ['Content-Type' => 'application/json'],
			'body'    => wp_json_encode($payload),
		]);
		$ok = !is_wp_error($res) && wp_remote_retrieve_response_code($res) >= 200 && wp_remote_retrieve_response_code($res) < 300;
	}
	if (!$ok) {
		$lines = [];
		foreach ($payload as $k => $v) {
			$lines[] = "$k: $v";
		}
		wp_mail(
			(string) get_option('qg_lead_email', 'thequinngroup@myfloridainsider.com'),
			'Website lead (' . $payload['form_label'] . ') - not delivered to GoHighLevel',
			"This lead could not be sent to GoHighLevel, so it is emailed instead.\n\n" . implode("\n", $lines)
		);
	}
	return $ok;
}

function qg_handle_lead() {
	// Honeypot: real visitors never see or fill the "website" field.
	if (!empty($_POST['website'])) {
		wp_send_json_success();
	}
	$form = sanitize_key(wp_unslash($_POST['form'] ?? ''));
	if (!in_array($form, ['home_value', 'contact'], true)) {
		wp_send_json_error(['message' => 'Unknown form.'], 400);
	}
	$f = [];
	foreach (['name', 'phone', 'property_address', 'interest', 'page_url', 'utm_source', 'utm_medium', 'utm_campaign'] as $key) {
		$f[$key] = sanitize_text_field(wp_unslash($_POST[$key] ?? ''));
	}
	$f['email']   = sanitize_email(wp_unslash($_POST['email'] ?? ''));
	$f['message'] = sanitize_textarea_field(wp_unslash($_POST['message'] ?? ''));
	if ($f['name'] === '' || !is_email($f['email'])) {
		wp_send_json_error(['message' => 'Please add your name and a valid email.'], 422);
	}
	qg_send_lead(qg_lead_payload($form, $f));
	wp_send_json_success();
}
add_action('wp_ajax_qg_lead', 'qg_handle_lead');
add_action('wp_ajax_nopriv_qg_lead', 'qg_handle_lead');

add_action('wp_head', function () {
	$fonts = get_stylesheet_directory_uri() . '/assets/fonts/';
	echo "<script>document.documentElement.classList.add('js');</script>\n";
	foreach (['f3.woff2', 'f5.woff2'] as $file) {
		printf('<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url($fonts . $file));
	}
}, 1);

/*
 * Permanent redirects from Luxury Presence URLs that moved on the new site. Only used when the URL
 * would otherwise 404, and before WordPress's own "closest slug" guess (priority 1).
 */
add_action('template_redirect', function () {
	if (!is_404()) {
		return;
	}
	$moved = [
		'/team' => '/about/',
	];
	$path = strtolower(untrailingslashit((string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH)));
	if (isset($moved[$path])) {
		wp_safe_redirect(home_url($moved[$path]), 301, 'The Quinn Group');
		exit;
	}
}, 1);

add_filter('body_class', function ($classes) {
	$classes[] = 'qg';
	return $classes;
});
