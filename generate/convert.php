<?php

function usage()
{
	echo <<<EOT
Usage: php convert.php OPTIONS file ..

Options:

  -b  --callback        The JavaScript function that handles the font.
                        Defaults to Cufon.registerFont.

                        Example: -b myRegisterFont

  -c  --characters      All of these characters are included in the
                        resulting font file.

                        Example: -c "abc123"

  -d  --domain          Restricts the font file to one or more domain
                        names.

                        Example: -d example.org -d example.com

  -f  --fontforge       Path to the FontForge binary.

  -h  --help            Displays this message.

  -n  --family-name     The font-family of the font. By default the
                        real name of the font is used, but it may not
                        always be what you need.

                        Example: -n "Nifty Font"

  -u  --unicode-range   See http://www.w3.org/TR/css3-webfonts/#dataqual

                        Example: -u "U+00??,U+20A7"

  -s  --scale           Scales the font's em-size to this value. Defaults
                        to 360.

                        Example: --scale 720

  -k  --no-kerning      Disables kerning.

  -l  --no-scaling      No scaling, use the native value instead.

  -m  --no-simplify     Keep the paths as they are, do not attempt to
                        simplify them.

  -e  --simplify-delta  Simplified paths may differ from the original
                        by this many units (relative to scaling value).
                        Defaults to 2.

                        Example: -e 1

Sample usage:

php convert.php Amaze/*.ttf -u "U+??" > Amaze.font.js

EOT;
}

set_include_path(get_include_path() . PATH_SEPARATOR . dirname(__FILE__));

require 'lib/Cufon.php';

$filters = array(
	'family' => array(
		'filter' => FILTER_SANITIZE_STRING,
		'flags' => FILTER_NULL_ON_FAILURE
	),
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
		'filter' => FILTER_UNSAFE_RAW,
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
	),
	'kerning' => array(
		'filter' => FILTER_VALIDATE_BOOLEAN
	)
);

$optional = array(
	'ligatures' => true,
	'disableScaling' => true,
	'simplify' => true,
	'kerning' => true,
	'glyphs' => true
);

$options = array();
$files = array();

switch (PHP_SAPI)
{
	case 'cli':

		$fontforge = trim(`which fontforge`);

		$options = array(
			'family' => '',
			'terms' => 'yes',
			'permission' => 'yes',
			'glyphs' => array(),
			'ligatures' => 'no',
			'customGlyphs' => '',
			'domains' => '',
			'callback' => 'Cufon.registerFont',
			'emSize' => 360,
			'disableScaling' => 'no',
			'simplify' => 'yes',
			'simplifyDelta' => 2,
			'kerning' => 'yes'
		);

		$domains = array();

		$args = $_SERVER['argv'];

		for (next($args); ($arg = current($args)) !== false; next($args))
		{
			switch ($arg)
			{
				case '-b':
				case '--callback':
					$options['callback'] = next($args);
					break;
				case '-c':
				case '--characters':
					$options['customGlyphs'] = next($args);
					break;
				case '-d':
				case '--domain':
					$domains[] = next($args);
					break;
				case '-f':
				case '--fontforge':
					$fontforge = next($args);
					break;
				case '-h':
				case '--help':
					usage();
					exit(0);
					break;
				case '-n':
				case '--family-name':
					$options['family'] = next($args);
					break;
				case '-u':
				case '--unicode-range':
					$options['glyphs'][] = UnicodeRange::fromCSSValue(next($args))->asHexString();
					break;
				case '-s':
				case '--scale':
					$options['emSize'] = next($args);
					break;
				case '-k':
				case '--no-kerning':
					$options['kerning'] = 'no';
					break;
				case '-l':
				case '--no-scaling':
					$options['disableScaling'] = 'yes';
					break;
				case '-m':
				case '--no-simplify':
					$options['simplify'] = 'no';
					break;
				case '-e':
				case '--simplify-delta':
					$options['simplifyDelta'] = next($args);
					break;
				default:
					if (!is_file($arg))
					{
						printf("%s: No such file\n", $arg);
						exit(1);
					}
					$files[] = $arg;
			}
		}

		if (!is_executable($fontforge))
		{
			echo "Could not find FontForge binary\n";
			exit(4);
		}

		define('CUFON_FONTFORGE', $fontforge);

		if (empty($files))
		{
			echo 'Nothing to convert.';
			exit(0);
		}

		$options['domains'] = implode(', ', $domains);

		$options = filter_var_array($options, $filters);

		$errors = array_diff_key(array_filter($options, 'is_null'), $optional);

		if (!empty($errors))
		{
			usage();
			exit(1);
		}

		foreach ($files as $file)
		{
			try
			{
				foreach (Cufon::generate($file, $options) as $id => $json)
				{
					echo $json;

					$fonts[] = $id;
				}
			}
			catch (ConversionException $e)
			{
				printf("%s: Could not convert file\n", $file);
				exit(2);
			}
		}

		break;

	default:

		if (!is_readable('settings.ini'))
		{
			echo 'settings.ini is missing';
			exit(1);
		}

		$config = parse_ini_file('settings.ini', false);

		define('CUFON_VALID', true);
		define('CUFON_FONTFORGE', $config['fontforge']);

		switch ($_SERVER['REQUEST_METHOD'])
		{
			case 'POST':
				break;
			default:
				header('HTTP/1.1 303 See Other');
				header('Location: ./');
				exit(0);
		}

		$options = filter_input_array(INPUT_POST, $filters);

		if (isset($_FILES['font']))
		{
			foreach ($_FILES['font']['error'] as $key => $error)
			{
				switch ($error)
				{
					case UPLOAD_ERR_OK:
						Cufon::log('Uploaded %s', $_FILES['font']['name'][$key]);
						$files[] = $_FILES['font']['tmp_name'][$key];
						break;
					case UPLOAD_ERR_NO_FILE:
						break;
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
			}
		}

		if (empty($files))
		{
			require 'view/upload-empty-error.php';
			exit(0);
		}

		$errors = array_diff_key(array_filter($options, 'is_null'), $optional);

		if (!empty($errors))
		{
			require 'view/input-error.php';
			exit(0);
		}

		ob_start();

		$fonts = array();

		foreach ($files as $file)
		{
			try
			{
				foreach (Cufon::generate($file, $options) as $id => $json)
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
}
