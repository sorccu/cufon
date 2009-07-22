(function() {

	function addEvent(el, type, listener) {
		if (el.addEventListener) {
			el.addEventListener(type, listener, false);
		}
		else if (el.attachEvent) {
			el.attachEvent('on' + type, function() {
				return listener.call(el, window.event);
			});
		}
	}

	function handle(el) {
		switch (el.nodeName.toLowerCase()) {
			case '#text':
				// fall through
			case 'img':
				return handle(el.parentNode);
			case 'a':
				if (/callback/.test(el.className)) {
					var callback = document.getElementById('icallback');
					if (callback) {
						callback.value = el.title;
						el.blur();
						return true;
					}
				}
				return false;
		}
		return false;
	}

	addEvent(document, 'click', function(e) {
		if (!handle(e.target || e.srcElement)) return;
		if (e.preventDefault) e.preventDefault();
		else e.cancelBubble = true;
		if (e.stopPropagation) e.stopPropagation();
		else e.returnValue = false;
	});

})();
