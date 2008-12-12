<?php

class FontForgeScript {
	
	/**
	 * @var array
	 */
	private $commands = array();
	
	/**
	 * @return void
	 */
	public function __construct()
	{
	}
	
	/**
	 * @return string
	 */
	public function __toString()
	{
		return implode("\n", $this->commands);
	}
	
	/**
	 * @return FontForgeScript
	 */
	public function close()
	{
		$this->commands[] = 'Close()';
		
		return $this;
	}
	
	/**
	 * @fixme Sometimes removes glyphs it shouldn't.
	 * @return FontForgeScript
	 */
	public function clear()
	{
		$this->commands[] = 'Clear()';
		
		return $this;
	}
	
	/**
	 * @return void
	 */
	public function execute()
	{
		$filename = Textendr::getUnusedFilename('.pe');
		
		file_put_contents($filename, $this->__toString());
		
		chmod($filename, 0777);
		
		$command = sprintf('env %s -script %s 2>&1', TEXTENDR_FONTFORGE, escapeshellarg($filename));
		
		Textendr::log('Executing command: %s', $command);
		
		$status = 0;
		
		$output = array();
		
		exec($command, $output, $status);
		
		Textendr::log('Exited with status %d', $status);
		
		unlink($filename);
		
		return $output;
	}
	
	/**
	 * @param string $filename
	 * @return FontForgeScript
	 */
	public function generate($filename)
	{
		$this->commands[] = sprintf('Generate("%s")', addslashes($filename));
		
		return $this;
	}
	
	/**
	 * @param int $at
	 * @return FontForgeScript
	 */
	public function horizontalFlip($at = null)
	{
		$this->commands[] = sprintf('HFlip(%s)', is_int($at) ? $at : '');
		
		return $this;
	}
	
	/**
	 * @param string $filename
	 * @return FontForgeScript
	 */
	public function open($filename)
	{
		$this->commands[] = sprintf('Open("%s")', addslashes($filename));
		
		chmod($filename, 0777);
		
		return $this;
	}
	
/**
	 * @param int $point
	 * @return FontForgeScript
	 */
	public function reduceUnicode($point)
	{
		$this->commands[] = sprintf('SelectFewerSingletons(0u%X)', $point);
		
		return $this;
	}
	
	/**
	 * @param int $from
	 * @param int $to
	 * @return FontForgeScript
	 */
	public function reduceUnicodeRange($from, $to)
	{
		$this->commands[] = sprintf('SelectFewer(0u%X, 0u%X)', $from, $to);
		
		return $this;
	}
	
	/**
	 * @return FontForgeScript
	 */
	public function removeAllKerns()
	{
		$this->commands[] = 'RemoveAllKerns()';
		
		return $this;
	}
	
	/**
	 * @param int $emSize
	 * @return FontForgeScript
	 */
	public function scaleToEm($emSize)
	{
		$this->commands[] = sprintf('ScaleToEm(%d)', $emSize);
	}
	
	/**
	 * @return FontForgeScript
	 */
	public function selectAll()
	{
		$this->commands[] = 'SelectAll()';
		
		return $this;
	}
	
	/**
	 * @return FontForgeScript
	 */
	public function selectInvert()
	{
		$this->commands[] = 'SelectInvert()';
		
		return $this;
	}
	
	/**
	 * @return FontForgeScript
	 */
	public function selectNone()
	{
		$this->commands[] = 'SelectNone()';
		
		return $this;
	}
	
	/**
	 * @param int $point
	 * @return FontForgeScript
	 */
	public function selectUnicode($point)
	{
		$this->commands[] = sprintf('SelectMoreSingletons(0u%X)', $point);
		
		return $this;
	}
	
	/**
	 * @param int $from
	 * @param int $to
	 * @return FontForgeScript
	 */
	public function selectUnicodeRange($from, $to)
	{
		$this->commands[] = sprintf('SelectMore(0u%X, 0u%X)', $from, $to);
		
		return $this;
	}
	
	/**
	 * @return FontForgeScript
	 */
	public function simplify($error = 3)
	{
		$this->commands[] = sprintf('Simplify(1 | 2 | 4 | 8 | 32 | 64, %d)', $error);
		
		return $this;
	}
	
	/**
	 * @param int $at
	 * @return FontForgeScript
	 */
	public function verticalFlip($at = null)
	{
		$this->commands[] = sprintf('VFlip(%s)', is_int($at) ? $at : '');
		
		return $this;
	}
	
}