<?php
header('Content-Type: text/css');
sleep(1);
?>
body {
	border: 0;
	margin: 0;
	padding: 0;
	width: <?php echo filter_input(INPUT_GET, 'w', FILTER_SANITIZE_NUMBER_INT) ?>px;
}
