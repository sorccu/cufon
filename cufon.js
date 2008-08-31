var Cufon = new function() {

	this.CSS = {
	
		Size: function(value, unit) {
		
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
			
			this.set(value, unit);
			
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
		
			var complete = (document.readyState == 'complete');
			
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
	
	this.VML = {
	
		parsePath: function(path) {
			var cmds = [];
			var re = /([mrvxe]|qb)([0-9, .\-]*)/g, match;
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
			var weights = this.styles[style];
			if (!weights) return null;
			weight = {
				normal: 400,
				bold: 700
			}[weight] || parseInt(weight, 10);
			if (weights[weight]) return weights[weight];
			var closest = null;
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
		
	}
	
	function Style(style) {
	
		var custom = {}, sizes = {};
		
		this.get = function(property) {
			return custom[property] != undefined ? custom[property] : style[property];
		};
		
		this.getSize = function(property) {
			return sizes[property] || (sizes[property] = new Cufon.CSS.Size(this.get(property)));
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
		responsive: true,
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
		var families = style.get('fontFamily').split(/\s*,\s*/);
		for (var i = 0, l = families.length; i < l; ++i) {
			var family = families[i].toLowerCase();
			if (family[0] == '"' || family[0] == "'") family = family.substring(1, family.length - 1);
			if (fonts[family]) return fonts[family].get(style.get('fontStyle'), style.get('fontWeight'));
		}
		return null;
	}
	
	function merge() {
		var merged = {};
		for (var i = 0, l = arguments.length; i < l; ++i) {
			for (var key in arguments[i]) merged[key] = arguments[i][key];
		}
		return merged;
	}
	
	function process(font, text, style, options, node) {
		if (options.wordWrap) {
			var fragment = document.createDocumentFragment();
			var words = text.split(/\s+/), pad = ''; // @todo get rid of pad
			for (var i = 0, l = words.length; i < l; ++i) {
				if (words[i] === '') {
					pad = ' ';
					continue;
				}
				fragment.appendChild(engines[options.engine](font, pad + words[i] + (i < l - 1 ? ' ' : ''), style, options, node));
				pad = '';
			}
			return fragment;
		}
		return engines[options.engine](font, text, style, options, node);
	}
	
	function replaceElement(el, styles, options) {
		var font, style;
		for (var node = el.firstChild; node; node = nextNode) {
			var nextNode = node.nextSibling;
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
				if (!{ loaded: true, complete: true}[loader.readyState]) return;
				dispatch();
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
	
	this.registerFont = function(data) {
		var font = new Font(data);
		if (!fonts[font.family]) fonts[font.family] = new FontFamily(font.family);
		fonts[font.family].add(font);
		return this;
	};
	
	this.replace = function(el, styles, options) {
		if (options && options.engine && !engines[options.engine]) throw new Error('Unrecognized Cufon engine: ' + options.engine);
		options = merge(defaultOptions, options);
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