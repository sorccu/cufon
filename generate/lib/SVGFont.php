<?php

require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'JSEncoder.php';
require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'SVGFontContainer.php';
require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'UnicodeRange.php';
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

		$nameIndex = array();
		$charIndex = array();

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

			$char = (string) $glyph['unicode'];

			if (isset($glyph['glyph-name']))
			{
				foreach (explode(',', (string) $glyph['glyph-name']) as $glyphName)
				{
					$nameIndex[$glyphName] = $char;
					$charIndex[$char] = $data;
				}
			}

			$fontJSON['glyphs'][$char] = $data;
		}

		$options = $this->container->getOptions();

		$emSize = (int) $fontJSON['face']['units-per-em'];

		// for some extremely weird reason FontForge sometimes pumps out
		// astronomical kerning values.
		// @todo figure out what's really wrong
		$kerningLimit = $emSize * 2;

		if ($options['kerning'])
		{
			foreach ($font->xpath('hkern') as $hkern)
			{
				$k = (int) $hkern['k'];

				if (abs($k) > $kerningLimit)
				{
					continue;
				}

				$firstSet = array();
				$secondSet = array();

				if (isset($hkern['u1']))
				{
					$firstSet = self::getMatchingCharsFromUnicodeRange((string) $hkern['u1'], $charIndex);
				}

				if (isset($hkern['g1']))
				{
					$firstSet = array_merge($firstSet, self::getMatchingCharsFromGlyphNames((string) $hkern['g1'], $nameIndex));
				}

				if (isset($hkern['u2']))
				{
					$secondSet = self::getMatchingCharsFromUnicodeRange((string) $hkern['u2'], $charIndex);
				}

				if (isset($hkern['g2']))
				{
					$secondSet = array_merge($secondSet, self::getMatchingCharsFromGlyphNames((string) $hkern['g2'], $nameIndex));
				}

				if (!empty($secondSet))
				{
					foreach ($firstSet as $firstGlyph)
					{
						foreach ($secondSet as $secondGlyph)
						{
							$glyph = $fontJSON['glyphs'][$firstGlyph];

							if (!isset($glyph->k))
							{
								$glyph->k = array();
							}

							$glyph->k[$secondGlyph] = $k;
						}
					}
				}
			}
		}

		$nbsp = utf8_encode(chr(0xa0));

		if (!isset($fontJSON['glyphs'][$nbsp]) && isset($fontJSON['glyphs'][' ']))
		{
			$fontJSON['glyphs'][$nbsp] = $fontJSON['glyphs'][' '];
		}

		return self::processFont($fontJSON, $options);
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
			$domain = preg_quote(preg_replace('@^\w+://@', '', mb_strtolower($domain, 'utf-8')), '/');

			// this is kind of ugly, but we have to make sure that JSEncoder
			// only gets ASCII characters
			$domain = str_replace('\\\\', '\\', substr(json_encode($domain), 1, -1));

			if (substr($domain, 0, 2) === '\\.')
			{
				$domain = ".+{$domain}";
			}
			else if (substr($domain, 0, 4) === '\\*\\.')
			{
				$domain = '.+' . substr($domain, 2);
			}

			$domainMap[$domain] = 1;
		}

		$glyphs = $data['glyphs'];

		unset($data['glyphs']);

		uasort($glyphs, array(__CLASS__, 'sortRandom'));

		$encoder = new JSEncoder(
			sprintf('(function(){var b=_cufon_bridge_,c=%s.split(""),i=0,p=b.p,l=p.length,g=b.f.glyphs={};if(/^(?:www\\.)?(?:%s)$/.test(location.hostname))for(;i<l;++i)g[c[i]]=p[i]})()',
				json_encode(implode('', array_keys($glyphs))),
				implode('|', array_keys($domainMap))));

		return sprintf('(function(f){_cufon_bridge_={p:%s,f:f};try{%s}catch(e){}delete _cufon_bridge_;return f})(%s)',
			json_encode(array_values($glyphs)),
			$encoder->getDecoder(),
			json_encode($data));
	}

	/**
	 * @param string $group
	 * @param array $nameIndex
	 * @return array
	 */
	private static function getMatchingCharsFromGlyphNames($group, $nameIndex)
	{
		$matches = array();

		foreach (explode(',', $group) as $g)
		{
			if (isset($nameIndex[$g]))
			{
				$matches[] = $nameIndex[$g];
			}
		}

		return $matches;
	}

	/**
	 * @param string $unicodeRange
	 * @param array $charIndex
	 * @return array
	 */
	private static function getMatchingCharsFromUnicodeRange($unicodeRange, $charIndex)
	{
		$matches = array();

		$range = new UnicodeRange($unicodeRange);

		if ($range->isSimple())
		{
			if ($charIndex[$unicodeRange])
			{
				$matches[] = $unicodeRange;
			}
		}
		else
		{
			reset($charIndex);

			while (list($char) = each($charIndex))
			{
				if ($range->contains($char))
				{
					$matches[] = $char;
				}
			}
		}

		return $matches;
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
