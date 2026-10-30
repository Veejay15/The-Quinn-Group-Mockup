<?php
/**
 * Yoast SEO setup for The Quinn Group. Run on the server from ~/html:
 *   wp eval-file ~/qg-build/yoast.php
 * Idempotent. Values come from the approved mockup, brand guidelines and the website audit.
 */

if (!defined('WPSEO_VERSION')) {
	WP_CLI::error('Yoast SEO is not active.');
}

$logo_id = (int) get_posts(['post_type' => 'attachment', 'post_status' => 'inherit', 'meta_key' => '_qg_src', 'meta_value' => 'logo-dark', 'numberposts' => 1, 'fields' => 'ids'])[0];
$hero_id = (int) get_posts(['post_type' => 'attachment', 'post_status' => 'inherit', 'meta_key' => '_qg_src', 'meta_value' => 'hero', 'numberposts' => 1, 'fields' => 'ids'])[0];

// Site representation: an organization (Yoast free has no RealEstateAgent type; that schema comes later).
$titles = get_option('wpseo_titles');
$titles['separator']             = 'sc-pipe';
$titles['company_or_person']     = 'company';
$titles['company_name']          = 'The Quinn Group';
$titles['company_alternate_name'] = 'Anne & Sean';
$titles['company_logo']          = wp_get_attachment_url($logo_id);
$titles['company_logo_id']       = $logo_id;
$titles['website_name']          = 'Anne & Sean | The Quinn Group';
$titles['alternate_website_name'] = 'The Quinn Group';
// Archives with no value for this site (the audit flagged author archives exposing login names).
$titles['disable-author']        = true;
$titles['disable-date']          = true;
$titles['noindex-tax-post_tag']  = true;
$titles['disable-attachment']    = true;
$titles['open_graph_frontpage_image']    = wp_get_attachment_url($hero_id);
$titles['open_graph_frontpage_image_id'] = $hero_id;
update_option('wpseo_titles', $titles);

$social = get_option('wpseo_social');
$social['opengraph']          = true;
$social['other_social_urls']  = [
	'https://www.instagram.com/seanquinn94/',
	'https://www.linkedin.com/in/seanquinnwaterpointe/',
	'https://www.youtube.com/channel/UCUhGCrQ4pnRddK6usImxtOg',
];
update_option('wpseo_social', $social);

// Skip the first-time configuration nag; everything it asks is set above.
$wpseo = get_option('wpseo');
$wpseo['dismiss_configuration_workout_notice'] = true;
$wpseo['first_time_install'] = false;
update_option('wpseo', $wpseo);

// Homepage (static front page): title and description from the approved mockup.
$home = (int) get_option('page_on_front');
update_post_meta($home, '_yoast_wpseo_title', 'Anne & Sean | The Quinn Group | Stuart, FL Real Estate Agents');
update_post_meta($home, '_yoast_wpseo_metadesc', "Anne & Sean, The Quinn Group: Florida real estate agents based in Martin County, serving St. Lucie & Palm Beach counties. Search homes or get your home's value.");
update_post_meta($home, '_yoast_wpseo_focuskw', 'Stuart FL real estate agents');
update_post_meta($home, '_yoast_wpseo_opengraph-image', wp_get_attachment_url($hero_id));
update_post_meta($home, '_yoast_wpseo_opengraph-image-id', $hero_id);

// Inner pages (found by the _qg_key install.php gives them).
foreach ([
	'sell'          => ["What's My Home Worth? Stuart, FL Home Valuation | The Quinn Group", "Get a price for your home from Anne & Sean, based on recent sales on your street, today's competition and your home's condition. Martin, St. Lucie & Palm Beach counties.", 'Stuart FL home value'],
	'about'         => ['Meet Anne Warner & Sean Quinn | The Quinn Group, Stuart FL', 'Anne Warner and Sean Quinn of The Quinn Group, Water Pointe Realty Group: a former educator and a U.S. Naval Academy graduate who treat Treasure Coast clients like family.', 'Anne Warner Sean Quinn realtors'],
	'neighborhoods' => ['Treasure Coast Neighborhoods, Town by Town | The Quinn Group', "Sewall's Point, Stuart, Jensen Beach, Palm City and Hobe Sound, plus St. Lucie and Palm Beach counties: how each Treasure Coast town lives and prices, from Anne & Sean.", 'Treasure Coast neighborhoods'],
	'contact'       => ['Contact Anne & Sean | The Quinn Group, Stuart, FL Realtors', 'Call Sean at (772) 486-6883 or Anne at (772) 713-7223, visit us at 3727 SE Ocean Blvd, Suite 100, Stuart, FL 34996, or send a message.', 'contact Stuart FL realtor'],
] as $key => [$title, $desc, $kw]) {
	$ids = get_posts(['post_type' => 'page', 'meta_key' => '_qg_key', 'meta_value' => $key, 'numberposts' => 1, 'fields' => 'ids']);
	if (!$ids) {
		continue;
	}
	update_post_meta($ids[0], '_yoast_wpseo_title', $title);
	update_post_meta($ids[0], '_yoast_wpseo_metadesc', $desc);
	update_post_meta($ids[0], '_yoast_wpseo_focuskw', $kw);
}

// Header/footer templates are not pages people should find in search.
foreach (get_posts(['post_type' => 'elementor-hf', 'numberposts' => -1, 'fields' => 'ids']) as $id) {
	update_post_meta($id, '_yoast_wpseo_meta-robots-noindex', '1');
}

WP_CLI::success("Yoast configured (home $home, logo $logo_id, OG image $hero_id)");
