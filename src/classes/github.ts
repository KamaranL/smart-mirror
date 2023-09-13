import { log, str, msg } from '../common/utils';
import { action, pattern } from '../common/ref';
import * as I from '../common/interfaces';
import Mirror from './mirror';
import { Octokit } from '@octokit/core';
import fetch from 'node-fetch';
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';
import { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types.d';

export default class GitHub extends Mirror {
  constructor(config: I.Configuration) {
    super(config);
    log.debug(str.format(msg.ClassConstruct, GitHub.name));

    // sanitize org
    this.config.owner = this.config.owner.replace(pattern.all.whitespace, '-');

    // sanitize repo
    this.config.repository = this.config.repository.replace(
      pattern.all.whitespace,
      '-'
    );

    // baseUrl
    super.baseUrl = 'https://github.com';
    log.debug(str.format(msg.ClassPropertySet, ['baseUrl', this.baseUrl]));

    // gitUrl
    super.gitUrl = `${this.baseUrl.replace(
      pattern.first.https,
      `https://${this.config.token}@`
    )}/${this.config.owner}/${this.config.repository}`;
    log.debug(str.format(msg.ClassPropertySet, ['gitUrl', this.gitUrl]));
  }

  private __webApi = async (): Promise<Octokit & Api> =>
    await new Promise<Octokit & Api>(async (resolve, reject) => {
      try {
        const api = new (Octokit.plugin(restEndpointMethods))({
          request: {
            fetch
          },
          userAgent: `${action.repo}/${action.version}`,
          auth: this.config.token
        });

        await api.rest.users.getAuthenticated();
        resolve(api);
      } catch (e) {
        reject(e);
        log.error(e, '__webApi');
      }
    });

  private __getOwnerType = async (): Promise<string> => {
    const api = await this.__webApi();
    const owner = await api.rest.users.getByUsername({
      username: this.config.owner
    });

    return owner.data.type;
  };

  repository = {
    create: async () => {
      const api = await this.__webApi();
      let mkPrivate: boolean | undefined;

      if (this.config.visibility) {
        mkPrivate = this.config.visibility === 'private' ? true : false;
      }

      return await this.request({
        operation: I.Operation.create,
        entity: {
          type: I.EntityType.repository,
          name: this.config.repository
        },
        asyncFunction: async () => {
          const ownerType = await this.__getOwnerType();

          switch (ownerType) {
            case 'User':
              await api.rest.repos.createForAuthenticatedUser({
                name: this.config.repository,
                private: mkPrivate
              });
              break;
            case 'Organization':
              await api.rest.repos.createInOrg({
                org: this.config.owner,
                name: this.config.repository,
                private: mkPrivate
              });
              break;
          }
        }
      });
    },

    exists: async (options?: { maxAttempts?: number }) => {
      const api = await this.__webApi();

      return await this.request({
        operation: I.Operation.read,
        entity: {
          type: I.EntityType.repository,
          name: this.config.repository
        },
        asyncFunction: async () =>
          await api.rest.repos.get({
            owner: this.config.owner,
            repo: this.config.repository
          }),
        maxAttempts: options?.maxAttempts
      });
    }
  };
}
