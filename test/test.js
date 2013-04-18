
var http = require('http')
var should = require('should')
var error = require('quiver-error').error
var subrequest = require('quiver-subrequest')
var streamConvert = require('quiver-stream-convert')
var streamChannel = require('quiver-stream-channel')
var nodeHandler = require('../lib/node-handler')

var testPort = 8005

var startTestServer = function(handler) {
  var server = http.createServer(handler)
  server.listen(8005)
}

var testHttpHandler = function(requestHead, requestStreamable, callback) {
  var method = requestHead.method
  if(method == 'GET') {
    requestHead.url.should.equal('/get-path')
    var responseHead = {
      statusCode: 200
    }
    var responseStreamable = streamConvert.textToStreamable('hello world')
    callback(null, responseHead, responseStreamable)
  } else if(method == 'POST') {
    requestHead.url.should.equal('/post-path')
    streamConvert.streamableToText(requestStreamable, function(err, text) {
      if(err) throw err

      text.should.equal('hello from client')
      var responseHead = {
        statusCode: 200
      }
      var responseStreamable = streamConvert.textToStreamable('hello from server')
      callback(null, responseHead, responseStreamable)
    })
  } else {
    requestHead.url.should.equal('/other-path')
    return callback(error(400, 'Bad Request'))
  }
}

startTestServer(nodeHandler.createQuiverToNodeHttpHandlerAdapter(testHttpHandler))

describe('node handler test', function() {
  it('get request test', function(callback) {
    var url = 'http://localhost:8005/get-path'
    subrequest.getRequestToStream(url, function(err, responseStream) {
      if(err) throw err

      streamConvert.streamToText(responseStream, function(err, responseText) {
        should.not.exist(err)

        responseText.should.equal('hello world')
        callback()
      })
    })
  })

  it('post request test', function(callback) {
    var requestHead = {
      host: 'localhost',
      port: testPort,
      method: 'POST',
      path: '/post-path'
    }

    var requestBody = streamConvert.textToStream('hello from client')
    subrequest.subrequestToStream(requestHead, requestBody, function(err, responseStream) {
      should.not.exist(err)

      streamConvert.streamToText(responseStream, function(err, responseText) {
        should.not.exist(err)

        responseText.should.equal('hello from server')
        callback()
      })
    })
  })

  it('other request test', function(callback) {
    var requestHead = {
      host: 'localhost',
      port: testPort,
      method: 'PUT',
      path: '/other-path'
    }

    var requestBody = streamChannel.createEmptyReadStream()
    subrequest.subrequestToStream(requestHead, requestBody, function(err, responseStream) {
      should.exist(err)
      callback()
    })
  })
})