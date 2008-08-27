<?php

define('CUFON_CALLBACK', 'Cufon.registerFont');

function usage()
{
	header('Location: ./');
}

function parse_svg_font($font)
{
	$fontData = array(
		'h' => (string) $font['horiz-adv-x'],
		'face' => new stdClass(),
		'glyphs' => new stdClass()
	);
	
	$face = $font->xpath('font-face');
	
	if (empty($face))
	{
		throw new Exception("No font-face was found");
	}
	
	foreach ($face[0]->attributes() as $key => $val) {
		$fontData['face']->$key = (string) $val;
	}
	
	foreach ($font->xpath('missing-glyph') as $glyph)
	{
		$fontData['missingGlyph'] = get_glyph_data($glyph);
	}

	foreach ($font->xpath('glyph') as $glyph)
	{
		if (!isset($glyph['unicode']))
		{
			continue;
		}
		
		$fontData['glyphs']->{$glyph['unicode']} = get_glyph_data($glyph);
	}
	
	return (object) $fontData;
}

function get_glyph_data($glyph)
{
	$data = array();
	
	if (isset($glyph['d']))
	{
		$data['d'] = svg_to_vml((string) $glyph['d']);
	}
	
	if (isset($glyph['horiz-adv-x']))
	{
		$data['h'] = (string) $glyph['horiz-adv-x'];
	}
	
	return (object) $data;
}

function svg_to_vml($path)
{
	if (!preg_match_all('/([a-zA-Z])([0-9. ,]*)/', $path, $matches, PREG_PATTERN_ORDER))
	{
		return '';
	}
	
	$vml = array();
	
	$at = (object) array('x' => 0, 'y' => 0 );
	$cp = (object) array('x' => 0, 'y' => 0 );
	
	$previous = null;
	
	foreach ($matches as $set)
	{
		list($cmd, $coords) = array($set[1], array_map('floatval', preg_split('/(?:,|\s+)/', trim($set[2]))));
		
		switch ($cmd)
		{
			case 'z':
			case 'Z':
				$vml[] = 'x';
				break;
			case 'M':
				$vml[] = sprintf('m%F %F',
					$at->x = $coords[0],
					$at->y = $coords[1]
				);
				break;
			case 'L':
				$vml[] = sprintf('l%F %F',
					$at->x = $coords[0],
					$at->y = $coords[1]
				);
				break;
			case 'l':
				$vml[] = sprintf('l%F %F',
					$at->x += $coords[0],
					$at->y += $coords[1]
				);
				break;
			case 'H':
				$vml[] = sprintf('l%F %F',
					$at->x = $coords[0],
					$at->y
				);
				break;
			case 'h':
				$vml[] = sprintf('l%F %F',
					$at->x += $coords[0],
					$at->y
				);
				break;
			case 'V':
				$vml[] = sprintf('l%F %F',
					$at->x,
					$at->y = $coords[1]
				);
				break;
			case 'v':
				$vml[] = sprintf('l%F %F',
					$at->x,
					$at->y += $coords[1]
				);
				break;
			case 'C':
				$vml[] = sprintf('c%F %F %F %F %F %F',
					$coords[0],
					$coords[1],
					$cp->x = $coords[2],
					$cp->y = $coords[3],
					$at->x = $coords[4],
					$at->y = $coords[5]
				);
				break;
			case 'c':
				$vml[] = sprintf('c%F %F %F %F %F %F',
					$at->x + $coords[0],
					$at->y + $coords[1],
					$cp->x = $at->x + $coords[2],
					$cp->y = $at->y + $coords[3],
					$at->x += $coords[4],
					$at->y += $coords[5]
				);
				break;
			case 'S':
				if (!$previous || !preg_match('/^[CcSs]$/', $previous))
				{
					$cp->x = $at->x;
					$cp->y = $at->y;
				}
				$vml[] = sprintf('c%F %F %F %F %F %F',
					$at->x + ($at->x - $cp->x),
					$at->y + ($at->y - $cp->y),
					$cp->x = $coords[0],
					$cp->y = $coords[1],
					$at->x = $coords[2],
					$at->y = $coords[3]
				);
				break;
			case 's':
				if (!$previous || !preg_match('/^[CcSs]$/', $previous))
				{
					$cp->x = $at->x;
					$cp->y = $at->y;
				}
				$vml[] = sprintf('c%F %F %F %F %F %F',
					$at->x + ($at->x - $cp->x),
					$at->y + ($at->y - $cp->y),
					$cp->x = $at->x + $coords[0],
					$cp->y = $at->y + $coords[1],
					$at->x += $coords[2],
					$at->y += $coords[3]
				);
				break;
			case 'Q':
				$vml[] = sprintf('qb%F %F %F %F', $cp->x = $coords[0], $cp->y = $coords[1], $at->x = $coords[2], $at->y = $coords[3]);
				break;
			case 'q':
				$vml[] = sprintf('qb%F %F %F %F', $cp->x = $at->x + $coords[0], $cp->y = $at->y + $coords[1], $at->x += $coords[2], $at->y += $coords[3]);
				break;
			case 'T':
				if (!$previous || !preg_match('/^[QqTt]$/', $previous))
				{
					$cp->x = $at->x;
					$cp->y = $at->y;
				}
				$vml[] = sprintf('c%F %F %F %F %F %F',
					$cp->x = $at->x + ($at->x - $cp->x),
					$cp->y = $at->y + ($at->y - $cp->y),
					$at->x = $coords[0],
					$at->y = $coords[1]
				);
				break;
			case 't':
				if (!$previous || !preg_match('/^[QqTt]$/', $previous))
				{
					$cp->x = $at->x;
					$cp->y = $at->y;
				}
				$vml[] = sprintf('c%F %F %F %F %F %F',
					$cp->x = $at->x + ($at->x - $cp->x),
					$cp->y = $at->y + ($at->y - $cp->y),
					$at->x += $coords[0],
					$at->y += $coords[1]
				);
				break;
			case 'A':
			case 'a':
				break;
			
		}
		
		$previous = $cmd;
	}
	
	$vml[] = 'e';
	
	return $vml.join(' ');
}

function send_font($font, $options = array())
{
	$filename = preg_replace(
		array(
			'/\s+/',
			'/[^a-z0-9_\-]/i'
		),
		array(
			'_',
			''
		),
		$font->face->{'font-family'}) . '.font.js';
	
	header(sprintf('Content-Disposition: attachment; filename=%s', $filename));
	header('Content-Type: text/javascript');
	
	printf('%s(%s)', CUFON_CALLBACK, json_encode($font));
	
	exit(0);
}

if (!isset($_FILES['fontfile']) || ($_FILES['fontfile']['error'] !== UPLOAD_ERR_OK))
{
	usage();
}

$ext = strtolower(pathinfo($_FILES['fontfile']['name'], PATHINFO_EXTENSION));

if (!in_array($ext, array('ttf', 'otf')))
{
	usage();
}

system(sprintf('./cufon %s', escapeshellarg($_FILES['fontfile']['tmp_name'])), $result);

unlink($_FILES['fontfile']['tmp_name']);

if ($result > 0)
{
	usage();
}

$svgFile = $_FILES['fontfile']['tmp_name'] . '.svg';

$svg = simplexml_load_file($svgFile);

unlink($svgFile);

foreach ($svg->xpath('//font') as $font) // the loop will only run once
{
	send_font(parse_svg_font($font));
}