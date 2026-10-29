<?php
/**
 * Imports the Luxury Presence market guides (blog.json from extract-blog.mjs) as WordPress posts.
 *   wp eval-file ~/qg-build/migrate/import-blog.php [force]
 *
 * - Same URLs: posts keep their Luxury Presence slugs under the /blog/%postname%/ permalink.
 * - Images are downloaded from the Luxury Presence CDN once (deduped by _qg_lp_media) and re-hosted here.
 * - SEO title and meta description go to Yoast exactly as they are on the live site today.
 * - Re-runnable for a final sync before launch. A post edited in WordPress since its import is left alone
 *   (pass "force" to overwrite it).
 */

require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';

$base  = getenv('HOME') . '/qg-build/migrate';
$force = in_array('force', $args, true);
$posts = json_decode(file_get_contents("$base/blog.json"), true);

// ---- site structure: /blog/ URLs, a "Market Guides" category, a posts page, and an "Anne & Sean" author
if (get_option('permalink_structure') !== '/blog/%postname%/') {
	update_option('permalink_structure', '/blog/%postname%/');
}
$cat = get_term_by('slug', 'market-guides', 'category') ?: get_term_by('slug', 'uncategorized', 'category');
wp_update_term($cat->term_id, 'category', ['name' => 'Market Guides', 'slug' => 'market-guides']);
update_option('default_category', $cat->term_id);

$blog_page = (int) get_option('page_for_posts');
if (!$blog_page) {
	$blog_page = wp_insert_post(['post_type' => 'page', 'post_title' => 'Market Guides', 'post_name' => 'blog', 'post_status' => 'publish']);
	update_option('page_for_posts', $blog_page);
	update_post_meta($blog_page, '_yoast_wpseo_title', 'Treasure Coast Real Estate Market Guides | The Quinn Group');
	update_post_meta($blog_page, '_yoast_wpseo_metadesc', "Local guides from Anne & Sean, The Quinn Group, on what changes what a home really costs in Stuart, Sewall's Point, Jensen Beach, Palm City and across the Treasure Coast.");
}

$author = get_user_by('login', 'anne-sean');
if (!$author) {
	$uid = wp_insert_user([
		'user_login'   => 'anne-sean',
		'user_pass'    => wp_generate_password(32),
		'user_email'   => 'thequinngroup@myfloridainsider.com',
		'display_name' => 'Anne & Sean',
		'nickname'     => 'Anne & Sean',
		'first_name'   => 'Anne & Sean',
		'role'         => 'author',
	]);
	$author = get_user_by('id', $uid);
}

update_option('default_comment_status', 'closed');
update_option('default_ping_status', 'closed');

// Yoast: future posts get "Title | The Quinn Group"; imported posts keep their current titles below.
$titles = get_option('wpseo_titles');
$titles['title-post'] = '%%title%% %%sep%% The Quinn Group';
update_option('wpseo_titles', $titles);

function qg_lp_media($id, $alt, $name) {
	$found = get_posts(['post_type' => 'attachment', 'post_status' => 'inherit', 'meta_key' => '_qg_lp_media', 'meta_value' => $id, 'numberposts' => 1, 'fields' => 'ids']);
	if ($found) {
		return (int) $found[0];
	}
	$url = "https://media-production.lp-cdn.com/cdn-cgi/image/format=jpeg,quality=82,fit=scale-down,width=1600/https://media-production.lp-cdn.com/media/$id";
	$tmp = download_url($url, 60);
	if (is_wp_error($tmp)) {
		WP_CLI::warning("image $id: " . $tmp->get_error_message());
		return 0;
	}
	$att = media_handle_sideload(['name' => sanitize_file_name($name) . '.jpg', 'tmp_name' => $tmp], 0, $alt);
	if (is_wp_error($att)) {
		WP_CLI::warning("image $id: " . $att->get_error_message());
		return 0;
	}
	update_post_meta($att, '_qg_lp_media', $id);
	update_post_meta($att, '_wp_attachment_image_alt', $alt);
	return (int) $att;
}

$stats = ['created' => 0, 'updated' => 0, 'unchanged' => 0, 'kept_edits' => 0, 'skipped' => 0];
foreach ($posts as $p) {
	if ($p['skip']) {
		$stats['skipped']++;
		continue;
	}
	$existing = get_posts(['post_type' => 'post', 'post_status' => 'any', 'meta_key' => '_qg_lp_slug', 'meta_value' => $p['slug'], 'numberposts' => 1, 'fields' => 'ids']);
	$id       = $existing ? (int) $existing[0] : 0;
	$src_hash = md5(wp_json_encode($p));

	if ($id && !$force) {
		if (get_post_meta($id, '_qg_lp_src', true) === $src_hash) {
			$stats['unchanged']++;
			continue;
		}
		if (get_post_meta($id, '_qg_content_hash', true) !== md5(get_post_field('post_content', $id))) {
			WP_CLI::warning("{$p['slug']}: edited in WordPress since import, not overwritten");
			$stats['kept_edits']++;
			continue;
		}
	}

	// Images: featured + in-article, re-hosted with SEO filenames from the post slug.
	$html = $p['html'];
	foreach ($p['images'] as $i => $img) {
		$att = qg_lp_media($img['id'], $img['alt'], $p['slug'] . '-' . ($i + 2));
		if ($att) {
			$html = str_replace('src="lp-media:' . $img['id'] . '"', 'class="wp-image-' . $att . '" src="' . esc_url(wp_get_attachment_url($att)) . '"', $html);
		}
	}
	$thumb = $p['featured'] ? qg_lp_media($p['featured']['id'], $p['featured']['alt'], $p['slug']) : 0;

	$date = $p['lastmod'] ? $p['lastmod'] . ' 12:00:00' : current_time('mysql');
	$data = [
		'post_type'     => 'post',
		'post_status'   => 'publish',
		'post_title'    => $p['h1'],
		'post_name'     => $p['slug'],
		'post_content'  => $html,
		'post_excerpt'  => $p['description'],
		'post_author'   => $author->ID,
		'post_date'     => $date,
		'post_modified' => $date,
		'post_category' => [$cat->term_id],
		'comment_status' => 'closed',
		'ping_status'   => 'closed',
	];
	if ($id) {
		$data['ID'] = $id;
		wp_update_post(wp_slash($data));
		$stats['updated']++;
	} else {
		$id = wp_insert_post(wp_slash($data));
		update_post_meta($id, '_qg_lp_slug', $p['slug']);
		$stats['created']++;
	}
	if ($thumb) {
		set_post_thumbnail($id, $thumb);
	}
	update_post_meta($id, '_yoast_wpseo_title', $p['seo_title']);
	update_post_meta($id, '_yoast_wpseo_metadesc', $p['description']);
	update_post_meta($id, '_qg_lp_src', $src_hash);
	update_post_meta($id, '_qg_content_hash', md5(get_post_field('post_content', $id)));
}

// WordPress resets post_modified on save; restore the Luxury Presence dates in one pass.
global $wpdb;
foreach ($posts as $p) {
	if ($p['skip'] || !$p['lastmod']) {
		continue;
	}
	$wpdb->query($wpdb->prepare(
		"UPDATE {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id = p.ID AND m.meta_key = '_qg_lp_slug' AND m.meta_value = %s
		 SET p.post_modified = %s, p.post_modified_gmt = %s",
		$p['slug'], $p['lastmod'] . ' 12:00:00', get_gmt_from_date($p['lastmod'] . ' 12:00:00')
	));
}
clean_post_cache(0);
flush_rewrite_rules(false);

WP_CLI::success(sprintf('created %d, updated %d, unchanged %d, kept local edits %d, skipped %d', $stats['created'], $stats['updated'], $stats['unchanged'], $stats['kept_edits'], $stats['skipped']));
