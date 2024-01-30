# Changes

## 4.0.0

- 💥 [`71e18e1`](https://github.com/javascript-studio/studio-json-request/commit/71e18e11b3c7bcfccd002020755d38f2b64a10c5)
  Drop node 12 and 14, support node 18 and 20
- 💥 [`65e3d9b`](https://github.com/javascript-studio/studio-json-request/commit/65e3d9bc2acac462b1a3c67082e84335fcef7f07)
  Use Studio Fail
- 💥 [`ddbd041`](https://github.com/javascript-studio/studio-json-request/commit/ddbd041f498edddb195ffba9c35a331a1128a683)
  Destroy request instead of abort
- 🍏 [`9ce212a`](https://github.com/javascript-studio/studio-json-request/commit/9ce212a053afc79a765f7a766e251b1c75c5cf8f)
  Add types
- ✨ [`0d510aa`](https://github.com/javascript-studio/studio-json-request/commit/0d510aad60c326e970152d1f1af19188ed1b19db)
  Upgrade Studio Changes
- ✨ [`df96e6b`](https://github.com/javascript-studio/studio-json-request/commit/df96e6bf11cb90995fcf2d42eed9efc053ee56a3)
  Update Studio Log and Studio Log X
- ✨ [`4d1de86`](https://github.com/javascript-studio/studio-json-request/commit/4d1de86f36cbe5fa61feb0ebf3d96cc379da0663)
  Upgrade eslint-config and eslint and use URL
- ✨ [`57bb923`](https://github.com/javascript-studio/studio-json-request/commit/57bb9230dd9871be35f917f858721c7de5e730a0)
  Replace sinon spy and stub with fakes
- ✨ [`f23a336`](https://github.com/javascript-studio/studio-json-request/commit/f23a33675b3951c36d40d8a45552b102bcc1897b)
  Replace assert and sinon with referee-sinon
- ✨ [`2def327`](https://github.com/javascript-studio/studio-json-request/commit/2def32775b8e0611b65a9b4a9b5155d6e36582d9)
  Upgrade mocha to v10

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2024-01-30._

## 3.0.1

- 🐛 [`f8e06d4`](https://github.com/javascript-studio/studio-json-request/commit/f8e06d44f8cff1de0e8d3e877313ca53a4fa589f)
  Log cause on request and response error
- 🛡 [`11c3a34`](https://github.com/javascript-studio/studio-json-request/commit/11c3a34da6f2d93cc2e8804c8b960a79903b9112)
  Bump lodash from 4.17.10 to 4.17.19 (dependabot[bot])
- ✨ [`9eab585`](https://github.com/javascript-studio/studio-json-request/commit/9eab58549665bf06a76c3360fa2f8f63ddebefca)
  Configure GitHub actions
- ✨ [`0739619`](https://github.com/javascript-studio/studio-json-request/commit/073961916300616a6283b08427cace4345234ca8)
  Upgrade sinon
- ✨ [`12ce96f`](https://github.com/javascript-studio/studio-json-request/commit/12ce96f0b6ada2abe4a3050bb4e53510b4afefc3)
  Upgrade mocha
- ✨ [`07ba17a`](https://github.com/javascript-studio/studio-json-request/commit/07ba17a31c4879835de515516af4333239f2ef41)
  Upgrade eslint
- ✨ [`7c5ba13`](https://github.com/javascript-studio/studio-json-request/commit/7c5ba131842c99350ba34724cdcc8a942110909d)
  Update Studio ESLint Config
- ✨ [`9a1fbc0`](https://github.com/javascript-studio/studio-json-request/commit/9a1fbc0c51bdef5cec05661451861ca3638ac11c)
  Upgrade Studio Changes to v2
- ✨ [`a8e06e0`](https://github.com/javascript-studio/studio-json-request/commit/a8e06e0000d90af1f759b4124e2dee028fed2387)
  Add `.gitignore`

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2021-05-25._

## 3.0.0

- 💥 [`685b9ab`](https://github.com/javascript-studio/studio-json-request/commit/685b9abe1cf87f4e18c2234e9e6a79b9045f2068)
  BREAKING: Use Studio Log v2
- 📚 [`9d827ee`](https://github.com/javascript-studio/studio-json-request/commit/9d827eea4dcbec7072dbf7c8a73c83ed07e5c6f6)
  Change example code for Studio Log v2 changes
- ✨ [`404184f`](https://github.com/javascript-studio/studio-json-request/commit/404184f03b28eb0e3d059b0a0ead0373d0bbb1fb)
  Use Studio Changes `--commits` option

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
