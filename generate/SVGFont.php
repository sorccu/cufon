<?php

require 'VMLPath.php';

class SVGFont {
	
	/**
	 * @param string $file
	 * @return SVGFont
	 */
	public static function fromFile($file)
	{
		return new SVGFont(simplexml_load_file($file));
	}
	
	/**
	 * @var SimpleXMLElement
	 */
	private $document;

	/**
	 * @param string $file
	 */
	public function __construct(SimpleXMLElement $document)
	{
		$this->document = $document;
	}
	
	public function __toString()
	{
		return $this->document->asXML();
	}
	
	/**
	 * @return string
	 */
	public function getId()
	{
		$faces = $this->document->xpath('//font-face');
		
		if (!empty($faces))
		{
			$face = $faces[0];
			
			$parts = array();
			
			foreach (array('font-family', 'font-style', 'font-weight') as $attribute)
			{
				if (isset($face[$attribute]))
				{
					$parts[] = (string) $face[$attribute];
				}
			}
			
			return implode('_', $parts);
		}
		
		return null;
	}
	
	/**
	 * @param string $callback
	 * @return string
	 */
	public function toJSON($callback)
	{
		$fonts = array();
		
		foreach ($this->document->xpath('//font') as $font)
		{
			$fontJSON = array(
				'w' => (int) $font['horiz-adv-x'],
				'face' => array(),
				'glyphs' => array()
			);
			
			$face = $font->xpath('font-face');
			
			if (empty($face))
			{
				continue;
			}
			
			foreach ($face[0]->attributes() as $key => $val)
			{
				$fontJSON['face'][$key] = (string) $val;
			}
			
			foreach ($font->xpath('glyph') as $glyph)
			{
				if (!isset($glyph['unicode']))
				{
					continue;
				}
				
				if (mb_strlen($glyph['unicode'], 'utf-8') > 1)
				{
					// it's a ligature, for now we'll just ignore it
					
					continue;
				}
				
				$data = array();
				
				if (isset($glyph['d']))
				{
					$data['d'] = substr(VMLPath::fromSVG((string) $glyph['d']), 1, -2); // skip m and xe
				}
				
				if (isset($glyph['horiz-adv-x']))
				{
					$data['w'] = (int) $glyph['horiz-adv-x'];
				}
				
				$fontJSON['glyphs'][(string) $glyph['unicode']] = $data;
			}
			
			$fonts[] = sprintf('%s(%s)', $callback, json_encode($fontJSON));
		}
		
		return implode(';', $fonts);
	}
	
}