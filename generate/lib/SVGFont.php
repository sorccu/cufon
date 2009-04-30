<?php

require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'JSEncoder.php';
require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'SVGFontContainer.php';
require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'VMLPath.php';

class SVGFont {
	
	/**
	 * @var SimpleXMLElement
	 */
	private $document;

	/**
	 * @var SVGFontContainer
	 */
	private $container;
	
	/**
	 * @param string $file
	 */
	public function __construct(SimpleXMLElement $document, SVGFontContainer $container)
	{		
		$this->document = $document;
		
		$this->container = $container;
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
					$parts[] = $this->getSanitizedFaceValue($attribute, (string) $face[$attribute]);
				}
			}
			
			return implode('_', $parts);
		}
		
		return null;
	}
	
	/**
	 * @param string $key
	 * @param string $value
	 */
	private function getSanitizedFaceValue($key, $value)
	{
		switch ($key)
		{
			case 'font-family':
				
				$options = $this->container->getOptions();
				
				$family = $options['family'];
				
				if (!is_null($family) && $family !== '')
				{
					return $family;
				}
				
				break;
				
			case 'font-weight':
				
				$weight = intval($value);
				
				if ($weight < 100)
				{
					$weight *= 100;
				}
				
				return max(100, min($weight, 900));
		}
		
		return $value;
	}
	
	/**
	 * @return string
	 */
	public function toJavaScript()
	{
		$font = $this->document;
		
		$fontJSON = array(
			'w' => (int) $font['horiz-adv-x'],
			'face' => array(),
			'glyphs' => array(
				' ' => new stdClass() // some fonts do not contain a glyph for space
			)
		);
		
		$face = $font->xpath('font-face');
		
		if (empty($face))
		{
			return null;
		}
		
		foreach ($face[0]->attributes() as $key => $val)
		{
			$fontJSON['face'][$key] = $this->getSanitizedFaceValue($key, (string) $val);
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
			
			$data = new stdClass();
			
			if (isset($glyph['d']))
			{
				$data->d = substr(VMLPath::fromSVG((string) $glyph['d']), 1, -2); // skip m and xe
			}
			
			if (isset($glyph['horiz-adv-x']))
			{
				$data->w = (int) $glyph['horiz-adv-x'];
			}
			
			$fontJSON['glyphs'][(string) $glyph['unicode']] = $data;
		}
		
		$nbsp = utf8_encode(chr(0xa0));
		
		if (!isset($fontJSON['glyphs'][$nbsp]))
		{
			$fontJSON['glyphs'][$nbsp] = $fontJSON['glyphs'][' '];
		}
		
		return self::processFont($fontJSON, $this->container->getOptions());
	}
	
	/**
	 * @param array $data
	 * @param array $options
	 * @return string
	 */
	private static function processFont($data, $options)
	{
		$domains = preg_split('/\s*[, ]\s*/', trim($options['domains']), -1, PREG_SPLIT_NO_EMPTY);
		
		if (empty($domains))
		{
			return json_encode($data);
		}
		
		$domainMap = array();
		
		foreach ($domains as $domain)
		{
			$domain = preg_replace('@^\w+://@', '', mb_strtolower($domain, 'utf-8'));
			
			$domainMap[$domain] = 1;
			
			if (substr($domain, 0, 4) !== 'www.')
			{
				$domainMap["www.{$domain}"] = 1;
			}
		}
		
		$glyphs = $data['glyphs'];
		
		unset($data['glyphs']);
		
		uasort($glyphs, array(__CLASS__, 'sortRandom'));
		
		$encoder = new JSEncoder(
			sprintf('(function(){var b=_cufon_bridge_,c=%s.split(""),i=0,p=b.p,l=p.length,g=b.f.glyphs={};if(%s[location.hostname])for(;i<l;++i)g[c[i]]=p[i]})()',
				json_encode(implode('', array_keys($glyphs))),
				json_encode($domainMap)));
		
		return sprintf('(function(f){_cufon_bridge_={p:%s,f:f};try{%s}catch(e){}delete _cufon_bridge_;return f})(%s)',
			json_encode(array_values($glyphs)),
			$encoder->getDecoder(),
			json_encode($data));
	}
	
	/**
	 * @param mixed $a
	 * @param mixed $b
	 * @return int
	 */
	private static function sortRandom($a, $b)
	{
		return mt_rand(-1, 1);
	}
	
}