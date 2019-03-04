/**
 * AJAX 监视器
 *
 *
 * 事件类型 处理方法
 * 类型有 'all', 'open', 'send', 'progress', 'loadstart', 'load', 'error',
 * 'loadend', 'abort', 'timeout', 'readystatechange'
 *
 * XHRWatcher.on('loadend', function(xhr){
 *   // console.log(xhr);
 * });
 */

;(function(HOST){
  var XHR = HOST.XMLHttpRequest;


  var eventSplitter = /\s+/;

  var keys = Object.keys;

    if (!keys) {
      keys = function(o) {
        var result = [];

        for (var name in o) {
          if (o.hasOwnProperty(name)) {
            result.push(name);
          }
        }
        return result;
      };
    }


    function Events() {}
  // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    /**
     * Events.on 监听事件
     * @param  {String}   events   自定义事件名 多个空格隔开
     * @param  {Function} callback 事件监听函数事件触发时被调用
     * @param  {[Object]} context  监听函数内对应上下文，this所指对象 默认指向当前类
     * @return {this}     当前类 可以链式调用on方法
     */
    Events.prototype.on = function(events, callback, context) {
        var cache, event, list;
        if (!callback) return this;

        cache = this.__events || (this.__events = {});
        events = events.split(eventSplitter);

        while (event = events.shift()) {
            list = cache[event] || (cache[event] = []);
            list.push({
                callback:callback,
                context:context,
                eventName:event
            });
        }

        return this;
    };

    /**
     * Events.once 监听事件，触发一次后结束监听
     * 参考Events.on
     */
    Events.prototype.once = function(events, callback, context) {
        var that = this;
        var cb = function() {
            that.off(events, cb);
            callback.apply(context || that, arguments);
        };
        return this.on(events, cb, context);
    };


    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    /**
     * Events.off 撤销监听
     * 参考Events.on
     */
    Events.prototype.off = function(events, callback, context) {
        var cache, event, list, i;

        // No events, or removing *all* events.
        if (!(cache = this.__events)) return this;
        if (!(events || callback || context)) {
            delete this.__events;
            return this;
        }

        events = events ? events.split(eventSplitter) : keys(cache);

        // Loop through the callback list, splicing where appropriate.
        while (event = events.shift()) {
            list = cache[event];
            if (!list) continue;

            if (!(callback || context)) {
                delete cache[event];
                continue;
            }
            for(i = list.length - 1; i >= 0; i -= 1){
                if(!(callback && list[i].callback !== callback || context && list[i].context !== context)){
                    list.splice(i, 1);
                }
            }
        }

        return this;
    }




    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    /**
     * Events.trigger 触发事件
     * @param  {String} events 事件字符串
     * @return {this}     当前类 可以链式调用trigger方法
     */
    Events.prototype.trigger = function(events) {
        var cache, event, all, list, i, len, rest = [],
            args;
        if (!(cache = this.__events)) return this;

        events = events.split(eventSplitter);

        // Fill up `rest` with the callback arguments. Since we're only copying
        // the tail of `arguments`, a loop is much faster than Array#slice.
        for (i = 1, len = arguments.length; i < len; i++) {
            rest[i - 1] = arguments[i];
        }

        // For each event, walk through the list of callbacks twice, first to
        // trigger the event, then to trigger any `"all"` callbacks.
        while (event = events.shift()) {
            // Copy callback lists to prevent modification.
            if (all = cache.all) all = all.slice();
            if (list = cache[event]) list = list.slice();

            // Execute event callbacks.
            if (list) {
                for (i = 0, len = list.length; i < len; i += 1) {
                    list[i].callback.apply(list[i].context || this, rest);
                }
            }

            // Execute "all" callbacks.
            if (all) {
                args = [event].concat(rest);
                for (i = 0, len = all.length; i < len; i += 2) {
                    all[i].callback.apply(all[i].context || this, args);
                }
            }
        }

        return this;
    }



  var XHRWatcher = new Events();


  XHR.prototype._watch = function () {
    var self = this;
    ['progress', 'loadstart', 'load', 'error', 'loadend', 'abort', 'timeout', 'readystatechange'].forEach(function(type){
      self.addEventListener(type, function(e){
        XHRWatcher.trigger(type, self)
      })
    });

    // this.addEventListener('load', function(e){
    //   XHRWatcher.trigger('loading', this)
    //   // console.info("WatchHttp-loading", e, e.currentTarget.status)
    // });

  };

  var oldSend = XHR.prototype.send;

  XHR.prototype.send = function(data){
    if(!this.request){
      this.request = {}
    }
    this.request.data = data;
    this._watch();
    XHRWatcher.trigger('send', this);
    oldSend.call(this, data);
  }

  var oldSetRequestHeader = XHR.prototype.setRequestHeader;

  XHR.prototype.setRequestHeader = function(header, value){
    if(!this.headers){
      this.headers = {}
    }
    oldSetRequestHeader.call(this, header, value);
    this.headers[header] = value;
  }

  var oldOpen = XHR.prototype.open;
  XHR.prototype.open = function(){
      if(!this.request){
        this.request = {}
      }
      var method = arguments[0];
      var url = arguments[1];
      var isAsync = arguments[2];
      var user = arguments[3];
      var password = arguments[4];
      this.request.method = method;
      this.request.url = url;
      if(isAsync){
        this.request.async = isAsync;
      }
      if(user){
        this.request.user = user;
      }
      if(password){
        this.request.password = password;
      }

      XHRWatcher.trigger('open', this);
      oldOpen.apply(this, arguments);
  };

  //window.XHRWatcher = XHRWatcher;

  HOST.XHRWatcher = {
    on: function(){
      XHRWatcher.on.apply(XHRWatcher, arguments);
    }
  };
})(window);
