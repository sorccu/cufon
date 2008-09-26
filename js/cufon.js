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
				return value / base * this.value;
			};
			
			this.toString = function() {
				return this.value + this.unit;
			};

		},
	
		getStyle: function(el) {
			var view = document.defaultView;
			if (view && view.getComputedStyle) return new Style(view.getComputedStyle(el, null));
			if (el.currentStyle) return new Style(el.currentStyle);
			return new Style(el.style);
		},
		
		textTransform: function(text, style) {
			return text[{
				uppercase: 'toUpperCase',
				lowercase: 'toLowerCase'
			}[style.get('textTransform')] || 'toString']();
		}
		
	};
	
	this.DOM = {
	
		ready: (function() {
		
			var complete = (document.readyState == 'complete');
			
			var queue = [], perform = function(id) {
				if (complete) return;
				complete = true;
				for (var fn; fn = queue.shift(); fn());
			};
			
			// Gecko, Opera, WebKit r26101+
			
			if (document.addEventListener) {
				document.addEventListener('DOMContentLoaded', perform, false);
				window.addEventListener('pageshow', perform, false); // For cached Gecko pages
			}
			
			// Old WebKit, Internet Explorer
			
			if (!window.opera && document.readyState) {
				setTimeout(function() {
					({ loaded: 1, complete: 1 })[document.readyState] ? perform() : setTimeout(arguments.callee, 10);
				}, 10);
			}
			
			// Internet Explorer
			
			if (document.readyState && document.createStyleSheet) {
				(function() {
					try {
						document.body.doScroll('left');
						perform();
					}
					catch (e) {
						setTimeout(arguments.callee, 1);
					}
				})();
			}
			
			addEvent(window, 'load', perform); // Fallback
			
			return function(listener) {
				if (!arguments.length) perform();
				else complete ? listener() : queue.push(listener);
			}
			
		})()
		
	};
	
	this.VML = {
	
		parsePath: function(path) {
			var cmds = [], re = /([mrvxe]|qb)([^a-z]*)/g, match;
			while (match = re.exec(path)) {
				cmds.push({
					type: match[1],
					coords: match[2].split(',')
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
		enableTextDecoration: true,
		engine: null,
		fontScale: 1,
		fontScaling: false,
		responsive: false,
		rotation: 0,
		selector: (
			document.querySelectorAll
				? function(query) { return document.querySelectorAll(query); }
				: function(query) { return document.getElementsByTagName(query); }
		),
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
	
	function replaceElement(el, options) {
		var font, style, nextNode;
		for (var node = el.firstChild; node; node = nextNode) {
			nextNode = node.nextSibling;
			if (node.nodeType == 3) {
				if (node.nodeValue === '') continue;
				if (!style) style = Cufon.CSS.getStyle(el).extend(options);
				if (!font) font = getFont(el, style);
				if (!font) continue;
				node.parentNode.replaceChild(process(font, node.nodeValue, style, options, node), node);
			}
			else if (node.firstChild) {
				if (!/cufon/.test(node.className)) {
					arguments.callee(node, options);
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
				if ({ loaded: 1, complete: 1 }[loader.readyState]) dispatch();
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
	
	this.replace = function(el, options) {
		options = merge(defaultOptions, options);
		if (!options.engine) return this; // Cufon isn't supported
		if (typeof el === 'string' && options.selector) {
			this.DOM.ready(function() {
				Cufon.replace(options.selector(el), options);
			});
			return this;
		}
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
				dispatch(el[i], options);
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
	
	var styleSheet = document.createElement('style');
	styleSheet.type = 'text/css';
	styleSheet.appendChild(document.createTextNode(
		'.cufon-canvas { display: inline; display: inline-block; position: relative; vertical-align: middle; font-size: 1px }' +
		'.cufon-canvas canvas { position: absolute; }'
	));
	document.getElementsByTagName('head')[0].appendChild(styleSheet);

	Cufon.set('engine', 'canvas');

	var HAS_INLINE_BLOCK = (function() {
		var style = document.createElement('span').style;
		style.display = 'inline';
		style.display = 'inline-block';
		return style.display == 'inline-block';
	})();

	function generateFromVML(path, context) {
		var atX = 0, atY = 0, cpX = 0, cpY = 0;
		var cmds = Cufon.VML.parsePath(path);
		var code = new Array(cmds.length - 1);
		generate: for (var i = 0, l = cmds.length; i < l; ++i) {
			var c = cmds[i].coords;
			switch (cmds[i].type) {
				case 'v':
					code[i] = { m: 'bezierCurveTo', a: [ atX + Number(c[0]), atY + Number(c[1]), cpX = atX + Number(c[2]), cpY = atY + Number(c[3]), atX += Number(c[4]), atY += Number(c[5]) ] };
					break;
				case 'qb':
					code[i] = { m: 'quadraticCurveTo', a: [ cpX = Number(c[0]), cpY = Number(c[1]), atX = Number(c[2]), atY = Number(c[3]) ] };
					break;
				case 'r':
					code[i] = { m: 'lineTo', a: [ atX += Number(c[0]), atY += Number(c[1]) ] };
					break;
				case 'm':
					code[i] = { m: 'moveTo', a: [ atX = Number(c[0]), atY = Number(c[1]) ] };
					break;
				case 'x':
					code[i] = { m: 'closePath' };
					break;
				case 'e':
					break generate;
			}
			context[code[i].m].apply(context, code[i].a);
		}
		return code;
	}
	
	function interpret(code, context) {
		for (var i = 0, l = code.length; i < l; ++i) {
			var line = code[i];
			context[line.m].apply(context, line.a);
		}
	}
	
	function radians(degrees) {
		return Math.PI / 180 * degrees;	
	}

	return function(font, text, style, options, node) {
	
		var viewBox = font.viewBox, base = font.baseSize;
		
		var size = style.getSize('fontSize', base);
		
		var spacing = {
			letter: 0,
			word: 0
		};
		
		var chars = Cufon.CSS.textTransform(text, style).split('');
		
		var width = -viewBox.minX;
		var height = Math.ceil(size.convert(viewBox.height));
		
		var lastWidth;
		
		for (var j = 0, k = chars.length; j < k; ++j) {
			var glyph = font.glyphs[chars[j]] || font.missingGlyph;
			if (!glyph) continue;
			width += lastWidth = Number(glyph.w || font.w) + spacing.letter;
		}
		
		if (!lastWidth) return null; // there's nothing to render
		
		var adjust = viewBox.width - lastWidth;
		
		width += adjust;

		var scale = height / viewBox.height;
		
		var wrapper = document.createElement('span');
		wrapper.className = 'cufon cufon-canvas';
		
		var canvas = document.createElement('canvas');
		
		var wStyle = wrapper.style;
		var cStyle = canvas.style;
		
		canvas.width = Math.ceil(size.convert(width));
		canvas.height = height;
		wStyle.paddingLeft = Math.ceil(size.convert(width - adjust + viewBox.minX)) + 'px';
		wStyle.paddingBottom = (size.convert(-font.ascent + font.descent) - 1 + HAS_INLINE_BLOCK) + 'px';
		cStyle.top = Math.floor(size.convert(viewBox.minY - font.ascent)) + 'px';
		cStyle.left = Math.floor(size.convert(viewBox.minX)) + 'px';
		
		var g = canvas.getContext('2d'), buffer = [];
		
		g.scale(scale, scale);
		g.translate(-viewBox.minX, -viewBox.minY);
		
		function line(y, color, invert) {
			g.strokeStyle = color;
			
			g.beginPath();
			g.lineWidth = font.face['underline-thickness'];
			
			g.moveTo(0, y);
			g.lineTo((invert ? -1 : 1) * (width - adjust + viewBox.minX), y);
			
			g.stroke();
		}
		
		if (options.enableTextDecoration) textDecoration: for (var search = node, decoStyle = style; search.parentNode && search.parentNode.nodeType == 1; ) {
		
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
	
	if (document.namespaces['cvml'] == null) {
		var styleSheet = document.createStyleSheet();
		styleSheet.addRule('cvml\\:*', 'behavior: url(#default#VML); display: inline-block; antialias: true; position: absolute;');
		styleSheet.addRule('.cufon-vml', 'display: inline-block; position: relative; vertical-align: middle;');
		styleSheet.addRule('a .cufon-vml', 'cursor: pointer;');
		document.namespaces.add('cvml', 'urn:schemas-microsoft-com:vml');
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
		var shapeType = document.createElement('cvml:shapetype');
		shapeType.id = 'cufon-glyph-' + typeIndex++;
		glyph.typeRef = '#' + shapeType.id;
		shapeType.stroked = 'f';
		shapeType.coordsize = viewBox.width + ',' + viewBox.height;
		shapeType.coordorigin = viewBox.minX + ',' + viewBox.minY;
		var ensureSize = 'm' + viewBox.minX + ',' + viewBox.minY + ' r' + viewBox.width + ',' + viewBox.height;
		shapeType.path = (glyph.d ? 'm' + glyph.d + 'x' : '') + ensureSize;
		document.body.insertBefore(shapeType, document.body.firstChild);
	}
	
	return function(font, text, style, options, node) {
	
		// @todo letter-/word-spacing, text-decoration
	
		var viewBox = font.viewBox, base = font.baseSize;
		
		var size = style.computedFontSize || (style.computedFontSize = new Cufon.CSS.Size(getFontSizeInPixels(node.parentNode, style.get('fontSize')) + 'px', base));
		
		var spacing = {
			letter: 0,
			word: 0
		};
		
		var glyphWidth = size.convert(viewBox.width);
		var glyphHeight = size.convert(viewBox.height);
		
		var wrapper = document.createElement('span');
		wrapper.className = 'cufon cufon-vml';
		
		wrapper.style.border = '1px solid blue';
		
		var canvas = document.createElement('cvml:group');
		
		canvas.style.border = '1px solid red';
		canvas.style.height = glyphHeight;
		canvas.style.top = Math.floor(size.convert(viewBox.minY - font.ascent));
		canvas.style.left = size.convert(viewBox.minX);
		
		var wStyle = wrapper.runtimeStyle;
		
		wStyle.height = size.convert(-font.ascent + font.descent) + 'px';
		
		var color = style.get('color');
		
		var chars = Cufon.CSS.textTransform(text, style).split('');
		
		var width = 0, offsetX = 0, advance = null;
		
		for (var i = 0, l = chars.length; i < l; ++i) {
		
			var glyph = font.glyphs[chars[i]] || font.missingGlyph;
			if (!glyph) continue;
			
			if (!glyph.typeRef) createType(glyph, viewBox);
			
			var shape = document.createElement('cvml:shape');
			shape.type = glyph.typeRef;
			var sStyle = shape.runtimeStyle;
			sStyle.width = viewBox.width;
			sStyle.height = viewBox.height;
			sStyle.top = 0;
			sStyle.left = offsetX;
			shape.fillcolor = color;
			canvas.appendChild(shape);
			
			advance = Number(glyph.w || font.w) + spacing.letter;
			
			width += advance;
			offsetX += advance;
			
		}
		
		if (advance === null) return null;
		
		var fullWidth = -viewBox.minX + width + (viewBox.width - advance);
		
		canvas.coordsize = fullWidth + ',' + viewBox.height;
		
		canvas.style.width = size.convert(fullWidth);
		
		wStyle.width = Math.max(Math.ceil(size.convert(width)), 0);
		
		wrapper.appendChild(canvas);
				
		return wrapper;
		
	}
	
})());
