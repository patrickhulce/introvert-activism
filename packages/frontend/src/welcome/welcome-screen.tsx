import * as React from 'react'

import Button from '@material-ui/core/Button'
import Card from '@material-ui/core/Card'
import CardActions from '@material-ui/core/CardActions'
import CardContent from '@material-ui/core/CardContent'
import Container from '@material-ui/core/Container'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import {makeStyles, Theme, createStyles} from '@material-ui/core/styles'
import {Link as RouterLink, Link} from 'react-router-dom'

import {useUserSettings} from '../settings/use-user-settings'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    mainContainer: {
      maxWidth: 750,
      margin: 'auto',
    },
    cardContainer: {
      marginTop: theme.spacing(4),
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    settingsContainer: {
      marginTop: theme.spacing(4),
      marginLeft: theme.spacing(3),
      marginRight: theme.spacing(3),
      padding: theme.spacing(2),
      backgroundColor: 'hsl(0, 100%, 93%)',
    },
    textAlign: {
      textAlign: 'center',
    },
    card: {
      flex: 1,
      maxWidth: 300,
    },
  }),
)

const SettingsPrompt = () => {
  const classes = useStyles()
  return (
    <Paper elevation={0} className={classes.settingsContainer}>
      <Typography variant="h5" className={classes.textAlign}>
        Configuration Missing!
      </Typography>
      <Typography variant="body1" style={{marginTop: 20}}>
        It looks like this might be your first time using Introvert Activism. You will need to{' '}
        <Link to="/settings">configure a few settings</Link> before jumping onto calls.
      </Typography>
    </Paper>
  )
}

export const Welcome = (): JSX.Element => {
  const classes = useStyles()
  const [settings] = useUserSettings()
  const settingsNotConfigured = !settings.accessToken || !settings.remoteApiOrigin

  return (
    <div className={classes.mainContainer}>
      {settingsNotConfigured && (
        <div>
          <SettingsPrompt />
        </div>
      )}
      <Container className={classes.cardContainer}>
        <Card className={classes.card}>
          <CardContent>
            <Typography variant="h5">Manage Messages</Typography>
            <Typography variant="body1">Create, record, edit, and delete messages.</Typography>
          </CardContent>
          <CardActions>
            <Button component={RouterLink} to="/messages" size="small">
              View Messages
            </Button>
          </CardActions>
        </Card>
        <Card className={classes.card}>
          <CardContent>
            <Typography variant="h5">Make A Call</Typography>
            <Typography variant="body1">
              Use your configured messages to call a representative.
            </Typography>
          </CardContent>
          <CardActions>
            <Button component={RouterLink} to="/call" size="small" disabled={settingsNotConfigured}>
              Call
            </Button>
          </CardActions>
        </Card>
      </Container>
    </div>
  )
}
