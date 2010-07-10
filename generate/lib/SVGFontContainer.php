<?php

require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'SVGFont.php';

class SVGFontContainer implements Iterator {

	/**
	 * @var string
	 */
	private $file;

	/**
	 * @var XMLReader
	 */
	private $reader;

	/**
	 * @var array
	 */
	private $options;

	/**
	 * @var SVGFont
	 */
	private $currentFont;

	/**
	 * @param string $file
	 * @return void
	 */
	public function __construct($file, array $options)
	{
		$this->file = $file;

		$this->reader = new XMLReader();

		$this->options = $options;
	}

	/**
	 * @return SVGFont
	 */
	public function current()
	{
		$this->currentFont = new SVGFont($this->options);

		$this->currentFont->readFrom($this->reader);

		return $this->currentFont;
	}

	/**
	 * @return string
	 */
	public function key()
	{
		return $this->currentFont->getFaceBasedId();
	}

	/**
	 * @return void
	 */
	public function next()
	{
		do
		{
			if ($this->valid())
			{
				break;
			}
		}
		while ($this->reader->read());
	}

	/**
	 * @return void
	 */
	public function rewind()
	{
		$this->reader->open($this->file, 'utf-8',
			defined('LIBXML_COMPACT')
				? constant('LIBXML_COMPACT')
				: 0);

		while ($this->reader->read())
		{
			if ($this->valid())
			{
				break;
			}
		}
	}

	/**
	 * @return boolean
	 */
	public function valid()
	{
		return $this->reader->nodeType == XMLReader::ELEMENT
			&& $this->reader->name == 'font';
	}

}
