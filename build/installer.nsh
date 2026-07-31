!macro customUnInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$LOCALAPPDATA\mangolauncher-updater"
  ${endIf}
!macroend
