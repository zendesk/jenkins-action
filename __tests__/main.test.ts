import {enableFetchMocks} from 'jest-fetch-mock'
enableFetchMocks()
import fetchMock from 'jest-fetch-mock'
import {JenkinsClient} from '../src/jenkins'
import fs from 'fs'

describe('JenkinsClient', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  it('build job', async () => {
    const response = {
      body: '',
      status: 201,
      headers: {
        location: 'https://localhost:8080/queue/item/1234/'
      }
    }

    fetchMock.mockResponse(req =>
      req.url === 'https://localhost:8080/jobs/foo/build'
        ? Promise.resolve(response)
        : Promise.reject(new Error(`${req.url} isn't expected`))
    )
    const client = new JenkinsClient(
      'https://localhost:8080',
      'user',
      'pass',
      'cert',
      'key'
    )
    await expect(client.build('jobs/foo/', {})).resolves.toEqual(
      'https://localhost:8080/queue/item/1234/'
    )
  })

  it('build job, no location returned', async () => {
    const response = {
      body: '',
      status: 201
    }

    fetchMock.mockResponse(req =>
      req.url === 'https://localhost:8080/jobs/foo/build'
        ? Promise.resolve(response)
        : Promise.reject(new Error(`${req.url} isn't expected`))
    )
    const client = new JenkinsClient(
      'https://localhost:8080',
      'user',
      'pass',
      'cert',
      'key'
    )
    await expect(client.build('jobs/foo', {})).rejects.toThrowError(Error)
  })

  it('build job, fails', async () => {
    fetchMock.mockReject(new Error('fake error message'))

    const client = new JenkinsClient(
      'https://localhost:8080',
      'user',
      'pass',
      'cert',
      'key'
    )
    await expect(client.build('jobs/foo', {})).rejects.toThrowError(Error)
  })

  it('get queue item job url', async () => {
    const response = {
      body: fs.readFileSync('__tests__/queue_item.json').toString(),
      status: 200
    }

    fetchMock.mockResponse(req =>
      req.url === 'https://localhost:8080/queue/item/1234/api/json'
        ? Promise.resolve(response)
        : Promise.reject(new Error(`${req.url} isn't expected`))
    )

    const client = new JenkinsClient(
      'https://localhost:8080',
      'user',
      'pass',
      'cert',
      'key'
    )
    await expect(
      client.getQueuedItemJobUrl('https://localhost:8080/queue/item/1234/')
    ).resolves.toEqual('https://localhost:8080/job/trigger-test/2/')
  })

  it('get queue item, fails', async () => {
    fetchMock.mockReject(new Error('fake error message'))
    const client = new JenkinsClient(
      'https://localhost:8080',
      'user',
      'pass',
      'cert',
      'key'
    )
    await expect(
      client.getQueuedItemJobUrl('https://localhost:8080/queue/item/1234/')
    ).rejects.toThrowError(Error)
  })

  it('get job url', async () => {
    const response = {
      body: fs.readFileSync('__tests__/queue_item.json').toString(),
      status: 200
    }

    fetchMock.mockResponse(req =>
      req.url === 'https://localhost:8080/queue/item/1234/api/json'
        ? Promise.resolve(response)
        : Promise.reject(new Error(`${req.url} isn't expected`))
    )

    const client = new JenkinsClient(
      'https://localhost:8080',
      'user',
      'pass',
      'cert',
      'key'
    )
    await expect(
      client.getQueuedItemJobUrl('https://localhost:8080/queue/item/1234/')
    ).resolves.toEqual('https://localhost:8080/job/trigger-test/2/')
  })

  it('get job url, fails', async () => {
    fetchMock.mockReject(new Error('fake error message'))

    const client = new JenkinsClient(
      'https://localhost:8080',
      'user',
      'pass',
      'cert',
      'key'
    )
    await expect(
      client.getQueuedItemJobUrl('https://localhost:8080/queue/item/1234/')
    ).rejects.toThrowError(Error)
  })
})
