import Configuration from './classes/configuration';
import Azure from './classes/azure';
import GitHub from './classes/github';
import { log, str, msg } from './common/utils';

(async () => {
  const config = new Configuration();
  const mode = config.mode.toLowerCase();
  let mirror;

  try {
    if (mode === 'azure') {
      mirror = new Azure(config);

      if (!(await mirror.project.exists())) {
        if (!config.createMirror)
          throw new Error(str.format(msg.ErrorFound, config.project));

        await mirror.project.create();
        await mirror.project.exists();
        await mirror.repository.exists({
          repositoryId: config.project,
          maxAttempts: 100
        });
      }
    }

    if (mode === 'github') {
      mirror = new GitHub(config);
    }

    if (mirror) {
      if (!(await mirror.repository.exists())) {
        if (!config.createMirror)
          throw new Error(str.format(msg.ErrorFound, config.repository));

        await mirror.repository.create();
        await mirror.repository.exists({
          maxAttempts: 50
        });
      }

      await mirror.push();
    }
  } catch (e) {
    log.error(e, 'main');
  }
})();
