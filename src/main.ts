import * as core from '@actions/core'
import {JenkinsClient, BuildResult} from './jenkins'

interface JobParameters {
    [propName: string]: any;
}

function parse_parameters(): JobParameters {
    const jp = core.getInput('job_parameters')
    if (typeof jp != "string" || jp == "") {
        return {}
    } else {
        return JSON.parse(jp)
    }
}

async function run(): Promise<void> {
    try {
        const jenkins_url: string = core.getInput('jenkins_url', { required: true })
        core.debug(`Jenkins URL: ${jenkins_url}`)
        const username: string = core.getInput('username', { required: true })
        const password: string = core.getInput('password', { required: true })
        const job_url: string = core.getInput('job_url', { required: true })
        core.debug(`Job URL: ${job_url}`)
        const job_parameters: JobParameters = parse_parameters()
        core.debug(`Job Parameters: ${job_parameters}`)
        const client_cert: string = core.getInput('client_cert', { required: true })
        const client_key: string = core.getInput('client_key', { required: true })

        const client = new JenkinsClient(jenkins_url, username, password, client_cert, client_key)
        const item_url = await client.build(job_url, job_parameters)
        core.debug(`Item URL: ${item_url}`)
        const build_url = await client.getQueuedItemJobUrl(item_url)
        core.debug(`Build URL: ${build_url}`)
        const build = await client.getCompletedBulid(build_url)

        if (build.result) {
            core.setOutput('build_result', build.result.toString())
        }
        core.setOutput('build_url', build_url)
        if (build.result != BuildResult.SUCCESS) {
            if (build.result) {
                core.setFailed(build.result.toString())
            } else {
                core.setFailed("Error no build result")
            }
        }
    } catch (error) {
        core.setFailed(error.message)
    }
}

run()
