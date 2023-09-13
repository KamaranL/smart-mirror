import fs from 'node:fs';
import { log, str, msg } from '../common/utils';
import { pattern, action } from '../common/ref';
import * as I from '../common/interfaces';
import * as source from '@actions/github';
import * as core from '@actions/core';

export default class Configuration {
  mode: string;
  token: string;
  file?: string;
  owner: string;
  project: string;
  repository: string;
  createMirror: boolean;
  visibility?: string;

  constructor() {
    log.debug(str.format(msg.ClassConstruct, Configuration.name));

    // mode
    this.mode = (() => {
      let mode;

      try {
        const opts = ['AZURE', 'GITHUB'];
        const options = [];
        log.debug(str.format(msg.Validating, 'token'));

        for (const opt of opts) {
          if (process.env[`TOKEN_${opt}`]) {
            log.debug(str.format(msg.SuccessFound, opt));

            options.push(opt);
          }
        }

        if (options.length > 1)
          throw new Error(str.format(msg.ErrorManyTokens, options.toString()));

        if (options.length === 0)
          throw new Error(str.format(msg.NoTokens, action.url));

        mode = options[0].replace(pattern.all.whitespace, '');
      } catch (e) {
        log.error(e, 'mode');
      }

      return mode as string;
    })();
    log.debug(str.format(msg.ClassPropertySet, ['mode', this.mode]));

    // token
    this.token = (() => {
      return process.env[`TOKEN_${this.mode}`] as string;
    })();
    log.debug(str.format(msg.ClassPropertySet, ['token', this.token]));

    // file
    this.file = (() => {
      return process.env.CONFIG_FILE as string;
    })();
    log.debug(str.format(msg.ClassPropertySet, ['file', this.file]));

    const src = source.context;

    // base config
    const cfg: I.Defaults = (() => {
      let _;
      let def;

      try {
        // defaults
        def = {
          owner: src.repo.owner,
          project: src.repo.repo,
          repository: src.repo.repo,
          createMirror: false,
          visibility: undefined
        };

        // parse file
        if (this.file) {
          _ = fs.readFileSync(this.file, 'utf-8');
          if (_ !== '') _ = JSON.parse(_);
          _.owner = _.owner ?? def.owner;
          _.project = _.project ?? def.project;
          _.repository = _.repository ?? def.repository;
          _.createMirror = _.createMirror ?? def.createMirror;
          _.visibility = _.visibility ?? def.visibility;
        } else {
          _ = def;
        }
      } catch (e) {
        log.error(e, 'cfg');
      }

      return _;
    })();

    // owner
    this.owner = (() => {
      return process.env.INPUT_OWNER ? core.getInput('owner') : cfg.owner;
    })();
    log.debug(str.format(msg.ClassPropertySet, ['owner', this.owner]));

    // project
    this.project = (() => {
      return process.env.INPUT_PROJECT ? core.getInput('project') : cfg.project;
    })();
    log.debug(str.format(msg.ClassPropertySet, ['project', this.project]));

    // repository
    this.repository = (() => {
      const repo = process.env.INPUT_REPOSITORY
        ? core.getInput('repository')
        : cfg.repository;

      try {
        if (this.mode === 'GITHUB') {
          if (
            source.context.repo.owner === this.owner &&
            source.context.repo.repo === repo
          )
            throw new Error(msg.ErrorClobber);
        }
      } catch (e) {
        log.error(e, 'repository');
      }

      return repo;
    })();
    log.debug(
      str.format(msg.ClassPropertySet, ['repository', this.repository])
    );

    // createMirror
    this.createMirror = (() => {
      return process.env.INPUT_CREATEMIRROR
        ? core.getBooleanInput('createMirror')
        : cfg.createMirror;
    })();
    log.debug(
      str.format(msg.ClassPropertySet, ['createMirror', `${this.createMirror}`])
    );

    // visibility
    this.visibility = (() => {
      const opts = ['private', 'public'];
      const vis = process.env.INPUT_VISIBILITY
        ? core.getInput('visibility')
        : cfg.visibility;

      try {
        if (vis) {
          if (!opts.includes(vis)) {
            throw new Error(
              str.format(msg.ErrorOneOf, ['visibility', opts.toString()])
            );
          }
        }
      } catch (e) {
        log.error(e, 'visibility');
      }

      return vis;
    })();
    log.debug(
      str.format(msg.ClassPropertySet, ['visibility', `${this.visibility}`])
    );
  }
}
