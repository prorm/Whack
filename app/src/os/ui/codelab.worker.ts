// Practice runs stay on the learner's device. The page terminates this worker after a time limit,
// so an infinite loop cannot freeze the tab.
import { runSuite, type TestCase } from '../codelab.ts'

self.onmessage = (e: MessageEvent<{ code: string; cases: TestCase[] }>) => {
  self.postMessage(runSuite(e.data.code, e.data.cases))
}
