var smc = require('source-map')
var request = require('request')
var Log = require('./Log')

var isJSON = function(arg) {
  arg = (typeof arg === "function") ? arg() : arg;
  if (typeof arg  !== "string") {
    return false;
  }
  try {
    arg = (!JSON) ? eval("(" + arg + ")") : JSON.parse(arg);
    return true;
  } catch (e) {
    return false;
  }
}

const resolveStack = function (stack, next) {
  var s = stack
  s = s.replace(/\((.*)\)/, '$1')
  if (s.match(/https?:\/\/.*/g) === null) {
    next(true)
    return
  }
  s = s.match(/https?:\/\/.*/g)[0]
  if (s.indexOf('min.js') < 0 && s.indexOf('chunk.js') < 0) {
    next(true)
    return
  }

  var filename = s.split('?').shift()
  var _trace = s.split(':')
  var trace = {
    line: parseInt(_trace[_trace.length - 2], 10),
    column: parseInt(_trace[_trace.length - 1], 10)
  }
  if (filename.indexOf('vendor') > -1 || isNaN(trace.line) || isNaN(trace.column)) {
    next(true)
    return
  }

  console.log(`${filename}.map`)
  request.get(`${filename}.map`, function (error, response, body) {
    if (!error && response.statusCode === 200 && isJSON(body))  {
      var sm = new smc.SourceMapConsumer(JSON.parse(body))
      next(null, sm.originalPositionFor(trace))
    } else {
      next(true)
    }
  })
}

const stacks = function (log, next) {
  //has traces
  if (log.traces.length > 0) {
    next([])
    return
  }
  var stack = log.msg.split('\n'), traces = [], i = 0, l = stack.length,
  n = (err, data) => {
    if (!err) {
      traces.push(data)
    }
    
    i++
    if (i < l) {
      resolveStack(stack[i], n)
    } else {
      //end
      next(traces)
    }
  }
  resolveStack(stack[i], n)
}

Log.find({}, function(err, logs){
  if (err) return
  var i = 0, l = logs.length
  var next = (traces) => {
    //end
    console.log(i, traces)
    if (traces.length > 0) {
      Log.update({_id: logs[i]._id}, {$set: {'traces': traces}}, function(err){})
    }

    i++
    if (i < l) {
      stacks(logs[i], next)
    }
  }
  stacks(logs[i], next)
})
