Cufon.registerEngine('canvas', (function() {

	Cufon.set('engine', 'canvas');

	function generateFromVML(path, context) {
		var at = { x: 0, y: 0 }, cp = { x: 0, y: 0 };
		var cmds = Cufon.VML.parsePath(path);
		var code = new Array(cmds.length - 1);
		generate: for (var i = 0, l = cmds.length; i < l; ++i) {
			var c = cmds[i].coords;
			switch (cmds[i].type) {
				case 'v':
					code[i] = { m: 'bezierCurveTo', a: [ at.x + Number(c[0]), at.y + Number(c[1]), cp.x = at.x + Number(c[2]), cp.y = at.y + Number(c[3]), at.x += Number(c[4]), at.y += Number(c[5]) ] };
					break;
				case 'qb':
					code[i] = { m: 'quadraticCurveTo', a: [ cp.x = Number(c[0]), cp.y = Number(c[1]), at.x = Number(c[2]), at.y = Number(c[3]) ] };
					break;
				case 'r':
					code[i] = { m: 'lineTo', a: [ at.x += Number(c[0]), at.y += Number(c[1]) ] };
					break;
				case 'm':
					code[i] = { m: 'moveTo', a: [ at.x = Number(c[0]), at.y = Number(c[1]) ] };
					break;
				case 'x':
					code[i] = { m: 'closePath' };
					break;
				case 'e':
					break generate;
			}
			if (context) context[code[i].m].apply(context, code[i].a);
		}
		return code;
	}
	
	function interpret(code, context) {
		for (var i = 0, l = code.length; i < l; ++i) {
			context[code[i].m].apply(context, code[i].a);
		}
	}

	return function render(font, text, style, options, node) {
	
		var viewBox = font.viewBox, unit = font.baseSize;
		
		var size = style.getSize('fontSize');
		
		var spacing = {
			letter: 0,
			word: 0
		};
		
		var chars = Cufon.CSS.textTransform(text, style).split('');
		
		var width = -viewBox.minX, lastWidth;
		
		for (var j = 0, k = chars.length; j < k; ++j) {
			var glyph = font.glyphs[chars[j]] || font.missingGlyph;
			if (!glyph) continue;
			width += lastWidth = Number(glyph.w || font.w) + spacing.letter;
		}
		
		if (!lastWidth) return null;
		
		var extraWidth = viewBox.width - lastWidth;
		
		width += extraWidth;
		
		// @todo fix line-height with negative top/bottom margins
		
		var canvas = document.createElement('canvas');
		
		canvas.className = 'cufon cufon-canvas';
		canvas.appendChild(document.createTextNode(text));
		
		var scale = size.convert(viewBox.height, unit) / viewBox.height;
		
		if (options.fontScaling) {
			canvas.width = size.convert(width, unit) * options.fontScale;
			canvas.height = size.convert(viewBox.height, unit) * options.fontScale;
			canvas.style.marginLeft = (viewBox.minX / unit) + 'em';
			canvas.style.marginRight = (-extraWidth / unit) + 'em';
			canvas.style.width = (width / unit) + 'em';
			canvas.style.height = (viewBox.height / unit) + 'em';
			scale *= options.fontScale;
		}
		else {
			canvas.width = size.convert(width, unit);
			canvas.height = size.convert(viewBox.height, unit);
			canvas.style.marginLeft = size.convert(viewBox.minX, unit) + size.unit;
			canvas.style.marginRight = size.convert(-extraWidth, unit) + size.unit;
		}
		
		var buffer = [];
		
		var g = canvas.getContext('2d');
		
		g.scale(scale, scale);
		g.translate(-viewBox.minX, -viewBox.minY);
		
		function line(y, color, invert) {
			g.strokeStyle = color;
			
			g.beginPath();
			g.lineWidth = font.face['underline-thickness'];
			
			g.moveTo(0, y);
			g.lineTo((invert ? -1 : 1) * (width - extraWidth + viewBox.minX), y);
			
			g.stroke();
		}
		
		if (options.textDecoration) textDecoration: for (var search = node, decoStyle = style; search.parentNode && search.parentNode.nodeType == 1; ) {
		
			search = search.parentNode;
		
			switch (decoStyle.get('textDecoration')) {
			
				case 'underline':
				
					line(-font.face['underline-position'], decoStyle.get('color'));
					
					break textDecoration;
					
				case 'overline':
				
					line(-font.face['ascent'], decoStyle.get('color'));
					
					break textDecoration;
					
				case 'line-through':
				
					buffer.push(function lineThrough() {
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
			var glyph = font.glyphs[chars[j]] || font.missingGlyph;
			if (!glyph) continue;
			g.beginPath();
			if (glyph.d) {
				if (!glyph.code) glyph.code = generateFromVML('m' + glyph.d + 'x', g);
				else interpret(glyph.code, g);
			}
			g.fill();
			g.translate(Number(glyph.w || font.w) + spacing.letter, 0);
		}
		
		for (var fn; fn = buffer.shift(); fn());
		
		return canvas;
			
	}
	
})());