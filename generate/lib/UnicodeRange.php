<?php

class UnicodeRange {
	
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
			foreach (explode(',', $range) as $part)
			{
				$this->ranges[] = self::solve($part);
			}
		}
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
			return array(hexdec($from), hexdec(str_replace('?', 'F', $from)), false);
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