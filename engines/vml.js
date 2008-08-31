Cufon.registerEngine('vml', (function() {

	if (!window.opera && window.ActiveXObject) Cufon.set('engine', 'vml');
	
	document.write('<?xml:namespace prefix="v" ns="urn:schemas-microsoft-com:vml" />');
	document.write('<style type="text/css"> v\\:* { behavior: url(#default#VML); } </style>');
	
	// by Dean Edwards
	// works great for small values, such as "1em"
	// but larger values such as "5em" seem to work not so well.
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
	
	function cache(char, glyph, viewBox) {
		var shapeType = document.createElement('v:shapetype');
		glyph.shapeTypeId = shapeType.id = 'cufon-glyph-' + char.charCodeAt(0);
		shapeType.runtimeStyle.cssText = SHAPE_CSS;
		shapeType.stroked = 'f';
		shapeType.coordsize = viewBox.width + ',' + viewBox.height;
		shapeType.coordorigin = viewBox.minX + ',' + viewBox.minY;
		var ensureSize = 'm' + viewBox.minX + ',' + viewBox.minY + ' r' + viewBox.width + ',' + viewBox.height;
		shapeType.path = (glyph.d ? 'm' + glyph.d + 'x' : '') + ensureSize;
		document.body.appendChild(shapeType);
	}
	
	// undocumented stuff: <!--[if gte vml 1]>, <!--[if vml]>
	
	var CANVAS_CSS = 'display: inline-block; position: relative';
	var SHAPE_CSS = 'display: inline-block; behavior: url(#default#VML); antialias: true; position: absolute';

	return function render(font, text, style, options, node) {
	
		var viewBox = font.viewBox, unit = font.baseSize;
		
		var size = new Cufon.CSS.Size(getPixelValue(style.get('fontSize'), node), 'px');
		
		var glyphWidth = size.convert(viewBox.width, unit);
		var glyphHeight = size.convert(viewBox.height, unit);
		
		//var canvas = document.createElement('v:group');
		var canvas = document.createElement('span');
		
		canvas.runtimeStyle.cssText = CANVAS_CSS;
		canvas.runtimeStyle.height = glyphHeight;
		
		var color = style.get('color');
		
		var chars = Cufon.CSS.textTransform(text, style).split('');
		
		// we'll draw a line from the TL corner to the BR corner to force full size, stroke is off so it isn't visible anyway.
		var ensureSize = ' m' + viewBox.minX + ',' + viewBox.minY + ' r' + viewBox.width + ',' + viewBox.height;
		
		var width = 0, offset = viewBox.minX;
		
		for (var i = 0, l = chars.length; i < l; ++i) {
		
			var glyph = font.glyphs[chars[i]] || font.missingGlyph;
			if (!glyph) continue;
			
			cache(chars[i], glyph, viewBox);
			
			var shape = document.createElement('v:shape');
			shape.runtimeStyle.cssText = SHAPE_CSS;
			shape.runtimeStyle.width = glyphWidth;
			shape.runtimeStyle.height = glyphHeight;
			shape.runtimeStyle.left = size.convert(offset, unit);
			shape.stroked = 'f';
			shape.coordsize = viewBox.width + ',' + viewBox.height;
			shape.coordorigin = viewBox.minX + ',' + viewBox.minY;
			shape.fillcolor = color;
			shape.path = (glyph.d ? 'm' + glyph.d + 'x' : '') + ensureSize;
			canvas.appendChild(shape);
			
			width += Number(glyph.w || font.w);
			
			offset += Number(glyph.w || font.w);
			
		}
		
		canvas.runtimeStyle.width = size.convert(width, unit);
		
		return canvas;
		
	}
	
})());