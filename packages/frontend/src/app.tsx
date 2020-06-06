import * as React from 'react'
import {HashRouter as Router, Redirect, Route, Switch} from 'react-router-dom'

import {MakeACall} from './call/call-screen'
import {MessageDetail} from './messages/message-detail-screen'
import {MessageList} from './messages/message-list-screen'
import {RecordMessageScreen} from './messages/record-message-screen'
import {Welcome} from './welcome/welcome-screen'

export const App = (): JSX.Element => (
  <Router>
    <div>
      <Switch>
        <Route exact path="/welcome" component={Welcome} />
        <Route exact path="/record" component={RecordMessageScreen} />
        <Route exact path="/messages" component={MessageList} />
        <Route exact path="/messages/:id" component={MessageDetail} />
        <Route exact path="/call" component={MakeACall} />
        <Redirect to="/welcome" />
      </Switch>
    </div>
  </Router>
)
