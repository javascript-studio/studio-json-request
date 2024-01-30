/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 *
 * @license MIT
 */
'use strict';

const url = require('url');
const http = require('http');
const https = require('https');
const logger = require('@studio/log');
const { failure, E_FAILED } = require('@studio/fail');

/**
 * @typedef {import('http').RequestOptions} RequestOptions
 * @typedef {import('http').ClientRequest} ClientRequest
 * @typedef {import('http').IncomingMessage} IncomingMessage
 * @typedef {import('stream').Readable} Readable
 * @typedef {import('@studio/fail').Failure} Failure
 * @typedef {import('@studio/log').Logger} Logger
 */

/**
 * @typedef {Object} JsonRequestOptions
 * @property {number} [timeout]
 * @property {number | number[]} [expect]
 * @property {boolean} [stream]
 * @property {Logger} [log]
 */

/**
 * @typedef {undefined | null | boolean | number | string | JsonArray | JsonObject} JsonValue
 * @typedef {JsonValue[]} JsonArray
 * @typedef {{ [k: string]: JsonValue }} JsonObject
 */

const logger_name = 'Request';
const default_log = logger(logger_name);

const PROTOCOLS = {
  'http:': http,
  'https:': https
};

/**
 * @param {string | number} expect
 * @param {number} status
 * @returns {Failure}
 */
function expectError(expect, status) {
  return failure(
    `Expected response statusCode to be ${expect}, but was ${status}`,
    'E_EXPECT',
    { statusCode: status }
  );
}

/**
 * @template T
 * @param {T} obj
 * @returns {T}
 */
function copy(obj) {
  return { ...obj };
}

module.exports = fetch;

/**
 * @callback FetchCallback
 * @param {Error | null} err
 * @param {Object | null} [json]
 * @param {IncomingMessage} [res]
 */

/**
 * @param {RequestOptions & JsonRequestOptions} options
 * @param {null | string | JsonObject | Readable | FetchCallback} data
 * @param {FetchCallback} [callback]
 * @returns {ClientRequest}
 */
// eslint-disable-next-line complexity
function fetch(options, data, callback) {
  if (typeof data === 'function') {
    callback = data;
    data = null;
  }
  const protocol = options.protocol || 'https:';
  const httpx = PROTOCOLS[protocol];
  if (!httpx) {
    throw failure(`Unsupported protocol "${protocol}"`);
  }

  const opts = copy(options);
  delete opts.protocol;

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

  let log = default_log;
  if (opts.log) {
    log = opts.log.child(logger_name);
    delete opts.log;
  }

  if (data && typeof data !== 'string' && !data.pipe) {
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
    protocol: protocol.substring(0, protocol.length - 1),
    method: options.method || 'GET',
    host: options.host || options.hostname,
    path: options.path || '/',
    headers: opts.headers
  };
  if (options.port) {
    request.port = options.port;
  }
  if (typeof data === 'string') {
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
          err = expectError(expect, status);
        }
      } else if (expect.indexOf(status) === -1) {
        err = expectError(`one of [${expect.join(', ')}]`, status);
      }
    } else if (status < 200 || status > 299) {
      err = expectError('2xx', status);
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
        if (callback) {
          callback(err, null, res);
        }
      });
      return;
    }
    if (status === 302 && res.headers.location) {
      log.fetch({ ms_head, request, response });
      const opt_copy = copy(options);
      opt_copy.protocol = protocol;
      const location = new URL(res.headers.location, url.format(opt_copy));
      const redirect_opts = {
        hostname: location.hostname,
        port: location.port,
        path: location.pathname
      };
      for (const key in opt_copy) {
        if (Object.hasOwn(opt_copy, key) && !redirect_opts[key]) {
          redirect_opts[key] = opt_copy[key];
        }
      }
      if (expect && Array.isArray(expect)) {
        const redirect_expect = expect.filter(s => s !== 302);
        redirect_opts.expect = redirect_expect.length === 1
          ? redirect_expect[0] : redirect_expect;
      }
      fetch(redirect_opts, null, callback);
      return;
    }
    res.on('error', (res_err) => {
      const e = failure('Response failure', res_err, E_FAILED);
      const ms_body = Date.now() - ts_head;
      log.error({ request, ms_head, ms_body, response }, res_err);
      if (callback) {
        callback(e);
      }
    });
    if (opts.stream) {
      log.fetch({ request, ms_head, response });
      res.on('end', () => {
        const ms_body = Date.now() - ts_head;
        log.finish({ ms_body });
      });
      if (callback) {
        callback(null, res);
      }
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
          const json_err = failure(
            'Failed to parse response body',
            /** @type {Error} */ (e),
            'E_JSON'
          );
          response.body = body;
          log.error({ request, ms_head, ms_body, response });
          if (callback) {
            callback(json_err, body, res);
          }
          return;
        }
        response.json = json;
      }
      log.fetch({ request, response, ms_head, ms_body });
      if (callback) {
        callback(null, json, res);
      }
    });
  });

  if (timeout) {
    timer = setTimeout(() => {
      req.destroy();
      const err = failure('Request timeout', 'E_TIMEOUT');
      log.warn({ ms: Date.now() - ts_start, request });
      if (callback) {
        callback(err);
      }
      callback = undefined;
    }, timeout);
  }

  if (typeof data === 'string') {
    req.end(data);
  } else if (data && typeof data.pipe === 'function') {
    data.pipe(req);
  } else {
    req.end();
  }

  req.on('error', (req_err) => {
    const e = failure('Request failure', req_err, E_FAILED);
    if (timer) {
      clearTimeout(timer);
    }
    log.error({ ms: Date.now() - ts_start, request }, req_err);
    if (callback) {
      callback(e);
    }
  });
  return req;
}
