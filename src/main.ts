import * as core from '@actions/core'
import {JenkinsClient, BuildResult} from './jenkins'

interface JobParameters {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [propName: string]: any
}

function parseParameters(): JobParameters {
  const jp = core.getInput('job_parameters')
  if (typeof jp !== 'string' || jp === '') {
    return {}
  } else {
    return JSON.parse(jp)
  }
}

async function run(): Promise<void> {
  try {
    const jenkinsUrl: string = core.getInput('jenkins_url', {required: true})
    core.debug(`Jenkins URL: ${jenkinsUrl}`)
    const username: string = core.getInput('username', {required: true})
    const password: string = core.getInput('password', {required: true})
    const jobUrl: string = core.getInput('job_url', {required: true})
    core.debug(`Job URL: ${jobUrl}`)
    const jobParameters: JobParameters = parseParameters()
    core.debug(`Job Parameters: ${jobParameters}`)
    const clientCert: string = core.getInput('client_cert', {required: true})
    const clientKey: string = core.getInput('client_key', {required: true})

    const client = new JenkinsClient(
      jenkinsUrl,
      username,
      password,
      clientCert,
      clientKey
    )

    console.log("Submitting build")
    const itemUrl = await client.build(jobUrl, jobParameters)
    console.log(`Build Queue Item URL: ${itemUrl}`)
    const buildUrl = await client.getQueuedItemJobUrl(itemUrl)
    console.log(`Build URL: ${buildUrl}`)
    const build = await client.getCompletedBulid(buildUrl)

    if (build.result) {
      core.setOutput('build_result', build.result.toString())
    }
    core.setOutput('build_url', buildUrl)
    if (build.result !== BuildResult.SUCCESS) {
      if (build.result) {
        core.setFailed(build.result.toString())
      } else {
        core.setFailed('Error no build result')
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
