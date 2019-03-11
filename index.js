// @ts-check
/// <reference types="node" />

'use strict';

const fs = require('fs');
const util = require('util');

const FormData = require('form-data');
const got = require('got');
const VError = require('verror');

const { name, version, homepage } = require('./package.json');

const readFile = util.promisify(fs.readFile);

const userAgent = name.replace(/^@[^/]*\//, '') + '/' + version + (homepage ? ' (' + homepage + ')' : '');

/**
 * @param {string} url
 * @param {Object<string,any>} body
 * @param {object} [options]
 * @param {Object<string,any>} [options.headers]
 * @param {string} [options.token]
 */
const doPost = async function (url, body, { headers, token } = {}) {
  const res = await got(url, {
    method: 'POST',
    headers: Object.assign({
      'Authorization': token ? 'Bearer ' + token : undefined,
      'User-Agent': userAgent
    }, headers || {}),
    followRedirect: false,
    json: true,
    body,
    timeout: 8000
  });

  return res.statusCode >= 200 && res.statusCode < 300
    ? res.body
    : Promise.reject(new Error(`Request failed with status code: ${res.statusCode}`));
};

/**
 * @param {string} filename
 * @param {string|fs.ReadStream} content
 * @param {object} options
 * @param {string} options.organization
 * @param {string} options.project
 * @param {string} [options.token]
 * @param {string} options.version
 * @param {boolean} [options.verbose]
 * @returns {Promise<void>}
 */
const uploadFile = async function (filename, content, { organization, project, token, version, verbose }) {
  if (!filename || !organization || !project || !version) {
    throw new TypeError('Needs all of attributes – filename, options.organization, options.project, options.version – to be defined and be strings');
  }
  if (!content) {
    throw new TypeError('Needs content to be defined');
  }

  const form = new FormData({});

  form.append('file', content, { filename });
  form.append('name', '~/' + filename);

  try {
    await doPost(`https://sentry.io/api/0/projects/${organization}/${project}/releases/${version}/files/`, form, { token });
  } catch (err) {
    if (verbose) {
      const length = typeof content === 'string' ? content.length : 'unknown';
      console.error(`An error occurred for "${filename}" with file content of length ${length}: `, err.message, err.stack);
    }
    throw err;
  }
};

/**
 * @param {object} options
 * @param {string} options.organization
 * @param {string} options.project
 * @param {string[]} options.sourceMapFiles
 * @param {string} options.version
 * @param {string} [options.commit]
 * @param {string} [options.repository]
 * @param {string} [options.token]
 * @param {boolean} [options.verbose]
 * @returns {Promise<void>}
 */
const createSentryRelease = async function ({
  // Required
  organization,
  project,
  sourceMapFiles,
  version,
  // Optional
  commit,
  repository,
  token,
  verbose
}) {
  if (!project || typeof project !== 'string') {
    throw new TypeError(`Expected required options.project to be defined and be a string. Got: ${typeof project}`);
  }
  if (!sourceMapFiles || !Array.isArray(sourceMapFiles) || sourceMapFiles.some(file => typeof file !== 'string')) {
    throw new TypeError(`Expected required options.sourceMapFile to be defined and be an array of strings. Got: ${JSON.stringify(sourceMapFiles)}`);
  }
  if (!version || typeof version !== 'string') {
    throw new TypeError(`Expected required options.version to be defined and be a string. Got: ${typeof version}`);
  }

  let sourceMaps, sources;

  try {
    sourceMaps = await Promise.all(sourceMapFiles.map(
      file => readFile(file, { encoding: 'utf-8' })
    ));
  } catch (err) {
    throw new VError(err, 'Failed to read source map');
  }

  try {
    sources = sourceMaps.reduce((result, sourceMap) => result.concat(JSON.parse(sourceMap).sources), []);
  } catch (err) {
    throw new VError(err, 'Failed to parse source map');
  }

  try {
    await doPost(`https://sentry.io/api/0/projects/${organization}/${project}/releases/`, {
      version,
      refs: (repository && commit) ? [{ repository, commit }] : undefined
    }, {
      token
    });
  } catch (err) {
    throw new VError(err, 'Failed to create Release');
  }

  try {
    await Promise.all(sources.map(source =>
      uploadFile(source, fs.createReadStream(source, { encoding: 'utf-8' }), { organization, project, version, token, verbose })
    ));
  } catch (err) {
    throw new VError(err, 'Failed to upload assets');
  }

  try {
    await Promise.all(sourceMapFiles.map((sourceMapFile, i) =>
      uploadFile(sourceMapFile, sourceMaps[i], { organization, project, version, token, verbose })
    ));
  } catch (err) {
    throw new VError(err, 'Failed to upload source map');
  }
};

module.exports = createSentryRelease;
