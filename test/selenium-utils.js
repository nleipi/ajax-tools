const { Condition } = require('selenium-webdriver')

module.exports.promiseSettled = function (varName) {
  return new Condition(`for promise window.${varName} to resolve`, function (driver) {
    return driver.executeAsyncScript(`
var callback = arguments[arguments.length - 1]
var promiseName = arguments[0]
Promise.allSettled([window[promiseName]]).then(results => {
  callback(results[0])
})
`, varName)
  })
}
