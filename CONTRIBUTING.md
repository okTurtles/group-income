# Contributing

- [How to contribute code](#how-to-contribute-code)
    - [1. Decide what to work on](#1-decide-what-to-work-on)
    - [2. FORK this repo](#2-fork-this-repo)
    - [3. Follow this Contribution Policy](#3-follow-this-contribution-policy)
        - [Licensing and Ownership](#licensing-and-ownership)
        - [Pull Request Requirements](#pull-request-requirements)
- [How to help by translating](#how-to-help-by-translating)
- [How to submit an issue](#how-to-submit-an-issue)

## How to contribute code

### 1. Decide what to work on

- Check the [open issues](https://github.com/okTurtles/group-income/issues).
- View the [project board](https://github.com/okTurtles/group-income/projects).
- Check especially what's [`up for grabs`](../../labels/Note%3AUp-for-grabs), [`high priority`](../../labels/Priority%3AHigh), [`level: starter`](../../labels/Level%3AStarter), or has a **[`Bounty`](https://github.com/okTurtles/group-income/issues?q=is%3Aopen+is%3Aissue+label%3ANote%3ABounty)**
- Read some docs, like: __[:book: Frontend: Getting Started](docs/Getting-Started-frontend.md)__ and  __[:book: Style Guide](docs/Style-Guide.md)__

Then, [tell folks what you'll be working on](https://gitter.im/okTurtles/group-income), and:

### 2. Create a fork of the repo, or work in a topic branch

Our process for submitting code is inspired by the [C4.1](http://hintjens.com/blog:93) process (documentation may be edited directly by maintainers):

1. **Always** either work in your own fork or a topic-branch and submit pull requests (PRs) to `master`. Our [Cypress Dashboard](https://dashboard.cypress.io/) integration currently makes topic-branches a better option for long-term contributor.
2. **Always** add/update tests for any new/modified functionality. (:exclamation:)
3. **Always** make sure your PR passes all tests (`grunt test`).
4. **Always** ensure your PR adheres to the **[Contribution Policy](#contribution-policy)** described below.

### 3. Follow this Contribution Policy

This contribution policy will evolve over time. For now it is based on a slightly modified subset of [C4.1](https://rfc.zeromq.org/spec:42/C4/).

#### Licensing and Ownership

1. All contributions to the project source code ("patches" or "pull requests") SHALL use the same license as the project.
2. All patches are owned by their authors. There SHALL NOT be any copyright assignment process.
3. Each Contributor SHALL be responsible for identifying themselves in the project Contributor list.

#### Pull Request Requirements (:exclamation:)

Pull requests (PRs) must adhere to the following requirements (unless the Founation is organizing a special hackathon, in which case, hackathon-rules apply).

1. A PR **SHOULD** be a minimal and accurate answer to exactly one identified and agreed problem.
2. A PR **SHOULD** follow [the boy scout rule](https://github.com/okTurtles/group-income/issues/383#issuecomment-383381863): leave the code cleaner than you found it when the refactor effort is not too big.
3. A PR **MAY NOT** include non-trivial code from other projects unless the Contributor is the original author of that code.
4. A PR **MUST** pass all tests on at least the principle target platform.
5. A PR **MUST** include new tests for any new functionality introduced.
6. A PR **MUST** follow the requirements spelled out in this project's [Style Guide](docs/Style-Guide.md).
7. A PR **MUST** receive approval from at least one long-term contributor before being merged. Contributors **MAY NOT** review their own PRs, **MUST NOT** push commits to someone else's PR.
8. A PR **MUST** receive approval from the designer when it's related to the user interface before being merged.
9. A PR **MAY NOT** be merged if there exist unaddressed concerns from a current maintainer (via the Github "request changes" review feature). Contributors are encouraged to discuss the requested changes, and may even argue against them if there are strong reasons to do so. However, maintainers have veto power over all PRs.

Only **Maintainers** may merge PRs. Maintainers should use "squash-merging" when merging to keep the `master` branch commit history clean. If there are no maintainers, further changes should happen in a fork. For this project, the maintainer(s) is/are: [@taoeffect](https://github.com/taoeffect)

## How to help by translating

We always appreciate translation efforts, even if they're not perfect or complete! The instructions are [here](https://github.com/okTurtles/strings/blob/master/README.md#help-translate-a-language).

## How to submit an issue

- Check if there's an open/closed issue that answers your question.
- Read [troubleshooting docs](docs/Troubleshooting.md).
- **Create an issue in the required [problem-solution](ISSUE_TEMPLATE.md) format.**
