import * as React from 'react'
import {useState} from 'react'

import AppBar from '@material-ui/core/AppBar'
import Drawer from '@material-ui/core/Drawer'
import IconButton from '@material-ui/core/IconButton'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import {createStyles, makeStyles, Theme} from '@material-ui/core/styles'
import CallIcon from '@material-ui/icons/Call'
import HomeIcon from '@material-ui/icons/Home'
import MenuIcon from '@material-ui/icons/Menu'
import MessageIcon from '@material-ui/icons/Message'
import SettingsIcon from '@material-ui/icons/Settings'
import {HashRouter as Router, Redirect, Route, Switch, Link as RouterLink} from 'react-router-dom'

import {MakeACall} from './call/call-screen'
import {MessageDetail} from './messages/message-detail-screen'
import {MessageList} from './messages/message-list-screen'
import {RecordMessageScreen} from './messages/new-message-screen'
import {SettingsScreen} from './settings/settings-screen'
import {Welcome} from './welcome/welcome-screen'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
      height: '100%',
    },
    routeContent: {
      paddingLeft: theme.spacing(3),
      paddingRight: theme.spacing(3),
      height: 'calc(100% - 65px)',
    },
    menuButton: {
      marginRight: theme.spacing(2),
    },
    title: {
      flexGrow: 1,
    },
    navLinkText: {
      paddingRight: theme.spacing(2),
    },
  }),
)

const Pages: Array<[string, JSX.Element, string]> = [
  ['Welcome', <HomeIcon />, '/welcome'], // eslint-disable-line react/jsx-key
  ['Messages', <MessageIcon />, '/messages'], // eslint-disable-line react/jsx-key
  ['Make a Call', <CallIcon />, '/call'], // eslint-disable-line react/jsx-key
]

const NavLinks = (props: {closeMenu(): void}) => {
  const classes = useStyles()

  return (
    <List>
      {Pages.map(([label, icon, link]) => {
        return (
          <ListItem
            key={label}
            button
            component={RouterLink}
            to={link}
            onClick={() => props.closeMenu()}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText className={classes.navLinkText} primary={label} />
          </ListItem>
        )
      })}
    </List>
  )
}

export const App = (): JSX.Element => {
  const classes = useStyles()
  const [sidebarIsOpen, setSidebarIsOpen] = useState(false)

  return (
    <div className={classes.root}>
      <Router>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              edge="start"
              className={classes.menuButton}
              color="inherit"
              aria-label="menu"
              onClick={() => setSidebarIsOpen(current => !current)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              Introvert Activism
            </Typography>
            <IconButton
              edge="start"
              className={classes.menuButton}
              component={RouterLink}
              color="inherit"
              aria-label="menu"
              to="/settings">
              <SettingsIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Drawer anchor="left" open={sidebarIsOpen} onClose={() => setSidebarIsOpen(false)}>
          <NavLinks closeMenu={() => setSidebarIsOpen(false)} />
        </Drawer>
        <div className={classes.routeContent}>
          <Switch>
            <Route exact path="/welcome" component={Welcome} />
            <Route exact path="/record" component={RecordMessageScreen} />
            <Route exact path="/messages" component={MessageList} />
            <Route exact path="/messages/:id" component={MessageDetail} />
            <Route exact path="/call" component={MakeACall} />
            <Route exact path="/settings" component={SettingsScreen} />
            <Redirect to="/welcome" />
          </Switch>
        </div>
      </Router>
    </div>
  )
}
