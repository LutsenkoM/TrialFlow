/// <reference lib="webworker" />
import { generatePatients, type GenerateOptions } from '../data/generator'

self.onmessage = (e: MessageEvent<GenerateOptions>) => {
  const started = performance.now()
  const patients = generatePatients(e.data)
  self.postMessage({ patients, ms: performance.now() - started })
}
