import {spawn} from 'child_process'
import * as os from 'os'
import * as path from 'path'

import * as fs from 'fs-extra'
import _ from 'lodash'
import twilio from 'twilio'

import {createLogger} from '../../shared/src/utils/logging'

const log = createLogger('api:twilio')

const PRODUCTION_TRIGGERS = !!process.env.TWILIO_PRODUCTION
const TWILIO_ACCOUNT = process.env.TWILIO_SID || ''
const FORCE_CLEAR_TRIGGERS = !!process.env.TWILIO_FORCE_CLEAR_TRIGGERS
const TWILIO_NUMBER = process.env.TWILIO_NUMBER || ''
const MAX_AGE_OF_CALL_IN_MS = 30 * 60 * 1000 // 30 minutes

interface CallRecord {
  jwt: string
  callCode: number
  sourceNumber?: string
  twilioNumber: string
  targetNumber: string
  messageId: string
  messageAudio: Buffer
  storedAt: Date

  twilioParticipants?: Array<
    import('twilio/lib/rest/api/v2010/account/conference/participant').ParticipantInstance
  >
}

export class TwilioAgent {
  private _client: twilio.Twilio
  private _callsByCode: Map<number, CallRecord>
  private _callsByMessageId: Map<string, CallRecord>

  public constructor() {
    this._client = TWILIO_ACCOUNT ? twilio(TWILIO_ACCOUNT, process.env.TWILIO_TOKEN) : ({} as any)

    this._callsByCode = new Map()
    this._callsByMessageId = new Map()

    setInterval(() => {
      log.info(`clearing old calls, ${this._callsByCode.size} before`)
      this._clearOldCalls()
      log.info(`cleared old calls, ${this._callsByCode.size} after`)
    }, 60e3)
  }

  private _clearOldCalls(): void {
    for (const call of [...this._callsByCode.values()]) {
      if (Date.now() - call.storedAt.getTime() < MAX_AGE_OF_CALL_IN_MS) continue
      this._callsByCode.delete(call.callCode)
      this._callsByMessageId.delete(call.messageId)
    }
  }

  public isInProgress(): boolean {
    return [...this._callsByCode.values()].some(call => call.sourceNumber)
  }

  public async createUsageTriggerIfNecessary(publicUrl: string): Promise<void> {
    if (!TWILIO_ACCOUNT) {
      log.verbose(`no twilio account configured, skipping trigger creation`)
      return
    }

    if (!PRODUCTION_TRIGGERS) {
      log.verbose(`not in production, skipping trigger creation`)
      return
    }

    let triggers = await this._client.usage.triggers?.list()
    if (!triggers) throw new Error('Could not fetch triggers')

    log.verbose(`found ${triggers.length} existing triggers`)

    if (FORCE_CLEAR_TRIGGERS && triggers.length) {
      log.verbose(`deleting ${triggers.length} triggers`)
      await Promise.all(triggers.map(trigger => trigger.remove()))
      triggers = await this._client.usage.triggers?.list()
      if (!triggers) throw new Error('Could not fetch triggers')
      if (triggers.length) throw new Error('Failed to delete triggers')
    }

    if (triggers.find(trigger => trigger.callbackUrl === publicUrl)) {
      log.verbose('trigger already exists for URL, skipping creation')
    } else {
      log.verbose(
        `creating trigger, not found in existing: \n${triggers
          .map(t => `${t.callbackUrl} - ${t.friendlyName}`)
          .join('\n')}`,
      )

      this._client.usage.triggers?.create({
        friendlyName: '$5/day cap',
        recurring: 'daily',
        usageCategory: 'totalprice',
        triggerBy: 'price',
        triggerValue: '+5',
        callbackUrl: publicUrl,
        callbackMethod: 'GET',
      })
    }
  }

  public async suspendAccount(): Promise<void> {
    const account = await this._client.api.accounts(TWILIO_ACCOUNT)
    await account.update({status: 'suspended'})
  }

  public static async convertToMp3Buffer(audioFile: Buffer, mimeType: string): Promise<Buffer> {
    const extensionMatch = mimeType.match(/audio\/(.*)/)
    if (!extensionMatch) throw new Error(`Invalid mime type ${mimeType}`)
    const extension = extensionMatch[1]

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'twilioconversions'))
    const inFile = path.join(tmpDir, `in.${extension}`)
    await fs.writeFile(inFile, audioFile)

    await new Promise((resolve, reject) => {
      const convertProcess = spawn(
        'ffmpeg',
        [
          ...['-i', inFile], // use the .webm file as input
          '-vn', // disable video
          ...['-ab', '64k'], // use 64kbps bitrate
          ...['-ar', '44100'], // use 44.1KHz
          `out.mp3`, // output to this mp3 file
        ],
        {cwd: tmpDir},
      )

      convertProcess.once('exit', code => {
        if (code === 0) resolve()
        else reject(new Error(`ffmpeg exited with code ${code}`))
      })
    })

    const converted = await fs.readFile(path.join(tmpDir, 'out.mp3'))
    await fs.remove(tmpDir)
    return converted
  }

  public static twimlPromptForCallCode(callbackUrl: string): {twiml: string} {
    const response = new twilio.twiml.VoiceResponse()
    const gather = response.gather({numDigits: 5, timeout: 30, action: callbackUrl, method: 'POST'})

    gather.say(
      'Thank you for calling Introvert Activism. Enter your 5-digit call code using the keypad',
    )

    return {twiml: response.toString()}
  }

  public static twimlCreateConferenceCall(
    statusCallbackUrl: string,
    callCode: number,
  ): {twiml: string} {
    const response = new twilio.twiml.VoiceResponse()

    response.say('Connecting you now')
    response.dial().conference(
      {
        beep: 'false',
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        statusCallback: statusCallbackUrl,
        statusCallbackEvent: ['start', 'join', 'end'],
      },
      `call-${callCode}`,
    )

    return {twiml: response.toString()}
  }

  public static twimlPlayAudioFile(audioFileUrl: string): {twiml: string} {
    const response = new twilio.twiml.VoiceResponse()
    response.play(audioFileUrl)
    return {twiml: response.toString()}
  }

  public static twimlPlaySilence(): {twiml: string} {
    const response = new twilio.twiml.VoiceResponse()
    response.pause({length: 1})

    return {twiml: response.toString()}
  }

  public static twimlHangup(): {twiml: string} {
    const response = new twilio.twiml.VoiceResponse()
    response.say('Input was incorrect. Goodbye')
    response.hangup()

    return {twiml: response.toString()}
  }

  public validateTwilioSignature(
    publicInternetPrefix: string,
    req: import('express').Request,
  ): boolean {
    return twilio.validateRequest(
      process.env.TWILIO_TOKEN || '',
      req.headers['x-twilio-signature'] as string,
      `${publicInternetPrefix}${req.originalUrl}`,
      req.body,
    )
  }

  public async createCallRecord(
    callRecord: Omit<CallRecord, 'callCode' | 'twilioNumber'>,
  ): Promise<CallRecord> {
    if (this._callsByCode.size > 50000) throw new Error('Capacity exceeded')
    const existing = this._callsByMessageId.get(callRecord.messageId)
    if (existing && existing.jwt !== callRecord.jwt) throw new Error('Message collision')

    let code = _.random(10000, 99999)
    while (this._callsByCode.has(code)) code = _.random(10000, 99999)

    const call = {...callRecord, callCode: code, twilioNumber: TWILIO_NUMBER}
    this._callsByCode.set(code, call)
    this._callsByMessageId.set(callRecord.messageId, call)
    return call
  }

  public async destroyCallRecord(callCode: string | number): Promise<void> {
    const existing = this._callsByCode.get(Number(callCode))
    if (!existing) return

    this._callsByCode.delete(existing.callCode)
    this._callsByMessageId.delete(existing.messageId)
  }

  public async confirmCallCode(code: string | number): Promise<CallRecord | undefined> {
    return this._callsByCode.get(Number(code))
  }

  public async connectConferenceToNumber(conferenceId: string, callCode: number): Promise<void> {
    const conference = await this._client.conferences(conferenceId).fetch()
    const code = Number(conference.friendlyName.split('-')[1])
    if (code !== callCode) throw new Error(`Code for conference ${code} did not match ${callCode}`)
    const callRecord = this._callsByCode.get(code)
    if (!callRecord) throw new Error(`Could not find call for code ${code}`)
    const targetCall = await this._client.conferences(conferenceId).participants.create({
      from: TWILIO_NUMBER,
      to: callRecord.targetNumber,
      endConferenceOnExit: true,
    })

    const calls = await this._client.conferences(conferenceId).participants.list()
    if (!calls.some(p => p.callSid === targetCall.callSid)) calls.push(targetCall)
    callRecord.twilioParticipants = calls

    const sourceParticipant = calls.find(p => p.callSid !== targetCall.callSid)
    if (!sourceParticipant) return
    const sourceCall = await this._client.calls.get(sourceParticipant.callSid).fetch()
    callRecord.sourceNumber = sourceCall.from
  }

  public async updateConferenceWithAction(
    callCode: number,
    conferenceUpdateUrl: string,
  ): Promise<void> {
    const callRecord = this._callsByCode.get(callCode)
    if (!callRecord) throw new Error(`Could not find call for code ${callCode}`)
    if (!callRecord.twilioParticipants) throw new Error(`No twilio call for ${callRecord.callCode}`)
    await Promise.all(
      callRecord.twilioParticipants.map(participant =>
        participant.update({announceUrl: conferenceUpdateUrl}),
      ),
    )
  }
}
