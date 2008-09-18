<?php

class VMLPath {
	
	/**
	 * @param string $path
	 * @return VMLPath
	 */
	public static function fromSVG($path)
	{
		if (!preg_match_all('/([a-zA-Z])([0-9. \-,]*)/', $path, $matches, PREG_SET_ORDER))
		{
			return new VMLPath();
		}
		
		$vml = array();
		
		$at = (object) array('x' => 0, 'y' => 0 );
		$cp = (object) array('x' => 0, 'y' => 0 );
		
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
					$vml[] = sprintf('m%d,%d',
						$at->x = $coords[0],
						$at->y = $coords[1]
					);
					break;
				case 'L':
					$vml[] = sprintf('r%d,%d',
						-($at->x - ($at->x = $coords[0])),
						-($at->y - ($at->y = $coords[1]))
					);
					break;
				case 'l':
					$vml[] = sprintf('r%d,%d',
						-($at->x - ($at->x += $coords[0])),
						-($at->y - ($at->y += $coords[1]))
					);
					break;
				case 'H':
					$vml[] = sprintf('r%d,',
						-($at->x - ($at->x = $coords[0]))
					);
					break;
				case 'h':
					$vml[] = sprintf('r%d,',
						-($at->x - ($at->x += $coords[0]))
					);
					break;
				case 'V':
					$vml[] = sprintf('r,%d',
						-($at->y - ($at->y = $coords[0]))
					);
					break;
				case 'v':
					$vml[] = sprintf('r,%d',
						-($at->y - ($at->y += $coords[0]))
					);
					break;
				case 'C':
					$vml[] = sprintf('v%d,%d,%d,%d,%d,%d',
						-($at->x - $coords[0]),
						-($at->y - $coords[1]),
						-($at->x - ($cp->x = $coords[2])),
						-($at->y - ($cp->y = $coords[3])),
						-($at->x - ($at->x = $coords[4])),
						-($at->y - ($at->y = $coords[5]))
					);
					break;
				case 'c':
					$vml[] = sprintf('v%d,%d,%d,%d,%d,%d',
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
					$vml[] = sprintf('v%d,%d,%d,%d,%d,%d',
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
					$vml[] = sprintf('v%d,%d,%d,%d,%d,%d',
						$at->x - $cp->x,
						$at->y - $cp->y,
						-($at->x - ($cp->x = $at->x + $coords[0])),
						-($at->y - ($cp->y = $at->y + $coords[1])),
						-($at->x - ($at->x += $coords[2])),
						-($at->y - ($at->y += $coords[3]))
					);
					break;
				case 'Q':
					$vml[] = sprintf('qb%d,%d,%d,%d',
						$cp->x = $coords[0],
						$cp->y = $coords[1],
						$at->x = $coords[2],
						$at->y = $coords[3]
					);
					break;
				case 'q':
					$vml[] = sprintf('qb%d,%d,%d,%d',
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
					$vml[] = sprintf('qb%d,%d,%d,%d',
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
					$vml[] = sprintf('qb%d,%d,%d,%d',
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
			
			$previous = $cmd;
		}
		
		$vml[] = 'e';
		
		return new VMLPath(implode('', $vml));
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
