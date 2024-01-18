# PR Auto RFC

A GitHub Action for creating RFC forms inside pull request descriptions.

## Usage

Add the following GitHub workflow to your repository.

```yaml
name: PR Auto RFC
on:
  pull_request:
    types:
      - opened
      - edited
      - synchronize
jobs:
  pr-auto-label-action:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: tobytheghost/pr-auto-label-action@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
