var mapObj = function (obj, fn) {
    var into = {}
    for (var name in obj) {
        into[name] = fn(name, obj[name])
    }
    return into
}

var decorateSingleAction = function (fn, emit) {
    return function (state, actions, data) {
        return fn(state, actions, data, emit)
    }
}

var decorateActionTree = function (actions, emit) {
    return mapObj(actions, function (name, fn) {
        return (typeof fn === 'function' ? decorateSingleAction : decorateActionTree)(fn, emit)
    })
}

var decorateAppActions = function (opts, emit) {
    opts.modules = mapObj(opts.modules, function(scope, mod) {
        return decorateAppActions(mod, emit)
    })
    opts.actions = decorateActionTree(opts.actions, emit)
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

export default function (app) {
    return function (opts, container) {
        var _emit = function () {}
        var emit = function (name, data) { return _emit(name, data)}
        opts = decorateAppActions(opts, emit)
        opts.actions.__emit = makeEmitter(collectHandlers(opts))
        var actions = app(opts, container)
        _emit = function (name, data) {  return actions.__emit([name, data]) }
        return actions
    }
}