# Jenkins Action

This action runs a Jenkins job and follows it to completion

## Usage

**jenkinsUrl**: The URL to the Jenkins Server

**username**: The username to auth to Jenkins as

**password**: The password of the user to auth to Jenkins as

**jobUrl**: The URL to the job you want to trigger, e.g. job/jenkins-action

**jobParameters**: Parameters to pass to the job

**clientCert**: The certificate used to auth to your webserver

**clientKey**: The key used to auth to your webserver


```
name: trigger jenkins job
on: # rebuild any PRs and main branch changes
  pull_request:
  push:
jobs:
  test: # make sure the action works on a clean machine without building
    runs-on: ubuntu-latest
    steps:
    - uses: zendesk/jenkins-action@master
      with:
        jenkins_url: https://public-jenkins.example.com
        username: rusty@zendesk.com
        password: ${{ secrets.jenkins_password }}
        job_url: job/jenkins-action
        client_key: ${{ secrets.jenkins_client_key }}
        client_cert: ${{ secrets.jenkins_client_cert }}
```

## Code in Master

Install the dependencies
```bash
$ npm install
```

Build the typescript and package it for distribution
```bash
$ npm run build && npm run pack
```

Run the tests :heavy_check_mark:
```bash
$ npm test

 PASS  ./index.test.js

...
```

## Publish to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder.

Then run [ncc](https://github.com/zeit/ncc) and push the results:
```bash
$ npm run pack
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

Your action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
