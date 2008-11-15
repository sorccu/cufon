/*!
 * Copyright (c) 2008 Simo Kinnunen.
 * Licensed under the MIT license.
 */
 
var Cufon = new function() {
	
	var DOM = this.DOM = {
			
		ready: (function() {
		
			var complete = false, readyStatus = { loaded: 1, complete: 1 };
		
			var queue = [], perform = function() {
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
			
			if (!window.opera && document.readyState) (function() {
				readyStatus[document.readyState] ? perform() : setTimeout(arguments.callee, 10);
			})();
			
			// Internet Explorer
			
			if (document.readyState && document.createStyleSheet) (function() {
				try {
					document.body.doScroll('left');
					perform();
				}
				catch (e) {
					setTimeout(arguments.callee, 1);
				}
			})();
			
			addEvent(window, 'load', perform); // Fallback
			
			return function(listener) {
				if (!arguments.length) perform();
				else complete ? listener() : queue.push(listener);
			};
			
		})()
		
	};

	var CSS = this.CSS = {
	
		Size: function(value, base) {
		
			this.value = parseFloat(value, 10);
			this.unit = String(value).match(/[a-z%]+$/)[0] || 'px';
		
			this.convert = function(value) {
				return value / base * this.value;
			};
			
			this.convertFrom = function(value) {
				return value / this.value * base;
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
		
		ready: (function() {
			
			var complete = false;
			
			var queue = [], perform = function() {
				complete = true;
				for (var fn; fn = queue.shift(); fn());
			};
			
			var styleElements = document.getElementsByTagName('style');
			var linkElements = document.getElementsByTagName('link');
			
			DOM.ready(function() {
				var linkStyles = 0;
				for (var i = 0, l = linkElements.length; i < l; ++i) {
					if (/stylesheet/i.test(linkElements[i].type)) ++linkStyles;
				}
				if (document.styleSheets.length >= styleElements.length + linkStyles) {
					perform();
					return;
				}
				setTimeout(arguments.callee, 1);
			});
			
			return function(listener) {
				if (complete) listener();
				else queue.push(listener);
			};
			
		})(),
		
		textDecoration: function(el, style) {
			if (!style) style = this.getStyle(el);
			var types = {
				underline: null,
				overline: null,
				'line-through': null
			};
			for (var search = el; search.parentNode && search.parentNode.nodeType == 1; ) {
				var foundAll = true;
				for (var type in types) {
					if (types[type]) continue;
					if (style.get('textDecoration').indexOf(type) != -1) types[type] = style.get('color');
					foundAll = false;
				}
				if (foundAll) break; // this is rather unlikely to happen
				style = this.getStyle(search = search.parentNode);
			}
			return types;
		},
		
		textTransform: function(text, style) {
			return text[{
				uppercase: 'toUpperCase',
				lowercase: 'toLowerCase'
			}[style.get('textTransform')] || 'toString']();
		}
		
	};
	
	this.VML = {
	
		parsePath: function(path) {
			var cmds = [], re = /([mrvxe])([^a-z]*)/g, match;
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
		
		this.height = -this.ascent + this.descent;
		
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
	
	function Storage() {
		
		var map = {}, at = 0;
		
		function identify(el) {
			return el.cufid || (el.cufid = ++at);
		}
		
		this.get = function(el) {
			var id = identify(el);
			return map[id] || (map[id] = {});
		};
		
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
	
	function process(font, text, style, options, node, el) {
		if (options.separateWords) {
			var fragment = document.createDocumentFragment(), processed;
			var words = text.split(/\s+/);
			if (HAS_BROKEN_REGEXP) {
				// @todo figure out a better way to do this
				if (/^\s/.test(text)) words.unshift('');
				if (/\s$/.test(text)) words.push('');
			}
			for (var i = 0, l = words.length; i < l; ++i) {
				processed = engines[options.engine](font, words[i] + (i < l - 1 ? ' ' : ''), style, options, node, el);
				if (processed) fragment.appendChild(processed);
			}
			return fragment;
		}
		return engines[options.engine](font, text, style, options, node, el);
	}
	
	function replaceElement(el, options) {
		var storage = sharedStorage.get(el);
		if (!options) options = storage.options;
		var font, style, nextNode;
		for (var node = el.firstChild; node; node = nextNode) {
			nextNode = node.nextSibling;
			if (node.firstChild && !/cufon/.test(node.className)) {
				arguments.callee(node, options);
				continue;
			}
			var text = node.nodeType == 3 ? node.data : node.alt;
			if (text === '') continue;
			if (!style) style = Cufon.CSS.getStyle(el).extend(options);
			if (!font) font = getFont(el, style);
			if (!font) continue;
			var processed = process(font, text, style, options, node, el);
			if (processed) node.parentNode.replaceChild(processed, node);
			else node.parentNode.removeChild(node);
		}
		if (!storage.options) {
			storage.options = options;
		}
	}
	
	var HAS_BROKEN_REGEXP = ' '.split(/\s+/).length == 0;
	
	var sharedQueue = new ExecutionQueue(this), sharedStorage = new Storage();
	
	var engines = {}, fonts = {}, defaultOptions = {
		enableTextDecoration: false,
		engine: null,
		fontScale: 1,
		fontScaling: false,
		//hover: false,
		responsive: false,
		//rotation: 0,
		//selectable: false,
		selector: (
				window.$$
			||	window.$
			||	(document.querySelectorAll && function(query) { return document.querySelectorAll(query); })
			||	function(query) { return document.getElementsByTagName(query); }
		),
		separateWords: true
	};
	
	this.registerEngine = function(id, engine) {
		if (engine) engines[id] = engine;
		return this;
	};
	
	this.registerFont = function(data) {
		var font = new Font(data);
		if (!fonts[font.family]) fonts[font.family] = new FontFamily(font.family);
		fonts[font.family].add(font);
		return this.set('fontFamily', font.family);
	};
	
	this.replace = function(elements, options) {
		options = merge(defaultOptions, options);
		if (!options.engine) return this; // there's no browser support so we'll just stop here
		var dispatch = function() {
			if (!options.responsive) return replaceElement.apply(null, arguments);
			var args = arguments;
			sharedQueue.add(function() {
				replaceElement.apply(null, args);
			});
		};
		if (elements.nodeType || typeof elements == 'string') elements = [ elements ];
		CSS.ready(function() {
			for (var i = 0, l = elements.length; i < l; ++i) {
				var el = elements[i];
				if (typeof el == 'string') Cufon.replace(options.selector(el), options);
				else dispatch(el, options);
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
		'.cufon-canvas { display: inline; display: inline-block; position: relative; vertical-align: middle; font-size: 1px; line-height: 1px }' +
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
	
	return function(font, text, style, options, node, el) {
		
		var viewBox = font.viewBox;
		
		var size = style.getSize('fontSize', font.baseSize);
		
		var letterSpacing = style.get('letterSpacing');
		letterSpacing = (letterSpacing == 'normal') ? 0 : size.convertFrom(parseInt(letterSpacing, 10));
		
		var chars = Cufon.CSS.textTransform(text, style).split('');
		
		var width = 0;
		var height = size.convert(viewBox.height);
		
		var lastWidth = null;
		
		for (var j = 0, k = chars.length; j < k; ++j) {
			var glyph = font.glyphs[chars[j]] || font.missingGlyph;
			if (!glyph) continue;
			width += lastWidth = Number(glyph.w || font.w) + letterSpacing;
		}
		
		if (lastWidth === null) return null; // there's nothing to render
		
		var adjust = viewBox.width - lastWidth;
		var scale = height / viewBox.height;
		
		var wrapper = document.createElement('span');
		wrapper.className = 'cufon cufon-canvas';
		wrapper.alt = text;
		
		var canvas = document.createElement('canvas');
		
		var wStyle = wrapper.style;
		var cStyle = canvas.style;
		
		canvas.width = Math.ceil(size.convert(-viewBox.minX + width + adjust));
		canvas.height = Math.ceil(height);
		wStyle.paddingLeft = Math.ceil(size.convert(width)) + 'px';
		wStyle.paddingBottom = (size.convert(font.height) - 1 + HAS_INLINE_BLOCK) + 'px';
		cStyle.top = Math.floor(size.convert(viewBox.minY - font.ascent)) + 'px';
		cStyle.left = Math.floor(size.convert(viewBox.minX)) + 'px';
		
		var g = canvas.getContext('2d');
		
		g.scale(scale, scale);
		g.translate(-viewBox.minX, -viewBox.minY);
		
		g.lineWidth = font.face['underline-thickness'];
		
		g.save();
		
		function line(y, color) {
			g.strokeStyle = color;
			
			g.beginPath();
			
			g.moveTo(0, y);
			g.lineTo(width, y);
			
			g.stroke();
		}
		
		var textDecoration = options.enableTextDecoration ? Cufon.CSS.textDecoration(el, style) : {};
		
		if (textDecoration.underline) line(-font.face['underline-position'], textDecoration.underline);
		if (textDecoration.overline) line(-font.face['ascent'], textDecoration.overline);
		
		g.fillStyle = style.get('color');
		
		for (var j = 0, k = chars.length; j < k; ++j) {
			var glyph = font.glyphs[chars[j]] || font.missingGlyph;
			if (!glyph) continue;
			g.beginPath();
			if (glyph.d) {
				if (glyph.code) interpret(glyph.code, g);
				else glyph.code = generateFromVML('m' + glyph.d, g);
			}
			g.fill();
			g.translate(Number(glyph.w || font.w) + letterSpacing, 0);
			g.beginPath();
		}
		
		g.restore();
		
		if (textDecoration['line-through']) line(font.face['descent'], textDecoration['line-through']);
		
		wrapper.appendChild(canvas);
		
		return wrapper;
			
	};
	
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
	
	var typeIndex = 0;

	// Original by Dean Edwards.
	// Modified to work well with relative units (em, ex, %).
	function getFontSizeInPixels(el, value) {
		var unit = (value.match(/[a-z%]+$/)[0] || '').toLowerCase(), value = parseFloat(value, 10), result;
		if (unit == 'px') return value;
		var style = el.style.left, runtimeStyle = el.runtimeStyle.left;
		el.runtimeStyle.left = el.currentStyle.left;
		switch (unit) {
			case '%':
			case 'em':
				el.style.left = '1em';
				break;
			case 'ex':
				el.style.left = '2ex';
				break;
			default:
				el.style.left = value + unit;
		}
		result = el.style.pixelLeft;
		el.style.left = style;
		el.runtimeStyle.left = runtimeStyle;
		return result;
	}

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
	
	return function(font, text, style, options, node, el) {
	
		// @todo word-spacing, text-decoration
	
		var viewBox = font.viewBox;
		
		var size = style.computedFontSize || (style.computedFontSize = new Cufon.CSS.Size(getFontSizeInPixels(el, style.get('fontSize')) + 'px', font.baseSize));
		
		var letterSpacing = style.computedLSpacing;
		
		if (letterSpacing == undefined) {
			letterSpacing = style.get('letterSpacing');
			style.computedLSpacing = letterSpacing = (letterSpacing == 'normal') ? 0 : size.convertFrom(getFontSizeInPixels(el, letterSpacing));
		}
		
		var glyphWidth = Math.ceil(size.convert(viewBox.width));
		var glyphHeight = Math.ceil(size.convert(viewBox.height));
		
		var wrapper = document.createElement('span');
		wrapper.className = 'cufon cufon-vml';
		wrapper.alt = text;
		
		var canvas = document.createElement('cvml:group');
		
		var wStyle = wrapper.runtimeStyle;
		var cStyle = canvas.runtimeStyle;
		
		cStyle.height = glyphHeight;
		cStyle.top = Math.floor(size.convert(viewBox.minY - font.ascent));
		cStyle.left = size.convert(viewBox.minX);
		
		wStyle.height = size.convert(-font.ascent + font.descent) + 'px';
		
		var textDecoration = options.enableTextDecoration ? Cufon.CSS.textDecoration(el, style) : {};
		
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
			
			advance = Number(glyph.w || font.w) + letterSpacing;
			
			width += advance;
			offsetX += advance;
			
		}
		
		if (advance === null) return null;
		
		var fullWidth = -viewBox.minX + width + (viewBox.width - advance);
		
		canvas.coordsize = fullWidth + ',' + viewBox.height;
		
		cStyle.width = size.convert(fullWidth);
		
		wStyle.width = Math.max(Math.ceil(size.convert(width)), 0);
		
		wrapper.appendChild(canvas);
				
		return wrapper;
		
	};
	
})());
