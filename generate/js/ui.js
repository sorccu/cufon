(function() {

	var Cookie = {

		read: function(name) {
			var re = new RegExp('(?:^|\\s|;)' + name + '=([^;]+)');
			return decodeURIComponent((document.cookie.match(re) || [])[1] || '');
		},

		write: function(name, value, maxAge) {
			value = value.toString();
			document.cookie = [
				encodeURIComponent(name) + '=' + encodeURIComponent(value),
				'Max-Age: ' + (value === '' ? -1 : (isNaN(maxAge) ? 2592000 : maxAge))
			].join('; ');
		}

	};

	function addEvent(el, type, listener) {
		if (!el) return;
		if (el.addEventListener) {
			el.addEventListener(type, listener, false);
		}
		else if (el.attachEvent) {
			el.attachEvent('on' + type, function() {
				return listener.call(el, window.event);
			});
		}
	}

	function byId(id) {
		return document.getElementById(id);
	}

	function byTag(tag, el) {
		if (!el) return [];
		return el.getElementsByTagName(tag);
	}

	function handle(el) {
		var callback, node, clone, anchor, target, list, input;
		switch (el.nodeName.toLowerCase()) {
			case '#text':
				// fall through
			case 'img':
				return handle(el.parentNode);
			case 'a':
				if (/callback/.test(el.className)) {
					callback = byId('icallback');
					if (callback) {
						callback.value = el.title;
						el.blur();
						return true;
					}
				}
				if (/new/.test(el.className)) {
					for (node = el.parentNode; node; node = node.parentNode) {
						if (node.nodeName.toLowerCase() != 'li') continue;
						clone = node.cloneNode(true);
						anchor = node.nextSibling;
						list = node.parentNode;
						if (anchor) list.insertBefore(clone, anchor);
						else list.appendChild(clone);
						input = byTag('input', clone)[0];
						input.value = '';
						input.focus();
						byTag('input', clone)[1].checked = false;
						Cufon.CSS.removeClass(list, 'no-del');
						return true;
					}
				}
				if (/del/.test(el.className)) {
					for (node = el.parentNode; node; node = node.parentNode) {
						if (node.nodeName.toLowerCase() != 'li') continue;
						list = node.parentNode;
						list.removeChild(node);
						if (byTag('li', list).length < 2) {
							Cufon.CSS.addClass(list, 'no-del');
						}
						return true;
					}
				}
				if (/more/.test(el.className)) {
					target = byId(el.href.replace(/^.*#/, ''));
					if (target) {
						Cufon.CSS.removeClass(target, 'hidden');
						Cufon.CSS.addClass(el, 'hidden');
						return true;
					}
				}
				return false;
		}
		return false;
	}

	function fetch() {
		var list, template, container, node, el, i, l;
		list = Cookie.read('cu_dom');
		if (list) {
			list = decodeURIComponent(list).split(',');
			template = byTag('li', byId('security'))[0];
			for (i = 0, l = list.length; i < l; ++i) {
				el = template.cloneNode(true);
				byTag('input', el)[0].value = list[i].replace(/\s/g, '');
				byTag('input', el)[1].checked = true;
				container = template.parentNode;
				container.insertBefore(el, template);
				Cufon.CSS.removeClass(container, 'no-del');
			}
		}
		list = Cookie.read('cu_gly');
		if (list) {
			list = decodeURIComponent(list).split(',');
			for (i = 0, l = list.length; i < l; ++i) {
				el = byId(list[i]);
				if (el) {
					el.checked = true;
					for (node = el.parentNode; node; node = node.parentNode) {
						if (node.nodeName.toLowerCase() == 'dl') {
							if (/hidden/.test(node.className)) {
								Cufon.CSS.removeClass(node, 'hidden');
								handle(byId('more-extra-glyphs'));
							}
							break;
						}
					}
				}
			}
		}
		el = byId('icustomGlyphs');
		if (el) el.value = (Cookie.read('cu_cly') || '');
		el = byId('iuseGlyphCSSRange');
		if (el) el.checked = (Cookie.read('cu_lyr') == 'yes');
	}

	function store(e) {
		var form = byId('generator'), inputs, input, list;
		inputs = form.elements['domains[]']
		if (inputs.nodeType) inputs = [ inputs ];
		list = [];
		for (i = 0; input = inputs[i]; ++i) {
			if (input.value === '' || !byTag('input', input.parentNode)[1].checked) continue;
			list.push(input.value);
		}
		Cookie.write('cu_dom', list);
		inputs = form.elements['glyphs[]'];
		if (inputs.nodeType) inputs = [ inputs ];
		list = [];
		for (i = 0; input = inputs[i]; ++i) {
			if (input.checked) list.push(input.id);
		}
		Cookie.write('cu_gly', list);
		input = byId('icustomGlyphs');
		Cookie.write('cu_cly', input ? input.value : '');
		input = byId('iuseGlyphCSSRange');
		Cookie.write('cu_lyr', (input && input.checked) ? 'yes' : '');
	}

	addEvent(document, 'click', function(e) {
		if (!handle(e.target || e.srcElement)) return;
		if (e.preventDefault) e.preventDefault();
		else e.cancelBubble = true;
		if (e.stopPropagation) e.stopPropagation();
		else e.returnValue = false;
	});

	addEvent(window, 'load', function() {
		if (!byId('generator')) return;
		addEvent(byId('generator'), 'submit', store);
		fetch();
	});

})();
