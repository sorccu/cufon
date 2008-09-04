<?php

date_default_timezone_set('Europe/Helsinki');

require 'Cufon.php';
require 'FontForgeScript.php';
require 'SVGFont.php';

switch ($_SERVER['REQUEST_METHOD'])
{
	case 'POST':
		break;
	default:
		header('HTTP/1.1 405 Method Not Allowed');
		exit(0);
}

$options = filter_input_array(INPUT_POST, array(
	'terms' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN
	),
	'permission' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN
	),
	'glyphs' => array(
		'filter' => FILTER_VALIDATE_REGEXP,
		'flags' => FILTER_REQUIRE_ARRAY | FILTER_NULL_ON_FAILURE,
		'options' => array(
			'regexp' => '/^0x[A-Z0-9]{1,4}(?:[,-]0x[A-Z0-9]{1,4})*$/'
		)
	),
	'ligatures' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN
	),
	'missingGlyph' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN
	),
	'customGlyphs' => array(
		'filter' => FILTER_UNSAFE_RAW,
		'flags' => FILTER_REQUIRE_SCALAR | FILTER_NULL_ON_FAILURE
	),
	'domains' => array(
		'filter' => FILTER_SANITIZE_STRING,
		'flags' => FILTER_NULL_ON_FAILURE
	),
	'callback' => array(
		'filter' => FILTER_SANITIZE_STRING,
		'flags' => FILTER_NULL_ON_FAILURE
	),
	'emSize' => array(
		'filter' => FILTER_VALIDATE_INT,
		'flags' => FILTER_NULL_ON_FAILURE,
		'options' => array(
			'min_range' => 64,
			'max_range' => 2048
		)
	),
	'allowScaling' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN
	)
));

$errors = array_filter($options, 'is_null');

$errors = array_diff_key($errors, array(
	'ligatures' => 1,
	'missingGlyph' => 1,
	'allowScaling' => 1
));

if (!empty($errors))
{
	header('HTTP/1.1 400 Bad Request');
	echo "Sry u is fail";
	exit(0);
}

ob_start();

$domains = preg_split('/\s*[, ]\s*/', trim($options['domains']), -1, PREG_SPLIT_NO_EMPTY);

if (!empty($domains))
{
	$domainList = array();
	
	foreach ($domains as $domain)
	{
		$domainList[$domain] = 1;
	}
	
	printf('if (!%s[location.host]) throw Error("Invalid cuf—n hostname");', json_encode($domainList));
}

$fonts = array();

foreach ($_FILES['font']['error'] as $key => $error)
{
	switch ($error)
	{
		case UPLOAD_ERR_OK:
			Cufon::log('Uploaded %s', $_FILES['font']['name'][$key]);
			break;
		case UPLOAD_ERR_NO_FILE:
			continue 2;
		case UPLOAD_ERR_INI_SIZE:
		case UPLOAD_ERR_FORM_SIZE:
			Cufon::log('Upload failed (too large): %s', $_FILES['font']['name'][$key]);
			header('HTTP/1.1 413 Request Entity Too Large');
			exit(0);
		default:
			Cufon::log('Upload failed (code: %d): %s', $error, $_FILES['font']['name'][$key]);
			header('HTTP/1.1 500 Internal Server Error');
			exit(0);
	}
	
	$file = $_FILES['font']['tmp_name'][$key];
	
	Cufon::log('Processing %s', $file);
	
	$script = new FontForgeScript();
	
	$script->open($file);
	$script->selectNone();
	
	foreach ($options['glyphs'] as $glyph)
	{
		$ranges = explode(',', $glyph);
		
		foreach ($ranges as $range)
		{
			if (strpos($range, '-')) // can't be 0 anyway
			{
				// the range regex allows for things like 0xff-0xff-0xff, so we'll
				// just ignore everything between the first and last one.
				
				$points = explode('-', $range);
				
				$script->selectUnicodeRange(intval(reset($points), 16), intval(end($points), 16));
			}
			else
			{
				$script->selectUnicode(intval($range, 16));
			}
		}
	}
	
	$script->selectInvert();
	$script->clear();
	
	if ($options['allowScaling'])
	{
		$script->scaleToEm($options['emSize']);
	}
	
	$script->removeAllKerns();
	$script->selectAll();
	$script->verticalFlip(0);
	
	$svgFile = Cufon::getUnusedFilename('.svg');
	
	Cufon::log('Converting to SVG with filename %s', $svgFile);
	
	$script->generate($svgFile);
	
	$script->execute();
	
	$svgFont = SVGFont::fromFile($svgFile);
	
	unlink($svgFile);
	
	$fonts[] = $svgFont->getId();
	
	echo $svgFont->toJSON($options['callback']);
	
	unset($svgFont);
}

$filename = preg_replace(
	array(
		'/\s+/',
		'/[^a-z0-9_\-]/i'
	),
	array(
		'_',
		''
	),
	empty($fonts) ? 'Cufon Font' : implode('-', $fonts)) . '.font.js';

header(sprintf('Content-Disposition: attachment; filename=%s', $filename));
header('Content-Type: text/javascript');
