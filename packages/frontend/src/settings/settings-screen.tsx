import * as React from 'react'

import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import CheckIcon from '@material-ui/icons/Check'
import ErrorIcon from '@material-ui/icons/Error'
import HourglassIcon from '@material-ui/icons/HourglassEmpty'

import {useUserSettings} from './use-user-settings'

enum TestState {
  NotStarted = 'ns',
  Started = 's',
  Passed = 'p',
  Failed = 'f',
}

export const SettingsScreen = (): JSX.Element => {
  const [testState, setTestState] = React.useState(TestState.NotStarted)
  const [settings, setSettings] = useUserSettings()
  const [formValues, setFormValues] = React.useState(settings)

  const isDirty =
    formValues.accessToken !== settings.accessToken ||
    formValues.remoteApiOrigin !== settings.remoteApiOrigin

  return (
    <div style={{paddingTop: 20}}>
      <Typography variant="h4">Settings</Typography>
      <form>
        <div style={{margin: `10px 0`}}>
          <TextField
            required
            id="access-token-input"
            label="Access Token"
            variant="outlined"
            value={formValues.accessToken}
            onChange={e => setFormValues({...formValues, accessToken: e.target.value})}
            fullWidth
          />
        </div>
        <div style={{margin: `10px 0`}}>
          <TextField
            required
            id="remote-api-input"
            label="Remote URL"
            variant="outlined"
            value={formValues.remoteApiOrigin}
            onChange={e => setFormValues({...formValues, remoteApiOrigin: e.target.value})}
            fullWidth
          />
        </div>
        <div
          style={{display: 'flex', flexDirection: 'row', alignItems: 'center', margin: `10px 0`}}>
          <Button
            variant="contained"
            color="primary"
            disabled={!isDirty}
            onClick={() => setSettings(formValues)}>
            Save
          </Button>
          <Button
            style={{marginLeft: 10}}
            variant="contained"
            color="secondary"
            disabled={!isDirty}
            onClick={() => setFormValues(settings)}>
            Reset
          </Button>
          <Button
            style={{marginLeft: 10}}
            variant="contained"
            color="default"
            disabled={testState === TestState.Started}
            onClick={async () => {
              setTestState(TestState.Started)
              const response = await fetch('/api/remote/calls/123456789/status?timeout=5000', {
                headers: {
                  Authorization: `bearer ${formValues.accessToken}`,
                  'x-remote-proxy-destination': formValues.remoteApiOrigin,
                },
              })

              setTestState(response.ok ? TestState.Passed : TestState.Failed)
            }}>
            Test
          </Button>
          <div style={{marginLeft: 10}}>
            {testState === TestState.Started ? <HourglassIcon /> : null}
            {testState === TestState.Passed ? <CheckIcon /> : null}
            {testState === TestState.Failed ? <ErrorIcon /> : null}
          </div>
        </div>
      </form>
    </div>
  )
}
