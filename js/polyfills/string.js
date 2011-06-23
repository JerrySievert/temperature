(function() {
    if (String.prototype.pad === undefined) {
        String.prototype.pad = function(length) {
            var str = '' + this;
            while (str.length < length) {
                str = '0' + str;
            }
            return str;
        }
    }
}());
