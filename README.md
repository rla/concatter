Concatter
=========

Helper utility to build single-file JavaScript applications.
It uses NodeJS-styled `require` function calls to resolve file concatenation order.
It is quite experimental at the moment and does not support cyclic dependencies.

Usage
-----

```
$ concatter --help

  Usage: concatter [options]

  Options:

    -h, --help             output usage information
    -b, --base <path>      base path for modules
    -i, --indent <indent>  indent for module wrapping
    -o, --output <path>    name of the output file
    -V, --version          output the version number
```

Example
-------

Lets say we have project with the following structure:

```
example/
|-- module1
|   `-- a.js
|-- module2
|   `-- b.js
`-- module3
    `-- c.js
```

and `a.js`, `b.js`, `c.js` are following:

a.js:
```javascript
var b = require('../module2/b');

exports.a = function() {
    console.log(b.b());
};
```

b.js:
```javascript
var c = require('../module3/c');

exports.c = function() {
    console.log(c.c());
};
```

c.js:
```javascript
exports.c = function() {
    console.log('c');
};
```

then the project is compiled to a single file using the command `concatter --base example`
which results in the following output:

```javascript
module1 = {};
module1.a = {};
module2 = {};
module2.b = {};
module3 = {};
module3.c = {};

module3.c = (function(exports) {
    exports.c = function() {
        console.log('c');
    };

    return exports;
})({});

module2.b = (function(exports) {
    var c = module3.c;

    exports.c = function() {
        console.log(c.c());
    };

    return exports;
})({});

module1.a = (function(exports) {
    var b = module2.b;

    exports.a = function() {
        console.log(b.b());
    };

    return exports;
})({});
```