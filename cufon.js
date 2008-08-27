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
	
		Size: function(value) {
		
			this.convert = function(value, base) {
				return value / base * this.value;
			};
			
			this.set = function(value, unit) {
				if (unit == undefined) {
					this.value = parseFloat(value, 10);
					this.unit = value.replace(/^[^a-z]*/, '');
				}
				else {
					this.value = value;
					this.unit = unit;
				}
			};
			
			this.toString = function() {
				return this.value + this.unit;
			};
			
			this.set(value);
			
		},
	
		getStyle: function(el) {
			if (window.getComputedStyle) return new Style(window.getComputedStyle(el, ''));
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
			
			return function DOMReady(listener) {
				complete ? listener() : queue.push(listener);
			}
			
		})()
		
	};
	
	this.SVG = {
	
		parsePath: function(path) {
			var cmds = [];
			var parts = path.split(/(?=[a-zA-Z])/);
			for (var i = 0, l = parts.length; i < l; ++i) {
				cmds.push({
					type: parts[i].substr(0, 1),
					coords: parts[i].substr(1).split(/[, ]/)
				});
			}
			return cmds;
		}
			
	};
	
	this.VML = {
	
		parsePath: function(path) {
			var cmds = [];
			var re = /([a-z]+)([0-9, .\-]*)/g, match;
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
	
	function Style(style) {
	
		var custom = {};
		
		this.get = function(property) {
			return custom[property] != undefined ? custom[property] : style[property];
		};
		
		this.getSize = function(property) {
			return new Cufon.CSS.Size(this.get(property));
		};
		
		this.extend = function(styles) {
			for (var property in styles) custom[property] = styles[property];
			return this;
		};
		
	}

	var engines = {}, fonts = {}, sharedQueue = new ExecutionQueue(this), defaultOptions = {
		fontScaling: false,
		fontScale: 1.5,
		textDecoration: true,
		engine: null,
		responsive: true
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
	
	function bind(obj, to) {
		return function() {
			return obj.apply(to, arguments);
		}
	}
	
	function delayed(fn, bind, by) {
		return function() {
			var args = arguments;
			setTimeout(function() {
				fn.apply(bind, args);
			}, by || 10);
		}
	}
	
	function getFont(el, style) {
		if (!style) style = this.CSS.getStyle(el);
		var families = style.get('fontFamily').split(/\s*,\s*/), weight = style.get('fontWeight');
		var weight = {
			normal: 400,
			bold: 700
		}[weight] || parseInt(weight, 10);
		for (var i = 0, l = families.length; i < l; ++i) {
			var family = families[i].toLowerCase();
			if (family[0] == '"' || family[0] == "'") family = family.substring(1, family.length - 1);
			if (fonts[family]) {
				if (fonts[family][weight]) return fonts[family][weight];
				var closest = null;
				for (var alt in fonts[family]) {
					alt = parseInt(alt, 10);
					if (!closest || (alt < weight && alt > closest)) closest = alt;
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
					var replaceWith = engines[options.engine](font, pad + words[i] + (i < l - 1 ? ' ' : ''), style, options, node);
					if (replaceWith) node.parentNode.insertBefore(replaceWith, node);
					pad = '';
				}
				node.parentNode.removeChild(node);
			}
			else if (node.firstChild && !/cufon/.test(node.className)) {
				arguments.callee.call(this, node, styles, options);
			}
		}
	}
	
	this.loadFont = function(src, onLoad) {
		var loader = document.createElement('script');
		loader.type = 'text/javascript';
		if (onLoad) {
			addEvent(loader, 'load', function() {
				Cufon.DOM.ready(onLoad);
			});
			addEvent(loader, 'readystatechange', function() {
				if (!{ loaded: true, complete: true}[loader.readyState]) return;
				Cufon.DOM.ready(onLoad);
			});
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
		var dispatch = bind(function() {
			if (!options.responsive) return replaceElement.apply(this, arguments);
			var args = arguments;
			sharedQueue.add(function() {
				replaceElement.apply(this, args);
			});
		}, this);
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