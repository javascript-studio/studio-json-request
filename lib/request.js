/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const http = require('http');
const https = require('https');
const url = require('url');

function expect_error(expect, status) {
  const err = new Error(
    `Expected response statusCode to be ${expect}, but was ${status}`
  );
  err.code = 'E_EXPECT';
  return err;
}

function copy(obj) {
  const copy = {};
  for (const key of Object.keys(obj)) {
    copy[key] = obj[key];
  }
  return copy;
}

function request(httpx, options, data, callback) {
  if (typeof data === 'function') {
    callback = data;
    data = null;
  }

  const opts = copy(options);

  let timeout;
  if (opts.timeout) {
    timeout = opts.timeout;
    delete opts.timeout;
  }

  let expect;
  if (opts.expect) {
    expect = opts.expect;
    delete opts.expect;
  }

  if (data) {
    data = JSON.stringify(data);
    if (opts.headers) {
      opts.headers = copy(opts.headers);
    } else {
      opts.headers = {};
    }
    opts.headers['Content-Length'] = Buffer.byteLength(data);
    if (!opts.headers['Content-Type']) {
      opts.headers['Content-Type'] = 'application/json';
    }
  }

  let timer;
  const req = httpx.request(opts, (res) => {
    if (timer) {
      clearTimeout(timer);
    }

    let err = null;
    const status = res.statusCode;
    if (expect) {
      if (typeof expect === 'number') {
        if (status !== expect) {
          err = expect_error(expect, status);
        }
      } else if (expect.indexOf(status) === -1) {
        err = expect_error(`one of [${expect.join(', ')}]`, status);
      }
    } else if (status < 200 || status > 299) {
      err = expect_error('2xx', status);
    }
    if (err) {
      res.resume(); // consume the response data
      callback(err, null, res);
      return;
    }
    if (status === 302 && res.headers.location) {
      const redirect_opts = url.parse(res.headers.location);
      for (const key in opts) {
        if (opts.hasOwnProperty(key) && !redirect_opts[key]) {
          redirect_opts[key] = opts[key];
        }
      }
      if (expect && Array.isArray(expect)) {
        const redirect_expect = expect.filter(s => s !== 302);
        redirect_opts.expect = redirect_expect.length === 1
          ? redirect_expect[0] : redirect_expect;
      }
      request(httpx, redirect_opts, null, callback);
      return;
    }
    if (opts.stream) {
      callback(null, res);
      return;
    }

    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      let json = null;
      const type = res.headers['content-type'];
      if (body && type && type.split(';')[0] === 'application/json') {
        try {
          json = JSON.parse(body);
        } catch (e) {
          e.code = 'E_JSON';
          callback(e, body, res);
          return;
        }
      }
      callback(null, json, res);
    });
  });

  if (timeout) {
    timer = setTimeout(() => {
      req.abort();
      const err = new Error('Request timeout');
      err.code = 'E_TIMEOUT';
      callback(err);
      callback = null;
    }, timeout);
  }

  if (data) {
    req.end(data);
  } else {
    req.end();
  }

  req.on('error', (err) => {
    err.code = 'E_ERROR';
    if (timer) {
      clearTimeout(timer);
    }
    if (callback) {
      callback(err);
    }
  });
  return req;
}

exports.request = function (options, data, callback) {
  return request(https, options, data, callback);
};

exports.http_request = function (options, data, callback) {
  return request(http, options, data, callback);
};

exports.https_request = exports.request;
