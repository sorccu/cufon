<?php

require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'JSEncoder.php';
require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'SVGFontContainer.php';
require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'UnicodeRange.php';
require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'VMLPath.php';

class SVGFont {

	/**
	 * @var array
	 */
	private $options;

	/**
	 * @var string
	 */
	private $id;

	/**
	 * @var int
	 */
	private $horizAdvX = 0;

	/**
	 * @var array
	 */
	private $face = array();

	/**
	 * @var array
	 */
	private $glyphs = array();

	/**
	 * @param string $file
	 */
	public function __construct(array $options)
	{
		$this->options = $options;
	}

	/**
	 * @return string
	 */
	public function getFaceBasedId()
	{
		$parts = array();

		foreach (array('font-family', 'font-style', 'font-weight') as $attribute)
		{
			if ($this->face[$attribute] !== '')
			{
				$parts[] = $this->face[$attribute];
			}
		}

		return implode('_', $parts);
	}

	/**
	 * @param string $key
	 * @param string $value
	 */
	private function sanitizeFaceValue($key, $value)
	{
		switch ($key)
		{
			case 'font-family':

				$family = $this->options['family'];

				if (!is_null($family) && $family !== '')
				{
					return trim($family);
				}

				break;

			case 'font-weight':

				$weight = intval($value);

				if ($weight < 100)
				{
					$weight *= 100;
				}

				return max(100, min($weight, 900));

			case 'ascent':
			case 'descent':
			case 'units-per-em':

				return intval($value);
		}

		return trim($value);
	}

	/**
	 * @param XMLReader $reader
	 * @return SVGFont
	 */
	public function readFrom(XMLReader $reader)
	{
		$currentGlyphs = array(
			' ' => new stdClass() // some fonts do not contain a glyph for space
		);

		$currentFace = array(
			'font-family' => '',
			'font-weight' => '',
			'font-stretch' => '',
			'font-style' => 'normal',
			'units-per-em' => '',
			'panose-1' => '',
			'ascent' => '',
			'descent' => '',
			'bbox' => '',
			'underline-thickness' => '',
			'underline-position' => '',
			'unicode-range' => ''
		);

		$nameIndex = array();
		$charIndex = array();

		do
		{
			if ($reader->nodeType == XMLReader::END_ELEMENT)
			{
				if ($reader->name === 'font')
				{
					break;
				}

				continue;
			}

			if ($reader->nodeType != XMLReader::ELEMENT)
			{
				continue;
			}

			switch ($reader->name)
			{
				case 'font':

					if (isset($this->id))
					{
						// shouldn't happen but hey, who knows

						break 2;
					}

					$this->id = $reader->getAttribute('id');
					$this->horizAdvX = (int) $reader->getAttribute('horiz-adv-x');

					break;

				case 'font-face':

					foreach ($currentFace as $key => $defaultValue)
					{
						$actualValue = $this->sanitizeFaceValue($key,
							$reader->getAttribute($key));

						$currentFace[$key] = ($actualValue == null)
							? $defaultValue
							: $actualValue;
					}

					break;

				case 'glyph':

					$glyphChar = $reader->getAttribute('unicode');

					if (empty($glyphChar) && $glyphChar !== '0')
					{
						break;
					}

					if (mb_strlen($glyphChar, 'utf-8') > 1)
					{
						// it's a ligature, for now we'll just ignore it

						break;
					}

					$glyphData = new stdClass();

					$glyphName = $reader->getAttribute('glyph-name');
					$glyphPath = $reader->getAttribute('d');
					$glyphHorizAdvX = $reader->getAttribute('horiz-adv-x');

					if ($glyphPath != null)
					{
						$glyphData->d = substr(VMLPath::fromSVG($glyphPath), 1, -2); // skip m and xe
					}

					if ($glyphHorizAdvX != null)
					{
						$glyphData->w = (int) $glyphHorizAdvX;
					}

					if ($glyphName != null)
					{
						foreach (explode(',', $glyphName) as $glyphNameAlt)
						{
							$nameIndex[$glyphNameAlt] = $glyphChar;
							$charIndex[$glyphChar] = $glyphData;
						}
					}

					$currentGlyphs[$glyphChar] = $glyphData;

					break;

				case 'hkern';

					if (empty($this->options['kerning']))
					{
						break;
					}

					$kernK = (int) $reader->getAttribute('k');
					$kernU1 = $reader->getAttribute('u1');
					$kernG1 = $reader->getAttribute('g1');
					$kernU2 = $reader->getAttribute('u2');
					$kernG2 = $reader->getAttribute('g2');

					$firstSet = array();
					$secondSet = array();

					if ($kernU1 != null)
					{
						$firstSet = self::getMatchingCharsFromUnicodeRange($kernU1, $charIndex);
					}

					if ($kernG1 != null)
					{
						$firstSet = array_merge($firstSet, self::getMatchingCharsFromGlyphNames($kernG1, $nameIndex));
					}

					if ($kernU2 != null)
					{
						$secondSet = self::getMatchingCharsFromUnicodeRange($kernU2, $charIndex);
					}

					if ($kernG2 != null)
					{
						$secondSet = array_merge($secondSet, self::getMatchingCharsFromGlyphNames($kernG2, $nameIndex));
					}

					if (!empty($secondSet))
					{
						foreach ($firstSet as $firstGlyph)
						{
							foreach ($secondSet as $secondGlyph)
							{
								$glyph = $currentGlyphs[$firstGlyph];

								if (!isset($glyph->k))
								{
									$glyph->k = array();
								}

								$glyph->k[$secondGlyph] = $kernK;
							}
						}
					}

					break;
			}
		}
		while ($reader->read());

		$nbsp = utf8_encode(chr(0xa0));

		if (!isset($currentGlyphs[$nbsp]) && isset($currentGlyphs[' ']))
		{
			$currentGlyphs[$nbsp] = $currentGlyphs[' '];
		}

		$this->face = $currentFace;
		$this->glyphs = $currentGlyphs;

		return $this;
	}

	/**
	 * @return string
	 */
	public function toJavaScript()
	{
		$data = array(
			'w' => $this->horizAdvX,
			'face' => $this->face,
			'glyphs' => $this->glyphs
		);

		$domains = preg_split('/\s*[, ]\s*/', trim(implode(', ', $this->options['domains'])), -1, PREG_SPLIT_NO_EMPTY);

		if (empty($domains))
		{
			return json_encode($data);
		}

		$domainMap = array();

		foreach ($domains as $domain)
		{
			$domain = preg_quote(preg_replace('@^\w+://@', '', mb_strtolower($domain, 'utf-8')), '/');

			if (substr($domain, 0, 5) === 'www\\.')
			{
				$domain = substr($domain, 5);
			}

			// this is kind of ugly, but we have to make sure that JSEncoder
			// only gets ASCII characters
			$domain = str_replace('\\\\', '\\', substr(json_encode($domain), 1, -1));

			if (substr($domain, 0, 2) === '\\.')
			{
				$domain = '(.+\\.)?' . substr($domain, 2);
			}
			else if (substr($domain, 0, 4) === '\\*\\.')
			{
				$domain = '(.+\\.)?' . substr($domain, 4);
			}

			$domainMap[$domain] = 1;
		}

		$glyphs = $data['glyphs'];

		unset($data['glyphs']);

		uasort($glyphs, array(__CLASS__, 'sortRandom'));

		$encoder = new JSEncoder(
			sprintf('(function(){var b=_cufon_bridge_,c=%s.split(""),i=0,p=b.p,l=p.length,g=b.f.glyphs={};if(b.ok=/^(?:www\\.)?(?:%s)$/i.test(location.hostname))for(;i<l;++i)g[c[i]]=p[i]})()',
				json_encode(implode('', array_keys($glyphs))),
				implode('|', array_keys($domainMap))));

		return sprintf('(function(f){var b=_cufon_bridge_={p:%s,f:f};try{%s}catch(e){}delete _cufon_bridge_;return b.ok&&f})(%s)',
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
			if (isset($charIndex[$unicodeRange]))
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
