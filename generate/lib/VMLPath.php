<?php

class VMLPath {

	/**
	 * @param string $type
	 * @param array $coords
	 * @return string
	 */
	private static function commandToString($type, $coords)
	{
		if (!is_array($coords))
		{
			$coords = func_get_args();

			array_shift($coords);
		}

		return $type . implode(',', $coords);
	}

	/**
	 * @param string $path
	 * @return VMLPath
	 */
	public static function fromSVG($path)
	{
		$vml = new VMLPath();

		$matches = array();

		if (!preg_match_all('/([a-zA-Z])([0-9. \-,]*)/', $path, $matches, PREG_SET_ORDER))
		{
			return $vml;
		}

		$at = (object) array('x' => 0, 'y' => 0);
		$cp = (object) array('x' => 0, 'y' => 0);

		$previous = null;

		$zm = false;

		for (; $set = current($matches); next($matches))
		{
			list($cmd, $coords) = array($set[1], array_map('floatval', preg_split('/(?:,|\s+)/', trim($set[2]))));

			switch ($cmd)
			{
				case 'z':
				case 'Z':
					if (strcasecmp($previous, 'm') === 0)
					{
						$vml->pop();
					}
					if ($zm) // ignore chained zm-commands
					{
						$vml->pop();
					}
					$vml->closePath();
					break;
				case 'M':
					if (strcasecmp($previous, 'm') === 0)
					{
						$vml->pop();
					}
					$vml->moveTo(
						$at->x = $coords[0],
						$at->y = $coords[1]
					);
					break;
				case 'L':
					$vml->lineTo(
						$at->x = $coords[0],
						$at->y = $coords[1]
					);
					break;
				case 'l':
					$vml->lineTo(
						$at->x += $coords[0],
						$at->y += $coords[1]
					);
					break;
				case 'H':
					$vml->lineTo(
						$at->x = $coords[0],
						$at->y
					);
					break;
				case 'h':
					$vml->lineTo(
						$at->x += $coords[0],
						$at->y
					);
					break;
				case 'V':
					$vml->lineTo(
						$at->x,
						$at->y = $coords[0]
					);
					break;
				case 'v':
					$vml->lineTo(
						$at->x,
						$at->y += $coords[0]
					);
					break;
				case 'C':
					$vml->bezierCurveTo(
						$coords[0],
						$coords[1],
						$cp->x = $coords[2],
						$cp->y = $coords[3],
						$at->x = $coords[4],
						$at->y = $coords[5]
					);
					break;
				case 'c':
					$vml->bezierCurveTo(
						$at->x + $coords[0],
						$at->y + $coords[1],
						$cp->x = $at->x + $coords[2],
						$cp->y = $at->y + $coords[3],
						$at->x += $coords[4],
						$at->y += $coords[5]
					);
					break;
				case 'S':
					if (!$previous || !preg_match('/^[CcSs]$/', $previous))
					{
						$cp->x = $at->x;
						$cp->y = $at->y;
					}
					$vml->bezierCurveTo(
						$at->x + ($at->x - $cp->x),
						$at->y + ($at->y - $cp->y),
						$cp->x = $coords[0],
						$cp->y = $coords[1],
						$at->x = $coords[2],
						$at->y = $coords[3]
					);
					break;
				case 's':
					if (!$previous || !preg_match('/^[CcSs]$/', $previous))
					{
						$cp->x = $at->x;
						$cp->y = $at->y;
					}
					$vml->bezierCurveTo(
						$at->x + ($at->x - $cp->x),
						$at->y + ($at->y - $cp->y),
						$cp->x = $at->x + $coords[0],
						$cp->y = $at->y + $coords[1],
						$at->x += $coords[2],
						$at->y += $coords[3]
					);
					break;
				case 'Q':
					$vml->quadraticCurveTo(
						$cp->x = $coords[0],
						$cp->y = $coords[1],
						$at->x = $coords[2],
						$at->y = $coords[3]
					);
					break;
				case 'q':
					$vml->quadraticCurveTo(
						$cp->x = $at->x + $coords[0],
						$cp->y = $at->y + $coords[1],
						$at->x += $coords[2],
						$at->y += $coords[3]
					);
					break;
				case 'T':
					if (!$previous || !preg_match('/^[QqTt]$/', $previous))
					{
						$cp->x = $at->x;
						$cp->y = $at->y;
					}
					$vml->quadraticCurveTo(
						$cp->x = $at->x + ($at->x - $cp->x),
						$cp->y = $at->y + ($at->y - $cp->y),
						$at->x = $coords[0],
						$at->y = $coords[1]
					);
					break;
				case 't':
					if (!$previous || !preg_match('/^[QqTt]$/', $previous))
					{
						$cp->x = $at->x;
						$cp->y = $at->y;
					}
					$vml->quadraticCurveTo(
						$cp->x = $at->x + ($at->x - $cp->x),
						$cp->y = $at->y + ($at->y - $cp->y),
						$at->x += $coords[0],
						$at->y += $coords[1]
					);
					break;
				case 'A':
				case 'a':
					break;

			}

			$zm = strcasecmp($cmd, 'm') === 0 && strcasecmp($previous, 'z') === 0;

			$previous = $cmd;
		}

		$vml->endPath();

		return $vml;
	}

	private $parts = array();

	private $atX = 0;
	private $atY = 0;

	private $cpX = 0;
	private $cpY = 0;

	private $remainderX = 0;
	private $remainderY = 0;

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
		return implode('', $this->parts);
	}

	/**
	 * @param float $cp1x
	 * @param float $cp1y
	 * @param float $cp2x
	 * @param float $cp2y
	 * @param float $toX
	 * @param float $toY
	 * @return VMLPath
	 */
	public function bezierCurveTo($cp1x, $cp1y, $cp2x, $cp2y, $toX, $toY)
	{
		$this->parts[] = $this->draw('v', $cp1x, $cp1y, $cp2x, $cp2y, $toX, $toY);

		return $this;
	}

	/**
	 * @return VMLPath
	 */
	public function closePath()
	{
		$this->parts[] = 'x';

		return $this;
	}

	/**
	 * Returns a shortened, relative VML path part
	 *
	 * @param string $type
	 * @param mixed $coords
	 * @return string
	 */
	private function draw($type, $coords)
	{
		if (!is_array($coords))
		{
			$coords = func_get_args();

			array_shift($coords);
		}

		$toY = array_pop($coords);
		$toX = array_pop($coords);

		$parts = array();

		foreach ($coords as $i => $coord)
		{
			$parts[] = $coord === 0 ? '' : round($coord - ($i % 2 ? $this->atY : $this->atX));
		}

		$parts[] = $this->moveX($toX);
		$parts[] = $this->moveY($toY);

		return self::commandToString($type, $parts);
	}

	/**
	 * @return VMLPath
	 */
	public function endPath()
	{
		$this->parts[] = 'e';

		return $this;
	}

	/**
	 * @param float $toX
	 * @param float $toY
	 * @return VMLPath
	 */
	public function lineTo($toX, $toY)
	{
		$this->parts[] = $this->draw('r', $toX, $toY);

		return $this;
	}

	/**
	 * @param float $toX
	 * @param float $toY
	 * @return VMLPath
	 */
	public function moveTo($toX, $toY)
	{
		$this->moveX($toX);
		$this->moveY($toY);

		$this->parts[] = self::commandToString('m', $this->atX, $this->atY);

		return $this;
	}

	/**
	 * @param float $to
	 * @return int
	 */
	private function moveX($to)
	{
		$delta = $to - $this->atX;

		$rounded = round($delta);

		$this->atX += $rounded;

		return $rounded;
	}

	/**
	 * @param float $to
	 * @return int
	 */
	private function moveY($to)
	{
		$delta = $to - $this->atY;

		$rounded = round($delta);

		$this->atY += $rounded;

		return $rounded;
	}

	/**
	 * Removes the last point from the path. Note: this does NOT
	 * reset atX, atY and others to their prior values.
	 *
	 * @return VMLPath
	 */
	public function pop()
	{
		array_pop($this->parts);

		return $this;
	}

	/**
	 * IE has some trouble drawing quadratic beziers so we'll just convert
	 * them to cubic ones which it can handle just fine.
	 *
	 * @link http://developer.mozilla.org/en/Canvas_tutorial/Drawing_shapes#Firefox_1.5_quadraticCurveTo()_bug_workaround
	 * @param float $atX
	 * @param float $atY
	 * @param float $cpX
	 * @param float $cpY
	 * @param float $toX
	 * @param float $toY
	 * @return VMLPath
	 */
	private function quadraticCurveTo($cpX, $cpY, $toX, $toY)
	{
		$cp1 = (object) array(
			'x' => $this->atX + 2 / 3 * ($cpX - $this->atX),
			'y' => $this->atY + 2 / 3 * ($cpY - $this->atY)
		);

		$cp2 = (object) array(
			'x' => $cp1->x + ($toX - $this->atX) / 3,
			'y' => $cp1->y + ($toY - $this->atY) / 3
		);

		return $this->bezierCurveTo(
			$cp1->x,
			$cp1->y,
			$cp2->x,
			$cp2->y,
			$toX,
			$toY
		);
	}

}
