<?php

require 'VMLPath.php';

class SVGFont {
	
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
	 * @return string
	 */
	public function toJSON()
	{
		$font = $this->document;
		
		$fontJSON = array(
			'w' => (int) $font['horiz-adv-x'],
			'face' => array(),
			'glyphs' => array()
		);
		
		$face = $font->xpath('font-face');
		
		if (empty($face))
		{
			return null;
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
		
		return json_encode($fontJSON);
	}
	
}