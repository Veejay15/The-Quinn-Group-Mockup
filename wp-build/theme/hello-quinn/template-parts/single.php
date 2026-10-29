<?php
/**
 * Single post or page (non-Elementor). Posts get the market-guide layout: navy title band, featured image,
 * article column, author box, home-value call to action and three more guides. Plain pages (legal pages)
 * get the title band and article column only.
 */
if (!defined('ABSPATH')) {
	exit;
}

while (have_posts()) :
	the_post();
	$is_post = get_post_type() === 'post';
	?>
<main id="content" <?php post_class('site-main qg-article'); ?>>

	<section class="article-head navy on-dark">
		<div class="wrap">
			<?php if ($is_post) : ?>
				<div class="eyebrow"><a href="<?php echo esc_url(get_permalink(get_option('page_for_posts'))); ?>">Market guides</a></div>
			<?php endif; ?>
			<?php the_title('<h1 class="entry-title">', '</h1>'); ?>
			<?php if ($is_post) : ?>
				<p class="meta">By <?php the_author(); ?> · Updated <time datetime="<?php echo esc_attr(get_the_modified_date('c')); ?>"><?php echo esc_html(get_the_modified_date('F j, Y')); ?></time></p>
			<?php endif; ?>
		</div>
	</section>

	<?php if ($is_post && has_post_thumbnail()) : ?>
		<div class="wrap article-figure"><?php the_post_thumbnail('full', ['loading' => 'eager', 'fetchpriority' => 'high']); ?></div>
	<?php endif; ?>

	<div class="wrap">
		<div class="article-body">
			<?php the_content(); ?>
		</div>

		<?php if ($is_post) : ?>
			<aside class="author-box">
				<div class="author-photos">
					<?php
					foreach (['sean', 'anne'] as $who) {
						$img = get_posts(['post_type' => 'attachment', 'post_status' => 'inherit', 'meta_key' => '_qg_src', 'meta_value' => $who, 'numberposts' => 1, 'fields' => 'ids']);
						if ($img) {
							echo wp_get_attachment_image($img[0], 'thumbnail');
						}
					}
					?>
				</div>
				<div>
					<div class="k">Written by</div>
					<p class="who">Anne Warner &amp; Sean Quinn, The Quinn Group</p>
					<p>Treasure Coast REALTORS® with Water Pointe Realty Group. Sean is a U.S. Naval Academy graduate and second-generation Martin County agent; Anne is a former educator who explains every step clearly.</p>
					<p class="calls"><a href="tel:+17724866883">Sean · (772) 486-6883</a><a href="tel:+17727137223">Anne · (772) 713-7223</a></p>
				</div>
			</aside>
		<?php endif; ?>
	</div>

	<?php if ($is_post) : ?>
		<section class="cta-band section navy on-dark">
			<div class="wrap">
				<div class="eyebrow center">Thinking of selling?</div>
				<h2>Before we talk price, let's look at <em>your street</em>.</h2>
				<div class="row">
					<a href="/#sell" class="btn gold">What's my home worth?</a>
					<a href="/#contact" class="btn line-light">Talk to Anne &amp; Sean</a>
				</div>
			</div>
		</section>

		<?php
		$more = get_posts(['numberposts' => 3, 'post__not_in' => [get_the_ID()], 'orderby' => 'modified', 'order' => 'DESC']);
		if ($more) :
			?>
			<section class="insights section sand">
				<div class="wrap">
					<div class="eyebrow">Keep reading</div>
					<h2>More <em>market guides</em>.</h2>
					<div class="posts">
						<?php foreach ($more as $p) : ?>
							<a class="post" href="<?php echo esc_url(get_permalink($p)); ?>">
								<div class="k"><?php echo esc_html(get_the_modified_date('M j, Y', $p)); ?></div>
								<h3><?php echo esc_html(get_the_title($p)); ?></h3>
								<p><?php echo esc_html(wp_trim_words(get_the_excerpt($p), 28)); ?></p>
								<span class="link">Read the guide →</span>
							</a>
						<?php endforeach; ?>
					</div>
				</div>
			</section>
		<?php endif; ?>
	<?php endif; ?>

</main>
	<?php
endwhile;
