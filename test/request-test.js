/*eslint-env mocha*/
'use strict';

const { assert, refute, match, sinon } = require('@sinonjs/referee-sinon');
const http = require('http');
const https = require('https');
const stream = require('stream');
const EventEmitter = require('events');
const logger = require('@studio/log');
const logX = require('@studio/log-x');
const request = require('..');

function fakeResponse() {
  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json'
    },
    setEncoding: () => {},
    on: sinon.stub()
  };
}

describe('request', () => {
  /** @type {Object} */
  let req;
  let res;
  let clock;

  beforeEach(() => {
    req = new EventEmitter();
    req.end = sinon.fake();
    req.destroy = sinon.fake();
    res = fakeResponse();
    sinon.replace(http, 'request', sinon.fake.returns(req));
    sinon.replace(https, 'request', sinon.fake.returns(req));
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    sinon.restore();
    // @ts-ignore
    logger.pipe(null);
  });

  it('passes given options to `https.request`', () => {
    request({
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    }, () => {});

    assert.calledOnceWith(https.request, {
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    });
  });

  it('passes given options to `http.request` if protocol is "http"', () => {
    request({
      protocol: 'http:',
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    }, () => {});

    assert.calledOnceWith(http.request, {
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    });
  });

  it('passes given options to `https.request` if protocol is "https"', () => {
    request({
      protocol: 'https:',
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    }, () => {});

    assert.calledOnceWith(https.request, {
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    });
  });

  it('throws on invalid protocol', () => {
    assert.exception(() => {
      request({
        protocol: 'ftp:',
        method: 'GET',
        hostname: 'that-host.com',
        path: '/'
      }, () => {});
    }, { message: 'Unsupported protocol "ftp:"' });
  });

  it('yields parsed response body', () => {
    const fake = sinon.fake();
    request({}, fake);
    // @ts-ignore
    https.request.callback(res);

    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, null, { some: 'payload' }, res);
  });

  it('sends the request with JSON payload and additional headers', () => {
    const payload = { some: 'payload' };

    request({
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    }, payload, () => {});

    assert.calledOnceWith(https.request, {
      method: 'POST',
      hostname: 'that-host.com',
      path: '/',
      headers: {
        'Content-Length': 18,
        'Content-Type': 'application/json'
      }
    });
    assert.calledOnceWith(req.end, JSON.stringify(payload));
  });

  it('sends the request with stream payload', () => {
    const fake_stream = { pipe: sinon.fake() };

    request({
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    }, fake_stream, () => {});

    assert.calledOnceWith(https.request, {
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    });
    refute.called(req.end);
    assert.calledOnceWith(fake_stream.pipe, req);
  });

  it('sends the request without payload or additional headers', () => {
    request({
      hostname: 'that-host.com'
    }, null, () => {});

    assert.calledOnceWith(https.request, {
      hostname: 'that-host.com'
    });
    assert.calledOnceWithExactly(req.end);
  });

  it('does not override existing `Content-Type` header', () => {
    request({
      headers: {
        'Content-Type': 'application/vnd.github.v3+json'
      }
    }, { some: 'payload' }, () => {});

    assert.calledOnceWithMatch(https.request, {
      headers: {
        'Content-Length': 18,
        'Content-Type': 'application/vnd.github.v3+json'
      }
    });
  });

  it('fails the request if `statusCode` is < 200', () => {
    const fake = sinon.fake();
    request({}, null, fake);

    res.statusCode = 199;
    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('end').yield();

    assert.calledWith(fake, match({
      message: 'Expected response statusCode to be 2xx, but was 199',
      code: 'E_EXPECT',
      properties: {
        statusCode: 199
      }
    }), null, res);
  });

  it('fails the request if `statusCode` is > 299', () => {
    const fake = sinon.fake();
    request({}, null, fake);

    res.statusCode = 300;
    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, match({
      message: 'Expected response statusCode to be 2xx, but was 300',
      code: 'E_EXPECT',
      properties: {
        statusCode: 300
      }
    }), null, res);
  });

  it('does not fail the request if `statusCode` is 201', () => {
    const fake = sinon.fake();
    request({}, null, fake);

    res.statusCode = 201;
    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, null, null, res);
  });

  it('fails request if `statusCode` is 201 and `expect` is set to 200', () => {
    const fake = sinon.fake();
    request({ expect: 200 }, null, fake);

    res.statusCode = 201;
    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, match({
      message: 'Expected response statusCode to be 200, but was 201',
      code: 'E_EXPECT',
      properties: {
        statusCode: 201
      }
    }), null, res);
    refute.calledWith(https.request, match({
      expect: 200
    }));
  });

  it('does not fail request if `statusCode` equals `expect`', () => {
    const fake = sinon.fake();
    request({ expect: 200 }, null, fake);

    res.statusCode = 200;
    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, null, null, res);
  });

  it('fails request if `statusCode` is 202 and `expect` is set to [200, 201]',
    () => {
      const fake = sinon.fake();
      request({ expect: [200, 201] }, null, fake);

      res.statusCode = 202;
      // @ts-ignore
      https.request.callback(res);
      res.on.withArgs('end').yield();

      assert.calledOnceWith(fake, match({
        message: 'Expected response statusCode to be one of [200, 201], '
          + 'but was 202',
        code: 'E_EXPECT',
        properties: {
          statusCode: 202
        }
      }), null, res);
    });

  it('does not fail request if `statusCode` is in `expect` array', () => {
    const fake = sinon.fake();
    request({ expect: [200, 304] }, null, fake);

    res.statusCode = 304;
    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, null, null, res);
  });

  it('fails request if response is not valid JSON', () => {
    const fake = sinon.fake();
    request({}, null, fake);

    res.statusCode = 200;
    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('data').yield('<html/>');
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, match({
      name: 'Error',
      message: 'Failed to parse response body',
      code: 'E_JSON',
      cause: match({
        name: 'SyntaxError',
        message: sinon.match('Unexpected token')
      })
    }), '<html/>', res);
  });

  it('sets a timeout, but does not pass the option on', () => {
    const fake = sinon.fake();

    request({
      hostname: 'that-host.com',
      timeout: 5000
    }, fake);

    assert.calledOnceWith(https.request, {
      hostname: 'that-host.com'
    });
    clock.tick(5000);
    assert.calledOnceWith(fake, match({
      message: 'Request timeout',
      code: 'E_TIMEOUT'
    }));
    assert.calledOnce(req.destroy);
  });

  it('does not modify the original options', () => {
    const options = {
      hostname: 'that-host.com',
      timeout: 5000
    };

    request(options, { generate: 'Content-Length header' }, () => {});

    assert.equals(options, {
      hostname: 'that-host.com',
      timeout: 5000
    });
  });

  it('does not modify the original options headers', () => {
    const options = {
      hostname: 'that-host.com',
      headers: {}
    };

    request(options, { generate: 'Content-Length header' }, () => {});

    assert.equals(options.headers, {});
  });

  it('does not set a timeout if not configured', () => {
    const fake = sinon.fake();

    request({
      hostname: 'that-host.com'
    }, fake);

    clock.tick(5000);
    refute.called(fake);
  });

  it('clears the timeout on error', () => {
    const fake = sinon.fake();
    const error = new Error('ouch!');

    request({
      hostname: 'that-host.com',
      timeout: 5000
    }, fake);

    req.emit('error', error);
    clock.tick(5000);
    assert.calledOnceWithMatch(fake, {
      message: 'Request failure',
      code: 'E_FAILED',
      cause: error
    });
  });

  it('clears the timeout on response', () => {
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com',
      timeout: 5000
    }, fake);

    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    res.on.withArgs('end').yield();

    clock.tick(5000);
    assert.calledOnceWith(fake, null, { some: 'payload' }, res);
  });

  it('does not fail if the response processing takes longer', () => {
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com',
      timeout: 5000
    }, fake);

    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    clock.tick(5000);
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, null, { some: 'payload' }, res);
  });

  it('does not invoke the callback twice on timeout after unexpected response',
    () => {
      const fake = sinon.fake();
      request({
        hostname: 'that-host.com',
        timeout: 5000,
        expect: 200
      }, fake);

      res.statusCode = 300;
      // @ts-ignore
      https.request.callback(res);
      res.on.withArgs('end').yield();
      clock.tick(5000);

      assert.calledOnceWith(fake, sinon.match.instanceOf(Error));
    });

  it('does not fail if response is empty and not application/json', () => {
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com'
    }, fake);
    delete res.headers['content-type'];

    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, null, null, res);
  });

  it('parses body if Content-Type is application/json; charset=utf-8', () => {
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com'
    }, fake);
    res.headers['content-type'] = 'application/json; charset=utf-8';

    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, null, { some: 'payload' }, res);
  });

  it('does not throw if content-type is not provided', () => {
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com'
    }, fake);
    delete res.headers['content-type'];

    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, null, null, res);
  });

  it('returns the response instead of parsing it if `stream: true`', () => {
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com',
      stream: true
    }, fake);

    // @ts-ignore
    https.request.callback(res);

    assert.calledOnceWith(fake, null, res);
    // Assert no data listeners are installed:
    refute.calledWith(res.on, 'data');
  });

  it('performs `expect` check if `stream: true`', () => {
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com',
      stream: true,
      expect: 200
    }, fake);

    res.statusCode = 300;
    // @ts-ignore
    https.request.callback(res);
    res.on.withArgs('end').yield();

    assert.calledOnceWith(fake, sinon.match.instanceOf(Error));
  });

  it('follows redirect if `stream: true`', () => {
    request({
      hostname: 'that-host.com',
      expect: 302,
      stream: true
    }, () => {});

    res.statusCode = 302;
    delete res.headers['content-type'];
    res.headers.location = 'https://other-host.com/some/path';
    // @ts-ignore
    https.request.callback(res);

    assert.calledTwice(https.request);
    assert.calledWithMatch(https.request, {
      hostname: 'other-host.com',
      path: '/some/path'
    });
  });

  it('follows redirect if no stream', () => {
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com',
      expect: [200, 302]
    }, fake);

    res.statusCode = 302;
    delete res.headers['content-type'];
    res.headers.location = 'https://other-host.com/some/path';
    // @ts-ignore
    https.request.firstCall.yield(res);

    res = fakeResponse();
    // @ts-ignore
    https.request.secondCall.yield(res);
    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    res.on.withArgs('end').yield();

    assert.calledTwice(https.request);
    assert.calledWithMatch(https.request, {
      hostname: 'other-host.com',
      path: '/some/path'
    });
    assert.calledOnceWith(fake, null, { some: 'payload' });
  });

  it('retains host and port if redirect location is only a path', () => {
    request({
      hostname: 'that-host.com',
      port: 8080,
      expect: 302,
      stream: true
    }, () => {});

    res.statusCode = 302;
    delete res.headers['content-type'];
    res.headers.location = '/some/path';
    // @ts-ignore
    https.request.callback(res);

    assert.calledTwice(https.request);
    // @ts-ignore
    assert.calledWithMatch(https.request.secondCall, {
      hostname: 'that-host.com',
      port: '8080',
      path: '/some/path'
    });
  });

  it('does not follow another redirect', () => {
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com',
      expect: [200, 302],
      stream: true
    }, fake);

    res.statusCode = 302;
    delete res.headers['content-type'];
    res.headers.location = '/some/path';
    res.on.withArgs('end').yields();
    // @ts-ignore
    https.request.firstCall.yield(res);
    // @ts-ignore
    https.request.secondCall.yield(res);

    assert.calledOnceWithMatch(fake, {
      message: 'Expected response statusCode to be 200, but was 302',
      code: 'E_EXPECT'
    });
  });

  it('retains expect array when following redirects', () => {
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com',
      expect: [200, 201, 302],
      stream: true
    }, fake);

    res.statusCode = 302;
    delete res.headers['content-type'];
    res.headers.location = '/some/path';
    res.on.withArgs('end').yields();
    // @ts-ignore
    https.request.firstCall.yield(res);
    // @ts-ignore
    https.request.secondCall.yield(res);

    assert.calledOnceWithMatch(fake, {
      message:
        'Expected response statusCode to be one of [200, 201], but was 302',
      code: 'E_EXPECT'
    });
  });

  function assertLogBody(content_type, body) {
    const log = logger('Request');
    sinon.replace(log, 'warn', sinon.fake());

    const fake = sinon.fake();
    request({
      hostname: 'that-host.com'
    }, fake);

    res.statusCode = 403;
    res.headers['content-type'] = content_type;
    // @ts-ignore
    https.request.firstCall.yield(res);
    res.on.withArgs('data').yield(body);
    res.on.withArgs('end').yield();

    assert.calledOnceWithMatch(log.warn, {
      request: {
        protocol: 'https',
        method: 'GET',
        host: 'that-host.com',
        path: '/'
      },
      response: {
        statusCode: 403,
        headers: { 'content-type': content_type },
        body
      }
    });
    assert.calledOnce(fake);
  }

  it('logs body if content type is text/plain', () => {
    assertLogBody('text/plain', 'You suck!');
  });

  it('logs body if content type is text/html', () => {
    assertLogBody('text/plain', '<html>You suck!</html>');
  });

  it('logs JSON request headers on request error event', () => {
    const log = logger('Request');
    sinon.replace(log, 'error', sinon.fake());
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com',
      headers: { some: 'header' }
    }, fake);
    clock.tick(17);
    const error = new Error('ECONREFUSED');

    req.emit('error', error);

    assert.calledWith(log.error, {
      ms: 17,
      request: {
        protocol: 'https',
        method: 'GET',
        host: 'that-host.com',
        path: '/',
        headers: { some: 'header' }
      }
    }, error);
    assert.calledOnce(fake);
  });

  it('logs JSON request body on request error event', () => {
    const log = logger('Request');
    sinon.replace(log, 'error', sinon.fake());
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com'
    }, { is: 42 }, fake);
    clock.tick(17);
    const error = new Error('ECONREFUSED');

    req.emit('error', error);

    assert.calledWith(log.error, {
      ms: 17,
      request: sinon.match({
        headers: { 'Content-Length': 9, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is: 42 })
      })
    }, error);
    assert.calledOnce(fake);
  });

  it('does not log stream request body on request error event', () => {
    const log = logger('Request');
    sinon.replace(log, 'error', sinon.fake());
    const fake = sinon.fake();
    request({
      hostname: 'that-host.com'
    }, new stream.PassThrough(), fake);
    clock.tick(17);
    const error = new Error('ECONREFUSED');

    req.emit('error', error);

    assert.calledWith(log.error, {
      ms: 17,
      request: {
        protocol: 'https',
        method: 'GET',
        host: 'that-host.com',
        path: '/',
        headers: undefined
      }
    }, error);
    assert.calledOnce(fake);
  });

  it('uses a child logger of the given logger', () => {
    const log = logger('custom');
    const child_log = log.child('Request');
    sinon.replace(child_log, 'error', sinon.fake());
    request({
      log,
      hostname: 'that-host.com'
    }, () => {});

    req.emit('error', new Error('ECONREFUSED'));

    assert.calledOnce(child_log.error);
  });

  /*
   * This test case demonstrates how to x-out a header field and does not
   * actually test any code in this library.
   */
  it('replaces authorization header with @studio/log-x', (done) => {
    logger
      .pipe(logX('request.headers.Authorization'))
      .pipe(new stream.Writable({
        objectMode: true,
        write(entry) {
          assert.equals(entry.data.request.headers.Authorization, '·····');
          done();
        }
      }));

    request({
      hostname: 'javascript.studio',
      headers: {
        Authorization: 'Some Secret'
      },
      log: logger('Thingy')
    }, () => {});
    res.statusCode = 200;
    // @ts-ignore
    https.request.firstCall.yield(res);
    res.on.withArgs('end').yield();
  });

});
