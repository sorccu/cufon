<?php require dirname(__FILE__) . '/header.php' ?>

				<div id="content">

					<div class="section">

						<h3>Sorry! Please fix these errors and try again.</h3>

						<ul>
						<?php foreach (array_keys($errors) as $error): ?>
							<li><?php echo htmlspecialchars($filters[$error]['message'], ENT_QUOTES, 'utf-8') ?></li>
						<?php endforeach; ?>
						</ul>

					</div>

					<div class="actions">

						<a href="./">Back to the generator</a>

					</div>

				</div>

<?php require dirname(__FILE__) . '/footer.php' ?>
