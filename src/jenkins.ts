import * as core from '@actions/core'
import fetch from 'node-fetch'
import {Response} from 'node-fetch'
import b64 from 'base64-async'
import https from 'https'
import path from 'path'
import {right, left, either, Either} from 'fp-ts/lib/Either'

export async function wait(milliseconds: number): Promise<string> {
    return new Promise(resolve => {
        if (isNaN(milliseconds)) {
            throw new Error('milliseconds not a number')
        }

        setTimeout(() => resolve('done!'), milliseconds)
    })
}

interface Build {
    building: boolean;
    result?: BuildResult;
}

export enum BuildResult {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    UNSTABLE = 'UNSTABLE',
    ABORTED = 'ABORTED',
    NOT_BUILT= 'NOT_BUILT',
}

interface QueueItemExecutable {
    number: number,
    url: string
};

interface QueueItem {
    blocked: boolean;
    buildable: boolean;
    id: number;
    stuck: boolean;
    url: string;
    why?: string;
    cancelled: boolean;
    executable?: QueueItemExecutable

    // [propName: string]: any;
}


export class JenkinsClient {
    base_url: string;
    username: string;
    password: string;
    cert: string;
    key: string;

    constructor(base_url: string, username: string, password: string, cert: string, key: string) {
        this.base_url = base_url;
        this.username = username
        this.password = password
        this.cert = cert
        this.key = key
    }

    sanitizeUrl(url: string): string {
        const base_url = new URL(this.base_url)
        const new_url = new URL(url);
        new_url.host = base_url.host
        new_url.protocol = base_url.protocol
        return new_url.toString()
    }

    async authorization(): Promise<string> {
        const auth: string = await b64.encode(Buffer.from(`${this.username}:${this.password}`));
        return `Basic ${auth}`
    }

    async post(url: string, parameters: object): Promise<Response> {
        const res = await fetch(this.sanitizeUrl(url), {
            method: 'post',
            body: JSON.stringify(parameters),
            agent: new https.Agent({
                cert: this.cert,
                key: this.key,
            }),
            headers: {
                'Authorization': await this.authorization(),
                'Content-Type': 'application/json'
            }});
        if (res.status >= 400) {
            console.log(await res.text())
            throw new Error(`Response: ${res.status} ${res.statusText}`)
        }
        return res
    }

    async get(url: string): Promise<Response> {
        const resolved_url = new URL(url, this.base_url);
        const res = await fetch(this.sanitizeUrl(url), {
            method: 'get',
            agent: new https.Agent({
                cert: this.cert,
                key: this.key,
            }),
            headers: {
                'Authorization': await this.authorization(),
                'Content-Type': 'application/json'
            }});
        if (res.status >= 400) {
            console.log(await res.text())
            throw new Error(`Response: ${res.status} ${res.statusText}`)
        }
        return res
    }

    async build(job_url: string, parameters: object): Promise<string> {
        const url = new URL(path.join(job_url, 'build'), this.base_url);
        const res = await this.post(url.toString(), parameters)
        core.debug(`Response: ${res.status} ${res.statusText}`)
        const location = res.headers.get('location');
        if (location == null) {
            throw new Error('Location empty, lost track of the job');
        }
        return this.sanitizeUrl(location)
    }

    async getQueueItem(item_url: string): Promise<QueueItem> {
        const url = new URL('api/json', item_url);
        const res = await this.get(url.toString());
        return await res.json();
    }

    sleep(millis: number) {
        return new Promise(resolve => setTimeout(resolve, millis));
    }

    async getQueuedItemJobUrl(item_url: string): Promise<string> {
        let qi: QueueItem = await this.getQueueItem(item_url);

        function isProcessing(queue_item: QueueItem) {
            core.debug("Waiting for job to execute")
            if (qi.buildable == true) return true;
            if (queue_item.executable && queue_item.executable.url) return false;
            return true;
        }
        while (isProcessing(qi)) {
            await this.sleep(2000)
            qi = await this.getQueueItem(item_url);
        };
        const build_url = qi.executable && qi.executable.url;
        if (build_url == undefined) throw new Error("Can't find build url")

        return this.sanitizeUrl(build_url)
    }

    async getBuild(build_url: string): Promise<Build> {
        const res = await this.get((new URL('api/json', build_url).toString()));
        return await res.json();
    }
    async getCompletedBulid(build_url: string): Promise<Build> {
        let build: Build = await this.getBuild(build_url);

        function isProcessing(build: Build) {
            core.debug("Waiting for job to complete")
            if (!build.building && build.result) return false;
            return true;
        }
        while (isProcessing(build)) {
            await this.sleep(2000)
            build = await this.getBuild(build_url);
        };
        return build
    }
}
