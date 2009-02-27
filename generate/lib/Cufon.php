<?php

require dirname(__FILE__) . DIRECTORY_SEPARATOR . 'FontForgeScript.php';
require dirname(__FILE__) . DIRECTORY_SEPARATOR . 'SVGFontContainer.php';

class Cufon {
	
	public static function getUnusedFilename($suffix)
	{
		$filename = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'cufon_';
		
		do
		{
			$wanted = $filename . uniqid(mt_rand(), true) . $suffix;
		}
		while (file_exists($wanted));
		
		return $wanted;
	}
	
	public static function log($message)
	{
		$args = func_get_args();
		
		array_shift($args);
		
		error_log(sprintf("[cufon]: %s", vsprintf($message, $args)), 0);
	}
	
	/**
	 * @param string $file
	 * @param array $options
	 * @return array
	 */
	public static function generate($file, array $options)
	{
		Cufon::log('Processing %s', $file);
		
		$script = new FontForgeScript();
		
		$script->open($file);
		$script->reEncode('unicode');
		$script->selectNone();
		
		if (!empty($options['glyphs']))
		{
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
		}
		
		if (!empty($options['customGlyphs']))
		{	
			$glyphs = preg_split('//u', $options['customGlyphs'], -1, PREG_SPLIT_NO_EMPTY);
			
			foreach ($glyphs as $glyph)
			{
				// http://www.php.net/manual/en/function.ord.php#68914
				
				$cp = unpack('N', mb_convert_encoding($glyph, 'UCS-4BE', 'UTF-8'));
				
				$script->selectUnicode($cp[1]);
			}
		}
		
		$script->selectInvert();
		$script->detachAndRemoveGlyphs();
		
		$script->setFontOrder(FontForgeScript::ORDER_CUBIC);
		
		if (!$options['disableScaling'])
		{
			$script->scaleToEm($options['emSize']);
		}
		
		$script->removeAllKerns();
		$script->selectAll();
		$script->verticalFlip(0);
		
		if ($options['simplify'])
		{
			$script->simplify($options['simplifyDelta']);
		}
		
		$script->roundToInt(1);
		
		$svgFile = Cufon::getUnusedFilename('.svg');
		
		Cufon::log('Converting to SVG with filename %s', $svgFile);
		
		$script->generate($svgFile);
		$script->execute();
		
		$fonts = array();
		
		foreach (SVGFontContainer::fromFile($svgFile) as $font)
		{
			$fonts[$font->getId()] = $options['callback'] . '(' . $font->toJSON() . ');';
		}
		
		unlink($svgFile);
		
		return $fonts;
	}

}
