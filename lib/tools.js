exports.E = function(cb1, cb2) {
    return function(err) {
        if (err) {
            cb1(err);
        } else {
            cb2.apply(null, Array.prototype.slice.call(arguments, 1));
        }
    };
};

exports.series = function(queue, cb) {
    var i = -1;

    function run() {
        i++;
        if (i >= queue.length) {
            cb(null);
        } else {
            queue[i](function(err) {
                if (err) {
                    cb(err);
                } else {
                    run();
                }
            });
        }
    }
    
    run();
};