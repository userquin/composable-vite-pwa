/* eslint-disable no-restricted-globals */
(function () {
  const hello = 'Hello World!'
  function sayHello(who) {
    return `Hello ${who}`
  }
  function sayHelloFromRoot(who) {
    return self.workbox.swHelperClassic2.sayHello(`from root SW helper ${who}`)
  }

  // #endregion

  self.workbox = self.workbox || {}
  self.workbox.swHelperClassic2 = { sayHello, hello, sayHelloFromRoot }
})()
