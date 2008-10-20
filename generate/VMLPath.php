<?php

class VMLPath {
	
	/**
	 * @param string $path
	 * @return VMLPath
	 */
	public static function fromSVG($path)
	{
		$matches = array();
		
		if (!preg_match_all('/([a-zA-Z])([0-9. \-,]*)/', $path, $matches, PREG_SET_ORDER))
		{
			return new VMLPath();
		}
		
		$vml = array();
		
		$at = (object) array('x' => 0, 'y' => 0);
		$cp = (object) array('x' => 0, 'y' => 0);
		
		$previous = null;
		
		foreach ($matches as $set)
		{
			list($cmd, $coords) = array($set[1], array_map('floatval', preg_split('/(?:,|\s+)/', trim($set[2]))));
			
			switch ($cmd)
			{
				case 'z':
				case 'Z':
					$vml[] = 'x';
					break;
				case 'M':
					$vml[] = self::path('m',
						$at->x = $coords[0],
						$at->y = $coords[1]
					);
					break;
				case 'L':
					$vml[] = self::path('r',
						-($at->x - ($at->x = $coords[0])),
						-($at->y - ($at->y = $coords[1]))
					);
					break;
				case 'l':
					$vml[] = self::path('r',
						-($at->x - ($at->x += $coords[0])),
						-($at->y - ($at->y += $coords[1]))
					);
					break;
				case 'H':
					$vml[] = self::path('r',
						-($at->x - ($at->x = $coords[0])),
						0
					);
					break;
				case 'h':
					$vml[] = self::path('r',
						-($at->x - ($at->x += $coords[0])),
						0
					);
					break;
				case 'V':
					$vml[] = self::path('r',
						0,
						-($at->y - ($at->y = $coords[0]))
					);
					break;
				case 'v':
					$vml[] = self::path('r',
						0,
						-($at->y - ($at->y += $coords[0]))
					);
					break;
				case 'C':
					$vml[] = self::path('v',
						-($at->x - $coords[0]),
						-($at->y - $coords[1]),
						-($at->x - ($cp->x = $coords[2])),
						-($at->y - ($cp->y = $coords[3])),
						-($at->x - ($at->x = $coords[4])),
						-($at->y - ($at->y = $coords[5]))
					);
					break;
				case 'c':
					$vml[] = self::path('v',
						$coords[0],
						$coords[1],
						-($at->x - ($cp->x = $at->x + $coords[2])),
						-($at->y - ($cp->y = $at->y + $coords[3])),
						-($at->x - ($at->x += $coords[4])),
						-($at->y - ($at->y += $coords[5]))
					);
					break;
				case 'S':
					if (!$previous || !preg_match('/^[CcSs]$/', $previous))
					{
						$cp->x = $at->x;
						$cp->y = $at->y;
					}
					$vml[] = self::path('v',
						$at->x - $cp->x,
						$at->y - $cp->y,
						-($at->x - ($cp->x = $coords[0])),
						-($at->y - ($cp->y = $coords[1])),
						-($at->x - ($at->x = $coords[2])),
						-($at->y - ($at->y = $coords[3]))
					);
					break;
				case 's':
					if (!$previous || !preg_match('/^[CcSs]$/', $previous))
					{
						$cp->x = $at->x;
						$cp->y = $at->y;
					}
					$vml[] = self::path('v',
						$at->x - $cp->x,
						$at->y - $cp->y,
						-($at->x - ($cp->x = $at->x + $coords[0])),
						-($at->y - ($cp->y = $at->y + $coords[1])),
						-($at->x - ($at->x += $coords[2])),
						-($at->y - ($at->y += $coords[3]))
					);
					break;
				case 'Q':
					$vml[] = self::path('v', self::quadraticBezierToCubic(
						$at->x,
						$at->y,
						$cp->x = $coords[0],
						$cp->y = $coords[1],
						$at->x = $coords[2],
						$at->y = $coords[3]
					));
					break;
				case 'q':
					$vml[] = self::path('v', self::quadraticBezierToCubic(
						$at->x,
						$at->y,
						$cp->x = $at->x + $coords[0],
						$cp->y = $at->y + $coords[1],
						$at->x += $coords[2],
						$at->y += $coords[3]
					));
					break;
				case 'T':
					if (!$previous || !preg_match('/^[QqTt]$/', $previous))
					{
						$cp->x = $at->x;
						$cp->y = $at->y;
					}
					$vml[] = self::path('v', self::quadraticBezierToCubic(
						$at->x,
						$at->y,
						$cp->x = $at->x + ($at->x - $cp->x),
						$cp->y = $at->y + ($at->y - $cp->y),
						$at->x = $coords[0],
						$at->y = $coords[1]
					));
					break;
				case 't':
					if (!$previous || !preg_match('/^[QqTt]$/', $previous))
					{
						$cp->x = $at->x;
						$cp->y = $at->y;
					}
					$vml[] = self::path('v', self::quadraticBezierToCubic(
						$at->x,
						$at->y,
						$cp->x = $at->x + ($at->x - $cp->x),
						$cp->y = $at->y + ($at->y - $cp->y),
						$at->x += $coords[0],
						$at->y += $coords[1]
					));
					break;
				case 'A':
				case 'a':
					break;
				
			}
			
			$previous = $cmd;
		}
		
		$vml[] = 'e';
		
		return new VMLPath(implode('', $vml));
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
	 * @return array
	 */
	private static function quadraticBezierToCubic($atX, $atY, $cpX, $cpY, $toX, $toY)
	{
		$cp1 = (object) array(
			'x' => $atX + 2 / 3 * ($cpX - $atX),
			'y' => $atY + 2 / 3 * ($cpY - $atY)
		);
	
		$cp2 = (object) array(
			'x' => $cp1->x + ($toX - $atX) / 3,
			'y' => $cp1->y + ($toY - $atY) / 3
		);
		
		return array(
			$cp1->x - $atX,
			$cp1->y - $atY,
			$cp2->x - $atX,
			$cp2->y - $atY,
			$toX - $atX,
			$toY - $atY
		);
	}
	
	/**
	 * Returns a shortened VML path part
	 *
	 * @param string $type
	 * @param mixed $coords
	 * @return string
	 */
	private static function path($type, $coords)
	{
		if (!is_array($coords))
		{
			$coords = func_get_args();
			
			array_shift($coords);
		}
		
		$parts = array();
		
		foreach ($coords as $coord)
		{
			$parts[] = $coord === 0 ? '' : round($coord, 1);
		}
		
		return $type . implode(',', $parts);
	}
	
	/**
	 * @var string
	 */
	public $path;

	/**
	 * @param string $path
	 * @return void
	 */
	public function __construct($path = '')
	{
		$this->path = $path;
	}
	
	/**
	 * @return string
	 */
	public function __toString()
	{
		return $this->path;
	}
	
}
