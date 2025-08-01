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
- Check especially what's [`up for grabs`](https://github.com/okTurtles/group-income/labels/Note%3AUp-for-grabs), [`high priority`](https://github.com/okTurtles/group-income/labels/Priority%3AHigh), [`level: starter`](https://github.com/okTurtles/group-income/labels/Level%3AStarter), or has a **[`Bounty`](https://github.com/okTurtles/group-income/issues?q=is%3Aopen+is%3Aissue+label%3ANote%3ABounty)**
- Read some docs, like: __[:book: Frontend: Getting Started](docs/src/Getting-Started-frontend.md)__ and  __[:book: Style Guide](docs/src/Style-Guide.md)__

Then, [tell folks what you'll be working on](https://join.slack.com/t/okturtles/shared_invite/zt-10jmpfgxj-tXQ1MKW7t8qqdyY6fB7uyQ), and:

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

#### Pull Request Requirements (❗️)

Pull requests (PRs) must adhere to the following requirements (unless the Founation is organizing a special hackathon, in which case, hackathon-rules apply).

1. A PR **SHOULD** be a minimal and accurate answer to exactly one identified and agreed problem.
2. A PR **SHOULD** follow [the boy scout rule](https://github.com/okTurtles/group-income/issues/383#issuecomment-383381863): leave the code cleaner than you found it when the refactor effort is not too big.
3. A PR **MAY NOT** include non-trivial code from other projects unless the Contributor is the original author of that code.
4. A PR **MUST** pass all tests on at least the principle target platform.
5. A PR **MUST** include new tests for any new functionality introduced.
6. A PR **MUST** follow the requirements spelled out in this project's [Style Guide](docs/src/Style-Guide.md).
7. A PR **MUST** receive approval from at least one long-term contributor before being merged. Contributors **MAY NOT** review their own PRs, **MUST NOT** push commits to someone else's PR.
8. A PR **MUST** receive approval from the designer when it's related to the user interface before being merged.
9. A PR **MAY NOT** be merged if there exist unaddressed concerns from a current maintainer (via the Github "request changes" review feature). Contributors are encouraged to discuss the requested changes, and may even argue against them if there are strong reasons to do so. However, maintainers have veto power over all PRs.
10. Only **maintainers** may merge PRs. Maintainers **SHOULD** use "squash-merging" when merging to keep the `master` branch commit history clean. If there are no maintainers, further changes should happen in a fork. For this project, the maintainer(s) is/are: [@taoeffect](https://github.com/taoeffect)

## How to help by translating

You need to be somewhat familiar with how Github works (to know how to edit files and create pull requests). After that it's pretty simple:

1. Either use the Github UI to edit files, or clone this repository and create a new branch using the `git` command.
2. Look at the [`strings/` folder](https://github.com/okTurtles/group-income/tree/master/strings).
    - You will see files like `english.strings`, `english.json`, `french.strings`, `french.json`, etc.
    - If you see your `<language>.strings`, edit that file and begin adding translations for any strings marked `MISSING TRANSLATION`
    - If you do not see such a file, then copy `english.strings` into another file called `<your-language>.strings`. For example, you can create `german.strings`. Then begin adding translations. Use [`french.strings`](https://github.com/okTurtles/group-income/blob/master/strings/french.strings) as an example for what to do.
3. Don't modify any comments in the `.strings` file, don't modify the `.json` file (if it exists), don't translate variables (marked with braces like so: `{variable}`), just update the strings to the right of the `=` sign into your language, and escape quotes (`"`) inside of the quotes like so: `\"`
4. When you are done, save the file and send us a pull request with the changes.

We'll then use our [`strings`](https://github.com/okTurtles/strings) command to import the changes into Github.

Thank you so much!

If you're like to learn more about the `strings` utility [see this article](https://github.com/okTurtles/strings/blob/master/README.md#help-translate-a-language).

## How to submit an issue

- Check if there's an open/closed issue that answers your question.
- Read [troubleshooting docs](docs/src/Troubleshooting.md).
- **Create an issue in the required [problem-solution](ISSUE_TEMPLATE.md) format.**
