/*!
 * Pre-release software. For now you may only use this script if given permission by the author.
 * Copyright (c) 2008 Simo Kinnunen. All rights reserved.
 */
 
var Cufon = new function() {

	this.CSS = {
	
		Size: function(value, base) {
		
			this.value = parseFloat(value, 10);
			this.unit = String(value).match(/[a-z%]+$/)[0] || 'px';
		
			this.convert = function(value) {
				return value / base * this.value
			};
			
			this.toString = function() {
				return this.value + this.unit;
			};

		},
	
		getStyle: function(el) {
			if (document.defaultView && document.defaultView.getComputedStyle) return new Style(document.defaultView.getComputedStyle(el, null));
			if (el.currentStyle) return new Style(el.currentStyle);
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
		
			var complete = (document.readyState == 'complete');
			
			var queue = [], perform = function() {
				if (complete) return;
				complete = true;
				for (var fn; fn = queue.shift(); fn());
			};
			
			// Mozilla, Opera, WebKit r26101+
			
			if (document.addEventListener) {
				document.addEventListener('DOMContentLoaded', perform, false);
			}
			
			// Old WebKit
			
			if (!window.opera && document.readyState) {
				setTimeout(function() {
					({ loaded: 1, complete: 1 })[document.readyState] ? perform() : setTimeout(arguments.callee, 10);
				}, 50);
			}
			
			// Internet Explorer
			
			try {
				var loader = document.createElement('<script defer src=javascript:void(0)>');
				loader.onreadystatechange = function() {
					if (({ loaded: 1, complete: 1 })[this.readyState]) perform();
				};
				document.getElementsByTagName('head')[0].appendChild(loader);
			} catch (e) {}
			
			// Fallback
			
			addEvent(window, 'load', perform);
			
			return function(listener) {
				if (!arguments.length) perform();
				else complete ? listener() : queue.push(listener);
			}
			
		})()
		
	};
	
	this.VML = {
	
		parsePath: function(path) {
			var cmds = [], re = /([mrvxe]|qb)([0-9, .\-]*)/g, match;
			while (match = re.exec(path)) {
				cmds.push({
					type: match[1],
					coords: match[2].split(/[, ]/)
				});
			}
			return cmds;
		}
			
	};
	
	function ExecutionQueue(context) {
	
		var items = [], active = false;
		
		function next() {
			if (active || !items.length) return;
			active = true;
			setTimeout(function() {
				items.shift().call(context);
				active = false;
				next();
			}, 1);
		}
		
		this.add = function(fn) {
			items.push(fn);
			next();
		};
	
	}
	
	function FontFamily(name) {

		this.styles = {};
		
		this.add = function(font) {
			if (!this.styles[font.style]) this.styles[font.style] = {};
			this.styles[font.style][font.weight] = font;
		}
		
		this.get = function(style, weight) {
			var weights = this.styles[style], closest;
			if (!weights) return null;
			weight = {
				normal: 400,
				bold: 700
			}[weight] || parseInt(weight, 10);
			if (weights[weight]) return weights[weight];
			for (var alt in weights) {
				alt = parseInt(alt, 10);
				if (!closest || (alt < weight && alt > closest)) closest = alt;
			}
			return weights[closest];
		}
	
	}
	
	function Font(data) {
		
		this.face = data.face;
		this.glyphs = data.glyphs;
		this.w = data.w;
		this.baseSize = parseInt(data.face['units-per-em'], 10);
		
		this.family = data.face['font-family'].toLowerCase();
		this.weight = data.face['font-weight'];
		this.style = data.face['font-style'] || 'normal';
		
		this.viewBox = (function () {
			var parts = data.face.bbox.split(/\s+/);
			return {
				minX: parseInt(parts[0], 10),
				minY: parseInt(parts[1], 10),
				width: parseInt(parts[2]) - parseInt(parts[0]),
				height: parseInt(parts[3], 10) - parseInt(parts[1], 10),
				toString: function() {
					return [ this.minX, this.minY, this.width, this.height ].join(' ');
				}
			};
		})();
		
		this.ascent = -parseInt(data.face['ascent'], 10);
		this.descent = -parseInt(data.face['descent'], 10);
		
	}
	
	function Style(style) {
	
		var custom = {}, sizes = {};
		
		this.get = function(property) {
			return custom[property] != undefined ? custom[property] : style[property];
		};
		
		this.getSize = function(property, base) {
			return sizes[property] || (sizes[property] = new Cufon.CSS.Size(this.get(property), base));
		};
		
		this.extend = function(styles) {
			for (var property in styles) custom[property] = styles[property];
			return this;
		};
		
	}
	
	var BROKEN_REGEXP = ' '.split(/\s+/).length == 0;
	
	var engines = {}, fonts = {}, sharedQueue = new ExecutionQueue(this), defaultOptions = {
		fontScaling: false,
		fontScale: 1.5,
		textDecoration: true,
		engine: null,
		responsive: false,
		wordWrap: true
	};
	
	function addEvent(el, type, listener) {
		if (el.addEventListener) {
			el.addEventListener(type, listener, false);
		}
		else if (el.attachEvent) {
			el.attachEvent('on' + type, function() {
				return listener.apply(el, arguments);
			});
		}
	}
	
	function getFont(el, style) {
		if (!style) style = this.CSS.getStyle(el);
		var families = style.get('fontFamily').split(/\s*,\s*/), family;
		for (var i = 0, l = families.length; i < l; ++i) {
			family = families[i].toLowerCase();
			if (family[0] == '"' || family[0] == "'") family = family.substring(1, family.length - 1);
			if (fonts[family]) return fonts[family].get(style.get('fontStyle'), style.get('fontWeight'));
		}
		return null;
	}
	
	function merge() {
		var merged = {}, key;
		for (var i = 0, l = arguments.length; i < l; ++i) {
			for (key in arguments[i]) merged[key] = arguments[i][key];
		}
		return merged;
	}
	
	function process(font, text, style, options, node) {
		if (options.wordWrap) {
			var fragment = document.createDocumentFragment(), processed;
			var words = text.split(/\s+/);
			if (BROKEN_REGEXP) {
				// @todo figure out a better way to do this
				if (/^\s/.test(text)) words.unshift('');
				if (/\s$/.test(text)) words.push('');
			}
			for (var i = 0, l = words.length; i < l; ++i) {
				processed = engines[options.engine](font, words[i] + (i < l - 1 ? ' ' : ''), style, options, node);
				if (processed) fragment.appendChild(processed);
			}
			return fragment;
		}
		return engines[options.engine](font, text, style, options, node);
	}
	
	function replaceElement(el, styles, options) {
		var font, style, nextNode;
		for (var node = el.firstChild; node; node = nextNode) {
			nextNode = node.nextSibling;
			if (node.nodeType == 3) {
				if (node.nodeValue === '') continue;
				if (!style) style = Cufon.CSS.getStyle(el).extend(styles);
				if (!font) font = getFont(el, style);
				if (!font) continue;
				node.parentNode.replaceChild(process(font, node.nodeValue, style, options, node), node);
			}
			else if (node.firstChild) {
				if (!/cufon/.test(node.className)) {
					arguments.callee(node, styles, options);
				}
				else {
					
				}
			}
		}
	}
	
	this.loadFont = function(src, onLoad) {
		var loader = document.createElement('script');
		loader.type = 'text/javascript';
		if (onLoad) {
			var loaded = false, dispatch = function() {
				if (!loaded) Cufon.DOM.ready(onLoad);
				loaded = true;
			};
			addEvent(loader, 'load', dispatch);
			addEvent(loader, 'readystatechange', function() {
				if (!{ loaded: true, complete: true }[loader.readyState]) return;
				dispatch();
			});
		}
		loader.src = src;
		document.getElementsByTagName('head')[0].appendChild(loader);	
		return this;
	};
	
	this.registerEngine = function(id, engine) {
		if (engine) engines[id] = engine;
		return this;
	};
	
	this.registerFont = function(data) {
		var font = new Font(data);
		if (!fonts[font.family]) fonts[font.family] = new FontFamily(font.family);
		fonts[font.family].add(font);
		return this;
	};
	
	this.replace = function(el, styles, options) {
		options = merge(defaultOptions, options);
		if (!options.engine) return this; // cufón isn't supported
		if (!engines[options.engine]) throw new Error('Unrecognized cufón engine: ' + options.engine);
		if (el.nodeType) el = [ el ];
		var dispatch = function() {
			if (!options.responsive) return replaceElement.apply(null, arguments);
			var args = arguments;
			sharedQueue.add(function() {
				replaceElement.apply(null, args);
			});
		};
		this.DOM.ready(function() {
			for (var i = 0, l = el.length; i < l; ++i) {
				dispatch(el[i], styles || {}, options);
			}
		});
		return this;
	};
	
	this.set = function(option, value) {
		defaultOptions[option] = value;
		return this;
	};
	
};

Cufon.registerEngine('canvas', (function() {

	var check = document.createElement('canvas');
	if (!check || !check.getContext) return null;
	check = null;

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
	
		var viewBox = font.viewBox;
		
		var base = font.baseSize, size = style.getSize('fontSize', base), spacing = {
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
		
		var wrapper = document.createElement('span');
		
		wrapper.className = 'cufon cufon-canvas';
		
		var canvas = document.createElement('canvas');
		
		var wStyle = wrapper.style, cStyle = canvas.style;
		
		wStyle.display = 'inline'; /* firefox -2 */
		wStyle.display = 'inline-block';
		wStyle.position = 'relative';
		
		cStyle.position = 'absolute';
		cStyle.top = 0;
		cStyle.left = 0;
		
		var baseHeight = Math.ceil(size.convert(viewBox.height)), scale = baseHeight / viewBox.height;
		
		if (options.fontScaling) {
			/* @todo outdated - reimplement */
			canvas.width = Math.ceil(size.convert(width) * options.fontScale);
			canvas.height = Math.ceil(baseHeight * options.fontScale);
			cStyle.marginLeft = (viewBox.minX / base) + 'em';
			cStyle.marginRight = (-extraWidth / base) + 'em';
			cStyle.width = (width / base) + 'em';
			cStyle.height = (viewBox.height / base) + 'em';
			scale *= options.fontScale;
		}
		else {
			canvas.width = Math.ceil(size.convert(width));
			canvas.height = baseHeight;
			wStyle.paddingLeft = Math.ceil(size.convert(width - extraWidth + viewBox.minX)) + size.unit;
			wStyle.paddingBottom = size.convert(-font.ascent + font.descent) + size.unit;
			cStyle.top = Math.floor(size.convert(viewBox.minY - font.ascent)) + size.unit;
			cStyle.left = Math.floor(size.convert(viewBox.minX)) + size.unit;
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
			
			// @todo add support for multiple values
		
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
		
		wrapper.appendChild(canvas);
		
		return wrapper;
			
	}
	
})());

Cufon.registerEngine('vml', (function() {

	if (!document.namespaces) return;

	// isn't undocumented stuff great?
	document.write('<!--[if vml]><script type="text/javascript"> Cufon.hasVmlSupport = true; </script><![endif]-->');
	if (!Cufon.hasVmlSupport) return null;

	if (document.namespaces['v'] == null) {
		document.createStyleSheet().addRule('v\\:*', 'behavior: url(#default#VML);');
		document.namespaces.add('v', 'urn:schemas-microsoft-com:vml');
	}

	Cufon.set('engine', 'vml');	

	// Original by Dean Edwards.
	// Modified to work well with relative units (em, ex, %).
	// Finally some use for the Dark Arts.
	function getFontSizeInPixels(el, value) {
		var unit = (value.match(/[a-z%]+$/)[0] || '').toLowerCase(), value = parseFloat(value, 10), result;
		if (unit == 'px') return value;
		var style = el.style.left, runtimeStyle = el.runtimeStyle.left;
		el.runtimeStyle.left = el.currentStyle.left;
		switch (unit) {
			case '%':
			case 'em':
				el.style.left = '1em'; // magic value
				break;
			case 'ex':
				el.style.left = '2ex'; // magic value
				break;
			default:
				el.style.left = value + unit;
		}
		result = el.style.pixelLeft;
		el.style.left = style;
		el.runtimeStyle.left = runtimeStyle;
		return result;
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
	
	var CANVAS_CSS = 'display: inline-block; position: relative';
	var SHAPE_CSS = 'display: inline-block; antialias: true; position: absolute';

	return function render(font, text, style, options, node) {
	
		// @todo letter-/word-spacing, text-decoration
	
		var viewBox = font.viewBox, base = font.baseSize;
		
		var size = style.computedFontSize || (style.computedFontSize = new Cufon.CSS.Size(getFontSizeInPixels(node.parentNode, style.get('fontSize')), base));
		
		var spacing = {
			letter: 0,
			word: 0
		};
		
		var glyphWidth = size.convert(viewBox.width, base);
		var glyphHeight = size.convert(viewBox.height, base);
		
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
			shape.runtimeStyle.left = size.convert(offset);
			shape.fillcolor = color;
			canvas.appendChild(shape);
			
			var advance = Number(glyph.w || font.w) + spacing.letter;
			
			width += advance;
			offset += advance;
			
		}
		
		canvas.runtimeStyle.width = Math.max(size.convert(width), 0);
				
		return canvas;
		
	}
	
})());
