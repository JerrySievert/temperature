(function () {
    var Memory = function () {
      this.__memstore = { };
    };

    Memory.prototype.map = function(fun /*, thisp */) {
        if (typeof fun !== "function")
            throw new TypeError();

        var thisp = arguments[1];
        var store = this.__memstore;
        var ret   = new Array();

        for (var i in store) {
            if (store.hasOwnProperty(i) && store[i] !== undefined) {
                var res = fun.call(thisp, store[i], i, store);
                if (res !== undefined) {
                    ret.push(res);
                }
            }
        }

        return ret;
    };
  
    Memory.prototype.set = function (key, value) {
        this.__memstore[key] = value;
        return this;
    };


    Memory.prototype.get = function (key) {
        return this.__memstore[key];
    };

    Memory.prototype.delete = function (key) {
        delete this.__memstore[key];
        return this;
    };

    Memory.prototype.flush = function () {
        this.__memstore = { };
        return this;
    };

    Memory.prototype.keys = function() {
        var store = this.__memstore;
        var keys = [ ];
    
        for (var i in store) {
            keys.push(i);
        }
    
        return keys;
    };

    Memory.prototype.vacuum = function() {
        var mstore = { };
        for (var i in this.__memstore) {
            if (this.__memstore[i] !== undefined) {
                mstore[i] = this.__memstore[i];
            }
        }
        this.__memstore = mstore;
        return this;
    };
    
    exports.Store = Memory;
})();