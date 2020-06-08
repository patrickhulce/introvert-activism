import React from 'react'

const LOCALSTORAGE_KEY = '__user_settings__'

export interface UserSettings {
  accessToken: string
  remoteApiOrigin: string
}

export function useUserSettings(): [UserSettings, (settings: UserSettings) => void] {
  const defaults: UserSettings = {accessToken: '', remoteApiOrigin: window.location.origin}
  const settingsInStorage = localStorage.getItem(LOCALSTORAGE_KEY)
  const initial = settingsInStorage ? JSON.parse(settingsInStorage) : defaults
  const [settings, setSettings] = React.useState(initial)

  return [
    settings,
    settings => {
      setSettings(settings)
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(settings))
    },
  ]
}
