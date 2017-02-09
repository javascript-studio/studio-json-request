# Changes

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
