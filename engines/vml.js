Cufon.registerEngine('vml', (function() {

	if (!window.opera && window.ActiveXObject) Cufon.set('engine', 'vml');
	
	// by Dean Edwards
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
	
	var VML_CSS = 'display: inline-block; behavior: url(#default#VML); antialias: true; position: relative';

	return function render(font, text, style, options, node) {
	
		var viewBox = font.viewBox, unit = font.baseSize;
		
		var size = new Cufon.CSS.Size(getPixelValue(style.get('fontSize')), 'px');
		
		var canvas = document.createElement('v:group');
		
		canvas.runtimeStyle.cssText = VML_CSS;
		canvas.runtimeStyle.height = size.convert(viewBox.height, unit);
		
		var color = style.get('color');
		
		var chars = Cufon.CSS.textTransform(text, style).split('');
		
		var width = viewBox.width;
		
		for (var i = 0, l = chars.length; i < l; ++i) {
		
			var glyph = font.glyphs[chars[i]] || font.missingGlyph;
			if (!glyph) continue;
			
			var shape = document.createElement('v:shape');
			shape.runtimeStyle.cssText = VML_CSS;
			shape.runtimeStyle.width = viewBox.width;
			shape.runtimeStyle.height = viewBox.height;
			shape.stroked = 'f';
			shape.coordsize = viewBox.width + ',' + viewBox.height;
			shape.fillcolor = color;
			shape.path = glyph.d;
			canvas.appendChild(shape);
			
			width += Number(glyph.w || font.w);
			
		}
		
		canvas.runtimeStyle.width = size.convert(width, unit);
		canvas.coordsize = width + ',' + viewBox.height;
		
		return canvas;
		
	}
	
})());