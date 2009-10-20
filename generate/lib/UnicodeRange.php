<?php

class UnicodeRange {

	/**
	 * @see http://www.w3.org/TR/css3-webfonts/#dataqual
	 *
	 * @param string $range
	 * @return UnicodeRange
	 */
	public static function fromCSSValue($range)
	{
		return new UnicodeRange($range);
	}

	/**
	 * @see http://www.php.net/manual/en/function.ord.php#68914
	 *
	 * @param string $char
	 * @return int
	 */
	public static function getCodePoint($char)
	{
		$cp = unpack('N', mb_convert_encoding($char, 'UCS-4BE', 'UTF-8'));

		return $cp[1];
	}

	/**
	 * @var array
	 */
	private $ranges = array();

	/**
	 * @param string $range
	 * @return void
	 */
	public function __construct($range)
	{
		if ($range === ',')
		{
			$this->ranges[] = self::solve($range);
		}
		else
		{
			foreach (preg_split('/\s*,\s*/', $range, null, PREG_SPLIT_NO_EMPTY) as $part)
			{
				$this->ranges[] = self::solve($part);
			}
		}
	}

	/**
	 * @return string
	 */
	public function asHexString()
	{
		$parts = array();

		foreach ($this->ranges as $range)
		{
			list($start, $end) = $range;

			if ($start === $end)
			{
				$parts[] = sprintf('0x%X', $start);
			}
			else
			{
				$parts[] = sprintf('0x%X-0x%X', $start, $end);
			}
		}

		return implode(',', $parts);
	}

	/**
	 * @param string $char
	 * @return boolean
	 */
	public function contains($char)
	{
		$cp = self::getCodePoint($char);

		foreach ($this->ranges as $range)
		{
			if ($cp >= $range[0] && $cp <= $range[1])
			{
				return true;
			}
		}

		return false;
	}

	/**
	 * @return boolean
	 */
	public function isSimple()
	{
		return count($this->ranges) == 1 && $this->ranges[0][2];
	}

	/**
	 * @param string $range
	 * @return array
	 */
	private static function solve($range)
	{
		if ($range === '-')
		{
			$start = ord($range);

			return array($start, $start, true);
		}

		if (strpos($range, 'U+') !== 0)
		{
			$start = self::getCodePoint($range);

			return array($start, $start, true);
		}

		$stops = explode('-', $range);

		$from = substr(reset($stops), 2);

		if (strpos($from, '?') !== false)
		{
			return array(hexdec(str_replace('?', '0', $from)), hexdec(str_replace('?', 'F', $from)), false);
		}

		$from = hexdec($from);

		if (count($stops) < 2)
		{
			return array($from, $from, false);
		}

		$to = hexdec(substr(end($stops), 2));

		return array($from, $to);
	}

}
