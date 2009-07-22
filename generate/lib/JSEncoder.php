<?php

require_once dirname(__FILE__) . DIRECTORY_SEPARATOR . 'JSEncoderKey.php';

class JSEncoder {

	/**
	 * @var JSEncoderKey
	 */
	private $key;

	/**
	 * @var string
	 */
	private $encoded = '';

	/**
	 * @param string $str
	 * @return void
	 */
	public function __construct($str)
	{
		$this->key = new JSEncoderKey();

		$this->encoded = $this->encode($str);
	}

	/**
	 * Based on Base64. Idea stolen from an old trojan, author unknown.
	 *
	 * @param string $str
	 * @return string
	 */
	private function encode($str)
	{
		$length = strlen($str);

		$pad = $length % 3;

		if ($pad)
		{
			$length += 3 - $pad;
		}

		$str = str_pad($str, $length, ' ');

		$value = '';

		for ($i = 0; $i < $length - 2; $i += 3)
		{
			$mask = (ord($str{$i}) << 16 & 0xff0000) + (ord($str{$i + 1}) << 8 & 0xff00) + (ord($str{$i + 2}) & 0xff);

			$bits = array(
				($mask & 0xfc0000) >> 18,
				($mask & 0x3f000) >> 12,
				($mask & 0xfc0) >> 6,
				($mask & 0x3f)
			);

			$value .= $this->key[$bits[0]] . $this->key[$bits[1]] . $this->key[$bits[2]] . $this->key[$bits[3]];
		}

		return $value;
	}

	/**
	 * @return string
	 */
	public function getDecoder()
	{
		$keyOffset = mt_rand(0, strlen($this->encoded));

		$data = substr($this->encoded, 0, $keyOffset) . $this->key . substr($this->encoded, $keyOffset);

		$decoder =
			'function(s){var c="charAt",i="indexOf",a=String(arguments.cal' .
			'lee).replace(/\s+/g,""),z=s.length+%d-a.length+(a.charCodeAt(' .
			'0)==40&&2),w=64,k=s.substring(z,w+=z),v=s.substr(0,z)+s.subst' .
			'r(w),m=0,t="",x=0,y=v.length,d=document,h=d.getElementsByTagN' .
			'ame("head")[0],e=d.createElement("script");for(;x<y;++x){m=(k' .
			'[i](v[c](x))&255)<<18|(k[i](v[c](++x))&255)<<12|(k[i](v[c](++' .
			'x))&255)<<6|k[i](v[c](++x))&255;t+=String.fromCharCode((m&167' .
			'11680)>>16,(m&65280)>>8,m&255);}e.text=t;h.insertBefore(e,h.f' .
			'irstChild);h.removeChild(e);}';

		$predictedSize = self::getInjectedSize(strlen($decoder) - 3);

		$blocker = $keyOffset - strlen($data) + $predictedSize;

		$lengthBeforeAdjustment = strlen($blocker);

		$blocker += $lengthBeforeAdjustment - strlen($predictedSize);

		do
		{
			$blocker -= $lengthBeforeAdjustment - strlen($blocker);

			$sizeChanged = strlen($blocker) !== $lengthBeforeAdjustment;

			$lengthBeforeAdjustment = strlen($blocker);
		}
		while ($sizeChanged);

		return sprintf('(%s)(%s)', sprintf($decoder, $blocker), json_encode($data));
	}

	/**
	 * @param string $str
	 * @return int
	 */
	private static function getInjectedSize($size)
	{
		$length = $size + strlen($size);

		$length += strlen($length) - strlen($size);

		return $length;
	}

}
