import * as React from 'react'

import {Typography} from '@material-ui/core'
import Avatar from '@material-ui/core/Avatar'
import IconButton from '@material-ui/core/IconButton'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction'
import ListItemText from '@material-ui/core/ListItemText'
import AddIcon from '@material-ui/icons/Add'
import CallIcon from '@material-ui/icons/Call'
import DeleteIcon from '@material-ui/icons/Delete'
import {Link as RouterLink} from 'react-router-dom'

import type * as Api from '../../../shared/src/utils/api'

export const MessageList = (): JSX.Element => {
  const [data, setData] = React.useState<Api.MessagesPayload>({
    messages: [],
  })

  async function reloadMessages() {
    const response = (await (await fetch('/api/messages')).json()) as Api.ResponseTypes['Messages']
    setData(response.payload)
  }

  React.useEffect(() => {
    reloadMessages()
  }, [])

  return (
    <>
      <Typography variant="h4" style={{paddingTop: 20}}>
        Messages
      </Typography>
      <div>
        <List>
          {data.messages.map(message => {
            return (
              <ListItem
                key={message.uuid}
                button
                component={RouterLink}
                to={`/messages/${message.uuid}`}>
                <ListItemAvatar>
                  <Avatar>
                    <CallIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={message.display_name}
                  secondary={message.script.slice(0, 140)}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={async () => {
                      await fetch(`/api/messages/${message.uuid}`, {
                        method: 'DELETE',
                      })
                      reloadMessages()
                    }}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            )
          })}
          <ListItem button component={RouterLink} to={`/record`}>
            <ListItemAvatar>
              <Avatar>
                <AddIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary="Record a new message" secondary="Creates a new message." />
          </ListItem>
        </List>
      </div>
    </>
  )
}
