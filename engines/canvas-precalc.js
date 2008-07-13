Cufon.registerEngine('canvas-precalc', (function() {

	function generate(path) {
		var code = [];
		var at = { x: 0, y: 0 }, cp = { x: 0, y: 0 };
		var cmds = Cufon.SVG.parsePath(path);
		for (var i = 0, l = cmds.length; i < l; ++i) {
			var cmd = cmds[i].type;
			if (cmd == 'z' || cmd == 'Z') {
				code.push({ m: 'closePath' });
				continue;
			}
			var c = cmds[i].coords;
			switch (cmd) {
				case 'M':
					code.push({ m: 'moveTo', a: [ at.x = c[0], at.y = c[1] ] });
					break;
				case 'L':
					code.push({ m: 'lineTo', a: [ at.x = c[0], at.y = c[1] ] });
					break;
				case 'l':
					code.push({ m: 'lineTo', a: [ at.x += c[0], at.y += c[1] ] });
					break;
				case 'H':
					code.push({ m: 'lineTo', a: [ at.x = c[0], at.y ] });
					break;
				case 'h':
					code.push({ m: 'lineTo', a: [ at.x += c[0], at.y ] });
					break;
				case 'V':
					code.push({ m: 'lineTo', a: [ at.x, at.y = c[0] ] });
					break;
				case 'v':
					code.push({ m: 'lineTo', a: [ at.x, at.y += c[0] ] });
					break;
				case 'C':
					code.push({ m: 'bezierCurveTo', a: [ c[0], c[1], cp.x = c[2], cp.y = c[3], at.x = c[4], at.y = c[5] ] });
					break;
				case 'c':
					code.push({ m: 'bezierCurveTo', a: [ at.x + c[0], at.y + c[1], cp.x = at.x + c[2], cp.y = at.y + c[3], at.x += c[4], at.y += c[5] ] });
					break;
				case 'S':
					if (i == 0 || !/^[CcSs]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
					code.push({ m: 'bezierCurveTo', a: [ at.x + (at.x - cp.x), at.y + (at.y - cp.y), cp.x = c[0], cp.y = c[1], at.x = c[2], at.y = c[3] ] });
					break;
				case 's':
					if (i == 0 || !/^[CcSs]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
					code.push({ m: 'bezierCurveTo', a: [ at.x + (at.x - cp.x), at.y + (at.y - cp.y), cp.x = at.x + c[0], cp.y = at.y + c[1], at.x += c[2], at.y += c[3] ] });
					break;
				case 'Q':
					code.push({ m: 'quadraticCurveTo', a: [ cp.x = c[0], cp.y = c[1], at.x = c[2], at.y = c[3] ] });
					break;
				case 'q':
					code.push({ m: 'quadraticCurveTo', a: [ cp.x = at.x + c[0], cp.y = at.y + c[1], at.x += c[2], at.y += c[3] ] });
					break;
				case 'T':
					if (i == 0 || !/^[QqTt]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
					code.push({ m: 'quadraticCurveTo', a: [ cp.x = at.x + (at.x - cp.x), cp.y = at.y + (at.y - cp.y), at.x = c[0], at.y = c[1] ] });
					break;
				case 't':
					if (i == 0 || !/^[QqTt]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
					code.push({ m: 'quadraticCurveTo', a: [ cp.x = at.x + (at.x - cp.x), cp.y = at.y + (at.y - cp.y), at.x += c[0], at.y += c[1] ] });
					break;
				case 'A':
				case 'a':
					break;
			}
		}
		return code;
	}
	
	function interpret(code, context) {
		for (var i = 0, l = code.length; i < l; ++i) {
			context[code[i].m].apply(context, code[i].a);
		}
	}

	return function(font, text, style, options, node) {
	
		var viewBox = font.viewBox;
		var unit = font.face['units-per-em'];
		var size = parseInt(style.get('fontSize', 'px'), 10);
		var boundingBox = {
			offsetX: viewBox.minX / unit * size,
			height: viewBox.height / unit * size
		};
		var pxScale = unit / size;
		
		var letterSpacing = pxScale * parseInt(style.get('letterSpacing'), 10) || 0;
		var wordSpacing = pxScale * parseInt(style.get('wordSpacing'), 10) || 0;
		
		var chars = Cufon.CSS.textTransform(text, style).split('');
		var width = -viewBox.minX, lastWidth;
		
		for (var j = 0, k = chars.length; j < k; ++j) {
			width += lastWidth = Number((font.glyphs[chars[j]] || font.missingGlyph).h || font.h) + letterSpacing;
		}
		
		var extraWidth = viewBox.width - lastWidth;
		
		width += extraWidth;
		
		// @todo fix line-height with negative top/bottom margins
		
		var canvas = document.createElement('canvas');
		
		canvas.className = 'cufon';
		canvas.width = width / unit * size;
		canvas.height = boundingBox.height;
		
		if (options.fontScaling) {
			canvas.style.marginLeft = (viewBox.minX / unit) + 'em';
			canvas.style.marginRight = (-extraWidth / unit) + 'em';
			canvas.style.width = (width / unit) + 'em';
			canvas.style.height = (viewBox.height / unit) + 'em';
		}
		else {
			canvas.style.marginLeft = (viewBox.minX / unit * size) + 'px';
			canvas.style.marginRight = (-extraWidth / unit * size) + 'px';
		}
		
		var buffer = [];
		
		var g = canvas.getContext('2d');
		var scale = boundingBox.height / viewBox.height;
		
		g.scale(scale, scale);
		g.translate(-viewBox.minX, -viewBox.minY);
		
		if (options.textDecoration) textDecoration: for (var search = node, decoStyle = style; search.parentNode && search.parentNode.nodeType == 1; ) {
		
			var line = function(y, color, invert) {
				g.strokeStyle = color;
				
				g.beginPath();
				g.lineWidth = font.face['underline-thickness'];
				
				g.moveTo(0, y);
				g.lineTo((invert ? -1 : 1) * (width - extraWidth + viewBox.minX), y);
				
				g.stroke();
			}
		
			search = search.parentNode;
		
			switch (decoStyle.get('textDecoration')) {
			
				case 'underline':
				
					line(-font.face['underline-position'], decoStyle.get('color'));
					
					break textDecoration;
					
				case 'overline':
				
					line(-font.face['ascent'], decoStyle.get('color'));
					
					break textDecoration;
					
				case 'line-through':
				
					buffer.push(function() {
						line(font.face['descent'], decoStyle.get('color'), true);
					});
					
					break textDecoration;
					
				case 'none':
				
					decoStyle = Cufon.CSS.getStyle(search);
				
					break;
			}
		
		}
		
		g.fillStyle = g.strokeStyle = style.get('color');
		
		for (var j = 0, k = chars.length; j < k; ++j) {
			var char = chars[j];
			if (!font.glyphs[char] && !font.missingGlyph) continue;
			var glyph = font.glyphs[char] || font.missingGlyph;
			g.beginPath();
			if (glyph.d) {
				if (!glyph.code) glyph.code = generate(glyph.d);
				interpret(glyph.code, g);
			}
			g.fill();
			g.translate(Number(glyph.h || font.h) + letterSpacing, 0);
		}
					
		for (var fn; fn = buffer.shift(); fn());
		
		return canvas;
		
	}
	
})());