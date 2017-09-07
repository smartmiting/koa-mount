
/**
 * Module dependencies.
 */

const debug = require('debug')('koa-mount')
const compose = require('koa-compose')
const assert = require('assert')

/**
 * Expose `mount()`.
 */

module.exports = mount

/**
 * Mount `app` with `prefix`, `app`
 * may be a Koa application or
 * middleware function.
 *
 * @param {String|Application|Function} prefix, app, or function
 * @param {Application|Function} [app or function]
 * @param {Object} [option]
 * @return {Function}
 * @api public
 */

function mount (prefix, app, option = {}) {
  if (typeof prefix !== 'string') {
    option = app || {}
    app = prefix
    prefix = '/'
  }

  assert.equal(prefix[0], '/', 'mount path must begin with "/"')

  // compose
  const downstream = app.middleware
    ? compose(app.middleware)
    : app

  // if option.preserve is valid and app has createContext function
  const preserve = !!option.preserve && app.createContext

  // don't need to do mounting here
  // if need to preserve, '/' also need to do mounting
  if (prefix === '/' && !preserve) return downstream

  const trailingSlash = prefix.slice(-1) === '/'

  const name = app.name || 'unnamed'
  debug('mount %s %s', prefix, name)

  return async function (ctx, upstream) {
    const prev = ctx.path
    const newPath = prefix === '/' ? prev : match(prev)
    debug('mount %s %s -> %s', prefix, name, newPath)
    if (!newPath) return await upstream()

    let newCtx = ctx
    if (preserve) {
      newCtx = app.createContext(ctx.req, ctx.res)
    }

    newCtx.mountPath = (ctx.mountPath || '') + (prefix === '/' ? '' : prefix)
    newCtx.path = newPath
    syncApps(ctx, newCtx)

    debug('enter %s -> %s', prev, newCtx.path)

    await downstream(newCtx, async () => {
      ctx.path = prev
      syncApps(newCtx, ctx)
      await upstream()
      ctx.path = newPath
      syncApps(ctx, newCtx)
    })

    debug('leave %s -> %s', prev, ctx.path)
    ctx.path = prev
    syncApps(newCtx, ctx)
  }

  /**
   * Check if `prefix` satisfies a `path`.
   * Returns the new path.
   *
   * match('/images/', '/lkajsldkjf') => false
   * match('/images', '/images') => /
   * match('/images/', '/images') => false
   * match('/images/', '/images/asdf') => /asdf
   *
   * @param {String} prefix
   * @param {String} path
   * @return {String|Boolean}
   * @api private
   */

  function match (path) {
    // does not match prefix at all
    if (path.indexOf(prefix) !== 0) return false

    const newPath = path.replace(prefix, '') || '/'
    if (trailingSlash) return newPath

    // `/mount` does not match `/mountlkjalskjdf`
    if (newPath[0] !== '/') return false
    return newPath
  }

  /**
   * sync mounted app with container app props
   * @param from   copy from app context
   * @param to     copy to app context
   */
  function syncApps (from, to) {
    // This keys will be read from the cxt in the koa app's handleResponse func
    // got these keys from https://github.com/koajs/koa/blob/master/lib/application.js#L193
    smartCopyTo(to, from, ['respond'])

    // status is syncing mode yet, so need sync _explicitStatus to specify
    // Must keep _explicitStatus before than body, otherwise status will be set to 200
    smartCopyTo(to.response, from.response, ['_explicitStatus', 'body'])
  }

  /**
   * smart pick context values between preserved app context and hosted app's context
   * @param to copyTo app context
   * @param from copyFrom app context
   * @param props prop names array which need to copy
   */
  function smartCopyTo (to, from, props) {
    // same object, ignore pick
    // if preserve is false, same context don't need to copy
    if (to === from) return to

    // convert props to array
    props = [].concat(props)

    props
      .filter(key => !!key)
      .forEach(key => {
        // prevent setting the props empty value maybe will change other props to be any default value
        // ps: set body emtpy, will make statusCode to be 204
        if (to[key] !== from[key]) {
          to[key] = from[key]
        }
      })
  }
}
