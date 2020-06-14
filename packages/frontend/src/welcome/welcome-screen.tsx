import * as React from 'react'

import Button from '@material-ui/core/Button'
import Card from '@material-ui/core/Card'
import CardActions from '@material-ui/core/CardActions'
import CardContent from '@material-ui/core/CardContent'
import Container from '@material-ui/core/Container'
import {makeStyles} from '@material-ui/core/styles'
import {Link as RouterLink} from 'react-router-dom'

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'row',
  },
  card: {
    flex: 1,
    margin: '5px',
  },
})

export const Welcome = (): JSX.Element => {
  const classes = useStyles()
  return (
    <div>
      <h1>Welcome</h1>
      {/* TODO: Warning if configuration missing, link to settings. */}
      <Container className={classes.container}>
        <Card className={classes.card}>
          <CardContent>
            <h3>Record A Message</h3>
            <p>Write a transcript, record and save a message to be used in a call.</p>
          </CardContent>
          <CardActions>
            <Button component={RouterLink} to="/record" size="small">
              Record
            </Button>
          </CardActions>
        </Card>
        <Card className={classes.card}>
          <CardContent>
            <h3>Manage Messages</h3>
            <p>View, edit, and delete previously recorded messages.</p>
          </CardContent>
          <CardActions>
            <Button component={RouterLink} to="/messages" size="small">
              View Messages
            </Button>
          </CardActions>
        </Card>
        <Card className={classes.card}>
          <CardContent>
            <h3>Make a Call</h3>
            <p>Use your configured messages to call a representative.</p>
          </CardContent>
          <CardActions>
            <Button component={RouterLink} to="/call" size="small">
              Call
            </Button>
          </CardActions>
        </Card>
      </Container>
    </div>
  )
}
