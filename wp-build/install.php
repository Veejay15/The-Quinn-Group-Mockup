<?php
/**
 * The Quinn Group WordPress installer. Run on the server from ~/html:
 *   wp eval-file ~/qg-build/install.php media   imports ~/qg-build/img, prints media.json (name -> {id,url})
 *   wp eval-file ~/qg-build/install.php site    kit + options, UAE header/footer, Home page as front page
 * Idempotent: posts and attachments are found again by their _qg_key / _qg_src meta and updated in place.
 */

$base = getenv('HOME') . '/qg-build';
$mode = $args[0] ?? '';

function qg_find($meta_key, $value, $type) {
	$ids = get_posts(['post_type' => $type, 'post_status' => 'any', 'meta_key' => $meta_key, 'meta_value' => $value, 'numberposts' => 1, 'fields' => 'ids']);
	return $ids ? (int) $ids[0] : 0;
}

if ($mode === 'media') {
	require_once ABSPATH . 'wp-admin/includes/image.php';
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	$out = [];
	foreach (json_decode(file_get_contents("$base/media-manifest.json"), true) as $m) {
		$id = qg_find('_qg_src', $m['name'], 'attachment');
		if (!$id) {
			$tmp = wp_tempnam($m['file']);
			copy("$base/img/{$m['file']}", $tmp);
			$id = media_handle_sideload(['name' => $m['file'], 'tmp_name' => $tmp], 0, $m['alt']);
			if (is_wp_error($id)) {
				fwrite(STDERR, "{$m['name']}: {$id->get_error_message()}\n");
				continue;
			}
			update_post_meta($id, '_qg_src', $m['name']);
		}
		update_post_meta($id, '_wp_attachment_image_alt', $m['alt']);
		$out[$m['name']] = ['id' => $id, 'url' => wp_get_attachment_url($id)];
	}
	echo wp_json_encode($out, JSON_UNESCAPED_SLASHES);
	return;
}

if ($mode !== 'site') {
	WP_CLI::error('usage: install.php media|site');
}

// ---- Elementor kit: brand palette in the editor, no spacing defaults, no default colors/fonts
$kit_id = (int) get_option('elementor_active_kit');
$kit = get_post_meta($kit_id, '_elementor_page_settings', true) ?: [];
$kit['system_colors'] = [
	['_id' => 'primary', 'title' => 'Navy', 'color' => '#13284A'],
	['_id' => 'secondary', 'title' => 'Gold', 'color' => '#B8955A'],
	['_id' => 'text', 'title' => 'Ink', 'color' => '#0B1A30'],
	['_id' => 'accent', 'title' => 'Gold Deep', 'color' => '#8A6A33'],
];
$kit['custom_colors'] = [
	['_id' => 'qgivory', 'title' => 'Ivory', 'color' => '#F8F5EF'],
	['_id' => 'qgsand', 'title' => 'Sand', 'color' => '#EFE9DE'],
	['_id' => 'qgline', 'title' => 'Line', 'color' => '#DCD3C4'],
	['_id' => 'qgslate', 'title' => 'Slate', 'color' => '#5A6372'],
	['_id' => 'qgharbor', 'title' => 'Harbor', 'color' => '#2C4873'],
	['_id' => 'qggoldlt', 'title' => 'Gold Light', 'color' => '#D8C397'],
];
$kit['container_width'] = ['unit' => 'px', 'size' => 1240, 'sizes' => []];
$kit['container_padding'] = ['unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true];
$kit['space_between_widgets'] = ['column' => '0', 'row' => '0', 'isLinked' => true, 'unit' => 'px', 'size' => 0];
update_post_meta($kit_id, '_elementor_page_settings', $kit);
update_option('elementor_disable_color_schemes', 'yes');
update_option('elementor_disable_typography_schemes', 'yes');

update_option('blogname', 'Anne & Sean | The Quinn Group');
update_option('blogdescription', 'Florida real estate agents based in Martin County, serving St. Lucie and Palm Beach counties.');

// ---- posts carrying Elementor data
// Each write stores a hash of the data. If the data no longer matches it, someone edited the page in
// Elementor since the last deploy, and the deploy stops instead of overwriting their work (pass "force" to override).
$force = in_array('force', $args, true);
function qg_upsert($key, $type, $title, $json_file, $meta) {
	global $force;
	$id = qg_find('_qg_key', $key, $type);
	if ($id && !$force) {
		$hash = get_post_meta($id, '_qg_hash', true);
		if ($hash && $hash !== md5((string) get_post_meta($id, '_elementor_data', true))) {
			WP_CLI::error("'$key' (post $id) was edited in WordPress since the last deploy. Not overwriting; rerun with 'force' to replace it.");
		}
	}
	$post = ['post_type' => $type, 'post_title' => $title, 'post_status' => 'publish'];
	if ($id) {
		$post['ID'] = $id;
		wp_update_post($post);
	} else {
		$id = wp_insert_post($post);
		update_post_meta($id, '_qg_key', $key);
	}
	update_post_meta($id, '_elementor_data', wp_slash(file_get_contents($json_file)));
	update_post_meta($id, '_qg_hash', md5((string) get_post_meta($id, '_elementor_data', true)));
	update_post_meta($id, '_elementor_edit_mode', 'builder');
	update_post_meta($id, '_elementor_version', ELEMENTOR_VERSION);
	foreach ($meta as $k => $v) {
		update_post_meta($id, $k, $v);
	}
	return $id;
}

$everywhere = ['rule' => ['basic-global'], 'specific' => []];
$header = qg_upsert('header', 'elementor-hf', 'Site Header', "$base/elementor/header.json", [
	'_elementor_template_type' => 'wp-post', 'ehf_template_type' => 'type_header',
	'ehf_target_include_locations' => $everywhere, 'ehf_target_exclude_locations' => [], 'ehf_target_user_roles' => ['all'],
]);
$footer = qg_upsert('footer', 'elementor-hf', 'Site Footer', "$base/elementor/footer.json", [
	'_elementor_template_type' => 'wp-post', 'ehf_template_type' => 'type_footer',
	'ehf_target_include_locations' => $everywhere, 'ehf_target_exclude_locations' => [], 'ehf_target_user_roles' => ['all'],
]);
$home = qg_upsert('home', 'page', 'Home', "$base/elementor/home.json", [
	'_elementor_template_type' => 'wp-page', '_wp_page_template' => 'elementor_header_footer',
]);
wp_update_post(['ID' => $home, 'post_name' => 'home']);
update_option('show_on_front', 'page');
update_option('page_on_front', $home);

// ---- WordPress sample content
foreach ([1 => 'Hello world!', 2 => 'Sample Page', 6 => 'Elementor #6'] as $id => $title) {
	$p = get_post($id);
	if ($p && $p->post_title === $title) {
		wp_delete_post($id, true);
	}
}

\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::success("header $header, footer $footer, home $home");
