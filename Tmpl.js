var Tmpl = (function(window, document) {
	var fProto = Function.prototype;
	var cache = {};
	
	
	/**
	 * List of regular expressions used to transform XHTML/jQuery syntax into pure
	 * JavaScript syntax.
	 */
	var CHANGE_SHORT_SYNTAX = /\$\{([^\}]*)\}/g;
	var END_CHARACTERS = /[\n\r\t]+/g;
	var COLLAPSE_SPACE = /\s+/g;
	var ESCAPE_CHARACTERS = /\{\{[\s\S]+?\}\}|(["\\])/g;
	var REPLACE_SYNTAX = /\{\{(\/?[a-z]+|[!=])(?:\(([^\)]+)\))?(?:\s+([\S\s]+?))?\}\}/g;
	var REMOVE_EMPTY_PUSHES = /"(?:\\"|[^"])*"|(this\.push\(""(?:\s*,\s*"")*\));/g;
	
	
	/**
	 * HTML wrappers used to enclose the resulting HTML into some needed tags to avoid
	 * incorrect parsing.
	 */
	var WRAP = {
		'area':     [1, '<map>', '</map>'],
		'caption':  [1, '<table>', '</table>'],
		'col':      [2, '<table><colgroup>', '</colgroup><tbody></tbody></table>'],
		'colgroup': [1, '<table>', '</table>'],
		'option':   [1, '<select multiple="multiple">', '</select>'],
		'optgroup': [1, '<select multiple="multiple">', '</select>'],
		'legend':   [1, '<fieldset>', '</fieldset>'],
		'tbody':    [1, '<table>', '</table>'],
		'td':       [3, '<table><tbody><tr>', '</tr></tbody></table>'],
		'tfoot':    [1, '<table>', '</table>'],
		'th':       [3, '<table><tbody><tr>', '</tr></tbody></table>'],
		'thead':    [1, '<table>', '</table>'],
		'tr':       [2, '<table><tbody>', '</tbody></table>']
	};
	
	
	/**
	 * DIV node belonging to a document fragment that has HTML5 nodes enabled in IE. Used
	 * for parsing HTML into objects.
	 */
	var PARSER = (function() {
		var fragment = document.createDocumentFragment();
		var parser = document.createElement('div');
		var html5 = 'abbr article aside audio canvas datalist details figcaption figure footer header hgroup mark meter nav output progress section summary time video'.split(' ');
		
		//Enable HTML5 elements in IE.
		if ('createElement' in fragment) {
			for (var i = html5.length; i--; ) {
				fragment.createElement(html5[i]);
			}
		}
		
		return fragment.appendChild(parser);
	})();
	
	
	/**
	 * Define 'Function.prototype.bind' if not exists.
	 */
	fProto.bind = fProto.bind || function(scope) {
		var method = this;
		
		return function() {
			return method.apply(scope, arguments);
		}
	};
	
	
	/**
	 * Loads a template from a given JavaScript syntax, by compiling it and storing the
	 * function in the cache.
	 */
	function load(name, template) {
		cache[name] = (new Function('$data', compile(template))).bind(tplScope);
	}
	
	
	/**
	 * Loads a template through an XHR connection. Templates can have the 'tpl' extension,
	 * to indicate that the template is a source template; 'tpc', to indicate that it is
	 * already compiled as JavaScript code; or 'tpx' to indicate a collection of
	 * templates.
	 */
	function loadXhr(src, name) {
		var extension = src.substr(src.lastIndexOf('.') + 1);
		var xhr = window.XMLHttpRequest? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
		var xhrHandler;
		
		//Define handler.
		xhrHandler = function() {
			if ((xhr.readyState === 4) && (xhr.status === 200)) {
				//Switch depending on the extension.
				switch (extension) {
				case 'tpl': //Source template.
					load(name, xhr.responseText);
					break;
				
				case 'tpc': //Compiled template.
					cache[name] = (new Function('$data', xhr.responseText)).bind(tplScope);
					break;
				
				case 'tpx': //Collection of compiled templates.
					tplCollection(xhr.responseText);
					break;
					
				default:
					throw new Error('Invalid template format detected: ' + extension);
				}
				
				//Ensure that the resources are freed.
				xhr.onreadystatechange = null;
				xhr = null;
			}
		};
		
		//Perform the HTTP request.
		xhr.open('GET', src, true);
		xhr.onreadystatechange = xhrHandler;
		xhr.send(null);
	}
	
	
	/**
	 * Parses a collection of compiled templates. Useful to use when templates are
	 * transformed at build time, and bundled into a one, single file.
	 */
	function tplCollection(templates) {
		var splitted = templates.split(END_CHARACTERS);
		var template;
		var position;
		var name;
		
		for (var i = splitted.length; i--; ) {
			template = splitted[i];
			position = template.indexOf('=');
			
			cache[template.substr(0, position)] = (new Function('$data', template.substr(position + 1))).bind(tplScope);
		}
	}
	
	
	/**
	 * Returns a template, given its name.
	 */
	function template(name) {
		return cache[name] || null;
	}
	
	
	/**
	 * List of the default parameters to be used in case they are not provided.
	 */
	var defaultParams = {
		'for': ['$index'],
		'each': ['$index', '$value'],
		'tmpl': ['{}']
	};
	
	
	/**
	 * Compiles a template, transforming HTML and jQuery templates code into valid
	 * JavaScript syntax. Returns the piece of code ready to be inserted inside a
	 * function.
	 */
	function compile(template) {
		var blocks = [];
		var compiled = [
			'var $control={},$$=[];$$.n={};with($data){$$.push("',
			
			template
				.replace(CHANGE_SHORT_SYNTAX, '{{= $1}}')
				.replace(END_CHARACTERS, '')
				.replace(COLLAPSE_SPACE, ' ')
				.replace(ESCAPE_CHARACTERS, function(match, character) { return character? '\\' + character : match; })
				.replace(REPLACE_SYNTAX, function(match, op, param, arg) {
					var params;
					var p1, p2;
					var code;
					
					//Create params list.
					params = (param && param.split(/\s*,\s*/g)) || [];
					params = params.concat((defaultParams[op] || []).slice(params.length));
					
					//Extract params.
					p1 = params[0];
					p2 = params[1];
					
					//Switch depending on the operator.
					switch (op) {
					case '!':
						code = '';
						break;
						
					case '=':
						code = 'try{$$.push(this.i((' + arg + ')))}catch(e){this.w("${}: ' + arg + ' is undefined")}';
						break;
						
					case 'html':
						code = 'try{$$.push(' + arg + ')}catch(e){this.w("Html: ' + arg + ' is undefined")}';
						break;
						
					case 'tmpl':
						code = 'try{$$.push(this.i(this.t("' + arg + '")(' + p1 + '),$$.n))}catch(e){console.log(e);this.w("Tmpl: ' + arg + ' does not exist")}';
						break;
						
					case 'if':
						code = 'if(' + arg + '){';
						break;
						
					case 'else':
						code = (arg? '}else if(' + arg + '){' : '}else{');
						break;
						
					case 'switch':
						code = 'try{switch(' + (blocks.push(arg), arg) + '){case void 0:';
						break;
						
					case 'case':
						code = 'break;case(' + arg + '):';
						break;
						
					case 'for':
						code = 'for(' + p1 + '=' + (arg = arg.split(';'), arg[0]) + ';' + p1 + (((arg[2] || 1) > 0)? '<=' : '>=') + arg[1] + ';' + p1 + '+=' + (arg[2] || 1) + '){';
						break;
						
					case 'each':
						code = 'try{for(' + p1 + ' in ' + (blocks.push(arg), arg) + '){if(' + arg + '.hasOwnProperty(' + p1 + ')){var ' + p2 + '=' + arg + '[' + p1 + ']' + ';with(' + p2 + '){';
						break;
						
					case 'default':
						code = 'break;default:';
						break;
						
					case '/if':
						code = '}';
						break;
						
					case '/for':
						code = '}';
						break;
						
					case '/switch':
						code = '}}catch(e){this.w("Switch: ' + blocks.pop() + ' is undefined")}';
						break;
						
					case '/each':
						code = '}}}}catch(e){this.w("Each: ' + blocks.pop() + ' is undefined")}';
						break;
						
					default:
						throw new SyntaxError('Invalid operation: ' + op);
					}
					
					return '");' + code + '$$.push("';
				}),
				
			'")}return this.c(this.p($$.join("")), $$.n);'
		].join('').replace(REMOVE_EMPTY_PUSHES, function(match, empty) { return empty? '' : match; });
		
		//Return compiled code.
		return compiled;
	}
	
	
	/**
	 * Returns a document fragment with the HTML parsed. Uses an improved implementation
	 * of the innerShiv script.
	 */
	function parse(html, nodes) {
		var fragment = document.createDocumentFragment();
		var node = html.match(/<([A-Za-z][A-Za-z0-9]*)/);
		var wrap = WRAP[(node && node[1]) || ''];
		var sandbox = PARSER;
		var el;
		
		//Set HTML.
		PARSER.innerHTML = wrap? [wrap[1], html, wrap[2]].join('') : html;
		
		//Look for the node.
		for (var i = (wrap && wrap[0]) || 0; i--; )  {
			sandbox = sandbox.firstChild;
		}
		
		//Extract children.
		while (el = sandbox.firstChild) {
			fragment.appendChild(el);
		}
		
		//Empty parser and free memory.
		PARSER.innerHTML = '';
		el = null;
		
		//Return fragment.
		return fragment;
	}
	
	
	/**
	 * Prepares a value to be inserted. If the value inserted is a node, or an instance
	 * of it, a placeholder (a comment node) is inserted. This placeholder will be removed
	 * after by the 'make' function.
	 */
	function insert(value, nodes) {
		var uid;
		
		if (value.nodeType && typeof (value.nodeName === 'string')) {
			nodes[uid = (+new Date()) + '' + Math.random()] = value;
			
			return '<!--' + uid + '-->';
			
		} else {
			return ('' + value).replace(/[<>"']/g, function(chr) {
				return '&#' + chr.charCodeAt(0) + ';';
			});
		}
	}
	
	
	/**
	 * Replaces comment nodes used as a placeholder with the node to be inserted.
	 */
	function replaceComments(el, nodes) {
		var child = el.firstChild;
		var inserted;
		
		if (child) {
			do {
				if ((child.nodeName === '#comment') && (inserted = nodes[child.nodeValue])) {
					el.replaceChild(inserted, child); child = inserted;
				} else {
					replaceComments(child, nodes);
				}
			} while (child = child.nextSibling);
		}
		
		return el;
	}
	
	
	/**
	 * Default function to warn about errors found in a template. It can be overwritten
	 * by other pieces of code, (for supressing warnings, logging errors...)
	 */
	function warn(data) {
		if (window.console && window.console.warn) {
			console.warn(data);
		}
	}
	
	
	/**
	 * Public method exposed for being able to change the warning method. Specially
	 * useful for logging errors in production; or for testing purposes.
	 */
	function setWarn(method) {
		if (typeof method === 'function') {
			tplScope['w'] = method;
		} else {
			tplScope['w'] = warn;
		}
	}
	
	
	//Create private special scope for template functions.
	var tplScope = {
		't': template,
		'p': parse,
		'i': insert,
		'c': replaceComments,
		'w': warn
	};
	
	
	//Export public methods outside.
	return {
		load: load,
		loadXhr: loadXhr,
		template: template,
		compile: compile,
		setWarn: setWarn
	};
})(window, document);
