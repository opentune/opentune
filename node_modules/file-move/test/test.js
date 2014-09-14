var testutil = require('testutil'),
    fs       = require('fs'),
    path     = require('path'),
    crypto   = require('crypto'),
    move     = require('../index');

describe('#File-move', function () {
    var SIZE = 16 * 64 * 1024 + 7,
        DIR_TEST;

    beforeEach(function (done) {
        DIR_TEST = testutil.createTestDir('file-move');
        done();
    });

    describe('+ move', function () {
        it('should move the file asynchronously', function (done) {
            var src     = path.join(DIR_TEST, 'file_src'),
                dest    = path.join(DIR_TEST, 'file_dest');
                fileSrc = testutil.createFileWithData(src, SIZE),
                srcMda5 = crypto.createHash('md5').update(fs.readFileSync(fileSrc)).digest("hex");

            move(src, dest, function (err) {
                var destMda5 = crypto.createHash('md5').update(fs.readFileSync(dest)).digest("hex");

                T (srcMda5 === destMda5);
                done();
            });
        });
    });
});