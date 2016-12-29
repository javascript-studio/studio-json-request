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

  const protocol = httpx === https ? 'https:' : 'http:';
  const port = options.port ? `:${options.port}` : '';
  const req_id = `${options.method || 'GET'} ${protocol}//`
    + `${options.host || options.hostname}${port}${options.path || '/'}`;
  const ts_start = Date.now();
  let timer;
  const req = httpx.request(opts, (res) => {
    if (timer) {
      clearTimeout(timer);
    }
    const ts_head = Date.now();
    const ms_head = ts_head - ts_start;

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
      console.info(` 🚨  ${req_id} = ${status} (${ms_head} ms)`);
      console.info(`   Req: ${JSON.stringify(opts.headers)} ${data}`);
      console.info(`   Res: ${JSON.stringify(res.headers)}`);
      const content_type = res.headers['content-type'];
      if (content_type && content_type.startsWith('text/')) {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          console.info(`   Body: ${body}`);
          callback(err, null, res);
        });
      } else {
        res.resume(); // consume the response data, if any
        callback(err, null, res);
      }
      return;
    }
    if (status === 302 && res.headers.location) {
      console.info(` 📡  ${req_id} = ${status} (${ms_head} ms)`);
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
    res.on('error', (err) => {
      const ms_body = Date.now() - ts_head;
      console.info(` 🚨  ${req_id} = ${err} (${ms_body} ms)`);
      console.info(`   Req: ${JSON.stringify(opts.headers)} ${data}`);
      callback(err);
    });
    if (opts.stream) {
      console.info(` 📡  ${req_id} = ${status} (${ms_head} ms + stream)`);
      res.on('end', () => {
        const ms_body = Date.now() - ts_head;
        console.info(` 🏁  ${req_id} stream end (${ms_body} ms)`);
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
          console.info(
            ` 🚨  ${req_id} = ${status} (${ms_head} + ${ms_body} ms)`
          );
          console.info(`   Req: ${JSON.stringify(opts.headers)} ${data}`);
          console.info(`   Res: ${JSON.stringify(res.headers)} ${body}`);
          callback(e, body, res);
          return;
        }
      }
      console.info(` 📡  ${req_id} = ${status} (${ms_head} + ${ms_body} ms)`);
      callback(null, json, res);
    });
  });

  if (timeout) {
    timer = setTimeout(() => {
      req.abort();
      const ms_total = Date.now() - ts_start;
      console.info(` 🚨  ${req_id} ⌛  ${ms_total} ms`);
      console.info(`   Req: ${JSON.stringify(opts.headers)} ${data}`);
      const err = new Error('Request timeout');
      err.code = 'E_TIMEOUT';
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
    const ms_total = Date.now() - ts_start;
    console.info(` 🚨  ${req_id} = ${err} (${ms_total} ms)`);
    console.info(`   Req: ${JSON.stringify(opts.headers)} ${data}`);
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
