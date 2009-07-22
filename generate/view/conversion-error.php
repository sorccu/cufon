<?php require dirname(__FILE__) . '/header.php' ?>

				<div id="content">

					<div class="section">

						<h3>Sorry!</h3>

						<p>The file you uploaded could not be converted. Currently only TrueType (TTF), OpenType (OTF), Printer Font Binary (PFB) and PostScript fonts are supported.</p>

						<p>If you're sure the font is valid, it is likely that the author of the font has decided to not allow modification and/or embedding of the font. This can happen quite often especially with "freeware" TrueType fonts. You must contact the author of the font for a less restricted version.</p>

						<p>Some files (especially old Mac PostScript fonts) require pre-processing that cannot be done on the server. For more information please read <a href="http://wiki.github.com/sorccu/cufon/trouble-with-font-files" class="external">Trouble with font files</a>.</p>

						<p class="info"><strong>Tip:</strong> did you upload an AFM or a PFM file? They only contain font metrics information which is not quite
						what we need. There should be a PFA or a PFB file with the same name in the same folder, which contains the actual glyph data. If there isn't, your font manager
						probably stashed it away somewhere, in which case you're going to have to hunt it down yourself. Once you've found the correct file you should be able to convert it with no trouble at all.</p>

					</div>

					<div class="actions">

						<a href="./">Back to the generator</a>

					</div>

				</div>

<?php require dirname(__FILE__) . '/footer.php' ?>
