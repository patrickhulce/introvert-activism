import _ from 'lodash'
import twilio from 'twilio'

const SOURCE_NUMBER = process.env.TWILIO_NUMBER || ''
const TARGET_NUMBER = process.env.TWILIO_TEST_CALL_NUMBER || ''

interface CallRecord {
  jwt: string
  callCode: number
  sourceNumber?: string
  targetNumber: string
  messageId: string
  messageAudio: Buffer
  storedAt: Date

  twilioParticipants?: Array<
    import('twilio/lib/rest/api/V2010/account/conference/participant').ParticipantInstance
  >
}

export class TwilioAgent {
  private _client: twilio.Twilio
  private _callsByCode: Map<number, CallRecord>
  private _callsByMessageId: Map<string, CallRecord>

  public constructor() {
    this._client = process.env.TWILIO_SID
      ? twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
      : ({} as any)

    this._callsByCode = new Map()
    this._callsByMessageId = new Map()
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
        statusCallbackEvent: ['start', 'join'],
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

  public static twimlHangup(): {twiml: string} {
    const response = new twilio.twiml.VoiceResponse()
    response.say('Input was incorrect. Goodbye')
    response.hangup()

    return {twiml: response.toString()}
  }

  public validateTwilioSignature(req: import('express').Request): boolean {
    return twilio.validateExpressRequest(req, process.env.TWILIO_TOKEN || '')
  }

  public async createCallRecord(callRecord: Omit<CallRecord, 'callCode'>): Promise<CallRecord> {
    if (this._callsByCode.size > 50000) throw new Error('Capacity exceeded')
    const existing = this._callsByMessageId.get(callRecord.messageId)
    if (existing && existing.jwt !== callRecord.jwt) throw new Error('Message collision')

    let code = _.random(10000, 99999)
    while (this._callsByCode.has(code)) code = _.random(10000, 99999)

    const call = {...callRecord, callCode: code}
    this._callsByCode.set(code, call)
    this._callsByMessageId.set(callRecord.messageId, call)
    return call
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
      from: SOURCE_NUMBER,
      to: TARGET_NUMBER || callRecord.targetNumber,
      endConferenceOnExit: true,
    })

    const calls = await this._client.conferences(conferenceId).participants.list()
    if (calls.some(p => p.callSid !== targetCall.callSid)) calls.push(targetCall)
    callRecord.twilioParticipants = calls
  }

  public async playMessageInConference(
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
