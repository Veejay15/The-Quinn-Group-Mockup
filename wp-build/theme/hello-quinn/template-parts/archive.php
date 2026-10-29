<?php
/**
 * Blog index and archives: market-guide cards with featured images, in the homepage's design language.
 */
if (!defined('ABSPATH')) {
	exit;
}

$blog_page = (int) get_option('page_for_posts');
$title     = is_home() && $blog_page ? get_the_title($blog_page) : wp_strip_all_tags(get_the_archive_title());
?>
<main id="content" class="site-main qg-archive">

	<section class="article-head navy on-dark">
		<div class="wrap">
			<div class="eyebrow">Written by Anne &amp; Sean</div>
			<h1 class="entry-title"><?php echo esc_html($title); ?></h1>
			<p class="sub">Local guides on what changes what a home really costs on the Treasure Coast, street by street. Read before you list or buy.</p>
		</div>
	</section>

	<section class="section">
		<div class="wrap">
			<div class="guide-grid">
				<?php
				while (have_posts()) :
					the_post();
					?>
					<a class="guide" href="<?php the_permalink(); ?>">
						<div class="ph"><?php
						if (has_post_thumbnail()) {
							the_post_thumbnail('large');
						}
						?></div>
						<div class="body">
							<div class="k"><?php echo esc_html(get_the_modified_date('M j, Y')); ?></div>
							<h2><?php the_title(); ?></h2>
							<p><?php echo esc_html(wp_trim_words(get_the_excerpt(), 26)); ?></p>
							<span class="link">Read the guide →</span>
						</div>
					</a>
				<?php endwhile; ?>
			</div>

			<?php
			the_posts_pagination([
				'mid_size'  => 1,
				'prev_text' => '← Newer',
				'next_text' => 'Older →',
			]);
			?>
		</div>
	</section>

</main>
