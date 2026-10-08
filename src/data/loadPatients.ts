import { generatePatients, type GenerateOptions } from './generator'
import type { Patient } from './types'

export interface LoadResult {
  patients: Patient[]
  ms: number
  inWorker: boolean
}

/**
 * Generates the population off the main thread (keeps the intro animation smooth);
 * falls back to the main thread where workers are unavailable.
 */
export function loadPatients(options: GenerateOptions): Promise<LoadResult> {
  if (typeof Worker === 'undefined') {
    const t = performance.now()
    return Promise.resolve({
      patients: generatePatients(options),
      ms: performance.now() - t,
      inWorker: false,
    })
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/generate.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<{ patients: Patient[]; ms: number }>) => {
      resolve({ ...e.data, inWorker: true })
      worker.terminate()
    }
    worker.onerror = (err) => {
      worker.terminate()
      reject(err)
    }
    worker.postMessage(options)
  })
}
