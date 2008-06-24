var Cufon = new function() {

	this.Engines = {
	
		vml: function(font, text, style, options, node) {
		},
		
		svg: function(font, char, style) {
			if (!font.glyphs[char] && !font.missingGlyph) return;
			var glyph = font.glyphs[char] || font.missingGlyph;
			var viewBox = getViewBox(font, glyph);
			var scale = font.face['units-per-em'];
			var size = parseInt(style.fontSize, 10);
			var boundingBox = {
				offsetX: viewBox.minX / scale * size,
				width: viewBox.width / scale * size,
				height: viewBox.height / scale * size
			};
			var svg =
				'<?xml version="1.0" standalone="yes"?>' +
				'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
				'<svg width="' + boundingBox.width + 'px" viewBox="' + viewBox.toString() + '" xmlns="http://www.w3.org/2000/svg" version="1.1">' +
					'<path fill="' + style.color + '" d="' + glyph.d + '" />' +
				'</svg>';
			var container = document.createElement('object');
			container.setAttribute('type', 'image/svg+xml');
			container.setAttribute('width', boundingBox.width);
			container.setAttribute('height', boundingBox.height);
			container.setAttribute('data', 'data:image/svg+xml,' + svg);
			container.style.overflow = 'hidden';
			container.style.marginLeft = boundingBox.offsetX + 'px'
			container.appendChild(document.createTextNode(char));
			return container;
		},
		
		'inline-svg': function(font, text, style, options, node) {
		},
		
		canvas: function(font, text, style, options, node) {
		
			var viewBox = font.viewBox;
			var unit = font.face['units-per-em'];
			var size = parseInt(style.fontSize, 10);
			var boundingBox = {
				offsetX: viewBox.minX / unit * size,
				height: viewBox.height / unit * size
			};
			
			var canvas = document.createElement('canvas');
			
			var chars = CSS.textTransform(text, style).split('');
			var width = -viewBox.minX, lastWidth;
			
			for (var j = 0, k = chars.length; j < k; ++j) {
				width += lastWidth = Number((font.glyphs[chars[j]] || font.missingGlyph).h || font.h);
			}
			
			var cssUnit = options.fontScaling ? 'em' : 'px';
			
			var extraWidth = viewBox.width - lastWidth;
			
			width += extraWidth;
			
			canvas.className = 'cufon';
			canvas.style.marginLeft = CSS.convertSize(viewBox.minX / unit, cssUnit, size);
			canvas.style.marginRight = CSS.convertSize(-extraWidth / unit, cssUnit, size);
			canvas.width = width / unit * size;
			canvas.height = boundingBox.height;
			
			if (options.fontScaling) {
				canvas.style.width = CSS.convertSize(width / unit, cssUnit, size);
				canvas.style.height = CSS.convertSize(viewBox.height / unit, cssUnit, size);
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
			
				switch (decoStyle.textDecoration) {
				
					case 'underline':
					
						line(-font.face['underline-position'], decoStyle.color);
						
						break textDecoration;
						
					case 'overline':
					
						line(-font.face['ascent'], decoStyle.color);
						
						break textDecoration;
						
					case 'line-through':
					
						buffer.push(function() {
							line(font.face['descent'], decoStyle.color, true);
						});
						
						break textDecoration;
						
					case 'none':
					
						decoStyle = getStyle(search);
					
						break;
				}
			
			}
			
			g.fillStyle = g.strokeStyle = style.color;
			g.beginPath();
			
			var parsePath = function(path) {
				var cmds = [];
				var parts = path.match(/[a-zA-Z][0-9\-,. ]*/g);
				for (var i = 0, l = parts.length; i < l; ++i) {
					if (parts[i] == '') continue;
					cmds.push({
						type: parts[i][0],
						coords: parts[i].substr(1).split(/[, ]/).map(Number)
					});
				}
				return cmds;
			}
			
			for (var j = 0, k = chars.length; j < k; ++j) {
				var char = chars[j];
				if (!font.glyphs[char] && !font.missingGlyph) return;
				var glyph = font.glyphs[char] || font.missingGlyph;
				if (glyph.d) {
					var cmds = glyph.cmds || (glyph.cmds = parsePath(glyph.d));
					var at = { x: 0, y: 0 }, cp = { x: 0, y: 0 };
					draw: for (var i = 0, l = cmds.length; i < l; ++i) {
						var cmd = cmds[i].type;
						if (cmd == 'z' || cmd == 'Z') {
							g.closePath();
							continue draw;
						}
						var c = cmds[i].coords;
						switch (cmd) {
							case 'M':
								g.moveTo(at.x = c[0], at.y = c[1]);
								break;
							case 'L':
								g.lineTo(at.x = c[0], at.y = c[1]);
								break;
							case 'l':
								g.lineTo(at.x += c[0], at.y += c[1]);
								break;
							case 'H':
								g.lineTo(at.x = c[0], at.y);
								break;
							case 'h':
								g.lineTo(at.x += c[0], at.y);
								break;
							case 'V':
								g.lineTo(at.x, at.y = c[0]);
								break;
							case 'v':
								g.lineTo(at.x, at.y += c[0]);
								break;
							case 'C':
								g.bezierCurveTo(c[0], c[1], cp.x = c[2], cp.y = c[3], at.x = c[4], at.y = c[5]);
								break;
							case 'c':
								g.bezierCurveTo(at.x + c[0], at.y + c[1], cp.x = at.x + c[2], cp.y = at.y + c[3], at.x += c[4], at.y += c[5]);
								break;
							case 'S':
								g.bezierCurveTo(at.x + (at.x - cp.x), at.y + (at.y - cp.y), cp.x = c[0], cp.y = c[1], at.x = c[2], at.y = c[3]);
								break;
							case 's':
								g.bezierCurveTo(at.x + (at.x - cp.x), at.y + (at.y - cp.y), cp.x = at.x + c[0], cp.y = at.y + c[1], at.x += c[2], at.y += c[3]);
								break;
							case 'Q':
								g.quadraticCurveTo(cp.x = c[0], cp.y = c[1], at.x = c[2], at.y = c[3]);
								break;
							case 'q':
								g.quadraticCurveTo(cp.x = at.x + c[0], cp.y = at.y + c[1], at.x += c[2], at.y += c[3]);
								break;
							case 'T':
								g.quadraticCurveTo(cp.x = at.x + (at.x - cp.x), cp.y = at.y + (at.y - cp.y), at.x = c[0], at.y = c[1]);
								break;
							case 't':
								g.quadraticCurveTo(cp.x = at.x + (at.x - cp.x), cp.y = at.y + (at.y - cp.y), at.x += c[0], at.y += c[1]);
								break;
							case 'A':
							case 'a':
								break;
						}
					}
				}
				g.translate(glyph.h || font.h, 0);
			}
						
			g.fill();
			
			for (var fn; fn = buffer.shift(); fn());
			
			return canvas;
		}
		
	};
	
	var fonts = {}, defaultOptions = {
		fontScaling: false,
		textDecoration: true,
		engine: !window.opera && window.ActiveXObject ? this.Engines.vml : this.Engines.canvas
	};
	
	this.fonts = fonts; // @todo remove
	
	var CSS = {
		convertSize: function(n, unit, refSize) {
			switch (unit) {
				case 'em':
					return n + 'em';
				case 'px':
					return (n * refSize) + 'px';
			}
			return n;
		},
		textTransform: function(text, style) {
			return text[{
				'uppercase': 'toUpperCase',
				'lowercase': 'toLowerCase'
			}[style.textTransform] || 'toString']();
		}
	};
	
	var getFont = function(el, style) {
		if (!style) style = getStyle(el);
		var families = style.fontFamily.split(/\s*,\s*/);
		var weight = {
			normal: 400,
			bold: 700
		}[style.fontWeight] || parseInt(style.fontWeight, 10);
		for (var i = 0, l = families.length; i < l; ++i) {
			var family = families[i].toLowerCase();
			if (family[0] == '"' || family[0] == "'") family = family.substring(1, family.length - 1);
			if (fonts[family]) {
				if (fonts[family][weight]) return fonts[family][weight];
				var closest = null;
				for (var w in fonts[family]) {
					w = parseInt(w, 10);
					if (!closest || (w < weight && w > closest)) closest = w;
				}
				return fonts[family][closest];
			}
		}
		return null;
	}
	
	var getStyle = function(el) {
		if (el.currentStyle) return el.currentStyle;
		if (window.getComputedStyle) return window.getComputedStyle(el, '');
		return el.style;
	}
	
	var getViewBox = function(font) {
		var parts = font.face.bbox.split(/\s+/);
		return {
			minX: parseInt(parts[0], 10),
			minY: parseInt(parts[1], 10),
			width: parseInt(parts[2]) - parseInt(parts[0]),
			height: parseInt(parts[3], 10) - parseInt(parts[1], 10),
			toString: function() {
				return [ this.minX, this.minY, this.width, this.height ].join(' ');
			}
		};
	}
	
	var merge = function() {
		var merged = {};
		for (var i = 0, l = arguments.length; i < l; ++i) {
			for (var key in arguments[i]) merged[key] = arguments[i][key];
		}
		return merged;
	}
	
	var replaceElement = function(el, styles, options) {
		//console.info('rendering:', el);
		var id = el.textContent;
		console.time('time:' + id);
		var font, style;
		for (var node = el.firstChild; node; node = nextNode) {
			var nextNode = node.nextSibling;
			if (node.nodeType == 3) {
				if (node.nodeValue === '') continue;
				if (!style) style = getStyle(el); //merge(getStyle(el), styles);
				if (!font) font = getFont(el, style);
				if (!font) continue;
				var words = node.nodeValue.split(/\s+/);
				for (var i = 0, l = words.length; i < l; ++i) {
					if (words[i] === '') continue;
					node.parentNode.insertBefore(options.engine(font, words[i] + (i < l - 1 ? ' ' : ''), style, options, node), node);
				}
				node.parentNode.removeChild(node);
			}
			else if (node.firstChild) {
				arguments.callee.call(this, node, styles, options);
			}
		}
		console.timeEnd('time:' + id);
	}
	
	this.loadFont = function(src, onLoad) {
		var loader = document.createElement('script');
		loader.type = 'text/javascript';
		if (onLoad) {
			var self = this;
			loader.onload = function() {
				onLoad.call(self);
			}
		}
		loader.src = src;
		document.getElementsByTagName('head')[0].appendChild(loader);	
	}
	
	this.registerFont = function(font) {
		var family = font.face['font-family'].toLowerCase();
		if (!fonts[family]) fonts[family] = {};
		font.viewBox = getViewBox(font);
		fonts[family][font.face['font-weight']] = font;
	}
	
	this.replace = function(el, styles, options) {
		options = merge(defaultOptions, options);
		if (el.nodeType) {
			replaceElement(el, styles, options);
		}
		else if (el.length) {
			for (var i = 0, l = el.length; i < l; ++i) {
				replaceElement(el[i], styles, options);
			}
		}
		return this;
	}
}