const path = require("path")
const express = require("express")
const serveStatic = require("serve-static")
const request = require('request-promise');
const cookie = require('cookie');
const setCookie = require('set-cookie-parser');
const proxy = require('http-proxy-middleware');
const config = require("./config")

const app = express()

const playgroundProxy = proxy({
  target: 'https://playground.qlik.com',
  cookieDomainRewrite: "",
  changeOrigin: true,
  // logLevel: 'debug'
})

app.use('/playground', playgroundProxy);

app.get("/", function(req, res) {
  // Get cookie from ticket on playground
  return request({
    uri: 'http://playground.qlik.com/api/ticket',
    qs: {
      apikey: config.apiKey,
    },
    json: true,
    resolveWithFullResponse: true,
  }).then((response) => {
    console.log(response.body)
    return request({
      uri: 'https://playground.qlik.com/playground/content/Default/authStub.html',
      qs: {
        qlikTicket: response.body.ticket,
      },
      json: true,
      resolveWithFullResponse: true,
    })
  }).then((response) => {
    const cook = setCookie.parse(response.headers['set-cookie'])[0]
    Object.assign(cook, {
      secure: false,
      domain: undefined,
    })
    res.append('set-cookie',  cookie.serialize(cook.name, cook.value, cook))
    res.sendFile(__dirname + "/index.html")
  }).catch((err) => {
    console.error("error", err.message, err.options.uri)
  })
})

// Only serving static files in /resources
app.use("/resources", express.static(path.join(__dirname, "resources")))

const server = app.listen(process.env.PORT || 8000, function() {
  console.log("listening on port 8000 - http://localhost:" + (process.env.PORT || 8000))
});
server.on('upgrade', playgroundProxy.upgrade)
