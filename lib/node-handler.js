'use strict'

var nodeStream = require('quiver-node-stream')
var pipeStream = require('quiver-pipe-stream').pipeStream
var streamConvert = require('quiver-stream-convert')

var defaultHandleHttpError = function(err, response) {
  var errorCode = err.errorCode || 500

  response.writeHead(errorCode, {
    'Content-Length': 0
  })

  response.end()
}

var createRequestHeadFromNodeRequest = function(request) {
  return {
    httpVersion: request.httpVersion,
    headers: request.headers,
    method: request.method,
    url: request.url
  }
}

var createNodeHttpHandlerAdapter = function(httpHandler, options) {
  options = options || { }
  var handlerHttpError = options.handlerHttpError || defaultHandleHttpError
  var requestHeadExtractor = options.requestHeadExtractor || createRequestHeadFromNodeRequest

  var nodeHandler = function(request, response) {
    var requestHead = requestHeadExtractor(request)
    var requestStream = nodeStream.createNodeReadStreamAdapter(request)
    var responseWrite = nodeStream.createNodeWriteStreamAdapter(response)
    var requestStreamable = streamConvert.streamToStreamable(requestStream)

    httpHandler(requestHead, requestStreamable, function(err, responseHead, responseStreamable) {
      if(err) return handlerHttpError(err, response)

      var headers = responseHead.headers
      for(var key in headers) {
        response.setHeader(key, headers[key])
      }
      response.writeHead(responseHead.statusCode)
      responseStreamable.toStream(function(err, responseStream) {
        if(err) return responseWrite.closeWrite(err)

        pipeStream(responseStream, responseWrite)
      })
    })
  }

  return nodeHandler
}

module.exports = {
  createNodeHttpHandlerAdapter: createNodeHttpHandlerAdapter
}
