# Smart Mirror

> The action that does all the heavy lifting for you when it comes to syncing your GitHub repository with other supported Git repositories.

## Configuration

### `INPUT`

| Name         | Type   | Description                                                      | Available For | Required By | Default                      |
| ------------ | ------ | ---------------------------------------------------------------- | ------------- | ----------- | ---------------------------- |
| owner        | string | name of repository owner                                         | Azure, GitHub | GitHub      | github.repository_owner      |
| repository   | string | name of repository\*                                             | Azure, GitHub |             | github.event.repository.name |
| project      | string | name of project                                                  | Azure         |             | github.event.repository.name |
| createMirror | bool   | create the mirror if it doesn't exist\*\*                        | Azure, GitHub |             | false                        |
| visibility   | enum   | mirror visibility if creating a new mirror ( private \| public ) | Azure, GitHub |             | Git host's default           |

\*Be mindful of illegal characters when attempting to create a mirror- the repository name on GitHub may not be acceptable for Azure DevOps. See more about naming conventions under [refs](#refs).

\*\*See [Authentication](#authentication) for what permissions are necessary for the automatic creation of the mirror.

### `ENV`

| Name         | Description                        | Required |
| ------------ | ---------------------------------- | -------- |
| TOKEN_AZURE  | Azure DevOps Personal Access Token | no       |
| TOKEN_GITHUB | GitHub Personal Access Token       | no       |

## Authentication

A personal access token (PAT) must be passed to the action via environment variables previously mentioned. _Bare minimum_ permissions in the following table assume `createMirror` is not being used, and that the mirrors are being created manually before this action is run.

| PAT                                                    | Categories                                                                       | Access               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------- |
| Azure DevOps<br /><sup>(w/ createMirror)</sup>         | - **Project and Team**<br />- **Code**                                           | read, write & manage |
| Azure DevOps<br /><sup>(bare minimum)</sup>            | - **Code**                                                                       | read & write         |
| GitHub: Classic                                        | - **repo**<br />- **workflow**                                                   | all                  |
| GitHub: Fine-grained <br/><sup>(w/ createMirror)</sup> | - **Actions**<br />- **Administration**<br />- **Contents**<br />- **Workflows** | read & write         |
| GitHub: Fine-grained <br/><sup>(bare minimum)</sup>    | - **Actions**<br />- **Contents**<br />- **Workflows**                           | read & write         |

## Usage

We'll use the following table of details for the examples below and assume that all jobs are completing successfully.

| GitHub (Source) |                          |
| --------------- | ------------------------ |
| User            | octocat                  |
| Repo            | octocat-tools            |
| Orgs (memberOf) | octocorp, octocat-design |

### `.github/workflows/smart-mirror.yaml`

```yaml
# EXAMPLE 1: push repo to a single mirror

on:
  - push
  - workflow_dispatch

concurrency: ${{ github.workflow }} # prevents concurrent workflow runs for this action
defaults:
  run:
    shell: bash

jobs:
  some_job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # gets all commit history, branches, and tags

      - name: azure_freelance
        uses: KamaranL/smart-mirror@main
        with:
          owner: octocat-design # devops organization for the mirror
          project: octodev # devops project of where the mirror is associated
          repository: octocat-design-tools # name of the mirror
          createMirror: true # create the mirror if it doesn't already exist
          visibility: public # create the mirror as public (since devops' default is private)
        env:
          TOKEN_AZURE: ${{ secrets.TOKEN_AZURE_FREELANCE }}
```

`azure_freelance` would result in:

- creating a new public `octodev` project in the `octocat-design` organization on Azure DevOps (if the project did not exist)
- creating the new `octocat-design-tools` repository under the `octodev` project (whether the project was newly created or not)
- pushing code from the source repository, `octocat-tools`, to _https&#58;&#47;&#47;dev&period;azure&period;com/octocat-design/octodev/\_git/octocat-design-tools_

```yml
# EXAMPLE 2: push repo to multiple mirrors

on:
  - push
  - workflow_dispatch

concurrency: ${{ github.workflow }}
defaults:
  run:
    shell: bash

jobs:
  another_job:
    if: github.repository == 'octocat/octocat-tools' # prevents this job from running on mirrored github repos
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: azure_personal
        uses: KamaranL/smart-mirror@main
        with:
          createMirror: true
        env:
          TOKEN_AZURE: ${{ secrets.TOKEN_AZURE_PERSONAL }}

      - name: github_corp
        if: ${{ always() }} # assures this step runs even if the previous failed
        uses: KamaranL/smart-mirror@main
        with:
          owner: octocorp
        env:
          TOKEN_GITHUB: ${{ secrets.TOKEN_GITHUB_CORP }}

      - name: github_freelance
        if: ${{ always() }}
        uses: KamaranL/smart-mirror@main
        with:
          owner: octocat-design
          repository: octocat-design-tools
          createMirror: true
        env:
          TOKEN_GITHUB: ${{ secrets.TOKEN_GITHUB_FREELANCE }}
```

`azure_personal` would result in:

- creating a new private `octocat-tools` project in the `octocat` organization on Azure DevOps (if the project did not exist)
- pushing code from the source repository, `octocat-tools`, to the project's default repository at _https&#58;&#47;&#47;dev&period;azure&period;com/octocat/octocat-tools/\_git/octocat-tools_


`github_corp` would result in:

- always running, whether or not the previous `azure_personal` step failed
- pushing code from the source repository `octocat-tools` to an existing `octocat-tools` repository in the `octocorp` organization

`github_freelance` would result in:

- creating a new `octocat-design-tools` repository in the `octocat-design` organization, (if one does not already exist)
- pushing code from the source repository, `octocat-tools`, to the `octocat-design-tools` repository in the `octocat-design` organization

---

## refs

- Azure Naming Restrictions \[ [projects](https://learn.microsoft.com/en-us/azure/devops/organizations/settings/naming-restrictions?view=azure-devops#project-names) | [repos](https://learn.microsoft.com/en-us/azure/devops/organizations/settings/naming-restrictions?view=azure-devops#azure-repos-git) \]
