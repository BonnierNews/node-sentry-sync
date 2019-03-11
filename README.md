# Sentry Sync

Syncs `releases` as well as source maps and related source files to Sentry.

[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat)](https://github.com/Flet/semistandard)

## Install

```bash
npm install -g @bonniernews/sentry-sync
```

## Syntax

```bash
sentry-sync \
--organization foo \
--project bar \
--source-version <something-indicating-the-version> \
--token secret123 \
relative/path/to/source-map/file1
relative/path/to/source-map/file2
```

## Flags

* `--organization` - _required_ - specify the name of the Sentry organization of the project to sync with
* `--project` - _required_ - specify the name Sentry project to sync with
* `--source-version` - _required_ - specify the version of the source that is synced (eg. a short hash, a SemVer version or such)
* `--commit` - specify the commit hash of the pushed code
* `--help` - if specified then this help will be printed
* `--repository` - specify the name of the git repository for the code, eg. `owner-name/repo-name`
* `--token` - the Sentry token used to authenticate against the Sentry API
* `--verbose` - if specified, then more verbose feedback will be returned
* `--version` - if specified, then the version of this tool will be returned
