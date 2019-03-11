#!/usr/bin/env node
'use strict';

const meow = require('meow');
const createSentryRelease = require('.');

const cli = meow(`
    Usage
      $ sentry-sync [...source map files]

    Required options
      --organization, -o    Name of Sentry organization
      --project, -p         Name of Sentry project
      --source-version, -s  The version name for the release
      --token, -t           A Sentry token to use

    Options
      --commit              The commit hash of the pushed code
      --help                When set, this help will be printed
      --repository          Name of git repository, eg. 'owner-name/repo-name'
      --verbose             Sets more verbose feedback to be returned
      --version             When set, this tools version will be printed

    Examples
      $ sentry-sync -o foo -p bar -s 1.0 -t abc123 </path/to/source.js.map>
`, {
  flags: {
    organization: {
      type: 'string',
      alias: 'o'
    },
    project: {
      type: 'string',
      alias: 'p'
    },
    release: {
      type: 'string',
      alias: 'r'
    },
    token: {
      type: 'string',
      alias: 't'
    },
    commit: { type: 'string' },
    repository: { type: 'string' },
    verbose: { type: 'boolean' }
  }
});

// eslint-disable-next-line no-unused-vars
const sourceMaps = cli.input;
// const {
//   organization,
//   project,
//   release,
//   token,
//   commit,
//   repository,
//   verbose
// } = cli.flags;

createSentryRelease({
  // FIXME: Actually send in the correct values
})
  .catch(() => {
    process.exit(1);
  });
