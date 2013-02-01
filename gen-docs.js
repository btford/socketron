var marked = require('marked');
var fs = require('fs');
var ejs = require('ejs');

// write index.html

var readme = fs.readFileSync('README.md', 'utf8');
var template = fs.readFileSync('site/index.jst', 'utf8');

// convert readme -> HTML
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
  sanitize: true
});
readme = marked(readme);

var html = ejs.render(template, {
  readme: readme,
  css: 'main.css'
});

fs.writeFileSync('docs/index.html', html);

// run docco
require('docco').run([
  '--css', 'site/main.css',
  '--template','site/docco.jst',
  'lib/*.js']);
