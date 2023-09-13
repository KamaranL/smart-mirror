/* Reference Data */

export const pattern = {
  all: {
    tokens: /{[0-9]}/g,
    whitespace: /\s+/g
  },

  first: {
    https: /^https:\/\//,
    line: /^[^\n]+/
  },

  last: {
    char: /.$/,
    period: /\.(?=[^.]*$)/
  },

  action: {
    owner: /^(.*)\//,
    repo: /\/(.*)$/
  },

  workflow: {
    file: /\.github\/workflows\/([^@]+)/
  }
};

export const message = `
ClassConstruct=Constructing {0}
ClassMethodCall=Calling {0}.{1}
ClassPropertySet=Setting {0}: {1}
ErrorAuthentication=There was a problem authenticating on '{0}'
ErrorCreate=There was a problem creating {0} '{1}'
ErrorClobber=Source owner/repo match destination owner/repo
ErrorFound=Unable to find '{0}'
ErrorManyTokens=Too many tokens provided for this step. Please divide tokens up into one token per mirror, per step. Tokens: '{0}'
ErrorNoToken=A valid token was not properly set for this action. Please refer to '{0}' for help
ErrorPromise=An unhandled rejection occurred for {0}
ErrorUnexpected=An unexpected error occurred with {0}
ErrorUpdate=There was a problem updating {0} '{1}'
ErrorOneOf='{0}' must be one of [{1}]
PollCount=Polling '{0}' {1}
Request=[{0}]{1} {2} request {3}
Resolving=Attempting to resolve {0}...
SuccessCreate=Created '{0}'.
SuccessFound=Found '{0}'.
SuccessRequest=Successful {0} {1} request.
SuccessUpdate=Updated {0} '{1}'.
Validating=Validating {0}.
`;

const __actionRepository = process.env.GITHUB_ACTION_REPOSITORY as string;

export const action = {
  name: (() => {
    let name;

    if (__actionRepository)
      name = __actionRepository.match(pattern.action.repo)?.[1];
    if (name?.includes('-')) {
      name = name.split('-').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
      });

      return name.join(' ');
    } else {
      return `${name?.charAt(0).toUpperCase()} ${name?.slice(1)}`;
    }
  })(),

  owner: (() => {
    let owner;

    if (__actionRepository)
      owner = __actionRepository.match(pattern.action.owner);
    if (owner) return owner[1];
  })(),

  repo: (() => {
    let repo;

    if (__actionRepository)
      repo = __actionRepository.match(pattern.action.repo);
    if (repo) return repo[1];
  })(),

  url: `https://github.com/${__actionRepository}`,

  version: process.env.npm_package_version as string
};

const __workflowRef = process.env.GITHUB_WORKFLOW_REF as string;

export const github = {
  workflow: {
    file: __workflowRef.match(pattern.workflow.file)?.[0]
  }
};
