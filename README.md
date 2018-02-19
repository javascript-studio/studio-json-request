# Studio JSON Request

📡 A tiny Node HTTP(S) request wrapper for JSON APIs.

- Transparent JSON request / response handling
- Timeout support
- Status code validation and default validation for 2xx responses
- Follows redirects, but only once
- Unified error handling with status codes
- Consistent logging with [Studio Log][4]

## Usage

```js
const request = require('@studio/json-request');

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
    - `protocol`: The protocol to use. Must be either `"http:"` or `"https:"`.
      Defaults to `"https:"`.
    - `timeout`: The number of milliseconds after which the request should time
      out, causing en `E_TIMEOUT` error.
    - `expect`: The expected status code(s). This can be a number or an array
      of numbers.
    - `stream`: If `true`, the `callback` is invoked with `(null, res)` once
      the header was retrieved to allow to stream the response.
    - `log`: A [parent logger][4] to use for the "Request" logger.

### Behavior

- If the `timeout` option is specified, a timer is installed which will abort
  the request and invoke the callback with an error.
- If the `expect` option is specified, it validates the response HTTP status
  code. If it's a number the status code has to equal that number. If an array
  is given, any number in the array is accepted. If the option is not given,
  the request will fail for non `2xx` status codes.
- If the `stream` option is specified, the response is returned immediately
  after the status code was checked. No further response processing is done by
  this library. It is the callers responsibility to consume the response.
- If `data` is given, it is stringified and passed as the request body and the
  request is sent. The `Content-Type` header is set to `application/json`,
  unless this header was already provided. The `Content-Length` is set to the
  request body length.
- If `data` is set to `null`, the request is sent without a body.
- If `data` is omitted, the request object is returned and it's the callers
  responsibility to invoke `req.end()` to complete the request.

### Callback

The callback is invoked with `(err, data, response)`.

- `err`: An error object or `null`. The error will have a `code` property with
  these possible string values:
    - `E_TIMEOUT`: The request timed out.
    - `E_EXPECT`: The response status code does not match the expectation. The
      `statusCode` property on the error object is set to the response status
      code.
    - `E_JSON`: Could not parse the response body as JSON. In this case `data`
      is the raw body.
    - `E_ERROR`: If an `error` event was thrown.
- `data`: The parsed response data, or if it could not be parsed the raw body.
- `response`: The response object.

### Logging

Every request produces a log entry when the response was processed with this
data:

- `request`:
    - `protocol`: The protocol used
    - `method`: The request method used
    - `host`: The host name
    - `path`: The path
    - `headers`: The request headers, if any
    - `port`: The port, if specified
    - `body`: The request body, if given
- `response`:
    - `statusCode`: The response status code
    - `headers`: The response headers
    - `body`: The response body, if available
- `ms_head`: The time it took to receive the response header
- `ms_body`: The time it took to receive the response body

If `stream` was set, the log entry is produced once the response header was
received without the `response` and `ms_body` properties, and another log entry
is produced when the response body was received with `ms_body`.

## Related modules

- 🎮 [Studio CLI][2] this module was initially developed for the [JavaScript
  Studio][3] command line tool.
- 👻 [Studio Log][4] is used for logging.
- ❎ [Studio Log X][5] can be use to X-out confidential information from the
  logs.
- 📦 [Studio Changes][6] is used to create the changelog for this module.

## License

MIT

<div align="center">Made with ❤️ on 🌍</div>

[1]: https://nodejs.org/dist/latest-v6.x/docs/api/http.html#http_http_request_options_callback
[2]: https://github.com/javascript-studio/studio-cli
[3]: https://javascript.studio
[4]: https://github.com/javascript-studio/studio-log
[5]: https://github.com/javascript-studio/studio-log-x
[6]: https://github.com/javascript-studio/studio-changes
