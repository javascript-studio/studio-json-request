/*eslint-env mocha*/
'use strict';

const assert = require('assert');
const http = require('http');
const https = require('https');
const EventEmitter = require('events');
const sinon = require('sinon');
const { request } = require('..');

describe('request', () => {
  let req;
  let res;
  let sandbox;
  let clock;

  beforeEach(() => {
    req = new EventEmitter();
    req.end = sinon.stub();
    req.abort = sinon.stub();
    res = {
      statusCode: 200,
      headers: {
        'content-type': 'application/json'
      },
      setEncoding: () => {},
      on: sinon.stub()
    };
    sandbox = sinon.sandbox.create();
    sandbox.stub(http, 'request').returns(req);
    sandbox.stub(https, 'request').returns(req);
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

});
