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
		
			this.value = parseFloat(value);
			this.unit = String(value).match(/[a-z%]*$/)[0] || 'px';
		
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
			
			var styleElements = elementsByTagName('style');
			var linkElements = elementsByTagName('link');
			
			DOM.ready(function() {
				var linkStyles = 0;
				for (var i = 0, l = linkElements.length; i < l; ++i) {
					if (/stylesheet/i.test(linkElements[i].type)) ++linkStyles;
				}
				if (document.styleSheets.length >= styleElements.length + linkStyles) perform();
				else setTimeout(arguments.callee, 10);
			});
			
			return function(listener) {
				if (complete) listener();
				else queue.push(listener);
			};
			
		})(),

		supports: function(property, value) {
			var checker = document.createElement('span').style;
			if (checker[property] === undefined) return false;
			checker[property] = value;
			return checker[property] === value;
		},
		
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
		
		textShadow: cached(function(value) {
			if (value == 'none') return null;
			var shadows = [], currentShadow = {}, result, offCount = 0;
			var re = /(#[a-f0-9]+|[a-z]+\(.*?\)|[a-z]+)|(-?[\d.]+[a-z%]*)|,/ig;
			while (result = re.exec(value)) {
				if (result[0] == ',') {
					shadows.push(currentShadow);
					currentShadow = {}, offCount = 0;
				}
				else if (result[1]) {
					currentShadow.color = result[1];
				}
				else {
					currentShadow[[ 'offX', 'offY', 'blur' ][offCount++]] = result[2];
				}
			}
			shadows.push(currentShadow);
			return shadows;
		}),
		
		color: cached(function(value) {
			var parsed = {};
			parsed.color = value.replace(/^rgba\((.*?),\s*([\d.]+)\)/, function($0, $1, $2) {
				parsed.opacity = parseFloat($2);
				return 'rgb(' + $1 + ')';
			});
			return parsed;
		}),
		
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
		
		var face = this.face = data.face;
		this.glyphs = data.glyphs;
		this.w = data.w;
		this.baseSize = parseInt(face['units-per-em'], 10);
		
		this.family = face['font-family'].toLowerCase();
		this.weight = face['font-weight'];
		this.style = face['font-style'] || 'normal';
		
		this.viewBox = (function () {
			var parts = face.bbox.split(/\s+/);
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
		
		this.ascent = -parseInt(face.ascent, 10);
		this.descent = -parseInt(face.descent, 10);
		
		this.height = -this.ascent + this.descent;
		
	}
	
	function FontFamily() {

		this.styles = {};
		
		this.add = function(font) {
			(this.styles[font.style] || (this.styles[font.style] = {}))[font.weight] = font;
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
			return sizes[property] || (sizes[property] = new CSS.Size(this.get(property), base));
		};
		
		this.extend = function(styles) {
			for (var property in styles) custom[property] = styles[property];
			return this;
		};
		
	}
	
	function asArray(mixed) {
		return mixed == null || mixed instanceof Array ? mixed : [ mixed ];
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
	
	function cached(fun) {
		var cache = {};
		return function(key) {
			if (!cache.hasOwnProperty(key)) cache[key] = fun.apply(null, arguments);
			return cache[key];
		};	
	}
	
	function getFont(el, style) {
		if (!style) style = CSS.getStyle(el);
		var families = style.get('fontFamily').split(/\s*,\s*/), family;
		for (var i = 0, l = families.length; i < l; ++i) {
			family = families[i].toLowerCase();
			if (family[0] == '"' || family[0] == "'") family = family.substring(1, family.length - 1);
			if (fonts[family]) return fonts[family].get(style.get('fontStyle'), style.get('fontWeight'));
		}
		return null;
	}
	
	function elementsByTagName(query) {
		return document.getElementsByTagName(query);
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
		return engines[options.engine].apply(null, arguments);
	}
	
	function replaceElement(el, options) {
		var storage = sharedStorage.get(el);
		if (!options) options = storage.options;
		var font, style, nextNode;
		for (var node = el.firstChild; node; node = nextNode) {
			nextNode = node.nextSibling;
			if (node.nodeType == 1) {
				if (!node.firstChild) continue;
				if (!/cufon/.test(node.className)) {
					arguments.callee(node, options);
					continue;
				}
			}
			var text = node.nodeType == 3 ? node.data : node.alt;
			if (text === '') continue;
			if (!style) style = CSS.getStyle(el).extend(options);
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
	var replaceHistory = [];
	
	var engines = {}, fonts = {}, defaultOptions = {
		enableTextDecoration: false,
		engine: null,
		//fontScale: 1,
		//fontScaling: false,
		//hover: false,
		printable: true,
		responsive: false,
		//rotation: 0,
		//selectable: false,
		selector: (
				window.Sizzle
			||	(window.$$ && function(query) { return $$(query); })
			||	window.$
			||	(document.querySelectorAll && function(query) { return document.querySelectorAll(query); })
			||	elementsByTagName
		),
		separateWords: true,
		textShadow: 'none'
	};
	
	this.registerEngine = function(id, engine) {
		if (engine) engines[id] = engine;
		return this;
	};
	
	this.registerFont = function(data) {
		var font = new Font(data), family = font.family;
		if (!fonts[family]) fonts[family] = new FontFamily();
		fonts[family].add(font);
		return this.set('fontFamily', family);
	};
	
	this.refresh = function() {
		var currentHistory = replaceHistory.splice(0, replaceHistory.length);
		for (var i = 0, l = currentHistory.length; i < l; ++i) {
			this.replace.apply(this, currentHistory[i]);
		}
		return this;
	};
	
	this.replace = function(elements, options, ignoreHistory) {
		options = merge(defaultOptions, options);
		if (typeof options.textShadow == 'string') options.textShadow = CSS.textShadow(options.textShadow);
		if (!options.engine) return this; // there's no browser support so we'll just stop here
		if (!ignoreHistory) replaceHistory.push(arguments);
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
				if (typeof el == 'string') Cufon.replace(options.selector(el), options, true);
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
	
	var HAS_INLINE_BLOCK = Cufon.CSS.supports('display', 'inline-block');
	
	var styleSheet = document.createElement('style');
	styleSheet.type = 'text/css';
	styleSheet.appendChild(document.createTextNode(
		'@media screen,projection{' +
			'.cufon-canvas{display:inline;display:inline-block;position:relative;vertical-align:middle;font-size:1px;line-height:1px}' +
			(HAS_INLINE_BLOCK
				? '.cufon-canvas canvas{position:relative}'
				: '.cufon-canvas canvas{position:absolute}') +
			'.cufon-canvas .cufon-alt{display:none}' +
		'}' +
		'@media print{' +
			'.cufon-canvas{padding:0 !important}' +
			'.cufon-canvas canvas{display:none}' +
			'.cufon-canvas .cufon-alt{display:inline}' +
		'}'
	));
	document.getElementsByTagName('head')[0].appendChild(styleSheet);

	Cufon.set('engine', 'canvas');

	function generateFromVML(path, context) {
		var atX = 0, atY = 0;
		var cmds = Cufon.VML.parsePath(path);
		var code = new Array(cmds.length - 1);
		generate: for (var i = 0, l = cmds.length; i < l; ++i) {
			var c = cmds[i].coords;
			switch (cmds[i].type) {
				case 'v':
					code[i] = { m: 'bezierCurveTo', a: [ atX + Number(c[0]), atY + Number(c[1]), atX + Number(c[2]), atY + Number(c[3]), atX += Number(c[4]), atY += Number(c[5]) ] };
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
		
		var expandTop = 0, expandRight = 0, expandBottom = 0, expandLeft = 0;
		var shadows = options.textShadow, shadowOffsets = [];
		if (shadows) {
			for (var i = 0, l = shadows.length; i < l; ++i) {
				var shadow = shadows[i];
				var x = size.convertFrom(parseFloat(shadow.offX));
				var y = size.convertFrom(parseFloat(shadow.offY));
				shadowOffsets[i] = [ x, y ];
				if (y < expandTop) expandTop = y;
				if (x > expandRight) expandRight = x;
				if (y > expandBottom) expandBottom = y;
				if (x < expandLeft) expandLeft = x;
			}
		}
		
		var chars = Cufon.CSS.textTransform(text, style).split('');
		
		var width = 0;
		var height = size.convert(viewBox.height);
		var roundedHeight = Math.ceil(height);
		
		var lastWidth = null;
		
		for (var i = 0, l = chars.length; i < l; ++i) {
			var glyph = font.glyphs[chars[i]] || font.missingGlyph;
			if (!glyph) continue;
			width += lastWidth = Number(glyph.w || font.w) + letterSpacing;
		}
		
		if (lastWidth === null) return null; // there's nothing to render
		
		expandRight += (viewBox.width - lastWidth);
		expandLeft += viewBox.minX;
		
		var wrapper = document.createElement('span');
		wrapper.className = 'cufon cufon-canvas';
		wrapper.alt = text;
		
		var canvas = document.createElement('canvas');
		
		var wStyle = wrapper.style;
		var cStyle = canvas.style;
		
		canvas.width = Math.ceil(size.convert(width + expandRight - expandLeft));
		canvas.height = Math.ceil(size.convert(viewBox.height - expandTop + expandBottom));
		
		// minY has no part in canvas.height
		expandTop += viewBox.minY;
		
		cStyle.top = Math.round(size.convert(expandTop - font.ascent)) + 'px';
		cStyle.left = Math.round(size.convert(expandLeft)) + 'px';
		
		var roundingFactor = roundedHeight / height;
		var wrapperWidth = Math.ceil(size.convert(width * roundingFactor)) + 'px';
		
		if (HAS_INLINE_BLOCK) {
			wStyle.width = wrapperWidth;
			wStyle.height = size.convert(font.height) + 'px';
		}
		else {
			wStyle.paddingLeft = wrapperWidth;
			wStyle.paddingBottom = (size.convert(font.height) - 1) + 'px';
		}
		
		var g = canvas.getContext('2d'), scale = roundedHeight / viewBox.height;
		
		g.scale(scale, scale);
		g.translate(-expandLeft, -expandTop);
		
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
		if (textDecoration.overline) line(font.ascent, textDecoration.overline);
		
		g.fillStyle = style.get('color');
		
		function renderText() {
			for (var i = 0, l = chars.length; i < l; ++i) {
				var glyph = font.glyphs[chars[i]] || font.missingGlyph;
				if (!glyph) continue;
				g.beginPath();
				if (glyph.d) {
					if (glyph.code) interpret(glyph.code, g);
					else glyph.code = generateFromVML('m' + glyph.d, g);
				}
				g.fill();
				g.translate(Number(glyph.w || font.w) + letterSpacing, 0);
			}
		}
		
		if (shadows) {
			for (var i = 0, l = shadows.length; i < l; ++i) {
				var shadow = shadows[i];
				g.save();
				g.fillStyle = shadow.color;
				g.translate.apply(g, shadowOffsets[i]);
				renderText();
				g.restore();
			}
		}
		
		renderText();
		
		g.restore();
		
		if (textDecoration['line-through']) line(-font.descent, textDecoration['line-through']);
		
		wrapper.appendChild(canvas);
		
		if (options.printable) {
			var print = document.createElement('span');
			print.className = 'cufon-alt';
			print.appendChild(document.createTextNode(text));
			wrapper.appendChild(print);
		}
		
		return wrapper;
			
	};
	
})());

Cufon.registerEngine('vml', (function() {

	if (!document.namespaces) return;

	// isn't undocumented stuff great?
	document.write('<!--[if vml]><script type="text/javascript">Cufon.vmlEnabled=true;</script><![endif]-->');
	if (!Cufon.vmlEnabled) return null;
	
	if (document.namespaces['cvml'] == null) {
		document.namespaces.add('cvml', 'urn:schemas-microsoft-com:vml');
		document.write('<style type="text/css">' +
			'@media screen{' + 
				'cvml\\:*{behavior:url(#default#VML);display:inline-block;antialias:true;position:absolute}' +
				'.cufon-vml{display:inline-block;position:relative;vertical-align:middle}' +
				'.cufon-vml .cufon-alt{display:none}' +
				'a .cufon-vml{cursor:pointer}' +
			'}' +
			'@media print{' + 
				'.cufon-vml cvml\\:*{display:none}' +
				'.cufon-vml .cufon-alt{display:inline}' +
			'}' +
		'</style>');
	}

	Cufon.set('engine', 'vml');	
	
	var typeIndex = 0; // this is used to reference VML ShapeTypes

	function getFontSizeInPixels(el, value) {
		if (/(?:em|ex|%)$/i.test(value)) return getSizeInPixels(el, '1em');
		return getSizeInPixels(el, value);
	}
	
	// Original by Dead Edwards.
	// Combined with getFontSizeInPixels it also works with relative units.
	function getSizeInPixels(el, value) {
		if (/px$/i.test(value)) return parseFloat(value);
		var style = el.style.left, runtimeStyle = el.runtimeStyle.left;
		el.runtimeStyle.left = el.currentStyle.left;
		el.style.left = value;
		var result = el.style.pixelLeft;
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
			style.computedLSpacing = letterSpacing = (letterSpacing == 'normal') ? 0 : size.convertFrom(getSizeInPixels(el, letterSpacing));
		}
		
		var wrapper = document.createElement('span');
		wrapper.className = 'cufon cufon-vml';
		wrapper.alt = text;
		
		var canvas = document.createElement('cvml:group');
		
		var wStyle = wrapper.runtimeStyle;
		var cStyle = canvas.runtimeStyle;
		
		var height = size.convert(viewBox.height);
		
		cStyle.height = Math.ceil(height);
		cStyle.top = Math.round(size.convert(viewBox.minY - font.ascent));
		cStyle.left = Math.round(size.convert(viewBox.minX));
		
		var roundingFactor = parseInt(cStyle.height, 10) / height;
		
		wStyle.height = size.convert(-font.ascent + font.descent) + 'px';
		
		var textDecoration = options.enableTextDecoration ? Cufon.CSS.textDecoration(el, style) : {};
		
		var color = style.get('color');
		var chars = Cufon.CSS.textTransform(text, style).split('');
		
		var width = 0, offsetX = 0, advance = null;
		
		var shadows = options.textShadow;
		
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
			
			if (shadows) {
				// the VML shadow element is not used because it can only support
				// up to 2 shadows. and it breaks text selection.
				for (var z = 0, p = shadows.length; z < p; ++z) {
					var shadow = shadows[z];
					var shadowColor = Cufon.CSS.color(shadow.color);
					var shadowNode = shape.cloneNode(false), zStyle = shadowNode.runtimeStyle;
					zStyle.top = size.convertFrom(parseFloat(shadow.offY));
					zStyle.left = offsetX + size.convertFrom(parseFloat(shadow.offX));
					zStyle.zIndex = -1;
					shadowNode.fillcolor = shadowColor.color;
					if (shadowColor.opacity) {
						var shadowFill = document.createElement('cvml:fill');
						shadowFill.opacity = shadowColor.opacity;
						shadowNode.appendChild(shadowFill);
					}
					canvas.appendChild(shadowNode);
				}
			}
			
			advance = Number(glyph.w || font.w) + letterSpacing;
			
			width += advance;
			offsetX += advance;
			
		}
		
		if (advance === null) return null;
		
		var fullWidth = -viewBox.minX + width + (viewBox.width - advance);
		
		canvas.coordsize = fullWidth + ',' + viewBox.height;
		
		cStyle.width = size.convert(fullWidth * roundingFactor);
		
		wStyle.width = Math.max(Math.ceil(size.convert(width * roundingFactor)), 0);
		
		wrapper.appendChild(canvas);
	
		if (options.printable) {
			var print = document.createElement('span');
			print.className = 'cufon-alt';
			print.innerText = text;
			wrapper.appendChild(print);
		}
				
		return wrapper;
		
	};
	
})());
