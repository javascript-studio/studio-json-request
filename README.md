# JavaScript Studio JSON Request

A tiny, dependency free Node HTTP and HTTPS request wrapper, for JSON requests
and responses, with timeout support and status code validation.

## Usage

```js
const { request } = require('@studio/request');

request({
  method: 'POST',
  hostname: 'some-host',
  path: '/some-path',
  timeout: 5000
}, { some: 'payload' }, (err, data, res) => {
  // ...
});
```

## API

- `request(options[, data], callback)`: Creates a new HTTPS request, passing
  the `options` to Node [http.request][1], except for these properties:
    - `timeout` the number of milliseconds after which the request should time
      out
    - `expect` the expected status code(s)
    - `stream` will cause the `callback` to be invoked with `(null, res)` once
      the header was retrieved to allow to stream the response
- `http_request(options[, data], callback)`: Like `request`, but creates an
  HTTP request instead of HTTPS.
- `https_request(options[, data], callback)`: An alias for `request(...)`.

__Behavior:__

- If the `timeout` option is specified, a timer will be installed which will
  abort the request and invoke the callback with an error.
- If the `expect` option is specified, it validates the response HTTP status
  code. If it's a number the status code has to equal the number. If an array is
  given, any number in the array is accepted. If the option is not given, the
  request will fail for non `2xx` status codes.
- If the `stream` option is specified, the response is returned immediately
  after the status code was checked. No further response processing is done by
  this library. It is the callers responsibility to consume the response.
- If `data` is given, it will be stringified and passed as the request body,
  then and the request is sent. The `Content-Type` header will be set to
  `application/json`, unless this header was already provided and the
  `Content-Length` will be calculated.
- If `data` is set to `null`, the request will be sent without a body.
- If `data` is omitted, the request object is returned and it's the callers
  responsibility to invoke `req.end()`.

__Callback:__

The callback is invoked with `(err, data, response)`.

- `err`: An error object or `null`. The error will have a `code` property with
  these possible string values:
    - `E_TIMEOUT`: The request timed out.
    - `E_EXPECT`: The response status code does not match the expectation.
    - `E_JSON`: Could not parse the response body as JSON. In this case the
      `data` will be the raw body.
    - `E_ERROR`: If an `error` event was thrown.
- `data`: The parsed response data, or if it could not be parsed the raw body.
- `response`: The response object.

[1]: https://nodejs.org/dist/latest-v6.x/docs/api/http.html#http_http_request_options_callback
