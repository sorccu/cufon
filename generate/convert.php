<?php

if (!is_readable('settings.ini'))
{
	echo 'settings.ini is missing';
	exit(1);
}

$config = parse_ini_file('settings.ini', false);

define('CUFON_VALID', true);
define('CUFON_FONTFORGE', $config['fontforge']);

set_include_path(get_include_path() . PATH_SEPARATOR . dirname(__FILE__));

require 'lib/Cufon.php';

switch ($_SERVER['REQUEST_METHOD'])
{
	case 'POST':
		break;
	default:
		header('HTTP/1.1 303 See Other');
		header('Location: ./');
		exit(0);
}

$filters = array(
	'terms' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN,
		'message' => "You didn't accept the terms"
	),
	'permission' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN,
		'message' => "You didn't confirm that you're allowed to use the font"
	),
	'glyphs' => array(
		'filter' => FILTER_VALIDATE_REGEXP,
		'flags' => FILTER_REQUIRE_ARRAY | FILTER_NULL_ON_FAILURE,
		'options' => array(
			'regexp' => '/^0x[A-Z0-9]{1,4}(?:[,-]0x[A-Z0-9]{1,4})*$/'
		),
		'message' => "You must select at least one set of glyphs"
	),
	'ligatures' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN,
		'message' => 'Ligatures are not supported yet'
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
		'flags' => FILTER_NULL_ON_FAILURE,
		'message' => "A JavaScript callback function is needed"
	),
	'emSize' => array(
		'filter' => FILTER_VALIDATE_INT,
		'flags' => FILTER_NULL_ON_FAILURE,
		'options' => array(
			'min_range' => 64,
			'max_range' => 2048
		),
		'message' => "Units per em must be a value between 64 and 2048"
	),
	'disableScaling' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN
	),
	'simplify' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN
	),
	'simplifyDelta' => array(
		'filter' => FILTER_VALIDATE_INT,
		'flags' => FILTER_NULL_ON_FAILURE,
		'options' => array(
			'min_range' => 0,
			'max_range' => 100
		),
		'message' => "The distance between the original and the optimized path may not be greater than 100 units"
	)
);

$options = filter_input_array(INPUT_POST, $filters);

$errors = array_filter($options, 'is_null');

$errors = array_diff_key($errors, array(
	'ligatures' => 1,
	'disableScaling' => 1,
	'simplify' => 1,
	'glyphs' => 1
));

if (!empty($errors))
{
	require 'view/input-error.php';
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
	
	printf('if (!%s[location.host]) throw Error("Host not allowed");', json_encode($domainList));
}

$fonts = array();

$upload = false;

if (isset($_FILES['font']))
{
	foreach ($_FILES['font']['error'] as $key => $error)
	{
		switch ($error)
		{
			case UPLOAD_ERR_OK:
				Cufon::log('Uploaded %s', $_FILES['font']['name'][$key]);
				$upload = true;
				break;
			case UPLOAD_ERR_NO_FILE:
				continue 2;
			case UPLOAD_ERR_INI_SIZE:
			case UPLOAD_ERR_FORM_SIZE:
				Cufon::log('Upload failed (too large): %s', $_FILES['font']['name'][$key]);
				require 'view/upload-size-error.php';
				exit(0);
			default:
				Cufon::log('Upload failed (code: %d): %s', $error, $_FILES['font']['name'][$key]);
				header('HTTP/1.1 500 Internal Server Error');
				echo '500 Internal Server Error';
				exit(0);
		}
		
		try
		{
			foreach (Cufon::generate($_FILES['font']['tmp_name'][$key], $options) as $id => $json)
			{
				echo $json;
				
				$fonts[] = $id;
			}	
		}
		catch (ConversionException $e)
		{
			ob_clean();
			require 'view/conversion-error.php';
			exit(0);
		}
	}
}

if (!$upload)
{
	require 'view/upload-empty-error.php';
	exit(0);
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
