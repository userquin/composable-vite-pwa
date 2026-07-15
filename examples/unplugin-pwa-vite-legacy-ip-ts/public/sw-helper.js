/* eslint-disable no-restricted-globals */

(function () {
  const hello = 'Hello World!'
  function sayHello(who) {
    return `Hello ${who}`
  }

  // #endregion

  self.workbox = self.workbox || {}
  self.workbox.swHelperClassic = { sayHello, hello }
})()
