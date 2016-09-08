/*eslint-env mocha*/
'use strict';

const assert = require('assert');
const sinon = require('sinon');
const http = require('http');
const { http_request } = require('..');

describe('integration', () => {
  let server;

  afterEach(() => {
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

});
