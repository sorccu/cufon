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
		throw new Exception("No <font-face /> was found");
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
		$data['d'] = simplify_path((string) $glyph['d']);
	}
	
	if (isset($glyph['horiz-adv-x']))
	{
		$data['h'] = (string) $glyph['horiz-adv-x'];
	}
	
	return (object) $data;
}

function simplify_path($path)
{
	return $path;
	return preg_replace(
		array(
			'/h(-?\d+)/',
			'/v(-?\d+)/'
		),
		array(
			'r\1 0',
			'r0 \1'
		),
		$path);
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