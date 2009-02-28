<?php

require dirname(__FILE__) . DIRECTORY_SEPARATOR . 'SVGFont.php';

class SVGFontContainer implements IteratorAggregate {
	
	/**
	 * @param string $file
	 * @return SVGFont
	 */
	public static function fromFile($file)
	{
		$xml = file_get_contents($file);
		
		// Get rid of unwanted control characters
		$xml = preg_replace('/[\x0E-\x1F]/', '', $xml);
		
		return new SVGFontContainer(simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_COMPACT));
	}

	/**
	 * @var SimpleXMLElement
	 */
	private $document;
	
	/**
	 * @param SimpleXMLElement $document
	 * @return void
	 */
	public function __construct(SimpleXMLElement $document)
	{
		$this->document = $document;
	}
	
	/**
	 * @return array of SVGFont
	 */
	public function getFonts()
	{
		$fonts = array();
		
		foreach ($this->document->xpath('//font') as $font)
		{
			$fonts[] = new SVGFont($font);
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
	
}