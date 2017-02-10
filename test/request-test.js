/*eslint-env mocha*/
'use strict';

const assert = require('assert');
const http = require('http');
const https = require('https');
const EventEmitter = require('events');
const sinon = require('sinon');
const logger = require('@studio/log');
const { request } = require('..');

function fake_response() {
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
  let req;
  let res;
  let sandbox;
  let clock;

  beforeEach(() => {
    req = new EventEmitter();
    req.end = sinon.stub();
    req.abort = sinon.stub();
    res = fake_response();
    sandbox = sinon.sandbox.create();
    sandbox.stub(http, 'request').returns(req);
    sandbox.stub(https, 'request').returns(req);
    sandbox.stub(console, 'info');
    clock = sandbox.useFakeTimers();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('passes given options to `https.request`', () => {
    request({
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    }, () => {});

    sinon.assert.calledOnce(https.request);
    sinon.assert.calledWith(https.request, {
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    });
  });

  it('yields parsed response body', () => {
    const spy = sinon.spy();
    request({}, spy);
    https.request.yield(res);

    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, { some: 'payload' }, res);
  });

  it('sends the request with JSON payload and additional headers', () => {
    const payload = { some: 'payload' };

    request({
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    }, payload, () => {});

    sinon.assert.calledOnce(https.request);
    sinon.assert.calledWith(https.request, {
      method: 'POST',
      hostname: 'that-host.com',
      path: '/',
      headers: {
        'Content-Length': 18,
        'Content-Type': 'application/json'
      }
    });
    sinon.assert.calledOnce(req.end);
    sinon.assert.calledWith(req.end, JSON.stringify(payload));
  });

  it('sends the request with stream payload', () => {
    const stream = { pipe: sinon.stub() };

    request({
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    }, stream, () => {});

    sinon.assert.calledOnce(https.request);
    sinon.assert.calledWith(https.request, {
      method: 'POST',
      hostname: 'that-host.com',
      path: '/'
    });
    sinon.assert.notCalled(req.end);
    sinon.assert.calledOnce(stream.pipe);
    sinon.assert.calledWith(stream.pipe, req);
  });

  it('sends the request without payload or additional headers', () => {
    request({
      hostname: 'that-host.com',
    }, null, () => {});

    sinon.assert.calledOnce(https.request);
    sinon.assert.calledWith(https.request, {
      hostname: 'that-host.com',
    });
    sinon.assert.calledOnce(req.end);
    sinon.assert.calledWithExactly(req.end);
  });

  it('does not override existing `Content-Type` header', () => {
    request({
      headers: {
        'Content-Type': 'application/vnd.github.v3+json'
      }
    }, { some: 'payload' }, () => {});

    sinon.assert.calledOnce(https.request);
    sinon.assert.calledWithMatch(https.request, {
      headers: {
        'Content-Length': 18,
        'Content-Type': 'application/vnd.github.v3+json'
      }
    });
  });

  it('fails the request if `statusCode` is < 200', () => {
    const spy = sinon.spy();
    request({}, null, spy);

    res.statusCode = 199;
    https.request.yield(res);
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, sinon.match.instanceOf(Error), null, res);
    sinon.assert.calledWithMatch(spy, {
      message: 'Expected response statusCode to be 2xx, but was 199',
      code: 'E_EXPECT'
    });
  });

  it('fails the request if `statusCode` is > 299', () => {
    const spy = sinon.spy();
    request({}, null, spy);

    res.statusCode = 300;
    https.request.yield(res);
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, sinon.match.instanceOf(Error), null, res);
    sinon.assert.calledWithMatch(spy, {
      message: 'Expected response statusCode to be 2xx, but was 300',
      code: 'E_EXPECT'
    });
  });

  it('does not fail the request if `statusCode` is 201', () => {
    const spy = sinon.spy();
    request({}, null, spy);

    res.statusCode = 201;
    https.request.yield(res);
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, null, res);
  });

  it('fails request if `statusCode` is 201 and `expect` is set to 200', () => {
    const spy = sinon.spy();
    request({ expect: 200 }, null, spy);

    res.statusCode = 201;
    https.request.yield(res);
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, sinon.match.instanceOf(Error), null, res);
    sinon.assert.calledWithMatch(spy, {
      message: 'Expected response statusCode to be 200, but was 201',
      code: 'E_EXPECT'
    });
    sinon.assert.neverCalledWithMatch(https.request, {
      expect: 200
    });
  });

  it('does not fail request if `statusCode` equals `expect`', () => {
    const spy = sinon.spy();
    request({ expect: 200 }, null, spy);

    res.statusCode = 200;
    https.request.yield(res);
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, null, res);
  });

  it('fails request if `statusCode` is 202 and `expect` is set to [200, 201]',
    () => {
      const spy = sinon.spy();
      request({ expect: [200, 201] }, null, spy);

      res.statusCode = 202;
      https.request.yield(res);
      res.on.withArgs('end').yield();

      sinon.assert.calledOnce(spy);
      sinon.assert.calledWith(spy, sinon.match.instanceOf(Error), null, res);
      sinon.assert.calledWithMatch(spy, {
        message: 'Expected response statusCode to be one of [200, 201], '
          + 'but was 202',
        code: 'E_EXPECT'
      });
    });

  it('does not fail request if `statusCode` is in `expect` array', () => {
    const spy = sinon.spy();
    request({ expect: [200, 304] }, null, spy);

    res.statusCode = 304;
    https.request.yield(res);
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, null, res);
  });

  it('fails request if response is not valid JSON', () => {
    const spy = sinon.spy();
    request({}, null, spy);

    res.statusCode = 200;
    https.request.yield(res);
    res.on.withArgs('data').yield('<html/>');
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, sinon.match.instanceOf(Error), '<html/>', res);
    sinon.assert.calledWithMatch(spy, {
      name: 'SyntaxError',
      message: 'Unexpected token < in JSON at position 0',
      code: 'E_JSON'
    });
  });

  it('sets a timeout, but does not pass the option on', () => {
    const spy = sinon.spy();

    request({
      hostname: 'that-host.com',
      timeout: 5000
    }, spy);

    sinon.assert.calledOnce(https.request);
    sinon.assert.calledWith(https.request, {
      hostname: 'that-host.com'
    });
    clock.tick(5000);
    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, sinon.match.instanceOf(Error));
    sinon.assert.calledOnce(req.abort);
    sinon.assert.calledWithMatch(spy, {
      message: 'Request timeout',
      code: 'E_TIMEOUT'
    });
  });

  it('does not modify the original options', () => {
    const options = {
      hostname: 'that-host.com',
      timeout: 5000
    };

    request(options, { generate: 'Content-Length header' }, () => {});

    assert.deepEqual(options, {
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

    assert.deepEqual(options.headers, {});
  });

  it('does not set a timeout if not configured', () => {
    const spy = sinon.spy();

    request({
      hostname: 'that-host.com'
    }, spy);

    clock.tick(5000);
    sinon.assert.notCalled(spy);
  });

  it('clears the timeout on error', () => {
    const spy = sinon.spy();

    request({
      hostname: 'that-host.com',
      timeout: 5000
    }, spy);

    req.emit('error', new Error('ouch!'));
    clock.tick(5000);
    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, {
      message: 'ouch!',
      code: 'E_ERROR'
    });
  });

  it('clears the timeout on response', () => {
    const spy = sinon.spy();
    request({
      hostname: 'that-host.com',
      timeout: 5000
    }, spy);

    https.request.yield(res);
    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    res.on.withArgs('end').yield();

    clock.tick(5000);
    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, { some: 'payload' }, res);
  });

  it('does not fail if the response processing takes longer', () => {
    const spy = sinon.spy();
    request({
      hostname: 'that-host.com',
      timeout: 5000
    }, spy);

    https.request.yield(res);
    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    clock.tick(5000);
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, { some: 'payload' }, res);
  });

  it('does not invoke the callback twice on timeout after unexpected response',
    () => {
      const spy = sinon.spy();
      request({
        hostname: 'that-host.com',
        timeout: 5000,
        expect: 200
      }, spy);

      res.statusCode = 300;
      https.request.yield(res);
      res.on.withArgs('end').yield();
      clock.tick(5000);

      sinon.assert.calledOnce(spy);
      sinon.assert.calledWith(spy, sinon.match.instanceOf(Error));
    });

  it('does not fail if response is empty and not application/json', () => {
    const spy = sinon.spy();
    request({
      hostname: 'that-host.com'
    }, spy);
    delete res.headers['content-type'];

    https.request.yield(res);
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, null, res);
  });

  it('parses body if Content-Type is application/json; charset=utf-8', () => {
    const spy = sinon.spy();
    request({
      hostname: 'that-host.com'
    }, spy);
    res.headers['content-type'] = 'application/json; charset=utf-8';

    https.request.yield(res);
    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, { some: 'payload' }, res);
  });

  it('does not throw if content-type is not provided', () => {
    const spy = sinon.spy();
    request({
      hostname: 'that-host.com'
    }, spy);
    delete res.headers['content-type'];

    https.request.yield(res);
    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, null, res);
  });

  it('returns the response instead of parsing it if `stream: true`', () => {
    const spy = sinon.spy();
    request({
      hostname: 'that-host.com',
      stream: true
    }, spy);

    https.request.yield(res);

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, res);
    // Assert no data listeners are installed:
    sinon.assert.notCalled(res.on.withArgs('data'));
  });

  it('performs `expect` check if `stream: true`', () => {
    const spy = sinon.spy();
    request({
      hostname: 'that-host.com',
      stream: true,
      expect: 200
    }, spy);

    res.statusCode = 300;
    https.request.yield(res);
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, sinon.match.instanceOf(Error));
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
    https.request.yield(res);

    sinon.assert.calledTwice(https.request);
    sinon.assert.calledWithMatch(https.request, {
      hostname: 'other-host.com',
      path: '/some/path'
    });
  });

  it('follows redirect if no stream', () => {
    const spy = sinon.spy();
    request({
      hostname: 'that-host.com',
      expect: [200, 302]
    }, spy);

    res.statusCode = 302;
    delete res.headers['content-type'];
    res.headers.location = 'https://other-host.com/some/path';
    https.request.firstCall.yield(res);

    res = fake_response();
    https.request.secondCall.yield(res);
    res.on.withArgs('data').yield(JSON.stringify({ some: 'payload' }));
    res.on.withArgs('end').yield();

    sinon.assert.calledTwice(https.request);
    sinon.assert.calledWithMatch(https.request, {
      hostname: 'other-host.com',
      path: '/some/path'
    });
    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, { some: 'payload' });
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
    https.request.yield(res);

    sinon.assert.calledTwice(https.request);
    sinon.assert.calledWithMatch(https.request.secondCall, {
      hostname: 'that-host.com',
      port: 8080,
      path: '/some/path'
    });
  });

  it('does not follow another redirect', () => {
    const spy = sinon.spy();
    request({
      hostname: 'that-host.com',
      expect: [200, 302],
      stream: true
    }, spy);

    res.statusCode = 302;
    delete res.headers['content-type'];
    res.headers.location = '/some/path';
    res.on.withArgs('end').yields();
    https.request.firstCall.yield(res);
    https.request.secondCall.yield(res);

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, {
      message: 'Expected response statusCode to be 200, but was 302',
      code: 'E_EXPECT'
    });
  });

  it('retains expect array when following redirects', () => {
    const spy = sinon.spy();
    request({
      hostname: 'that-host.com',
      expect: [200, 201, 302],
      stream: true
    }, spy);

    res.statusCode = 302;
    delete res.headers['content-type'];
    res.headers.location = '/some/path';
    res.on.withArgs('end').yields();
    https.request.firstCall.yield(res);
    https.request.secondCall.yield(res);

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, {
      message:
        'Expected response statusCode to be one of [200, 201], but was 302',
      code: 'E_EXPECT'
    });
  });

  function assert_log_body(content_type, body) {
    const log = logger('json-request');
    sandbox.stub(log, 'warn');

    const spy = sinon.spy();
    request({
      hostname: 'that-host.com'
    }, spy);

    res.statusCode = 403;
    res.headers['content-type'] = content_type;
    https.request.firstCall.yield(res);
    res.on.withArgs('data').yield(body);
    res.on.withArgs('end').yield();

    sinon.assert.calledOnce(log.warn);
    sinon.assert.calledWithMatch(log.warn, {
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
    sinon.assert.calledOnce(spy);
  }

  it('logs body if content type is text/plain', () => {
    assert_log_body('text/plain', 'You suck!');
  });

  it('logs body if content type is text/html', () => {
    assert_log_body('text/plain', '<html>You suck!</html>');
  });

});
