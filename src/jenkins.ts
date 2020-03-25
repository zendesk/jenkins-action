import * as core from '@actions/core'
import fetch, {Response} from 'node-fetch'
import b64 from 'base64-async'
import https from 'https'
import path from 'path'

interface Build {
  building: boolean
  result?: BuildResult
}

export enum BuildResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  UNSTABLE = 'UNSTABLE',
  ABORTED = 'ABORTED',
  NOT_BUILT = 'NOT_BUILT'
}

interface QueueItemExecutable {
  number: number
  url: string
}

interface QueueItem {
  blocked: boolean
  buildable: boolean
  id: number
  stuck: boolean
  url: string
  why?: string
  cancelled: boolean
  executable?: QueueItemExecutable

  // [propName: string]: any;
}

export class JenkinsClient {
  baseUrl: string
  username: string
  password: string
  cert: string
  key: string

  constructor(
    baseUrl: string,
    username: string,
    password: string,
    cert: string,
    key: string
  ) {
    this.baseUrl = baseUrl
    this.username = username
    this.password = password
    this.cert = cert
    this.key = key
  }

  sanitizeUrl(url: string): string {
    const baseUrl = new URL(this.baseUrl)
    const newUrl = new URL(url)
    newUrl.host = baseUrl.host
    newUrl.protocol = baseUrl.protocol
    return newUrl.toString()
  }

  async authorization(): Promise<string> {
    const auth: string = await b64.encode(
      Buffer.from(`${this.username}:${this.password}`)
    )
    return `Basic ${auth}`
  }

  async post(url: string, parameters: object): Promise<Response> {
    const res = await fetch(this.sanitizeUrl(url), {
      method: 'post',
      body: JSON.stringify(parameters),
      agent: new https.Agent({
        cert: this.cert,
        key: this.key
      }),
      headers: {
        Authorization: await this.authorization(),
        'Content-Type': 'application/json'
      }
    })
    if (res.status >= 400) {
      throw new Error(`Response: ${res.status} ${res.statusText}`)
    }
    return res
  }

  async get(url: string): Promise<Response> {
    const res = await fetch(this.sanitizeUrl(url), {
      method: 'get',
      agent: new https.Agent({
        cert: this.cert,
        key: this.key
      }),
      headers: {
        Authorization: await this.authorization(),
        'Content-Type': 'application/json'
      }
    })
    if (res.status >= 400) {
      throw new Error(`Response: ${res.status} ${res.statusText}`)
    }
    return res
  }

  async build(jobUrl: string, parameters: object): Promise<string> {
    const url = new URL(path.join(jobUrl, 'build'), this.baseUrl)
    const res = await this.post(url.toString(), parameters)
    core.debug(`Response: ${res.status} ${res.statusText}`)
    const location = res.headers.get('location')
    if (location == null) {
      throw new Error('Location empty, lost track of the job')
    }
    return this.sanitizeUrl(location)
  }

  async getQueueItem(itemUrl: string): Promise<QueueItem> {
    const url = new URL('api/json', itemUrl)
    const res = await this.get(url.toString())
    return await res.json()
  }

  async sleep(millis: number): Promise<{}> {
    return new Promise(resolve => setTimeout(resolve, millis))
  }

  async getQueuedItemJobUrl(itemUrl: string): Promise<string> {
    let qi: QueueItem = await this.getQueueItem(itemUrl)

    function isProcessing(queueItem: QueueItem): boolean {
      core.debug('Waiting for job to execute')
      if (qi.buildable === true) return true
      if (queueItem.executable && queueItem.executable.url) return false
      return true
    }
    while (isProcessing(qi)) {
      await this.sleep(2000)
      qi = await this.getQueueItem(itemUrl)
    }
    const buildUrl = qi.executable && qi.executable.url
    if (buildUrl === undefined) throw new Error("Can't find build url")

    return this.sanitizeUrl(buildUrl)
  }

  async getBuild(buildUrl: string): Promise<Build> {
    const res = await this.get(new URL('api/json', buildUrl).toString())
    return await res.json()
  }
  async getCompletedBulid(buildUrl: string): Promise<Build> {
    let build: Build = await this.getBuild(buildUrl)

    function isProcessing(b: Build): boolean {
      core.debug('Waiting for job to complete')
      if (!b.building && b.result) return false
      return true
    }
    while (isProcessing(build)) {
      await this.sleep(2000)
      build = await this.getBuild(buildUrl)
    }
    return build
  }
}
