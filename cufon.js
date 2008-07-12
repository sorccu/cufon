/**
 * Idea:
 *
 * Most of the coords are relative and therefore usually between -127 and 127,
 * so it might be possible to replace them with ascii characters to further decrease
 * download size. However this might slow down the engine a bit so it would probably
 * be wise to offer this functionality as an alternative rather than replacing the
 * current engine with it. It would probably decrease file size by 10-30%.
 */

var Cufon = new function() {

	this.CSS = {
	
		getStyle: function(el) {
			if (el.currentStyle) return new Style(el.currentStyle);
			if (window.getComputedStyle) return new Style(window.getComputedStyle(el, ''));
			return new Style(el.style);
		},
		
		textTransform: function(text, style) {
			return text[{
				'uppercase': 'toUpperCase',
				'lowercase': 'toLowerCase'
			}[style.get('text-transform')] || 'toString']();
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
			var parts = path.split(/(?=[a-zA-Z])/);
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
	
	function Style(style) {
	
		if (!arguments.callee.propertyMap) arguments.callee.propertyMap = {};
		
		var custom = {}, propertyMap = arguments.callee.propertyMap;
		
		function map(property) {
			return propertyMap[property] || (propertyMap[property] = property.replace(/-([a-z])/g, function($0, $1) {
				return $1.toUpperCase();
			}));
		}
		
		this.get = function(property, unit) {
			if (custom[property] != undefined) return custom[property];
			var mapped = map(property);
			if (custom[mapped] != undefined) return custom[mapped];
			if (unit && style.getPropertyCSSValue) try {
				switch (unit) {
					case 'px':
						return style.getPropertyCSSValue(property).getFloatValue(5);
						break;
				}
			}
			catch (e) {}
			return style[mapped];
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
		var families = style.get('font-family').split(/\s*,\s*/);
		var weight = {
			normal: 400,
			bold: 700
		}[style.get('font-weight')] || parseInt(style.get('font-weight'), 10);
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