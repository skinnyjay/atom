const {it, fit, ffit, beforeEach, afterEach, conditionPromise} = require('./async-spec-helpers')
const fs = require('fs-plus')
const path = require('path')
const temp = require('temp').track()
const dedent = require('dedent')
const ConfigFile = require('../src/config-file')

describe('ConfigFile', () => {
  let filePath, configFile, subscription

  beforeEach(async () => {
    jasmine.useRealClock()
    const tempDir = temp.mkdirSync()
    filePath = path.join(tempDir, 'the-config.cson')
  })

  afterEach(() => {
    subscription.dispose()
  })

  describe('when the file does not exist', () => {
    it('returns an empty object from .get()', async () => {
      configFile = new ConfigFile(filePath)
      subscription = await configFile.watch()
      expect(configFile.get()).toEqual({})
    })
  })

  describe('when the file is empty', () => {
    it('returns an empty object from .get()', async () => {
      fs.writeFileSync(filePath, '')
      configFile = new ConfigFile(filePath)
      subscription = await configFile.watch()
      expect(configFile.get()).toEqual({})
    })
  })

  describe('when the file is updated with valid CSON', () => {
    it('notifies onDidChange observers with the data', async () => {
      configFile = new ConfigFile(filePath)
      subscription = await configFile.watch()

      fs.writeFileSync(filePath, dedent(`
        '*':
          foo: 'bar'

        'javascript':
          foo: 'baz'
      `.trim()))

      const event = await new Promise(resolve => configFile.onDidChange(resolve))
      expect(event).toEqual({
        '*': {foo: 'bar'},
        'javascript': {foo: 'baz'}
      })

      expect(configFile.get()).toEqual({
        '*': {foo: 'bar'},
        'javascript': {foo: 'baz'}
      })
    })
  })

  describe('when the file is  updated with invalid CSON', () => {
    it('notifies onDidError observers', async () => {
      configFile = new ConfigFile(filePath)
      subscription = await configFile.watch()

      fs.writeFileSync(filePath, dedent `
        um what?
      `)

      const message = await new Promise(resolve => configFile.onDidError(resolve))
      expect(message).toContain('Failed to load `the-config.cson`')

      fs.writeFileSync(filePath, dedent `
        '*':
          foo: 'bar'

        'javascript':
          foo: 'baz'
      `)

      const event = await new Promise(resolve => configFile.onDidChange(resolve))
      expect(event).toEqual({
        '*': {foo: 'bar'},
        'javascript': {foo: 'baz'}
      })
    })
  })

  describe('updating the config', () => {
    it('persists the data to the file', async () => {
      configFile = new ConfigFile(filePath)
      subscription = await configFile.watch()
      await configFile.update({foo: 'bar'})
      expect(fs.readFileSync(filePath, 'utf8')).toBe('foo: "bar"\n')
    })
  })
})
