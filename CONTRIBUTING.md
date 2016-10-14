# Contributing

- [How to contribute code](#how-to-contribute-code)
	- [1. Decide what to work on](#1-decide-what-to-work-on)
	- [2. FORK this repo](#2-fork-this-repo)
	- [3. Follow this Contribution Policy](#3-follow-this-contribution-policy)
		- [Licensing and Ownership](#licensing-and-ownership)
		- [Patch Requirements](#patch-requirements)
- [How to submit an issue](#how-to-submit-an-issue)

## How to contribute code

### 1. Decide what to work on

- Check the [open issues](issues).
- View the [open mileposts](issues?q=is%3Aopen+is%3Aissue+label%3AMilepost). *(see: [Milepost Methodology](https://github.com/taoeffect/mileposts))*
- Check especially what's [`up for grabs`](issues?q=is%3Aopen+is%3Aissue+label%3Aup-for-grabs), [`high priority`](issues?q=is%3Aopen+is%3Aissue+label%3A%22high+priority%22), or [`low hanging fruit`](issues?q=is%3Aopen+is%3Aissue+label%3A%22low+hanging+fruit%22).
- Read some docs, like: __[:book: Frontend: Getting Started](docs/Getting-Started-frontend.md)__

Then, [tell folks what you'll be working on](https://gitter.im/okTurtles/group-income), and:

### 2. FORK this repo

Everyone must follow these rules (inspired by the [C4.1](http://hintjens.com/blog:93) process). No exceptions.

1. **Always** work in your own fork and submit pull requests (PRs) to `master`.
2. **Always** submit a _minimal and accurate answer_ to any issue. The simplest solution is the best solution.
3. **Always** add/update tests for any new/modified functionality.
4. **Always** make sure your PR passes all tests (`grunt test`).
5. **Always** ensure your PR adheres to the **[Contribution Policy](#contribution-policy)** described below.

### 3. Follow this Contribution Policy

This contribution policy will evolve over time. For now it is based on a mixture of the [Mileposts Methodology](https://github.com/taoeffect/mileposts) and a slightly modified subset of [C4.1](https://rfc.zeromq.org/spec:42/C4/).

#### Licensing and Ownership

1. All contributions to the project source code ("patches" or "pull requests") SHALL use the same license as the project.
2. All patches are owned by their authors. There SHALL NOT be any copyright assignment process.
3. Each Contributor SHALL be responsible for identifying themselves in the project Contributor list.

#### Patch Requirements

1. A patch SHOULD be a minimal and accurate answer to exactly one identified and agreed problem.
2. A patch SHALL NOT include non-trivial code from other projects unless the Contributor is the original author of that code.
3. A patch MUST pass all tests on at least the principle target platform.

## How to submit an issue

- Check if there's an open/closed issue that answers you question.
- Read [troubleshooting docs](docs/Troubleshooting.md).
- **Create an issue in the required [problem-solution](ISSUE_TEMPLATE.md) or [milepost](https://github.com/taoeffect/mileposts) format.**
