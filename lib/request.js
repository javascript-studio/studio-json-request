/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const http = require('http');
const https = require('https');
const url = require('url');
const logger = require('@studio/log');

const log = logger('json-request');

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

function fetch(httpx, options, data, callback) {
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

  if (data && !data.pipe) {
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

  const request = {
    protocol: httpx === https ? 'https' : 'http',
    method: options.method || 'GET',
    host: options.host || options.hostname,
    path: options.path || '/'
  };
  if (options.port) {
    request.port = options.port;
  }
  if (data && !data.pipe) {
    request.body = data;
  }

  const ts_start = Date.now();
  let timer;
  const req = httpx.request(opts, (res) => {
    if (timer) {
      clearTimeout(timer);
    }
    const ts_head = Date.now();
    const ms_head = ts_head - ts_start;
    const status = res.statusCode;
    const response = { statusCode: status, headers: res.headers };

    let err = null;
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
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        response.body = body;
        const ms_body = Date.now() - ts_head;
        log.warn({ request, ms_head, ms_body, response }, err.message);
        callback(err, null, res);
      });
      return;
    }
    if (status === 302 && res.headers.location) {
      log.fetch({ ms_head, request, response });
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
      fetch(httpx, redirect_opts, null, callback);
      return;
    }
    res.on('error', (err) => {
      const ms_body = Date.now() - ts_head;
      log.error({ request, ms_head, ms_body, response }, err);
      callback(err);
    });
    if (opts.stream) {
      log.fetch({ request, ms_head, response });
      res.on('end', () => {
        const ms_body = Date.now() - ts_head;
        log.finished({ ms_body });
      });
      callback(null, res);
      return;
    }

    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      const ms_body = Date.now() - ts_head;
      let json = null;
      const type = res.headers['content-type'];
      if (body && type && type.split(';')[0] === 'application/json') {
        try {
          json = JSON.parse(body);
        } catch (e) {
          e.code = 'E_JSON';
          log.error({ request, ms_head, ms_body, response }, String(e));
          callback(e, body, res);
          return;
        }
      }
      log.fetch({ request, ms_head, ms_body });
      callback(null, json, res);
    });
  });

  if (timeout) {
    timer = setTimeout(() => {
      req.abort();
      const err = new Error('Request timeout');
      err.code = 'E_TIMEOUT';
      log.warn({
        ms: Date.now() - ts_start,
        request: { headers: opts.headers, body: data }
      }, String(err));
      callback(err);
      callback = null;
    }, timeout);
  }

  if (data) {
    if (data.pipe) {
      data.pipe(req);
    } else {
      req.end(data);
    }
  } else {
    req.end();
  }

  req.on('error', (err) => {
    err.code = 'E_ERROR';
    if (timer) {
      clearTimeout(timer);
    }
    log.error({
      ms: Date.now() - ts_start,
      request: { headers: opts.headers, body: data },
    }, String(err));
    if (callback) {
      callback(err);
    }
  });
  return req;
}

exports.request = function (options, data, callback) {
  return fetch(https, options, data, callback);
};

exports.http_request = function (options, data, callback) {
  return fetch(http, options, data, callback);
};

exports.https_request = exports.request;
