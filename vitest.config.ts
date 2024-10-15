/// <reference types="vitest" />
import { defineConfig} from 'vite'

export default defineConfig({
    test: {
        poolOptions: {
            threads: {
                maxThreads: 1,
                singleThread: true,
                isolate: true,
            },
            fileParallelism: false,
            maxWorkers: 1,
            forks: {
                singleFork: true
            }
        }
    }
})