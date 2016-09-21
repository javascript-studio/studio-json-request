/*eslint-env mocha*/
'use strict';

const assert = require('assert');
const sinon = require('sinon');
const http = require('http');
const { http_request } = require('..');

describe('integration', () => {
  let server;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(console, 'info');
  });

  afterEach(() => {
    sandbox.restore();
    server.close();
  });

  it('request timeout', (done) => {
    server = http.createServer((req, _res) => {});
    server.listen(() => {

      const on_abort = sinon.spy();
      const req = http_request({
        port: server.address().port,
        timeout: 10
      }, (err) => {
        assert.notEqual(err, null);
        assert.equal(err.message, 'Request timeout');
        setTimeout(() => {
          sinon.assert.calledOnce(on_abort);
          done();
        }, 10);
      });
      req.on('abort', on_abort);

    });
  });

  it('request redirect', (done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/') {
        res.statusCode = 302;
        res.setHeader('location', '/some-path');
      } else if (req.url === '/some-path') {
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.write(JSON.stringify({ hello: 'redirect' }));
      } else {
        res.statusCode = 500;
      }
      res.end();
    });
    server.listen(() => {

      http_request({
        port: server.address().port,
        path: '/',
        expect: [200, 302]
      }, (err, json, res) => {
        assert.ifError(err);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(json, { hello: 'redirect' });
        done();
      });

    });
  });

});
