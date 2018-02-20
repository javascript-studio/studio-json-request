# Changes

## 2.2.0

- 🍏 Add child logger support and document logging
- 📚 Add feature list
- 📚 Document how to x-out confidential information

## 2.1.1

- ✨ Improve error handing and logging

## 2.1.0

- 🍏 Expose response status code on `E_EXPECT` error

## 2.0.3

- ✨ Log parsed JSON response body

## 2.0.2

- 📚 Improve documentation

## 2.0.1

- 📚 Add related modules section
- ✨ Add keywords, description, homepage and repository
- ✨ Add MIT license
- ✨ Add `package-lock.json`

## 2.0.0

- ✨ Breaking: Reduce API to single function

  Removed `http_request` and `https_request` and instead support an additional
  `protocol` option.

## 1.4.2

- 🙈 Support Node 4

## 1.4.1

- 🐛 Fix `log.finished` -> `log.finish`

## 1.4.0

- Use [@studio/log](https://github.com/javascript-studio/studio-log)
- Include body in error log if parse failed

## 1.3.1

- Always log body on unexpected response

## 1.3.0

- Support sending streams

## 1.2.3

- Print text response for unexpected response
- Missing colon in logs if protocol is `http`

## 1.2.2

- Log request / response header and body in error cases

## 1.2.1

- Add `console` logs until we have a real logger

## 1.2.0

Follow redirects if the `expect` array contains `302` and a `location` header
is in the response. A second redirect will not be followed and result in an
`E_EXPECT` error.

## 1.1.0

- Add `stream` option to yield the raw response

  This option is intended for stream processing or if the response is expected
  to contain non-JSON data.

- Validate the `statusCode` before consuming the body
- Fix timeout edge cases

## 1.0.1

- Parse JSON if content-type includes charset

## 1.0.0

- Inception
