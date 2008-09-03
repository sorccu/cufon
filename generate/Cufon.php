<?php

class Cufon {
	
	const FONTFORGE = '/opt/local/bin/fontforge';
	const TEMP_DIR = 'tmp/';
	const LOG_FILE = 'cufon.log';
	
	public static function getUnusedFilename($suffix)
	{
		$filename = self::TEMP_DIR . 'cufon_';
		
		do
		{
			$wanted = $filename . uniqid(mt_rand(), true) . $suffix;
		}
		while (file_exists($wanted));
		
		return $wanted;
	}
	
	public static function log($message)
	{
		$args = func_get_args();
		
		array_shift($args);
		
		error_log(sprintf("%s [%s]: %s\n", $_SERVER['REMOTE_ADDR'], date('Y-m-d H:i:s'), vsprintf($message, $args)), 3, self::LOG_FILE);
	}
	
	public static function redirect($to)
	{
		header('HTTP/1.1 303 See Other');
		header('Location: ' . $to);
		exit(0);
	}

}