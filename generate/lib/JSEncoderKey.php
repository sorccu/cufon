<?php

class JSEncoderKey implements ArrayAccess, Countable {

	/**
	 * Only 0x3f + 1 (64) values are needed.
	 *
	 * @var array
	 */
	private $salt = array();

	/**
	 * @return void
	 */
	public function __construct()
	{
		$this->salt = str_split('!#$%&()*+,-.0123456789:;=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~', 1);

		shuffle($this->salt);

		array_splice($this->salt, 64);
	}

	/**
	 * @return string
	 */
	public function __toString()
	{
		return implode('', $this->salt);
	}

	/**
	 * @see Countable::count()
	 *
	 * @return int
	 */
	public function count()
	{
		return count($this->salt);
	}

	/**
	 * @see ArrayAccess::offsetExists()
	 *
	 * @param string $offset
	 * @return boolean
	 */
	public function offsetExists($offset)
	{
		return isset($this->salt[$offset]);
	}

	/**
	 * @see ArrayAccess::offsetGet()
	 *
	 * @param string $offset
	 * @return string
	 */
	public function offsetGet($offset)
	{
		return $this->offsetExists($offset) ? $this->salt[$offset] : null;
	}

	/**
	 * @see ArrayAccess::offsetSet()
	 *
	 * @param string $offset
	 * @param string $value
	 * @return void
	 */
	public function offsetSet($offset, $value)
	{
		throw new RuntimeException('JSEncoderKey is immutable');
	}

	/**
	 * @see ArrayAccess::offsetUnset()
	 *
	 * @param string $offset
	 * @return void
	 */
	public function offsetUnset($offset)
	{
		throw new RuntimeException('JSEncoderKey is immutable');
	}

}
