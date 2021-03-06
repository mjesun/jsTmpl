# jsTmpl

## What is it about?

jsTmpl is a lightweight template engine, specifically designed to perform client-side rendering, returning document fragments which can be directly inserted into the document. The syntax is strongly inspired in jQuery templates, in order to facilitate learning and portability, if desired.


## Licensing

jsTmpl is released under the MIT license.

## Characteristics

 * Small size (~4 Kb minimized, ~2 Kb gzipped).
 * Library agnostic.
 * Compatible with Google Closure Compiler with advanced optimizations.
 * Compatible with strict mode ("use strict").
 * Control structures: ${}, if/else, switch, for, each, tmpl...
 * Control variables by using the $control object, without messing original data.
 * XSS safe.
 * Built-in XHR loading system, for loading source, compile or bundled templates.
 * Works on IE6+, FF3+, CH1+, SF3+ and OP9+.
 * Support for HTML5 elements in IE6+.
 * Cache for compiled templates.