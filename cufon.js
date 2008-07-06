var Cufon = new function() {

	this.CSS = {
	
		convertSize: function(n, unit, refSize) {
			switch (unit) {
				case 'em':
					return n + 'em';
				case 'px':
					return (n * refSize) + 'px';
			}
			return n;
		},
		
		getStyle: function(el) {
			if (el.currentStyle) return new Style(el.currentStyle);
			if (window.getComputedStyle) return new Style(window.getComputedStyle(el, ''));
			return new Style(el.style);
		},
		
		textTransform: function(text, style) {
			return text[{
				'uppercase': 'toUpperCase',
				'lowercase': 'toLowerCase'
			}[style.get('textTransform')] || 'toString']();
		}
		
	};
	
	this.DOM = {
	
		ready: (function() {
		
			var complete = document.readyState == 'complete';
			
			var queue = [], perform = function() {
				if (complete) return;
				complete = true;
				for (var fn; fn = queue.shift(); fn());
			};
			
			if (document.addEventListener) {
				document.addEventListener('DOMContentLoaded', perform, false);
			}
			
			if (!window.opera && document.readyState) {
				setTimeout(function() {
					document.readyState == 'complete' ? perform() : setTimeout(arguments.callee, 50);
				}, 50);
			}
			
			addEvent(window, 'load', perform);
			
			return function(listener) {
				complete ? listener() : queue.push(listener);
			}
			
		})()
		
	};
	
	this.SVG = {
	
		parsePath: function(path) {
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
			
	};
	
	function Style(native) {
	
		var custom = {};
	
		this.get = function(property) {
			return custom[property] != undefined ? custom[property] : native[property];
		};
		
		this.extend = function(styles) {
			for (var property in styles) custom[property] = styles[property];
			return this;
		};
		
	}

	var engines = {}, fonts = {}, defaultOptions = {
		fontScaling: false,
		textDecoration: true,
		engine: !window.opera && window.ActiveXObject ? 'vml' : 'canvas'
	};
	
	this.fonts = fonts; // @todo remove
	
	function addEvent(el, type, listener) {
		if (el.addEventListener) {
			el.addEventListener(type, listener, false);
		}
		else if (el.attachEvent) {
			el.attachEvent('on' + type, bind(listener, el));
		}
	}
	
	function bind(obj, to, args) {
		return function() {
			obj.apply(to, args || arguments);
		}
	}
	
	function getFont(el, style) {
		if (!style) style = this.CSS.getStyle(el);
		var families = style.get('fontFamily').split(/\s*,\s*/);
		var weight = {
			normal: 400,
			bold: 700
		}[style.get('fontWeight')] || parseInt(style.get('fontWeight'), 10);
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
	
	function getViewBox(font) {
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
	
	function merge() {
		var merged = {};
		for (var i = 0, l = arguments.length; i < l; ++i) {
			for (var key in arguments[i]) merged[key] = arguments[i][key];
		}
		return merged;
	}
	
	function replaceElement(el, styles, options) {
		var font, style;
		for (var node = el.firstChild; node; node = nextNode) {
			var nextNode = node.nextSibling;
			if (node.nodeType == 3) {
				if (node.nodeValue === '') continue;
				if (!style) style = this.CSS.getStyle(el).extend(styles);
				if (!font) font = getFont(el, style);
				if (!font) continue;
				var words = node.nodeValue.split(/\s+/), pad = '';
				for (var i = 0, l = words.length; i < l; ++i) {
					if (words[i] === '') {
						pad = ' ';
						continue;
					}
					node.parentNode.insertBefore(engines[options.engine](font, pad + words[i] + (i < l - 1 ? ' ' : ''), style, options, node), node);
					pad = '';
				}
				node.parentNode.removeChild(node);
			}
			else if (node.firstChild) {
				arguments.callee.call(this, node, styles, options);
			}
		}
	}
	
	this.loadFont = function(src, onLoad) {
		var loader = document.createElement('script');
		loader.type = 'text/javascript';
		if (onLoad) {
			loader.onload = bind(function() {
				this.DOM.ready(onLoad);
			}, this);
		}
		loader.src = src;
		document.getElementsByTagName('head')[0].appendChild(loader);	
		return this;
	};
	
	this.registerEngine = function(id, engine) {
		engines[id] = engine;
		return this;
	};
	
	this.registerFont = function(font) {
		var family = font.face['font-family'].toLowerCase();
		if (!fonts[family]) fonts[family] = {};
		font.viewBox = getViewBox(font);
		fonts[family][font.face['font-weight']] = font;
		return this;
	};
	
	this.replace = function(el, styles, options) {
		if (options && options.engine && !engines[options.engine]) throw new Error('Unrecognized Cufon engine: ' + options.engine);
		options = merge(defaultOptions, options);
		if (el.nodeType) el = [ el ];
		this.DOM.ready(bind(function() {
			for (var i = 0, l = el.length; i < l; ++i) {
				replaceElement.call(this, el[i], styles || {}, options);
			}
		}, this));
		return this;
	};
	
	this.set = function(option, value) {
		defaultOptions[option] = value;
		return this;
	};
	
};

Cufon.registerEngine('canvas', function(font, text, style, options, node) {

	var viewBox = font.viewBox;
	var unit = font.face['units-per-em'];
	var size = parseInt(style.get('fontSize'), 10);
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
	
	var cssUnit = options.fontScaling ? 'em' : 'px';
	
	var extraWidth = viewBox.width - lastWidth;
	
	width += extraWidth;
	
	// @todo fix line-height with negative top/bottom margins
	
	var canvas = document.createElement('canvas');
				
	canvas.className = 'cufon';
	canvas.style.marginLeft = Cufon.CSS.convertSize(viewBox.minX / unit, cssUnit, size);
	canvas.style.marginRight = Cufon.CSS.convertSize(-extraWidth / unit, cssUnit, size);
	canvas.width = width / unit * size;
	canvas.height = boundingBox.height;

	if (options.fontScaling) {
		canvas.style.width = Cufon.CSS.convertSize(width / unit, cssUnit, size);
		canvas.style.height = Cufon.CSS.convertSize(viewBox.height / unit, cssUnit, size);
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
			var cmds = glyph.cmds || (glyph.cmds = Cufon.SVG.parsePath(glyph.d));
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
						if (i == 0 || !/^[CcSs]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
						g.bezierCurveTo(at.x + (at.x - cp.x), at.y + (at.y - cp.y), cp.x = c[0], cp.y = c[1], at.x = c[2], at.y = c[3]);
						break;
					case 's':
						if (i == 0 || !/^[CcSs]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
						g.bezierCurveTo(at.x + (at.x - cp.x), at.y + (at.y - cp.y), cp.x = at.x + c[0], cp.y = at.y + c[1], at.x += c[2], at.y += c[3]);
						break;
					case 'Q':
						g.quadraticCurveTo(cp.x = c[0], cp.y = c[1], at.x = c[2], at.y = c[3]);
						break;
					case 'q':
						g.quadraticCurveTo(cp.x = at.x + c[0], cp.y = at.y + c[1], at.x += c[2], at.y += c[3]);
						break;
					case 'T':
						if (i == 0 || !/^[QqTt]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
						g.quadraticCurveTo(cp.x = at.x + (at.x - cp.x), cp.y = at.y + (at.y - cp.y), at.x = c[0], at.y = c[1]);
						break;
					case 't':
						if (i == 0 || !/^[QqTt]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
						g.quadraticCurveTo(cp.x = at.x + (at.x - cp.x), cp.y = at.y + (at.y - cp.y), at.x += c[0], at.y += c[1]);
						break;
					case 'A':
					case 'a':
						break;
				}
			}
		}
		g.fill();
		g.translate(Number(glyph.h || font.h) + letterSpacing, 0);
	}
	
	for (var fn; fn = buffer.shift(); fn());
	
	return canvas;
	
});

Cufon.registerEngine('canvas-eval', function(font, text, style, options, node) {
		
	var viewBox = font.viewBox;
	var unit = font.face['units-per-em'];
	var size = parseInt(style.get('fontSize'), 10);
	var boundingBox = {
		offsetX: viewBox.minX / unit * size,
		height: viewBox.height / unit * size
	};
	
	var canvas = document.createElement('canvas');
	
	var chars = Cufon.CSS.textTransform(text, style).split('');
	var width = -viewBox.minX, lastWidth;
	
	for (var j = 0, k = chars.length; j < k; ++j) {
		width += lastWidth = Number((font.glyphs[chars[j]] || font.missingGlyph).h || font.h);
	}
	
	var cssUnit = options.fontScaling ? 'em' : 'px';
	
	var extraWidth = viewBox.width - lastWidth;
	
	width += extraWidth;
	
	// @todo fix line-height with negative top/bottom margins
	
	canvas.className = 'cufon';
	canvas.style.marginLeft = Cufon.CSS.convertSize(viewBox.minX / unit, cssUnit, size);
	canvas.style.marginRight = Cufon.CSS.convertSize(-extraWidth / unit, cssUnit, size);
	canvas.width = width / unit * size;
	canvas.height = boundingBox.height;
	
	if (options.fontScaling) {
		canvas.style.width = Cufon.CSS.convertSize(width / unit, cssUnit, size);
		canvas.style.height = Cufon.CSS.convertSize(viewBox.height / unit, cssUnit, size);
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
	
	g.beginPath();
	
	function generateCode(glyph) {
		var code = [];
		var at = { x: 0, y: 0 }, cp = { x: 0, y: 0 };
		var cmds = Cufon.SVG.parsePath(glyph.d);
		for (var i = 0, l = cmds.length; i < l; ++i) {
			var cmd = cmds[i].type;
			if (cmd == 'z' || cmd == 'Z') {
				code.push('g.closePath()');
				continue;
			}
			var c = cmds[i].coords;
			switch (cmd) {
				case 'M':
					code.push('g.moveTo(' + (at.x = c[0]) + ',' + (at.y = c[1]) + ')');
					break;
				case 'L':
					code.push('g.lineTo(' + (at.x = c[0]) + ',' + (at.y = c[1]) + ')');
					break;
				case 'l':
					code.push('g.lineTo(' + (at.x += c[0]) + ',' + (at.y += c[1]) + ')');
					break;
				case 'H':
					code.push('g.lineTo(' + (at.x = c[0]) + ',' + at.y + ')');
					break;
				case 'h':
					code.push('g.lineTo(' + (at.x += c[0]) + ',' + at.y + ')');
					break;
				case 'V':
					code.push('g.lineTo(' + at.x + ',' + (at.y = c[0]) + ')');
					break;
				case 'v':
					code.push('g.lineTo(' + at.x + ',' + (at.y += c[0]) + ')');
					break;
				case 'C':
					code.push('g.bezierCurveTo(' + c[0] + ',' + c[1] + ',' + (cp.x = c[2]) + ',' + (cp.y = c[3]) + ',' + (at.x = c[4]) + ',' + (at.y = c[5]) + ')');
					break;
				case 'c':
					code.push('g.bezierCurveTo(' + (at.x + c[0]) + ',' + (at.y + c[1]) + ',' + (cp.x = at.x + c[2]) + ',' + (cp.y = at.y + c[3]) + ',' + (at.x += c[4]) + ',' + (at.y += c[5]) + ')');
					break;
				case 'S':
					if (i == 0 || !/^[CcSs]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
					code.push('g.bezierCurveTo(' + (at.x + (at.x - cp.x)) + ',' + (at.y + (at.y - cp.y)) + ',' + (cp.x = c[0]) + ',' + (cp.y = c[1]) + ',' + (at.x = c[2]) + ',' + (at.y = c[3]) + ')');
					break;
				case 's':
					if (i == 0 || !/^[CcSs]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
					code.push('g.bezierCurveTo(' + (at.x + (at.x - cp.x)) + ',' + (at.y + (at.y - cp.y)) + ',' + (cp.x = at.x + c[0]) + ',' + (cp.y = at.y + c[1]) + ',' + (at.x += c[2]) + ',' + (at.y += c[3]) + ')');
					break;
				case 'Q':
					code.push('g.quadraticCurveTo(' + (cp.x = c[0]) + ',' + (cp.y = c[1]) + ',' + (at.x = c[2]) + ',' + (at.y = c[3]) + ')');
					break;
				case 'q':
					code.push('g.quadraticCurveTo(' + (cp.x = at.x + c[0]) + ',' + (cp.y = at.y + c[1]) + ',' + (at.x += c[2]) + ',' + (at.y += c[3]) + ')');
					break;
				case 'T':
					if (i == 0 || !/^[QqTt]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
					code.push('g.quadraticCurveTo(' + (cp.x = at.x + (at.x - cp.x)) + ',' + (cp.y = at.y + (at.y - cp.y)) + ',' + (at.x = c[0]) + ',' + (at.y = c[1]) + ')');
					break;
				case 't':
					if (i == 0 || !/^[QqTt]$/.test(cmds[i - 1].type)) cp.x = at.x, cp.y = at.y;
					code.push('g.quadraticCurveTo(' + (cp.x = at.x + (at.x - cp.x)) + ',' + (cp.y = at.y + (at.y - cp.y)) + ',' + (at.x += c[0]) + ',' + (at.y += c[1]) + ')');
					break;
				case 'A':
				case 'a':
					break;
			}
		}
		return new Function('g', code.join(';'));
	}
	
	for (var j = 0, k = chars.length; j < k; ++j) {
		var char = chars[j];
		if (!font.glyphs[char] && !font.missingGlyph) continue;
		var glyph = font.glyphs[char] || font.missingGlyph;
		g.beginPath();
		if (glyph.d) (glyph.renderer || (glyph.renderer = generateCode(glyph)))(g);
		g.fill();
		g.translate(glyph.h || font.h, 0);
	}
				
	for (var fn; fn = buffer.shift(); fn());
	
	return canvas;
});