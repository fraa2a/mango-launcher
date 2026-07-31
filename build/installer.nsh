!macro customInstall
  WriteRegStr HKCU "Software\Classes\.mangocds" "" "MangoLauncher.mangocds"
  WriteRegStr HKCU "Software\Classes\MangoLauncher.mangocds" "" "Mango Custom Download Source"
  WriteRegStr HKCU "Software\Classes\MangoLauncher.mangocds\DefaultIcon" "" "$INSTDIR\MangoLauncher.exe,0"
  WriteRegStr HKCU "Software\Classes\MangoLauncher.mangocds\shell\open\command" "" '"$INSTDIR\MangoLauncher.exe" "%1"'
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$LOCALAPPDATA\mangolauncher-updater"
    DeleteRegKey HKCU "Software\Classes\.mangocds"
    DeleteRegKey HKCU "Software\Classes\MangoLauncher.mangocds"
    System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  ${endIf}
!macroend
