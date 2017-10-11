var mapObj = function (obj, fn) {
    var into = {}
    for (var name in obj) {
        into[name] = fn(name, obj[name])
    }
    return into
}

var decorateActionTree = function (opts, emit) {
    opts.modules = mapObj(opts.modules, function(scope, mod) {
        return decorateActionTree(mod, emit)
    })
    opts.actions = mapObj(opts.actions, function (name, fn) {
        return function (state, actions, data) {
            return fn(state, actions, data, emit)
        }
    })
    return opts
}

var mergeHandlers = function (a, b) {
    var c = mapObj(a, function (name, handler) { return handler }) 
    for (var name in b) {
        c[name] = [].concat((c[name] || []), b[name])
    }
    return c
}

var scopeHandlers = function (scope, unscopedHandlers) {
    return mapObj(unscopedHandlers, function (name, handlerArray) {
        return handlerArray.map(function (h) {
            return function (state, actions, data) {
                return h(state[scope], actions[scope], data)
            }
        })
    })
}

var collectHandlers = function (opts) {
    var handlers = {}
    for (var scope in opts.modules || {}) {
        handlers = mergeHandlers(handlers, scopeHandlers(scope, collectHandlers(opts.modules[scope])))
    }
    handlers = mergeHandlers(handlers, opts.events)
    return handlers
}

var makeEmitter = function (handlers) {
    return function (state, actions, data) {
        return function () {
            return (handlers[data[0]] || []).reduce(function (ret, fn) {
                return fn(state, actions, data[1])
            }, null)
        }
    }
}

module.exports = function (app) {
    return function (opts, container) {
        var actions
        var emit = function (name, data) {  return actions.__emit([name, data]) }
        opts = decorateActionTree(opts, emit)
        opts.actions.__emit = makeEmitter(collectHandlers(opts))
        actions = app(opts, container)
        return actions
    }
}