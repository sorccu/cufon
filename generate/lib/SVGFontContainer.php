<?php

require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'SVGFont.php';

class SVGFontContainer implements IteratorAggregate {

	/**
	 * @param string $file
	 * @return SVGFont
	 */
	public static function fromFile($file, array $options)
	{
		$xml = file_get_contents($file);

		// Get rid of unwanted control characters
		// (only allow Tab, LF and CR)
		$xml = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $xml);

		$params = defined('LIBXML_COMPACT') ? constant('LIBXML_COMPACT') : 0;

		return new SVGFontContainer(simplexml_load_string($xml, 'SimpleXMLElement', $params), $options);
	}

	/**
	 * @var SimpleXMLElement
	 */
	private $document;

	/**
	 * @var array
	 */
	private $options;

	/**
	 * @param SimpleXMLElement $document
	 * @return void
	 */
	public function __construct(SimpleXMLElement $document, array $options)
	{
		$this->document = $document;

		$this->options = $options;
	}

	/**
	 * @return array of SVGFont
	 */
	public function getFonts()
	{
		$fonts = array();

		foreach ($this->document->xpath('//font') as $font)
		{
			$fonts[] = new SVGFont($font, $this);
		}

		return $fonts;
	}

	/**
	 * @see IteratorAggregate::getIterator()
	 * @return ArrayIterator
	 */
	public function getIterator()
	{
		return new ArrayIterator($this->getFonts());
	}

	/**
	 * @return array
	 */
	public function getOptions()
	{
		return $this->options;
	}

}
