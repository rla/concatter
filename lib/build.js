var tools = require('./tools');
var E = tools.E;
var glob = require('glob');
var fs = require('fs');
var path = require('path');

function find(dir, cb) {
    glob(dir + '/**/*.js', E(cb, function(files) {
        var readers = [];
        var modules = [];
        files.forEach(function(file) {
            readers.push(function(cb) {
                fs.readFile(file, E(cb, function(content) {
                    modules.push({ file: file, content: content.toString(), base: dir });
                    cb();
                }));
            });
        });
        tools.series(readers, function(err) {
            cb(err, modules);
        });
    }));
}

function dependify(modules) {
    
    function search(file) {
        for (var i in modules) {
            if (modules[i].file === file) {
                return modules[i];
            } 
        }
        return null;
    }
    
    modules.forEach(function(module) {
        var finder = /require\([^\)]*\)/g;
        module.dependencies = [];
        module.content = module.content.replace(finder, function(match) {
            var single = match.match(/'([^']*)'/);
            var double = match.match(/"([^']*)"/);
            var name = (single ? single[1] : double[1]) + '.js';
            var dependency = path.normalize(path.dirname(module.file) + '/' + name);
            var required = search(dependency);
            if (!required) {
                throw new Error('No such module ' + dependency + '. Required in ' + module.file);
            }
            module.dependencies.push(dependency);
            return required.path.join('.');            
        });
    });
}

function wrap(modules, indent) {
    
    function wrap(module) {
        
        function indented(lines) {
            var ret = [];
            lines.forEach(function(line) {
                ret.push(indent + line);
            });
            return ret;
        }
        
        var lines = module.content.split(/\n\r?/);
        var code = indented(lines).join('\n') + '\n\n';
        var header = module.path.join('.') + ' = (function(exports) {\n';
        var footer = indent + 'return exports;\n})({});\n'; 
        return header + code + footer;
    }
    
    modules.forEach(function(module) {
        module.wrapped = wrap(module);
    });
}

function sort(modules) {
    var sorted = [];
    var starts = [];
    
    modules.forEach(function(module) {
        var outgoing = false;
        modules.forEach(function(dep) {
            if (dep.dependencies.indexOf(module.file) >= 0) {
                outgoing = true;
            }
        });
        if (!outgoing) {
            starts.push(module);
        }
    });
    
    starts.forEach(function(module) {
        visit(module);
    });
    
    function visit(module) {
        if (!module.visited) {
            module.visited = true;
            modules.forEach(function(dep) {
                if (module.dependencies.indexOf(dep.file) >= 0) {
                    visit(dep);
                }
            });
            sorted.push(module);
        }        
    }
    
    return sorted;
}

function pathify(modules, root) {
    
    function pathifyModule(base, file) {
        var relative = file.substring(base.length, file.length);
        var tokens = relative.substring(1, relative.length - 3);
        var path = tokens.split('/');
        if (root) {
            path.unshift(root);
        }
        return path;
    }
    
    modules.forEach(function(module) {
        module.path = pathifyModule(module.base, module.file);
    });
}

function write(modules, file, cb) {
    var paths = [];
    modules.forEach(function(module) {
        var prefix = [];
        module.path.forEach(function(token) {
            prefix.push(token);
            var path = prefix.join('.');
            if (paths.indexOf(path) < 0) {
                paths.push(path);
            }
        });
    });
    paths.sort();
    var code = '';
    paths.forEach(function(path) {
        code += path + ' = {};\n';
    });
    code += '\n';
    modules.forEach(function(module) {
        code += module.wrapped + '\n';
    });
    if (file) {
        fs.writeFile(file, code, cb);
    } else {
        process.stdout.write(code);
        cb();
    }
}

function build(base, output, indent, root, cb) {
    find(base, E(cb, function(modules) {
        pathify(modules, root);
        dependify(modules);
        wrap(modules, indent);
        write(sort(modules), output, cb);
    }));
}

exports.build = function(base, output, indent, root) {
    build(base, output, indent, root, function(err, modules) {
        if (err) {
            process.stderr.write(err);
            process.exit(1);
        }
    });
};