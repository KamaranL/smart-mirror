import { log, str, msg } from '../common/utils';
import { pattern } from '../common/ref';
import * as I from '../common/interfaces';
import Mirror from './mirror';
import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import { ProjectVisibility } from 'azure-devops-node-api/interfaces/CoreInterfaces';

export default class Azure extends Mirror {
  constructor(config: I.Configuration) {
    super(config);
    log.debug(str.format(msg.ClassConstruct, Azure.name));

    // baseUrl
    super.baseUrl = 'https://dev.azure.com';
    log.debug(str.format(msg.ClassPropertySet, ['baseUrl', this.baseUrl]));

    // gitUrl
    super.gitUrl = `${this.baseUrl.replace(
      pattern.first.https,
      `https://${config.token}@`
    )}/${config.owner}/${config.project.replace(
      pattern.all.whitespace,
      '%20'
    )}/_git/${config.repository.replace(pattern.all.whitespace, '%20')}`;
    log.debug(str.format(msg.ClassPropertySet, ['gitUrl', this.gitUrl]));
  }

  private __webApi = async (): Promise<WebApi> =>
    await new Promise<WebApi>((resolve, reject) => {
      try {
        resolve(
          new WebApi(
            `${this.baseUrl}/${this.config.owner}`,
            getPersonalAccessTokenHandler(this.config.token)
          )
        );
      } catch (e) {
        reject(e);
        log.error(e, '__webApi');
      }
    });

  project = {
    create: async () => {
      const web = await this.__webApi();
      const core = await web.getCoreApi();
      let visibility: ProjectVisibility | undefined;

      if (this.config.visibility) {
        visibility =
          this.config.visibility === 'private'
            ? ProjectVisibility.Private
            : ProjectVisibility.Public;
      }

      return await this.request({
        operation: I.Operation.create,
        entity: {
          type: I.EntityType.project,
          name: this.config.project
        },
        asyncFunction: async () =>
          await core.queueCreateProject({
            name: this.config.project,
            capabilities: {
              versioncontrol: { sourceControlType: 'Git' },
              processTemplate: {
                templateTypeId: 'b8a3a935-7e91-48b8-a94c-606d37c3e9f2'
              }
            },
            visibility
          })
      });
    },

    exists: async () => {
      const web = await this.__webApi();
      const core = await web.getCoreApi();

      return await this.request({
        operation: I.Operation.read,
        entity: {
          type: I.EntityType.project,
          name: this.config.project
        },
        asyncFunction: async () => await core.getProject(this.config.project)
      });
    }
  };

  repository = {
    create: async () => {
      const web = await this.__webApi();
      const git = await web.getGitApi();

      return await this.request({
        operation: I.Operation.create,
        entity: {
          type: I.EntityType.repository,
          name: this.config.repository
        },
        asyncFunction: async () =>
          await git.createRepository(
            {
              name: this.config.repository
            },
            this.config.project
          )
      });
    },

    exists: async (options?: {
      repositoryId?: string;
      maxAttempts?: number;
    }) => {
      const web = await this.__webApi();
      const git = await web.getGitApi();

      return await this.request({
        operation: I.Operation.read,
        entity: {
          type: I.EntityType.repository,
          name: options?.repositoryId ?? this.config.repository
        },
        asyncFunction: async () =>
          await git.getRepository(
            options?.repositoryId ?? this.config.repository,
            this.config.project
          ),
        maxAttempts: options?.maxAttempts
      });
    }
  };
}
