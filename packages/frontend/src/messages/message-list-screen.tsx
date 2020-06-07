import * as React from 'react'

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

  React.useEffect(() => {
    ;(async () => {
      const response = (await (
        await fetch('/api/messages')
      ).json()) as Api.ResponseTypes['Messages']
      setData(response.payload)
    })()
  }, [])

  return (
    <>
      <h1>Messages</h1>
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
                <ListItemText primary={message.display_name} secondary={`${message.duration}s`} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="delete">
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
