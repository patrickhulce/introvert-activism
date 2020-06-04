import * as React from 'react'
import {Link} from 'react-router-dom'

export const Welcome = () => (
  <div>
    <h1>Welcome</h1>
    <Link to="/messages">Messages</Link>
    <Link to="/call">Call</Link>
  </div>
)
