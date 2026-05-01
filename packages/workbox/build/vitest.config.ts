import { defaultExclude, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          detectAsyncLeaks: true,
          name: 'node',
          environment: 'node',
          include: ['**/test/*.spec.ts'],
          exclude: [
            '**/fixtures/**',
            ...defaultExclude,
          ],
        },
      },
    ],
  },
})
