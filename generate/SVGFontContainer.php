<?php

require 'SVGFont.php';

class SVGFontContainer implements IteratorAggregate {
	
	/**
	 * @param string $file
	 * @return SVGFont
	 */
	public static function fromFile($file)
	{
		return new SVGFontContainer(simplexml_load_file($file));
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