//require('undom/register')
const test = require('ava')

const {JSDOM} = require('jsdom')
const dom = new JSDOM(`<!doctype html><html><body></body></html>`)
global.window = dom.window
global.document = dom.window.document
//Fake requestAnimationFrame
global.requestAnimationFrame = fn => setTimeout(fn, 0);
const withEvents = require('../src/index.js')
const {h, app: plainApp} = require('hyperapp')
const app = withEvents(plainApp)
//const modules = require('../src/modules')


//Condense prettified html to match what serializes from Element
const condenseHTML = html =>
    html
    .replace(/\n/g, '')
    .replace(/^\s+/g, '')
    .replace(/\s+$/g, '')
    .replace(/\>\s+/g, '>')
    .replace(/\s+</g, '<')

//test app's rendered html against expected html
const isHTML = (t, html) => t.is(t.context.container.innerHTML, condenseHTML(html))

test.beforeEach('make container for test', t => {
    let el = document.createElement('div')
    document.body.appendChild(el)
    t.context.container = el
})

test.afterEach('clean up dom', t => {
    document.body.removeChild(t.context.container)
})


test.cb('Main app listens to its own events', t => {
    t.plan(1)
    app({
        root: t.context.container,
        events: {
            'testevent': (state, actions) => {
                t.pass()
            }
        },
        actions: {
            test: (state, actions, data, emit) => {
                emit('testevent')
            }
        },
        init: (state, actions) => {
            setTimeout(_ => {
                actions.test()
                t.end()
            }, 0)
        }
    })
})


test.cb('Child listens to main', t => {
    t.plan(1)
    const foo = {
        events: {
            'testevent': (state, actions) => {
                t.pass()
            }
        }
    }
    app({
        root: t.context.container,
        modules: {foo},
        actions: {
            test: (state, actions, data, emit) => {
                emit('testevent')
            }
        },
        init: (state, actions) => {
            //emit is not ready yet
            setTimeout(_ => {
                actions.test()
                t.end()
            }, 0)
        }
    })
})

test.cb('Main listens to child', t => {
    t.plan(1)
    const foo = {
        actions: {
            test: (state, actions, data, emit) => {
                emit('testevent')
            }
        },
        init: (state, actions) => {
            //emit is not ready 
            setTimeout(_ => {
                actions.test()
                t.end()                
            }, 0)
        }
    }
    app({
        root: t.context.container,
        modules: {foo},
        events: {
            'testevent': (state, actions) => {
                t.pass()
            }
        },
    })
})


test.cb('Different modules listen to eachother', t => {
    t.plan(1)
    const foo = {
        actions: {
            test: (state, actions, data, emit) => {
                emit('testevent')
            }
        },
        init: (state, actions) => {
            //emit is not ready 
            setTimeout(_ => {
                actions.test()
                t.end()                
            }, 0)
        }
    }
    const bar = {
        events: {
            'testevent': (state, actions) => {
                t.pass()
            }
        },
    }
    app({
        root: t.context.container,
        modules: {foo, bar},
    })
})

test.cb('emit with payload', t => {
    const testData = 'testdata'
    app({
        root: t.context.container,
        events:{
            testevent: (state, actions, data) => {
                t.is(data, testData)
            }
        },
        actions: {
            test: (state, actions, data, emit) => {
                emit('testevent', data)
            }
        },
        init: (state, actions) => {
            setTimeout(_ => {
                actions.test(testData)
                t.end()
            }, 0)
        }
    })
})

test.cb('multiple event handlers', t => {
    t.plan(3)
    const module = {
        events: {
            testevent: _ => t.pass()
        }
    }
    app({
        root: t.context.container,
        modules: {
            foo: module,
            bar: module,
            baz: module,
        },
        actions: {
            test: (state, actions, data, emit) => { emit('testevent')},
        },
        init: (state, actions) => {
            setTimeout(_ => {
                actions.test()
                t.end()
            }, 0)
        }
    })

})

test.cb('emit returns what the last event handler returns', t => {
    const module = {
        events: {
            testevent: _ => 'wrong!'
        }
    }
    app({
        root: t.context.container,
        modules: {
            foo: module,
            bar: module,
            baz: module,
        },
        events: {
            testevent: _ => 'correct'
        },
        actions: {
            test: (state, actions, data, emit) => u => emit('testevent'),
        },
        init: (state, actions) => {
            setTimeout(_ => {
                t.is(actions.test(), 'correct')
                t.end()
            }, 0)
        }
    })
})

test.cb('events state and actions scoped to the module theyre in', t => {
    const bar = {
        state: {
            val: 'bar'
        },
        actions: {
            do: _ => {}
        },
        events: {
            testevent: (state, actions) => {
                t.is(state.val, 'bar')
                t.truthy(actions.do)
            }
        },
    }

    const foo = {
        state: {
            val: 'foo'
        },
        actions: {
            do: _ => {}
        },
        modules: {bar},
        events: {
            testevent: (state, actions) => {
                t.deepEqual(state, {val: 'foo', bar: {val: 'bar'}})
                t.truthy(actions.do)
                t.truthy(actions.bar.do)
            }
        }
    }

    app({
        root: t.context.container,
        modules: {foo},
        events: {
            testevent: (state, actions) => {
                t.deepEqual(state, {foo: {val: 'foo', bar: {val: 'bar'}}})
                t.truthy(actions.foo.do)
                t.truthy(actions.foo.bar.do)
            }
        },
        actions: {
            test: (state, actions, data, emit) => emit('testevent')
        },
        init: (state, actions) => {
            setTimeout(_ => {
                actions.test()
                t.end()
            })
        }
    })
})


