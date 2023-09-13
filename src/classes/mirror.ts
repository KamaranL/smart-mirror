import path from 'node:path';
import fs from 'node:fs';
import { log, str, isLocal, msg } from '../common/utils';
import { pattern } from '../common/ref';
import * as I from '../common/interfaces';
import * as source from '@actions/github';
import { ExecOptions, exec } from '@actions/exec';

export default class Mirror {
  protected baseUrl!: string;
  protected gitUrl!: string;
  protected config!: I.Configuration;

  protected constructor(config: I.Configuration) {
    log.debug(str.format(msg.ClassConstruct, Mirror.name));

    // config
    this.config = config;
  }

  protected request = async <T>(
    request: I.RequestObject<T>
  ): Promise<boolean> => {
    const operation = I.Operation[request.operation];
    const entity = {
      type: I.EntityType[request.entity.type],
      name: request.entity.name
    };
    const maxAttempts =
      request.maxAttempts && operation === 'read' ? request.maxAttempts : 1;

    log.debug(
      str.format(msg.ClassMethodCall, [
        Mirror.name,
        `${operation}(${entity.type}: ${entity.name})`
      ])
    );

    for (let i = 1; i <= maxAttempts; i++) {
      const counter = maxAttempts === 1 ? '' : `(${i}/${maxAttempts})`;
      log.debug(
        str.format(msg.Request, [entity.type, entity.name, operation, counter])
      );

      try {
        if (await request.asyncFunction()) {
          log.debug(
            str.format(msg.SuccessRequest, [
              operation,
              `${entity.type} (${entity.name})`
            ])
          );

          return true;
        }
      } catch (e) {
        if (request.maxAttempts && i === maxAttempts)
          log.error(e, `send[${operation}][${entity.type}]${entity.name}`);
      }
    }

    return false;
  };

  push = async (): Promise<boolean> => {
    const mode = this.config.mode.toLowerCase();
    const origin = `${mode}_${this.config.owner.replace(
      pattern.all.whitespace,
      '-'
    )}_${this.config.repository.replace(pattern.all.whitespace, '-')}`;
    const gitUrl = this.gitUrl;
    const workspace = path.join(process.cwd(), '../');
    const localRepo = source.context.repo.repo;
    const localMirror = `__${localRepo}__`;
    const execOpts: ExecOptions = {
      cwd: workspace,
      listeners: {
        debug: (data: string) => log.debug(data)
      }
    };

    if (!isLocal()) {
      log.debug(str.format(msg.ClassMethodCall, [Mirror.name, `push()`]));

      try {
        if (!fs.existsSync(path.join(workspace, localMirror)))
          await exec(
            'git',
            ['clone', '--mirror', localRepo, localMirror],
            execOpts
          );

        execOpts.cwd = path.join(workspace, localMirror);
        await exec('git', ['remote', 'add', origin, gitUrl], execOpts);

        if (
          (await exec(
            'git',
            ['push', origin, '--mirror', '--force'],
            execOpts
          )) !== 0
        )
          throw new Error(
            str.format(msg.ErrorUpdate, ['mirror', this.config.repository])
          );
      } catch (e) {
        log.error(e, `push(${mode})`);
      }
    } else {
      return true;
    }

    return true;
  };
}
