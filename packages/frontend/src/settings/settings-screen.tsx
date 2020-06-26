import * as React from 'react'

import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'

import {useUserSettings} from './use-user-settings'

export const SettingsScreen = (): JSX.Element => {
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
        <div style={{margin: `10px 0`}}>
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
        </div>
      </form>
    </div>
  )
}
