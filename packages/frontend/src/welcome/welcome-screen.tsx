import * as React from 'react'

import {Link} from 'react-router-dom'

export const Welcome = (): JSX.Element => (
  <div>
    <h1>Welcome</h1>
    <Link to="/record">Record a message</Link>
    <Link to="/messages">Messages</Link>
    <Link to="/call">Call</Link>
  </div>
)
