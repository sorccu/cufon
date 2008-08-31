Cufon.registerEngine('vml', (function() {

	if (!window.opera && window.ActiveXObject) Cufon.set('engine', 'vml');
	
	document.write('<?xml:namespace prefix="v" ns="urn:schemas-microsoft-com:vml" />');
	document.write('<style type="text/css"> v\\:* { behavior: url(#default#VML); } </style>');
	
	// by Dean Edwards
	// works great for small values, such as "1em"
	// but larger values such as "5em" seem to work not so well.
	// @todo fix
	function getPixelValue(value, node) {
		if (/px$/.test(value)) return parseInt(value, 10);
		var el = node.nodeType == 1 ? node : node.parentNode;
		var style = el.style.left, runtimeStyle = el.runtimeStyle.left;
		el.runtimeStyle.left = el.currentStyle.left;
		el.style.left = value || 0;
		value = el.style.pixelLeft;
		el.style.left = style;
		el.runtimeStyle.left = runtimeStyle;
		return value;
	}
	
	var typeIndex = 0;
	
	function createType(glyph, viewBox) {
		var shapeType = document.createElement('v:shapetype');
		shapeType.id = 'cufon-glyph-' + typeIndex++;
		glyph.typeRef = '#' + shapeType.id;
		shapeType.stroked = 'f';
		shapeType.coordsize = viewBox.width + ',' + viewBox.height;
		shapeType.coordorigin = viewBox.minX + ',' + viewBox.minY;
		var ensureSize = 'm' + viewBox.minX + ',' + viewBox.minY + ' r' + viewBox.width + ',' + viewBox.height;
		shapeType.path = (glyph.d ? 'm' + glyph.d + 'x' : '') + ensureSize;
		document.body.appendChild(shapeType);
	}
	
	// undocumented stuff: <!--[if gte vml 1]>, <!--[if vml]>
	
	var CANVAS_CSS = 'display: inline-block; position: relative';
	var SHAPE_CSS = 'display: inline-block; antialias: true; position: absolute';

	return function render(font, text, style, options, node) {
	
		// @todo letter-/word-spacing, text-decoration
	
		var viewBox = font.viewBox, unit = font.baseSize;
		
		var size = new Cufon.CSS.Size(getPixelValue(style.get('fontSize'), node), 'px');
		
		var glyphWidth = size.convert(viewBox.width, unit);
		var glyphHeight = size.convert(viewBox.height, unit);
		
		var canvas = document.createElement('span');
		
		canvas.className = 'cufon cufon-vml';
		
		canvas.runtimeStyle.cssText = CANVAS_CSS;
		canvas.runtimeStyle.height = glyphHeight;
		
		var color = style.get('color');
		
		var chars = Cufon.CSS.textTransform(text, style).split('');
		
		var width = 0, offset = viewBox.minX;
		
		for (var i = 0, l = chars.length; i < l; ++i) {
		
			var glyph = font.glyphs[chars[i]] || font.missingGlyph;
			if (!glyph) continue;
			
			if (!glyph.typeRef) createType(glyph, viewBox);
			
			var shape = document.createElement('v:shape');
			shape.type = glyph.typeRef;
			shape.runtimeStyle.cssText = SHAPE_CSS;
			shape.runtimeStyle.width = glyphWidth;
			shape.runtimeStyle.height = glyphHeight;
			shape.runtimeStyle.left = size.convert(offset, unit);
			shape.fillcolor = color;
			canvas.appendChild(shape);
			
			var advance = Number(glyph.w || font.w);
			
			width += advance;
			offset += advance;
			
		}
		
		canvas.runtimeStyle.width = size.convert(width, unit);
				
		return canvas;
		
	}
	
})());