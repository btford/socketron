var marked = require('marked');
var fs = require('fs');
var ejs = require('ejs');
var spawn = require('child_process').spawn;

// write index.html

var readme = fs.readFileSync('README.md', 'utf8');
var template = fs.readFileSync('site/index.jst', 'utf8');

var pygmentsArgs = [
  '-l', 'javascript',
  '-f', 'html',
  '-O', 'encoding=utf-8,tabsize=2'];


var highlight = function (code, callback) {
  var output = '';

  var pygments = spawn('pygmentize', pygmentsArgs);

  pygments.stderr.on('data', function(error) {
    if (error) {
      console.error(error.toString());
    }
  });
  pygments.stdin.on('error', function(error) {
    console.error('Could not use Pygments to highlight the source.');
    callback(code);
    //return process.exit(1);
  });
  pygments.stdout.on('data', function(result) {
    if (result) {
      output += result;
    }
  });
  pygments.on('exit', function() {
    callback(output);
  });
  if (pygments.stdin.writable) {
    pygments.stdin.write(code);
    pygments.stdin.end();
  }
};

var id = 0;
var toHighlight = {};

// convert readme -> HTML
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
  sanitize: true,
  highlight: function(code, lang) {
    if (lang === 'javascript') {
      id += 1;
      toHighlight[id] = code;
      return '//js:' + id;
    }
    return code;
  }
});
readme = marked(readme);

var writeIndex = function () {
  var html = ejs.render(template, {
    readme: readme,
    css: 'main.css'
  });

  fs.writeFileSync('docs/index.html', html);
};

// highlight all code snippets in the README
var highlightSnippets = function () {
  for (id in toHighlight) {
    if (toHighlight.hasOwnProperty(id)) {
      highlight(toHighlight[id], function (output) {
        readme = readme.replace('//js:' + id, output);
        delete toHighlight[id];
        highlightSnippets();
      });
      return;
    }
  }
  writeIndex();
};

highlightSnippets();

// run docco for libs
require('docco').run([
  '', '',
  '--css',      'site/main.css',
  '--template', 'site/docco.jst',
  'lib/*.js']);

// run docco for unit tests
require('docco').run([
  '', '',
  '--css',      'site/main.css',
  '--template', 'site/docco.jst',
  '--output',   'docs/test/',
  'test/*.js']);
