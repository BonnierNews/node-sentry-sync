'use strict';

const fs = require('fs');
const util = require('util');

const FormData = require('form-data');
const got = require('got');
const VError = require('verror');

const { name, version, homepage } = require('./package.json');

const readFile = util.promisify(fs.readFile);

const userAgent = name.replace(/^@[^/]*\//, '') + '/' + version + (homepage ? ' (' + homepage + ')' : '');

const doPost = function (url, body, { headers, form, token } = {}) {
  return got(url, {
    method: 'POST',
    headers: Object.assign({
      'Authorization': token ? 'Bearer ' + token : undefined,
      'User-Agent': userAgent
    }, headers || {}),
    followRedirect: false,
    json: true,
    form,
    body,
    timeout: 8000
  })
    .then(res =>
      res.statusCode >= 200 && res.statusCode < 300
        ? res.body
        : Promise.reject(new Error(`Request failed with status code: ${res.statusCode}`))
    );
};

const uploadFile = function (filename, content, { organization, project, token, version, verbose } = {}) {
  {
    if (!filename || !organization || !project || !version) {
      return Promise.reject(
        new TypeError('Needs all of attributes – filename, options.organization, options.project, options.version – to be defined and be strings')
      );
    }
    if (!content) { return Promise.reject(new TypeError('Needs content to be defined')); }

    const form = new FormData();

    form.append('file', content, { filename });
    form.append('name', '~/' + filename);

    return doPost(`https://sentry.io/api/0/projects/${organization}/${project}/releases/${version}/files/`, form, { token, verbose })
      .catch(err => {
        if (verbose) {
          console.error(`An error occurred for "${filename}" with file content of length ${content.length}: `, err.message, err.stack);
        }
        return Promise.reject(err);
      });
  }
};

const createSentryRelease = function ({
  // Required
  organization,
  project,
  sourceMapFile,
  version,
  // Optional
  commit,
  repository,
  token,
  verbose
} = {}) {
  if (project && typeof project !== 'string') {
    throw new TypeError(`Expected required options.project to be defined and be a string. Got: ${typeof project}`);
  }
  if (sourceMapFile && typeof sourceMapFile !== 'string') {
    throw new TypeError(`Expected required options.sourceMapFile to be defined and be a string. Got: ${typeof sourceMapFile}`);
  }
  if (version && typeof version !== 'string') {
    throw new TypeError(`Expected required options.version to be defined and be a string. Got: ${typeof version}`);
  }

  return readFile(sourceMapFile, { encoding: 'utf-8' })
    .catch(err => Promise.reject(new VError(err, 'Failed to read source map')))
    .then(sourceMap => {
      try {
        const { sources } = JSON.parse(sourceMap);
        return { sourceMap, sources };
      } catch (err) {
        return Promise.reject(new VError(err, 'Failed to parse source map'));
      }
    })
    .then(({ sourceMap, sources }) =>
      doPost(`https://sentry.io/api/0/projects/${organization}/${project}/releases/`, {
        version,
        refs: (repository && commit) ? [{ repository, commit }] : undefined
      }, {
        token,
        verbose
      })
        .catch(err => Promise.reject(new VError(err, 'Failed to create Release')))
        .then(() =>
          Promise.all(sources.map(source =>
            uploadFile(source, fs.createReadStream(source, { encoding: 'utf-8' }), { token, verbose })
          ))
            .catch(err => Promise.reject(new VError(err, 'Failed to upload assets')))
        )
        .then(() =>
          uploadFile(sourceMapFile, sourceMap, { token, verbose })
            .catch(err => Promise.reject(new VError(err, 'Failed to upload source map')))
        )
    );
};

module.exports = createSentryRelease;
