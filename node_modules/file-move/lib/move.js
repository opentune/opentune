var fs = require('fs'),
    alternate_move,
    moveFile;

alternate_move = function (origin, destination, next) {
    var read  = fs.createReadStream(origin),
        write = fs.createWriteStream(destination);

    read.pipe(write);

    write.on('close', function () {
        fs.unlink(origin, function (err) {
            next(err);
        });
    });
};

moveFile = function (origin, destination, next) {
    fs.rename(origin, destination, function (err) {
        if (err) {return alternate_move(origin, destination, next);}
        next(null);
    });
};

module.exports = moveFile;